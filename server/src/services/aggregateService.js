const { db } = require('../config/firestore');

const AGGREGATE_DOC_PATH = 'aggregates/dashboard';

/**
 * Recalculate full dashboard aggregates from Firestore collections (used on seed or on-demand cache refresh)
 */
async function recalculateDashboardAggregates(transaction = null) {
  const runner = transaction || db;

  // 1. Calculate Total Revenue from Paid Invoices
  const invoicesSnapshot = await db.collection('invoices').where('status', '==', 'PAID').get();
  let totalRevenue = 0;
  invoicesSnapshot.forEach(doc => {
    const data = doc.data();
    totalRevenue += Number(data.totalAmount || 0);
  });

  // 2. Calculate Stock Valuation and Low Stock Count
  const inventorySnapshot = await db.collection('inventoryItems').get();
  let stockValuation = 0;
  let lowStockCount = 0;
  inventorySnapshot.forEach(doc => {
    const data = doc.data();
    const qty = Number(data.quantity || 0);
    const minStock = Number(data.minimumStock || 5);
    const price = Number(data.unitPrice || 0);
    stockValuation += (qty * price);
    if (qty <= minStock) {
      lowStockCount++;
    }
  });

  // 3. Calculate Job Card Metrics
  const jobCardsSnapshot = await db.collection('jobCards').get();
  const totalJobCards = jobCardsSnapshot.size;
  let pendingJobCards = 0;
  const terminalStatuses = ['DELIVERED', 'CANCELLED'];
  jobCardsSnapshot.forEach(doc => {
    const data = doc.data();
    if (!terminalStatuses.includes(data.status)) {
      pendingJobCards++;
    }
  });

  const aggregates = {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    stockValuation: parseFloat(stockValuation.toFixed(2)),
    totalJobCards,
    pendingJobCards,
    lowStockCount,
    updatedAt: new Date().toISOString()
  };

  if (transaction) {
    transaction.set(db.doc(AGGREGATE_DOC_PATH), aggregates, { merge: true });
  } else {
    await db.doc(AGGREGATE_DOC_PATH).set(aggregates, { merge: true });
  }

  return aggregates;
}

/**
 * Get current dashboard aggregates (super fast single document read)
 */
async function getDashboardAggregates() {
  try {
    const doc = await db.doc(AGGREGATE_DOC_PATH).get();
    if (doc.exists) {
      return doc.data();
    }
  } catch (err) {
    console.warn('[Aggregate Service Warning] Could not fetch dashboard aggregates doc:', err.message);
  }
  // Fallback recalculate if document does not exist yet
  return await recalculateDashboardAggregates();
}

/**
 * Increment / update revenue in aggregate document
 */
async function incrementRevenue(amount, transaction = null) {
  const runner = transaction || db;
  const docRef = db.doc(AGGREGATE_DOC_PATH);
  const data = {
    totalRevenue: db.constructor.FieldValue ? db.constructor.FieldValue.increment(amount) : amount,
    updatedAt: new Date().toISOString()
  };

  if (transaction) {
    transaction.set(docRef, data, { merge: true });
  } else {
    await docRef.set(data, { merge: true });
  }
}

module.exports = {
  recalculateDashboardAggregates,
  getDashboardAggregates,
  incrementRevenue
};
