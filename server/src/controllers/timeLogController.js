const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'jobTimeLogs';

const startTimeLog = async (req, res) => {
  try {
    const { id: jobCardId } = req.params;
    const technicianId = req.user?.id;

    if (!technicianId) {
      return res.status(401).json({ error: 'Unauthorized technician context' });
    }

    // Check if there's already an active open time log for this job card
    const query = db.collection(COLLECTION)
      .where('jobCardId', '==', jobCardId)
      .where('endedAt', '==', null)
      .limit(1);
    const snap = await query.get();

    if (!snap.empty) {
      const activeDoc = snap.docs[0];
      return res.json({ message: 'Active timer already running', timeLog: { id: activeDoc.id, ...activeDoc.data() } });
    }

    const now = new Date().toISOString();
    const logId = uuidv4();
    const logData = {
      jobCardId,
      technicianId,
      startedAt: now,
      endedAt: null,
      durationSeconds: 0,
      createdAt: now,
      updatedAt: now
    };

    await db.collection(COLLECTION).doc(logId).set(logData);

    res.status(201).json({ message: 'Active repair timer started', timeLog: { id: logId, ...logData } });
  } catch (err) {
    console.error('Error starting time log:', err);
    res.status(500).json({ error: err.message || 'Failed to start active time log' });
  }
};

const pauseTimeLog = async (req, res) => {
  try {
    const { id: jobCardId } = req.params;

    const query = db.collection(COLLECTION)
      .where('jobCardId', '==', jobCardId)
      .where('endedAt', '==', null)
      .limit(1);
    const snap = await query.get();

    if (snap.empty) {
      return res.json({ message: 'No active timer to pause' });
    }

    const activeDoc = snap.docs[0];
    const activeLog = activeDoc.data();
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.max(0, Math.floor((new Date(endedAt).getTime() - new Date(activeLog.startedAt).getTime()) / 1000));

    const updateData = {
      endedAt,
      durationSeconds,
      updatedAt: endedAt
    };

    await activeDoc.ref.update(updateData);

    res.json({ message: 'Active repair timer paused', timeLog: { id: activeDoc.id, ...activeLog, ...updateData } });
  } catch (err) {
    console.error('Error pausing time log:', err);
    res.status(500).json({ error: err.message || 'Failed to pause active time log' });
  }
};

const getTimeLogs = async (req, res) => {
  try {
    const { id: jobCardId } = req.params;

    const query = db.collection(COLLECTION).where('jobCardId', '==', jobCardId);
    const snap = await query.get();

    const logs = [];
    for (const doc of snap.docs) {
      const lData = doc.data();
      let technician = null;
      if (lData.technicianId) {
        const uSnap = await db.collection('users').doc(lData.technicianId).get();
        if (uSnap.exists) technician = { id: uSnap.id, ...uSnap.data() };
      }
      logs.push({ id: doc.id, ...lData, technician });
    }

    logs.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    let totalSeconds = 0;
    const now = Date.now();

    logs.forEach(l => {
      if (l.endedAt) {
        totalSeconds += l.durationSeconds || 0;
      } else {
        const elapsed = Math.max(0, Math.floor((now - new Date(l.startedAt).getTime()) / 1000));
        totalSeconds += elapsed;
      }
    });

    res.json({ logs, totalSeconds });
  } catch (err) {
    console.error('Error fetching time logs:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch time logs' });
  }
};

module.exports = {
  startTimeLog,
  pauseTimeLog,
  getTimeLogs
};
