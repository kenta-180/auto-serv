const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { db } = require('./config/firestore');
const aggregateService = require('./services/aggregateService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Bulletproof CORS Middleware for Mobile APK WebViews & Cloud Tunnels
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, bypass-tunnel-reminder');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/invoices', express.static(path.join(__dirname, '../public/invoices')));

// API Routes
const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

// Healthcheck
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'Cloud Firestore (firebase-admin SDK)',
    appName: 'Automobile Workshop Management System (auto-serv)',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build in production
const clientBuildPath = path.join(__dirname, '../../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
      if (err) {
        res.status(200).send(`
          <div style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h2>Auto-Serv Backend Server is Running with Cloud Firestore!</h2>
            <p>API Base URL: <code>/api</code></p>
            <p>Healthcheck: <a href="/api/health">/api/health</a></p>
          </div>
        `);
      }
    });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

async function autoSeedIfEmpty() {
  try {
    const usersSnap = await db.collection('users').limit(1).get();
    if (!usersSnap.empty) return;

    console.log('🌱 Seeding initial Firestore dataset...');
    const passwordHash = await bcrypt.hash('password123', 10);
    const now = new Date().toISOString();

    const users = [
      { id: 'usr-admin-01', email: 'admin@autoserv.com', passwordHash, name: 'Alex Rivera (Admin)', phone: '+1 (555) 019-2831', role: 'ADMIN', preferredLanguage: 'en', preferredTheme: 'dark', createdAt: now, updatedAt: now },
      { id: 'usr-tech-01', email: 'tech@autoserv.com', passwordHash, name: 'Marcus Vance (Master Tech)', phone: '+1 (555) 018-9922', role: 'TECHNICIAN', preferredLanguage: 'en', preferredTheme: 'light', createdAt: now, updatedAt: now },
      { id: 'usr-cust-01', email: 'customer@autoserv.com', passwordHash, name: 'Sophia Chen', phone: '+1 (555) 012-3456', role: 'CUSTOMER', preferredLanguage: 'en', preferredTheme: 'dark', createdAt: now, updatedAt: now }
    ];
    for (const u of users) await db.collection('users').doc(u.id).set(u);

    const vehicle = { id: 'veh-789-01', licensePlate: 'AUTO-789', make: 'Toyota', model: 'Camry Hybrid', year: 2023, color: 'Midnight Blue', fuelType: 'Petrol', vehicleType: '4-Wheeler', vin: '4T1C11AK8PW098765', mileage: 15400, fuelLevel: '1/2', ownerId: 'usr-cust-01', createdAt: now, updatedAt: now };
    await db.collection('vehicles').doc(vehicle.id).set(vehicle);

    const items = [
      { id: 'inv-oil-5w30', sku: 'OIL-5W30', name: 'Synthetic Oil 5W-30 (1L)', category: 'Fluids', quantity: 45, minimumStock: 10, unitPrice: 24.99, partType: 'FAST_MOVING', location: 'Shelf A-1', createdAt: now, updatedAt: now },
      { id: 'inv-oil-0w20', sku: 'OIL-0W20', name: 'Full Synthetic Engine Oil 0W-20 (4L)', category: 'Fluids', quantity: 30, minimumStock: 8, unitPrice: 42.50, partType: 'FAST_MOVING', location: 'Shelf A-2', createdAt: now, updatedAt: now },
      { id: 'inv-brk-pad-f', sku: 'BRK-PAD-F', name: 'Ceramic Front Brake Pads', category: 'Brakes', quantity: 18, minimumStock: 5, unitPrice: 65.50, partType: 'FAST_MOVING', location: 'Shelf B-3', createdAt: now, updatedAt: now },
      { id: 'inv-flt-oil-02', sku: 'FLT-OIL-02', name: 'Premium Spin-On Oil Filter', category: 'Filters', quantity: 25, minimumStock: 10, unitPrice: 12.50, partType: 'FAST_MOVING', location: 'Shelf C-1', createdAt: now, updatedAt: now }
    ];
    for (const item of items) await db.collection('inventoryItems').doc(item.id).set(item);

    const jobCard = { id: 'jc-2026-1001', cardNumber: 'JC-2026-1001', title: 'Periodic Maintenance & Oil Service', description: 'Perform 20,000 km routine service.', status: 'IN_PROGRESS', priority: 'HIGH', vehicleId: 'veh-789-01', technicianId: 'usr-tech-01', customerId: 'usr-cust-01', estimatedCost: 150.00, laborCost: 75.00, partsCost: 37.49, totalCost: 112.49, createdAt: now, updatedAt: now };
    await db.collection('jobCards').doc(jobCard.id).set(jobCard);

    await aggregateService.recalculateDashboardAggregates();
    console.log('✅ Initial Firestore Dataset Seeded Automatically.');
  } catch (err) {
    console.error('Auto-seed warning:', err.message);
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`================================================`);
  console.log(`Auto-Serv Server running on http://0.0.0.0:${PORT}`);
  console.log(`Database: Google Cloud Firestore`);
  console.log(`API Healthcheck: http://localhost:${PORT}/api/health`);
  console.log(`================================================`);
  await autoSeedIfEmpty();
});

module.exports = app;
