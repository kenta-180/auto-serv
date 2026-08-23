const { db } = require('../config/firestore');
const jobCardRepository = require('../repositories/jobCardRepository');
const { generateGalleryToken } = require('../controllers/galleryController');
const verificationService = require('./verificationService');

/**
 * Background queue dispatcher for Twilio SMS / WhatsApp progress alerts.
 * Operates asynchronously without blocking the HTTP request thread.
 */
const enqueueTwilioDispatch = async ({ jobCardId, senderUserId, recipientPhone, mediaUrl, messageText, isVerified = true }) => {
  setImmediate(async () => {
    try {
      console.log(`[WhatsApp / Twilio Queue] Dispatching WhatsApp alert to ${recipientPhone} (Verified: ${isVerified}) for JobCard ${jobCardId}...`);
      
      // Simulate external SMS/WhatsApp Gateway call with non-blocking async execution
      await new Promise(resolve => setTimeout(resolve, 300));

      // Record TwilioDispatchLog entry in database
      await jobCardRepository.createDispatchLog({
        jobCardId: jobCardId || null,
        senderUserId: senderUserId || null,
        recipientPhone: recipientPhone || '+15550001122',
        mediaUrl: mediaUrl || null,
        messageText: messageText || 'Stage completion WhatsApp alert from Auto-Serv Workshop',
        status: isVerified ? 'SENT' : 'FALLBACK_UNVERIFIED'
      });

      console.log(`[WhatsApp / Twilio Queue] WhatsApp dispatch logged successfully for JobCard ${jobCardId} (Verified: ${isVerified})`);
    } catch (err) {
      console.error('[WhatsApp / Twilio Queue Error] Failed to process background dispatch:', err);
    }
  });

  return { enqueued: true, status: 'QUEUED' };
};

/**
 * Real-time WhatsApp Notification Dispatcher per Stage Transition & Technician Actions
 */
const sendStageWhatsAppAlert = async ({ jobCard, stageStatus, senderUserId, customNote }) => {
  if (!jobCard) return null;

  const customerName = jobCard.customer?.name || 'Valued Customer';
  const recipientPhone = jobCard.customer?.phone || jobCard.customerPhone || '+15550001122';
  const vehicleStr = `${jobCard.vehicle?.make || ''} ${jobCard.vehicle?.model || ''} (${jobCard.vehicle?.licensePlate || 'Vehicle'})`.trim();
  const cardNum = jobCard.cardNumber || jobCard.id;
  const payUrl = `http://localhost:5173/pay/${jobCard.id}`;

  let whatsappMsg = '';

  switch (stageStatus) {
    case 'CHECKED_IN':
      whatsappMsg = `🟢 *Auto-Serv WhatsApp Alert*\n\nHello ${customerName}! Your vehicle *${vehicleStr}* has been checked in for service (Job Card #${cardNum}). Initial intake & vehicle inspection initiated.`;
      break;

    case 'INSPECTED':
      whatsappMsg = `🔍 *Auto-Serv WhatsApp Alert*\n\nHello ${customerName}! Vehicle inspection completed for *${vehicleStr}* (Job Card #${cardNum}). Diagnostic checklist and part estimates are ready for review.`;
      break;

    case 'ESTIMATE_APPROVED':
      whatsappMsg = `✅ *Auto-Serv WhatsApp Alert*\n\nHello ${customerName}! Estimate approved for *${vehicleStr}* (Job Card #${cardNum}). Total initial estimate: ₹${(jobCard.totalCost || 0).toFixed(2)}. Workshop repair work scheduled.`;
      break;

    case 'ASSIGNED':
      whatsappMsg = `👨‍🔧 *Auto-Serv WhatsApp Alert*\n\nHello ${customerName}! Senior Technician *${jobCard.technician?.name || 'Technician'}* has been assigned to your vehicle *${vehicleStr}* (Job Card #${cardNum}).`;
      break;

    case 'IN_PROGRESS':
      whatsappMsg = `▶️ *Auto-Serv WhatsApp Alert*\n\nHello ${customerName}! Technician *${jobCard.technician?.name || 'Technician'}* clicked *Start Repair* for *${vehicleStr}* (Job Card #${cardNum}). Live repair work is now *IN_PROGRESS*.`;
      break;

    case 'QC_PASSED':
      whatsappMsg = `🎉 *Auto-Serv WhatsApp Alert — Service Complete!*\n\nHello ${customerName}! Technician completed all repairs & Quality Control (QC) PASSED for *${vehicleStr}* (Job Card #${cardNum}).\n\nYour vehicle is ready for pickup/delivery!\n💳 Pay Online & View Invoice: ${payUrl}`;
      break;

    case 'INVOICED':
      whatsappMsg = `📄 *Auto-Serv WhatsApp Alert*\n\nHello ${customerName}! Official Tax Invoice generated for *${vehicleStr}* (Job Card #${cardNum}).\nTotal Amount Billed: ₹${(jobCard.totalCost || 0).toFixed(2)}.\n💳 Pay Securely Online: ${payUrl}`;
      break;

    case 'PAID':
      whatsappMsg = `💵 *Auto-Serv WhatsApp Alert*\n\nThank you ${customerName}! Payment of ₹${(jobCard.totalCost || 0).toFixed(2)} received with thanks for Job Card #${cardNum}. PDF Tax Receipt issued.`;
      break;

    case 'DELIVERED':
      return await sendConsolidatedDeliveryPackage({ jobCardId: jobCard.id, senderUserId });

    default:
      whatsappMsg = `📱 *Auto-Serv WhatsApp Alert*\n\nHello ${customerName}! Stage update for *${vehicleStr}* (Job Card #${cardNum}): ${stageStatus}. ${customNote || ''}`;
  }

  return await enqueueTwilioDispatch({
    jobCardId: jobCard.id,
    senderUserId,
    recipientPhone,
    messageText: whatsappMsg
  });
};

