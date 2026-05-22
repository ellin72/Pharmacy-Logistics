/**
 * emergency-orders.js — Emergency Order Management
 *
 * Handles creating, reading, updating, and notifying about emergency orders.
 *
 * DATA MODEL (Firestore collection: emergencyOrders)
 * ---------------------------------------------------
 * medicineId        string   — Firestore document ID of the medicine
 * medicineName      string   — cached name for display
 * requestedQuantity number   — how many units needed
 * currentStock      number   — stock level at time of request
 * minThreshold      number   — minimum threshold at time of request
 * reason            string   — why this is an emergency
 * requestedBy       string   — UID of requester
 * requestedByEmail  string   — email of requester (cached)
 * requestedAt       timestamp
 * status            string   — 'pending' | 'approved' | 'ordered' | 'fulfilled' | 'cancelled'
 * priority          string   — always 'emergency'
 * notes             string   — additional admin notes
 * updatedAt         timestamp
 * updatedBy         string   — UID of last editor
 */

const EMERGENCY_STATUSES = [
  "pending",
  "approved",
  "ordered",
  "fulfilled",
  "cancelled",
];
const EMERGENCY_PRIORITY = "emergency";

// ─── Create ──────────────────────────────────────────────────────────────────

/**
 * Create a new emergency order.
 *
 * @param {object} orderData  — { medicineId, medicineName, requestedQuantity,
 *                               currentStock, minThreshold, reason, notes? }
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
async function createEmergencyOrder(orderData) {
  try {
    const user = getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Validation
    if (!orderData.medicineId) {
      return { success: false, error: "Medicine is required." };
    }
    if (!orderData.reason || orderData.reason.trim().length < 5) {
      return {
        success: false,
        error: "Please provide a reason (at least 5 characters).",
      };
    }
    const qty = parseInt(orderData.requestedQuantity);
    if (!qty || qty <= 0) {
      return {
        success: false,
        error: "Requested quantity must be a positive number.",
      };
    }

    const doc = {
      medicineId: orderData.medicineId,
      medicineName: (orderData.medicineName || "").trim(),
      requestedQuantity: qty,
      currentStock: parseInt(orderData.currentStock) || 0,
      minThreshold: parseInt(orderData.minThreshold) || 0,
      reason: orderData.reason.trim(),
      requestedBy: user.uid,
      requestedByEmail: user.email || "",
      requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "pending",
      priority: EMERGENCY_PRIORITY,
      notes: (orderData.notes || "").trim(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    };

    const ref = await db.collection("emergencyOrders").add(doc);

    // Write an audit transaction
    await db.collection("transactions").add({
      type: "emergency_order_created",
      medicineId: orderData.medicineId,
      quantity: qty,
      previousQuantity: parseInt(orderData.currentStock) || 0,
      newQuantity: parseInt(orderData.currentStock) || 0,
      reason: `Emergency order requested: ${orderData.reason.trim()}`,
      userId: user.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Queue email notification (non-blocking)
    _queueEmergencyOrderEmail(ref.id, doc, "created").catch((err) =>
      console.error("Emergency order email error:", err),
    );

    // Show in-app notification if function is available
    if (typeof showInAppNotification === "function") {
      showInAppNotification(
        `🚨 Emergency order created for <strong>${doc.medicineName}</strong>`,
        "warning",
        6000,
      );
    }

    return { success: true, id: ref.id };
  } catch (error) {
    console.error("Error creating emergency order:", error);
    if (error.code === "permission-denied") {
      return {
        success: false,
        error: "Permission denied. Please check your role.",
      };
    }
    return {
      success: false,
      error: error.message || "Failed to create emergency order.",
    };
  }
}

// ─── Read ────────────────────────────────────────────────────────────────────

/**
 * Get all emergency orders (optionally filtered by status).
 *
 * @param {string} statusFilter  — 'all' | one of EMERGENCY_STATUSES
 * @returns {Promise<Array>}
 */
async function getEmergencyOrders(statusFilter = "all") {
  try {
    let query = db.collection("emergencyOrders").orderBy("requestedAt", "desc");

    if (statusFilter !== "all") {
      query = db
        .collection("emergencyOrders")
        .where("status", "==", statusFilter)
        .orderBy("requestedAt", "desc");
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => _mapEODoc(doc));
  } catch (error) {
    console.error("Error fetching emergency orders:", error);
    return [];
  }
}

/**
 * Real-time subscription to emergency orders.
 *
 * @param {Function} callback  — called with updated array
 * @param {string}   statusFilter
 * @returns {Function}  unsubscribe function
 */
function subscribeToEmergencyOrders(callback, statusFilter = "all") {
  let query = db.collection("emergencyOrders").orderBy("requestedAt", "desc");
  if (statusFilter !== "all") {
    query = db
      .collection("emergencyOrders")
      .where("status", "==", statusFilter)
      .orderBy("requestedAt", "desc");
  }

  return query.onSnapshot(
    (snapshot) => {
      callback(snapshot.docs.map((doc) => _mapEODoc(doc)));
    },
    (error) => {
      console.error("Emergency orders subscription error:", error);
      callback([]);
    },
  );
}

// ─── Update ──────────────────────────────────────────────────────────────────

