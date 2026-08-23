const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'jobCards';

const buildJobCardFull = async (jobCardId, transaction = null) => {
  if (!jobCardId) return null;
  const cardRef = db.collection(COLLECTION).doc(jobCardId);
  const cardSnap = transaction ? await transaction.get(cardRef) : await cardRef.get();

  if (!cardSnap.exists) return null;
  const card = cardSnap.data();

  // Fetch populated entities concurrently
  const [
    vehicleSnap,
    techSnap,
    custSnap,
    approvedBySnap,
    partsSnap,
    tasksSnap,
    estimatesSnap,
    mediaSnap,
    qcSnap,
    statusLogsSnap,
    invoicesSnap,
    dispatchSnap,
    timeLogsSnap
  ] = await Promise.all([
    card.vehicleId ? db.collection('vehicles').doc(card.vehicleId).get() : Promise.resolve(null),
    card.technicianId ? db.collection('users').doc(card.technicianId).get() : Promise.resolve(null),
    card.customerId ? db.collection('users').doc(card.customerId).get() : Promise.resolve(null),
    card.approvedById ? db.collection('users').doc(card.approvedById).get() : Promise.resolve(null),
    db.collection('jobCardParts').where('jobCardId', '==', jobCardId).get(),
    db.collection('jobTasks').where('jobCardId', '==', jobCardId).get(),
    db.collection('jobPartEstimates').where('jobCardId', '==', jobCardId).get(),
    db.collection('jobMedia').where('jobCardId', '==', jobCardId).get(),
    db.collection('qcReports').where('jobCardId', '==', jobCardId).get(),
    db.collection('jobCardStatusLogs').where('jobCardId', '==', jobCardId).get(),
    db.collection('invoices').where('jobCardId', '==', jobCardId).get(),
    db.collection('twilioDispatchLogs').where('jobCardId', '==', jobCardId).get(),
    db.collection('jobTimeLogs').where('jobCardId', '==', jobCardId).get()
  ]);

  const vehicle = vehicleSnap && vehicleSnap.exists ? { id: vehicleSnap.id, ...vehicleSnap.data() } : null;
  const technician = techSnap && techSnap.exists ? { id: techSnap.id, ...techSnap.data() } : null;
  const customer = custSnap && custSnap.exists ? { id: custSnap.id, ...custSnap.data() } : null;
  const approvedBy = approvedBySnap && approvedBySnap.exists ? { id: approvedBySnap.id, ...approvedBySnap.data() } : null;

  // Process parts with inventoryItem details
  const parts = [];
  for (const doc of partsSnap.docs) {
    const p = doc.data();
    let inventoryItem = null;
    if (p.inventoryItemId) {
      const itemSnap = await db.collection('inventoryItems').doc(p.inventoryItemId).get();
      if (itemSnap.exists) inventoryItem = { id: itemSnap.id, ...itemSnap.data() };
    }
    let drawnByUser = null;
    if (p.drawnByUserId) {
      const uSnap = await db.collection('users').doc(p.drawnByUserId).get();
      if (uSnap.exists) drawnByUser = { id: uSnap.id, ...uSnap.data() };
    }
    parts.push({ id: doc.id, ...p, inventoryItem, drawnByUser });
  }

  const tasks = [];
  tasksSnap.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));

  const partEstimates = [];
  estimatesSnap.forEach(doc => partEstimates.push({ id: doc.id, ...doc.data() }));

  const media = [];
  mediaSnap.forEach(doc => media.push({ id: doc.id, ...doc.data() }));
  media.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));

  const qcReports = [];
  qcSnap.forEach(doc => qcReports.push({ id: doc.id, ...doc.data() }));
  qcReports.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));

  const statusLogs = [];
  statusLogsSnap.forEach(doc => statusLogs.push({ id: doc.id, ...doc.data() }));
  statusLogs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  const invoices = [];
  invoicesSnap.forEach(doc => invoices.push({ id: doc.id, ...doc.data() }));

  const dispatchLogs = [];
  dispatchSnap.forEach(doc => dispatchLogs.push({ id: doc.id, ...doc.data() }));

  const timeLogs = [];
  timeLogsSnap.forEach(doc => timeLogs.push({ id: doc.id, ...doc.data() }));

  return {
    id: cardSnap.id,
    ...card,
    vehicle,
    technician,
    customer,
    approvedBy,
    parts,
    tasks,
    partEstimates,
    media,
    qcReports,
    statusLogs,
    invoices,
    dispatchLogs,
    timeLogs
  };
};

const findMany = async (whereClause = {}, transaction = null) => {
  let query = db.collection(COLLECTION);

  if (whereClause.technicianId) {
    query = query.where('technicianId', '==', whereClause.technicianId);
  } else if (whereClause.customerId) {
    query = query.where('customerId', '==', whereClause.customerId);
  }

  const snapshot = transaction ? await transaction.get(query) : await query.get();

  const cards = [];
  for (const doc of snapshot.docs) {
    const fullCard = await buildJobCardFull(doc.id, transaction);
    if (fullCard) cards.push(fullCard);
  }

  return cards.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
};

