import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// Arabic font support for PDF
const addArabicFont = (doc) => {
  // Note: You would need to add actual Arabic font file
  // For now, we'll use default with RTL support
  doc.setLanguage('ar');
  doc.setR2L(true);
};

// ============ PDF Export Functions ============
export const exportToPDF = (data, filename, title) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  addArabicFont(doc);

  // Add title
  doc.setFontSize(18);
  doc.text(title, doc.internal.pageSize.width / 2, 20, { align: 'center' });

  // Add date
  doc.setFontSize(10);
  doc.text(`التاريخ: ${new Date().toLocaleDateString('ar-SA')}`, 15, 30);

  // Add data based on type
  if (Array.isArray(data)) {
    autoTable(doc, {
      startY: 40,
      head: [Object.keys(data[0] || {})],
      body: data.map(row => Object.values(row)),
      styles: { font: 'helvetica', halign: 'right' },
      headStyles: { fillColor: [59, 130, 246] }
    });
  }

  doc.save(`${filename}.pdf`);
};

export const exportInvoiceToPDF = (invoice, workshop) => {
  const doc = new jsPDF();
  addArabicFont(doc);

  const pageWidth = doc.internal.pageSize.width;
  
  // Header - Workshop Info
  doc.setFontSize(20);
  doc.text(workshop.name || 'ورشتي', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.text(workshop.phone || '', pageWidth / 2, 28, { align: 'center' });
  doc.text(workshop.address || '', pageWidth / 2, 34, { align: 'center' });
  
  if (workshop.taxNumber) {
    doc.text(`الرقم الضريبي: ${workshop.taxNumber}`, pageWidth / 2, 40, { align: 'center' });
  }

  // Invoice Title
  doc.setFontSize(16);
  doc.text('فاتورة', pageWidth / 2, 50, { align: 'center' });

  // Invoice Details
  doc.setFontSize(10);
  doc.text(`رقم الفاتورة: ${invoice.invoiceNumber}`, 15, 60);
  doc.text(`التاريخ: ${new Date(invoice.createdAt).toLocaleDateString('ar-SA')}`, 15, 66);
  doc.text(`العميل: ${invoice.customerName || ''}`, 15, 72);

  // Items Table
  const tableData = invoice.items.map(item => [
    item.name,
    item.quantity.toString(),
    item.price.toFixed(2),
    item.total.toFixed(2)
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['الصنف', 'الكمية', 'السعر', 'الإجمالي']],
    body: tableData,
    foot: [
      ['', '', 'المجموع الفرعي:', invoice.subtotal.toFixed(2)],
      ['', '', `الضريبة (${(invoice.tax * 100).toFixed(0)}%):`, (invoice.subtotal * invoice.tax).toFixed(2)],
      ['', '', 'الإجمالي الكلي:', invoice.total.toFixed(2)]
    ],
    styles: { halign: 'right', font: 'helvetica' },
    headStyles: { fillColor: [59, 130, 246] },
    footStyles: { fillColor: [243, 244, 246], textColor: [0, 0, 0], fontStyle: 'bold' }
  });

  // Footer
  const finalY = doc.lastAutoTable.finalY || 150;
  doc.setFontSize(9);
  doc.text('شكراً لتعاملكم معنا', pageWidth / 2, finalY + 15, { align: 'center' });
  
  if (workshop.invoiceFooter) {
    doc.text(workshop.invoiceFooter, pageWidth / 2, finalY + 20, { align: 'center' });
  }

  return doc;
};

// ============ Excel Export Functions ============
export const exportToExcel = (data, filename, sheetName = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportMultipleSheetsToExcel = (sheets, filename) => {
  const workbook = XLSX.utils.book_new();
  
  sheets.forEach(({ data, name }) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, name);
  });
  
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

// ============ Image Export Functions ============
export const exportToImage = async (elementId, filename, format = 'png') => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found');
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const image = canvas.toDataURL(`image/${format}`);
    const link = document.createElement('a');
    link.href = image;
    link.download = `${filename}.${format}`;
    link.click();
  } catch (error) {
    console.error('Error exporting image:', error);
  }
};

// ============ Print Functions ============
export const printElement = (elementId) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error('Element not found');
    return;
  }

  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write('<html><head><title>Print</title>');
  printWindow.document.write('<style>');
  printWindow.document.write(`
    body { font-family: Arial, sans-serif; direction: rtl; }
    @media print {
      body { margin: 0; padding: 20px; }
    }
  `);
  printWindow.document.write('</style></head><body>');
  printWindow.document.write(element.innerHTML);
  printWindow.document.write('</body></html>');
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

// ============ CSV Export Functions ============
export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
};

// ============ Batch Export Functions ============
export const exportBatchReports = async (vehicles, invoices, transactions, workshop) => {
  // Create a comprehensive Excel report with multiple sheets
  const sheets = [
    {
      name: 'المركبات',
      data: vehicles.map(v => ({
        'رقم اللوحة': v.plateNumber,
        'العميل': v.customerName,
        'الحالة': v.status,
        'تاريخ الدخول': new Date(v.entryDate).toLocaleDateString('ar-SA'),
        'الفني': v.technicianName
      }))
    },
    {
      name: 'الفواتير',
      data: invoices.map(i => ({
        'رقم الفاتورة': i.invoiceNumber,
        'التاريخ': new Date(i.createdAt).toLocaleDateString('ar-SA'),
        'العميل': i.customerName,
        'المبلغ': i.total,
        'الحالة': i.status
      }))
    },
    {
      name: 'المعاملات المالية',
      data: transactions.map(t => ({
        'النوع': t.type === 'income' ? 'دخل' : 'مصروف',
        'المبلغ': t.amount,
        'الوصف': t.description,
        'التاريخ': new Date(t.date).toLocaleDateString('ar-SA')
      }))
    }
  ];

  exportMultipleSheetsToExcel(
    sheets,
    `تقرير_شامل_${new Date().toLocaleDateString('ar-SA').replace(/\//g, '-')}`
  );
};

export default {
  exportToPDF,
  exportInvoiceToPDF,
  exportToExcel,
  exportMultipleSheetsToExcel,
  exportToImage,
  exportToCSV,
  printElement,
  exportBatchReports
};