/**
 * analytics.js — Analytics & Reporting page logic
 *
 * Loads inventory data and dispense records to generate:
 *  - KPI summary cards
 *  - Expiring-soon report
 *  - Low-stock / out-of-stock report
 *  - 30-day consumption report (from transactions)
 *  - Dispense log summary
 */

// ─── Data cache ───────────────────────────────────────────────────────────────

let medicinesData = [];
let transactionsData = [];
let dispenseData = [];
let activeSection = 'expiring';

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  auth.onAuthStateChanged(async (user) => {
    if (!user) return;
    const emailEl = document.getElementById('userEmail');
    if (emailEl) emailEl.textContent = user.email;

    // Set default date range for consumption: last 30 days
    const today = new Date();
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    const toInput = document.getElementById('consumeTo');
    const fromInput = document.getElementById('consumeFrom');
    if (toInput) toInput.value = formatDate(today);
    if (fromInput) fromInput.value = formatDate(from);

    await Promise.all([loadMedicines(), loadTransactions(), loadDispenseRecords()]);
    renderKPIs();
    renderExpiringSoon();
  });
});

// ─── Data loading ─────────────────────────────────────────────────────────────

async function loadMedicines() {
  try {
    const snap = await db.collection('medicines').get();
    medicinesData = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      expiryDate: doc.data().expiryDate?.toDate() || null
    }));
  } catch (err) {
    console.error('Analytics: load medicines error', err);
  }
}

async function loadTransactions() {
  try {
    // Last 90 days is sufficient for all consumption reports
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const snap = await db.collection('transactions')
      .where('timestamp', '>=', firebase.firestore.Timestamp.fromDate(cutoff))
      .orderBy('timestamp', 'desc')
      .get();

    transactionsData = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null
    }));
  } catch (err) {
    console.error('Analytics: load transactions error', err);
    transactionsData = [];
  }
}

async function loadDispenseRecords() {
  try {
    const snap = await db.collection('dispenseRecords')
      .orderBy('timestamp', 'desc')
      .limit(500)
      .get();

    dispenseData = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() || null
    }));
  } catch (err) {
    console.error('Analytics: load dispense records error', err);
    dispenseData = [];
  }
}

// ─── KPI rendering ────────────────────────────────────────────────────────────

function renderKPIs() {
  const now = new Date();
  const warningMs = 90 * 24 * 60 * 60 * 1000;

  const total = medicinesData.length;
  const expiredCount = medicinesData.filter(m => m.expiryDate && m.expiryDate < now).length;
  const expiringSoonCount = medicinesData.filter(m =>
    m.expiryDate && m.expiryDate >= now && (m.expiryDate - now) < warningMs
  ).length;
  const lowStockCount = medicinesData.filter(m =>
    m.quantity !== undefined && m.quantity <= (m.minThreshold || 0) && m.quantity > 0
  ).length;
  const outOfStockCount = medicinesData.filter(m => (m.quantity || 0) === 0).length;
  const totalUnits = medicinesData.reduce((sum, m) => sum + (m.quantity || 0), 0);

  // Dispense counts (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentDispenses = dispenseData.filter(d => d.timestamp && d.timestamp >= thirtyDaysAgo);
  const totalDispensed = recentDispenses.reduce((sum, d) => sum + (d.quantityDispensed || 0), 0);

  const kpiGrid = document.getElementById('kpiGrid');
  if (!kpiGrid) return;

  kpiGrid.innerHTML = `
    <div class="kpi-card">
      <div class="kpi-label">Total Medicines</div>
      <div class="kpi-value" style="color:var(--primary-color);">${total}</div>
      <div class="kpi-sub">${totalUnits.toLocaleString()} total units in stock</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Expiring Soon (≤90d)</div>
      <div class="kpi-value" style="color:${expiringSoonCount > 0 ? 'var(--warning-color)' : 'var(--success-color)'};">${expiringSoonCount}</div>
      <div class="kpi-sub">${expiredCount} already expired</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Low / Out of Stock</div>
      <div class="kpi-value" style="color:${(lowStockCount + outOfStockCount) > 0 ? 'var(--danger-color)' : 'var(--success-color)'};">${lowStockCount + outOfStockCount}</div>
      <div class="kpi-sub">${outOfStockCount} out of stock, ${lowStockCount} low stock</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Dispensed (30 days)</div>
      <div class="kpi-value" style="color:var(--secondary-color);">${totalDispensed.toLocaleString()}</div>
      <div class="kpi-sub">${recentDispenses.length} dispense events</div>
    </div>
  `;
}

// ─── Section switching ────────────────────────────────────────────────────────

function showSection(name) {
  const sections = ['expiring', 'lowstock', 'consumption', 'dispense'];
  sections.forEach(s => {
    const el = document.getElementById(`section-${s}`);
    const tab = document.getElementById(`tab-${s}`);
    if (el) el.classList.toggle('hidden', s !== name);
    if (tab) {
      tab.classList.toggle('btn-primary', s === name);
      tab.classList.toggle('btn-secondary', s !== name);
    }
  });
  activeSection = name;

  // Lazy-render on first view
  if (name === 'lowstock') renderLowStock();
  if (name === 'consumption') loadConsumption();
  if (name === 'dispense') renderDispenseLog();
}

