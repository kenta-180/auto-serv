const invoiceRepository = require('../repositories/invoiceRepository');
const jobCardRepository = require('../repositories/jobCardRepository');
const { db } = require('../config/firestore');
const { logAudit } = require('../middleware/audit');
const { generateInvoicePDF } = require('../services/pdfService');
const { enqueueTwilioDispatch } = require('../services/dispatchQueue');
const verificationService = require('../services/verificationService');
const aggregateService = require('../services/aggregateService');
const crypto = require('crypto');

/**
 * STEP 6 — Part 1: Create Itemized Frozen Invoice
 * Endpoint: POST /job-cards/:id/invoice (role guard: ADMIN)
 */
const createInvoiceFromJobCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { taxRate } = req.body;

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);

      if (!card) throw new Error('NOT_FOUND');

      const existingUnpaid = (card.invoices || []).find(inv => inv.status !== 'CANCELLED');
      if (existingUnpaid) {
        return existingUnpaid;
      }

      const tasksLaborSum = (card.tasks || []).reduce((sum, t) => sum + (t.estimatedLaborCost || 0), 0);
      const laborCost = tasksLaborSum > 0 ? tasksLaborSum : card.laborCost;
      const partsCost = (card.parts || []).reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);

      const subtotal = laborCost + partsCost;
      const effectiveTaxRate = taxRate !== undefined ? parseFloat(taxRate) : 10.0;
      const tax = (subtotal * effectiveTaxRate) / 100.0;
      const totalAmount = subtotal + tax;

      const invoiceCount = await invoiceRepository.countInvoices(transaction);
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoiceCount + 1001).padStart(5, '0')}`;

      const invoice = await invoiceRepository.create({
        invoiceNumber,
        jobCardId: id,
        customerId: card.customerId,
        createdById: req.user ? req.user.id : null,
        subtotal,
        tax,
        totalAmount,
        status: 'UNPAID',
        paymentMethod: 'UNSPECIFIED'
      }, transaction);

      const prevStatus = card.status;
      await jobCardRepository.update(id, { status: 'INVOICED' }, transaction);

      await jobCardRepository.createStatusLog({
        jobCardId: id,
        fromStatus: prevStatus,
        toStatus: 'INVOICED',
        changedById: req.user ? req.user.id : null,
        notes: `Official Invoice ${invoiceNumber} generated. Frozen Amount: ₹${totalAmount.toFixed(2)}`
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'INVOICE_GENERATED',
        entity: 'Invoice',
        entityId: invoice.id,
        details: `Generated Invoice #${invoice.invoiceNumber} for JobCard #${card.cardNumber}. Total: ₹${totalAmount.toFixed(2)}`
      }, transaction);

      setImmediate(async () => {
        try {
          const pdfResult = await generateInvoicePDF(card, invoice);
          const pdfFullUrl = `http://localhost:5000${pdfResult.relativeUrl}`;
          const customerPhone = card.customer?.phone || '+15550001122';
          const whatsappText = `📄 Official Tax Invoice #${invoice.invoiceNumber} generated for ${card.vehicle?.make} ${card.vehicle?.model} (${card.vehicle?.licensePlate}). Amount: ₹${totalAmount.toFixed(2)}. View PDF Invoice: ${pdfFullUrl}`;

          await enqueueTwilioDispatch({
            jobCardId: card.id,
            senderUserId: req.user ? req.user.id : null,
            recipientPhone: customerPhone,
            mediaUrl: pdfFullUrl,
            messageText: whatsappText
          });
        } catch (pdfErr) {
          console.error('[PDF WhatsApp Auto-Dispatch Warning]:', pdfErr);
        }
      });

      return invoice;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

/**
 * Helper to generate secure HMAC token for public invoice access
 */
const generateInvoiceToken = (invoiceId) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'autoserv-super-secret-jwt-key-2026';
  return crypto.createHmac('sha256', JWT_SECRET).update(`invoice:${invoiceId}`).digest('hex');
};

/**
 * Public-but-scoped Invoice Fetch Endpoint
 */
const getPublicInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    let invoice = await invoiceRepository.findById(id);

    // Fallback 1: Try finding invoice by jobCardId or invoiceNumber
    if (!invoice) {
      const allInvoices = await invoiceRepository.findMany({});
      invoice = allInvoices.find(inv => inv.id === id || inv.jobCardId === id || inv.invoiceNumber === id);
    }

    // Fallback 2: Try finding JobCard by ID and build temporary invoice representation
    if (!invoice) {
      const card = await jobCardRepository.findById(id);
      if (card) {
        const tasksLabor = (card.tasks || []).reduce((sum, t) => sum + (t.estimatedLaborCost || 0), 0);
        const laborCost = tasksLabor > 0 ? tasksLabor : (card.laborCost || 0);
        const partsCost = (card.parts || []).reduce((sum, p) => sum + (p.totalPrice || (p.quantity * p.unitPrice) || 0), 0);
        let subtotal = laborCost + partsCost;
        if (subtotal <= 0) {
          subtotal = card.totalCost || card.estimatedCost || 0;
        }
        const tax = subtotal * 0.10;
        const totalAmount = subtotal + tax;

        invoice = {
          id: card.id,
          invoiceNumber: `INV-2026-${String(card.cardNumber || '1001').padStart(5, '0')}`,
          jobCardId: card.id,
          customerId: card.customerId,
          subtotal,
          tax,
          totalAmount,
          status: card.status === 'PAID' || card.status === 'DELIVERED' ? 'PAID' : 'UNPAID',
          paymentMethod: 'UPI',
          createdAt: card.createdAt || new Date().toISOString(),
          jobCard: card,
          customer: card.customer
        };
      }
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const expectedToken = generateInvoiceToken(invoice.id);

    return res.json({
      ...invoice,
      secureToken: expectedToken
    });
  } catch (error) {
    console.error('Error fetching public invoice:', error);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
};

/**
 * STEP 6 — Part 2: Create Server-Side Payment Checkout Session
 */
