const { db } = require('../src/config/firestore');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('Seeding Automobile Workshop Management App Cloud Firestore database...');

  const passwordHash = await bcrypt.hash('password123', 10);
  const now = new Date().toISOString();

  // 1. Create Users
  const adminId = 'admin-user-001';
  const techId = 'tech-user-001';
  const customerId = 'customer-user-001';

  const users = [
    {
      id: adminId,
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
      id: techId,
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
      id: customerId,
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
  console.log('Users seeded in Firestore:', users.map(u => u.email).join(', '));

  // 2. Create Vehicle
  const vehicleId = 'vehicle-auto-789';
  const vehicle = {
    id: vehicleId,
    licensePlate: 'AUTO-789',
    make: 'Toyota',
    model: 'Camry Hybrid',
    year: 2023,
    color: 'Pearl White',
    fuelType: 'Hybrid',
    vehicleType: '4-Wheeler',
    vin: '4T1C11AK8PW098765',
    mileage: 20500,
    fuelLevel: '3/4',
    ownerId: customerId,
    createdAt: now,
    updatedAt: now
  };

  await db.collection('vehicles').doc(vehicleId).set(vehicle, { merge: true });
  console.log('Vehicle seeded in Firestore:', vehicle.licensePlate);

  // 3. Create Inventory Items
  const items = [
    { id: 'item-oil-5w30', sku: 'OIL-5W30', name: 'Synthetic Oil 5W-30 (1L)', category: 'Fluids', quantity: 45, minimumStock: 10, unitPrice: 24.99, partType: 'FAST_MOVING', location: 'Shelf A-1', createdAt: now, updatedAt: now },
    { id: 'item-oil-0w20', sku: 'OIL-0W20', name: 'Full Synthetic Engine Oil 0W-20 (4L)', category: 'Fluids', quantity: 30, minimumStock: 8, unitPrice: 42.50, partType: 'FAST_MOVING', location: 'Shelf A-2', createdAt: now, updatedAt: now },
    { id: 'item-brk-pad-f', sku: 'BRK-PAD-F', name: 'Ceramic Front Brake Pads', category: 'Brakes', quantity: 18, minimumStock: 5, unitPrice: 65.50, partType: 'FAST_MOVING', location: 'Shelf B-3', createdAt: now, updatedAt: now },
    { id: 'item-brk-pad-r', sku: 'BRK-PAD-R', name: 'Rear Heavy Duty Brake Pads', category: 'Brakes', quantity: 14, minimumStock: 5, unitPrice: 54.00, partType: 'FAST_MOVING', location: 'Shelf B-4', createdAt: now, updatedAt: now },
    { id: 'item-brk-rot-f', sku: 'BRK-ROT-F', name: 'Vented Front Brake Rotor (Pair)', category: 'Brakes', quantity: 10, minimumStock: 3, unitPrice: 120.00, partType: 'REGULAR', location: 'Rack B-1', createdAt: now, updatedAt: now },
    { id: 'item-flt-air-01', sku: 'FLT-AIR-01', name: 'Engine Air Filter Element', category: 'Filters', quantity: 30, minimumStock: 8, unitPrice: 18.00, partType: 'FAST_MOVING', location: 'Shelf C-2', createdAt: now, updatedAt: now },
    { id: 'item-flt-oil-02', sku: 'FLT-OIL-02', name: 'Premium Spin-On Oil Filter', category: 'Filters', quantity: 25, minimumStock: 10, unitPrice: 12.50, partType: 'FAST_MOVING', location: 'Shelf C-1', createdAt: now, updatedAt: now },
    { id: 'item-flt-cab-03', sku: 'FLT-CAB-03', name: 'Activated Carbon Cabin Air Filter', category: 'Filters', quantity: 22, minimumStock: 6, unitPrice: 22.00, partType: 'SERVICE_PART', location: 'Shelf C-3', createdAt: now, updatedAt: now },
    { id: 'item-spk-plg-ir', sku: 'SPK-PLG-IR', name: 'Iridium Spark Plug Set (Pack of 4)', category: 'Engine', quantity: 12, minimumStock: 4, unitPrice: 48.00, partType: 'SERVICE_PART', location: 'Shelf D-4', createdAt: now, updatedAt: now },
    { id: 'item-bat-12v', sku: 'BAT-12V-70AH', name: '12V 70Ah AGM High Performance Battery', category: 'Electrical', quantity: 8, minimumStock: 3, unitPrice: 165.00, partType: 'REGULAR', location: 'Battery Rack E-1', createdAt: now, updatedAt: now },
    { id: 'item-wpr-bld', sku: 'WPR-BLD-22', name: 'All-Weather Wiper Blades 22" (Pair)', category: 'Accessories', quantity: 35, minimumStock: 10, unitPrice: 28.50, partType: 'FAST_MOVING', location: 'Shelf F-1', createdAt: now, updatedAt: now },
    { id: 'item-clt-5050', sku: 'CLT-5050-4L', name: 'Pre-Mixed Long Life Coolant (4L)', category: 'Fluids', quantity: 20, minimumStock: 5, unitPrice: 31.00, partType: 'FAST_MOVING', location: 'Shelf A-4', createdAt: now, updatedAt: now },
    { id: 'item-trn-fld', sku: 'TRN-FLD-ATF', name: 'Automatic Transmission Fluid ATF (1L)', category: 'Fluids', quantity: 28, minimumStock: 8, unitPrice: 19.50, partType: 'SERVICE_PART', location: 'Shelf A-3', createdAt: now, updatedAt: now },
    { id: 'item-blt-tmg', sku: 'BLT-TMG-SET', name: 'Timing Belt & Water Pump Kit', category: 'Engine', quantity: 6, minimumStock: 2, unitPrice: 185.00, partType: 'SERVICE_PART', location: 'Shelf D-2', createdAt: now, updatedAt: now },
    { id: 'item-alt-120a', sku: 'ALT-120A-HD', name: 'High-Output 120A Alternator Assembly', category: 'Electrical', quantity: 4, minimumStock: 2, unitPrice: 240.00, partType: 'REGULAR', location: 'Rack E-3', createdAt: now, updatedAt: now },
    { id: 'item-shk-abs', sku: 'SHK-ABS-F', name: 'Front Gas Shock Absorber Strut', category: 'Suspension', quantity: 9, minimumStock: 4, unitPrice: 110.00, partType: 'REGULAR', location: 'Rack G-1', createdAt: now, updatedAt: now },
    { id: 'item-o2-sns', sku: 'O2-SNS-F', name: 'Downstream Oxygen Sensor (O2)', category: 'Electrical', quantity: 15, minimumStock: 4, unitPrice: 75.00, partType: 'REGULAR', location: 'Shelf D-1', createdAt: now, updatedAt: now },
    { id: 'item-led-h7', sku: 'LED-H7-KIT', name: 'H7 Dual LED Headlight Bulb Set', category: 'Lighting', quantity: 16, minimumStock: 5, unitPrice: 55.00, partType: 'REGULAR', location: 'Shelf F-3', createdAt: now, updatedAt: now }
  ];

  for (const item of items) {
    await db.collection('inventoryItems').doc(item.id).set(item, { merge: true });
  }
  console.log('Inventory items seeded in Firestore:', items.length);

  // 4. Create Job Card
  const jobCardId = 'jc-2026-1001';
  const jobCard = {
    id: jobCardId,
    cardNumber: 'JC-2026-1001',
    title: 'Periodic Maintenance & Oil Service',
    description: 'Perform 20,000 km routine service, replace synthetic engine oil, inspect brake rotors, and change oil filter.',
    reportedIssues: 'Minor brake squeak at low speeds',
    mileage: 20500,
    fuelLevel: '3/4',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    vehicleId,
    technicianId: techId,
    customerId,
    promisedDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    estimatedCost: 150.00,
    laborCost: 75.00,
    partsCost: 37.49,
    totalCost: 112.49,
    createdAt: now,
    updatedAt: now
  };

  await db.collection('jobCards').doc(jobCardId).set(jobCard, { merge: true });

  const jobCardParts = [
    { id: 'jcp-001', jobCardId, inventoryItemId: 'item-oil-5w30', quantity: 1, unitPrice: 24.99, totalPrice: 24.99, drawnByUserId: techId, createdAt: now },
    { id: 'jcp-002', jobCardId, inventoryItemId: 'item-flt-oil-02', quantity: 1, unitPrice: 12.50, totalPrice: 12.50, drawnByUserId: techId, createdAt: now }
  ];

  for (const part of jobCardParts) {
    await db.collection('jobCardParts').doc(part.id).set(part, { merge: true });
  }

  console.log('Job Card seeded in Firestore:', jobCard.cardNumber);

  // 5. Seed Audit Logs
  const auditLogs = [
    {
      id: 'audit-001',
      userId: adminId,
      action: 'SYSTEM_INITIALIZED',
      entity: 'System',
      entityId: null,
      details: 'Workshop Management Database Seeded with default roles and initial inventory in Cloud Firestore.',
      inventoryItemId: null,
      timestamp: now
    },
    {
      id: 'audit-002',
      userId: techId,
      action: 'STOCK_MUTATION',
      entity: 'InventoryItem',
      entityId: 'item-oil-5w30',
      inventoryItemId: 'item-oil-5w30',
      details: 'Stock -1 (Previous: 46, New: 45) for Job Card JC-2026-1001',
      timestamp: now
    }
  ];

  for (const log of auditLogs) {
    await db.collection('auditLogs').doc(log.id).set(log, { merge: true });
  }

  // 6. Seed Canned Note Templates
  const cannedTemplates = [
    { id: 'cn-001', category: 'Engine', text: 'Engine oil & oil filter replaced. Oil level verified to MAX mark.', createdAt: now, updatedAt: now },
    { id: 'cn-002', category: 'Brakes', text: 'Ceramic brake pads & rotors inspected. Caliper slides lubricated & torqued.', createdAt: now, updatedAt: now },
    { id: 'cn-003', category: 'Engine', text: 'Iridium spark plugs & ignition coils replaced. Gap verified to factory spec.', createdAt: now, updatedAt: now },
    { id: 'cn-004', category: 'Fluids', text: 'Brake fluid flushed & bled (DOT 4). Coolant top-up completed.', createdAt: now, updatedAt: now },
    { id: 'cn-005', category: 'Electrical', text: '12V AGM battery load tested. Alternator charging output verified at 14.2V.', createdAt: now, updatedAt: now }
  ];

  for (const t of cannedTemplates) {
    await db.collection('cannedNoteTemplates').doc(t.id).set(t, { merge: true });
  }
  console.log('Canned note templates seeded in Firestore:', cannedTemplates.length);

  // 7. Seed Initial Dashboard Aggregates Document
  const aggregateService = require('../src/services/aggregateService');
  await aggregateService.recalculateDashboardAggregates();
  console.log('Dashboard materialized aggregates document recalculated in Firestore.');

  console.log('Cloud Firestore Seeding completed successfully!');
}

main().catch(console.error);
