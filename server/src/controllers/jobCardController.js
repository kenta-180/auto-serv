const jobCardRepository = require('../repositories/jobCardRepository');
const userRepository = require('../repositories/userRepository');
const vehicleRepository = require('../repositories/vehicleRepository');
const inventoryRepository = require('../repositories/inventoryRepository');
const { db } = require('../config/firestore');
const { logAudit } = require('../middleware/audit');
const { enqueueTwilioDispatch, sendStageWhatsAppAlert, getTechImagesSentToday } = require('../services/dispatchQueue');
const aggregateService = require('../services/aggregateService');
const bcrypt = require('bcryptjs');

const getJobCards = async (req, res) => {
  try {
    let whereClause = {};

    if (req.user.role === 'TECHNICIAN') {
      whereClause.technicianId = req.user.id;
    } else if (req.user.role === 'CUSTOMER' || req.user.role === 'STUDENT') {
      whereClause = {
        customerId: req.user.id,
        userEmail: req.user.email,
        userPhone: req.user.phone
      };
    }

    const jobCards = await jobCardRepository.findMany(whereClause);
    res.json(jobCards);
  } catch (error) {
    console.error('Error fetching job cards:', error);
    res.status(500).json({ error: 'Failed to fetch job cards' });
  }
};

const getJobCardById = async (req, res) => {
  try {
    const { id } = req.params;

    const jobCard = await jobCardRepository.findById(id);

    if (!jobCard) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    if (req.user.role === 'CUSTOMER' && jobCard.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'TECHNICIAN' && jobCard.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const imagesSentToday = await getTechImagesSentToday(req.user.id);

    res.json({ ...jobCard, imagesSentToday });
  } catch (error) {
    console.error('Error fetching job card by ID:', error);
    res.status(500).json({ error: 'Failed to fetch job card' });
  }
};

/**
 * STEP 1 — Vehicle Check-In
 */
const createJobCard = async (req, res) => {
  try {
    const {
      title,
      description,
      reportedIssues,
      priority,
      customerId,
      customerName,
      customerEmail,
      customerPhone,
      licensePlate,
      make,
      model,
      year,
      vin,
      mileage,
      fuelLevel,
      estimatedCost,
      laborCost
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Service visit title / primary concern is required' });
    }
    if (!customerId && (!customerEmail || !customerEmail.trim())) {
      return res.status(400).json({ error: 'Customer info (existing selection or email) is required' });
    }
    if (!licensePlate && !req.body.vehicleId) {
      return res.status(400).json({ error: 'Vehicle registration number (license plate) is required' });
    }
    if (mileage !== undefined && mileage !== null && isNaN(Number(mileage))) {
      return res.status(400).json({ error: 'Mileage must be a valid number' });
    }

    const regNumber = licensePlate ? licensePlate.toUpperCase().trim() : null;

    const jobCard = await db.runTransaction(async (transaction) => {
      let targetCustomerId = customerId;

      if (!targetCustomerId && customerEmail) {
        let existingCust = await userRepository.findByEmail(customerEmail.trim(), transaction);
        if (!existingCust) {
          const defaultPasswordHash = await bcrypt.hash('customer123', 10);
          existingCust = await userRepository.create({
            email: customerEmail.trim(),
            passwordHash: defaultPasswordHash,
            name: customerName ? customerName.trim() : 'Valued Customer',
            phone: customerPhone ? customerPhone.trim() : null,
            role: 'CUSTOMER'
          }, transaction);
        }
        targetCustomerId = existingCust.id;
      }

      let targetVehicleId = req.body.vehicleId;

      if (regNumber) {
        let vehicleRecord = await vehicleRepository.findByLicensePlate(regNumber, transaction);
        if (!vehicleRecord) {
          vehicleRecord = await vehicleRepository.create({
            licensePlate: regNumber,
            make: make || 'Generic',
            model: model || 'Sedan',
            year: year ? parseInt(year, 10) : 2023,
            vin: vin || null,
            mileage: mileage ? parseInt(mileage, 10) : 0,
            fuelLevel: fuelLevel || '1/2',
            ownerId: targetCustomerId
          }, transaction);
        }
        targetVehicleId = vehicleRecord.id;
      }

      const issuesFormatted = Array.isArray(reportedIssues) ? reportedIssues.join('\n') : (reportedIssues || description || '');
      const assignedTechId = req.body.technicianId || null;
      const initialStatus = assignedTechId ? 'ASSIGNED' : 'CHECKED_IN';

      const newCard = await jobCardRepository.create({
        title: title.trim(),
        description: description || null,
        reportedIssues: issuesFormatted,
        mileage: mileage ? parseInt(mileage, 10) : 0,
        fuelLevel: fuelLevel || '1/2',
        priority: priority || 'MEDIUM',
        status: initialStatus,
        vehicleId: targetVehicleId,
        customerId: targetCustomerId,
        technicianId: assignedTechId,
        promisedDate: req.body.promisedDate || null
      }, transaction);

      await jobCardRepository.update(newCard.id, {
        estimatedCost: parseFloat(estimatedCost || 0),
        laborCost: parseFloat(laborCost || 0),
        totalCost: parseFloat(laborCost || 0)
      }, transaction);

      await jobCardRepository.createStatusLog({
        jobCardId: newCard.id,
        fromStatus: null,
        toStatus: initialStatus,
        changedById: req.user ? req.user.id : null,
        notes: assignedTechId ? `Vehicle Arrival Check-In created & Technician assigned by ${req.user ? req.user.name : 'User'}` : `Vehicle Intake & Check-In created by ${req.user ? req.user.name : 'User'}`
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'JOB_CARD_CHECKED_IN',
        entity: 'JobCard',
        entityId: newCard.id,
        details: `Vehicle ${regNumber || newCard.vehicleId} checked in with status ${initialStatus}${assignedTechId ? ' (Technician Assigned)' : ''}. Card #: ${newCard.cardNumber}`
      }, transaction);

      return newCard;
    });

    aggregateService.recalculateDashboardAggregates().catch(() => {});

    // Send real-time WhatsApp alert to customer for Stage 1 (CHECKED_IN)
    sendStageWhatsAppAlert({
      jobCard,
      stageStatus: 'CHECKED_IN',
      senderUserId: req.user ? req.user.id : null
    });

    res.status(201).json(jobCard);
  } catch (error) {
    console.error('Error during vehicle Check-In:', error);
    res.status(500).json({ error: error.message || 'Failed to complete vehicle check-in' });
  }
};

/**
 * STEP 2 — Inspection & Optional Pre-Service Photos
 */
const recordInspection = async (req, res) => {
  try {
    const { id } = req.params;
    const { media } = req.body;

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);
      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      const mediaEntries = [];
      if (Array.isArray(media) && media.length > 0) {
        for (const item of media) {
          const url = typeof item === 'string' ? item : item.url;
          const caption = typeof item === 'object' ? item.caption : 'Pre-service condition photo';
          if (url) {
            const m = await jobCardRepository.addJobMedia({
              jobCardId: id,
              url,
              caption,
              type: 'PRE_SERVICE_CONDITION'
            }, transaction);
            mediaEntries.push(m);
          }
        }
      }

      const prevStatus = card.status;
      const updatedCard = await jobCardRepository.update(id, { status: 'INSPECTED' }, transaction);

      await jobCardRepository.createStatusLog({
        jobCardId: id,
        fromStatus: prevStatus,
        toStatus: 'INSPECTED',
        changedById: req.user ? req.user.id : null,
        notes: mediaEntries.length > 0
          ? `Inspection completed with ${mediaEntries.length} pre-service photos by ${req.user ? req.user.name : 'User'}`
          : `Inspection completed by ${req.user ? req.user.name : 'User'} (Photos skipped/optional)`
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'JOB_CARD_INSPECTED',
        entity: 'JobCard',
        entityId: id,
        details: `Initial inspection recorded (${mediaEntries.length} photos uploaded). Status -> INSPECTED`
      }, transaction);

      return updatedCard;
    });

    sendStageWhatsAppAlert({
      jobCard: result,
      stageStatus: 'INSPECTED',
      senderUserId: req.user ? req.user.id : null
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    console.error('Error recording inspection:', error);
    res.status(500).json({ error: 'Failed to record inspection' });
  }
};

