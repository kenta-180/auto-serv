const { db } = require('./firestore');

// Re-export Firestore db instance to maintain backward compatibility with legacy prisma requires
module.exports = db;

