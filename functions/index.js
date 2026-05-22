/**
 * Cloud Functions for Pharmacy Logistics - SMTP Email Notifications
 *
 * This function listens to documents created in the Firestore `mail` collection
 * (queued by the frontend) and sends emails via SMTP using Nodemailer.
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

// Load SMTP configuration from environment (do NOT hardcode secrets)
// Set these via:
// Set SMTP configuration using Firebase CLI before deploying the function.

// Then deploy functions.

const smtpConfig = functions.config().smtp || {};

// Create a reusable Nodemailer transporter using SMTP.
const transporter = nodemailer.createTransport({
  host: smtpConfig.host,
  port: Number(smtpConfig.port) || 587,
  secure: String(smtpConfig.secure || "false") === "true",
  auth:
    smtpConfig.user && smtpConfig.pass
      ? {
          user: smtpConfig.user,
          pass: smtpConfig.pass,
        }
      : undefined,
});

/**
 * Validate that SMTP config is usable before attempting to send.
 */
function validateSmtpConfig() {
  if (!smtpConfig.host) {
    throw new Error(
      "SMTP host is not configured (functions.config().smtp.host).",
    );
  }
  if (!smtpConfig.from) {
    throw new Error(
      "SMTP from address is not configured (functions.config().smtp.from).",
    );
  }
}

/**
 * Firestore trigger: send email when a new document is created in `mail`.
 *
 * Path: mail/{mailId}
 * Expected fields:
 *   to: string | string[]
 *   message.subject: string
 *   message.text: string
 *   message.html?: string
 */