/**
 * STEP 2 — Create Job Tasks & Parts Estimates
 */
const createEstimate = async (req, res) => {
  try {
    const { id } = req.params;
    const { tasks, partEstimates } = req.body;

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);
      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      let totalLaborEst = 0;
      let totalPartsEst = 0;

      await jobCardRepository.clearJobCardTasksAndEstimates(id, transaction);

      if (Array.isArray(tasks) && tasks.length > 0) {
        for (const t of tasks) {
          const laborCost = parseFloat(t.estimatedLaborCost || 0);
          totalLaborEst += laborCost;
          await jobCardRepository.addJobTask({
            jobCardId: id,
            description: t.description,
            estimatedLaborCost: laborCost,
            status: 'PENDING'
          }, transaction);
        }
      }

      if (Array.isArray(partEstimates) && partEstimates.length > 0) {
        for (const pe of partEstimates) {
          const qty = parseInt(pe.estimatedQuantity || 1, 10);
          const unitPrice = parseFloat(pe.estimatedUnitPrice || 0);
          const totalPrice = qty * unitPrice;
          totalPartsEst += totalPrice;

          await jobCardRepository.addJobPartEstimate({
            jobCardId: id,
            inventoryItemId: pe.inventoryItemId || null,
            partName: pe.partName || 'Spare Part Estimate',
            estimatedQuantity: qty,
            estimatedUnitPrice: unitPrice,
            estimatedTotalPrice: totalPrice
          }, transaction);
        }
      }

      const totalEstimatedCost = totalLaborEst + totalPartsEst;

      const updatedCard = await jobCardRepository.update(id, {
        estimatedCost: totalEstimatedCost,
        laborCost: totalLaborEst > 0 ? totalLaborEst : card.laborCost,
        totalCost: totalEstimatedCost > 0 ? totalEstimatedCost : card.totalCost
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'JOB_ESTIMATE_CREATED',
        entity: 'JobCard',
        entityId: id,
        details: `Diagnostic tasks & parts estimate created. Total Estimated Cost: ₹${totalEstimatedCost.toFixed(2)}`
      }, transaction);

      return updatedCard;
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    console.error('Error creating estimate:', error);
    res.status(500).json({ error: 'Failed to create estimate' });
  }
};

