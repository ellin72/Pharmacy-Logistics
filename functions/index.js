/**
 * Cloud Functions for Pharmacy Logistics - SMTP Email Notifications
 *
 * This function listens to documents created in the Firestore `mail` collection
 * (queued by the frontend) and sends emails via SMTP using Nodemailer.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

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
  secure: String(smtpConfig.secure || 'false') === 'true',
  auth: smtpConfig.user && smtpConfig.pass ? {
    user: smtpConfig.user,
    pass: smtpConfig.pass
  } : undefined
});

/**
 * Validate that SMTP config is usable before attempting to send.
 */
function validateSmtpConfig() {
  if (!smtpConfig.host) {
    throw new Error('SMTP host is not configured (functions.config().smtp.host).');
  }
  if (!smtpConfig.from) {
    throw new Error('SMTP from address is not configured (functions.config().smtp.from).');
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
exports.sendMailOnCreate = functions.region('europe-west1')
  .firestore.document('mail/{mailId}')
  .onCreate(async (snap, context) => {
    const data = snap.data() || {};

    try {
      validateSmtpConfig();
    } catch (configError) {
      console.error('SMTP configuration error:', configError.message);
      // Optionally write error back to the document for debugging
      await snap.ref.set({
        error: `SMTP configuration error: ${configError.message}`,
        errorAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
      return null;
    }

    const to = data.to;
    const message = data.message || {};

    if (!to) {
      console.error('Missing `to` field in mail document:', context.params.mailId);
      return null;
    }

    if (!message.subject || !message.text) {
      console.error('Missing `message.subject` or `message.text` in mail document:', context.params.mailId);
      return null;
    }

    const mailOptions = {
      from: smtpConfig.from,
      to,
      subject: message.subject,
      text: message.text,
      html: message.html || message.text
    };

    try {
      const info = await transporter.sendMail(mailOptions);

      console.log('Email sent via SMTP:', {
        mailId: context.params.mailId,
        to,
        messageId: info.messageId
      });

      // Optionally mark the doc as sent
      await snap.ref.set({
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        smtpMessageId: info.messageId
      }, { merge: true });
    } catch (error) {
      console.error('Error sending email via SMTP for mailId', context.params.mailId, error);
      await snap.ref.set({
        sent: false,
        error: error.message || String(error),
        errorAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }

    return null;
  });
