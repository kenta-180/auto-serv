const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');
const jobCardRepository = require('./jobCardRepository');
const aggregateService = require('../services/aggregateService');

const COLLECTION = 'invoices';

const countInvoices = async (transaction = null) => {
  const query = db.collection(COLLECTION);
  const snapshot = transaction ? await transaction.get(query) : await query.get();
  return snapshot.size;
};

const findById = async (id, transaction = null) => {
  if (!id) return null;
  const docRef = db.collection(COLLECTION).doc(id);
  const docSnap = transaction ? await transaction.get(docRef) : await docRef.get();
  if (!docSnap.exists) return null;

  const invData = docSnap.data();

  // Populate customer and jobCard
  let customer = null;
  if (invData.customerId) {
    const cSnap = await db.collection('users').doc(invData.customerId).get();
    if (cSnap.exists) customer = { id: cSnap.id, ...cSnap.data() };
  }

  const jobCard = invData.jobCardId ? await jobCardRepository.findById(invData.jobCardId, transaction) : null;

  return { id: docSnap.id, ...invData, customer, jobCard };
};

const findMany = async (whereClause = {}, transaction = null) => {
  let query = db.collection(COLLECTION);

  if (whereClause.customerId) {
    query = query.where('customerId', '==', whereClause.customerId);
  }

  const snapshot = transaction ? await transaction.get(query) : await query.get();

  const results = [];
  for (const doc of snapshot.docs) {
    const inv = await findById(doc.id, transaction);
    if (inv) results.push(inv);
  }

  return results.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
};

const create = async ({ invoiceNumber, jobCardId, customerId, createdById, subtotal, tax, totalAmount, status, paymentMethod }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const invoiceData = {
    invoiceNumber,
    jobCardId,
    customerId,
    createdById: createdById || null,
    subtotal: parseFloat(subtotal || 0),
    tax: parseFloat(tax || 0),
    totalAmount: parseFloat(totalAmount || 0),
    status: status || 'UNPAID',
    paymentMethod: paymentMethod || 'UNSPECIFIED',
    transactionReference: null,
    paidAt: null,
    createdAt: now,
    updatedAt: now
  };

  const docRef = db.collection(COLLECTION).doc(id);
  if (transaction) {
    transaction.set(docRef, invoiceData);
  } else {
    await docRef.set(invoiceData);
  }

  return findById(id, transaction);
};

const update = async (id, data, transaction = null) => {
  if (!id) return null;
  const docRef = db.collection(COLLECTION).doc(id);
  const updateData = { ...data, updatedAt: new Date().toISOString() };

  if (transaction) {
    transaction.update(docRef, updateData);
  } else {
    await docRef.update(updateData);
  }

  return findById(id, transaction);
};

/**
 * FIRESTORE TRANSACTION: ATOMIC PAYMENT CONFIRMATION & WEBHOOK VERIFICATION
 * Reads invoice and jobCard inside transaction, updates invoice status to PAID,
 * updates jobCard status to PAID, creates status log, and increments total revenue.
 */
const confirmPaymentTransactional = async ({ invoiceId, paymentMethod, transactionReference, userId }) => {
  return await db.runTransaction(async (transaction) => {
    const invRef = db.collection(COLLECTION).doc(invoiceId);
    const invSnap = await transaction.get(invRef);

    if (!invSnap.exists) throw new Error('INVOICE_NOT_FOUND');
    const invData = invSnap.data();

    if (invData.status === 'PAID') {
      return { id: invoiceId, ...invData, alreadyPaid: true };
    }

    const now = new Date().toISOString();
    const updatedInvoiceData = {
      status: 'PAID',
      paymentMethod: paymentMethod || 'ONLINE',
      transactionReference: transactionReference || `TXN-${Date.now()}`,
      paidAt: now,
      updatedAt: now
    };

    transaction.update(invRef, updatedInvoiceData);

    // Update corresponding JobCard status to PAID
    if (invData.jobCardId) {
      const cardRef = db.collection('jobCards').doc(invData.jobCardId);
      const cardSnap = await transaction.get(cardRef);
      if (cardSnap.exists) {
        const cardData = cardSnap.data();
        transaction.update(cardRef, {
          status: 'PAID',
          updatedAt: now
        });

        // Add Status Log
        const logId = uuidv4();
        transaction.set(db.collection('jobCardStatusLogs').doc(logId), {
          jobCardId: invData.jobCardId,
          fromStatus: cardData.status || 'INVOICED',
          toStatus: 'PAID',
          changedById: userId || invData.customerId || null,
          notes: `Payment confirmed via ${paymentMethod || 'gateway'}. Ref: ${transactionReference || 'N/A'}`,
          createdAt: now
        });
      }
    }

    // Increment running revenue in aggregates document
    aggregateService.incrementRevenue(invData.totalAmount || 0, transaction);

    return { id: invoiceId, ...invData, ...updatedInvoiceData };
  });
};

module.exports = {
  countInvoices,
  findById,
  findMany,
  create,
  update,
  confirmPaymentTransactional
};