/**
 * STEP 2 — Approve Estimate & Authorize Work
 */
const approveEstimate = async (req, res) => {
  try {
    const { id } = req.params;
    const { approvalNotes } = req.body;

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);
      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      const prevStatus = card.status;
      const now = new Date().toISOString();

      const updatedCard = await jobCardRepository.update(id, {
        status: 'ESTIMATE_APPROVED',
        approvedAt: now,
        approvedById: req.user ? req.user.id : null,
        approvalNotes: approvalNotes || 'Customer authorized repair estimate to proceed.'
      }, transaction);

      await jobCardRepository.createStatusLog({
        jobCardId: id,
        fromStatus: prevStatus,
        toStatus: 'ESTIMATE_APPROVED',
        changedById: req.user ? req.user.id : null,
        notes: `Estimate approved by ${req.user ? req.user.name : 'User'} at ${now}`
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'ESTIMATE_APPROVED',
        entity: 'JobCard',
        entityId: id,
        details: `Customer authorized repair estimate (₹${card.estimatedCost.toFixed(2)}). Status -> ESTIMATE_APPROVED`
      }, transaction);

      return updatedCard;
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    console.error('Error approving estimate:', error);
    res.status(500).json({ error: 'Failed to approve estimate' });
  }
};

/**
 * STEP 3 — Task & Technician Assignment
 */
