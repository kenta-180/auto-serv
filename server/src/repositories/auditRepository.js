const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'auditLogs';

const create = async ({ userId, action, entity, entityId, details, inventoryItemId }, transaction = null) => {
  const id = uuidv4();
  const now = new Date().toISOString();

  const auditData = {
    userId: userId || null,
    action: action || 'UNKNOWN_ACTION',
    entity: entity || 'General',
    entityId: entityId || null,
    details: details || null,
    inventoryItemId: inventoryItemId || null,
    timestamp: now
  };

  const docRef = db.collection(COLLECTION).doc(id);
  if (transaction) {
    transaction.set(docRef, auditData);
  } else {
    await docRef.set(auditData);
  }

  return { id, ...auditData };
};

const findAll = async (transaction = null) => {
  const query = db.collection(COLLECTION).orderBy('timestamp', 'desc');
  const snapshot = transaction ? await transaction.get(query) : await query.get();

  const logs = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let user = null;
    let inventoryItem = null;

    if (data.userId) {
      const uSnap = await db.collection('users').doc(data.userId).get();
      if (uSnap.exists) user = { id: uSnap.id, ...uSnap.data() };
    }

    if (data.inventoryItemId) {
      const iSnap = await db.collection('inventoryItems').doc(data.inventoryItemId).get();
      if (iSnap.exists) inventoryItem = { id: iSnap.id, ...iSnap.data() };
    }

    logs.push({ id: doc.id, ...data, user, inventoryItem });
  }

  return logs;
};

module.exports = {
  create,
  findAll,
  findAuditLogs: findAll
};
