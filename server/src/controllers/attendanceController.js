const attendanceRepository = require('../repositories/attendanceRepository');
const jobCardRepository = require('../repositories/jobCardRepository');
const { logAudit } = require('../middleware/audit');

const SHIFT_START_HOUR = 9;
const SHIFT_START_MINUTE = 0;

function calculateHours(clockIn, clockOut) {
  if (!clockIn) return 0;
  const start = new Date(clockIn).getTime();
  const end = clockOut ? new Date(clockOut).getTime() : new Date().getTime();
  const diffMs = end - start;
  return Math.max(0, parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2)));
}

const clockIn = async (req, res) => {
  try {
    const technicianId = req.user.id;

    const existing = await attendanceRepository.findTodayByTechnician(technicianId);
    if (existing && existing.clockInTime) {
      return res.status(400).json({ 
        error: 'Duplicate clock-in rejected: You have already clocked in for today!',
        record: existing
      });
    }

    const now = new Date();
    const shiftStart = new Date();
    shiftStart.setHours(SHIFT_START_HOUR, SHIFT_START_MINUTE, 0, 0);

    const status = now > shiftStart ? 'LATE' : 'PRESENT';
    const notes = status === 'LATE' ? `Clocked in after shift start threshold (${SHIFT_START_HOUR}:00 AM)` : 'On time shift clock-in';

    const record = await attendanceRepository.create({
      technicianId,
      status,
      notes,
      clockInTime: now.toISOString()
    });

    await logAudit({
      userId: technicianId,
      action: 'CLOCK_IN',
      entity: 'AttendanceRecord',
      entityId: record.id,
      details: `Technician ${req.user.name} clocked in at ${now.toLocaleTimeString()} (Status: ${status})`
    });

    res.status(201).json({
      message: `Clocked in successfully as ${status}`,
      record
    });
  } catch (err) {
    console.error('[AttendanceController] clockIn Error:', err);
    res.status(500).json({ error: err.message || 'Failed to clock in' });
  }
};

const clockOut = async (req, res) => {
  try {
    const technicianId = req.user.id;

    const existing = await attendanceRepository.findTodayByTechnician(technicianId);
    if (!existing) {
      return res.status(400).json({ error: 'No active clock-in record found for today.' });
    }
    if (existing.clockOutTime) {
      return res.status(400).json({ 
        error: 'You have already clocked out for today!',
        record: existing 
      });
    }

    const now = new Date().toISOString();
    const updated = await attendanceRepository.update(existing.id, { clockOutTime: now });
    const hoursWorked = calculateHours(existing.clockInTime, updated.clockOutTime);

    await logAudit({
      userId: technicianId,
      action: 'CLOCK_OUT',
      entity: 'AttendanceRecord',
      entityId: existing.id,
      details: `Technician ${req.user.name} clocked out. Hours worked: ${hoursWorked} hrs`
    }).catch(err => console.error('[AttendanceController] Audit log error on clockOut:', err));

    res.json({
      message: `Clocked out successfully. Total shift duration: ${hoursWorked} hours.`,
      record: updated,
      hoursWorked
    });
  } catch (err) {
    console.error('[AttendanceController] clockOut Error:', err);
    res.status(500).json({ error: err.message || 'Failed to clock out' });
  }
};

const getTodayStatus = async (req, res) => {
  try {
    const technicianId = req.user.id;
    const record = await attendanceRepository.findTodayByTechnician(technicianId);
    
    const clockedIn = Boolean(record && record.clockInTime);
    const clockedOut = Boolean(record && record.clockOutTime);
    const hoursWorked = record ? calculateHours(record.clockInTime, record.clockOutTime) : 0;

    res.json({
      clockedIn,
      clockedOut,
      record: record || null,
      hoursWorked
    });
  } catch (err) {
    console.error('[AttendanceController] getTodayStatus Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch today status' });
  }
};

const getAttendanceHistory = async (req, res) => {
  try {
    const { technicianId, startDate, endDate } = req.query;
    
    let targetTechId = req.user.role === 'TECHNICIAN' ? req.user.id : technicianId;

    const { records, summary } = await attendanceRepository.findHistory({
      technicianId: targetTechId,
      startDate,
      endDate
    });

    let jobsWorkedOn = [];
    if (targetTechId) {
      jobsWorkedOn = await jobCardRepository.findMany({ technicianId: targetTechId });
    }

    const enrichedRecords = records.map(r => ({
      ...r,
      hoursWorked: calculateHours(r.clockInTime, r.clockOutTime)
    }));

    res.json({
      records: enrichedRecords,
      jobsWorkedOn,
      summary
    });
  } catch (err) {
    console.error('[AttendanceController] getAttendanceHistory Error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch attendance history' });
  }
};

const adminUpdateAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied: Admin permissions required for attendance correction.' });
    }

    const { id, clockInTime, clockOutTime, status, notes, reason, technicianId, date } = req.body;

    let updated;
    if (id) {
      updated = await attendanceRepository.update(id, { clockInTime, clockOutTime, status, notes, editedByAdmin: true });

      await logAudit({
        userId: req.user.id,
        action: 'ATTENDANCE_CORRECTED_BY_ADMIN',
        entity: 'AttendanceRecord',
        entityId: id,
        details: `Admin ${req.user.name} modified attendance for technician ${updated.technicianId}. Reason: ${reason || 'Manual correction'}. New status: ${updated.status}`
      }).catch(err => console.error('[AttendanceController] Audit error:', err));
    } else {
      updated = await attendanceRepository.create({
        technicianId,
        date,
        clockInTime,
        clockOutTime,
        status,
        notes,
        editedByAdmin: true
      });

      await logAudit({
        userId: req.user.id,
        action: 'ATTENDANCE_CREATED_BY_ADMIN',
        entity: 'AttendanceRecord',
        entityId: updated.id,
        details: `Admin ${req.user.name} created manual attendance entry for technician ${updated.technicianId}. Status: ${updated.status}`
      }).catch(err => console.error('[AttendanceController] Audit error:', err));
    }

    res.json({
      message: 'Attendance record updated successfully',
      record: updated
    });
  } catch (err) {
    console.error('[AttendanceController] adminUpdateAttendance Error:', err);
    res.status(500).json({ error: err.message || 'Failed to update attendance' });
  }
};

module.exports = {
  clockIn,
  clockOut,
  getTodayStatus,
  getAttendanceHistory,
  adminUpdateAttendance
};
