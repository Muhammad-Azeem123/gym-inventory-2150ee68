import jsPDF from 'jspdf';

interface InvoiceItem {
  product_name: string;
  category?: string;
  quantity: number;
  price_per_unit: number;
  total_amount: number;
}

interface InvoiceData {
  invoiceNumber: string;
  date: string;
  customerName?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  totalAmount: number;
}

export const generateInvoicePDF = (invoiceData: InvoiceData) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('FITSTOCK MANAGER', 20, 30);
  doc.setFontSize(16);
  doc.text('INVOICE', 20, 45);
  
  // Invoice details
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 20, 65);
  doc.text(`Date: ${invoiceData.date}`, 20, 75);
  
  if (invoiceData.customerName) {
    doc.text(`Customer: ${invoiceData.customerName}`, 20, 85);
  }
  if (invoiceData.customerPhone) {
    doc.text(`Phone: ${invoiceData.customerPhone}`, 20, 95);
  }
  
  // Items header
  const itemsStartY = invoiceData.customerName || invoiceData.customerPhone ? 115 : 95;
  doc.setFont(undefined, 'bold');
  doc.text('ITEMS:', 20, itemsStartY);
  
  // Items details
  let yPosition = itemsStartY + 10;
  doc.setFont(undefined, 'normal');
  
  invoiceData.items.forEach((item, index) => {
    doc.text(`${index + 1}. ${item.product_name}`, 20, yPosition);
    if (item.category) {
      doc.text(`   Category: ${item.category}`, 20, yPosition + 8);
      yPosition += 8;
    }
    doc.text(`   Quantity: ${item.quantity} x Rs. ${item.price_per_unit.toFixed(2)}`, 20, yPosition + 8);
    doc.text(`   Subtotal: Rs. ${item.total_amount.toFixed(2)}`, 20, yPosition + 16);
    yPosition += 24;
  });
  
  // Total
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.text(`TOTAL AMOUNT: Rs. ${invoiceData.totalAmount.toFixed(2)}`, 20, yPosition + 20);
  
  // Footer
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.text('Thank you for choosing FitStock Manager!', 20, yPosition + 50);
  
  // Save the PDF
  doc.save(`invoice-${invoiceData.invoiceNumber}.pdf`);
};
