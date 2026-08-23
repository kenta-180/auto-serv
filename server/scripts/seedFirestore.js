const { db } = require('../src/config/firestore');
const bcrypt = require('bcryptjs');
const aggregateService = require('../src/services/aggregateService');

async function seed() {
  console.log('🌱 Starting Cloud Firestore seeding for Auto-Serv...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date().toISOString();

  // 1. Users
  const users = [
    {
      id: 'usr-admin-01',
      email: 'admin@autoserv.com',
      passwordHash,
      name: 'Alex Rivera (Admin)',
      phone: '+1 (555) 019-2831',
      role: 'ADMIN',
      preferredLanguage: 'en',
      preferredTheme: 'dark',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-tech-01',
      email: 'tech@autoserv.com',
      passwordHash,
      name: 'Marcus Vance (Master Tech)',
      phone: '+1 (555) 018-9922',
      role: 'TECHNICIAN',
      preferredLanguage: 'en',
      preferredTheme: 'light',
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'usr-cust-01',
      email: 'customer@autoserv.com',
      passwordHash,
      name: 'Sophia Chen',
      phone: '+1 (555) 012-3456',
      role: 'CUSTOMER',
      preferredLanguage: 'en',
      preferredTheme: 'dark',
      createdAt: now,
      updatedAt: now
    }
  ];

  for (const u of users) {
    await db.collection('users').doc(u.id).set(u, { merge: true });
  }
  console.log(`✓ Seeded ${users.length} Users`);

  // 2. Vehicles
  const vehicle = {
    id: 'veh-789-01',
    licensePlate: 'AUTO-789',
    make: 'Toyota',
    model: 'Camry Hybrid',
    year: 2023,
    color: 'Midnight Blue',
    fuelType: 'Petrol',
    vehicleType: '4-Wheeler',
    vin: '4T1C11AK8PW098765',
    mileage: 15400,
    fuelLevel: '1/2',
    ownerId: 'usr-cust-01',
    createdAt: now,
    updatedAt: now
  };
  await db.collection('vehicles').doc(vehicle.id).set(vehicle, { merge: true });
  console.log(`✓ Seeded Vehicle ${vehicle.licensePlate}`);

  // 3. Inventory Items
  const items = [
    { id: 'inv-oil-5w30', sku: 'OIL-5W30', name: 'Synthetic Oil 5W-30 (1L)', category: 'Fluids', quantity: 45, minimumStock: 10, unitPrice: 24.99, partType: 'FAST_MOVING', location: 'Shelf A-1', createdAt: now, updatedAt: now },
    { id: 'inv-oil-0w20', sku: 'OIL-0W20', name: 'Full Synthetic Engine Oil 0W-20 (4L)', category: 'Fluids', quantity: 30, minimumStock: 8, unitPrice: 42.50, partType: 'FAST_MOVING', location: 'Shelf A-2', createdAt: now, updatedAt: now },
    { id: 'inv-brk-pad-f', sku: 'BRK-PAD-F', name: 'Ceramic Front Brake Pads', category: 'Brakes', quantity: 18, minimumStock: 5, unitPrice: 65.50, partType: 'FAST_MOVING', location: 'Shelf B-3', createdAt: now, updatedAt: now },
    { id: 'inv-brk-pad-r', sku: 'BRK-PAD-R', name: 'Rear Heavy Duty Brake Pads', category: 'Brakes', quantity: 14, minimumStock: 5, unitPrice: 54.00, partType: 'FAST_MOVING', location: 'Shelf B-4', createdAt: now, updatedAt: now },
    { id: 'inv-flt-air-01', sku: 'FLT-AIR-01', name: 'Engine Air Filter Element', category: 'Filters', quantity: 30, minimumStock: 8, unitPrice: 18.00, partType: 'FAST_MOVING', location: 'Shelf C-2', createdAt: now, updatedAt: now },
    { id: 'inv-flt-oil-02', sku: 'FLT-OIL-02', name: 'Premium Spin-On Oil Filter', category: 'Filters', quantity: 25, minimumStock: 10, unitPrice: 12.50, partType: 'FAST_MOVING', location: 'Shelf C-1', createdAt: now, updatedAt: now },
    { id: 'inv-spk-plg-ir', sku: 'SPK-PLG-IR', name: 'Iridium Spark Plug Set (Pack of 4)', category: 'Engine', quantity: 12, minimumStock: 4, unitPrice: 48.00, partType: 'SERVICE_PART', location: 'Shelf D-4', createdAt: now, updatedAt: now },
    { id: 'inv-bat-12v-70ah', sku: 'BAT-12V-70AH', name: '12V 70Ah AGM High Performance Battery', category: 'Electrical', quantity: 8, minimumStock: 3, unitPrice: 165.00, partType: 'REGULAR', location: 'Battery Rack E-1', createdAt: now, updatedAt: now }
  ];

  for (const item of items) {
    await db.collection('inventoryItems').doc(item.id).set(item, { merge: true });
  }
  console.log(`✓ Seeded ${items.length} Inventory Items`);

  // 4. Job Card
  const jobCard = {
    id: 'jc-2026-1001',
    cardNumber: 'JC-2026-1001',
    title: 'Periodic Maintenance & Oil Service',
    description: 'Perform 20,000 km routine service, replace synthetic engine oil, inspect brake rotors, and change oil filter.',
    reportedIssues: 'Periodic service due. Minor squeak from front brakes when cold.',
    mileage: 15400,
    fuelLevel: '1/2',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    vehicleId: 'veh-789-01',
    technicianId: 'usr-tech-01',
    customerId: 'usr-cust-01',
    estimatedCost: 150.00,
    laborCost: 75.00,
    partsCost: 37.49,
    totalCost: 112.49,
    createdAt: now,
    updatedAt: now
  };
  await db.collection('jobCards').doc(jobCard.id).set(jobCard, { merge: true });

  const jobCardParts = [
    { id: 'jcp-01', jobCardId: 'jc-2026-1001', inventoryItemId: 'inv-oil-5w30', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, drawnByUserId: 'usr-tech-01', createdAt: now },
    { id: 'jcp-02', jobCardId: 'jc-2026-1001', inventoryItemId: 'inv-flt-oil-02', quantity: 1, unitPrice: 12.50, totalPrice: 12.50, drawnByUserId: 'usr-tech-01', createdAt: now }
  ];
  for (const p of jobCardParts) {
    await db.collection('jobCardParts').doc(p.id).set(p, { merge: true });
  }
  console.log(`✓ Seeded Job Card ${jobCard.cardNumber} with parts`);

  // 5. Canned Notes
  const cannedNotes = [
    { id: 'cn-01', category: 'Engine', text: 'Engine oil & oil filter replaced. Oil level verified to MAX mark.', createdAt: now, updatedAt: now },
    { id: 'cn-02', category: 'Brakes', text: 'Ceramic brake pads & rotors inspected. Caliper slides lubricated & torqued.', createdAt: now, updatedAt: now },
    { id: 'cn-03', category: 'Fluids', text: 'Brake fluid flushed & bled (DOT 4). Coolant top-up completed.', createdAt: now, updatedAt: now },
    { id: 'cn-04', category: 'Electrical', text: '12V AGM battery load tested. Alternator charging output verified at 14.2V.', createdAt: now, updatedAt: now }
  ];
  for (const c of cannedNotes) {
    await db.collection('cannedNoteTemplates').doc(c.id).set(c, { merge: true });
  }
  console.log(`✓ Seeded ${cannedNotes.length} Canned Note Templates`);

  // 6. Calculate & save dashboard aggregate statistics
  await aggregateService.recalculateDashboardAggregates();
  console.log('✓ Recalculated Dashboard Aggregate statistics document');

  console.log('✅ Cloud Firestore Seeding Completed Successfully!');
}

seed().catch(err => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});
