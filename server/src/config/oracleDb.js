let oracledb = null;
try {
  oracledb = require('oracledb');
  oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
  oracledb.autoCommit = false;
} catch (e) {
  console.log('[Oracle DB Notice]: Native Oracle client library not loaded. Falling back to Supabase PostgreSQL.');
}

const dotenv = require('dotenv');
dotenv.config();

let pool = null;
let isOracleDisabled = !oracledb;

/**
 * Initialize Oracle connection pool
 */
async function initOraclePool() {
  if (!oracledb) {
    isOracleDisabled = true;
    return null;
  }
  if (pool) return pool;
  if (isOracleDisabled) throw new Error('Oracle Database is offline');

  const dbConfig = {
    user: process.env.ORACLE_USER || 'system',
    password: process.env.ORACLE_PASSWORD || 'oracle123',
    connectString: process.env.ORACLE_CONNECT_STRING || 'localhost:1521/XEPDB1',
    poolMin: 0,
    poolMax: 10,
    poolIncrement: 1,
    connectTimeout: 2
  };

  try {
    pool = await oracledb.createPool(dbConfig);
    // Instant health probe: test acquiring connection & simple query
    const testConn = await pool.getConnection();
    await testConn.execute('SELECT 1 FROM DUAL');
    await testConn.close();
    console.log('Oracle Database connection pool created & verified successfully');
    return pool;
  } catch (err) {
    if (pool) {
      await pool.close().catch(() => {});
      pool = null;
    }
    isOracleDisabled = true;
    console.warn('[Oracle DB Notice]: Oracle DB offline/unreachable. Fast fallback to Prisma PostgreSQL active.');
    throw err;
  }
}

/**
 * Get connection from pool
 */
async function getConnection() {
  if (isOracleDisabled) {
    throw new Error('Oracle Database is offline');
  }
  if (!pool) {
    try {
      await initOraclePool();
    } catch (err) {
      throw new Error('Oracle Database is offline');
    }
  }
  if (pool) {
    try {
      return await pool.getConnection();
    } catch (err) {
      isOracleDisabled = true;
      throw new Error('Oracle Database is offline');
    }
  }
  throw new Error('Oracle Database connection pool is not initialized');
}

/**
 * Helper to run a query with autoCommit or within an existing transaction connection
 */
async function query(sql, binds = {}, options = {}, externalConn = null) {
  const conn = externalConn || await getConnection();
  const execOptions = { autoCommit: !externalConn, outFormat: oracledb.OUT_FORMAT_OBJECT, ...options };
  
  try {
    const result = await conn.execute(sql, binds, execOptions);
    return result.rows || [];
  } finally {
    if (!externalConn) {
      await conn.close().catch(() => {});
    }
  }
}

/**
 * Atomic transaction wrapper for multi-step database operations
 * Guarantees COMMIT on success, ROLLBACK on error.
 */
async function executeTransaction(callback) {
  let conn = null;
  try {
    conn = await getConnection();
  } catch (e) {
    // Oracle connection unavailable — fallback to SQLite / Prisma seamlessly
    return await callback(null);
  }

  try {
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    if (conn) {
      await conn.close().catch(() => {});
    }
  }
}

module.exports = {
  oracledb,
  initOraclePool,
  getConnection,
  query,
  executeTransaction
};
