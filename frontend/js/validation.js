/**
 * validation.js — Input validation and sanitization utilities
 *
 * Provides reusable validation helpers to keep forms safe and data
 * consistent across all pages in the Pharmacy Logistics System.
 */

// ─── Sanitization ────────────────────────────────────────────────────────────

/**
 * Strip HTML tags and dangerous characters from a string.
 * Use on every user-supplied text field before storing to Firestore.
 *
 * Sets innerHTML on a detached element so the browser parser handles all
 * tag-stripping (including nested/obfuscated patterns), then reads back
 * only the safe textContent. The element is never appended to the document
 * so no scripts execute.
 *
 * @param {string} value
 * @returns {string}
 */
function sanitizeText(value) {
  if (typeof value !== 'string') return '';
  // Use a temporary DOM element. Set innerHTML so the browser parses
  // (and discards) all HTML tags, then read back safe textContent only.
  const temp = document.createElement('div');
  temp.innerHTML = value;
  // textContent returns only text nodes — all HTML structure is stripped.
  const plain = temp.textContent || temp.innerText || '';
  // Collapse runs of whitespace but preserve single spaces
  return plain.replace(/\s+/g, ' ').trim();
}

/**
 * Sanitize a batch number: allow alphanumerics, hyphens, underscores, spaces.
 *
 * @param {string} value
 * @returns {string}
 */
function sanitizeBatchNumber(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[^a-zA-Z0-9\-_ ]/g, '').trim();
}

// ─── Field-level validators ──────────────────────────────────────────────────

/**
 * Validate a medicine name.
 * @param {string} name
 * @returns {{ valid: boolean, error?: string }}
 */
function validateMedicineName(name) {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Medicine name is required.' };
  }
  if (name.trim().length < 2) {
    return { valid: false, error: 'Medicine name must be at least 2 characters.' };
  }
  if (name.trim().length > 200) {
    return { valid: false, error: 'Medicine name must be 200 characters or fewer.' };
  }
  return { valid: true };
}

/**
 * Validate a batch number.
 * @param {string} batch
 * @returns {{ valid: boolean, error?: string }}
 */
function validateBatchNumber(batch) {
  if (!batch || !batch.trim()) {
    return { valid: false, error: 'Batch number is required.' };
  }
  if (batch.trim().length > 100) {
    return { valid: false, error: 'Batch number must be 100 characters or fewer.' };
  }
  return { valid: true };
}

/**
 * Validate a quantity value.
 * @param {*} quantity
 * @param {{ min?: number, max?: number, allowZero?: boolean }} opts
 * @returns {{ valid: boolean, error?: string }}
 */
function validateQuantity(quantity, opts = {}) {
  const { min = 0, max = 1000000, allowZero = true } = opts;
  const n = Number(quantity);
  if (isNaN(n) || !Number.isFinite(n)) {
    return { valid: false, error: 'Quantity must be a number.' };
  }
  if (!Number.isInteger(n)) {
    return { valid: false, error: 'Quantity must be a whole number.' };
  }
  if (!allowZero && n === 0) {
    return { valid: false, error: 'Quantity must be greater than zero.' };
  }
  if (n < min) {
    return { valid: false, error: `Quantity must be at least ${min}.` };
  }
  if (n > max) {
    return { valid: false, error: `Quantity cannot exceed ${max}.` };
  }
  return { valid: true };
}

/**
 * Validate an expiry date string or Date object.
 * Optionally enforce that the date is in the future.
 *
 * @param {string|Date} value
 * @param {{ mustBeFuture?: boolean }} opts
 * @returns {{ valid: boolean, error?: string }}
 */
function validateExpiryDate(value, opts = {}) {
  if (!value) {
    return { valid: false, error: 'Expiry date is required.' };
  }
  const date = value instanceof Date ? value : new Date(value);
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid expiry date.' };
  }
  if (opts.mustBeFuture) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return { valid: false, error: 'Expiry date must be in the future.' };
    }
  }
  // Sanity: not more than 30 years in the future
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 30);
  if (date > maxFuture) {
    return { valid: false, error: 'Expiry date seems unrealistically far in the future.' };
  }
  return { valid: true };
}

/**
 * Validate an email address.
 * @param {string} email
 * @returns {{ valid: boolean, error?: string }}
 */
function validateEmail(email) {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email address is required.' };
  }
  // RFC 5322 simplified pattern
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!pattern.test(email.trim())) {
    return { valid: false, error: 'Please enter a valid email address.' };
  }
  return { valid: true };
}

/**
 * Validate a phone number (permissive — allows international formats).
 * @param {string} phone
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePhone(phone) {
  if (!phone || !phone.trim()) {
    // Phone is typically optional
    return { valid: true };
  }
  const cleaned = phone.replace(/[\s\-().+]/g, '');
  if (!/^\d{6,15}$/.test(cleaned)) {
    return { valid: false, error: 'Please enter a valid phone number (6–15 digits).' };
  }
  return { valid: true };
}

// ─── Form helpers ────────────────────────────────────────────────────────────

/**
 * Show an error message under a form field.
 *
 * @param {string} fieldId  — id of the input element
 * @param {string} message  — error text to display
 */
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.add('input-error');
    field.setAttribute('aria-invalid', 'true');
  }
  // Look for a sibling error element named `${fieldId}Error`
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    errorEl.setAttribute('role', 'alert');
  }
}

/**
 * Clear error state from a form field.
 * @param {string} fieldId
 */
function clearFieldError(fieldId) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.remove('input-error');
    field.removeAttribute('aria-invalid');
  }
  const errorEl = document.getElementById(`${fieldId}Error`);
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
    errorEl.removeAttribute('role');
  }
}

/**
 * Clear all validation errors inside a given form element.
 * @param {HTMLFormElement} form
 */
function clearAllFieldErrors(form) {
  if (!form) return;
  form.querySelectorAll('.input-error').forEach(el => {
    el.classList.remove('input-error');
    el.removeAttribute('aria-invalid');
  });
  form.querySelectorAll('.form-error').forEach(el => {
    el.textContent = '';
    el.classList.add('hidden');
    el.removeAttribute('role');
  });
}

// ─── Dispense-specific validators ────────────────────────────────────────────

/**
 * Validate a dispense quantity against available stock.
 * @param {number} dispenseQty
 * @param {number} availableQty
 * @returns {{ valid: boolean, error?: string }}
 */
function validateDispenseQuantity(dispenseQty, availableQty) {
  const qtyResult = validateQuantity(dispenseQty, { min: 1, allowZero: false });
  if (!qtyResult.valid) return qtyResult;
  if (dispenseQty > availableQty) {
    return {
      valid: false,
      error: `Cannot dispense ${dispenseQty} — only ${availableQty} in stock.`
    };
  }
  return { valid: true };
}

/**
 * Validate a patient ID / reference string.
 * @param {string} patientId
 * @returns {{ valid: boolean, error?: string }}
 */
function validatePatientId(patientId) {
  if (!patientId || !patientId.trim()) {
    return { valid: false, error: 'Patient ID or reference is required.' };
  }
  if (patientId.trim().length > 100) {
    return { valid: false, error: 'Patient ID must be 100 characters or fewer.' };
  }
  return { valid: true };
}
