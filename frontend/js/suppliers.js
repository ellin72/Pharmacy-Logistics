/**
 * suppliers.js — Supplier management (CRUD)
 *
 * Allows admin/staff to create, view, edit, and delete medicine suppliers.
 * Each supplier record is stored in the Firestore "suppliers" collection.
 */

// ─── State ───────────────────────────────────────────────────────────────────

let allSuppliers = [];
let filteredSuppliers = [];
let supplierToDelete = null;
let unsubSuppliers = null;

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = user.email;

    subscribeToSuppliers();
  });

  const form = document.getElementById('supplierForm');
  if (form) form.addEventListener('submit', handleSupplierSave);
});

// ─── Real-time subscription ───────────────────────────────────────────────────

function subscribeToSuppliers() {
  if (unsubSuppliers) unsubSuppliers();

  document.getElementById('suppliersLoading').style.display = 'block';
  document.getElementById('suppliersEmpty').classList.add('hidden');
  document.getElementById('suppliersTable').classList.add('hidden');

  unsubSuppliers = db.collection('suppliers')
    .orderBy('name')
    .onSnapshot((snapshot) => {
      document.getElementById('suppliersLoading').style.display = 'none';

      allSuppliers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || null,
        updatedAt: doc.data().updatedAt?.toDate() || null
      }));

      filterSuppliers();
    }, (err) => {
      console.error('Suppliers subscription error:', err);
      document.getElementById('suppliersLoading').style.display = 'none';
    });
}

// ─── Filtering ────────────────────────────────────────────────────────────────

function filterSuppliers() {
  const query = (document.getElementById('supplierSearch')?.value || '').toLowerCase();

  filteredSuppliers = allSuppliers.filter(s => {
    if (!query) return true;
    return (
      (s.name || '').toLowerCase().includes(query) ||
      (s.contactPerson || '').toLowerCase().includes(query) ||
      (s.email || '').toLowerCase().includes(query) ||
      (s.phone || '').toLowerCase().includes(query)
    );
  });

  const countEl = document.getElementById('supplierCount');
  if (countEl) {
    countEl.textContent = `${filteredSuppliers.length} supplier${filteredSuppliers.length !== 1 ? 's' : ''}`;
  }

  renderSuppliers();
}

// ─── Render ───────────────────────────────────────────────────────────────────

