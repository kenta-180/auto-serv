const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'inventoryItems';

const findAll = async (transaction = null) => {
  const query = db.collection(COLLECTION).orderBy('name', 'asc');
  const snapshot = transaction ? await transaction.get(query) : await query.get();

  const items = [];
  snapshot.forEach(doc => {
    items.push({ id: doc.id, ...doc.data() });
  });
  return items;
};

const findById = async (id, transaction = null) => {
  if (!id) return null;
  const docRef = db.collection(COLLECTION).doc(id);
  const docSnap = transaction ? await transaction.get(docRef) : await docRef.get();
  if (!docSnap.exists) return null;
  return { id: docSnap.id, ...docSnap.data() };
};

const findBySku = async (sku, transaction = null) => {
  if (!sku) return null;
  const upperSku = String(sku).toUpperCase().trim();

  const query = db.collection(COLLECTION).where('sku', '==', upperSku).limit(1);
  const snapshot = transaction ? await transaction.get(query) : await query.get();
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const create = async ({ sku, name, category, description, quantity, minimumStock, unitPrice, partType, location }, transaction = null) => {
  const id = uuidv4();
  const validPartType = ['FAST_MOVING', 'REGULAR', 'SERVICE_PART'].includes(partType) ? partType : 'REGULAR';
  const now = new Date().toISOString();

  const itemData = {
    sku: String(sku).toUpperCase().trim(),
    name: name || 'Part',
    category: category || 'General',
    description: description || null,
    quantity: parseInt(quantity || 0, 10),
    minimumStock: parseInt(minimumStock || 5, 10),
    unitPrice: parseFloat(unitPrice || 0),
    partType: validPartType,
    location: location || 'Main Shelf',
    createdAt: now,
    updatedAt: now
  };

  const docRef = db.collection(COLLECTION).doc(id);
  if (transaction) {
    transaction.set(docRef, itemData);
  } else {
    await docRef.set(itemData);
  }

  return { id, ...itemData };
};

const updateQuantity = async (id, newQuantity, transaction = null) => {
  if (!id) return null;
  const docRef = db.collection(COLLECTION).doc(id);
  const qty = parseInt(newQuantity, 10);
  const updateData = { quantity: qty, updatedAt: new Date().toISOString() };

  if (transaction) {
    transaction.update(docRef, updateData);
  } else {
    await docRef.update(updateData);
  }

  return findById(id, transaction);
};

const updatePart = async (id, { name, category, description, quantity, minimumStock, unitPrice, partType, location }, transaction = null) => {
  if (!id) return null;
  const validPartType = ['FAST_MOVING', 'REGULAR', 'SERVICE_PART'].includes(partType) ? partType : 'REGULAR';
  const docRef = db.collection(COLLECTION).doc(id);

  const updateData = {
    name,
    category: category || 'General',
    description: description || null,
    quantity: parseInt(quantity || 0, 10),
    minimumStock: parseInt(minimumStock || 5, 10),
    unitPrice: parseFloat(unitPrice || 0),
    partType: validPartType,
    location: location || 'Main Shelf',
    updatedAt: new Date().toISOString()
  };

  if (transaction) {
    transaction.update(docRef, updateData);
  } else {
    await docRef.update(updateData);
  }

  return findById(id, transaction);
};

module.exports = {
  findAll,
  findById,
  findBySku,
  create,
  updateQuantity,
  updatePart
};