const assignTechnician = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianId, assignedTechnicianId } = req.body;
    const techId = technicianId || assignedTechnicianId;

    if (!techId) {
      return res.status(400).json({ error: 'Technician ID is required for assignment' });
    }

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);
      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      const techUser = await userRepository.findById(techId, transaction);
      if (!techUser) throw new Error('TECH_NOT_FOUND');

      const prevStatus = card.status;
      const updatedCard = await jobCardRepository.update(id, {
        technicianId: techId,
        status: 'ASSIGNED'
      }, transaction);

      await jobCardRepository.createStatusLog({
        jobCardId: id,
        fromStatus: prevStatus,
        toStatus: 'ASSIGNED',
        changedById: req.user ? req.user.id : null,
        notes: `Assigned to Master Technician ${techUser.name} by ${req.user ? req.user.name : 'Admin'}`
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'JOB_CARD_ASSIGNED',
        entity: 'JobCard',
        entityId: id,
        details: `Assigned technician ${techUser.name} (${techUser.email}). Status -> ASSIGNED`
      }, transaction);

      return updatedCard;
    });

    sendStageWhatsAppAlert({
      jobCard: result,
      stageStatus: 'ASSIGNED',
      senderUserId: req.user ? req.user.id : null
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    if (error.message === 'TECH_NOT_FOUND') return res.status(404).json({ error: 'Technician user not found' });
    console.error('Error assigning technician:', error);
    res.status(500).json({ error: 'Failed to assign technician' });
  }
};

/**
 * STEP 3 — Parts Checkout & Inventory Draw (FIRESTORE TRANSACTION ATOMICITY GUARANTEE)
 */
const checkoutParts = async (req, res) => {
  try {
    const { id } = req.params;
    const { parts } = req.body;

    if (!Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: 'At least one part is required for checkout' });
    }

    const result = await jobCardRepository.checkoutPartsTransactional({
      jobCardId: id,
      parts,
      userId: req.user ? req.user.id : null
    });

    aggregateService.recalculateDashboardAggregates().catch(() => {});

    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'JOB_CARD_NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({ error: error.message });
    }
    console.error('Error checking out parts:', error);
    res.status(500).json({ error: error.message || 'Failed to checkout inventory parts' });
  }
};

/**
 * STEP 4 — Start Active Servicing
 */
const startJob = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);
      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      const prevStatus = card.status;
      const updatedCard = await jobCardRepository.update(id, { status: 'IN_PROGRESS' }, transaction);

      await jobCardRepository.createStatusLog({
        jobCardId: id,
        fromStatus: prevStatus,
        toStatus: 'IN_PROGRESS',
        changedById: req.user ? req.user.id : null,
        notes: `Technician ${req.user ? req.user.name : 'Tech'} initiated active servicing & repair work`
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'WORK_STARTED_IN_PROGRESS',
        entity: 'JobCard',
        entityId: id,
        details: `Technician started work order execution. Status -> IN_PROGRESS`
      }, transaction);

      return updatedCard;
    });

    sendStageWhatsAppAlert({
      jobCard: result,
      stageStatus: 'IN_PROGRESS',
      senderUserId: req.user ? req.user.id : null
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    console.error('Error starting repair job:', error);
    res.status(500).json({ error: 'Failed to start repair job' });
  }
};

/**
 * STEP 4 — Live Work Progress Media Documentation
 */
