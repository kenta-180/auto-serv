const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const COLLECTION = 'cannedNoteTemplates';

const getCannedNotes = async (req, res) => {
  try {
    const snap = await db.collection(COLLECTION).get();
    const templates = [];
    snap.forEach(doc => templates.push({ id: doc.id, ...doc.data() }));
    templates.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    res.json(templates);
  } catch (err) {
    console.error('Error fetching canned note templates:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch canned note templates' });
  }
};

const createCannedNote = async (req, res) => {
  try {
    const { category, text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Canned note text is required' });
    }

    const id = uuidv4();
    const now = new Date().toISOString();
    const templateData = {
      category: category || 'General',
      text: text.trim(),
      createdAt: now,
      updatedAt: now
    };

    await db.collection(COLLECTION).doc(id).set(templateData);

    res.status(201).json({ message: 'Canned note template created', template: { id, ...templateData } });
  } catch (err) {
    console.error('Error creating canned note template:', err);
    res.status(500).json({ error: err.message || 'Failed to create canned note template' });
  }
};

const deleteCannedNote = async (req, res) => {
  try {
    const { id } = req.params;
    await db.collection(COLLECTION).doc(id).delete();
    res.json({ message: 'Canned note template deleted' });
  } catch (err) {
    console.error('Error deleting canned note template:', err);
    res.status(500).json({ error: err.message || 'Failed to delete canned note template' });
  }
};

module.exports = {
  getCannedNotes,
  createCannedNote,
  deleteCannedNote
};
