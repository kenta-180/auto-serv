const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

let isInitialized = false;
let liveDb = null;
let useFallback = false;

function initFirebaseApp() {
  if (isInitialized) return;

  try {
    let credential;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT_JSON === 'string'
        ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)
        : process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
      credential = cert(serviceAccount);
    } else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      credential = cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      });
    }

    if (credential || process.env.FIRESTORE_EMULATOR_HOST) {
      if (getApps().length === 0) {
        initializeApp(credential ? { credential } : { projectId: process.env.FIREBASE_PROJECT_ID || 'auto-serv-firestore' });
      }
      liveDb = getFirestore();
      try { liveDb.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
      console.log('[Cloud Firestore] Connected via Firebase Admin SDK.');
    } else {
      useFallback = true;
      console.log('[Cloud Firestore] Operating with local embedded Firestore document store (Set FIREBASE_SERVICE_ACCOUNT_JSON or FIRESTORE_EMULATOR_HOST for cloud connection).');
    }
  } catch (err) {
    useFallback = true;
    console.warn('[Cloud Firestore Notice] Initializing local embedded document store:', err.message);
  }

  isInitialized = true;
}

initFirebaseApp();

// Embedded Firestore Document Store for seamless local operation
const store = new Map();

class InMemoryDocRef {
  constructor(colName, docId) {
    this.colName = colName;
    this.id = docId;
    this.path = `${colName}/${docId}`;
  }

  async get() {
    const col = store.get(this.colName);
    const data = col ? col.get(this.id) : null;
    return {
      exists: Boolean(data),
      id: this.id,
      data: () => (data ? JSON.parse(JSON.stringify(data)) : undefined),
      ref: this
    };
  }

  async set(data, options = {}) {
    if (!store.has(this.colName)) {
      store.set(this.colName, new Map());
    }
    const col = store.get(this.colName);
    const existing = col.get(this.id) || {};
    const newData = options.merge ? { ...existing, ...data } : { ...data };
    col.set(this.id, JSON.parse(JSON.stringify(newData)));
    return { id: this.id };
  }

  async update(data) {
    if (!store.has(this.colName)) {
      store.set(this.colName, new Map());
    }
    const col = store.get(this.colName);
    const existing = col.get(this.id) || {};
    const newData = { ...existing, ...data };
    col.set(this.id, JSON.parse(JSON.stringify(newData)));
    return { id: this.id };
  }

  async delete() {
    const col = store.get(this.colName);
    if (col) col.delete(this.id);
    return { id: this.id };
  }
}

class InMemoryQuery {
  constructor(colName, filters = [], orderByField = null, orderDir = 'asc', limitVal = null) {
    this.colName = colName;
    this.filters = filters;
    this.orderByField = orderByField;
    this.orderDir = orderDir;
    this.limitVal = limitVal;
  }

  where(field, op, val) {
    return new InMemoryQuery(
      this.colName,
      [...this.filters, { field, op, val }],
      this.orderByField,
      this.orderDir,
      this.limitVal
    );
  }

  orderBy(field, dir = 'asc') {
    return new InMemoryQuery(this.colName, this.filters, field, dir, this.limitVal);
  }

  limit(n) {
    return new InMemoryQuery(this.colName, this.filters, this.orderByField, this.orderDir, n);
  }

  async get() {
    const col = store.get(this.colName) || new Map();
    let docs = [];

    col.forEach((data, id) => {
      let matches = true;
      for (const f of this.filters) {
        const itemVal = data[f.field];
        if (f.op === '==') {
          if (itemVal !== f.val) matches = false;
        } else if (f.op === '!=') {
          if (itemVal === f.val) matches = false;
        } else if (f.op === '>=') {
          if (itemVal < f.val) matches = false;
        } else if (f.op === '<=') {
          if (itemVal > f.val) matches = false;
        } else if (f.op === '>') {
          if (itemVal <= f.val) matches = false;
        } else if (f.op === '<') {
          if (itemVal >= f.val) matches = false;
        } else if (f.op === 'array-contains') {
          if (!Array.isArray(itemVal) || !itemVal.includes(f.val)) matches = false;
        }
      }
      if (matches) {
        docs.push({
          id,
          data: () => JSON.parse(JSON.stringify(data)),
          ref: new InMemoryDocRef(this.colName, id)
        });
      }
    });

    if (this.orderByField) {
      const f = this.orderByField;
      const mult = this.orderDir === 'desc' ? -1 : 1;
      docs.sort((a, b) => {
        const valA = a.data()[f] || '';
        const valB = b.data()[f] || '';
        return String(valA).localeCompare(String(valB)) * mult;
      });
    }

    if (this.limitVal && this.limitVal > 0) {
      docs = docs.slice(0, this.limitVal);
    }

    return {
      empty: docs.length === 0,
      size: docs.length,
      docs,
      forEach: (cb) => docs.forEach(cb)
    };
  }

  doc(docId) {
    return new InMemoryDocRef(this.colName, docId);
  }
}

const fallbackDb = {
  collection: (colName) => new InMemoryQuery(colName),
  doc: (pathStr) => {
    const parts = pathStr.split('/');
    if (parts.length === 2) {
      return new InMemoryDocRef(parts[0], parts[1]);
    }
    return new InMemoryDocRef('default', pathStr);
  },
  runTransaction: async (updateFunction) => {
    const transaction = {
      get: async (refOrQuery) => {
        return refOrQuery.get();
      },
      set: (docRef, data, options) => {
        docRef.set(data, options);
      },
      update: (docRef, data) => {
        docRef.update(data);
      },
      delete: (docRef) => {
        docRef.delete();
      }
    };
    return await updateFunction(transaction);
  }
};

// Proxy DB that forwards calls to liveDb if available or fallbackDb
const dbProxy = new Proxy({}, {
  get: (target, prop) => {
    if (liveDb && !useFallback) {
      const val = liveDb[prop];
      return typeof val === 'function' ? val.bind(liveDb) : val;
    }
    const val = fallbackDb[prop];
    return typeof val === 'function' ? val.bind(fallbackDb) : val;
  }
});

module.exports = {
  db: dbProxy,
  FieldValue,
  Timestamp
};