const createCheckoutSession = async (req, res) => {
  try {
    const { invoiceId, jobCardId, token } = req.body;

    let invoice = null;
    if (invoiceId) {
      invoice = await invoiceRepository.findById(invoiceId);
    } else if (jobCardId) {
      const cardInvoices = await invoiceRepository.findMany({});
      invoice = cardInvoices.find(inv => inv.jobCardId === jobCardId && inv.status === 'UNPAID');
    }

    if (!invoice) {
      return res.status(404).json({ error: 'Unpaid invoice not found' });
    }

    const expectedToken = generateInvoiceToken(invoice.id);
    const isTokenValid = token && token === expectedToken;
    const isUserAuthorized = req.user && (
      req.user.role === 'ADMIN' ||
      req.user.role === 'TECHNICIAN' ||
      req.user.id === invoice.customerId
    );

    if (!isTokenValid && !isUserAuthorized) {
      return res.status(403).json({ error: 'Access denied. Valid secure token or authorization required to initiate checkout.' });
    }

    const amountToCharge = invoice.totalAmount;
    const sessionId = `cs_live_${crypto.randomBytes(16).toString('hex')}`;
    const webhookSecretSignature = crypto
      .createHmac('sha256', 'AUTO_SERV_WEBHOOK_SECRET_KEY')
      .update(`${invoice.id}:${amountToCharge}`)
      .digest('hex');

    const returnUrl = `http://localhost:5173/pay/${invoice.id}?token=${expectedToken}`;
    const checkoutUrl = `http://localhost:5173/checkout/${sessionId}?invoiceId=${invoice.id}&token=${expectedToken}`;

    const upiPa = process.env.RAZORPAY_UPI_VPA || 'autoserv.rzp@icici';
    const upiPn = encodeURIComponent('Auto-Serv Workshop');
    const upiTr = `RZP-${invoice.invoiceNumber}`;
    const upiTn = encodeURIComponent(`Invoice ${invoice.invoiceNumber}`);
    const upiAm = amountToCharge.toFixed(2);
    
    const upiString = `upi://pay?pa=${upiPa}&pn=${upiPn}&tr=${upiTr}&tn=${upiTn}&am=${upiAm}&cu=INR`;
    const phonepeIntent = `phonepe://pay?pa=${upiPa}&pn=${upiPn}&tr=${upiTr}&tn=${upiTn}&am=${upiAm}&cu=INR`;
    const gpayIntent = `gpay://upi/pay?pa=${upiPa}&pn=${upiPn}&tr=${upiTr}&tn=${upiTn}&am=${upiAm}&cu=INR`;
    const paytmIntent = `paytmmp://pay?pa=${upiPa}&pn=${upiPn}&tr=${upiTr}&tn=${upiTn}&am=${upiAm}&cu=INR`;
    
    const qrDataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=10&data=${encodeURIComponent(upiString)}`;

    res.json({
      sessionId,
      invoiceId: invoice.id,
      cardNumber: invoice.jobCard?.cardNumber || 'N/A',
      amount: amountToCharge,
      currency: 'INR',
      customerEmail: invoice.customer?.email || '',
      signature: webhookSecretSignature,
      token: expectedToken,
      checkoutUrl,
      returnUrl,
      upi: {
        vpa: upiPa,
        upiString,
        qrDataUrl,
        phonepeIntent,
        gpayIntent,
        paytmIntent
      }
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
};

/**
 * STEP 6 — Part 3: Cryptographic Webhook Endpoint using Firestore Transaction
 */
const handlePaymentWebhook = async (req, res) => {
  try {
    const signature = req.headers['x-signature'] || req.body.signature;
    const { invoiceId, transactionReference, paymentMethod } = req.body;

    if (!invoiceId) {
      return res.status(400).json({ error: 'Missing invoice ID in webhook payload' });
    }

    const invoice = await invoiceRepository.findById(invoiceId);

    if (!invoice) {
      return res.status(404).json({ error: 'Target invoice not found' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', 'AUTO_SERV_WEBHOOK_SECRET_KEY')
      .update(`${invoice.id}:${invoice.totalAmount}`)
      .digest('hex');

    if (signature && signature !== expectedSignature) {
      console.warn(`[Webhook Security Warning] Invalid cryptographic signature for Invoice ${invoiceId}`);
      return res.status(401).json({ error: 'Invalid cryptographic signature' });
    }

    const selectedMethod = paymentMethod || 'UPI_RAZORPAY';
    const txRef = transactionReference || `PAY-UPI-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

    const result = await invoiceRepository.confirmPaymentTransactional({
      invoiceId,
      paymentMethod: selectedMethod,
      transactionReference: txRef,
      userId: req.user ? req.user.id : null
    });

    setImmediate(async () => {
      try {
        const pdfResult = await generateInvoicePDF(invoice.jobCard, result);
        const pdfFullUrl = `http://localhost:5000${pdfResult.relativeUrl}`;
        const customerPhone = invoice.jobCard?.customer?.phone || '+15550001122';
        const customerName = invoice.jobCard?.customer?.name || 'Valued Customer';
        const vehicleStr = `${invoice.jobCard?.vehicle?.make || ''} ${invoice.jobCard?.vehicle?.model || ''}`.trim();
        
        const whatsappText = `✅ *Auto-Serv Tax Invoice Paid*\n\nHello ${customerName}, your official tax invoice #${invoice.invoiceNumber} for ${vehicleStr} (₹${result.totalAmount.toFixed(2)}) has been confirmed PAID via UPI. View & Download PDF Receipt: ${pdfFullUrl}`;

        await enqueueTwilioDispatch({
          jobCardId: invoice.jobCardId,
          senderUserId: null,
          recipientPhone: customerPhone,
          mediaUrl: pdfFullUrl,
          messageText: whatsappText
        });
      } catch (pdfErr) {
        console.error('[PDF Webhook Dispatch Warning]:', pdfErr);
      }
    });

    res.json({ received: true, status: 'PAID', invoice: result });
  } catch (error) {
    console.error('Error processing payment webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * STEP 6 — Part 4: Admin Manual Cash / Direct UPI Payment Recording
 */
const markPaidCash = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const card = await jobCardRepository.findById(id);
    if (!card) return res.status(404).json({ error: 'Job card not found' });

    let invoice = (card.invoices || []).find(inv => inv.status === 'UNPAID');

    if (!invoice) {
      const tasksLaborSum = (card.tasks || []).reduce((sum, t) => sum + (t.estimatedLaborCost || 0), 0);
      const laborCost = tasksLaborSum > 0 ? tasksLaborSum : card.laborCost;
      const partsCost = (card.parts || []).reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);

      const subtotal = laborCost + partsCost;
      const tax = subtotal * 0.10;
      const totalAmount = subtotal + tax;

      const count = await invoiceRepository.countInvoices();
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(count + 1001).padStart(5, '0')}`;

      invoice = await invoiceRepository.create({
        invoiceNumber,
        jobCardId: id,
        customerId: card.customerId,
        createdById: req.user ? req.user.id : null,
        subtotal,
        tax,
        totalAmount,
        status: 'UNPAID',
        paymentMethod: 'UPI_DIRECT'
      });
    }

    const txRef = `UPI-REC-${Date.now()}`;

    const result = await invoiceRepository.confirmPaymentTransactional({
      invoiceId: invoice.id,
      paymentMethod: 'UPI_DIRECT',
      transactionReference: txRef,
      userId: req.user ? req.user.id : null
    });

    setImmediate(async () => {
      try {
        const pdfResult = await generateInvoicePDF(card, result);
        const pdfFullUrl = `http://localhost:5000${pdfResult.relativeUrl}`;
        const customerPhone = card.customer?.phone || '+15550001122';
        const whatsappText = `✅ PAYMENT CONFIRMED: Official Tax Invoice #${result.invoiceNumber || invoice.invoiceNumber} paid (₹${result.totalAmount.toFixed(2)}). View & Download PDF Invoice: ${pdfFullUrl}`;

        await enqueueTwilioDispatch({
          jobCardId: id,
          senderUserId: req.user ? req.user.id : null,
          recipientPhone: customerPhone,
          mediaUrl: pdfFullUrl,
          messageText: whatsappText
        });
      } catch (pdfErr) {
        console.error('[PDF Auto-Dispatch Warning]:', pdfErr);
      }
    });

    res.json(result);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

