/**
 * dispense.js — Medicine dispensing workflow
 *
 * Records medicine dispensed to patients, deducts stock, writes a transaction
 * and a dedicated dispense log, then updates alerts.
 */

// ─── State ───────────────────────────────────────────────────────────────────

let allMedicinesCache = [];
let dispenseRecords = [];
let filteredDispenseRecords = [];
const PAGE_SIZE = 20;
let currentPage = 1;
let unsubDispense = null;

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // Show logged-in user email
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = user.email;

    await loadMedicines();
    subscribeToDispenseHistory();
  });

  const form = document.getElementById('dispenseForm');
  if (form) form.addEventListener('submit', handleDispenseSubmit);

  const nameInput = document.getElementById('medicineName');
  if (nameInput) nameInput.addEventListener('change', handleMedicineSelected);
});

// ─── Load medicines for datalist ─────────────────────────────────────────────

async function loadMedicines() {
  try {
    const snapshot = await db.collection('medicines')
      .where('quantity', '>', 0)
      .get();

    allMedicinesCache = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      expiryDate: doc.data().expiryDate?.toDate() || null
    }));

    const datalist = document.getElementById('medicineList');
    if (datalist) {
      datalist.innerHTML = '';
      allMedicinesCache.forEach(med => {
        const opt = document.createElement('option');
        // Include batch in the option label to differentiate same-name medicines
        opt.value = `${med.name} [${med.batch}]`;
        opt.dataset.id = med.id;
        datalist.appendChild(opt);
      });
    }
  } catch (err) {
    console.error('Error loading medicines:', err);
  }
}

// ─── Populate stock info when a medicine is selected ─────────────────────────

function handleMedicineSelected() {
  const input = document.getElementById('medicineName');
  const val = input.value.trim();
  clearFieldError('medicineName');

  // Match against "Name [BATCH]" format
  const match = allMedicinesCache.find(m => `${m.name} [${m.batch}]` === val);

  const stockInfo = document.getElementById('stockInfo');
  const stockInfoText = document.getElementById('stockInfoText');

  if (match) {
    document.getElementById('selectedMedicineId').value = match.id;
    document.getElementById('selectedMedicineQty').value = match.quantity;

    const expiryStr = match.expiryDate
      ? match.expiryDate.toLocaleDateString()
      : 'N/A';

    let statusColor = 'var(--success-color)';
    if (match.status === 'expired') statusColor = 'var(--danger-color)';
    else if (match.status === 'expiring_soon' || match.status === 'low_stock') statusColor = 'var(--warning-color)';

    // Build stock info using DOM methods to avoid any risk of XSS from status/batch values
    stockInfoText.textContent = '';
    const statusText = match.status || 'in_stock';

    const fragment = document.createDocumentFragment();

    const availSpan = document.createElement('span');
    availSpan.textContent = 'Available: ';
    const availStrong = document.createElement('strong');
    availStrong.textContent = String(match.quantity);
    availSpan.appendChild(availStrong);
    const availSuffix = document.createTextNode(' units  |  ');
    fragment.appendChild(availSpan);
    fragment.appendChild(availSuffix);

    const expirySpan = document.createElement('span');
    expirySpan.textContent = 'Expiry: ';
    const expiryStrong = document.createElement('strong');
    expiryStrong.textContent = expiryStr;
    expirySpan.appendChild(expiryStrong);
    const expirySuffix = document.createTextNode('  |  ');
    fragment.appendChild(expirySpan);
    fragment.appendChild(expirySuffix);

    const statusSpan = document.createElement('span');
    statusSpan.textContent = 'Status: ';
    const statusStrong = document.createElement('strong');
    statusStrong.style.color = statusColor;
    statusStrong.textContent = statusText;
    statusSpan.appendChild(statusStrong);
    fragment.appendChild(statusSpan);

    stockInfoText.appendChild(fragment);

    stockInfo.style.display = 'block';
  } else {
    document.getElementById('selectedMedicineId').value = '';
    document.getElementById('selectedMedicineQty').value = '0';
    stockInfo.style.display = 'none';
  }
}

// ─── Form submission ──────────────────────────────────────────────────────────