/**
 * Update the status of an emergency order (admin only, enforced by Firestore rules).
 *
 * @param {string} orderId  — Firestore document ID
 * @param {string} newStatus  — one of EMERGENCY_STATUSES
 * @param {string} adminNotes — optional notes from admin
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function updateEmergencyOrderStatus(orderId, newStatus, adminNotes = "") {
  try {
    const user = getCurrentUser();
    if (!user) return { success: false, error: "Not authenticated" };

    if (!EMERGENCY_STATUSES.includes(newStatus)) {
      return { success: false, error: `Invalid status: ${newStatus}` };
    }

    const update = {
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: user.uid,
    };
    if (adminNotes.trim()) {
      update.notes = adminNotes.trim();
    }

    await db.collection("emergencyOrders").doc(orderId).update(update);

    // Audit trail
    const orderDoc = await db.collection("emergencyOrders").doc(orderId).get();
    if (orderDoc.exists) {
      const od = orderDoc.data();
      await db.collection("transactions").add({
        type: "emergency_order_status_changed",
        medicineId: od.medicineId || "",
        quantity: od.requestedQuantity || 0,
        previousQuantity: 0,
        newQuantity: 0,
        reason: `Emergency order ${orderId} status changed to "${newStatus}"${adminNotes ? ": " + adminNotes : ""}`,
        userId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating emergency order status:", error);
    if (error.code === "permission-denied") {
      return {
        success: false,
        error: "Only admins can update order statuses.",
      };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Cancel an emergency order (requester or admin).
 */
async function cancelEmergencyOrder(orderId, reason = "") {
  return updateEmergencyOrderStatus(
    orderId,
    "cancelled",
    reason || "Cancelled by user",
  );
}

// ─── Bulk Emergency Orders ───────────────────────────────────────────────────

/**
 * Create emergency orders for multiple medicines at once.
 *
 * @param {Array}  medicines  — array of medicine objects (must have id, name, quantity, minThreshold)
 * @param {string} reason     — shared reason for all orders
 * @returns {Promise<{success: boolean, created: number, failed: number, errors: string[]}>}
 */
async function bulkCreateEmergencyOrders(medicines, reason) {
  const results = await Promise.allSettled(
    medicines.map((med) =>
      createEmergencyOrder({
        medicineId: med.id,
        medicineName: med.name,
        requestedQuantity: Math.max(
          med.minThreshold * 2 - med.quantity,
          med.minThreshold,
        ),
        currentStock: med.quantity,
        minThreshold: med.minThreshold,
        reason: reason,
      }),
    ),
  );

  const created = results.filter(
    (r) => r.status === "fulfilled" && r.value.success,
  ).length;
  const failed = results.length - created;
  const errors = results
    .filter(
      (r) =>
        r.status === "rejected" ||
        (r.status === "fulfilled" && !r.value.success),
    )
    .map((r) => r.reason?.message || r.value?.error || "Unknown error");

  return { success: failed === 0, created, failed, errors };
}

// ─── Email Notification ──────────────────────────────────────────────────────

/**
 * Queue an email notification for an emergency order event.
 * Uses the same "mail" collection pattern as alerts.js.
 *
 * @private
 */
async function _queueEmergencyOrderEmail(orderId, orderData, event) {
  if (typeof db === "undefined") return;

  // Get all admin users to notify
  const usersSnap = await db
    .collection("users")
    .where("role", "==", "admin")
    .get();
  const adminEmails = usersSnap.docs.map((d) => d.data().email).filter(Boolean);

  if (adminEmails.length === 0) return;

  const subject =
    event === "created"
      ? `🚨 Emergency Order: ${orderData.medicineName}`
      : `Emergency Order Updated: ${orderData.medicineName}`;

  const body = [
    `An emergency order has been ${event === "created" ? "created" : "updated"}.`,
    "",
    `Medicine: ${orderData.medicineName}`,
    `Requested Qty: ${orderData.requestedQuantity}`,
    `Current Stock: ${orderData.currentStock}`,
    `Min Threshold: ${orderData.minThreshold}`,
    `Reason: ${orderData.reason}`,
    `Requested By: ${orderData.requestedByEmail}`,
    `Status: ${orderData.status}`,
    "",
    "Please log in to the Pharmacy Logistics system to manage this order.",
  ].join("\n");

  await db.collection("mail").add({
    to: adminEmails,
    message: {
      subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
    },
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function _mapEODoc(doc) {
  const d = doc.data();
  return {
    id: doc.id,
    ...d,
    requestedAt: d.requestedAt?.toDate() || null,
    updatedAt: d.updatedAt?.toDate() || null,
  };
}

/**
 * Format a status string for display.
 */
function formatEOStatus(status) {
  const map = {
    pending: "⏳ Pending",
    approved: "✅ Approved",
    ordered: "📦 Ordered",
    fulfilled: "✔️ Fulfilled",
    cancelled: "❌ Cancelled",
  };
  return map[status] || status;
}

/**
 * Get the CSS badge class for an emergency order status.
 */
function getEOStatusBadgeClass(status) {
  const map = {
    pending: "badge-pending",
    approved: "badge-approved",
    ordered: "badge-ordered",
    fulfilled: "badge-fulfilled",
    cancelled: "badge-cancelled",
  };
  return map[status] || "";
}

/**
 * Get pending emergency order count for dashboard badges.
 * @returns {Promise<number>}
 */
async function getPendingEmergencyOrderCount() {
  try {
    const snap = await db
      .collection("emergencyOrders")
      .where("status", "==", "pending")
      .get();
    return snap.size;
  } catch (e) {
    return 0;
  }
}
