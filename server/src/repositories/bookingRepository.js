const { db } = require('../config/firestore');
const { v4: uuidv4 } = require('uuid');

const DEFAULT_SLOTS = [
  { startTime: '09:00', endTime: '11:00' },
  { startTime: '11:00', endTime: '13:00' },
  { startTime: '13:00', endTime: '15:00' },
  { startTime: '15:00', endTime: '17:00' },
  { startTime: '17:00', endTime: '19:00' }
];

const findOrCreateSlotsForDate = async (dateStr, transaction = null) => {
  const dateQuery = db.collection('slots').where('date', '==', dateStr);
  const snapshot = transaction ? await transaction.get(dateQuery) : await dateQuery.get();

  let slots = [];
  snapshot.forEach(doc => {
    slots.push({ id: doc.id, ...doc.data() });
  });

  if (slots.length === 0) {
    // Generate default slots for date
    const now = new Date().toISOString();
    for (const def of DEFAULT_SLOTS) {
      const slotId = `${dateStr}_${def.startTime.replace(':', '')}`;
      const slotData = {
        date: dateStr,
        startTime: def.startTime,
        endTime: def.endTime,
        capacity: 5,
        createdAt: now,
        updatedAt: now
      };
      const slotRef = db.collection('slots').doc(slotId);
      if (transaction) {
        transaction.set(slotRef, slotData, { merge: true });
      } else {
        await slotRef.set(slotData, { merge: true });
      }
      slots.push({ id: slotId, ...slotData });
    }
  }

  // Populate bookings for each slot
  const slotsWithBookings = [];
  for (const slot of slots) {
    const bQuery = db.collection('bookings')
      .where('slotId', '==', slot.id)
      .where('status', '==', 'BOOKED');
    const bSnap = transaction ? await transaction.get(bQuery) : await bQuery.get();
    
    const bookings = [];
    for (const bDoc of bSnap.docs) {
      const bData = bDoc.data();
      let customer = null;
      let vehicle = null;
      if (bData.customerId) {
        const cSnap = await db.collection('users').doc(bData.customerId).get();
        if (cSnap.exists) customer = { id: cSnap.id, ...cSnap.data() };
      }
      if (bData.vehicleId) {
        const vSnap = await db.collection('vehicles').doc(bData.vehicleId).get();
        if (vSnap.exists) vehicle = { id: vSnap.id, ...vSnap.data() };
      }
      bookings.push({ id: bDoc.id, ...bData, customer, vehicle });
    }

    slotsWithBookings.push({ ...slot, bookings });
  }

  return slotsWithBookings.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
};

/**
 * ATOMIC FIRESTORE TRANSACTIONAL OVERBOOKING PREVENTION
 */
