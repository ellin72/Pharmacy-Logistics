// Reporting and export functions

// Export inventory to CSV
function exportInventoryToCSV(medicines, filename = 'inventory') {
  const headers = ['Name', 'Batch Number', 'Quantity', 'Min Threshold', 'Expiry Date', 'Status', 'Notes'];
  let csv = headers.join(',') + '\n';
  
  medicines.forEach(med => {
    const row = [
      `"${med.name || ''}"`,
      `"${med.batch || ''}"`,
      med.quantity || 0,
      med.minThreshold || 0,
      med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A',
      med.status || '',
      `"${(med.notes || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\n';
  });
  
  downloadCSV(csv, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
}

// Export transactions to CSV
function exportTransactionsToCSV(transactions, medicinesMap = {}, filename = 'transactions') {
  const headers = ['Date', 'Time', 'Medicine', 'Batch', 'Type', 'Quantity', 'Previous Qty', 'New Qty', 'Reason', 'User'];
  let csv = headers.join(',') + '\n';
  
  transactions.forEach(t => {
    const medicine = medicinesMap[t.medicineId] || {};
    const date = t.timestamp ? new Date(t.timestamp) : new Date();
    
    const row = [
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      `"${medicine.name || 'Unknown'}"`,
      `"${medicine.batch || 'N/A'}"`,
      t.type || '',
      t.quantity || 0,
      t.previousQuantity || 0,
      t.newQuantity || 0,
      `"${(t.reason || '').replace(/"/g, '""')}"`,
      t.userId || 'Unknown'
    ];
    csv += row.join(',') + '\n';
  });
  
  downloadCSV(csv, `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
}

// Download CSV file
function downloadCSV(csvContent, filename) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate PDF report (simple HTML-to-PDF)
function generatePDFReport(title, content, filename = 'report') {
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @media print {
          @page { margin: 1cm; }
          body { font-family: Arial, sans-serif; }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
        }
        h1 { color: #2563eb; }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        .header {
          margin-bottom: 20px;
        }
        .date {
          color: #6b7280;
          font-size: 0.875rem;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${title}</h1>
        <p class="date">Generated: ${new Date().toLocaleString()}</p>
      </div>
      ${content}
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

// Generate inventory PDF
function generateInventoryPDF(medicines) {
  const tableRows = medicines.map(med => `
    <tr>
      <td>${escapeHtml(med.name || '')}</td>
      <td>${escapeHtml(med.batch || '')}</td>
      <td>${med.quantity || 0}</td>
      <td>${med.minThreshold || 0}</td>
      <td>${med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : 'N/A'}</td>
      <td>${med.status || ''}</td>
    </tr>
  `).join('');
  
  const content = `
    <table>
      <thead>
        <tr>
          <th>Medicine Name</th>
          <th>Batch Number</th>
          <th>Quantity</th>
          <th>Min Threshold</th>
          <th>Expiry Date</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows}
      </tbody>
    </table>
    <p style="margin-top: 20px; color: #6b7280;">
      Total Medicines: ${medicines.length}
    </p>
  `;
  
  generatePDFReport('Inventory Report', content, 'inventory-report');
}

// Helper function to escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

