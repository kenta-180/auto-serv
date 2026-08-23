const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'vehicles';

const findByLicensePlate = async (licensePlate, transaction = null) => {
  if (!licensePlate) return null;
  const plate = String(licensePlate).toUpperCase().trim();

  const query = db.collection(COLLECTION).where('licensePlate', '==', plate).limit(1);
  const snapshot = transaction ? await transaction.get(query) : await query.get();

  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  const data = doc.data();

  // Populate owner if present
  let owner = null;
  if (data.ownerId) {
    const ownerDoc = await db.collection('users').doc(data.ownerId).get();
    if (ownerDoc.exists) owner = { id: ownerDoc.id, ...ownerDoc.data() };
  }

  return { id: doc.id, ...data, owner };
};

const findById = async (id, transaction = null) => {
  if (!id) return null;
  const docRef = db.collection(COLLECTION).doc(id);
  const docSnap = transaction ? await transaction.get(docRef) : await docRef.get();
  if (!docSnap.exists) return null;
  const data = docSnap.data();

  let owner = null;
  if (data.ownerId) {
    const ownerDoc = await db.collection('users').doc(data.ownerId).get();
    if (ownerDoc.exists) owner = { id: ownerDoc.id, ...ownerDoc.data() };
  }

  return { id: docSnap.id, ...data, owner };
};

const findManyByOwner = async (ownerId, transaction = null) => {
  if (!ownerId) return [];
  const query = db.collection(COLLECTION).where('ownerId', '==', ownerId);
  const snapshot = transaction ? await transaction.get(query) : await query.get();

  const vehicles = [];
  snapshot.forEach(doc => {
    vehicles.push({ id: doc.id, ...doc.data() });
  });
  return vehicles;
};

const findAll = async (transaction = null) => {
  const query = db.collection(COLLECTION).orderBy('createdAt', 'desc');
  const snapshot = transaction ? await transaction.get(query) : await query.get();

  const vehicles = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    let owner = null;
    if (data.ownerId) {
      const ownerDoc = await db.collection('users').doc(data.ownerId).get();
      if (ownerDoc.exists) owner = { id: ownerDoc.id, ...ownerDoc.data() };
    }
    vehicles.push({ id: doc.id, ...data, owner });
  }
  return vehicles;
};

const create = async ({ licensePlate, make, model, year, color, fuelType, vehicleType, vin, mileage, fuelLevel, ownerId }, transaction = null) => {
  const id = uuidv4();
  const plate = String(licensePlate).toUpperCase().trim();
  const now = new Date().toISOString();

  const vehicleData = {
    licensePlate: plate,
    make: make || 'Generic',
    model: model || 'Sedan',
    year: year ? parseInt(year, 10) : 2023,
    color: color || null,
    fuelType: fuelType || 'Petrol',
    vehicleType: vehicleType || '4-Wheeler',
    vin: vin || null,
    mileage: mileage ? parseInt(mileage, 10) : 0,
    fuelLevel: fuelLevel || '1/2',
    ownerId,
    createdAt: now,
    updatedAt: now
  };

  const docRef = db.collection(COLLECTION).doc(id);
  if (transaction) {
    transaction.set(docRef, vehicleData);
  } else {
    await docRef.set(vehicleData);
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

const deleteVehicle = async (id, transaction = null) => {
  if (!id) return null;
  const docRef = db.collection(COLLECTION).doc(id);
  if (transaction) {
    transaction.delete(docRef);
  } else {
    await docRef.delete();
  }
  return { id, deleted: true };
};

module.exports = {
  findByLicensePlate,
  findById,
  findManyByOwner,
  findAll,
  create,
  update,
  deleteVehicle
};