/**
 * Consolidated WhatsApp Delivery Package (Invoice + Photos + Vehicle Details)
 * Triggered at vehicle delivery (JobCard.status = DELIVERED, Step 7)
 */
const sendConsolidatedDeliveryPackage = async ({ jobCardId, senderUserId }) => {
  try {
    const card = await jobCardRepository.findById(jobCardId);

    if (!card) return null;

    const customerName = card.customer?.name || 'Valued Customer';
    const recipientPhone = card.customer?.phone || '+15550001122';
    const isVerified = verificationService.isPhoneVerified(recipientPhone);

    const vehicleStr = `${card.vehicle?.make || ''} ${card.vehicle?.model || ''} (${card.vehicle?.licensePlate || 'Vehicle'})`.trim();
    const cardNum = card.cardNumber || card.id;
    const latestInvoice = card.invoices && card.invoices.length > 0 ? card.invoices[0] : null;
    const totalAmount = latestInvoice ? latestInvoice.totalAmount : card.totalCost;

    // Enforce verified phone check
    if (!isVerified) {
      console.warn(`[WhatsApp Delivery Package] Recipient phone ${recipientPhone} is UNVERIFIED (phoneVerified: false). Blocking WhatsApp delivery package and sending fallback SMS.`);

      await jobCardRepository.createDispatchLog({
        jobCardId: card.id,
        senderUserId: senderUserId || null,
        recipientPhone,
        messageText: `[Unverified Phone Alert] Customer phone ${recipientPhone} is unverified. Consolidated WhatsApp blocked.`,
        status: 'BLOCKED_UNVERIFIED'
      });

      const fallbackSms = `🚘 Auto-Serv Alert: Vehicle ${vehicleStr} (Job Card #${cardNum}) has been delivered. Invoice Total: ₹${totalAmount.toFixed(2)}. Thank you for choosing Auto-Serv!`;
      
      return await enqueueTwilioDispatch({
        jobCardId: card.id,
        senderUserId,
        recipientPhone,
        messageText: fallbackSms,
        isVerified: false
      });
    }

    // Generate secure tokenized public gallery link & invoice link
    const galleryToken = generateGalleryToken(card.id);
    const galleryUrl = `http://localhost:5173/gallery/${card.id}?token=${encodeURIComponent(galleryToken)}`;
    const invoiceUrl = `http://localhost:5173/pay/${card.id}`;

    const whatsappMsg = [
      `🚘 *Auto-Serv Consolidated Delivery Package*`,
      ``,
      `Hello ${customerName}! Your vehicle *${vehicleStr}* (Job Card #${cardNum}) has been safely delivered.`,
      ``,
      `📄 *Official Tax Invoice*: ${latestInvoice ? `#${latestInvoice.invoiceNumber}` : 'Receipt'}`,
      `Total Billed: ₹${totalAmount.toFixed(2)}`,
      `💳 *View & Pay Invoice Online*:`,
      `${invoiceUrl}`,
      ``,
      `📸 *Service Photo Gallery*:`,
      `${galleryUrl}`,
      `(Includes pre-service condition & progress milestone photos)`,
      ``,
      `Thank you for choosing Auto-Serv Workshop! Drive safely.`
    ].filter(Boolean).join('\n');

    console.log(`[WhatsApp Delivery Package] Enqueuing consolidated package for verified number ${recipientPhone}`);

    return await enqueueTwilioDispatch({
      jobCardId: card.id,
      senderUserId,
      recipientPhone,
      messageText: whatsappMsg,
      isVerified: true
    });
  } catch (error) {
    console.error('Error sending consolidated delivery package:', error);
    return null;
  }
};

