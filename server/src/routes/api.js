const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const authController = require('../controllers/authController');
const vehicleController = require('../controllers/vehicleController');
const jobCardController = require('../controllers/jobCardController');
const inventoryController = require('../controllers/inventoryController');
const invoiceController = require('../controllers/invoiceController');
const userController = require('../controllers/userController');
const auditController = require('../controllers/auditController');
const attendanceController = require('../controllers/attendanceController');
const timeLogController = require('../controllers/timeLogController');
const cannedNotesController = require('../controllers/cannedNotesController');
const bookingController = require('../controllers/bookingController');
const galleryController = require('../controllers/galleryController');
const aggregateService = require('../services/aggregateService');

const { otpLimiter, phoneAndIpLimiter } = require('../middleware/rateLimiter');

// Public Auth Routes — Twilio Verify OTP & Registration
router.post('/auth/phone/send-otp', phoneAndIpLimiter, authController.sendOtp);
router.post('/auth/send-otp', phoneAndIpLimiter, authController.sendOtp);
router.post('/auth/phone/verify-otp', authController.verifyOtp);
router.post('/auth/verify-otp', authController.verifyOtp);
router.post('/auth/verify-firebase-token', otpLimiter, authController.verifyFirebaseToken);
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

router.post('/auth/logout', authenticateToken, authController.logout);
router.get('/auth/me', authenticateToken, authController.getMe);
router.put('/auth/language', authenticateToken, authController.updateLanguage);
router.put('/auth/theme', authenticateToken, authController.updateTheme);

// Dashboard Aggregates Route
router.get('/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await aggregateService.getDashboardAggregates();
    res.json(stats);
  } catch (err) {
    console.error('Error fetching dashboard stats:', err);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// Canned Notes Routes
router.get('/canned-notes', authenticateToken, cannedNotesController.getCannedNotes);
router.post('/canned-notes', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), cannedNotesController.createCannedNote);
router.delete('/canned-notes/:id', authenticateToken, requireRole('ADMIN'), cannedNotesController.deleteCannedNote);

// Vehicle Routes
router.get('/vehicles', authenticateToken, vehicleController.getVehicles);
router.post('/vehicles', authenticateToken, vehicleController.createVehicle);
router.delete('/vehicles/:id', authenticateToken, vehicleController.deleteVehicle);

// Job Card Routes
router.get('/job-cards', authenticateToken, jobCardController.getJobCards);
router.get('/job-cards/:id', authenticateToken, jobCardController.getJobCardById);

// Step 1: Check-In
router.post('/job-cards', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.createJobCard);

// Step 2: Inspection & Pre-Service Media
router.post('/job-cards/:id/inspection', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.recordInspection);

// Step 2: Create Tasks & Parts Estimate (No Inventory Deductions)
router.post('/job-cards/:id/estimate', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.createEstimate);

// Step 2: Customer Estimate Approval
router.post('/job-cards/:id/approve-estimate', authenticateToken, jobCardController.approveEstimate);

// Step 3: Technician Assignment (ESTIMATE_APPROVED -> ASSIGNED)
router.post('/job-cards/:id/assign', authenticateToken, requireRole('ADMIN'), jobCardController.assignTechnician);

// Step 3: Parts Checkout & Atomic Inventory Draw (Audit Point)
router.post('/job-cards/:id/parts/checkout', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.checkoutParts);

// Step 4: Start Active Servicing & Repair Work (ASSIGNED -> IN_PROGRESS)
router.patch('/job-cards/:id/start', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.startJob);
router.post('/job-cards/:id/unfinished', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.markUnfinished);

// Per-Task Time Log Routes
router.post('/job-cards/:id/time-logs/start', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), timeLogController.startTimeLog);
router.post('/job-cards/:id/time-logs/pause', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), timeLogController.pauseTimeLog);
router.get('/job-cards/:id/time-logs', authenticateToken, timeLogController.getTimeLogs);

// Step 4: Live Progress Media Documentation & Non-Blocking Twilio Dispatch Queue
router.post('/job-cards/:id/media', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.addProgressMedia);

// Step 5: Quality Check Gate (QC Inspection & Pass/Fail Rework Loop)
router.post('/job-cards/:id/qc', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.recordQC);

// Step 5: Read-Only Final Computed Bill Preview
router.get('/job-cards/:id/final-bill', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.getFinalBill);

