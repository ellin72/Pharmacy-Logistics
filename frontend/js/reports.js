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
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title} - Ehafo Clinic</title>
      <style>
        @media print {
          @page { 
            margin: 2cm 1cm 3cm 1cm;
          }
          body { 
            font-family: Arial, sans-serif;
            position: relative;
          }
        }
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          position: relative;
        }
        
        h1 { 
          color: #2563eb;
          margin-top: 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          margin-bottom: 60px;
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
        /* Print Header - EHAFO CLINIC */
        .print-header {
          text-align: center;
          font-size: 32px;
          font-weight: bold;
          color: #2563eb;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 3px solid #2563eb;
          letter-spacing: 4px;
        }
        
        /* Print Stamp Footer - Ministry Stamp in Rectangle */
        .print-stamp-footer {
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          text-align: center;
          font-size: 10px;
          color: #9333ea; /* Purple text */
          line-height: 1.6;
          width: 80%;
          max-width: 500px;
          border: 2px solid #9333ea; /* Purple border */
          padding: 15px;
          background: transparent; /* Transparent background */
          box-shadow: none; /* Remove shadow */
        }
        
        .print-stamp-footer .ministry-name {
          font-weight: bold;
          font-size: 11px;
          margin-bottom: 5px;
          color: #9333ea; /* Purple text */
        }
        
        .print-stamp-footer .stamp-date {
          font-weight: bold;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #9333ea; /* Purple border */
          color: #9333ea; /* Purple text */
        }
        
        /* Ensure all text in stamp footer is purple */
        .print-stamp-footer > div {
          color: #9333ea !important;
        }
      </style>
    </head>
    <body>
      <div class="print-header">EHAFO CLINIC</div>
      <div class="header">
        <h1>${title}</h1>
        <p class="date">Generated: ${new Date().toLocaleString()}</p>
      </div>
      ${content}
      <div class="print-stamp-footer">
        <div class="ministry-name">Ministry of Health and Social Services</div>
        <div>P O Box 547, Windhoek</div>
        <div>Oshana Region, Oshakati District</div>
        <div style="font-weight: bold; margin-top: 5px;">Ehafo Clinic</div>
        <div class="stamp-date">${currentDate}</div>
      </div>
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