function renderSuppliers() {
  const empty = document.getElementById('suppliersEmpty');
  const table = document.getElementById('suppliersTable');
  const tbody = document.getElementById('suppliersBody');

  if (!filteredSuppliers.length) {
    empty.classList.remove('hidden');
    table.classList.add('hidden');
    return;
  }

  empty.classList.add('hidden');
  table.classList.remove('hidden');

  tbody.innerHTML = filteredSuppliers.map(s => `
    <tr>
      <td><strong>${escapeHtml(s.name || '—')}</strong></td>
      <td>${escapeHtml(s.contactPerson || '—')}</td>
      <td>
        ${s.phone
          ? `<a href="tel:${escapeHtml(s.phone)}" style="color:var(--primary-color);">${escapeHtml(s.phone)}</a>`
          : '—'}
      </td>
      <td>
        ${s.email
          ? `<a href="mailto:${escapeHtml(s.email)}" style="color:var(--primary-color);">${escapeHtml(s.email)}</a>`
          : '—'}
      </td>
      <td style="font-size:0.8rem;max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(s.address || '')}">
        ${escapeHtml(s.address || '—')}
      </td>
      <td style="font-size:0.8rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(s.notes || '')}">
        ${escapeHtml(s.notes || '—')}
      </td>
      <td>
        <div style="display:flex;gap:0.375rem;">
          <button class="btn btn-secondary btn-sm" onclick="openEditModal('${escapeHtml(s.id)}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="openDeleteModal('${escapeHtml(s.id)}', '${escapeHtml(s.name || '')}')">🗑️</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function openSupplierModal() {
  document.getElementById('modalTitle').textContent = 'Add Supplier';
  document.getElementById('editSupplierId').value = '';
  document.getElementById('supplierForm').reset();
  clearAllFieldErrors(document.getElementById('supplierForm'));
  hideSupplierFormMsg();
  document.getElementById('supplierModal').classList.remove('hidden');
  document.getElementById('supplierName').focus();
}

function openEditModal(supplierId) {
  const supplier = allSuppliers.find(s => s.id === supplierId);
  if (!supplier) return;

  document.getElementById('modalTitle').textContent = 'Edit Supplier';
  document.getElementById('editSupplierId').value = supplier.id;
  document.getElementById('supplierName').value = supplier.name || '';
  document.getElementById('contactPerson').value = supplier.contactPerson || '';
  document.getElementById('supplierPhone').value = supplier.phone || '';
  document.getElementById('supplierEmail').value = supplier.email || '';
  document.getElementById('supplierAddress').value = supplier.address || '';
  document.getElementById('supplierNotes').value = supplier.notes || '';

  clearAllFieldErrors(document.getElementById('supplierForm'));
  hideSupplierFormMsg();
  document.getElementById('supplierModal').classList.remove('hidden');
  document.getElementById('supplierName').focus();
}

function closeSupplierModal() {
  document.getElementById('supplierModal').classList.add('hidden');
}

// ─── Save (create / update) ───────────────────────────────────────────────────

async function handleSupplierSave(e) {
  e.preventDefault();
  clearAllFieldErrors(document.getElementById('supplierForm'));
  hideSupplierFormMsg();

  const supplierId = document.getElementById('editSupplierId').value;
  const name = sanitizeText(document.getElementById('supplierName').value);
  const contactPerson = sanitizeText(document.getElementById('contactPerson').value);
  const phone = sanitizeText(document.getElementById('supplierPhone').value);
  const email = sanitizeText(document.getElementById('supplierEmail').value);
  const address = sanitizeText(document.getElementById('supplierAddress').value);
  const notes = sanitizeText(document.getElementById('supplierNotes').value);

  // ── Validate ──────────────────────────────────────────────────────────────
  let hasErrors = false;

  const nameResult = validateSupplierName(name);
  if (!nameResult.valid) {
    showFieldError('supplierName', nameResult.error);
    hasErrors = true;
  }

  if (phone) {
    const phoneResult = validatePhone(phone);
    if (!phoneResult.valid) {
      showFieldError('supplierPhone', phoneResult.error);
      hasErrors = true;
    }
  }

  if (email) {
    const emailResult = validateEmail(email);
    if (!emailResult.valid) {
      showFieldError('supplierEmail', emailResult.error);
      hasErrors = true;
    }
  }

  if (hasErrors) return;

  const btn = document.getElementById('saveSupplierBtn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    const data = {
      name,
      contactPerson: contactPerson || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      notes: notes || null,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedBy: user.uid
    };

    if (supplierId) {
      // Update existing
      await db.collection('suppliers').doc(supplierId).update(data);
      showSupplierFormMsg('Supplier updated successfully.', 'success');
    } else {
      // Create new
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      data.createdBy = user.uid;
      await db.collection('suppliers').add(data);
      showSupplierFormMsg('Supplier added successfully.', 'success');
    }

    if (typeof showInAppNotification === 'function') {
      showInAppNotification(`Supplier "${name}" saved.`, 'success', 3000);
    }

    setTimeout(closeSupplierModal, 800);

  } catch (err) {
    console.error('Error saving supplier:', err);
    showSupplierFormMsg(`Error: ${err.message || 'Failed to save supplier.'}`, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save Supplier';
  }
}

function showSupplierFormMsg(msg, type) {
  const el = document.getElementById('supplierFormMsg');
  if (!el) return;
  el.textContent = msg;
  el.style.background = type === 'success' ? '#d1fae5' : '#fee2e2';
  el.style.color = type === 'success' ? '#065f46' : '#991b1b';
  el.style.border = type === 'success' ? '1px solid #a7f3d0' : '1px solid #fecaca';
  el.classList.remove('hidden');
}

function hideSupplierFormMsg() {
  const el = document.getElementById('supplierFormMsg');
  if (el) el.classList.add('hidden');
}

// ─── Delete ───────────────────────────────────────────────────────────────────

function openDeleteModal(supplierId, supplierName) {
  supplierToDelete = supplierId;
  document.getElementById('deleteSupplierName').textContent = supplierName;
  document.getElementById('deleteModal').classList.remove('hidden');
}

function closeDeleteModal() {
  supplierToDelete = null;
  document.getElementById('deleteModal').classList.add('hidden');
}

async function confirmDeleteSupplier() {
  if (!supplierToDelete) return;

  const btn = document.getElementById('confirmDeleteBtn');
  btn.disabled = true;
  btn.textContent = 'Deleting…';

  try {
    await db.collection('suppliers').doc(supplierToDelete).delete();
    if (typeof showInAppNotification === 'function') {
      showInAppNotification('Supplier deleted.', 'success', 3000);
    }
    closeDeleteModal();
  } catch (err) {
    console.error('Error deleting supplier:', err);
    alert(`Error deleting supplier: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Delete';
  }
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