const createBookingTransactional = async (data) => {
  return await db.runTransaction(async (transaction) => {
    const { 
      customerId, slotId, vehicleId, licensePlate, make, model, 
      year, color, fuelType, vehicleType, approxMileage, serviceType, reportedIssue 
    } = data;

    const slotRef = db.collection('slots').doc(slotId);
    const slotSnap = await transaction.get(slotRef);

    if (!slotSnap.exists) {
      throw new Error('SLOT_NOT_FOUND');
    }
    const slotData = slotSnap.data();

    // Check active bookings count for this slot inside transaction
    const slotBookingsQuery = db.collection('bookings')
      .where('slotId', '==', slotId)
      .where('status', '==', 'BOOKED');
    const slotBookingsSnap = await transaction.get(slotBookingsQuery);

    const activeBookedCount = slotBookingsSnap.size;
    if (activeBookedCount >= (slotData.capacity || 5)) {
      throw new Error('SLOT_FULL');
    }

    // Check single booking per day enforcement inside transaction
    const userBookingsQuery = db.collection('bookings')
      .where('customerId', '==', customerId)
      .where('status', '==', 'BOOKED');
    const userBookingsSnap = await transaction.get(userBookingsQuery);

    for (const bDoc of userBookingsSnap.docs) {
      const b = bDoc.data();
      if (b.slotId) {
        const checkSlotSnap = await transaction.get(db.collection('slots').doc(b.slotId));
        if (checkSlotSnap.exists && checkSlotSnap.data().date === slotData.date) {
          throw new Error('ONE_BOOKING_PER_DAY');
        }
      }
    }

    let finalVehicleId = vehicleId || null;
    const now = new Date().toISOString();

    // Auto-upsert vehicle record if licensePlate provided
    if (licensePlate) {
      const plate = licensePlate.toUpperCase().trim();
      const vehQuery = db.collection('vehicles').where('licensePlate', '==', plate).limit(1);
      const vehSnap = await transaction.get(vehQuery);

      if (!vehSnap.empty) {
        finalVehicleId = vehSnap.docs[0].id;
        transaction.update(vehSnap.docs[0].ref, {
          make: make || vehSnap.docs[0].data().make,
          model: model || vehSnap.docs[0].data().model,
          year: year ? parseInt(year, 10) : vehSnap.docs[0].data().year,
          color: color || vehSnap.docs[0].data().color,
          fuelType: fuelType || vehSnap.docs[0].data().fuelType,
          vehicleType: vehicleType || vehSnap.docs[0].data().vehicleType || '4-Wheeler',
          mileage: approxMileage ? parseInt(approxMileage, 10) : vehSnap.docs[0].data().mileage,
          updatedAt: now
        });
      } else if (customerId && make && model) {
        const newVehId = uuidv4();
        const newVehData = {
          licensePlate: plate,
          make,
          model,
          year: year ? parseInt(year, 10) : 2023,
          color: color || null,
          fuelType: fuelType || 'Petrol',
          vehicleType: vehicleType || '4-Wheeler',
          mileage: approxMileage ? parseInt(approxMileage, 10) : 0,
          ownerId: customerId,
          createdAt: now,
          updatedAt: now
        };
        transaction.set(db.collection('vehicles').doc(newVehId), newVehData);
        finalVehicleId = newVehId;
      }
    }

    const bookingId = uuidv4();
    const bookingData = {
      customerId,
      slotId,
      vehicleId: finalVehicleId,
      licensePlate: licensePlate ? licensePlate.toUpperCase().trim() : null,
      make: make || null,
      model: model || null,
      year: year ? parseInt(year, 10) : null,
      color: color || null,
      fuelType: fuelType || 'Petrol',
      vehicleType: vehicleType || '4-Wheeler',
      approxMileage: approxMileage ? parseInt(approxMileage, 10) : null,
      serviceType: serviceType || 'General Checkup',
      reportedIssue: reportedIssue || null,
      status: 'BOOKED',
      createdAt: now,
      updatedAt: now
    };

    transaction.set(db.collection('bookings').doc(bookingId), bookingData);

    return {
      booking: { id: bookingId, ...bookingData, slot: { id: slotSnap.id, ...slotData } },
      activeBookedCount: activeBookedCount + 1
    };
  });
};

const findCustomerBookings = async (customerId, transaction = null) => {
  const query = db.collection('bookings')
    .where('customerId', '==', customerId);
  const snapshot = transaction ? await transaction.get(query) : await query.get();

  const bookings = [];
  for (const doc of snapshot.docs) {
    const b = doc.data();
    let slot = null;
    let vehicle = null;
    if (b.slotId) {
      const sSnap = await db.collection('slots').doc(b.slotId).get();
      if (sSnap.exists) slot = { id: sSnap.id, ...sSnap.data() };
    }
    if (b.vehicleId) {
      const vSnap = await db.collection('vehicles').doc(b.vehicleId).get();
      if (vSnap.exists) vehicle = { id: vSnap.id, ...vSnap.data() };
    }
    bookings.push({ id: doc.id, ...b, slot, vehicle });
  }

  return bookings.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
};

const findAdminBookingsByDate = async (dateStr, transaction = null) => {
  return await findOrCreateSlotsForDate(dateStr, transaction);
};

const updateBookingStatus = async (bookingId, status, transaction = null) => {
  const docRef = db.collection('bookings').doc(bookingId);
  const updateData = { status, updatedAt: new Date().toISOString() };

  if (transaction) {
    transaction.update(docRef, updateData);
  } else {
    await docRef.update(updateData);
  }

  const docSnap = await docRef.get();
  return { id: docSnap.id, ...docSnap.data() };
};

module.exports = {
  findOrCreateSlotsForDate,
  createBookingTransactional,
  findCustomerBookings,
  findAdminBookingsByDate,
  updateBookingStatus
};
