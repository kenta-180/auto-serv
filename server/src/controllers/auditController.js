const auditRepository = require('../repositories/auditRepository');

const getAuditLogs = async (req, res) => {
  try {
    const logs = await auditRepository.findAuditLogs(100);
    res.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
};

module.exports = { getAuditLogs };
