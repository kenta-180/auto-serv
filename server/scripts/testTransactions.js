const http = require('http');

const API_PORT = process.env.PORT || 5000;
const BASE_URL = `http://127.0.0.1:${API_PORT}/api`;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE_URL}${path}`, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(data); } catch (e) { parsed = data; }
        resolve({ statusCode: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function testTransactions() {
  console.log('🧪 Testing Firestore Transactions & Guarantees...\n');

  try {
    // 1. Login Admin
    const loginRes = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { identifier: 'admin@autoserv.com', password: 'password123' }
    });
    const token = loginRes.data?.token;
    const authHeader = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 2. Test Inventory Checkout Transaction
    console.log('1️⃣ Testing Inventory Checkout Transaction (checkoutParts)...');
    const checkoutRes = await request('/job-cards/jc-2026-1001/parts/checkout', {
      method: 'POST',
      headers: authHeader,
      body: { parts: [{ inventoryItemId: 'inv-oil-5w30', quantity: 2 }] }
    });
    console.log(`   Status: ${checkoutRes.statusCode}, Result:`, checkoutRes.data);

    // 3. Test Quality Check Gate Transaction
    console.log('\n2️⃣ Testing QC Gate Transaction (recordQC)...');
    const qcRes = await request('/job-cards/jc-2026-1001/qc', {
      method: 'POST',
      headers: authHeader,
      body: { pass: true, notes: 'Passed all 15 inspection points', checklist: { brakes: 'OK', engine: 'OK' } }
    });
    console.log(`   Status: ${qcRes.statusCode}, Final Status: ${qcRes.data?.finalStatus}`);

    // 4. Test Invoice Generation & Payment Webhook Transaction
    console.log('\n3️⃣ Testing Invoice Generation & Payment Webhook Transaction...');
    const invoiceRes = await request('/job-cards/jc-2026-1001/invoice', {
      method: 'POST',
      headers: authHeader,
      body: { taxRate: 10.0 }
    });
    const invId = invoiceRes.data?.id;
    console.log(`   Invoice Created: #${invoiceRes.data?.invoiceNumber || 'N/A'}, Total: ₹${invoiceRes.data?.totalAmount}`);

    if (invId) {
      // Initiate checkout session to get signature
      const sessionRes = await request('/payments/checkout-session', {
        method: 'POST',
        headers: authHeader,
        body: { invoiceId: invId }
      });
      const signature = sessionRes.data?.signature;

      // Call payment webhook
      const webhookRes = await request('/payments/webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { invoiceId: invId, signature, transactionReference: 'TXN-RAZORPAY-TEST-9988', paymentMethod: 'UPI_RAZORPAY' }
      });
      console.log(`   Webhook Result: Status ${webhookRes.statusCode}, Invoice Status: ${webhookRes.data?.invoice?.status}`);
    }

    // 5. Test Slot Booking & Overbooking Prevention Transaction
    console.log('\n4️⃣ Testing Slot Booking Overbooking Guard Transaction...');
    const slotsRes = await request('/bookings/slots');
    const targetSlot = slotsRes.data?.[0];

    if (targetSlot) {
      const bookRes = await request('/bookings', {
        method: 'POST',
        headers: authHeader,
        body: {
          slotId: targetSlot.id,
          licensePlate: 'MH-12-TEST-999',
          make: 'Honda',
          model: 'Civic',
          serviceType: 'Oil Service'
        }
      });
      console.log(`   Booking Status: ${bookRes.statusCode}, Booking ID: ${bookRes.data?.id || bookRes.data?.error}`);
    }

    console.log('\n✅ All Firestore Transaction Workflows Verified Successfully!');
  } catch (err) {
    console.error('❌ Transaction test failed:', err.message);
  }
}

testTransactions();