// ─── Expiring soon ────────────────────────────────────────────────────────────

function renderExpiringSoon() {
  const now = new Date();
  const warningMs = 90 * 24 * 60 * 60 * 1000;

  const items = medicinesData
    .filter(m => m.expiryDate && (m.expiryDate - now) < warningMs)
    .sort((a, b) => a.expiryDate - b.expiryDate);

  const container = document.getElementById('expiringContent');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<p style="color:var(--text-secondary);padding:1rem 0;">✅ No medicines expiring within 90 days.</p>';
    return;
  }

  container.innerHTML = `
    <div class="report-table-wrapper">
      <table class="report-table" aria-label="Expiring medicines">
        <thead>
          <tr>
            <th>Medicine</th><th>Batch</th><th>Expiry Date</th>
            <th>Days Left</th><th>Qty</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(m => {
            const daysLeft = Math.ceil((m.expiryDate - now) / (24 * 60 * 60 * 1000));
            const chipClass = daysLeft < 0 ? 'chip-red' : daysLeft <= 30 ? 'chip-red' : 'chip-yellow';
            const label = daysLeft < 0 ? 'Expired' : `${daysLeft}d`;
            return `<tr>
              <td><strong>${escapeHtml(m.name || '—')}</strong></td>
              <td>${escapeHtml(m.batch || '—')}</td>
              <td>${m.expiryDate ? m.expiryDate.toLocaleDateString() : '—'}</td>
              <td><span class="chip ${chipClass}">${label}</span></td>
              <td>${m.quantity || 0}</td>
              <td>${statusChip(m.status)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── Low stock ────────────────────────────────────────────────────────────────

function renderLowStock() {
  const items = medicinesData
    .filter(m => (m.quantity || 0) <= (m.minThreshold || 0))
    .sort((a, b) => (a.quantity || 0) - (b.quantity || 0));

  const container = document.getElementById('lowstockContent');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<p style="color:var(--text-secondary);padding:1rem 0;">✅ All medicines are adequately stocked.</p>';
    return;
  }

  container.innerHTML = `
    <div class="report-table-wrapper">
      <table class="report-table" aria-label="Low stock medicines">
        <thead>
          <tr>
            <th>Medicine</th><th>Batch</th><th>Current Qty</th>
            <th>Min Threshold</th><th>Deficit</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(m => {
            const deficit = (m.minThreshold || 0) - (m.quantity || 0);
            return `<tr>
              <td><strong>${escapeHtml(m.name || '—')}</strong></td>
              <td>${escapeHtml(m.batch || '—')}</td>
              <td style="color:var(--danger-color);font-weight:700;">${m.quantity || 0}</td>
              <td>${m.minThreshold || 0}</td>
              <td>${deficit > 0 ? `<span class="chip chip-red">-${deficit}</span>` : '—'}</td>
              <td>${statusChip(m.status)}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ─── Consumption (transactions) ───────────────────────────────────────────────

async function loadConsumption() {
  const fromVal = document.getElementById('consumeFrom')?.value;
  const toVal = document.getElementById('consumeTo')?.value;

  if (!fromVal || !toVal) return;

  const from = new Date(fromVal);
  from.setHours(0, 0, 0, 0);
  const to = new Date(toVal);
  to.setHours(23, 59, 59, 999);

  const container = document.getElementById('consumptionContent');
  if (!container) return;
  container.innerHTML = '<div style="padding:1rem;color:var(--text-secondary);">Loading…</div>';

  try {
    // Filter from pre-loaded transactions
    const relevant = transactionsData.filter(t =>
      t.timestamp && t.timestamp >= from && t.timestamp <= to &&
      (t.type === 'remove' || t.type === 'dispense' || t.type === 'adjust')
    );

    // Aggregate by medicineId
    const map = {};
    relevant.forEach(t => {
      const qty = Math.abs(t.quantity || 0);
      if (!t.medicineId) return;
      if (!map[t.medicineId]) {
        map[t.medicineId] = {
          medicineId: t.medicineId,
          name: t.medicineName || '(unknown)',
          batch: t.medicineBatch || '—',
          totalConsumed: 0,
          events: 0
        };
      }
      map[t.medicineId].totalConsumed += qty;
      map[t.medicineId].events++;
    });

    const rows = Object.values(map).sort((a, b) => b.totalConsumed - a.totalConsumed);

    if (!rows.length) {
      container.innerHTML = '<p style="color:var(--text-secondary);padding:1rem 0;">No consumption data in the selected date range.</p>';
      return;
    }

    container.innerHTML = `
      <div class="report-table-wrapper">
        <table class="report-table" aria-label="Consumption report">
          <thead>
            <tr>
              <th>#</th><th>Medicine</th><th>Batch</th>
              <th>Units Consumed</th><th>Transactions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `<tr>
              <td style="color:var(--text-secondary);">${i + 1}</td>
              <td><strong>${escapeHtml(r.name)}</strong></td>
              <td>${escapeHtml(r.batch)}</td>
              <td><strong style="color:var(--primary-color);">${r.totalConsumed.toLocaleString()}</strong></td>
              <td>${r.events}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error('Consumption load error:', err);
    container.innerHTML = '<p style="color:var(--danger-color);">Error loading consumption data.</p>';
  }
}

// ─── Dispense log ──────────────────────────────────────────────────────────────

function renderDispenseLog() {
  const container = document.getElementById('dispenseContent');
  if (!container) return;

  if (!dispenseData.length) {
    container.innerHTML = '<p style="color:var(--text-secondary);padding:1rem 0;">No dispense records yet.</p>';
    return;
  }

  container.innerHTML = `
    <div class="report-table-wrapper">
      <table class="report-table" aria-label="Dispense records">
        <thead>
          <tr>
            <th>Date/Time</th><th>Medicine</th><th>Qty</th>
            <th>Patient ID</th><th>Prescribed By</th><th>Dispensed By</th>
          </tr>
        </thead>
        <tbody>
          ${dispenseData.slice(0, 100).map(r => `<tr>
            <td style="font-size:0.8rem;white-space:nowrap;">${r.timestamp ? r.timestamp.toLocaleString() : '—'}</td>
            <td><strong>${escapeHtml(r.medicineName || '—')}</strong></td>
            <td><span class="chip chip-red">-${r.quantityDispensed || 0}</span></td>
            <td>${escapeHtml(r.patientId || '—')}</td>
            <td>${escapeHtml(r.prescribedBy || '—')}</td>
            <td style="font-size:0.8rem;">${escapeHtml(r.dispensedByEmail || r.dispensedBy || '—')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
    ${dispenseData.length > 100 ? `<p style="color:var(--text-secondary);font-size:0.8rem;padding:0.5rem 0;">Showing 100 of ${dispenseData.length} records.</p>` : ''}
  `;
}

// ─── Export ───────────────────────────────────────────────────────────────────

function exportSection(section) {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  let csv = '';

  if (section === 'expiring') {
    const warningMs = 90 * 24 * 60 * 60 * 1000;
    const items = medicinesData
      .filter(m => m.expiryDate && (m.expiryDate - now) < warningMs)
      .sort((a, b) => a.expiryDate - b.expiryDate);
    csv = 'Medicine,Batch,Expiry Date,Days Left,Quantity,Status\n';
    items.forEach(m => {
      const daysLeft = Math.ceil((m.expiryDate - now) / (24 * 60 * 60 * 1000));
      csv += `"${(m.name||'').replace(/"/g,'""')}","${(m.batch||'').replace(/"/g,'""')}",` +
             `${m.expiryDate ? m.expiryDate.toLocaleDateString() : ''},${daysLeft},${m.quantity||0},${m.status||''}\n`;
    });
    downloadCSV(csv, `expiring-soon-${dateStr}.csv`);

  } else if (section === 'lowstock') {
    const items = medicinesData.filter(m => (m.quantity || 0) <= (m.minThreshold || 0));
    csv = 'Medicine,Batch,Current Qty,Min Threshold,Deficit,Status\n';
    items.forEach(m => {
      const deficit = (m.minThreshold || 0) - (m.quantity || 0);
      csv += `"${(m.name||'').replace(/"/g,'""')}","${(m.batch||'').replace(/"/g,'""')}",` +
             `${m.quantity||0},${m.minThreshold||0},${deficit},${m.status||''}\n`;
    });
    downloadCSV(csv, `low-stock-${dateStr}.csv`);

  } else if (section === 'dispense') {
    csv = 'Date/Time,Medicine,Batch,Qty Dispensed,Patient ID,Prescribed By,Dispensed By\n';
    dispenseData.forEach(r => {
      csv += `"${r.timestamp ? r.timestamp.toLocaleString() : ''}",` +
             `"${(r.medicineName||'').replace(/"/g,'""')}","${(r.medicineBatch||'').replace(/"/g,'""')}",` +
             `${r.quantityDispensed||0},"${(r.patientId||'').replace(/"/g,'""')}",` +
             `"${(r.prescribedBy||'').replace(/"/g,'""')}","${(r.dispensedByEmail||'').replace(/"/g,'""')}"\n`;
    });
    downloadCSV(csv, `dispense-log-${dateStr}.csv`);
  }
}

function downloadCSV(content, filename) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusChip(status) {
  const map = {
    'expired':      ['chip-red', 'Expired'],
    'expiring_soon':['chip-yellow', 'Expiring Soon'],
    'low_stock':    ['chip-yellow', 'Low Stock'],
    'out_of_stock': ['chip-red', 'Out of Stock'],
    'in_stock':     ['chip-green', 'In Stock']
  };
  const [cls, label] = map[status] || ['chip-blue', status || 'Unknown'];
  return `<span class="chip ${cls}">${label}</span>`;
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function escapeHtml(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
