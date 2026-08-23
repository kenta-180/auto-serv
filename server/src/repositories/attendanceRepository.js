const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'attendanceRecords';

const findByTechnicianAndDate = async (technicianId, dateStr, transaction = null) => {
  if (!technicianId || !dateStr) return null;
  const docId = `${technicianId}_${dateStr}`;
  const docRef = db.collection(COLLECTION).doc(docId);
  const docSnap = transaction ? await transaction.get(docRef) : await docRef.get();
  if (!docSnap.exists) return null;
  return { id: docSnap.id, ...docSnap.data() };
};

const findTodayByTechnician = async (technicianId, transaction = null) => {
  const todayStr = new Date().toISOString().split('T')[0];
  return findByTechnicianAndDate(technicianId, todayStr, transaction);
};

const create = async ({ technicianId, date, clockInTime, clockOutTime, status, notes, editedByAdmin }, transaction = null) => {
  const dateStr = date || new Date().toISOString().split('T')[0];
  const docId = `${technicianId}_${dateStr}`;
  const now = new Date().toISOString();

  const recordData = {
    technicianId,
    date: dateStr,
    clockInTime: clockInTime || now,
    clockOutTime: clockOutTime || null,
    status: status || 'PRESENT',
    notes: notes || null,
    editedByAdmin: Boolean(editedByAdmin),
    createdAt: now,
    updatedAt: now
  };

  const docRef = db.collection(COLLECTION).doc(docId);
  if (transaction) {
    transaction.set(docRef, recordData, { merge: true });
  } else {
    await docRef.set(recordData, { merge: true });
  }

  return { id: docId, ...recordData };
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

  const docSnap = transaction ? await transaction.get(docRef) : await docRef.get();
  return { id: docSnap.id, ...docSnap.data() };
};

const findHistory = async (params = {}, transaction = null) => {
  let query = db.collection(COLLECTION);

  if (params.technicianId) {
    query = query.where('technicianId', '==', params.technicianId);
  }

  const snapshot = transaction ? await transaction.get(query) : await query.get();

  let records = [];
  snapshot.forEach(doc => {
    records.push({ id: doc.id, ...doc.data() });
  });

  if (params.startDate) {
    records = records.filter(r => r.date >= params.startDate);
  }
  if (params.endDate) {
    records = records.filter(r => r.date <= params.endDate);
  }

  records.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // Calculate summary metrics
  const summary = {
    totalShifts: records.length,
    totalHours: 0,
    presentCount: 0,
    lateCount: 0,
    absentCount: 0,
    leaveCount: 0
  };

  records.forEach(r => {
    if (r.status === 'PRESENT') summary.presentCount++;
    else if (r.status === 'LATE') summary.lateCount++;
    else if (r.status === 'ABSENT') summary.absentCount++;
    else if (r.status === 'ON_LEAVE') summary.leaveCount++;

    if (r.clockInTime && r.clockOutTime) {
      const diffMs = new Date(r.clockOutTime) - new Date(r.clockInTime);
      if (diffMs > 0) summary.totalHours += (diffMs / (1000 * 60 * 60));
    }
  });

  summary.totalHours = parseFloat(summary.totalHours.toFixed(1));

  return { records, jobsWorkedOn: [], summary };
};

module.exports = {
  findByTechnicianAndDate,
  findTodayByTechnician,
  create,
  update,
  findHistory
};