async function handleDispenseSubmit(e) {
  e.preventDefault();

  clearAllFieldErrors(document.getElementById('dispenseForm'));
  hideFormMessage();

  const medicineName = sanitizeText(document.getElementById('medicineName').value);
  const medicineId = document.getElementById('selectedMedicineId').value;
  const availableQty = parseInt(document.getElementById('selectedMedicineQty').value || '0', 10);
  const dispenseQty = parseInt(document.getElementById('dispenseQuantity').value || '0', 10);
  const patientId = sanitizeText(document.getElementById('patientId').value);
  const prescribedBy = sanitizeText(document.getElementById('prescribedBy').value);
  const notes = sanitizeText(document.getElementById('dispenseNotes').value);

  // ── Validation ──────────────────────────────────────────────────────────────
  let hasErrors = false;

  if (!medicineId) {
    showFieldError('medicineName', 'Please select a valid medicine from the list.');
    hasErrors = true;
  }

  const qtyResult = validateDispenseQuantity(dispenseQty, availableQty);
  if (!qtyResult.valid) {
    showFieldError('dispenseQuantity', qtyResult.error);
    hasErrors = true;
  }

  const patientResult = validatePatientId(patientId);
  if (!patientResult.valid) {
    showFieldError('patientId', patientResult.error);
    hasErrors = true;
  }

  if (hasErrors) return;

  // ── Find medicine ────────────────────────────────────────────────────────────
  const medicine = allMedicinesCache.find(m => m.id === medicineId);
  if (!medicine) {
    showFormMessage('Medicine not found. Please refresh and try again.', 'error');
    return;
  }

  // ── Check expiry ─────────────────────────────────────────────────────────────
  if (medicine.status === 'expired') {
    showFormMessage(
      '⚠️ Warning: this medicine has expired. Dispensing is not allowed for expired medicines.',
      'error'
    );
    return;
  }

  const btn = document.getElementById('dispenseBtn');
  btn.disabled = true;
  btn.textContent = 'Dispensing…';

  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const newQuantity = medicine.quantity - dispenseQty;
    const newStatus = calculateDispenseStatus(newQuantity, medicine.minThreshold, medicine.expiryDate);

    const batch = db.batch();

    // 1. Update medicine stock
    const medRef = db.collection('medicines').doc(medicineId);
    batch.update(medRef, {
      quantity: newQuantity,
      status: newStatus,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 2. Write transaction log
    const txRef = db.collection('transactions').doc();
    batch.set(txRef, {
      medicineId: medicineId,
      medicineName: medicine.name,
      medicineBatch: medicine.batch,
      type: 'dispense',
      quantity: -dispenseQty,
      previousQuantity: medicine.quantity,
      newQuantity: newQuantity,
      patientId: patientId,
      prescribedBy: prescribedBy || null,
      reason: notes || `Dispensed to patient ${patientId}`,
      userId: user.uid,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 3. Write dedicated dispense record
    const dispRef = db.collection('dispenseRecords').doc();
    batch.set(dispRef, {
      medicineId: medicineId,
      medicineName: medicine.name,
      medicineBatch: medicine.batch,
      quantityDispensed: dispenseQty,
      patientId: patientId,
      prescribedBy: prescribedBy || null,
      notes: notes || '',
      dispensedBy: user.uid,
      dispensedByEmail: user.email,
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    await batch.commit();

    // Update local cache
    const cacheIdx = allMedicinesCache.findIndex(m => m.id === medicineId);
    if (cacheIdx !== -1) {
      allMedicinesCache[cacheIdx].quantity = newQuantity;
      allMedicinesCache[cacheIdx].status = newStatus;
    }

    showFormMessage(`✅ Dispensed ${dispenseQty} unit(s) of ${medicine.name} to patient ${patientId}.`, 'success');

    if (typeof showInAppNotification === 'function') {
      showInAppNotification(`Dispensed ${dispenseQty}× ${medicine.name}`, 'success', 4000);
    }

    resetDispenseForm();

    // Reload medicines list with updated quantities
    await loadMedicines();

  } catch (err) {
    console.error('Dispense error:', err);
    showFormMessage(`Error: ${err.message || 'Failed to dispense. Please try again.'}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '💊 Dispense Medicine';
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculate medicine status after dispensing.
 * Mirrors logic in inventory.js to keep statuses consistent.
 */
function calculateDispenseStatus(quantity, minThreshold, expiryDate) {
  const now = new Date();
  if (expiryDate && expiryDate < now) return 'expired';
  if (quantity <= 0) return 'out_of_stock';
  const warningMs = 90 * 24 * 60 * 60 * 1000;
  if (expiryDate && (expiryDate - now) < warningMs) return 'expiring_soon';
  if (quantity <= (minThreshold || 0)) return 'low_stock';
  return 'in_stock';
}

function resetDispenseForm() {
  const form = document.getElementById('dispenseForm');
  if (form) form.reset();
  document.getElementById('selectedMedicineId').value = '';
  document.getElementById('selectedMedicineQty').value = '0';
  document.getElementById('stockInfo').style.display = 'none';
  clearAllFieldErrors(form);
}

function showFormMessage(msg, type) {
  const el = document.getElementById('formMessage');
  if (!el) return;
  el.textContent = msg;
  el.style.background = type === 'success' ? '#d1fae5' : '#fee2e2';
  el.style.color = type === 'success' ? '#065f46' : '#991b1b';
  el.style.border = type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca';
  el.classList.remove('hidden');
  el.setAttribute('role', 'alert');
}

function hideFormMessage() {
  const el = document.getElementById('formMessage');
  if (el) {
    el.classList.add('hidden');
    el.removeAttribute('role');
  }
}

// ─── History subscription ─────────────────────────────────────────────────────

function subscribeToDispenseHistory() {
  if (unsubDispense) unsubDispense();

  document.getElementById('historyLoading').style.display = 'block';
  document.getElementById('historyEmpty').classList.add('hidden');
  document.getElementById('historyTable').classList.add('hidden');

  unsubDispense = db.collection('dispenseRecords')
    .orderBy('timestamp', 'desc')
    .limit(200)
    .onSnapshot((snapshot) => {
      document.getElementById('historyLoading').style.display = 'none';

      dispenseRecords = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate() || null
      }));

      filterDispenseHistory();
    }, (err) => {
      console.error('Dispense history error:', err);
      document.getElementById('historyLoading').style.display = 'none';
    });
}

function filterDispenseHistory() {
  const query = (document.getElementById('historySearch')?.value || '').toLowerCase();
  filteredDispenseRecords = dispenseRecords.filter(r => {
    if (!query) return true;
    return (
      (r.medicineName || '').toLowerCase().includes(query) ||
      (r.patientId || '').toLowerCase().includes(query) ||
      (r.medicineBatch || '').toLowerCase().includes(query)
    );
  });
  currentPage = 1;
  renderHistoryPage();
}

function renderHistoryPage() {
  const tbody = document.getElementById('historyBody');
  const empty = document.getElementById('historyEmpty');
  const table = document.getElementById('historyTable');

  if (!filteredDispenseRecords.length) {
    empty.classList.remove('hidden');
    table.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  table.classList.remove('hidden');

  const start = (currentPage - 1) * PAGE_SIZE;
  const page = filteredDispenseRecords.slice(start, start + PAGE_SIZE);

  tbody.innerHTML = page.map(r => {
    const ts = r.timestamp ? r.timestamp.toLocaleString() : '—';
    return `<tr>
      <td style="white-space:nowrap;font-size:0.8rem;">${ts}</td>
      <td><strong>${escapeHtml(r.medicineName || '—')}</strong></td>
      <td style="font-size:0.8rem;">${escapeHtml(r.medicineBatch || '—')}</td>
      <td><strong style="color:var(--danger-color)">-${r.quantityDispensed || 0}</strong></td>
      <td>${escapeHtml(r.patientId || '—')}</td>
      <td>${escapeHtml(r.prescribedBy || '—')}</td>
      <td style="font-size:0.8rem;">${escapeHtml(r.dispensedByEmail || r.dispensedBy || '—')}</td>
      <td style="font-size:0.8rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(r.notes || '')}">${escapeHtml(r.notes || '—')}</td>
    </tr>`;
  }).join('');

  renderPagination(filteredDispenseRecords.length);
}

function renderPagination(total) {
  const container = document.getElementById('historyPagination');
  if (!container) return;
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) { container.innerHTML = ''; return; }

  let html = '';
  for (let i = 1; i <= pages; i++) {
    const active = i === currentPage;
    html += `<button
      class="btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}"
      onclick="goToPage(${i})"
      ${active ? 'aria-current="page"' : ''}
    >${i}</button>`;
  }
  container.innerHTML = html;
}

function goToPage(page) {
  currentPage = page;
  renderHistoryPage();
}

// ─── CSV Export ──────────────────────────────────────────────────────────────

function exportDispenseHistory() {
  if (!filteredDispenseRecords.length) {
    alert('No records to export.');
    return;
  }
  const headers = ['Date/Time', 'Medicine', 'Batch', 'Qty Dispensed', 'Patient ID', 'Prescribed By', 'Dispensed By', 'Notes'];
  const rows = filteredDispenseRecords.map(r => [
    r.timestamp ? r.timestamp.toLocaleString() : '',
    `"${(r.medicineName || '').replace(/"/g, '""')}"`,
    `"${(r.medicineBatch || '').replace(/"/g, '""')}"`,
    r.quantityDispensed || 0,
    `"${(r.patientId || '').replace(/"/g, '""')}"`,
    `"${(r.prescribedBy || '').replace(/"/g, '""')}"`,
    `"${(r.dispensedByEmail || r.dispensedBy || '').replace(/"/g, '""')}"`,
    `"${(r.notes || '').replace(/"/g, '""')}"`
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `dispense-records-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
