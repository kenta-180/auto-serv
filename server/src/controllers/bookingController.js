const bookingRepository = require('../repositories/bookingRepository');
const { db } = require('../config/firestore');
const { logAudit } = require('../middleware/audit');
const { enqueueTwilioDispatch } = require('../services/dispatchQueue');

const formatTimeRange = (startTime, endTime) => {
  const formatHour = (timeStr) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    return `${displayH}:${m === 0 ? '00' : String(m).padStart(2, '0')} ${ampm}`;
  };
  return `${formatHour(startTime)} – ${formatHour(endTime)}`;
};

/**
 * Fetch slots for a given date (YYYY-MM-DD)
 */
const getSlotsByDate = async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const slots = await bookingRepository.findOrCreateSlotsForDate(dateStr);

    const formattedSlots = slots.map(slot => {
      const activeBookings = (slot.bookings || []).filter(b => b.status === 'BOOKED');
      const bookedCount = activeBookings.length;
      const spotsLeft = Math.max(0, slot.capacity - bookedCount);
      const isFull = bookedCount >= slot.capacity;

      return {
        id: slot.id,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        timeDisplay: formatTimeRange(slot.startTime, slot.endTime),
        capacity: slot.capacity,
        bookedCount,
        spotsLeft,
        isFull,
        bookings: activeBookings
      };
    });

    res.json(formattedSlots);
  } catch (error) {
    console.error('Error fetching slots:', error);
    res.status(500).json({ error: 'Failed to fetch slots' });
  }
};

/**
 * Transactional Slot Booking Creation with Overbooking Protection
 */
const createBooking = async (req, res) => {
  try {
    const { 
      slotId, vehicleId, licensePlate, make, model, 
      year, color, fuelType, vehicleType, approxMileage, serviceType, reportedIssue 
    } = req.body;

    if (!slotId) {
      return res.status(400).json({ error: 'Slot ID is required' });
    }

    const { booking, activeBookedCount } = await bookingRepository.createBookingTransactional({
      customerId: req.user.id,
      slotId,
      vehicleId,
      licensePlate,
      make,
      model,
      year,
      color,
      fuelType,
      vehicleType,
      approxMileage,
      serviceType,
      reportedIssue
    });

    await logAudit({
      userId: req.user.id,
      action: 'VEHICLE_BOOKING_CREATED',
      entity: 'Booking',
      entityId: booking.id,
      details: `Booked slot ${booking.slot ? booking.slot.date : ''} for ${booking.make || ''} ${booking.model || ''}`
    });

    setImmediate(async () => {
      try {
        const customerPhone = req.user.phone || '+15550001122';
        const vehicleStr = `${booking.make || booking.vehicle?.make || 'Vehicle'} ${booking.model || booking.vehicle?.model || ''}`.trim();
        const slotTime = booking.slot ? formatTimeRange(booking.slot.startTime, booking.slot.endTime) : 'Scheduled Time';
        
        const msgText = `📅 *Auto-Serv Booking Confirmed!*\n\nHello ${req.user.name}, your vehicle checkup slot for *${vehicleStr}* has been booked.\n\nDate: *${booking.slot ? booking.slot.date : ''}*\nTime: *${slotTime}*\nService: ${booking.serviceType || 'General Checkup'}\n\nWe look forward to servicing your vehicle!`;

        await enqueueTwilioDispatch({
          jobCardId: null,
          senderUserId: req.user.id,
          recipientPhone: customerPhone,
          mediaUrl: null,
          messageText: msgText
        });
      } catch (msgErr) {
        console.error('[Booking WhatsApp Error]:', msgErr);
      }
    });

    res.status(201).json(booking);
  } catch (error) {
    if (error.message === 'ONE_BOOKING_PER_DAY') {
      return res.status(409).json({ error: 'You already have an active booking scheduled for this date. Customers can only book one vehicle slot per day.' });
    }
    if (error.message === 'SLOT_FULL') {
      return res.status(409).json({ error: 'This slot just filled up — please choose another' });
    }
    if (error.message === 'SLOT_NOT_FOUND') {
      return res.status(404).json({ error: 'Selected slot not found' });
    }
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Failed to complete booking' });
  }
};

/**
 * Fetch Customer Bookings
 */
const getCustomerBookings = async (req, res) => {
  try {
    const bookings = await bookingRepository.findCustomerBookings(req.user.id);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
};

/**
 * Cancel Booking
 */
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await bookingRepository.updateBookingStatus(id, 'CANCELLED');

    await logAudit({
      userId: req.user.id,
      action: 'VEHICLE_BOOKING_CANCELLED',
      entity: 'Booking',
      entityId: id,
      details: `Cancelled booking for slot ${updated.slot?.date || id}`
    });

    res.json(updated);
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
};

/**
 * Reschedule Booking (Transactional Cancel + Rebook)
 */
const rescheduleBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { newSlotId } = req.body;

    if (!newSlotId) {
      return res.status(400).json({ error: 'New slot ID is required' });
    }

    const oldBooking = await bookingRepository.updateBookingStatus(id, 'CANCELLED');

    const { booking: newBooking } = await bookingRepository.createBookingTransactional({
      customerId: req.user.id,
      slotId: newSlotId,
      vehicleId: oldBooking.vehicleId,
      licensePlate: oldBooking.licensePlate,
      make: oldBooking.make,
      model: oldBooking.model,
      serviceType: oldBooking.serviceType,
      reportedIssue: oldBooking.reportedIssue
    });

    await logAudit({
      userId: req.user.id,
      action: 'VEHICLE_BOOKING_RESCHEDULED',
      entity: 'Booking',
      entityId: newBooking.id,
      details: `Rescheduled booking from slot ${oldBooking.slot?.date || ''} to ${newBooking.slot?.date || ''}`
    });

    res.json(newBooking);
  } catch (error) {
    if (error.message === 'ONE_BOOKING_PER_DAY') {
      return res.status(409).json({ error: 'You already have another active booking scheduled for that date. Customers can only book one vehicle slot per day.' });
    }
    if (error.message === 'SLOT_FULL') {
      return res.status(409).json({ error: 'Selected new slot just filled up — please choose another' });
    }
    console.error('Error rescheduling booking:', error);
    res.status(500).json({ error: 'Failed to reschedule booking' });
  }
};

/**
 * Admin Day View Schedule
 */
const getAdminSchedule = async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const slots = await bookingRepository.findAdminBookingsByDate(dateStr);

    const formatted = slots.map(s => {
      const activeBookings = (s.bookings || []).filter(b => b.status === 'BOOKED');
      return {
        ...s,
        timeDisplay: formatTimeRange(s.startTime, s.endTime),
        bookedCount: activeBookings.length,
        spotsLeft: Math.max(0, s.capacity - activeBookings.length),
        isFull: activeBookings.length >= s.capacity,
        bookings: s.bookings || []
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching admin schedule:', error);
    res.status(500).json({ error: 'Failed to fetch admin schedule' });
  }
};

/**
 * Admin Mark Booking Status (COMPLETED, NO_SHOW, CANCELLED)
 */
const markBookingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['BOOKED', 'COMPLETED', 'NO_SHOW', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status' });
    }

    const updated = await bookingRepository.updateBookingStatus(id, status);
    res.json(updated);
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ error: 'Failed to update booking status' });
  }
};

module.exports = {
  getSlotsByDate,
  createBooking,
  getCustomerBookings,
  cancelBooking,
  rescheduleBooking,
  getAdminSchedule,
  markBookingStatus
};