const addProgressMedia = async (req, res) => {
  try {
    const { id } = req.params;
    const { url, mediaUrl, caption } = req.body;
    const finalUrl = url || mediaUrl || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70';

    const card = await jobCardRepository.findById(id);

    if (!card) {
      return res.status(404).json({ error: 'Job card not found' });
    }
    if (card.status === 'DELIVERED') {
      return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    }

    const mediaRecord = await jobCardRepository.addJobMedia({
      jobCardId: id,
      url: finalUrl,
      type: 'PROGRESS_UPDATE',
      caption: caption || 'Work in progress milestone update'
    });

    const recipientPhone = card.customer?.phone || '+15550001122';
    const messageText = `🚗 Auto-Serv Progress Update for ${card.vehicle?.make} ${card.vehicle?.model} (${card.vehicle?.licensePlate}): ${mediaRecord.caption}. View update: ${finalUrl}`;

    const dispatchResult = await enqueueTwilioDispatch({
      jobCardId: id,
      senderUserId: req.user ? req.user.id : null,
      recipientPhone,
      mediaUrl: finalUrl,
      messageText
    });

    await logAudit({
      userId: req.user ? req.user.id : null,
      action: 'PROGRESS_MEDIA_UPLOADED',
      entity: 'JobMedia',
      entityId: mediaRecord.id,
      details: `Milestone update recorded (${mediaRecord.caption}). Background notification enqueued.`
    });

    const imagesSentToday = await getTechImagesSentToday(req.user ? req.user.id : null);

    res.status(201).json({
      media: mediaRecord,
      dispatch: dispatchResult,
      imagesSentToday
    });
  } catch (error) {
    console.error('Error adding progress media:', error);
    res.status(500).json({ error: 'Failed to add progress media' });
  }
};

/**
 * STEP 5 — Quality Check Gate (FIRESTORE TRANSACTION)
 */
const recordQC = async (req, res) => {
  try {
    const { id } = req.params;
    const { pass, checklist, notes } = req.body;

    if (pass === undefined) {
      return res.status(400).json({ error: 'QC pass boolean (true/false) is required' });
    }

    const isPassed = Boolean(pass);
    const checklistSummary = typeof checklist === 'object' ? JSON.stringify(checklist) : (checklist || 'Standard Workshop QC Checklist');

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);

      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      const prevStatus = card.status;

      const qcReport = await jobCardRepository.createQCReport({
        jobCardId: id,
        passed: isPassed,
        checklist: checklistSummary,
        notes: notes || (isPassed ? 'QC inspection passed cleanly' : 'QC failed: Rework required'),
        inspectedByUserId: req.user ? req.user.id : null
      }, transaction);

      let finalStatus = 'QC_PASSED';

      if (!isPassed) {
        await jobCardRepository.createStatusLog({
          jobCardId: id,
          fromStatus: prevStatus,
          toStatus: 'QC_FAILED',
          changedById: req.user ? req.user.id : null,
          notes: `QC Inspection FAILED: ${notes || 'Defects found during final inspection.'}`
        }, transaction);

        finalStatus = 'IN_PROGRESS';

        await jobCardRepository.update(id, { status: 'IN_PROGRESS' }, transaction);

        await jobCardRepository.createStatusLog({
          jobCardId: id,
          fromStatus: 'QC_FAILED',
          toStatus: 'IN_PROGRESS',
          changedById: req.user ? req.user.id : null,
          notes: `Reassigned to Technician ${card.technician?.name || 'Assigned Tech'} for immediate rework.`
        }, transaction);

        enqueueTwilioDispatch({
          jobCardId: id,
          senderUserId: req.user ? req.user.id : null,
          recipientPhone: card.technician?.phone || '+15550189922',
          messageText: `⚠️ REWORK ALERT: Job Card ${card.cardNumber} (${card.vehicle?.licensePlate}) failed QC inspection. Notes: ${notes || 'Correction required'}. Reassigned to IN_PROGRESS.`
        });
      } else {
        finalStatus = 'QC_PASSED';
        await jobCardRepository.update(id, { status: 'QC_PASSED' }, transaction);

        await jobCardRepository.createStatusLog({
          jobCardId: id,
          fromStatus: prevStatus,
          toStatus: 'QC_PASSED',
          changedById: req.user ? req.user.id : null,
          notes: `Quality Control Passed: ${notes || 'All safety and performance checks verified.'}`
        }, transaction);
      }

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: isPassed ? 'QC_INSPECTION_PASSED' : 'QC_INSPECTION_FAILED_REWORK',
        entity: 'QCReport',
        entityId: qcReport.id,
        details: `QC Result: ${isPassed ? 'PASSED' : 'FAILED'}. Card #: ${card.cardNumber}. Final Status: ${finalStatus}`
      }, transaction);

      return {
        qcReport,
        finalStatus,
        reassignedToInProgress: !isPassed
      };
    });

    if (result.finalStatus === 'QC_PASSED') {
      const fullJobCard = await jobCardRepository.findById(id);
      sendStageWhatsAppAlert({
        jobCard: fullJobCard,
        stageStatus: 'QC_PASSED',
        senderUserId: req.user ? req.user.id : null
      });
    }

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    console.error('Error recording QC inspection:', error);
    res.status(500).json({ error: 'Failed to record QC inspection' });
  }
};