const downloadInvoicePDF = async (req, res) => {
  try {
    const { id } = req.params;
    const card = await jobCardRepository.findById(id);

    if (!card) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    const invoice = (card.invoices || []).find(inv => inv.status !== 'CANCELLED') || {
      invoiceNumber: `INV-${card.cardNumber}`,
      totalAmount: (card.totalCost || 0) * 1.10,
      status: card.status === 'PAID' ? 'PAID' : 'UNPAID',
      paymentMethod: 'UPI_DIRECT'
    };

    const pdfResult = await generateInvoicePDF(card, invoice);
    res.download(pdfResult.filePath, pdfResult.fileName);
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
};

const getInvoices = async (req, res) => {
  try {
    let whereClause = {};

    if (req.user && req.user.role === 'CUSTOMER') {
      whereClause.customerId = req.user.id;
    }

    const invoices = await invoiceRepository.findMany(whereClause);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
};

const recordPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionReference } = req.body;

    const result = await invoiceRepository.confirmPaymentTransactional({
      invoiceId: id,
      paymentMethod: paymentMethod || 'UPI_DIRECT',
      transactionReference: transactionReference || `REF-${Date.now()}`,
      userId: req.user ? req.user.id : null
    });

    res.json(result);
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
};

const sendInvoiceWhatsApp = async (req, res) => {
  try {
    const { id } = req.params;
    const invoice = await invoiceRepository.findById(id);

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const card = invoice.jobCard;
    const customerPhone = invoice.customer?.phone || card?.customer?.phone;

    if (!customerPhone) {
      return res.status(400).json({ error: 'Customer mobile phone number is missing' });
    }

    const isVerified = verificationService.isPhoneVerified(customerPhone);
    if (!isVerified) {
      return res.status(400).json({
        error: `Customer phone number (${customerPhone}) is not verified via OTP. WhatsApp dispatch blocked to unverified numbers.`
      });
    }

    const pdfResult = await generateInvoicePDF(card, invoice);
    const pdfFullUrl = `http://localhost:5000${pdfResult.relativeUrl}`;
    const payUrl = `http://localhost:5173/pay/${card.id}`;
    const vehicleStr = card?.vehicle ? `${card.vehicle.make} ${card.vehicle.model} (${card.vehicle.licensePlate})` : 'Vehicle';
    const customerName = invoice.customer?.name || 'Customer';

    const whatsappText = [
      `📄 *Official Tax Invoice #${invoice.invoiceNumber}*`,
      ``,
      `Hello ${customerName}! Here is your official workshop tax invoice for *${vehicleStr}*.`,
      `Total Billed Amount: ₹${invoice.totalAmount.toFixed(2)}`,
      ``,
      `💳 *View & Pay Online*: ${payUrl}`,
      `📄 *Download PDF Invoice*: ${pdfFullUrl}`,
      ``,
      `Thank you for choosing Auto-Serv Workshop!`
    ].join('\n');

    await enqueueTwilioDispatch({
      jobCardId: card.id,
      senderUserId: req.user ? req.user.id : null,
      recipientPhone: customerPhone,
      mediaUrl: pdfFullUrl,
      messageText: whatsappText,
      isVerified: true
    });

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: 'INVOICE_SENT_WHATSAPP',
      entity: 'Invoice',
      entityId: invoice.id,
      details: `Official Tax Invoice #${invoice.invoiceNumber} dispatched to verified phone ${customerPhone} via WhatsApp`
    });

    res.json({
      success: true,
      message: `Tax Invoice #${invoice.invoiceNumber} sent via WhatsApp to verified number ${customerPhone}! ✓`,
      recipientPhone: customerPhone,
      isVerified: true
    });
  } catch (error) {
    console.error('Error sending WhatsApp invoice:', error);
    res.status(500).json({ error: 'Failed to dispatch invoice via WhatsApp' });
  }
};

module.exports = {
  generateInvoiceToken,
  getPublicInvoiceById,
  createInvoiceFromJobCard,
  createCheckoutSession,
  handlePaymentWebhook,
  markPaidCash,
  downloadInvoicePDF,
  getInvoices,
  recordPayment,
  sendInvoiceWhatsApp
};
