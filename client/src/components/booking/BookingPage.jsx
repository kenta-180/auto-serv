import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, Car, CheckCircle2, AlertCircle, RefreshCw, 
  Plus, X, ChevronRight, ShieldCheck, ArrowRight, RotateCcw, AlertTriangle
} from 'lucide-react';
import { api } from '../../services/api';

import LiveStatusTracker from './LiveStatusTracker';

export default function BookingPage({ currentUser }) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [slots, setSlots] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [myVehicles, setMyVehicles] = useState([]);
  const [myJobCards, setMyJobCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingError, setBookingError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [showDailyWarning, setShowDailyWarning] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('book'); // 'book' | 'my-bookings'

  // Auto-dismiss 1-Booking-Per-Day warning after 5 seconds (within 3-7s range)
  useEffect(() => {
    const hasActiveBooking = myBookings.some(b => b.status === 'BOOKED' && b.slot?.date === selectedDate);
    if (hasActiveBooking) {
      setShowDailyWarning(true);
      const timer = setTimeout(() => {
        setShowDailyWarning(false);
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShowDailyWarning(false);
    }
  }, [selectedDate, myBookings]);

  // Auto-dismiss booking error banner after 5 seconds
  useEffect(() => {
    if (bookingError) {
      const timer = setTimeout(() => {
        setBookingError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [bookingError]);

  // Modal states
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Form states (Customer-Friendly Recallable Info - Blank by default)
  const [selectedVehicleId, setSelectedVehicleId] = useState('NEW');
  const [customVehicleType, setCustomVehicleType] = useState('4-Wheeler'); // '2-Wheeler' | '4-Wheeler'
  const [customMake, setCustomMake] = useState('');
  const [customModel, setCustomModel] = useState('');
  const [customPlate, setCustomPlate] = useState('');
  const [customYear, setCustomYear] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [customFuelType, setCustomFuelType] = useState('');
  const [customMileage, setCustomMileage] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [reportedIssue, setReportedIssue] = useState('');

  // Reschedule state
  const [rescheduleBookingTarget, setRescheduleBookingTarget] = useState(null);

  const loadSlots = useCallback(async () => {
    try {
      setLoading(true);
      const slotData = await api.getSlotsByDate(selectedDate);
      setSlots(slotData);
    } catch (err) {
      console.error('Error loading slots:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const loadCustomerData = useCallback(async () => {
    try {
      const [bookingsData, vehiclesData, cardsData] = await Promise.all([
        api.getCustomerBookings(),
        api.getVehicles(),
        api.getJobCards()
      ]);
      const myId = currentUser?.id;
      const myEmail = currentUser?.email;
      const safeBookings = Array.isArray(bookingsData) ? bookingsData.filter(b => !myId || b.customerId === myId) : [];
      const safeVehicles = Array.isArray(vehiclesData) ? vehiclesData.filter(v => {
        if (!v) return false;
        const isOwnerIdMatch = myId && (v.ownerId === myId || v.owner?.id === myId);
        const isOwnerEmailMatch = myEmail && (v.owner?.email === myEmail || v.userEmail === myEmail);
        return isOwnerIdMatch || isOwnerEmailMatch;
      }) : [];
      const safeJobCards = Array.isArray(cardsData) ? cardsData.filter(c => !myId || c.customerId === myId) : [];

      setMyBookings(safeBookings);
      setMyVehicles(safeVehicles);
      setMyJobCards(safeJobCards);
    } catch (err) {
      console.error('Error loading customer data:', err);
    }
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  useEffect(() => {
    loadCustomerData();
  }, [loadCustomerData]);

  const handleOpenBookingModal = (slot) => {
    if (slot.isFull) return;
    setSelectedSlot(slot);
    setBookingError(null);

    // Leave fields blank so the user fills them out themselves
    setSelectedVehicleId('NEW');
    setCustomMake('');
    setCustomModel('');
    setCustomPlate('');
    setCustomYear('');
    setCustomColor('');
    setCustomFuelType('');
    setCustomMileage('');
    setReportedIssue('');
  };

  const handleVehicleSelect = (vId) => {
    setSelectedVehicleId(vId);
    if (vId === 'NEW') {
      setCustomMake('');
      setCustomModel('');
      setCustomPlate('');
      setCustomYear('');
      setCustomColor('');
      setCustomFuelType('');
      setCustomMileage('');
    } else {
      const found = myVehicles.find(v => v.id === vId);
      if (found) {
        setCustomMake(found.make || '');
        setCustomModel(found.model || '');
        setCustomPlate(found.licensePlate || '');
        setCustomYear(found.year ? String(found.year) : '');
        setCustomColor(found.color || '');
        setCustomFuelType(found.fuelType || '');
        setCustomMileage(found.mileage ? String(found.mileage) : '');
      }
    }
  };

  const handleConfirmBooking = async (e) => {
    e.preventDefault();
    if (!selectedSlot) return;

    try {
      setSubmitting(true);
      setBookingError(null);

      let make = customMake;
      let model = customModel;
      let licensePlate = customPlate;
      let vehicleId = selectedVehicleId !== 'NEW' ? selectedVehicleId : null;

      if (selectedVehicleId !== 'NEW') {
        const found = myVehicles.find(v => v.id === selectedVehicleId);
        if (found) {
          make = found.make;
          model = found.model;
          licensePlate = found.licensePlate;
        }
      }

      await api.createBooking({
        slotId: selectedSlot.id,
        vehicleId,
        make,
        model,
        licensePlate,
        year: customYear ? parseInt(customYear, 10) : 2023,
        color: customColor,
        fuelType: customFuelType,
        vehicleType: customVehicleType,
        approxMileage: customMileage ? parseInt(customMileage, 10) : null,
        serviceType,
        reportedIssue
      });

      setSuccessMsg(`Booking confirmed for ${selectedDate} (${selectedSlot.timeDisplay})! WhatsApp confirmation sent.`);
      setSelectedSlot(null);
      loadSlots();
      loadCustomerData();

      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err) {
      console.error('Booking Error:', err);
      setBookingError(err.message || 'Failed to complete booking. Please choose another slot.');
      loadSlots(); // Refresh slot availability in real time
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingId) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.cancelBooking(bookingId);
      loadCustomerData();
      loadSlots();
    } catch (err) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  const handleReschedule = async (newSlot) => {
    if (!rescheduleBookingTarget || newSlot.isFull) return;
    try {
      setSubmitting(true);
      await api.rescheduleBooking(rescheduleBookingTarget.id, newSlot.id);
      setSuccessMsg(`Booking rescheduled to ${newSlot.date} (${newSlot.timeDisplay})`);
      setRescheduleBookingTarget(null);
      loadCustomerData();
      loadSlots();
    } catch (err) {
      alert(err.message || 'Failed to reschedule booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickRebook = (prevBooking) => {
    setCustomMake(prevBooking.make || prevBooking.vehicle?.make || '');
    setCustomModel(prevBooking.model || prevBooking.vehicle?.model || '');
    setCustomPlate(prevBooking.licensePlate || prevBooking.vehicle?.licensePlate || '');
    setCustomYear(prevBooking.year ? String(prevBooking.year) : prevBooking.vehicle?.year ? String(prevBooking.vehicle?.year) : '2023');
    setCustomColor(prevBooking.color || prevBooking.vehicle?.color || 'White');
    setCustomFuelType(prevBooking.fuelType || prevBooking.vehicle?.fuelType || 'Petrol');
    setCustomMileage(prevBooking.approxMileage ? String(prevBooking.approxMileage) : prevBooking.vehicle?.mileage ? String(prevBooking.vehicle?.mileage) : '');
    setServiceType(prevBooking.serviceType || 'General Checkup');
    setReportedIssue(prevBooking.reportedIssue || '');
    setActiveSubTab('book');
  };

  return (
    <div style={{ padding: '24px 16px', maxWidth: '960px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
            Vehicle Service & Checkup Scheduling
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: '600' }}>
            Book a 2-hour service slot in advance. Max 5 vehicles per slot for guaranteed fast-track workshop entry.
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-dark)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              background: activeSubTab === 'book' ? '#2563eb' : 'transparent',
              color: activeSubTab === 'book' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            onClick={() => setActiveSubTab('book')}
          >
            <Calendar size={15} style={{ marginRight: '6px' }} /> Schedule Slot
          </button>
          
          <button
            type="button"
            className="btn"
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              border: 'none',
              background: activeSubTab === 'my-bookings' ? '#2563eb' : 'transparent',
              color: activeSubTab === 'my-bookings' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer'
            }}
            onClick={() => setActiveSubTab('my-bookings')}
          >
            <Clock size={15} style={{ marginRight: '6px' }} /> My Bookings ({myBookings.filter(b => b.status === 'BOOKED').length})
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div style={{
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid #10b981',
          borderRadius: '12px',
          padding: '16px 20px',
          marginBottom: '24px',
          color: '#059669',
          fontSize: '14px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <CheckCircle2 size={22} style={{ flexShrink: 0 }} />
          <div>{successMsg}</div>
        </div>
      )}

      {/* SUB-TAB 1: BOOKING SLOT SELECTION */}
      {activeSubTab === 'book' && (
        <div>
          {/* 1-Booking-Per-Day Warning Banner (Auto-dismisses after 5s) */}
          {showDailyWarning && myBookings.some(b => b.status === 'BOOKED' && b.slot?.date === selectedDate) && (
            <div style={{
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid #f59e0b',
              borderRadius: '12px',
              padding: '16px 20px',
              marginBottom: '24px',
              color: '#d97706',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <AlertTriangle size={22} style={{ flexShrink: 0 }} />
                <div>
                  <strong>Limit 1 Booking Per Day:</strong> You already have an active booking on {selectedDate}. Customers are restricted to one slot per day. You can cancel or reschedule your booking under <em>My Bookings</em>.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDailyWarning(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#d97706',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center',
                  flexShrink: 0
                }}
                title="Dismiss warning"
              >
                <X size={18} />
              </button>
            </div>
          )}

          {/* Date Picker Bar */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '18px 24px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justify: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Calendar size={22} style={{ color: '#2563eb' }} />
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', display: 'block', marginBottom: '2px' }}>
                  Select Preferred Service Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  min={getTodayStr()}
                  onChange={e => setSelectedDate(e.target.value)}
                  style={{
                    background: 'var(--bg-dark)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: 'var(--text-main)',
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: '700',
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#059669', fontWeight: '800' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span> Available
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#dc2626', fontWeight: '800' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626', display: 'inline-block' }}></span> Slot Full (5/5)
              </span>
            </div>
          </div>

          {/* Slots List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
              <RefreshCw size={32} className="animate-spin" style={{ color: '#2563eb', marginBottom: '12px' }} />
              <div>Loading real-time slot availability...</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {slots.map(slot => {
                const userHasBookingToday = myBookings.some(b => b.status === 'BOOKED' && b.slot?.date === selectedDate);
                const isBtnDisabled = slot.isFull || userHasBookingToday;

                return (
                  <div
                    key={slot.id}
                    style={{
                      background: slot.isFull ? 'var(--bg-dark)' : 'var(--bg-card)',
                      border: slot.isFull ? '1px solid #ef4444' : userHasBookingToday ? '1px solid #f59e0b' : '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '10px 12px',
                      opacity: isBtnDisabled ? 0.75 : 1,
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={14} style={{ color: slot.isFull ? '#dc2626' : '#2563eb', flexShrink: 0 }} />
                          <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--text-main)', whiteSpace: 'nowrap' }}>
                            {slot.timeDisplay}
                          </span>
                        </div>
                        <span style={{
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: slot.isFull ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: slot.isFull ? '#dc2626' : '#059669',
                          whiteSpace: 'nowrap'
                        }}>
                          {slot.isFull ? 'FULL' : `${slot.spotsLeft} LEFT`}
                        </span>
                      </div>

                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                        Capacity: {slot.bookedCount}/{slot.capacity} Reserved
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn"
                      disabled={isBtnDisabled}
                      style={{
                        width: '100%',
                        padding: '7px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '800',
                        border: 'none',
                        background: slot.isFull ? 'var(--bg-dark)' : userHasBookingToday ? 'var(--bg-dark)' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: isBtnDisabled ? 'var(--text-muted)' : '#ffffff',
                        cursor: isBtnDisabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        whiteSpace: 'nowrap'
                      }}
                      onClick={() => handleOpenBookingModal(slot)}
                    >
                      {slot.isFull ? 'Full' : userHasBookingToday ? '1/Day Limit' : 'Book This Slot'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: MY UPCOMING BOOKINGS */}
      {activeSubTab === 'my-bookings' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '20px', color: 'var(--text-main)' }}>
            My Scheduled Vehicle Checkups
          </h2>

          {myBookings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Calendar size={40} style={{ color: 'var(--border-color)', marginBottom: '12px' }} />
              <div>You have no active or past bookings.</div>
              <button
                className="btn btn-primary"
                style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '8px' }}
                onClick={() => setActiveSubTab('book')}
              >
                Book a Checkup Now
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {myBookings.map(b => {
                const targetPlate = (b.licensePlate || b.vehicle?.licensePlate || '').toUpperCase();
                const matchedCard = myJobCards.find(jc => 
                  jc.vehicleId === b.vehicleId || 
                  (jc.vehicle?.licensePlate && targetPlate && jc.vehicle.licensePlate.toUpperCase() === targetPlate)
                );

                const trackerCard = matchedCard || (b.status === 'BOOKED' ? {
                  cardNumber: 'CHECKUP-SLOT',
                  title: `${b.serviceType || 'Vehicle Service'} (${b.make || b.vehicle?.make || 'Vehicle'})`,
                  status: 'CHECKED_IN',
                  statusLogs: [{ status: 'CHECKED_IN', createdAt: b.createdAt || new Date() }]
                } : null);

                return (
                  <div
                    key={b.id}
                    style={{
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '18px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justify: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>
                            {b.slot?.date} • {b.slot?.startTime}–{b.slot?.endTime}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: '800',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: b.status === 'BOOKED' ? 'rgba(59, 130, 246, 0.15)' : b.status === 'COMPLETED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: b.status === 'BOOKED' ? '#2563eb' : b.status === 'COMPLETED' ? '#059669' : '#dc2626'
                          }}>
                            {b.status}
                          </span>
                        </div>

                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                          Vehicle: <strong style={{ color: '#0284c7' }}>{b.make || b.vehicle?.make} {b.model || b.vehicle?.model}</strong> ({b.licensePlate || b.vehicle?.licensePlate || 'N/A'})
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Service: {b.serviceType} {b.reportedIssue ? `• Notes: ${b.reportedIssue}` : ''}
                        </div>
                      </div>

                      {b.status === 'BOOKED' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '12px', padding: '8px 12px' }}
                            onClick={() => handleCancelBooking(b.id)}
                          >
                            Cancel
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '12px', padding: '8px 12px', background: '#2563eb', color: '#ffffff', border: 'none' }}
                            onClick={() => setRescheduleBookingTarget(b)}
                          >
                            Reschedule
                          </button>
                        </div>
                      )}

                      {b.status === 'COMPLETED' && (
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '12px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => handleQuickRebook(b)}
                        >
                          <RotateCcw size={14} /> Rebook Service
                        </button>
                      )}
                    </div>

                    {/* Live Status Progress Bar Component */}
                    {trackerCard && (
                      <LiveStatusTracker jobCard={trackerCard} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: CONFIRM BOOKING */}
      {selectedSlot && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          padding: '16px',
          zIndex: 1000
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '28px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Confirm Service Booking
                </h3>
                <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '800' }}>
                  {selectedDate} ({selectedSlot.timeDisplay})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {bookingError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                borderRadius: '10px',
                padding: '12px',
                marginBottom: '16px',
                color: '#dc2626',
                fontSize: '13px'
              }}>
                {bookingError}
              </div>
            )}

            <form onSubmit={handleConfirmBooking}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
                
                {/* Vehicle Selection */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block' }}>
                    Select Registered Vehicle
                  </label>
                  <select
                    className="form-control"
                    value={selectedVehicleId}
                    onChange={e => handleVehicleSelect(e.target.value)}
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  >
                    {myVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.make} {v.model} ({v.licensePlate})
                      </option>
                    ))}
                    <option value="NEW">+ Enter Vehicle Details</option>
                  </select>
                </div>

                {/* Customer-Friendly Vehicle Info Fields */}
                <div style={{
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Vehicle Category & Details
                    </div>
                  </div>

                  {/* 2-Wheeler vs 4-Wheeler Category Selection */}
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '6px', display: 'block' }}>
                      Is your vehicle a 2-Wheeler or 4-Wheeler? *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: customVehicleType === '2-Wheeler' ? '2px solid #2563eb' : '1px solid var(--border-color)',
                          background: customVehicleType === '2-Wheeler' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                          color: customVehicleType === '2-Wheeler' ? '#2563eb' : 'var(--text-muted)',
                          fontSize: '13px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          setCustomVehicleType('2-Wheeler');
                          setCustomMake('');
                        }}
                      >
                        🛵 2-Wheeler (Bike/Scooter)
                      </button>

                      <button
                        type="button"
                        style={{
                          padding: '10px 14px',
                          borderRadius: '10px',
                          border: customVehicleType === '4-Wheeler' ? '2px solid #2563eb' : '1px solid var(--border-color)',
                          background: customVehicleType === '4-Wheeler' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-card)',
                          color: customVehicleType === '4-Wheeler' ? '#2563eb' : 'var(--text-muted)',
                          fontSize: '13px',
                          fontWeight: '800',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          setCustomVehicleType('4-Wheeler');
                          setCustomMake('');
                        }}
                      >
                        🚗 4-Wheeler (Car/SUV)
                      </button>
                    </div>
                  </div>

                  {/* Brand & Model */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block' }}>
                        Vehicle Brand / Make *
                      </label>
                      <select
                        className="form-control"
                        value={customMake}
                        onChange={e => setCustomMake(e.target.value)}
                        required
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '13px' }}
                      >
                        <option value="">-- Select Brand ({customVehicleType}) --</option>
                        {customVehicleType === '2-Wheeler' ? (
                          <>
                            <option value="Hero MotoCorp">Hero MotoCorp</option>
                            <option value="Honda (2-Wheeler)">Honda (2-Wheeler)</option>
                            <option value="TVS Motor">TVS Motor</option>
                            <option value="Bajaj Auto">Bajaj Auto</option>
                            <option value="Royal Enfield">Royal Enfield</option>
                            <option value="Yamaha">Yamaha</option>
                            <option value="Suzuki (2-Wheeler)">Suzuki (2-Wheeler)</option>
                            <option value="KTM">KTM</option>
                            <option value="Ather Energy">Ather Energy</option>
                            <option value="Ola Electric">Ola Electric</option>
                            <option value="Revolt Motors">Revolt Motors</option>
                            <option value="Kawasaki">Kawasaki</option>
                            <option value="Triumph">Triumph Motorcycles</option>
                            <option value="Vespa">Vespa / Aprilia</option>
                            <option value="Jawa">Jawa / Yezdi</option>
                            <option value="BMW Motorrad">BMW Motorrad</option>
                            <option value="Harley-Davidson">Harley-Davidson</option>
                            <option value="Ducati">Ducati</option>
                            <option value="Other">Other / Custom</option>
                          </>
                        ) : (
                          <>
                            <option value="Maruti Suzuki">Maruti Suzuki</option>
                            <option value="Hyundai">Hyundai</option>
                            <option value="Tata Motors">Tata Motors</option>
                            <option value="Mahindra">Mahindra</option>
                            <option value="Toyota">Toyota</option>
                            <option value="Honda">Honda (Cars)</option>
                            <option value="Kia">Kia</option>
                            <option value="MG Motors">MG Motors</option>
                            <option value="Volkswagen">Volkswagen</option>
                            <option value="Skoda">Skoda</option>
                            <option value="BMW">BMW</option>
                            <option value="Mercedes-Benz">Mercedes-Benz</option>
                            <option value="Audi">Audi</option>
                            <option value="Ford">Ford</option>
                            <option value="Renault">Renault</option>
                            <option value="Nissan">Nissan</option>
                            <option value="Jeep">Jeep</option>
                            <option value="Volvo">Volvo</option>
                            <option value="Other">Other / Custom</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block' }}>
                        Model Name *
                      </label>
                      <input
                        type="text"
                        placeholder={customVehicleType === '2-Wheeler' ? "e.g. Activa, Splendor, Pulsar, Classic 350" : "e.g. Swift, City, Creta, Nexon, Thar"}
                        className="form-control"
                        value={customModel}
                        onChange={e => setCustomModel(e.target.value)}
                        required
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                  {/* License Plate & Year */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block' }}>
                        Registration Number Plate *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. MH12AB1234"
                        className="form-control"
                        value={customPlate}
                        onChange={e => setCustomPlate(e.target.value)}
                        required
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '13px' }}
                      />
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block' }}>
                        Purchase / Model Year
                      </label>
                      <select
                        className="form-control"
                        value={customYear}
                        onChange={e => setCustomYear(e.target.value)}
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '13px' }}
                      >
                        <option value="">-- Select Year --</option>
                        <option value="2026">2026</option>
                        <option value="2025">2025</option>
                        <option value="2024">2024</option>
                        <option value="2023">2023</option>
                        <option value="2022">2022</option>
                        <option value="2021">2021</option>
                        <option value="2020">2020</option>
                        <option value="2019">2019</option>
                        <option value="2018">2018</option>
                        <option value="2017">2017</option>
                        <option value="2015">2015</option>
                        <option value="2010">2010</option>
                      </select>
                    </div>
                  </div>

                  {/* Fuel Type & Color & Approx Mileage */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.1fr', gap: '10px' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block', whiteSpace: 'nowrap' }}>
                        Fuel Type
                      </label>
                      <select
                        className="form-control"
                        value={customFuelType}
                        onChange={e => setCustomFuelType(e.target.value)}
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '13px' }}
                      >
                        <option value="">-- Select Fuel --</option>
                        <option value="Petrol">Petrol</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Electric">Electric (EV)</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="CNG">CNG</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block', whiteSpace: 'nowrap' }}>
                        Vehicle Color
                      </label>
                      <select
                        className="form-control"
                        value={customColor}
                        onChange={e => setCustomColor(e.target.value)}
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '13px' }}
                      >
                        <option value="">-- Select Color --</option>
                        <option value="White">White</option>
                        <option value="Black">Black</option>
                        <option value="Silver">Silver</option>
                        <option value="Grey">Grey</option>
                        <option value="Red">Red</option>
                        <option value="Blue">Blue</option>
                        <option value="Brown">Brown</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block', whiteSpace: 'nowrap' }}>
                        Mileage (km)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 1500"
                        className="form-control"
                        value={customMileage || ''}
                        onChange={e => setCustomMileage(e.target.value)}
                        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', fontSize: '13px' }}
                      />
                    </div>
                  </div>

                </div>

                {/* Service Reason / Quick-Select Issues */}
                <div className="form-group" style={{ margin: 0 }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '800', marginBottom: '4px', display: 'block' }}>
                    Service / Reason for Visit
                  </label>
                  <select
                    className="form-control"
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', marginBottom: '8px' }}
                  >
                    <option value="">-- Select Service / Reason for Visit --</option>
                    <option value="General Vehicle Checkup">General Vehicle Checkup</option>
                    <option value="Periodic Maintenance Service">Periodic Maintenance Service</option>
                    <option value="Engine Noise / Check Engine Light">Engine Noise / Check Engine Light</option>
                    <option value="Brake Squeal / Inspection">Brake Squeal / Inspection</option>
                    <option value="AC Cooling Weak / Service">AC Cooling Weak / Service</option>
                    <option value="Wheel Alignment & Steering Vibration">Wheel Alignment & Steering Vibration</option>
                    <option value="Battery / Electrical Issue">Battery / Electrical Issue</option>
                  </select>

                  <textarea
                    rows={2}
                    placeholder="Specific notes or issues (e.g. noise while braking, AC cooling weak...)"
                    className="form-control"
                    value={reportedIssue}
                    onChange={e => setReportedIssue(e.target.value)}
                    style={{ background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  />
                </div>

                <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', fontWeight: '600' }}>
                  ℹ️ VIN/Chassis numbers are not required at booking — Technician will scan your VIN in person upon workshop arrival.
                </div>

              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setSelectedSlot(null)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ flex: 2, background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', fontWeight: '800' }}
                >
                  {submitting ? 'Confirming Transaction...' : 'Confirm & Reserve Slot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESCHEDULE SLOT SELECTION */}
      {rescheduleBookingTarget && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justify: 'center',
          padding: '16px',
          zIndex: 1000
        }}>
          <div style={{
            maxWidth: '540px',
            width: '100%',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: '20px',
            padding: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Select New Slot for Reschedule
              </h3>
              <button
                type="button"
                onClick={() => setRescheduleBookingTarget(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              {slots.map(s => (
                <button
                  key={s.id}
                  type="button"
                  disabled={s.isFull}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: s.isFull ? '1px solid #ef4444' : '1px solid #2563eb',
                    background: s.isFull ? 'var(--bg-dark)' : 'rgba(59, 130, 246, 0.15)',
                    color: s.isFull ? '#dc2626' : '#2563eb',
                    fontWeight: '800',
                    fontSize: '13px',
                    cursor: s.isFull ? 'not-allowed' : 'pointer',
                    textAlign: 'center'
                  }}
                  onClick={() => handleReschedule(s)}
                >
                  <div>{s.timeDisplay}</div>
                  <span style={{ fontSize: '11px', color: s.isFull ? '#dc2626' : '#2563eb' }}>
                    {s.isFull ? 'Full' : `${s.spotsLeft} left`}
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ width: '100%' }}
              onClick={() => setRescheduleBookingTarget(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