/**
 * STEP 5 — Get Final Computed Bill Preview
 */
const getFinalBill = async (req, res) => {
  try {
    const { id } = req.params;

    const card = await jobCardRepository.findById(id);

    if (!card) {
      return res.status(404).json({ error: 'Job card not found' });
    }

    const tasksLaborSum = (card.tasks || []).reduce((sum, t) => sum + (t.estimatedLaborCost || 0), 0);
    const laborCost = tasksLaborSum > 0 ? tasksLaborSum : card.laborCost;

    const partsSum = (card.parts || []).reduce((sum, p) => sum + (p.quantity * p.unitPrice), 0);
    const subtotal = laborCost + partsSum;
    const tax = subtotal * 0.10;
    const grandTotal = subtotal + tax;

    res.json({
      jobCardId: card.id,
      cardNumber: card.cardNumber,
      vehicle: `${card.vehicle?.make} ${card.vehicle?.model} (${card.vehicle?.licensePlate})`,
      customer: card.customer?.name,
      laborCost,
      partsCost: partsSum,
      subtotal,
      taxRate: '10%',
      tax,
      grandTotal,
      partsBreakdown: (card.parts || []).map(p => ({
        partName: p.inventoryItem?.name,
        sku: p.inventoryItem?.sku,
        quantityUsed: p.quantity,
        unitPrice: p.unitPrice,
        totalPrice: p.quantity * p.unitPrice
      })),
      tasksBreakdown: (card.tasks || []).map(t => ({
        description: t.description,
        laborCharge: t.estimatedLaborCost
      }))
    });
  } catch (error) {
    console.error('Error computing final bill:', error);
    res.status(500).json({ error: 'Failed to compute final bill' });
  }
};

/**
 * STEP 7 — Vehicle Delivery & History Archiving
 */