/**
 * Fetch "Images Sent Today" count for a technician
 */
const getTechImagesSentToday = async (userId) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const snap = await db.collection('twilioDispatchLogs')
      .where('senderUserId', '==', userId)
      .get();

    const count = snap.docs.filter(d => {
      const data = d.data();
      return data.mediaUrl && new Date(data.sentAt || data.createdAt) >= startOfDay;
    }).length;

    return count;
  } catch (error) {
    console.error('Error fetching images sent today:', error);
    return 0;
  }
};

/**
 * Enqueue Automatic WhatsApp Welcome Message on First-Time Phone Verification
 */
const enqueueWhatsAppWelcomeMessage = async ({ phone, userName }) => {
  setImmediate(async () => {
    try {
      console.log(`[WhatsApp Welcome Queue] Preparing welcome message for verified number ${phone}...`);
      
      const cleanedPhone = verificationService.cleanPhoneNumber(phone);
      const nameStr = userName || 'Valued Customer';

      const welcomeText = [
        `👋 *Welcome to Auto-Serv Workshop!* 🚗`,
        ``,
        `Hello ${nameStr}! Your mobile phone number (${cleanedPhone}) has been successfully verified via OTP.`,
        ``,
        `Your Auto-Serv customer account profile is active. Here is what you can now do:`,
        `• 📅 *Book Service Slots*: Schedule fast-track workshop intake slots online.`,
        `• 🚗 *Track Live Repairs*: View real-time inspection photos & repair stage progress.`,
        `• 📄 *Digital Invoices*: Receive instant WhatsApp PDF receipts and pay via UPI.`,
        ``,
        `Thank you for choosing Auto-Serv Workshop!`
      ].join('\n');

      await enqueueTwilioDispatch({
        jobCardId: null,
        senderUserId: null,
        recipientPhone: cleanedPhone,
        mediaUrl: null,
        messageText: welcomeText,
        isVerified: true
      });

      console.log(`[WhatsApp Welcome Queue] WhatsApp welcome message successfully enqueued for ${cleanedPhone} ✓`);
    } catch (err) {
      console.error('[WhatsApp Welcome Queue Warning] Failed to dispatch welcome message:', err?.message || err);
      // Non-blocking: failures logged cleanly without affecting verification response
    }
  });

  return { enqueued: true, status: 'QUEUED' };
};

module.exports = {
  enqueueTwilioDispatch,
  sendStageWhatsAppAlert,
  sendConsolidatedDeliveryPackage,
  enqueueWhatsAppWelcomeMessage,
  getTechImagesSentToday
};