const findById = async (id, transaction = null) => {
  return buildJobCardFull(id, transaction);
};

const countJobCards = async (transaction = null) => {
  const query = db.collection(COLLECTION);
  const snapshot = transaction ? await transaction.get(query) : await query.get();
  return snapshot.size;
};

const create = async ({ title, description, reportedIssues, mileage, fuelLevel, priority, status, vehicleId, customerId, technicianId, promisedDate }, transaction = null) => {
  const id = uuidv4();
  const count = await countJobCards(transaction);
  const cardNumber = `JC-${new Date().getFullYear()}-${String(count + 1001).padStart(5, '0')}`;
  const now = new Date().toISOString();

  const cardData = {
    cardNumber,
    title: title || 'Service Visit',
    description: description || null,
    reportedIssues: reportedIssues || null,
    mileage: mileage ? parseInt(mileage, 10) : 0,
    fuelLevel: fuelLevel || '1/2',
    status: status || 'CHECKED_IN',
    priority: priority || 'MEDIUM',
    vehicleId,
    customerId,
    technicianId: technicianId || null,
    promisedDate: promisedDate || null,
    estimatedCost: 0,
    laborCost: 0,
    partsCost: 0,
    totalCost: 0,
    createdAt: now,
    updatedAt: now
  };

  const docRef = db.collection(COLLECTION).doc(id);
  if (transaction) {
    transaction.set(docRef, cardData);
  } else {
    await docRef.set(cardData);
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

const addJobCardPart = async ({ jobCardId, inventoryItemId, quantity, unitPrice, totalPrice, drawnByUserId }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const partData = {
    jobCardId,
    inventoryItemId,
    quantity: parseInt(quantity || 1, 10),
    unitPrice: parseFloat(unitPrice || 0),
    totalPrice: parseFloat(totalPrice || 0),
    drawnByUserId: drawnByUserId || null,
    createdAt: now
  };

  const docRef = db.collection('jobCardParts').doc(id);
  if (transaction) {
    transaction.set(docRef, partData);
  } else {
    await docRef.set(partData);
  }

  return { id, ...partData };
};

const addJobTask = async ({ jobCardId, description, estimatedLaborCost, status }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const taskData = {
    jobCardId,
    description: description || 'Repair Task',
    estimatedLaborCost: parseFloat(estimatedLaborCost || 0),
    status: status || 'PENDING',
    createdAt: now
  };

  const docRef = db.collection('jobTasks').doc(id);
  if (transaction) {
    transaction.set(docRef, taskData);
  } else {
    await docRef.set(taskData);
  }

  return { id, ...taskData };
};

const addJobPartEstimate = async ({ jobCardId, inventoryItemId, partName, estimatedQuantity, estimatedUnitPrice, estimatedTotalPrice }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const estData = {
    jobCardId,
    inventoryItemId: inventoryItemId || null,
    partName: partName || 'Estimated Part',
    estimatedQuantity: parseInt(estimatedQuantity || 1, 10),
    estimatedUnitPrice: parseFloat(estimatedUnitPrice || 0),
    estimatedTotalPrice: parseFloat(estimatedTotalPrice || 0),
    createdAt: now
  };

  const docRef = db.collection('jobPartEstimates').doc(id);
  if (transaction) {
    transaction.set(docRef, estData);
  } else {
    await docRef.set(estData);
  }

  return { id, ...estData };
};

const clearJobCardTasksAndEstimates = async (jobCardId, transaction = null) => {
  if (!jobCardId) return;
  const tasksSnap = transaction
    ? await transaction.get(db.collection('jobTasks').where('jobCardId', '==', jobCardId))
    : await db.collection('jobTasks').where('jobCardId', '==', jobCardId).get();

  for (const doc of tasksSnap.docs) {
    if (transaction) transaction.delete(doc.ref);
    else await doc.ref.delete();
  }

  const estSnap = transaction
    ? await transaction.get(db.collection('jobPartEstimates').where('jobCardId', '==', jobCardId))
    : await db.collection('jobPartEstimates').where('jobCardId', '==', jobCardId).get();

  for (const doc of estSnap.docs) {
    if (transaction) transaction.delete(doc.ref);
    else await doc.ref.delete();
  }
};

const addJobMedia = async ({ jobCardId, url, type, caption }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const mediaData = {
    jobCardId,
    url,
    type: type || 'PRE_SERVICE_CONDITION',
    caption: caption || null,
    uploadedAt: now
  };

  const docRef = db.collection('jobMedia').doc(id);
  if (transaction) {
    transaction.set(docRef, mediaData);
  } else {
    await docRef.set(mediaData);
  }

  return { id, ...mediaData };
};

const createQCReport = async ({ jobCardId, passed, notes, checklist, inspectedByUserId }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const qcData = {
    jobCardId,
    passed: Boolean(passed),
    notes: notes || null,
    checklist: checklist || null,
    inspectedByUserId: inspectedByUserId || null,
    timestamp: now
  };

  const docRef = db.collection('qcReports').doc(id);
  if (transaction) {
    transaction.set(docRef, qcData);
  } else {
    await docRef.set(qcData);
  }

  return { id, ...qcData };
};

const createStatusLog = async ({ jobCardId, fromStatus, toStatus, changedById, notes }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const logData = {
    jobCardId,
    fromStatus: fromStatus || null,
    toStatus,
    changedById: changedById || null,
    notes: notes || null,
    createdAt: now
  };

  const docRef = db.collection('jobCardStatusLogs').doc(id);
  if (transaction) {
    transaction.set(docRef, logData);
  } else {
    await docRef.set(logData);
  }

  return { id, ...logData };
};

const createDispatchLog = async ({ jobCardId, senderUserId, recipientPhone, mediaUrl, messageText, status }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const dispatchData = {
    jobCardId: jobCardId || null,
    senderUserId: senderUserId || null,
    recipientPhone,
    mediaUrl: mediaUrl || null,
    messageText,
    status: status || 'SENT',
    sentAt: now
  };

  const docRef = db.collection('twilioDispatchLogs').doc(id);
  if (transaction) {
    transaction.set(docRef, dispatchData);
  } else {
    await docRef.set(dispatchData);
  }

  return { id, ...dispatchData };
};

/**
 * FIRESTORE TRANSACTION: ATOMIC INVENTORY CHECKOUT & DEDUCTION
 * Reads stock levels inside transaction, validates availability, deducts stock,
 * creates jobCardPart record, and creates audit log entry.
 */
const checkoutPartsTransactional = async ({ jobCardId, parts, userId }) => {
  return await db.runTransaction(async (transaction) => {
    const cardRef = db.collection(COLLECTION).doc(jobCardId);
    const cardSnap = await transaction.get(cardRef);
    if (!cardSnap.exists) throw new Error('JOB_CARD_NOT_FOUND');
    const card = cardSnap.data();

    let additionalPartsCost = 0;
    const createdParts = [];
    const now = new Date().toISOString();

    for (const item of parts) {
      const itemRef = db.collection('inventoryItems').doc(item.inventoryItemId);
      const itemSnap = await transaction.get(itemRef);
      if (!itemSnap.exists) {
        throw new Error(`Inventory item ${item.inventoryItemId} not found`);
      }

      const invData = itemSnap.data();
      const drawQty = parseInt(item.quantity || 1, 10);
      if (invData.quantity < drawQty) {
        throw new Error(`Insufficient stock for ${invData.name}. Requested: ${drawQty}, Available: ${invData.quantity}`);
      }

      // Update inventory stock atomically
      const newStock = invData.quantity - drawQty;
      transaction.update(itemRef, { quantity: newStock, updatedAt: now });

      // Add part record
      const partId = uuidv4();
      const unitPrice = parseFloat(item.unitPrice || invData.unitPrice || 0);
      const totalPrice = parseFloat((unitPrice * drawQty).toFixed(2));
      additionalPartsCost += totalPrice;

      const partData = {
        jobCardId,
        inventoryItemId: item.inventoryItemId,
        quantity: drawQty,
        unitPrice,
        totalPrice,
        drawnByUserId: userId || null,
        createdAt: now
      };
      transaction.set(db.collection('jobCardParts').doc(partId), partData);
      createdParts.push({ id: partId, ...partData });

      // Audit Log entry
      const auditId = uuidv4();
      const auditData = {
        userId: userId || null,
        action: 'PARTS_CHECKOUT',
        entity: 'InventoryItem',
        entityId: item.inventoryItemId,
        inventoryItemId: item.inventoryItemId,
        details: `Checked out ${drawQty}x ${invData.name} for Job Card ${card.cardNumber}. Stock remaining: ${newStock}`,
        timestamp: now
      };
      transaction.set(db.collection('auditLogs').doc(auditId), auditData);
    }

    // Update job card costs
    const updatedPartsCost = parseFloat(((card.partsCost || 0) + additionalPartsCost).toFixed(2));
    const updatedTotalCost = parseFloat(((card.laborCost || 0) + updatedPartsCost).toFixed(2));

    transaction.update(cardRef, {
      partsCost: updatedPartsCost,
      totalCost: updatedTotalCost,
      updatedAt: now
    });

    return { createdParts, partsCost: updatedPartsCost, totalCost: updatedTotalCost };
  });
};

module.exports = {
  buildJobCardFull,
  findMany,
  findById,
  countJobCards,
  create,
  update,
  addJobCardPart,
  addJobTask,
  addJobPartEstimate,
  clearJobCardTasksAndEstimates,
  addJobMedia,
  createQCReport,
  createStatusLog,
  createDispatchLog,
  checkoutPartsTransactional
};
