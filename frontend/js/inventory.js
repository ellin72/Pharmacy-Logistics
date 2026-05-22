// Inventory management functions

const EXPIRY_WARNING_DAYS = 90; // Alert if expiring within 3 months (90 days)

// Check if medicine with same name and batch already exists
async function findDuplicateMedicine(name, batch) {
  try {
    const allMedicines = await getAllMedicines();
    const normalizedName = name.trim().toLowerCase();
    const normalizedBatch = batch.trim().toLowerCase();

    return allMedicines.find(
      (med) =>
        med.name.trim().toLowerCase() === normalizedName &&
        med.batch.trim().toLowerCase() === normalizedBatch,
    );
  } catch (error) {
    console.error("Error checking for duplicate:", error);
    return null;
  }
}

// Add a new medicine or update existing if duplicate found
async function addMedicine(medicineData) {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Validate data
    if (
      !medicineData.name ||
      !medicineData.batch ||
      !medicineData.expiryDate ||
      medicineData.quantity === undefined ||
      medicineData.minThreshold === undefined
    ) {
      return { success: false, error: "Please fill in all required fields" };
    }

    // Check for duplicate (same name AND batch)
    const existingMedicine = await findDuplicateMedicine(
      medicineData.name,
      medicineData.batch,
    );

    if (existingMedicine) {
      // Update existing medicine instead of creating duplicate
      const newQuantity =
        existingMedicine.quantity + parseInt(medicineData.quantity);
      const status = calculateMedicineStatus(
        medicineData.expiryDate,
        newQuantity,
        medicineData.minThreshold,
      );

      // Update the existing medicine
      await db
        .collection("medicines")
        .doc(existingMedicine.id)
        .update({
          expiryDate: firebase.firestore.Timestamp.fromDate(
            new Date(medicineData.expiryDate),
          ),
          quantity: newQuantity,
          minThreshold: parseInt(medicineData.minThreshold),
          status: status,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
          notes: medicineData.notes || existingMedicine.notes || "",
        });

      // Create transaction log for the addition
      await db.collection("transactions").add({
        medicineId: existingMedicine.id,
        type: "add",
        quantity: parseInt(medicineData.quantity),
        previousQuantity: existingMedicine.quantity,
        newQuantity: newQuantity,
        reason:
          "Added via duplicate prevention - merged with existing medicine",
        userId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Update alerts
      await checkAndCreateAlerts(existingMedicine.id, {
        ...existingMedicine,
        quantity: newQuantity,
        status,
        expiryDate: new Date(medicineData.expiryDate),
        minThreshold: parseInt(medicineData.minThreshold),
      });

      return {
        success: true,
        id: existingMedicine.id,
        isUpdate: true,
        message: `Medicine "${medicineData.name}" (Batch: ${medicineData.batch}) already exists. Updated existing record with new stock.`,
      };
    }

    // No duplicate found - create new medicine
    const status = calculateMedicineStatus(
      medicineData.expiryDate,
      medicineData.quantity,
      medicineData.minThreshold,
    );

    const medicine = {
      name: medicineData.name.trim(),
      batch: medicineData.batch.trim(),
      expiryDate: firebase.firestore.Timestamp.fromDate(
        new Date(medicineData.expiryDate),
      ),
      quantity: parseInt(medicineData.quantity),
      minThreshold: parseInt(medicineData.minThreshold),
      status: status,
      category: (medicineData.category || "").trim(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: user.uid,
      notes: medicineData.notes || "",
      deleted: false,
    };

    const docRef = await db.collection("medicines").add(medicine);

    // Create initial alert if needed
    await checkAndCreateAlerts(docRef.id, medicine);

    return { success: true, id: docRef.id, isUpdate: false };
  } catch (error) {
    console.error("Error adding medicine:", error);

    if (error.code === "permission-denied") {
      return {
        success: false,
        error: "Permission denied. Please check your user role and try again.",
      };
    } else if (error.code === "unavailable") {
      return {
        success: false,
        error:
          "Network error. Please check your internet connection and try again.",
      };
    } else if (error.code === "deadline-exceeded") {
      return { success: false, error: "Request timeout. Please try again." };
    }

    return {
      success: false,
      error: error.message || "Failed to add medicine. Please try again.",
    };
  }
}

// Update medicine stock (add, remove, or adjust)
async function updateStock(medicineId, transactionType, quantity, reason = "") {
  try {
    const user = getCurrentUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const medicineRef = db.collection("medicines").doc(medicineId);
    const medicineDoc = await medicineRef.get();

    if (!medicineDoc.exists) {
      return { success: false, error: "Medicine not found" };
    }

    const medicine = medicineDoc.data();
    const previousQuantity = medicine.quantity;
    let newQuantity;

    // Calculate new quantity based on transaction type
    switch (transactionType) {
      case "add":
        newQuantity = previousQuantity + parseInt(quantity);
        break;
      case "remove":
        newQuantity = Math.max(0, previousQuantity - parseInt(quantity));
        break;
      case "adjust":
        newQuantity = parseInt(quantity);
        break;
      default:
        return { success: false, error: "Invalid transaction type" };
    }

    // Recalculate status
    const status = calculateMedicineStatus(
      medicine.expiryDate.toDate(),
      newQuantity,
      medicine.minThreshold,
    );

    // Update medicine
    await medicineRef.update({
      quantity: newQuantity,
      status: status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Create transaction log
    await db.collection("transactions").add({
      medicineId: medicineId,
      type: transactionType,
      quantity:
        transactionType === "remove" ? -parseInt(quantity) : parseInt(quantity),
      previousQuantity: previousQuantity,
      newQuantity: newQuantity,
      reason: reason.trim(),
      userId: user.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Update alerts
    await checkAndCreateAlerts(medicineId, {
      ...medicine,
      quantity: newQuantity,
      status,
    });

    return { success: true, newQuantity, previousQuantity };
  } catch (error) {
    console.error("Error updating stock:", error);
    return { success: false, error: error.message };
  }
}

// Get all medicines
async function getAllMedicines() {
  try {
    const snapshot = await db
      .collection("medicines")
      .orderBy("updatedAt", "desc")
      .get();

    return snapshot.docs
      .filter((doc) => !doc.data().deleted) // exclude soft-deleted records
      .map((doc) => {
        const data = doc.data();
        const expiryDate = data.expiryDate?.toDate() || null;

        // CRITICAL: Recalculate status based on current date (ensures expired items are detected)
        let calculatedStatus = data.status || "in_stock";
        if (expiryDate) {
          calculatedStatus = calculateMedicineStatus(
            expiryDate,
            data.quantity || 0,
            data.minThreshold || 0,
          );

          // If status changed (especially to expired), update it in database
          if (calculatedStatus !== data.status) {
            // Update status asynchronously
            doc.ref
              .update({
                status: calculatedStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
              })
              .catch((err) => {
                console.error("Error updating medicine status:", err);
              });

            // Check and create alerts for expired items
            if (
              calculatedStatus === "expired" ||
              calculatedStatus === "expiring_soon" ||
              (calculatedStatus === "low_stock" &&
                data.quantity <= data.minThreshold)
            ) {
              checkAndCreateAlerts(doc.id, {
                ...data,
                expiryDate: expiryDate,
                quantity: data.quantity || 0,
                minThreshold: data.minThreshold || 0,
              }).catch((err) => {
                console.error("Error checking alerts:", err);
              });
            }
          }
        }

        return {
          id: doc.id,
          ...data,
          status: calculatedStatus, // Use recalculated status
          expiryDate: expiryDate,
          category: data.category || "",
          createdAt: data.createdAt?.toDate() || null,
          updatedAt: data.updatedAt?.toDate() || null,
        };
      });
  } catch (error) {
    console.error("Error fetching medicines:", error);
    return [];
  }
}

// Get medicine by ID
async function getMedicineById(medicineId) {
  try {
    const doc = await db.collection("medicines").doc(medicineId).get();
    if (!doc.exists) {
      return null;
    }
    return {
      id: doc.id,
      ...doc.data(),
      expiryDate: doc.data().expiryDate?.toDate() || null,
      createdAt: doc.data().createdAt?.toDate() || null,
      updatedAt: doc.data().updatedAt?.toDate() || null,
    };
  } catch (error) {
    console.error("Error fetching medicine:", error);
    return null;
  }
}

// Delete medicine (admin only)
async function deleteMedicine(medicineId) {
  try {
    await db.collection("medicines").doc(medicineId).delete();
    // Also delete related alerts
    const alertsSnapshot = await db
      .collection("alerts")
      .where("medicineId", "==", medicineId)
      .get();

    const deletePromises = alertsSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(deletePromises);

    return { success: true };
  } catch (error) {
    console.error("Error deleting medicine:", error);

    if (error.code === "permission-denied") {
      return {
        success: false,
        error:
          "You do not have permission to delete medicines. Only admins can delete.",
      };
    }

    return { success: false, error: error.message };
  }
}

// Calculate medicine status
function calculateMedicineStatus(expiryDate, quantity, minThreshold) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) {
    return "expired";
  } else if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
    return "expiring_soon";
  } else if (quantity <= minThreshold) {
    return "low_stock";
  } else {
    return "in_stock";
  }
}

// Check and create alerts
async function checkAndCreateAlerts(medicineId, medicine) {
  try {
    const expiryDate = medicine.expiryDate?.toDate
      ? medicine.expiryDate.toDate()
      : new Date(medicine.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    // Check for expired
    if (daysUntilExpiry < 0) {
      await createOrUpdateAlert(medicineId, medicine.name, "expired", expiry);
    }
    // Check for expiring soon
    else if (daysUntilExpiry <= EXPIRY_WARNING_DAYS) {
      await createOrUpdateAlert(
        medicineId,
        medicine.name,
        "expiry_soon",
        expiry,
      );
    }
    // Check for low stock
    if (medicine.quantity <= medicine.minThreshold) {
      await createOrUpdateAlert(medicineId, medicine.name, "low_stock", null);
    }

    // Remove alerts that are no longer relevant
    await cleanupAlerts(medicineId, medicine);
  } catch (error) {
    console.error("Error checking alerts:", error);
  }
}

// Create or update alert
async function createOrUpdateAlert(medicineId, medicineName, alertType, dueOn) {
  try {
    // Check if alert already exists
    const existingAlert = await db
      .collection("alerts")
      .where("medicineId", "==", medicineId)
      .where("type", "==", alertType)
      .where("resolved", "==", false)
      .limit(1)
      .get();

    if (existingAlert.empty) {
      // Create new alert
      const alertRef = await db.collection("alerts").add({
        medicineId: medicineId,
        medicineName: medicineName,
        type: alertType,
        dueOn: dueOn ? firebase.firestore.Timestamp.fromDate(dueOn) : null,
        resolved: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        severity:
          alertType === "expired"
            ? "high"
            : alertType === "expiry_soon"
              ? "medium"
              : "low",
      });

      // Trigger notification for new alert
      const alertDoc = await alertRef.get();
      if (alertDoc.exists && typeof triggerAlertNotification === "function") {
        const alertData = {
          id: alertDoc.id,
          ...alertDoc.data(),
          dueOn: alertDoc.data().dueOn?.toDate() || null,
        };
        await triggerAlertNotification(alertData);
      }
    }
  } catch (error) {
    console.error("Error creating alert:", error);
  }
}

// Cleanup alerts that are no longer relevant
async function cleanupAlerts(medicineId, medicine) {
  try {
    const expiryDate = medicine.expiryDate?.toDate
      ? medicine.expiryDate.toDate()
      : new Date(medicine.expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

    // Get all unresolved alerts for this medicine
    const alertsSnapshot = await db
      .collection("alerts")
      .where("medicineId", "==", medicineId)
      .where("resolved", "==", false)
      .get();

    const deletePromises = [];

    alertsSnapshot.forEach((doc) => {
      const alert = doc.data();

      // Remove expired alert if medicine is no longer expired
      if (alert.type === "expired" && daysUntilExpiry >= 0) {
        deletePromises.push(doc.ref.delete());
      }
      // Remove expiry_soon alert if medicine is not expiring soon anymore
      else if (
        alert.type === "expiry_soon" &&
        daysUntilExpiry > EXPIRY_WARNING_DAYS
      ) {
        deletePromises.push(doc.ref.delete());
      }
      // Remove low_stock alert if stock is above threshold
      else if (
        alert.type === "low_stock" &&
        medicine.quantity > medicine.minThreshold
      ) {
        deletePromises.push(doc.ref.delete());
      }
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error cleaning up alerts:", error);
  }
}

// Get medicines with low stock (for order list)
async function getLowStockMedicines() {
  try {
    const allMedicines = await getAllMedicines();
    return allMedicines.filter(
      (med) => med.status === "low_stock" || med.quantity <= med.minThreshold,
    );
  } catch (error) {
    console.error("Error fetching low stock medicines:", error);
    return [];
  }
}

// Real-time listener for medicines
function subscribeToMedicines(callback) {
  return db
    .collection("medicines")
    .orderBy("updatedAt", "desc")
    .onSnapshot(
      async (snapshot) => {
        const medicines = snapshot.docs
          .filter((doc) => !doc.data().deleted) // exclude soft-deleted records
          .map((doc) => {
            const data = doc.data();
            const expiryDate = data.expiryDate?.toDate() || null;

            // CRITICAL: Recalculate status based on current date (ensures expired items are detected)
            let calculatedStatus = data.status || "in_stock";
            if (expiryDate) {
              calculatedStatus = calculateMedicineStatus(
                expiryDate,
                data.quantity || 0,
                data.minThreshold || 0,
              );

              // If status changed (especially to expired), update it in database
              if (calculatedStatus !== data.status) {
                // Update status asynchronously (don't block the callback)
                doc.ref
                  .update({
                    status: calculatedStatus,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                  })
                  .catch((err) => {
                    console.error("Error updating medicine status:", err);
                  });

                // Also check and create alerts for expired items
                if (
                  calculatedStatus === "expired" ||
                  calculatedStatus === "expiring_soon" ||
                  (calculatedStatus === "low_stock" &&
                    data.quantity <= data.minThreshold)
                ) {
                  checkAndCreateAlerts(doc.id, {
                    ...data,
                    expiryDate: expiryDate,
                    quantity: data.quantity || 0,
                    minThreshold: data.minThreshold || 0,
                  }).catch((err) => {
                    console.error("Error checking alerts:", err);
                  });
                }
              }
            }

            return {
              id: doc.id,
              ...data,
              status: calculatedStatus, // Use recalculated status (ensures expired items show correctly)
              expiryDate: expiryDate,
              category: data.category || "",
              createdAt: data.createdAt?.toDate() || null,
              updatedAt: data.updatedAt?.toDate() || null,
            };
          });

        callback(medicines);
      },
      (error) => {
        console.error("Error in medicines subscription:", error);
        callback([]);
      },
    );
}

// Helper function for CSV download (used in bulk operations)
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Soft Delete ─────────────────────────────────────────────────────────────

/**
 * Soft-delete a medicine: marks deleted=true, deletedAt, deletedBy.
 * Preserves the Firestore document for audit integrity.
 * Related alerts are resolved; an audit transaction is written.
 *
 * Admin only — enforced by Firestore rules.
 *
 * @param {string} medicineId
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function softDeleteMedicine(medicineId) {
  try {
    const user = getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const medRef = db.collection("medicines").doc(medicineId);
    const medDoc = await medRef.get();

    if (!medDoc.exists) {
      return { success: false, error: "Medicine not found." };
    }

    if (medDoc.data().deleted) {
      return { success: false, error: "Medicine is already deleted." };
    }

    const med = medDoc.data();

    // Mark as soft-deleted
    await medRef.update({
      deleted: true,
      deletedAt: firebase.firestore.FieldValue.serverTimestamp(),
      deletedBy: user.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Write audit transaction
    await db.collection("transactions").add({
      type: "delete",
      medicineId: medicineId,
      quantity: 0,
      previousQuantity: med.quantity || 0,
      newQuantity: 0,
      reason: `Medicine "${med.name}" soft-deleted by ${user.email}`,
      userId: user.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Resolve all active alerts for this medicine (do not delete them)
    const alertsSnap = await db
      .collection("alerts")
      .where("medicineId", "==", medicineId)
      .where("resolved", "==", false)
      .get();

    const resolvePromises = alertsSnap.docs.map((aDoc) =>
      aDoc.ref.update({
        resolved: true,
        resolvedAt: firebase.firestore.FieldValue.serverTimestamp(),
        resolvedBy: user.uid,
      }),
    );
    await Promise.all(resolvePromises);

    return { success: true };
  } catch (error) {
    console.error("Error soft-deleting medicine:", error);
    if (error.code === "permission-denied") {
      return {
        success: false,
        error: "Permission denied. Only admins can delete medicines.",
      };
    }
    return { success: false, error: error.message };
  }
}

// ─── Bulk Delete ─────────────────────────────────────────────────────────────

/**
 * Bulk soft-delete multiple medicines.
 * Writes individual audit transactions for each deletion.
 *
 * Admin only.
 *
 * @param {string[]} medicineIds  — array of Firestore document IDs
 * @returns {Promise<{success: boolean, deleted: number, failed: number, errors: string[]}>}
 */
async function bulkSoftDeleteMedicines(medicineIds) {
  if (!medicineIds || medicineIds.length === 0) {
    return {
      success: false,
      deleted: 0,
      failed: 0,
      errors: ["No medicines selected."],
    };
  }

  const results = await Promise.allSettled(
    medicineIds.map((id) => softDeleteMedicine(id)),
  );

  const deleted = results.filter(
    (r) => r.status === "fulfilled" && r.value.success,
  ).length;
  const failed = results.length - deleted;
  const errors = results
    .filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success),
    )
    .map((r) => r.reason?.message || r.value?.error || "Unknown error");

  return { success: failed === 0, deleted, failed, errors };
}

// ─── Category Helpers ─────────────────────────────────────────────────────────

/**
 * Get all distinct categories used in inventory (excluding deleted records).
 * Returns sorted array.
 *
 * @returns {Promise<string[]>}
 */
async function getAllCategories() {
  try {
    const meds = await getAllMedicines();
    const cats = new Set();
    meds.forEach((m) => {
      if (!m.deleted && m.category && m.category.trim()) {
        cats.add(m.category.trim());
      }
    });
    return Array.from(cats).sort();
  } catch (e) {
    return [];
  }
}