const deliverJobCard = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);

      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('ALREADY_DELIVERED');

      const now = new Date().toISOString();
      const prevStatus = card.status;

      const updatedCard = await jobCardRepository.update(id, {
        status: 'DELIVERED',
        deliveredAt: now
      }, transaction);

      await jobCardRepository.createStatusLog({
        jobCardId: id,
        fromStatus: prevStatus,
        toStatus: 'DELIVERED',
        changedById: req.user ? req.user.id : null,
        notes: `Vehicle handed over to customer. Job Card closed & archived permanently at ${now}`
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'VEHICLE_DELIVERED_ARCHIVED',
        entity: 'JobCard',
        entityId: id,
        details: `Vehicle ${card.vehicle?.licensePlate} delivered. JobCard #${card.cardNumber} closed & archived permanently.`
      }, transaction);

      const digitalHandoverReport = {
        certificateId: `CERT-${card.cardNumber}-${Date.now()}`,
        deliveredAt: now,
        status: 'DELIVERED (Archived)',
        vehicle: {
          licensePlate: card.vehicle?.licensePlate,
          make: card.vehicle?.make,
          model: card.vehicle?.model,
          year: card.vehicle?.year,
          mileage: card.mileage,
          fuelLevel: card.fuelLevel
        },
        customer: {
          name: card.customer?.name,
          email: card.customer?.email,
          phone: card.customer?.phone
        },
        technician: card.technician ? card.technician.name : 'Workshop Team',
        workSummary: {
          tasksPerformed: (card.tasks || []).map(t => ({ description: t.description, laborCost: t.estimatedLaborCost })),
          partsConsumed: (card.parts || []).map(p => ({ item: p.inventoryItem?.name, sku: p.inventoryItem?.sku, qty: p.quantity, cost: p.totalPrice })),
          qcPassed: (card.qcReports || []).length > 0 ? card.qcReports[0].passed : true,
          qcInspector: (card.qcReports || []).length > 0 ? card.qcReports[0].inspectedByUser?.name : 'Lead Tech'
        },
        financials: {
          totalCost: card.totalCost,
          invoiceNumber: (card.invoices && card.invoices[0]) ? card.invoices[0].invoiceNumber : 'INV-SETTLED',
          invoiceStatus: (card.invoices && card.invoices[0]) ? card.invoices[0].status : 'PAID',
          paymentMethod: (card.invoices && card.invoices[0]) ? card.invoices[0].paymentMethod : 'CASH_MANUAL_ADMIN'
        },
        mediaGalleryCount: (card.media || []).length,
        mediaUrls: (card.media || []).map(m => ({ url: m.url, caption: m.caption, type: m.type }))
      };

      enqueueTwilioDispatch({
        jobCardId: id,
        senderUserId: req.user ? req.user.id : null,
        recipientPhone: card.customer?.phone || '+15005550006',
        messageText: `Thank you for servicing your ${card.vehicle?.make} ${card.vehicle?.model} (${card.vehicle?.licensePlate}) with Auto-Serv! Please let us know if you have any feedback on your service experience.`,
        mediaUrl: null
      }).catch(err => console.error('Automated post-delivery follow-up queue error:', err));

      return {
        jobCard: updatedCard,
        digitalHandoverReport
      };
    });

    aggregateService.recalculateDashboardAggregates().catch(() => {});

    sendStageWhatsAppAlert({
      jobCard: result.jobCard || result,
      stageStatus: 'DELIVERED',
      senderUserId: req.user ? req.user.id : null
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'ALREADY_DELIVERED') return res.status(400).json({ error: 'Job card is already DELIVERED and archived.' });
    console.error('Error completing vehicle delivery:', error);
    res.status(500).json({ error: 'Failed to complete vehicle delivery' });
  }
};

const updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, technicianId, laborCost, notes } = req.body;

    const validStatuses = [
      'CHECKED_IN',
      'INSPECTED',
      'ESTIMATE_APPROVED',
      'ASSIGNED',
      'IN_PROGRESS',
      'UNFINISHED',
      'DRAFT',
      'QC_PENDING',
      'QC_FAILED',
      'QC_PASSED',
      'INVOICED',
      'PAID',
      'DELIVERED'
    ];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedCard = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);

      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      const prevStatus = card.status;
      let newLaborCost = card.laborCost;
      if (laborCost !== undefined) newLaborCost = parseFloat(laborCost);

      const totalPartsCost = (card.parts || []).reduce((sum, p) => sum + p.totalPrice, 0);
      const newTotalCost = newLaborCost + totalPartsCost;

      const updated = await jobCardRepository.update(id, {
        ...(status && { status }),
        ...(technicianId !== undefined && { technicianId }),
        laborCost: newLaborCost,
        partsCost: totalPartsCost,
        totalCost: newTotalCost
      }, transaction);

      if (status && status !== prevStatus) {
        await jobCardRepository.createStatusLog({
          jobCardId: updated.id,
          fromStatus: prevStatus,
          toStatus: status,
          changedById: req.user ? req.user.id : null,
          notes: notes || `Status updated from ${prevStatus} to ${status}`
        }, transaction);
      }

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'JOB_CARD_UPDATED',
        entity: 'JobCard',
        entityId: updated.id,
        details: `Status: ${prevStatus} -> ${updated.status}`
      }, transaction);

      return updated;
    });

    sendStageWhatsAppAlert({
      jobCard: updatedCard,
      stageStatus: updatedCard.status,
      senderUserId: req.user ? req.user.id : null
    });

    res.json(updatedCard);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    console.error('Error updating job card:', error);
    res.status(500).json({ error: 'Failed to update job card' });
  }
};

