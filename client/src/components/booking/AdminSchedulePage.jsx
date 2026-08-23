import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, Car, Users, CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, Plus, UserCheck, ShieldCheck, FileText, ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminSchedulePage({ onOpenCheckInWithBooking }) {
  const { t, formatDate, getStatusLabel } = useLanguage();
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSchedule = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getAdminSchedule(selectedDate);
      setSchedule(data);
    } catch (err) {
      console.error('Error loading admin schedule:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  const handleUpdateStatus = async (bookingId, newStatus) => {
    try {
      await api.markBookingStatus(bookingId, newStatus);
      loadSchedule();
    } catch (err) {
      alert(err.message || 'Failed to update status');
    }
  };

  const totalBookedToday = schedule.reduce((sum, s) => sum + (s.bookedCount || 0), 0);
  const totalCapacityToday = schedule.reduce((sum, s) => sum + (s.capacity || 5), 0);

  return (
    <div style={{ padding: '24px 16px', maxWidth: '1100px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Workshop Master Schedule & Booking Log
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Real-time day view breakdown of 2-hour slots, capacity metrics, and 1-click check-in.
          </p>
        </div>

        {/* Date Selector & Refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} style={{ color: '#2563eb' }} />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-main)',
                fontSize: '14px',
                fontWeight: '700',
                outline: 'none'
              }}
            />
          </div>

          <button
            className="btn btn-secondary"
            style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={loadSchedule}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
      </div>

      {/* Overview Metric Banner */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
            Scheduled Date
          </span>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
            {selectedDate}
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
            Total Reserved Vehicles
          </span>
          <div style={{ fontSize: '22px', fontWeight: '900', color: '#059669' }}>
            {totalBookedToday} <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '500' }}>/ {totalCapacityToday} Cap</span>
          </div>
        </div>

        <div>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
            Occupancy Rate
          </span>
          <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)' }}>
            {totalCapacityToday > 0 ? ((totalBookedToday / totalCapacityToday) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Schedule Timeline Slots */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} className="animate-spin" style={{ color: '#2563eb', marginBottom: '12px' }} />
          <div>Loading day schedule...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {schedule.map(slot => (
            <div
              key={slot.id}
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '20px'
              }}
            >
              {/* Slot Header */}
              <div style={{
                display: 'flex',
                justify: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={20} style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>
                    {slot.timeDisplay}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: slot.isFull ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: slot.isFull ? '#dc2626' : '#059669'
                  }}>
                    {slot.bookedCount} / {slot.capacity} Reserved
                  </span>
                </div>
              </div>

              {/* Slot Bookings */}
              {(slot.bookings || []).length === 0 ? (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 0' }}>
                  No bookings scheduled for this time slot.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '14px' }}>
                  {(slot.bookings || []).map(b => (
                    <div
                      key={b.id}
                      style={{
                        background: 'var(--bg-dark)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        justify: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)' }}>
                            {b.customer?.name || 'Customer'}
                          </span>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: b.status === 'BOOKED' ? 'rgba(59, 130, 246, 0.15)' : b.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: b.status === 'BOOKED' ? '#2563eb' : b.status === 'COMPLETED' ? '#059669' : '#dc2626'
                          }}>
                            {b.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: '#2563eb', fontWeight: '700', marginBottom: '4px' }}>
                          {(b.vehicleType === '2-Wheeler' || b.vehicle?.vehicleType === '2-Wheeler') ? '🛵' : '🚗'} {b.make || b.vehicle?.make} {b.model || b.vehicle?.model} ({b.licensePlate || b.vehicle?.licensePlate || 'N/A'})
                        </div>

                        {/* Customer-Reported Vehicle Details Badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', color: '#2563eb', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                            {(b.vehicleType || b.vehicle?.vehicleType) === '2-Wheeler' ? '🛵 2-Wheeler' : '🚗 4-Wheeler'}
                          </span>
                          {(b.year || b.vehicle?.year) && (
                            <span style={{ fontSize: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                              Year: {b.year || b.vehicle?.year}
                            </span>
                          )}
                          {(b.fuelType || b.vehicle?.fuelType) && (
                            <span style={{ fontSize: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: '#0284c7', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                              ⛽ {b.fuelType || b.vehicle?.fuelType}
                            </span>
                          )}
                          {(b.color || b.vehicle?.color) && (
                            <span style={{ fontSize: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                              🎨 {b.color || b.vehicle?.color}
                            </span>
                          )}
                          {(b.approxMileage || b.vehicle?.mileage) && (
                            <span style={{ fontSize: '10px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: '#059669', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                              📍 ~{b.approxMileage || b.vehicle?.mileage} km
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                          📞 {b.customer?.phone || 'No phone'}
                        </div>

                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '6px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                          <strong style={{ color: 'var(--text-main)' }}>{b.serviceType}</strong>
                          {b.reportedIssue ? <div style={{ color: '#d97706', marginTop: '2px' }}>📝 "{b.reportedIssue}"</div> : null}
                        </div>
                      </div>

                      {/* Admin Controls & Check-In Trigger */}
                      <div style={{
                        marginTop: '14px',
                        paddingTop: '10px',
                        borderTop: '1px dashed #334155',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          style={{
                            fontSize: '12px',
                            fontWeight: '700',
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                          onClick={() => onOpenCheckInWithBooking && onOpenCheckInWithBooking(b)}
                        >
                          <Plus size={14} /> Step 1 Check-In
                        </button>

                        <div style={{ display: 'flex', gap: '6px' }}>
                          {b.status === 'BOOKED' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px', color: '#ef4444' }}
                              onClick={() => handleUpdateStatus(b.id, 'NO_SHOW')}
                            >
                              No-Show
                            </button>
                          )}

                          {b.status === 'BOOKED' && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: '11px', padding: '4px 8px', color: '#34d399' }}
                              onClick={() => handleUpdateStatus(b.id, 'COMPLETED')}
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