exports.sendMailOnCreate = functions
  .region("europe-west1")
  .firestore.document("mail/{mailId}")
  .onCreate(async (snap, context) => {
    const data = snap.data() || {};

    try {
      validateSmtpConfig();
    } catch (configError) {
      console.error("SMTP configuration error:", configError.message);
      // Optionally write error back to the document for debugging
      await snap.ref.set(
        {
          error: `SMTP configuration error: ${configError.message}`,
          errorAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      return null;
    }

    const to = data.to;
    const message = data.message || {};

    if (!to) {
      console.error(
        "Missing `to` field in mail document:",
        context.params.mailId,
      );
      return null;
    }

    if (!message.subject || !message.text) {
      console.error(
        "Missing `message.subject` or `message.text` in mail document:",
        context.params.mailId,
      );
      return null;
    }

    const mailOptions = {
      from: smtpConfig.from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html || message.text,
    };

    try {
      const info = await transporter.sendMail(mailOptions);

      console.log("Email sent via SMTP:", {
        mailId: context.params.mailId,
        to,
        messageId: info.messageId,
      });

      // Optionally mark the doc as sent
      await snap.ref.set(
        {
          sent: true,
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          smtpMessageId: info.messageId,
        },
        { merge: true },
      );
    } catch (error) {
      console.error(
        "Error sending email via SMTP for mailId",
        context.params.mailId,
        error,
      );
      await snap.ref.set(
        {
          sent: false,
          error: error.message || String(error),
          errorAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    }

    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// Scheduled: Save daily operational metrics snapshot to Firestore
// Runs every day at 01:00 UTC. Mirrors the frontend computeMetrics logic.
// ─────────────────────────────────────────────────────────────────────────────

const METRICS_EXPIRY_DAYS = 90;

exports.scheduledMetricsSnapshot = functions
  .region("europe-west1")
  .pubsub.schedule("every 24 hours")
  .timeZone("UTC")
  .onRun(async (_context) => {
    const db = admin.firestore();
    const now = new Date();

    // Fetch all non-deleted medicines
    const snapshot = await db
      .collection("medicines")
      .where("deleted", "!=", true)
      .get();

    const medicines = [];
    snapshot.forEach((doc) => {
      const d = doc.data();
      if (!d.deleted) medicines.push({ id: doc.id, ...d });
    });

    const total = medicines.length;
    if (total === 0) {
      console.log("scheduledMetricsSnapshot: no medicines to snapshot.");
      return null;
    }

    let goodStanding = 0,
      lowStock = 0,
      expiredCount = 0,
      expiringSoon = 0,
      outOfStock = 0,
      adequate = 0;

    medicines.forEach((m) => {
      const qty = m.quantity || 0;
      const min = m.minThreshold || 0;
      const expiryDate = m.expiryDate
        ? m.expiryDate.toDate
          ? m.expiryDate.toDate()
          : new Date(m.expiryDate)
        : null;
      const daysToExpiry = expiryDate
        ? Math.floor((expiryDate - now) / 86400000)
        : Infinity;

      if (daysToExpiry < 0) {
        expiredCount++;
      } else if (qty <= 0) {
        outOfStock++;
      } else if (qty <= min) {
        lowStock++;
        if (daysToExpiry <= METRICS_EXPIRY_DAYS) expiringSoon++;
      } else {
        // adequate stock
        adequate++;
        if (daysToExpiry <= METRICS_EXPIRY_DAYS) expiringSoon++;
      }
    });

    goodStanding = medicines.length - expiredCount - lowStock - outOfStock;
    if (goodStanding < 0) goodStanding = 0;

    const goodStandingPct = Math.round((goodStanding / total) * 100);
    const lowStockPct = Math.round((lowStock / total) * 100);
    const expiredPct = Math.round((expiredCount / total) * 100);
    const expiringSoonPct = Math.round((expiringSoon / total) * 100);
    const outOfStockPct = Math.round((outOfStock / total) * 100);
    const stockAvailPct = Math.max(0, 100 - outOfStockPct - expiredPct);

    const overallOperatingScore = Math.min(
      100,
      Math.max(
        0,
        goodStandingPct * 0.45 +
          stockAvailPct * 0.3 -
          expiredPct * 0.15 -
          lowStockPct * 0.1,
      ),
    );

    const dateKey = now.toISOString().split("T")[0]; // YYYY-MM-DD

    const metricsData = {
      date: dateKey,
      total,
      goodStanding,
      lowStock,
      expired: expiredCount,
      expiringSoon,
      outOfStock,
      adequate,
      goodStandingPct,
      lowStockPct,
      expiredPct,
      expiringSoonPct,
      outOfStockPct,
      stockAvailPct,
      overallOperatingScore: Math.round(overallOperatingScore),
      savedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db
      .collection("operationalMetricsSnapshots")
      .doc(dateKey)
      .set(metricsData, { merge: true });
    console.log(
      `scheduledMetricsSnapshot: snapshot saved for ${dateKey}`,
      metricsData,
    );
    return null;
  });

// ─────────────────────────────────────────────────────────────────────────────
// Firestore trigger: notify admins when a new emergency order is created
// ─────────────────────────────────────────────────────────────────────────────

exports.onEmergencyOrderCreate = functions
  .region("europe-west1")
  .firestore.document("emergencyOrders/{orderId}")
  .onCreate(async (snap, context) => {
    const db = admin.firestore();
    const order = snap.data() || {};

    // Fetch all admin users
    let adminEmails = [];
    try {
      const usersSnap = await db
        .collection("users")
        .where("role", "==", "admin")
        .get();
      usersSnap.forEach((doc) => {
        const u = doc.data();
        if (u.email) adminEmails.push(u.email);
      });
    } catch (e) {
      console.error("onEmergencyOrderCreate: could not fetch admin emails", e);
    }

    if (adminEmails.length === 0) {
      console.log(
        "onEmergencyOrderCreate: no admin emails found, skipping notification.",
      );
      return null;
    }

    const requestedAt = order.requestedAt
      ? order.requestedAt.toDate
        ? order.requestedAt.toDate().toISOString()
        : String(order.requestedAt)
      : new Date().toISOString();

    const subject = `🚨 Emergency Order: ${order.medicineName || "Unknown Medicine"} [${context.params.orderId}]`;
    const text = [
      `A new emergency order has been submitted and requires your attention.`,
      ``,
      `Medicine:           ${order.medicineName || "Unknown"}`,
      `Requested Quantity: ${order.requestedQuantity}`,
      `Current Stock:      ${order.currentStock !== undefined ? order.currentStock : "N/A"}`,
      `Min Threshold:      ${order.minThreshold !== undefined ? order.minThreshold : "N/A"}`,
      `Priority:           ${order.priority || "emergency"}`,
      `Reason:             ${order.reason || "—"}`,
      `Requested By:       ${order.requestedByEmail || order.requestedBy || "Unknown"}`,
      `Requested At:       ${requestedAt}`,
      ``,
      `Please log in to the Pharmacy Logistics system to approve or action this order.`,
    ].join("\n");

    // Queue email via mail collection (picked up by sendMailOnCreate)
    try {
      await db.collection("mail").add({
        to: adminEmails,
        message: { subject, text },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        source: "onEmergencyOrderCreate",
        orderId: context.params.orderId,
      });
      console.log(
        "onEmergencyOrderCreate: mail queued for",
        adminEmails.join(", "),
      );
    } catch (e) {
      console.error("onEmergencyOrderCreate: failed to queue mail", e);
    }

    return null;
  });
