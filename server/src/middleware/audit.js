const auditRepository = require('../repositories/auditRepository');

/**
 * Log an audit action into the AuditLog table using Oracle DB
 */
const logAudit = async ({ userId, action, entity, entityId, details, inventoryItemId, tx, conn }) => {
  const connection = conn || tx;
  try {
    return await auditRepository.createAuditLog({
      userId: userId || null,
      action,
      entity,
      entityId: entityId ? String(entityId) : null,
      details: typeof details === 'object' ? JSON.stringify(details) : details,
      inventoryItemId: inventoryItemId || null
    }, connection);
  } catch (error) {
    console.error('Failed to log audit event:', error);
  }
};

module.exports = { logAudit };