const addPartToJobCard = async (req, res) => {
  try {
    const { id } = req.params;
    const { inventoryItemId, quantity } = req.body;

    const qty = parseInt(quantity || 1, 10);
    if (!inventoryItemId || qty <= 0) {
      return res.status(400).json({ error: 'Inventory Item ID and positive quantity required' });
    }

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);
      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      const item = await inventoryRepository.findById(inventoryItemId, transaction);
      if (!item) throw new Error('ITEM_NOT_FOUND');
      if (item.quantity < qty) throw new Error('INSUFFICIENT_STOCK');

      const unitPrice = item.unitPrice;
      const totalPrice = unitPrice * qty;

      await inventoryRepository.updateQuantity(inventoryItemId, item.quantity - qty, transaction);

      const jobPart = await jobCardRepository.addJobCardPart({
        jobCardId: id,
        inventoryItemId,
        quantity: qty,
        unitPrice,
        totalPrice,
        drawnByUserId: req.user ? req.user.id : null
      }, transaction);

      const freshCard = await jobCardRepository.findById(id, transaction);
      const newPartsCost = (freshCard.parts || []).reduce((sum, p) => sum + p.totalPrice, 0);
      const newTotalCost = card.laborCost + newPartsCost;

      await jobCardRepository.update(id, { partsCost: newPartsCost, totalCost: newTotalCost }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'JOB_PART_ADDED',
        entity: 'JobCardPart',
        entityId: jobPart.id,
        inventoryItemId,
        details: `Used ${qty} x ${item.name} for Job Card ${card.cardNumber}`
      }, transaction);

      return jobPart;
    });

    res.status(201).json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    if (error.message === 'ITEM_NOT_FOUND') return res.status(404).json({ error: 'Inventory item not found' });
    if (error.message === 'INSUFFICIENT_STOCK') return res.status(400).json({ error: 'Insufficient stock in inventory' });
    console.error('Error adding part to job card:', error);
    res.status(500).json({ error: 'Failed to add part to job card' });
  }
};

const markUnfinished = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;

    const result = await db.runTransaction(async (transaction) => {
      const card = await jobCardRepository.findById(id, transaction);
      if (!card) throw new Error('NOT_FOUND');
      if (card.status === 'DELIVERED') throw new Error('IS_DELIVERED');

      const prevStatus = card.status;
      const updatedCard = await jobCardRepository.update(id, { status: 'UNFINISHED' }, transaction);

      await jobCardRepository.createStatusLog({
        jobCardId: id,
        fromStatus: prevStatus,
        toStatus: 'UNFINISHED',
        changedById: req.user ? req.user.id : null,
        notes: `Work order marked UNFINISHED / Draft by ${req.user ? req.user.name : 'User'}. Reason: ${reason || notes || 'Work incomplete / awaiting parts or authorization'}`
      }, transaction);

      await logAudit({
        userId: req.user ? req.user.id : null,
        action: 'JOB_CARD_MARKED_UNFINISHED',
        entity: 'JobCard',
        entityId: id,
        details: `Job card marked UNFINISHED. Reason: ${reason || notes || 'Work incomplete'}`
      }, transaction);

      return updatedCard;
    });

    res.json(result);
  } catch (error) {
    if (error.message === 'NOT_FOUND') return res.status(404).json({ error: 'Job card not found' });
    if (error.message === 'IS_DELIVERED') return res.status(400).json({ error: 'Job card is DELIVERED and archived. Mutations are permanently disabled.' });
    console.error('Error marking job card unfinished:', error);
    res.status(500).json({ error: 'Failed to mark job card unfinished' });
  }
};

module.exports = {
  getJobCards,
  getJobCardById,
  createJobCard,
  recordInspection,
  createEstimate,
  approveEstimate,
  assignTechnician,
  checkoutParts,
  startJob,
  addProgressMedia,
  recordQC,
  getFinalBill,
  deliverJobCard,
  markUnfinished,
  updateJobStatus,
  addPartToJobCard
};