// Step 6: Create Itemized Frozen Invoice (QC_PASSED -> INVOICED)
router.post('/job-cards/:id/invoice', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), invoiceController.createInvoiceFromJobCard);

// Step 6: Public Invoice Summary Fetch (Tokenized / Scoped Access)
router.get('/invoices/public/:id', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return authenticateToken(req, res, next);
  }
  next();
}, invoiceController.getPublicInvoiceById);

// Public Customer Photo Gallery Route (Tokenized / Scoped Access)
router.get('/job-cards/public-gallery/:id', galleryController.getPublicGalleryById);

// Step 6: Server-Side Online Payment Checkout Session
router.post('/payments/checkout-session', (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    return authenticateToken(req, res, next);
  }
  next();
}, invoiceController.createCheckoutSession);

// Step 6: Cryptographic Webhook Handler
router.post('/payments/webhook', invoiceController.handlePaymentWebhook);

// Step 6: Admin/Technician Manual Cash Payment Recording
router.post('/job-cards/:id/mark-paid-cash', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), invoiceController.markPaidCash);
router.get('/job-cards/:id/invoice-pdf', authenticateToken, invoiceController.downloadInvoicePDF);
router.post('/invoices/:id/send-whatsapp', authenticateToken, invoiceController.sendInvoiceWhatsApp);

// Step 7: Vehicle Delivery & History Archiving (PAID -> DELIVERED terminal state)
router.post('/job-cards/:id/deliver', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.deliverJobCard);

// General status & part routes
router.patch('/job-cards/:id/status', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), jobCardController.updateJobStatus);
router.post('/job-cards/:id/parts', authenticateToken, requireRole('TECHNICIAN'), jobCardController.addPartToJobCard);

// Inventory Routes
router.get('/inventory', authenticateToken, inventoryController.getInventory);
router.post('/inventory', authenticateToken, requireRole('ADMIN'), inventoryController.createInventoryItem);
router.put('/inventory/:id', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), inventoryController.updateInventoryItem);
router.patch('/inventory/:id/stock', authenticateToken, requireRole('ADMIN', 'TECHNICIAN'), inventoryController.updateStock);

// Invoice Routes
router.get('/invoices', authenticateToken, invoiceController.getInvoices);
router.post('/invoices', authenticateToken, requireRole('ADMIN'), invoiceController.createInvoiceFromJobCard);
router.post('/invoices/:id/pay', authenticateToken, invoiceController.recordPayment);

// User Management Routes
router.get('/users', authenticateToken, userController.getUsers);
router.post('/users', authenticateToken, requireRole('ADMIN'), userController.createUserByAdmin);
router.post('/admin/technicians', authenticateToken, requireRole('ADMIN'), userController.createUserByAdmin);

// Audit Logs Route (Admin only)
router.get('/audit-logs', authenticateToken, requireRole('ADMIN'), auditController.getAuditLogs);

// Attendance & Clock-In/Out Routes
router.post('/attendance/clock-in', authenticateToken, requireRole('TECHNICIAN', 'ADMIN'), attendanceController.clockIn);
router.post('/attendance/clock-out', authenticateToken, requireRole('TECHNICIAN', 'ADMIN'), attendanceController.clockOut);
router.get('/attendance/today', authenticateToken, attendanceController.getTodayStatus);
router.get('/attendance/history', authenticateToken, attendanceController.getAttendanceHistory);
router.post('/attendance/admin-edit', authenticateToken, requireRole('ADMIN'), attendanceController.adminUpdateAttendance);

// Booking & Slot Scheduling Routes
router.get('/bookings/slots', bookingController.getSlotsByDate);
router.post('/bookings', authenticateToken, bookingController.createBooking);
router.get('/bookings/my-bookings', authenticateToken, bookingController.getCustomerBookings);
router.post('/bookings/:id/cancel', authenticateToken, bookingController.cancelBooking);
router.post('/bookings/:id/reschedule', authenticateToken, bookingController.rescheduleBooking);
router.get('/bookings/admin/schedule', authenticateToken, requireRole('ADMIN'), bookingController.getAdminSchedule);
router.patch('/bookings/:id/status', authenticateToken, requireRole('ADMIN'), bookingController.markBookingStatus);

module.exports = router;
