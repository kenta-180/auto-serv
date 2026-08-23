import React, { useState, useEffect } from 'react';
import { 
  Wrench, CheckCircle2, Package, RefreshCw, Camera, AlertCircle, Eye, ArrowRight, Play, CheckCircle, Clock, Calendar, ShieldCheck, UserCheck, LogOut, LogIn, FileText, X
} from 'lucide-react';
import { api } from '../../services/api';
import VehicleSpecsModal from '../common/VehicleSpecsModal';
import { useLanguage } from '../../context/LanguageContext';

export default function TechnicianDashboard({ 
  currentUser, 
  jobCards = [], 
  inventory = [], 
  onSelectJobCard, 
  onNavigateTab,
  onRefresh 
}) {
  const { t, getStatusLabel } = useLanguage();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  // Specs Cheat-Sheet state
  const [showSpecsModal, setShowSpecsModal] = useState(false);

  // Live Repair Stopwatch state
  const [activeTimerCardId, setActiveTimerCardId] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(sec => sec + 1);
      }, 1000);
    } else if (!isTimerRunning && timerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const formatStopwatch = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Attendance state
  const [todayAttendance, setTodayAttendance] = useState({ clockedIn: false, clockedOut: false, record: null, hoursWorked: 0 });
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState({ records: [], jobsWorkedOn: [], summary: {} });
  const [loadingHistory, setLoadingHistory] = useState(false);

  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];

  // Filter job cards assigned to current technician
  const assignedCards = safeJobCards.filter(c => c && c.technicianId === currentUser?.id);
  const activeAssigned = assignedCards.filter(c => c.status !== 'DELIVERED');
  const completedAssigned = assignedCards.filter(c => c.status === 'DELIVERED' || c.status === 'QC_PASSED');

  // Parts drawn count by technician
  const totalPartsDrawn = assignedCards.reduce((sum, c) => 
    sum + (c.parts?.filter(p => p.drawnByUserId === currentUser?.id)?.length || 0), 0);

  // Pre-service inspection media uploaded today
  const imagesSentToday = assignedCards.reduce((sum, c) => 
    sum + (c.media?.length || 0), 0);

  // Prioritized Queue: Order active assigned jobs by URGENT > HIGH > MEDIUM > LOW
  const priorityRank = { URGENT: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
  const prioritizedQueue = [...activeAssigned].sort((a, b) => {
    const rankA = priorityRank[a.priority] || 3;
    const rankB = priorityRank[b.priority] || 3;
    return rankA - rankB;
  });
  const nextUpCard = prioritizedQueue[0];

  const loadTodayAttendance = async () => {
    try {
      const data = await api.getTodayAttendance();
      setTodayAttendance(data);
    } catch (e) {
      console.warn('Failed to load today attendance:', e);
    }
  };

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  const handleClockIn = async () => {
    try {
      setActionLoading(true);
      setActionMsg('');
      const res = await api.clockIn();
      setActionMsg(`✓ ${res.message}`);
      await loadTodayAttendance();
    } catch (err) {
      setActionMsg('⚠️ ' + (err.message || 'Clock-in failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    try {
      setActionLoading(true);
      setActionMsg('');
      const res = await api.clockOut();
      setActionMsg(`✓ ${res.message}`);
      await loadTodayAttendance();
    } catch (err) {
      setActionMsg('⚠️ ' + (err.message || 'Clock-out failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAttendanceHistory = async () => {
    try {
      setShowHistoryModal(true);
      setLoadingHistory(true);
      const data = await api.getAttendanceHistory();
      setAttendanceHistory(data);
    } catch (err) {
      console.error('Failed to load attendance history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleQuickStartJob = async (cardId) => {
    try {
      setActionLoading(true);
      setActionMsg('');
      await api.startJob(cardId);
      setActionMsg('✓ Repair started & WhatsApp stage notification dispatched to customer! (IN_PROGRESS)');
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) {
      setActionMsg('⚠️ Error starting job: ' + (err.message || 'Server error'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickCompleteQC = async (cardId) => {
    try {
      setActionLoading(true);
      setActionMsg('');
      const checklistSummary = {
        brakeTorqueVerified: true,
        fluidLevelsToMax: true,
        roadTestPassed: true,
        diagnosticClear: true
      };
      await api.recordQC(cardId, true, 'Quick Quality Control check verified by technician', checklistSummary);
      setActionMsg('✓ Quality Inspection Passed! Real-time WhatsApp notification sent to customer (QC_PASSED).');
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) {
      setActionMsg('⚠️ Error marking QC: ' + (err.message || 'Server error'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Technician Banner */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ flex: '1 1 280px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: 'rgba(20, 184, 166, 0.15)',
              color: '#0d9488',
              border: '1px solid #0d9488',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase'
            }}>
              <Wrench size={12} style={{ display: 'inline', marginRight: '4px' }} /> Master Technician Workstation
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Welcome back, {currentUser?.name || 'Technician'}!
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Shift clock-in/out, repair initiation, atomic parts requisition, and work logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 300px', justifyContent: 'flex-start' }}>
          <button 
            type="button"
            className="btn btn-secondary btn-touch"
            onClick={() => setShowSpecsModal(true)}
            style={{ flex: '1 1 140px', minHeight: '44px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            ⚡ Specs Cheat-Sheet
          </button>

          <button 
            type="button"
            className="btn btn-secondary btn-touch"
            onClick={handleOpenAttendanceHistory}
            style={{ flex: '1 1 130px', minHeight: '44px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Calendar size={16} /> Attendance Logs
          </button>

          <button 
            type="button"
            className="btn btn-primary btn-touch"
            onClick={() => onNavigateTab('inventory')}
            style={{ flex: '1 1 120px', minHeight: '44px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #0d9488, #0f766e)', border: 'none', fontSize: '13px' }}
          >
            <Package size={16} /> Draw Parts
          </button>
        </div>
      </div>

      {/* Clock-In / Clock-Out Interactive Card */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: '1 1 260px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            minWidth: '48px',
            borderRadius: '12px',
            background: todayAttendance.clockedOut 
              ? 'rgba(148, 163, 184, 0.15)' 
              : (todayAttendance.clockedIn ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)'),
            border: `1px solid ${todayAttendance.clockedOut ? '#64748b' : (todayAttendance.clockedIn ? '#10b981' : '#f59e0b')}`,
            display: 'flex',
            alignItems: 'center',
            justify: 'center'
          }}>
            <Clock size={24} color={todayAttendance.clockedOut ? '#64748b' : (todayAttendance.clockedIn ? '#059669' : '#d97706')} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                DAILY SHIFT ATTENDANCE TRACKER
              </span>
              {todayAttendance.record && (
                <span className={`badge badge-${todayAttendance.record.status?.toLowerCase()}`}>
                  {todayAttendance.record.status}
                </span>
              )}
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: '2px 0' }}>
              {todayAttendance.clockedOut 
                ? `Shift Completed (${todayAttendance.hoursWorked} hrs logged)` 
                : (todayAttendance.clockedIn 
                    ? `Clocked In at ${new Date(todayAttendance.record?.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` 
                    : 'Not Clocked In Yet Today')}
            </h3>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Shift Threshold: <strong>09:00 AM</strong> &bull; Date: {new Date().toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ flex: '1 1 200px', display: 'flex', justifyContent: 'flex-end' }}>
          {!todayAttendance.clockedIn ? (
            <button
              type="button"
              className="btn btn-success btn-touch"
              onClick={handleClockIn}
              disabled={actionLoading}
              style={{ width: '100%', maxWidth: '240px', minHeight: '44px', padding: '12px 20px', fontSize: '14px', gap: '8px', boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)' }}
            >
              <LogIn size={18} /> Clock In For Shift
            </button>
          ) : !todayAttendance.clockedOut ? (
            <button
              type="button"
              className="btn btn-danger btn-touch"
              onClick={handleClockOut}
              disabled={actionLoading}
              style={{ width: '100%', maxWidth: '240px', minHeight: '44px', padding: '12px 20px', fontSize: '14px', gap: '8px', background: '#dc2626', color: '#ffffff', border: 'none' }}
            >
              <LogOut size={18} /> Clock Out (End Shift)
            </button>
          ) : (
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#059669', background: 'rgba(16, 185, 129, 0.15)', padding: '10px 18px', borderRadius: '8px', border: '1px solid #10b981' }}>
              ✓ Shift Logged for Today ({todayAttendance.hoursWorked} hrs)
            </div>
          )}
        </div>
      </div>

      {actionMsg && (
        <div style={{
          background: actionMsg.includes('✓') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
          border: `1px solid ${actionMsg.includes('✓') ? '#10b981' : '#ef4444'}`,
          color: actionMsg.includes('✓') ? '#34d399' : '#f87171',
          padding: '12px 16px',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {actionMsg}
        </div>
      )}

      {/* A3: What's Next? Prioritized Task Queue Banner */}
      {nextUpCard && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid #ef4444',
          borderRadius: '16px',
          padding: '20px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ flex: '1 1 280px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
              ⚡ WHAT'S NEXT? — HIGHEST PRIORITY REPAIR TASK
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: '4px 0 8px 0', wordBreak: 'break-word' }}>
              #{nextUpCard.cardNumber}: {nextUpCard.title || 'Vehicle Maintenance'}
            </h3>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span>Vehicle: <strong style={{ color: 'var(--text-main)' }}>{nextUpCard.vehicle?.make} {nextUpCard.vehicle?.model} ({nextUpCard.vehicle?.licensePlate || 'No Plate'})</strong></span>
              <span className={`badge badge-${nextUpCard.status?.toLowerCase()}`}>{getStatusLabel(nextUpCard.status)}</span>
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid #ef4444' }}>
                ⚡ {nextUpCard.priority}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', flex: '1 1 280px', justifyContent: 'flex-end', alignItems: 'center' }}>
            {/* Live Repair Timer Stopwatch Widget */}
            <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={16} color={isTimerRunning ? '#34d399' : '#94a3b8'} />
                <div style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: '800', color: isTimerRunning ? '#34d399' : '#f87171' }}>
                  {formatStopwatch(timerSeconds)}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  if (!isTimerRunning) {
                    setActiveTimerCardId(nextUpCard.id);
                    setIsTimerRunning(true);
                  } else {
                    setIsTimerRunning(false);
                  }
                }}
                style={{ fontSize: '11px', padding: '2px 8px', height: '28px', minHeight: '28px' }}
              >
                {isTimerRunning ? '⏸️ Pause' : '▶️ Repair Timer'}
              </button>
            </div>

            {nextUpCard.status !== 'IN_PROGRESS' && nextUpCard.status !== 'QC_PASSED' && (
              <button
                type="button"
                className="btn btn-primary btn-touch"
                onClick={() => {
                  handleQuickStartJob(nextUpCard.id);
                  setActiveTimerCardId(nextUpCard.id);
                  setIsTimerRunning(true);
                }}
                disabled={actionLoading}
                style={{ flex: '1 1 120px', minHeight: '44px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#3b82f6' }}
              >
                <Play size={16} /> Start Repair
              </button>
            )}

            {nextUpCard.status === 'IN_PROGRESS' && (
              <button
                type="button"
                className="btn btn-success btn-touch"
                onClick={() => handleQuickCompleteQC(nextUpCard.id)}
                disabled={actionLoading}
                style={{ flex: '1 1 130px', minHeight: '44px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#10b981' }}
              >
                <CheckCircle2 size={16} /> Request QC Pass
              </button>
            )}

            <button
              type="button"
              className="btn btn-primary btn-touch"
              onClick={() => onSelectJobCard(nextUpCard)}
              style={{ flex: '1 1 120px', minHeight: '44px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ef4444' }}
            >
              Open Console &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Technician Dashboard Tiles (5 Tiles - Denser Scale) */}
      <div className="dashboard-stat-grid">
        
        {/* Tile 1: Assigned Workloads */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Assigned Workload</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '5px', borderRadius: '6px', color: '#2563eb' }}>
              <Wrench size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>{activeAssigned.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Active Work Orders</div>
        </div>

        {/* Tile 2: Completed Services */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Completed Services</span>
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '5px', borderRadius: '6px', color: '#059669' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>{completedAssigned.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>QC Passed & Delivered</div>
        </div>

        {/* Tile 3: Parts Requested/Drawn */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Parts Drawn</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '5px', borderRadius: '6px', color: '#d97706' }}>
              <Package size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>{totalPartsDrawn}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Inventory Items Checked Out</div>
        </div>

        {/* Tile 4: Restock Status */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Restock Status</span>
            <div style={{ background: 'rgba(20, 184, 166, 0.15)', padding: '5px', borderRadius: '6px', color: '#0d9488' }}>
              <RefreshCw size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0d9488' }}>Optimal</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Parts Reorder Queue Status</div>
        </div>

        {/* Tile 5: Images Sent Today */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Images Sent Today</span>
            <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '5px', borderRadius: '6px', color: '#7e22ce' }}>
              <Camera size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#7e22ce' }}>{imagesSentToday}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Inspection Media Uploads</div>
        </div>

      </div>

      {/* Active Workload Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', marginBottom: '16px' }}>
          Your Active Assigned Vehicles ({activeAssigned.length})
        </h3>

        {activeAssigned.length > 0 ? (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className="desktop-table-view custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Job Card #</th>
                    <th>Vehicle / Plate</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Fast Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeAssigned.map(card => (
                    <tr key={card.id}>
                      <td style={{ fontWeight: '800', color: '#60a5fa' }}>{card.cardNumber}</td>
                      <td>{card.vehicle?.make} {card.vehicle?.model} ({card.vehicle?.licensePlate})</td>
                      <td>{card.customer?.name}</td>
                      <td><span className={`badge badge-${card.status?.toLowerCase()}`}>{getStatusLabel(card.status)}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {card.status !== 'IN_PROGRESS' && card.status !== 'QC_PASSED' && (
                            <button 
                              className="btn btn-primary btn-sm"
                              onClick={() => handleQuickStartJob(card.id)}
                              disabled={actionLoading}
                              style={{ fontSize: '11px', padding: '4px 8px', background: '#3b82f6' }}
                            >
                              <Play size={12} /> Start
                            </button>
                          )}
                          {card.status === 'IN_PROGRESS' && (
                            <button 
                              className="btn btn-success btn-sm"
                              onClick={() => handleQuickCompleteQC(card.id)}
                              disabled={actionLoading}
                              style={{ fontSize: '11px', padding: '4px 8px' }}
                            >
                              <CheckCircle size={12} /> Complete (QC)
                            </button>
                          )}
                          <button className="btn btn-secondary btn-sm" onClick={() => onSelectJobCard(card)}>
                            <Eye size={14} /> Open Console
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW */}
            <div className="mobile-cards-view" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
              {activeAssigned.map(card => (
                <div 
                  key={card.id} 
                  onClick={() => onSelectJobCard(card)}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#60a5fa', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                        {card.cardNumber}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {card.vehicle?.make} {card.vehicle?.model} <span style={{ fontSize: '11px', color: '#94a3b8' }}>({card.vehicle?.licensePlate})</span>
                      </span>
                    </div>
                    <span className={`badge badge-${card.status?.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
                      {getStatusLabel(card.status)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#cbd5e1' }}>
                    <span>👤 {card.customer?.name}</span>
                    <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '11px' }}>
                      Priority: {card.priority || 'MEDIUM'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid #334155', paddingTop: '8px' }}>
                    {card.status !== 'IN_PROGRESS' && card.status !== 'QC_PASSED' && (
                      <button 
                        className="btn btn-primary btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleQuickStartJob(card.id); }}
                        disabled={actionLoading}
                        style={{ flex: '1', minHeight: '34px', justifyContent: 'center', fontSize: '12px', background: '#3b82f6' }}
                      >
                        <Play size={12} /> Start
                      </button>
                    )}
                    {card.status === 'IN_PROGRESS' && (
                      <button 
                        className="btn btn-success btn-sm"
                        onClick={(e) => { e.stopPropagation(); handleQuickCompleteQC(card.id); }}
                        disabled={actionLoading}
                        style={{ flex: '1', minHeight: '34px', justifyContent: 'center', fontSize: '12px' }}
                      >
                        <CheckCircle size={12} /> Complete (QC)
                      </button>
                    )}
                    <button 
                      className="btn btn-secondary btn-sm" 
                      onClick={(e) => { e.stopPropagation(); onSelectJobCard(card); }}
                      style={{ flex: '1', minHeight: '34px', justifyContent: 'center', fontSize: '12px' }}
                    >
                      <Eye size={14} /> Open Console
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
            No active job cards currently assigned to you.
          </div>
        )}
      </div>

      {/* Technician Attendance & Work History Modal */}
      {showHistoryModal && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '850px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(20, 184, 166, 0.15)', padding: '10px', borderRadius: '12px', color: '#2dd4bf' }}>
                  <Calendar size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', margin: 0 }}>
                    My Shift Attendance & Work History
                  </h3>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                    Official time tracking logs and vehicle job cards serviced.
                  </p>
                </div>
              </div>
              <button onClick={() => setShowHistoryModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {loadingHistory ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                Loading attendance history...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Summary KPI Pills */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
                  <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL SHIFTS</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#2563eb' }}>{attendanceHistory.summary?.totalShifts || 0} Days</div>
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>TOTAL HOURS WORKED</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#059669' }}>{attendanceHistory.summary?.totalHours || 0} hrs</div>
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>PUNCTUAL / PRESENT</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#0d9488' }}>{attendanceHistory.summary?.presentCount || 0}</div>
                  </div>
                  <div style={{ background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>LATE CLOCK-INS</div>
                    <div style={{ fontSize: '20px', fontWeight: '800', color: '#d97706' }}>{attendanceHistory.summary?.lateCount || 0}</div>
                  </div>
                </div>

                {/* Attendance Logs Table */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
                    Shift Attendance Logs
                  </h4>
                  {attendanceHistory.records && attendanceHistory.records.length > 0 ? (
                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Clock-In</th>
                            <th>Clock-Out</th>
                            <th>Hours</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceHistory.records.map(r => (
                            <tr key={r.id}>
                              <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                                {new Date(r.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </td>
                              <td style={{ color: '#059669', fontWeight: '600' }}>
                                {new Date(r.clockInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td style={{ color: r.clockOutTime ? '#2563eb' : '#d97706', fontWeight: '600' }}>
                                {r.clockOutTime ? new Date(r.clockOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Open Shift'}
                              </td>
                              <td style={{ fontWeight: '800', color: 'var(--text-main)' }}>{r.hoursWorked} hrs</td>
                              <td>
                                <span className={`badge badge-${r.status?.toLowerCase()}`}>
                                  {getStatusLabel(r.status)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                      No past shift attendance logs found.
                    </div>
                  )}
                </div>

                {/* Job Cards Worked On */}
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '10px' }}>
                    Job Cards Serviced During Period ({attendanceHistory.jobsWorkedOn?.length || 0})
                  </h4>
                  {attendanceHistory.jobsWorkedOn && attendanceHistory.jobsWorkedOn.length > 0 ? (
                    <div className="custom-table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Job Card #</th>
                            <th>Vehicle</th>
                            <th>Customer</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceHistory.jobsWorkedOn.map(j => (
                            <tr key={j.id}>
                              <td style={{ fontWeight: '800', color: '#2563eb' }}>#{j.cardNumber}</td>
                              <td>{j.vehicle?.make} {j.vehicle?.model} ({j.vehicle?.licensePlate})</td>
                              <td>{j.customer?.name}</td>
                              <td><span className={`badge badge-${j.status?.toLowerCase()}`}>{getStatusLabel(j.status)}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', background: 'var(--bg-dark)', borderRadius: '8px' }}>
                      No vehicle job cards recorded for this timeframe.
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {showSpecsModal && (
        <VehicleSpecsModal onClose={() => setShowSpecsModal(false)} />
      )}
    </div>
  );
}
