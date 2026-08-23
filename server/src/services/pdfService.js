const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const invoicesDir = path.join(__dirname, '../../public/invoices');
if (!fs.existsSync(invoicesDir)) {
  fs.mkdirSync(invoicesDir, { recursive: true });
}

/**
 * Generate official PDF invoice for a Job Card / Invoice (Indian Rupee ₹)
 */
const generateInvoicePDF = (jobCard, invoice) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const fileName = `INV-${jobCard.cardNumber || 'JOB'}-${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);
      const writeStream = fs.createWriteStream(filePath);

      doc.pipe(writeStream);

      // Header Banner
      doc.fillColor('#1e3a8a')
         .fontSize(22)
         .text('AUTO-SERV WORKSHOP', 40, 40, { weight: 'bold' });

      doc.fillColor('#64748b')
         .fontSize(10)
         .text('Production Automobile Service & Maintenance Center', 40, 68);

      doc.strokeColor('#e2e8f0')
         .lineWidth(1)
         .moveTo(40, 85)
         .lineTo(550, 85)
         .stroke();

      // Invoice Details Block
      doc.fillColor('#0f172a').fontSize(14).text('OFFICIAL TAX INVOICE', 40, 100, { underline: true });

      doc.fontSize(10).fillColor('#334155');
      doc.text(`Invoice Number: ${invoice?.invoiceNumber || 'INV-DRAFT'}`, 40, 122);
      doc.text(`Job Card Number: ${jobCard.cardNumber}`, 40, 136);
      doc.text(`Date Issued: ${new Date().toLocaleDateString()}`, 40, 150);
      doc.text(`Payment Status: ${invoice?.status || 'PAID'}`, 350, 122, { align: 'right' });
      doc.text(`Payment Method: ${invoice?.paymentMethod || 'UPI / Online App'}`, 350, 136, { align: 'right' });

      // Customer & Vehicle Block
      doc.fillColor('#1e293b').fontSize(11).text('CLIENT & VEHICLE DETAILS', 40, 175);
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, 190).lineTo(550, 190).stroke();

      doc.fontSize(10).fillColor('#475569');
      doc.text(`Customer Name: ${jobCard.customer?.name || 'Valued Customer'}`, 40, 198);
      doc.text(`Contact Phone: ${jobCard.customer?.phone || jobCard.customer?.email || 'N/A'}`, 40, 212);
      doc.text(`Vehicle: ${jobCard.vehicle?.make} ${jobCard.vehicle?.model}`, 350, 198, { align: 'right' });
      doc.text(`License Plate: ${jobCard.vehicle?.licensePlate}`, 350, 212, { align: 'right' });

      // Itemized Services & Parts Table
      doc.fillColor('#1e293b').fontSize(11).text('ITEMIZED WORKSHOP BREAKDOWN', 40, 240);
      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, 255).lineTo(550, 255).stroke();

      let y = 265;
      doc.fontSize(9).fillColor('#0f172a');
      doc.text('Item Description', 40, y, { bold: true });
      doc.text('Qty', 320, y, { bold: true });
      doc.text('Unit Price', 380, y, { bold: true });
      doc.text('Total (INR ₹)', 480, y, { align: 'right', bold: true });

      y += 15;
      doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, y).lineTo(550, y).stroke();
      y += 8;

      // Diagnostic Tasks & Labor
      const rawTasks = jobCard.tasks || [];
      const taskMap = new Map();

      for (const t of rawTasks) {
        const desc = (t.description || 'Repair Task').trim();
        const cost = parseFloat(t.estimatedLaborCost || 0);
        if (taskMap.has(desc)) {
          taskMap.set(desc, taskMap.get(desc) + cost);
        } else {
          taskMap.set(desc, cost);
        }
      }

      const activeTasks = Array.from(taskMap.entries()).filter(([_, cost]) => cost > 0);

      if (activeTasks.length > 0) {
        for (const [description, cost] of activeTasks) {
          doc.fontSize(9).fillColor('#334155');
          doc.text(`Labor Task: ${description}`, 40, y);
          doc.text('1', 320, y);
          doc.text(`Rs. ${cost.toFixed(2)}`, 380, y);
          doc.text(`Rs. ${cost.toFixed(2)}`, 480, y, { align: 'right' });
          y += 18;
        }
      } else {
        doc.fontSize(9).fillColor('#334155');
        doc.text('Standard Diagnostic Service Labor', 40, y);
        doc.text('1', 320, y);
        doc.text(`Rs. ${(jobCard.laborCost || 0).toFixed(2)}`, 380, y);
        doc.text(`Rs. ${(jobCard.laborCost || 0).toFixed(2)}`, 480, y, { align: 'right' });
        y += 18;
      }

      // Inventory Parts
      if (jobCard.parts && jobCard.parts.length > 0) {
        for (const part of jobCard.parts) {
          doc.fontSize(9).fillColor('#334155');
          doc.text(`Part: ${part.inventoryItem?.name || 'Spare Part'} (${part.inventoryItem?.sku || 'SKU'})`, 40, y);
          doc.text(`${part.quantity}`, 320, y);
          doc.text(`Rs. ${part.unitPrice?.toFixed(2)}`, 380, y);
          doc.text(`Rs. ${part.totalPrice?.toFixed(2)}`, 480, y, { align: 'right' });
          y += 18;
        }
      }

      doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(40, y).lineTo(550, y).stroke();
      y += 12;

      // Financial Totals
      const laborCost = jobCard.laborCost || 0;
      const partsCost = jobCard.partsCost || 0;
      const totalCost = jobCard.totalCost || (laborCost + partsCost);
      const tax = totalCost * 0.10;
      const grandTotal = invoice?.totalAmount || (totalCost + tax);

      doc.fontSize(9).fillColor('#475569');
      doc.text('Labor Subtotal:', 350, y);
      doc.text(`Rs. ${laborCost.toFixed(2)}`, 480, y, { align: 'right' });
      y += 14;

      doc.text('Parts Subtotal:', 350, y);
      doc.text(`Rs. ${partsCost.toFixed(2)}`, 480, y, { align: 'right' });
      y += 14;

      doc.text('GST / Tax (10%):', 350, y);
      doc.text(`Rs. ${tax.toFixed(2)}`, 480, y, { align: 'right' });
      y += 16;

      doc.fillColor('#0f172a').fontSize(12).text('Grand Total:', 350, y, { bold: true });
      doc.fillColor('#10b981').fontSize(14).text(`Rs. ${grandTotal.toFixed(2)}`, 480, y, { align: 'right', bold: true });

      // Footer Notes
      doc.fontSize(8).fillColor('#94a3b8').text('This is a computer-generated tax invoice issued by Auto-Serv Workshop.', 40, 720, { align: 'center' });

      doc.end();

      writeStream.on('finish', () => {
        resolve({ fileName, filePath, relativeUrl: `/invoices/${fileName}` });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateInvoicePDF
};
