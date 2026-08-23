import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Shield, Search, Filter, Edit3, Check, X, User, AlertCircle
} from 'lucide-react';
import { api } from '../../services/api';

export default function AdminAttendanceModal({ technicians = [], onClose, onRefresh }) {
  const [records, setRecords] = useState([]);
  const [jobsWorkedOn, setJobsWorkedOn] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedTechId, setSelectedTechId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Correction Modal State
  const [editingRecord, setEditingRecord] = useState(null);
  const [editStatus, setEditStatus] = useState('PRESENT');
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReason, setEditReason] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedTechId) params.technicianId = selectedTechId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await api.getAttendanceHistory(params);
      setRecords(data.records || []);
      setJobsWorkedOn(data.jobsWorkedOn || []);
      setSummary(data.summary || {});
    } catch (err) {
      setError(err.message || 'Failed to fetch technician attendance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [selectedTechId, startDate, endDate]);

  const handleOpenEdit = (rec) => {
    setEditingRecord(rec);
    setEditStatus(rec.status || 'PRESENT');
    setEditClockIn(rec.clockInTime ? new Date(rec.clockInTime).toISOString().slice(0, 16) : '');
    setEditClockOut(rec.clockOutTime ? new Date(rec.clockOutTime).toISOString().slice(0, 16) : '');
    setEditNotes(rec.notes || '');
    setEditReason('');
  };

  const handleSaveCorrection = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!editReason.trim()) {
      setError('Audit trail requirement: Please enter a reason for this manual correction.');
      return;
    }

    try {
      setSavingEdit(true);
      setError('');
      setSuccessMsg('');

      await api.adminUpdateAttendance({
        id: editingRecord?.id,
        technicianId: editingRecord?.technicianId,
        clockInTime: editClockIn ? new Date(editClockIn).toISOString() : undefined,
        clockOutTime: editClockOut ? new Date(editClockOut).toISOString() : undefined,
        status: editStatus,
        notes: editNotes,
        reason: editReason
      });

      setSuccessMsg('✓ Attendance record corrected and logged to audit trail!');
      setEditingRecord(null);
      fetchAttendance();
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to save attendance correction');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '950px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: 0 }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '10px', borderRadius: '12px', color: '#2563eb', flexShrink: 0 }}>
              <Calendar size={22} color="#2563eb" />
            </div>
            <div style={{ flex: '1', minWidth: 0 }}>
              <h3 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-main)', margin: 0, lineHeight: '1.2' }}>
                Technician Attendance & Shift Oversight
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '3px 0 0 0', lineHeight: '1.3' }}>
                Master workshop shift logs, clock-in/out records, and audit corrections.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0, padding: '4px' }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#dc2626', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        {successMsg && (
          <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#059669', borderRadius: '8px', marginBottom: '14px', fontSize: '13px' }}>
            {successMsg}
          </div>
        )}

        {/* Filter Controls Bar */}
        <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          
          <div style={{ flex: 1, minWidth: '180px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Filter Technician</label>
            <select className="form-control" value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)}>
              <option value="">-- All Workshop Technicians --</option>
              {technicians.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Start Date</label>
            <input type="date" className="form-control" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>

          <div style={{ flex: 1, minWidth: '140px' }}>
            <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>End Date</label>
            <input type="date" className="form-control" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>

          {(selectedTechId || startDate || endDate) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => { setSelectedTechId(''); setStartDate(''); setEndDate(''); }}
              style={{ marginTop: '18px' }}
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* KPI Analytics Summary (4 Tiles matching Dashboard Reference) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Shifts</span>
              <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '6px', borderRadius: '8px', color: '#2563eb' }}>
                <Calendar size={18} color="#2563eb" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#2563eb' }}>{summary.totalShifts || 0}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Registered Days Logged</div>
          </div>

          <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Hours Logged</span>
              <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '6px', borderRadius: '8px', color: '#059669' }}>
                <Clock size={18} color="#059669" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#059669' }}>{summary.totalHours || 0} hrs</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Total Technician Duration</div>
          </div>

          <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Punctual Present</span>
              <div style={{ background: 'rgba(20, 184, 166, 0.15)', padding: '6px', borderRadius: '8px', color: '#0d9488' }}>
                <Shield size={18} color="#0d9488" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#0d9488' }}>{summary.presentCount || 0}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>On-Time Shift Arrivals</div>
          </div>

          <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Late Clock-Ins</span>
              <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '6px', borderRadius: '8px', color: '#d97706' }}>
                <AlertCircle size={18} color="#d97706" />
              </div>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#d97706' }}>{summary.lateCount || 0}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Shift Arrival Exceptions</div>
          </div>
        </div>

        {/* Master Attendance Table */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Loading attendance records...
          </div>
        ) : (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Shift Date</th>
                  <th>Clock-In</th>
                  <th>Clock-Out</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Admin Correction</th>
                </tr>
              </thead>
              <tbody>
                {records.length > 0 ? (
                  records.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: '700', color: '#f8fafc' }}>
                        {r.technician?.name || 'Technician'}
                        {r.editedByAdmin && (
                          <span style={{ fontSize: '10px', color: '#c084fc', marginLeft: '6px' }} title="Edited by Administrator">
                            ✏️ Modified
                          </span>
                        )}
                      </td>
                      <td>{new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                      <td style={{ color: '#34d399' }}>
                        {new Date(r.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ color: r.clockOutTime ? '#60a5fa' : '#fbbf24' }}>
                        {r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open Shift'}
                      </td>
                      <td style={{ fontWeight: '800', color: '#f8fafc' }}>{r.hoursWorked} hrs</td>
                      <td>
                        <span className={`badge badge-${r.status?.toLowerCase()}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEdit(r)}
                          style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                        >
                          <Edit3 size={12} /> Correct
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#94a3b8' }}>
                      No attendance records found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Correction Modal Sub-Overlay */}
        {editingRecord && (
          <div className="modal-overlay" style={{ zIndex: 300 }}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 }}>
                  ✏️ Admin Attendance Correction
                </h4>
                <button onClick={() => setEditingRecord(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveCorrection}>
                <div style={{ background: '#0f172a', padding: '10px 12px', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', border: '1px solid #334155' }}>
                  Technician: <strong>{editingRecord.technician?.name}</strong> &bull; Date: {new Date(editingRecord.date).toLocaleDateString()}
                </div>

                <div className="form-group">
                  <label>Attendance Status</label>
                  <select className="form-control" value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                    <option value="PRESENT">PRESENT</option>
                    <option value="LATE">LATE</option>
                    <option value="ABSENT">ABSENT</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Clock-In Timestamp</label>
                  <input type="datetime-local" className="form-control" value={editClockIn} onChange={e => setEditClockIn(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Clock-Out Timestamp</label>
                  <input type="datetime-local" className="form-control" value={editClockOut} onChange={e => setEditClockOut(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Audit Trail Reason * (Mandatory for Admin Corrections)</label>
                  <textarea
                    className="form-control"
                    rows="2"
                    placeholder="e.g. Technician forgot to clock out at 05:00 PM; verified via shop log..."
                    value={editReason}
                    onChange={e => setEditReason(e.target.value)}
                    required
                  ></textarea>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setEditingRecord(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                    <Check size={14} /> Save Audit Correction
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
