const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'users';

const findByEmail = async (email, transaction = null) => {
  if (!email) return null;
  const cleanEmail = String(email).trim().toLowerCase();
  
  const query = db.collection(COLLECTION).where('email', '==', cleanEmail).limit(1);
  const snapshot = transaction ? await transaction.get(query) : await query.get();
  
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const findByEmailOrPhone = async (identifier, transaction = null) => {
  if (!identifier) return null;
  const cleanId = String(identifier).trim();
  const lowerCleanId = cleanId.toLowerCase();

  // Try direct ID lookup
  const docRef = db.collection(COLLECTION).doc(cleanId);
  const docSnap = transaction ? await transaction.get(docRef) : await docRef.get();
  if (docSnap.exists) {
    return { id: docSnap.id, ...docSnap.data() };
  }

  // Try email match
  const emailQuery = db.collection(COLLECTION).where('email', '==', lowerCleanId).limit(1);
  const emailSnap = transaction ? await transaction.get(emailQuery) : await emailQuery.get();
  if (!emailSnap.empty) {
    const d = emailSnap.docs[0];
    return { id: d.id, ...d.data() };
  }

  // Try phone match
  const phoneQuery = db.collection(COLLECTION).where('phone', '==', cleanId).limit(1);
  const phoneSnap = transaction ? await transaction.get(phoneQuery) : await phoneQuery.get();
  if (!phoneSnap.empty) {
    const d = phoneSnap.docs[0];
    return { id: d.id, ...d.data() };
  }

  return null;
};

const findById = async (id, transaction = null) => {
  if (!id) return null;
  const docRef = db.collection(COLLECTION).doc(id);
  const docSnap = transaction ? await transaction.get(docRef) : await docRef.get();
  if (!docSnap.exists) return null;
  return { id: docSnap.id, ...docSnap.data() };
};

const findByPhone = async (phone, transaction = null) => {
  if (!phone) return null;
  const query = db.collection(COLLECTION).where('phone', '==', String(phone).trim()).limit(1);
  const snapshot = transaction ? await transaction.get(query) : await query.get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

const findManyByRole = async (role, transaction = null) => {
  const query = db.collection(COLLECTION).where('role', '==', role);
  const snapshot = transaction ? await transaction.get(query) : await query.get();
  
  const users = [];
  snapshot.forEach(doc => {
    users.push({ id: doc.id, ...doc.data() });
  });
  return users.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
};

const create = async ({ id, email, passwordHash, name, phone, role }, transaction = null) => {
  const userId = id || uuidv4();
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const now = new Date().toISOString();

  const userData = {
    email: cleanEmail,
    passwordHash: passwordHash || '',
    name: name || 'User',
    phone: phone || null,
    role: role || 'CUSTOMER',
    preferredLanguage: 'en',
    preferredTheme: role === 'TECHNICIAN' ? 'light' : 'dark',
    createdAt: now,
    updatedAt: now
  };

  const docRef = db.collection(COLLECTION).doc(userId);
  if (transaction) {
    transaction.set(docRef, userData);
  } else {
    await docRef.set(userData);
  }

  return { id: userId, ...userData };
};

const countByRole = async (role, transaction = null) => {
  const query = db.collection(COLLECTION).where('role', '==', role);
  const snapshot = transaction ? await transaction.get(query) : await query.get();
  return snapshot.size;
};

const updateLanguage = async (userId, preferredLanguage) => {
  if (!userId) return null;
  const docRef = db.collection(COLLECTION).doc(userId);
  const updateData = { preferredLanguage, updatedAt: new Date().toISOString() };
  await docRef.update(updateData);
  return findById(userId);
};

const updateTheme = async (userId, preferredTheme) => {
  if (!userId) return null;
  const docRef = db.collection(COLLECTION).doc(userId);
  const updateData = { preferredTheme, updatedAt: new Date().toISOString() };
  await docRef.update(updateData);
  return findById(userId);
};

module.exports = {
  findByEmail,
  findByEmailOrPhone,
  findById,
  findByPhone,
  findManyByRole,
  create,
  countByRole,
  updateLanguage,
  updateTheme
};
