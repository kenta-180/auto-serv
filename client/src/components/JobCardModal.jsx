import React, { useState, useEffect } from 'react';
import { 
  X, Wrench, Package, FileText, CheckCircle, Clock, Fuel, Gauge, 
  Camera, ShieldCheck, UserCheck, ShoppingCart, Play, Send, CheckSquare, 
  AlertOctagon, DollarSign, CreditCard, Lock, Award, CheckCircle2, ChevronRight, 
  ArrowRight, ShieldAlert, Layers, User, Car, Barcode, Pause, WifiOff, Zap, Search
} from 'lucide-react';
import { api } from '../services/api';
import VoiceInputButton from './common/VoiceInputButton';
import CameraCaptureModal from './common/CameraCaptureModal';
import VehicleSpecsModal from './common/VehicleSpecsModal';
import BarcodeScannerModal from './common/BarcodeScannerModal';
import { enqueueOfflineAction, getOfflineQueue, processOfflineQueue } from '../services/offlineQueue';
import { useLanguage } from '../context/LanguageContext';

// Single Reusable Step Container Component driving all 7 Workshop Lifecycle Steps
function StepCard({ icon: Icon, stepNumber, title, status, statusBadgeClass, color = '#2563eb', children }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-color)',
      borderRadius: '12px',
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div style={{
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '10px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: 0 }}>
          {Icon && <Icon size={18} color={color} style={{ flexShrink: 0 }} />}
          <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <span style={{ color, fontSize: '13px', fontWeight: '700', marginRight: '6px' }}>Step {stepNumber}:</span>
            {title}
          </h3>
        </div>
        {status && (
          <span className={`badge ${statusBadgeClass || 'badge-assigned'}`} style={{ fontSize: '11px', padding: '3px 8px', flexShrink: 0 }}>
            {status}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  );
}

export default function JobCardModal({ jobCard, inventory = [], technicians = [], jobCards = [], onClose, onRefresh, currentUser }) {
  const { t, getStatusLabel, formatCurrency } = useLanguage();
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const safeTechnicians = Array.isArray(technicians) ? technicians : [];
  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];

  // Modal feedback & loader state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Step 7 Handover Report state
  const [handoverReport, setHandoverReport] = useState(null);

  // Step 6 Payment state
  const [checkoutSession, setCheckoutSession] = useState(null);
  const [cashNotes, setCashNotes] = useState('');

  // Step 5 QC state
  const [qcPass, setQcPass] = useState(true);
  const [qcNotes, setQcNotes] = useState('');
  const [checkBrakes, setCheckBrakes] = useState(true);
  const [checkFluids, setCheckFluids] = useState(true);
  const [checkRoadTest, setCheckRoadTest] = useState(true);
  const [checkDiagnosticScan, setCheckDiagnosticScan] = useState(true);

  // Step 5 Final Bill state
  const [finalBill, setFinalBill] = useState(null);

  // Real-Time Camera Modal State
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraTarget, setCameraTarget] = useState('INSPECTION'); // 'INSPECTION' | 'PROGRESS'

  // Step 4 Progress Media state
  const [progressMediaUrl, setProgressMediaUrl] = useState('');
  const [progressCaption, setProgressCaption] = useState('');

  // Technician Assignment state
  const [selectedTechId, setSelectedTechId] = useState(jobCard?.technicianId || (safeTechnicians[0]?.id || ''));

  // Checkout Parts state
  const [checkoutItemId, setCheckoutItemId] = useState(safeInventory[0]?.id || '');
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [partSearchQuery, setPartSearchQuery] = useState('');

  // Inspection Media state
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoCaption, setPhotoCaption] = useState('');
  
  // Estimate Task & Part state
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCost, setTaskCost] = useState('');
  const [estPartName, setEstPartName] = useState('');
  const [estPartQty, setEstPartQty] = useState('');
  const [estPartUnitPrice, setEstPartUnitPrice] = useState('');

  // Vehicle Specs Cheat-Sheet Modal state
  const [showSpecsModal, setShowSpecsModal] = useState(false);

  // Feature 1: Barcode/QR Scanner Modal State
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Feature 2: Canned Note Templates State
  const [cannedNotes, setCannedNotes] = useState([]);

  // Feature 3: Automatic Per-Task Time Tracking State
  const [timeLogs, setTimeLogs] = useState([]);
  const [totalTimeLoggedSecs, setTotalTimeLoggedSecs] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Feature 5: Offline Mode State
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState(getOfflineQueue().length);

  // Feature 4: Draft Job Summary State
  const [draftSummary, setDraftSummary] = useState('');

  // Expandable Timeline & Section Dropdown States
  const [showAllTimeline, setShowAllTimeline] = useState(false);
  const [showAllParts, setShowAllParts] = useState(false);
  const [showAllTechHistory, setShowAllTechHistory] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Load Canned Notes & Time Logs on Mount/ID Change
  useEffect(() => {
    api.getCannedNotes().then(res => setCannedNotes(res || [])).catch(() => {});
    if (jobCard?.id) {
      loadTimeLogs();
    }
  }, [jobCard?.id]);

  // Offline Sync Listener
  useEffect(() => {
    const handleOnline = async () => {
      setIsOffline(false);
      const { processed } = await processOfflineQueue(api);
      if (processed > 0) {
        setSuccessMsg(`✓ Back Online: ${processed} offline changes automatically synced to server!`);
        safeRefresh();
      }
      setOfflineQueueCount(getOfflineQueue().length);
    };
    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Timer Stopwatch Ticker Effect
  useEffect(() => {
    let interval = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTotalTimeLoggedSecs(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  const loadTimeLogs = async () => {
    if (!jobCard?.id) return;
    const data = await api.getTimeLogs(jobCard.id);
    setTimeLogs(data.logs || []);
    setTotalTimeLoggedSecs(data.totalSeconds || 0);
    const hasRunning = (data.logs || []).some(l => l.endedAt === null);
    setIsTimerRunning(hasRunning || jobCard.status === 'IN_PROGRESS');
  };

  const formatStopwatch = (totalSecs) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = totalSecs % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleAddPresetTasks = async (presetType) => {
    let presetItems = [];
    if (presetType === 'OIL_SERVICE') {
      presetItems = [
        { taskDesc: 'Engine Oil Drain & Refill (5W-30 Synthetic)', taskCost: 350, estPartName: '5W30 Synthetic Oil (4L)', estPartQty: 1, estPartUnitPrice: 1800 },
        { taskDesc: 'Oil Filter Replacement & O-ring Torque', taskCost: 150, estPartName: 'Oil Filter Cartridge', estPartQty: 1, estPartUnitPrice: 350 },
        { taskDesc: 'Inspect Air & Cabin Filter Condition', taskCost: 100, estPartName: 'Air Filter Element', estPartQty: 1, estPartUnitPrice: 450 }
      ];
    } else if (presetType === 'BRAKE_SERVICE') {
      presetItems = [
        { taskDesc: 'Inspect Front & Rear Brake Pad Thickness (mm)', taskCost: 400, estPartName: 'Front Ceramic Brake Disc', estPartQty: 2, estPartUnitPrice: 1200 },
        { taskDesc: 'Flush & Bleed Brake Fluid Lines (DOT 4)', taskCost: 300, estPartName: 'DOT 4 Brake Fluid (500ml)', estPartQty: 1, estPartUnitPrice: 250 },
        { taskDesc: 'Clean Caliper Slides & Torque Mounting Bolts', taskCost: 250, estPartName: 'Brake Cleaner Spray', estPartQty: 1, estPartUnitPrice: 180 }
      ];
    } else if (presetType === 'PERIODIC_20POINT') {
      presetItems = [
        { taskDesc: 'Multi-point Battery Voltage & Alternator Test', taskCost: 200, estPartName: 'Battery Terminal Protector', estPartQty: 1, estPartUnitPrice: 80 },
        { taskDesc: 'Inspect Radiator Hoses & Belt Tension', taskCost: 200, estPartName: 'Coolant Antifreeze (1L)', estPartQty: 1, estPartUnitPrice: 350 },
        { taskDesc: 'Check & Top-up Coolant, Brake & Washer Fluid', taskCost: 150, estPartName: 'Windshield Washer Fluid', estPartQty: 1, estPartUnitPrice: 120 },
        { taskDesc: 'Tire Tread Depth & Pressure Check (32 PSI)', taskCost: 150, estPartName: 'Tire Valve Caps Set', estPartQty: 1, estPartUnitPrice: 50 }
      ];
    }

    try {
      setLoading(true);
      setError('');
      for (const item of presetItems) {
        await api.createEstimate(
          jobCard.id,
          [item.taskDesc],
          item.taskCost,
          [{ name: item.estPartName, quantity: item.estPartQty, unitPrice: item.estPartUnitPrice }]
        );
      }
      setSuccessMsg(`✓ ⚡ Auto-filled ${presetItems.length} checklist tasks & estimated parts!`);
      safeRefresh();
    } catch (err) {
      setError('Failed to auto-fill checklist preset: ' + (err.message || 'Server error'));
    } finally {
      setLoading(false);
    }
  };

  const canEdit = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'TECHNICIAN') && jobCard?.status !== 'DELIVERED';
  const isAdmin = currentUser && currentUser.role === 'ADMIN';

  const activeInvoice = jobCard?.invoices && jobCard.invoices.find(inv => inv.status !== 'CANCELLED');

  const safeRefresh = () => {
    if (typeof onRefresh === 'function') {
      onRefresh();
    }
  };

  const safeClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleCameraCapturedPhoto = ({ dataUrl, capturedAt, timeZone }) => {
    const timeNote = `[Captured: ${new Date(capturedAt).toLocaleString()} (${timeZone || 'UTC'})]`;
    if (cameraTarget === 'INSPECTION') {
      setPhotoUrl(dataUrl);
      if (!photoCaption.includes('[Captured:')) {
        setPhotoCaption(prev => `${prev ? prev + ' ' : ''}${timeNote}`);
      }
      setSuccessMsg('📸 Real-time camera inspection photo captured! Click Upload & Inspect to record.');
    } else if (cameraTarget === 'PROGRESS') {
      setProgressMediaUrl(dataUrl);
      if (!progressCaption.includes('[Captured:')) {
        setProgressCaption(prev => `${prev ? prev + ' ' : ''}${timeNote}`);
      }
      setSuccessMsg('📸 Real-time camera milestone photo captured! Click Send Photo Update to record.');
    }
  };

  const loadFinalBill = async () => {
    try {
      if (!jobCard?.id) return;
      if (currentUser?.role === 'CUSTOMER' || currentUser?.role === 'STUDENT') return;
      const billData = await api.getFinalBill(jobCard.id);
      setFinalBill(billData);
    } catch (err) {
      console.error('Failed to compute final bill:', err);
    }
  };

  useEffect(() => {
    if (jobCard?.id) {
      loadFinalBill();
    }
  }, [jobCard?.id]);

  if (!jobCard) return null;

  const allMedia = Array.isArray(jobCard.media) ? jobCard.media : [];
  const progressPhotos = allMedia.filter(m => m && (m.type === 'PROGRESS_UPDATE' || !m.type));
  const inspectionPhotos = allMedia.filter(m => m && (m.type === 'INSPECTION' || m.type === 'PRE_SERVICE_CONDITION'));
  const qcReports = jobCard.qcReports || [];
  const latestQC = qcReports.length > 0 ? qcReports[qcReports.length - 1] : null;

  const handleAddEstimate = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!taskDesc && !estPartName) {
      setError('Please provide either a labor task or part estimate name');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const tasks = taskDesc ? [{ description: taskDesc, estimatedLaborCost: parseFloat(taskCost || 0) }] : [];
      const partEstimates = estPartName ? [{
        partName: estPartName,
        estimatedQuantity: parseInt(estPartQty || 1, 10),
        estimatedUnitPrice: parseFloat(estPartUnitPrice || 0)
      }] : [];

      await api.createEstimate(jobCard.id, { tasks, partEstimates });
      setSuccessMsg('Estimate added cleanly!');
      setTaskDesc('');
      setEstPartName('');
      safeRefresh();
      loadFinalBill();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to add estimate'));
    } finally {
      setLoading(false);
    }
  };

  const handleApproveEstimate = async () => {
    try {
      setLoading(true);
      setError('');
      await api.updateJobStatus(jobCard.id, { status: 'ESTIMATE_APPROVED' });
      setSuccessMsg('Customer Estimate Approved! Work status updated to ESTIMATE_APPROVED.');
      safeRefresh();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to approve estimate'));
    } finally {
      setLoading(false);
    }
  };

  const handleStartJob = async () => {
    try {
      setLoading(true);
      setError('');
      await api.startJob(jobCard.id);
      await api.startTimeLog(jobCard.id).catch(() => {});
      setIsTimerRunning(true);
      setSuccessMsg('⏱️ Work order execution initiated & active repair timer started!');
      safeRefresh();
      loadTimeLogs();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to start repair job'));
    } finally {
      setLoading(false);
    }
  };

  const handleMarkUnfinished = async () => {
    try {
      setLoading(true);
      setError('');
      await api.markUnfinished(jobCard.id, 'Work order paused / incomplete (Draft state)');
      await api.pauseTimeLog(jobCard.id).catch(() => {});
      setIsTimerRunning(false);
      setSuccessMsg('⚠️ Job card status updated to UNFINISHED & repair timer paused.');
      safeRefresh();
      loadTimeLogs();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to mark job card unfinished'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTimer = async () => {
    try {
      if (isTimerRunning) {
        await api.pauseTimeLog(jobCard.id);
        setIsTimerRunning(false);
        setSuccessMsg('⏱️ Active repair timer paused.');
      } else {
        await api.startTimeLog(jobCard.id);
        setIsTimerRunning(true);
        setSuccessMsg('⏱️ Active repair timer resumed & tracking.');
      }
      loadTimeLogs();
    } catch (err) {
      setError(err.message || 'Failed to toggle repair timer');
    }
  };

  const handleAddProgressMedia = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!navigator.onLine) {
      enqueueOfflineAction('PROGRESS_NOTE', { jobCardId: jobCard.id, url: progressMediaUrl, caption: progressCaption });
      setOfflineQueueCount(getOfflineQueue().length);
      setSuccessMsg('⚡ Offline Mode: Progress note saved locally! Will automatically sync when reconnected.');
      setProgressMediaUrl('');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.addProgressMedia(jobCard.id, progressMediaUrl || '', progressCaption || 'Work progress milestone');
      setSuccessMsg(progressMediaUrl ? 'Progress milestone photo uploaded!' : 'Progress update recorded without photos.');
      setProgressMediaUrl('');
      safeRefresh();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to add progress media'));
    } finally {
      setLoading(false);
    }
  };

  const handleAssignTechnician = async () => {
    if (!selectedTechId) {
      setError('Please select a technician to assign');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.assignTechnician(jobCard.id, selectedTechId);
      setSuccessMsg('Technician assigned successfully! Status updated to ASSIGNED.');
      safeRefresh();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to assign technician'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckoutParts = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!checkoutItemId || parseInt(checkoutQty, 10) <= 0) {
      setError('Select a valid inventory item and positive quantity to draw');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.checkoutParts(jobCard.id, [{ inventoryItemId: checkoutItemId, quantity: parseInt(checkoutQty, 10) }]);
      setSuccessMsg('Inventory parts checked out & stock decremented cleanly!');
      safeRefresh();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to checkout inventory parts'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecordInspection = async (e, skipPhotos = false) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const mediaPayload = (!skipPhotos && photoUrl) ? [{ url: photoUrl, caption: photoCaption }] : [];
      await api.recordInspection(jobCard.id, mediaPayload);
      setSuccessMsg(skipPhotos ? 'Pre-service condition recorded without photos.' : 'Pre-service condition photos uploaded!');
      setPhotoUrl('');
      safeRefresh();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to record inspection'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecordQC = async (passStatus) => {
    try {
      setLoading(true);
      setError('');

      const checklistSummary = {
        brakeTorqueVerified: checkBrakes,
        fluidLevelsToMax: checkFluids,
        roadTestPassed: checkRoadTest,
        diagnosticClear: checkDiagnosticScan
      };

      const result = await api.recordQC(jobCard.id, passStatus, qcNotes, checklistSummary);
      if (passStatus) {
        setSuccessMsg('✓ Quality Control Inspection PASSED! Status updated to QC_PASSED.');
      } else {
        setSuccessMsg('⚠️ Quality Control FAILED. Rework logged and job reassigned to IN_PROGRESS.');
      }
      safeRefresh();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to record QC inspection'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeliverVehicle = async () => {
    try {
      setLoading(true);
      setError('');
      const deliverFn = api.deliverVehicle || api.deliverJobCard;
      const result = await deliverFn(jobCard.id);
      setHandoverReport(result?.digitalHandoverReport || null);
      setSuccessMsg('🎉 Vehicle Handover Complete! Status updated to DELIVERED & archived permanently.');
      safeRefresh();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to complete vehicle delivery'));
    } finally {
      setLoading(false);
    }
  };

  const isDelivered = jobCard.status === 'DELIVERED';

  const steps = [
    { key: 'CHECKED_IN', label: '1. Intake' },
    { key: 'INSPECTED', label: '2. Inspection' },
    { key: 'ESTIMATE_APPROVED', label: '3. Estimate' },
    { key: 'ASSIGNED', label: '4. Assign & Draw' },
    { key: 'IN_PROGRESS', label: '5. Work Execution' },
    { key: 'QC_PENDING', label: '6. QC Gate' },
    { key: 'QC_PASSED', label: '7. QC Passed' },
    { key: 'INVOICED', label: '8. Billing' },
    { key: 'PAID', label: '9. Paid' },
    { key: 'DELIVERED', label: '10. Delivered' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === jobCard.status);

  return (
    <div className="modal-overlay" onClick={safeClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '940px', 
          maxHeight: '80vh', 
          overflowY: 'auto', 
          padding: '14px 16px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px'
        }}
      >
        
        {/* Scrollable Header Bar */}
        <div style={{ background: 'var(--bg-card)', paddingTop: '4px', paddingBottom: '14px', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: '1', minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', color: '#2563eb', fontWeight: '800' }}>{jobCard.cardNumber}</span>
                <span className={`badge badge-${jobCard.status?.toLowerCase()}`} style={{ fontSize: '12px', padding: '4px 10px' }}>{jobCard.status}</span>
                {isDelivered && <span style={{ fontSize: '11px', color: '#059669', fontWeight: '700', background: 'rgba(16, 185, 129, 0.15)', padding: '3px 8px', borderRadius: '4px' }}>🔒 CLOSED ARCHIVE</span>}
                {currentUser?.role !== 'CUSTOMER' && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowSpecsModal(true)}
                    style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid #3b82f6', fontSize: '11px', height: '32px', minHeight: '32px', padding: '0 10px', marginLeft: 'auto' }}
                  >
                    ⚡ Vehicle Specs & Torque Cheat-Sheet
                  </button>
                )}
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: '900', marginTop: '4px', color: 'var(--text-main)', wordBreak: 'break-word', lineHeight: '1.2' }}>{jobCard.title}</h2>
            </div>
            <button 
              type="button" 
              onClick={safeClose} 
              style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', width: '44px', height: '44px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              aria-label="Close console"
            >
              <X size={22} />
            </button>
          </div>

          {/* Horizontally Slideable Lifecycle Stepper (Hidden for Customer Role) */}
          {currentUser?.role !== 'CUSTOMER' && (
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                overflowX: 'auto', 
                marginTop: '12px', 
                paddingBottom: '6px',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'thin'
              }}
            >
              {steps.map((s, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                return (
                  <React.Fragment key={s.key}>
                    <div 
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: isCurrent ? '800' : '600',
                        border: isCurrent ? '1px solid #3b82f6' : '1px solid var(--border-color)',
                        background: isCurrent ? '#2563eb' : (isCompleted ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-dark)'),
                        color: isCurrent ? '#ffffff' : (isCompleted ? '#059669' : 'var(--text-muted)'),
                        whiteSpace: 'nowrap',
                        flexShrink: 0
                      }}
                    >
                      {isCompleted ? '✓ ' : ''}{s.label}
                    </div>
                    {idx < steps.length - 1 && <ChevronRight size={12} color="#64748b" style={{ flexShrink: 0 }} />}
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {(isOffline || offlineQueueCount > 0) && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid #f59e0b',
            color: '#fbbf24',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            fontWeight: '700'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <WifiOff size={16} />
              <span>⚡ Offline Mode Active — {offlineQueueCount} action(s) saved locally. Will auto-sync when Wi-Fi returns.</span>
            </div>
            {navigator.onLine && offlineQueueCount > 0 && (
              <button 
                type="button" 
                className="btn btn-warning btn-sm"
                onClick={async () => {
                  const { processed } = await processOfflineQueue(api);
                  setOfflineQueueCount(getOfflineQueue().length);
                  if (processed > 0) {
                    setSuccessMsg(`✓ Manually synced ${processed} offline queued action(s)!`);
                    safeRefresh();
                  }
                }}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                Sync Now ⚡
              </button>
            )}
          </div>
        )}

        {checkBrakes && checkFluids && checkRoadTest && checkDiagnosticScan && (jobCard.status === 'IN_PROGRESS' || jobCard.status === 'ASSIGNED') && (
          <div style={{
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid #3b82f6',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justify: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            marginBottom: '14px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#2563eb" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>⚡ Smart Suggestion: All 4 DVI Checklist Items Verified!</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Ready to submit this vehicle for Quality Control (QC Inspection)?</div>
              </div>
            </div>
            <button 
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleRecordQC(true)}
              disabled={loading}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <ShieldCheck size={14} /> Send to QC Pass →
            </button>
          </div>
        )}

        {error && <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#dc2626', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>{error}</div>}
        {successMsg && <div style={{ padding: '10px 14px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#059669', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>{successMsg}</div>}

        {/* SINGLE-PAGE UNIFIED STEP WORKSTATION CONTAINER */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* STEP 1: VEHICLE & CUSTOMER INTAKE DETAILS */}
          <StepCard icon={Car} stepNumber={1} title="Vehicle & Customer Intake Summary" status="CHECKED_IN" statusBadgeClass="badge-checked_in" color="#2563eb">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Vehicle Info</div>
                <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', marginTop: '2px' }}>{jobCard.vehicle?.make} {jobCard.vehicle?.model}</div>
                <div style={{ color: '#2563eb', fontWeight: '700' }}>Plate: {jobCard.vehicle?.licensePlate}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Customer Contact</div>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', marginTop: '2px' }}>{jobCard.customer?.name}</div>
                <div style={{ color: 'var(--text-muted)' }}>{jobCard.customer?.phone || jobCard.customer?.email}</div>
              </div>

              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Intake Metrics</div>
                <div style={{ marginTop: '2px' }}>Odometer: <strong style={{ color: 'var(--text-main)' }}>{jobCard.mileage} km</strong></div>
                <div>Fuel Gauge: <strong style={{ color: 'var(--text-main)' }}>{jobCard.fuelLevel}</strong></div>
              </div>
            </div>

            {/* Real Profitability Snapshot (Admin View) */}
            {isAdmin && (() => {
              const jobTotal = jobCard.totalCost || 0;
              const jobLabor = jobCard.laborCost || 0;
              const jobParts = jobCard.partsCost || 0;
              const jobNetMargin = jobTotal - (jobLabor + jobParts);
              const isJobPos = jobNetMargin >= 0;
              const jobMarginPct = jobTotal > 0 ? Math.round((jobNetMargin / jobTotal) * 100) : 0;
              const formattedMarginStr = isJobPos 
                ? `+₹${jobNetMargin.toFixed(2)}` 
                : `-₹${Math.abs(jobNetMargin).toFixed(2)}`;

              return (
                <div style={{
                  background: 'var(--bg-dark)',
                  border: '1px solid var(--border-color)',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: '800', color: isJobPos ? '#059669' : '#dc2626', textTransform: 'uppercase' }}>
                      📊 REAL PROFITABILITY SNAPSHOT (ADMIN VIEW)
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>
                      Invoice (₹{jobTotal.toFixed(2)}) &minus; Labor (₹{jobLabor.toFixed(2)}) &minus; Parts (₹{jobParts.toFixed(2)})
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>Net Margin</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: isJobPos ? '#059669' : '#dc2626' }}>
                        {formattedMarginStr}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '700' }}>Profit %</div>
                      <div style={{ fontSize: '15px', fontWeight: '800', color: isJobPos ? '#2563eb' : '#dc2626' }}>
                        {jobMarginPct}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {jobCard.reportedIssues && (
              <div style={{ background: 'var(--bg-dark)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid #3b82f6', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>Reported Customer Issues</div>
                <div style={{ fontSize: '13px', color: 'var(--text-main)', marginTop: '2px', fontWeight: '600' }}>{jobCard.reportedIssues}</div>
              </div>
            )}
          </StepCard>

          {/* TECHNICIAN CAPTURED PHOTO GALLERY CARD (VISIBLE TO CUSTOMERS & ALL ROLES) */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid #3b82f6',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Camera size={20} color="#2563eb" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                  Technician Vehicle Inspection & Repair Photos ({allMedia.length})
                </h3>
              </div>
              <span style={{ fontSize: '11px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid #3b82f6', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
                📸 LIVE CONSOLE GALLERY
              </span>
            </div>

            {allMedia.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px' }}>
                {allMedia.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    onClick={() => setPreviewImage(m)}
                    style={{
                      position: 'relative',
                      background: 'var(--bg-dark)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <img
                      src={m.url}
                      alt={m.caption || 'Technician photo'}
                      style={{ width: '100%', height: '95px', objectFit: 'cover' }}
                      onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400'; }}
                    />
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      left: '4px',
                      fontSize: '9px',
                      fontWeight: '800',
                      background: m.type === 'INSPECTION' ? 'rgba(59, 130, 246, 0.85)' : 'rgba(16, 185, 129, 0.85)',
                      color: '#ffffff',
                      padding: '2px 5px',
                      borderRadius: '4px',
                      textTransform: 'uppercase'
                    }}>
                      {m.type === 'INSPECTION' ? 'Intake' : 'Repair'}
                    </div>
                    <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.caption || (m.type === 'INSPECTION' ? 'Pre-service inspection' : 'Repair progress milestone')}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '20px 16px', background: 'var(--bg-dark)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-muted)' }}>
                <Camera size={24} style={{ margin: '0 auto 8px auto', display: 'block', opacity: 0.5 }} />
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#cbd5e1' }}>No Technician Inspection Photos Uploaded Yet</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Inspection and repair milestone photos clicked by your technician will automatically appear here in real-time.
                </div>
              </div>
            )}
          </div>

          {/* STEP 2: PRE-SERVICE INSPECTION & DIAGNOSTIC ESTIMATE */}
          <StepCard icon={Camera} stepNumber={2} title="Pre-Service Inspection & Diagnostic Estimate" status={jobCard.status === 'CHECKED_IN' ? 'CHECKED_IN' : 'INSPECTED'} statusBadgeClass="badge-inspected" color="#38bdf8">
            {canEdit && jobCard.status === 'CHECKED_IN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>Pre-Service Condition Inspection</span>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={() => { setCameraTarget('INSPECTION'); setShowCameraModal(true); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px', padding: '6px 12px', fontSize: '12px' }}
                  >
                    <Camera size={14} /> 📸 Snap Live Camera Photo
                  </button>
                </div>

                {photoUrl && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e293b', padding: '8px 12px', borderRadius: '6px', border: '1px solid #10b981' }}>
                    <img src={photoUrl} alt="Live captured photo" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                    <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '700' }}>✓ Live Camera Snapshot Attached</div>
                  </div>
                )}

                {/* 1-Tap Photo Tag Shortcuts */}
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center', margin: '4px 0' }}>
                  <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginRight: '4px' }}>Quick Tag:</span>
                  {['📷 Odometer & Fuel', '📷 Engine Bay Inspection', '📷 Old vs New Parts', '📷 Underbody & Suspension', '📷 Pre-Service Scratches'].map((tag, tagIdx) => (
                    <button
                      key={tagIdx}
                      type="button"
                      onClick={() => setPhotoCaption(tag)}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#60a5fa', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <form onSubmit={e => handleRecordInspection(e, false)}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input type="text" className="form-control" value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="Caption / Damage note" style={{ flex: '1 1 200px', minHeight: '38px' }} />
                    <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: '1 1 120px', minHeight: '38px', justifyContent: 'center' }}>
                      Upload & Inspect
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={e => handleRecordInspection(e, true)} disabled={loading} style={{ flex: '1 1 140px', minHeight: '38px', justifyContent: 'center' }}>
                      Skip Photos & Complete
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Diagnostic Task & Part Estimate Builder + 1-Tap Presets Bar */}
            {canEdit && (
              <form onSubmit={handleAddEstimate} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#a5b4fc' }}>Diagnostic Labor Task & Parts Estimate</div>
                  
                  {/* 1-Tap Auto-Fill Checklist Presets */}
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddPresetTasks('OIL_SERVICE')}
                      disabled={loading}
                      style={{ fontSize: '10px', height: '26px', minHeight: '26px', padding: '0 8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid #3b82f6' }}
                    >
                      ⚡ 🛢️ Oil & Filter Service
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddPresetTasks('BRAKE_SERVICE')}
                      disabled={loading}
                      style={{ fontSize: '10px', height: '26px', minHeight: '26px', padding: '0 8px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid #f59e0b' }}
                    >
                      ⚡ 🛑 Brake Overhaul
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleAddPresetTasks('PERIODIC_20POINT')}
                      disabled={loading}
                      style={{ fontSize: '10px', height: '26px', minHeight: '26px', padding: '0 8px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid #10b981' }}
                    >
                      ⚡ 🔍 20-Point Check
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                  <input type="text" className="form-control" placeholder="Diagnostic Task Description" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} style={{ minHeight: '38px' }} />
                  <input type="number" className="form-control" placeholder="Labor Cost (₹)" value={taskCost} onChange={e => setTaskCost(e.target.value)} style={{ minHeight: '38px' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', alignItems: 'end' }}>
                  <input type="text" className="form-control" placeholder="Estimated Part Name" value={estPartName} onChange={e => setEstPartName(e.target.value)} style={{ minHeight: '38px' }} />
                  <input type="number" min="1" className="form-control" placeholder="Qty" value={estPartQty} onChange={e => setEstPartQty(e.target.value)} style={{ minHeight: '38px' }} />
                  <input type="number" step="0.01" className="form-control" placeholder="Unit Price" value={estPartUnitPrice} onChange={e => setEstPartUnitPrice(e.target.value)} style={{ minHeight: '38px' }} />
                  <button type="submit" className="btn btn-primary" disabled={loading} style={{ minHeight: '38px', justifyContent: 'center' }}>
                    Add Estimate
                  </button>
                </div>
              </form>
            )}

            {/* Customer Approval Button */}
            {jobCard.status === 'INSPECTED' && (
              <button className="btn btn-success" onClick={handleApproveEstimate} disabled={loading} style={{ minHeight: '38px', justifyContent: 'center', width: '100%' }}>
                ✓ Customer Authorize Repair Estimate (Move to ESTIMATE_APPROVED)
              </button>
            )}
          </StepCard>

          {/* STEP 3: TECHNICIAN ASSIGNMENT & INVENTORY PARTS DRAW */}
          <StepCard icon={UserCheck} stepNumber={3} title="Tech Assignment & Inventory Stock Checkout" status={jobCard.technician ? 'ASSIGNED' : 'UNASSIGNED'} statusBadgeClass="badge-assigned" color="#a5b4fc">
            {/* Admin Tech Assignment */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>Currently Assigned Master Technician:</span>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{jobCard.technician?.name || 'Unassigned'}</span>
                    {jobCard.technician && <span style={{ fontSize: '10px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', padding: '1px 6px', borderRadius: '4px' }}>Active Lead</span>}
                  </div>
                </div>
                {isAdmin && canEdit && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="form-control" value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)} style={{ minHeight: '38px' }}>
                      {safeTechnicians.map(t => {
                        const activeCount = safeJobCards.filter(c => c && c.technicianId === t.id && c.status !== 'DELIVERED').length;
                        return (
                          <option key={t.id} value={t.id}>
                            {t.name} ({activeCount} Active Jobs)
                          </option>
                        );
                      })}
                    </select>
                    <button className="btn btn-primary" onClick={handleAssignTechnician} disabled={loading} style={{ minHeight: '38px', padding: '0 16px', justifyContent: 'center' }}>
                      Assign Tech
                    </button>
                  </div>
                )}
              </div>

              {/* Expandable Dropdown for Past Assignment Logs */}
              {(() => {
                const assignLogs = (jobCard.statusLogs || []).filter(l => l.toStatus === 'ASSIGNED');
                if (assignLogs.length <= 1) return null;

                return (
                  <div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '10px', padding: '4px 10px', background: '#1e293b', border: '1px solid #334155', color: '#60a5fa', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setShowAllTechHistory(!showAllTechHistory)}
                    >
                      {showAllTechHistory ? `▲ Hide Reassignment History (${assignLogs.length - 1} prior)` : `▼ View Assignment History Dropdown (${assignLogs.length - 1} prior)`}
                    </button>

                    {showAllTechHistory && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid #3b82f6' }}>
                        {assignLogs.slice(0, -1).reverse().map((log) => (
                          <div key={log.id} style={{ fontSize: '11px', color: '#94a3b8', background: '#0f172a', padding: '6px 10px', borderRadius: '4px' }}>
                            Prior Assignment Log: <strong style={{ color: '#cbd5e1' }}>{log.notes || 'Technician Assigned'}</strong> ({new Date(log.createdAt).toLocaleString()})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Parts Checkout Form (Restricted to Technician Role Only) */}
            {currentUser?.role === 'TECHNICIAN' && (() => {
              const filteredCheckoutInventory = safeInventory.filter(item => {
                if (!item) return false;
                if (!partSearchQuery.trim()) return true;
                const q = partSearchQuery.toLowerCase().trim();
                return item.name?.toLowerCase().includes(q) || item.sku?.toLowerCase().includes(q);
              });

              return (
                <form onSubmit={handleCheckoutParts} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#38bdf8' }}>Checkout Stock Parts (Inventory Deduction)</span>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowBarcodeScanner(true)}
                        style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid #38bdf8', minHeight: '32px' }}
                      >
                        <Barcode size={14} /> 📷 Scan Barcode / QR
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const item = safeInventory.find(i => i.id === checkoutItemId) || safeInventory[0];
                          setSuccessMsg(`🚨 Restock Request logged for ${item?.name || 'Part'} (${item?.sku || 'SKU'})!`);
                        }}
                        style={{ fontSize: '11px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #f59e0b', minHeight: '32px' }}
                      >
                        🚨 Restock Request
                      </button>
                    </div>
                  </div>

                  {/* Search Bar for Spare Parts */}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-control"
                      placeholder="🔍 Search spare part by name..."
                      value={partSearchQuery}
                      onChange={e => setPartSearchQuery(e.target.value)}
                      style={{ paddingLeft: '32px', background: 'var(--bg-dark)', borderColor: 'var(--border-color)', color: 'var(--text-main)', minHeight: '34px', fontSize: '12px', fontWeight: '600' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <select className="form-control" value={checkoutItemId} onChange={e => setCheckoutItemId(e.target.value)} required style={{ flex: '2 1 180px', minHeight: '38px' }}>
                      <option value="">-- Select Spare Part ({filteredCheckoutInventory.length} Available) --</option>
                      {filteredCheckoutInventory.map(item => (
                        <option key={item.id} value={item.id} disabled={item.quantity <= 0}>
                          {item.name} — ₹{item.unitPrice?.toFixed(2)}
                        </option>
                      ))}
                    </select>
                    <input type="number" min="1" className="form-control" value={checkoutQty} onChange={e => setCheckoutQty(e.target.value)} required style={{ flex: '1 1 70px', minHeight: '38px' }} />
                    <button type="submit" className="btn btn-primary" disabled={loading || !checkoutItemId} style={{ flex: '1 1 130px', minHeight: '38px', justifyContent: 'center' }}>
                      <ShoppingCart size={14} /> Checkout Part
                    </button>
                  </div>
                </form>
              );
            })()}

            {/* Admin Stock Parts View Notice */}
            {currentUser?.role === 'ADMIN' && (
              <div style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 14px', margin: '10px 0', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} color="#2563eb" />
                <div>
                  <strong style={{ color: 'var(--text-main)' }}>Stock Parts View (Admin Mode):</strong> Technicians draw & checkout required inventory parts for this work order. Admins can view the checked-out parts log below.
                </div>
              </div>
            )}

            {/* Drawn Parts Audit Table */}
            {jobCard.parts && jobCard.parts.length > 0 && (() => {
              const allParts = [...jobCard.parts].reverse(); // Latest drawn part first
              const firstPart = allParts.slice(0, 1);
              const remainingParts = allParts.slice(1);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>
                      Stock Inventory Drawn ({jobCard.parts.length} Total Line Items)
                    </span>
                  </div>

                  <div className="custom-table-container">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Drawn Part Name</th>
                          <th>SKU</th>
                          <th>Qty</th>
                          <th>Unit Price</th>
                          <th>Total Cost</th>
                          <th>Drawn By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Latest Drawn Part (Always Shown - 1 Item) */}
                        {firstPart.map(p => (
                          <tr key={p.id} style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                            <td style={{ fontWeight: '700', color: '#2563eb' }}>
                              {p.inventoryItem?.name} <span style={{ fontSize: '9px', background: '#2563eb', color: '#ffffff', padding: '1px 4px', borderRadius: '3px', marginLeft: '4px', fontWeight: '800' }}>LATEST DRAW</span>
                            </td>
                            <td>{p.inventoryItem?.sku}</td>
                            <td>{p.quantity}</td>
                            <td>₹{p.unitPrice?.toFixed(2)}</td>
                            <td style={{ fontWeight: '700', color: '#059669' }}>₹{p.totalPrice?.toFixed(2)}</td>
                            <td>{p.drawnByUser?.name || 'Technician'}</td>
                          </tr>
                        ))}

                        {/* Remaining Drawn Parts Rows (Dropdown Toggle) */}
                        {showAllParts && remainingParts.map(p => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: '600' }}>{p.inventoryItem?.name}</td>
                            <td>{p.inventoryItem?.sku}</td>
                            <td>{p.quantity}</td>
                            <td>₹{p.unitPrice?.toFixed(2)}</td>
                            <td style={{ fontWeight: '700', color: '#2563eb' }}>₹{p.totalPrice?.toFixed(2)}</td>
                            <td>{p.drawnByUser?.name || 'Technician'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {remainingParts.length > 0 && (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{
                        fontSize: '11px',
                        padding: '6px 12px',
                        background: 'rgba(59, 130, 246, 0.15)',
                        border: '1px solid #3b82f6',
                        color: '#2563eb',
                        width: '100%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'center',
                        gap: '6px',
                        fontWeight: '700'
                      }}
                      onClick={() => setShowAllParts(!showAllParts)}
                    >
                      {showAllParts ? (
                        <>▲ Hide Stock Parts History Dropdown ({remainingParts.length} items)</>
                      ) : (
                        <>▼ View Full Inventory Parts List Dropdown ({remainingParts.length} earlier drawn items)</>
                      )}
                    </button>
                  )}
                </div>
              );
            })()}
          </StepCard>

          {/* STEP 4: ACTIVE WORK EXECUTION & LIVE PROGRESS DOCUMENTATION */}
          <StepCard icon={Wrench} stepNumber={4} title="Active Work Execution & Progress Updates" status={jobCard.status} statusBadgeClass="badge-in_progress" color="#60a5fa">
            {canEdit && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Feature 3: Active Repair Stopwatch Timer Banner */}
                <div style={{
                  background: isTimerRunning ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-dark)',
                  border: `1px solid ${isTimerRunning ? '#10b981' : 'var(--border-color)'}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={18} color={isTimerRunning ? '#059669' : '#2563eb'} />
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Active Repair Time Logged (Per-Task)</div>
                      <div style={{ fontSize: '16px', fontWeight: '900', color: isTimerRunning ? '#059669' : 'var(--text-main)', letterSpacing: '1px' }}>
                        {formatStopwatch(totalTimeLoggedSecs)} {isTimerRunning && <span style={{ fontSize: '10px', background: '#10b981', color: '#ffffff', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: '800' }}>RUNNING</span>}
                      </div>
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className={`btn ${isTimerRunning ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      onClick={handleToggleTimer}
                      style={{ fontSize: '11px', minHeight: '32px' }}
                    >
                      {isTimerRunning ? <Pause size={12} /> : <Play size={12} />}
                      {isTimerRunning ? 'Pause Timer' : 'Resume Timer'}
                    </button>
                  )}
                </div>

                {/* Equal height, fluid control buttons (minHeight: 38px) */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {jobCard.status !== 'IN_PROGRESS' && jobCard.status !== 'DELIVERED' && (
                    <button className="btn btn-primary" onClick={handleStartJob} disabled={loading} style={{ flex: '1 1 160px', minHeight: '38px', justifyContent: 'center' }}>
                      <Play size={14} /> {jobCard.status === 'UNFINISHED' ? 'Resume Servicing' : 'Start Repair Work'}
                    </button>
                  )}
                  {jobCard.status !== 'UNFINISHED' && jobCard.status !== 'DELIVERED' && (
                    <button className="btn btn-warning" onClick={handleMarkUnfinished} disabled={loading} style={{ flex: '1 1 160px', minHeight: '38px', justifyContent: 'center' }}>
                      <AlertOctagon size={14} /> Mark Work Unfinished (Draft)
                    </button>
                  )}
                </div>

                {/* Progress Camera & Milestone Form */}
                <div style={{ borderTop: '1px solid #1e293b', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>Milestone Progress Updates</span>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={() => { setCameraTarget('PROGRESS'); setShowCameraModal(true); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', minHeight: '36px', padding: '6px 12px', fontSize: '12px' }}
                    >
                      <Camera size={14} /> 📸 Snap Live Milestone Photo
                    </button>
                  </div>

                  {progressMediaUrl && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1e293b', padding: '8px 12px', borderRadius: '6px', border: '1px solid #10b981' }}>
                      <img src={progressMediaUrl} alt="Live progress photo" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                      <div style={{ fontSize: '12px', color: '#34d399', fontWeight: '700' }}>✓ Live Milestone Snapshot Attached</div>
                    </div>
                  )}

                  {/* Feature 2: Canned Note Templates Shortcuts */}
                  {cannedNotes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '700' }}>⚡ Quick Note Templates (Tap to Insert):</span>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {cannedNotes.map(cn => (
                          <button
                            key={cn.id}
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setProgressCaption(prev => prev ? `${prev}. ${cn.text}` : cn.text);
                            }}
                            style={{ fontSize: '11px', padding: '3px 8px', background: '#1e293b', border: '1px solid #334155', color: '#38bdf8' }}
                          >
                            + {cn.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <form onSubmit={handleAddProgressMedia}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <input type="text" className="form-control" placeholder="Milestone / Work update caption" value={progressCaption} onChange={e => setProgressCaption(e.target.value)} style={{ flex: '1 1 200px', minHeight: '38px' }} />
                      <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: '1 1 120px', minHeight: '38px', justifyContent: 'center' }}>
                        <Send size={14} /> Send Photo Update
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={handleAddProgressMedia} disabled={loading} style={{ flex: '1 1 120px', minHeight: '38px', justifyContent: 'center' }}>
                        Skip Photo & Update
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Milestone Gallery */}
            {progressPhotos.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                {progressPhotos.map(m => (
                  <div key={m.id} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '6px', overflow: 'hidden' }}>
                    <img src={m.url} alt={m.caption} style={{ width: '100%', height: '90px', objectFit: 'cover' }} onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400'; }} />
                    <div style={{ padding: '6px 8px', fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)' }}>{m.caption}</div>
                  </div>
                ))}
              </div>
            )}
          </StepCard>

          {/* STEP 5: QUALITY CHECK (QC) INSPECTION GATE */}
          <StepCard icon={ShieldCheck} stepNumber={5} title="Quality Check (QC) Inspection Gate" status={latestQC ? (latestQC.passed ? 'QC_PASSED' : 'QC_FAILED') : 'QC_PENDING'} statusBadgeClass={latestQC?.passed ? 'badge-completed' : 'badge-in_progress'} color="#f59e0b">
            {latestQC && (
              <div style={{ background: latestQC.passed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', border: `1px solid ${latestQC.passed ? '#10b981' : '#ef4444'}`, padding: '10px 14px', borderRadius: '8px' }}>
                <div style={{ fontWeight: '800', color: latestQC.passed ? '#34d399' : '#f87171', fontSize: '13px' }}>
                  {latestQC.passed ? '✓ QUALITY CONTROL PASSED' : '⚠️ QUALITY CONTROL FAILED — REWORK IN PROGRESS'}
                </div>
                <div style={{ fontSize: '12px', color: '#f8fafc', marginTop: '2px' }}>{latestQC.notes}</div>
              </div>
            )}

            {canEdit && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ fontSize: '12px', fontWeight: '700', color: '#94a3b8' }}>Mandatory Workshop Checklist</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px', fontSize: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checkBrakes} onChange={e => setCheckBrakes(e.target.checked)} /> 🔩 Brake Torque Specs
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checkFluids} onChange={e => setCheckFluids(e.target.checked)} /> 🛢️ Fluid Levels Max
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checkRoadTest} onChange={e => setCheckRoadTest(e.target.checked)} /> 🚘 Road Test Verified
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f8fafc', cursor: 'pointer' }}>
                    <input type="checkbox" checked={checkDiagnosticScan} onChange={e => setCheckDiagnosticScan(e.target.checked)} /> 💻 Diagnostic Scan Clear
                  </label>
                </div>

                <input type="text" className="form-control" placeholder="QC Inspector Notes" value={qcNotes} onChange={e => setQcNotes(e.target.value)} style={{ minHeight: '38px' }} />

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-success" onClick={() => handleRecordQC(true)} disabled={loading} style={{ flex: '1 1 140px', minHeight: '38px', justifyContent: 'center' }}>
                    ✓ Pass Quality Check (QC_PASSED)
                  </button>
                  <button className="btn btn-danger" onClick={() => handleRecordQC(false)} disabled={loading} style={{ flex: '1 1 140px', minHeight: '38px', justifyContent: 'center' }}>
                    ⚠️ Fail QC & Reassign Rework
                  </button>
                </div>
              </div>
            )}
          </StepCard>

          {/* STEP 6: ITEMIZED BILLING & ONLINE PAYMENT GATEWAY */}
          <StepCard icon={CreditCard} stepNumber={6} title="Itemized Billing & Online Payment Gateway" status={activeInvoice?.status || 'UNPAID'} statusBadgeClass={activeInvoice?.status === 'PAID' ? 'badge-completed' : 'badge-in_progress'} color="#38bdf8">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Total Billed Workorder Amount</div>
                <div style={{ fontSize: '18px', fontWeight: '900', color: '#34d399' }}>
                  ₹{((jobCard.totalCost || 0) * 1.10).toFixed(2)}
                </div>
              </div>

              {activeInvoice && (
                <button 
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    try {
                      const pubData = await api.getPublicInvoice(activeInvoice.id);
                      const link = `${window.location.origin}/pay/${activeInvoice.id}?token=${pubData.secureToken || ''}`;
                      window.open(link, '_blank');
                    } catch (err) {
                      window.open(`/pay/${activeInvoice.id}`, '_blank');
                    }
                  }}
                  style={{ fontSize: '11px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Lock size={12} /> Open Payment Link
                </button>
              )}
            </div>

            {activeInvoice?.status === 'PAID' ? (
              <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', padding: '12px 14px', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontSize: '14px', fontWeight: '900', color: '#34d399' }}>✓ Payment Settled & Verified</div>
                <div style={{ fontSize: '12px', color: '#f8fafc', marginTop: '2px' }}>
                  Invoice #{activeInvoice.invoiceNumber} | Paid Amount: <strong>₹{activeInvoice.totalAmount?.toFixed(2)}</strong>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => api.downloadInvoicePDF(jobCard.id)} style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Download Official PDF Invoice
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #1e293b', paddingTop: '10px' }}>
                <button 
                  className="btn btn-success" 
                  onClick={async () => {
                    try {
                      setLoading(true);
                      setError('');
                      let inv = activeInvoice;
                      if (!inv) {
                        inv = await api.createInvoice(jobCard.id, 10.0);
                      }
                      await api.markPaidCash(jobCard.id, 'Paid via Direct Mobile App / Owner Scanner');
                      setSuccessMsg('✓ Payment Verified & Settled! Status updated to PAID.');
                      safeRefresh();
                    } catch (err) {
                      setError(typeof err === 'string' ? err : (err?.message || 'Failed to verify payment'));
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  style={{ minHeight: '38px', justifyContent: 'center', width: '100%' }}
                >
                  <CheckCircle size={16} /> Confirm Payment Completed (Mark Paid)
                </button>
              </div>
            )}
          </StepCard>

          {/* STEP 7: FINAL DELIVERY & GATE PASS HANDOVER */}
          <StepCard icon={Award} stepNumber={7} title="Final Delivery & Gate Pass Handover" status={isDelivered ? 'DELIVERED' : 'PENDING HANDOVER'} statusBadgeClass={isDelivered ? 'badge-completed' : 'badge-in_progress'} color="#34d399">
            {jobCard.status === 'PAID' && (isAdmin || currentUser?.role === 'TECHNICIAN') && (
              <button className="btn btn-success" onClick={handleDeliverVehicle} disabled={loading} style={{ minHeight: '38px', justifyContent: 'center', width: '100%' }}>
                <CheckCircle2 size={16} /> Complete Vehicle Handover & Close Job (DELIVERED)
              </button>
            )}



            {isDelivered && (
              <div style={{ background: 'var(--bg-dark)', padding: '14px', borderRadius: '8px', border: '1px solid #10b981' }}>
                <div style={{ fontSize: '13px', fontWeight: '800', color: '#059669' }}>✓ Digital Handover Certificate Released</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
                  Vehicle <strong>{jobCard.vehicle?.licensePlate}</strong> handed over to <strong>{jobCard.customer?.name}</strong>.
                </div>
              </div>
            )}
          </StepCard>

          {/* LIFECYCLE AUDIT TRAIL TIMELINE */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#2563eb" />
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>Lifecycle Audit Trail Timeline</h3>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {(jobCard.statusLogs || []).length} Total Events
              </span>
            </div>

            {(() => {
              const logs = Array.isArray(jobCard.statusLogs)
                ? [...jobCard.statusLogs].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                : [];
              const firstLog = logs.slice(0, 1);
              const remainingLogs = logs.slice(1);

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Latest Milestone Event (Always Shown - 1 Item) */}
                  {firstLog.map((log) => (
                    <div key={log.id} style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', fontWeight: '800', padding: '1px 6px', borderRadius: '4px' }}>
                            CURRENT STAGE
                          </span>
                          <span className={`badge badge-${log.toStatus?.toLowerCase()}`} style={{ fontSize: '11px', padding: '3px 8px' }}>{log.toStatus}</span>
                          {log.fromStatus && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>from {log.fromStatus}</span>}
                        </div>
                        <span style={{ fontSize: '11px', color: '#2563eb', fontWeight: '700' }}>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '4px', fontWeight: '600' }}>{log.notes || 'Status updated'}</div>
                    </div>
                  ))}

                  {/* Expandable Dropdown List for Remaining Timeline Entries */}
                  {remainingLogs.length > 0 && (
                    <>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        style={{
                          fontSize: '11px',
                          padding: '8px 12px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          border: '1px solid #3b82f6',
                          color: '#2563eb',
                          width: '100%',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          gap: '6px',
                          fontWeight: '700',
                          borderRadius: '6px',
                          marginTop: '4px'
                        }}
                        onClick={() => setShowAllTimeline(!showAllTimeline)}
                      >
                        {showAllTimeline ? (
                          <>▲ Hide Timeline History Dropdown ({remainingLogs.length} entries)</>
                        ) : (
                          <>▼ View Full Audit Trail Dropdown ({remainingLogs.length} earlier entries)</>
                        )}
                      </button>

                      {showAllTimeline && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                          {remainingLogs.map((log, idx) => (
                            <div key={log.id} style={{ background: 'var(--bg-dark)', padding: '10px 12px', borderRadius: '6px', borderLeft: '3px solid #3b82f6' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>#{remainingLogs.length - idx}</span>
                                  <span className={`badge badge-${log.toStatus?.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px' }}>{log.toStatus}</span>
                                  {log.fromStatus && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>from {log.fromStatus}</span>}
                                </div>
                                <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '2px' }}>{log.notes || 'Status changed'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </div>

        </div>

      </div>

      {showCameraModal && (
        <CameraCaptureModal
          title={cameraTarget === 'INSPECTION' ? 'Pre-Service Condition Inspection Photo' : 'Work Milestone Progress Photo'}
          onClose={() => setShowCameraModal(false)}
          onCapture={handleCameraCapturedPhoto}
        />
      )}

      {showSpecsModal && (
        <VehicleSpecsModal onClose={() => setShowSpecsModal(false)} />
      )}

      {showBarcodeScanner && (
        <BarcodeScannerModal
          onClose={() => setShowBarcodeScanner(false)}
          onScan={(item) => {
            setCheckoutItemId(item.id);
            setSuccessMsg(`✓ Scanned & Selected: ${item.name} (${item.sku})`);
          }}
          inventory={safeInventory}
        />
      )}

      {/* INTERACTIVE LIGHTBOX IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(9, 13, 22, 0.95)',
            zIndex: 30000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              maxWidth: '90vw',
              maxHeight: '90vh',
              background: '#1e293b',
              borderRadius: '14px',
              overflow: 'hidden',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(15, 23, 42, 0.85)',
                border: '1px solid #334155',
                color: '#fff',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 10
              }}
              aria-label="Close image preview"
            >
              <X size={20} />
            </button>

            <img
              src={previewImage.url}
              alt={previewImage.caption || 'Technician Captured Photo'}
              style={{
                maxWidth: '100%',
                maxHeight: '75vh',
                objectFit: 'contain',
                background: '#0f172a'
              }}
            />

            <div style={{ padding: '14px 18px', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '800', textTransform: 'uppercase' }}>
                  {previewImage.type === 'INSPECTION' ? '📷 Pre-Service Condition Inspection' : '🛠️ Technician Repair Progress Update'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#f8fafc', marginTop: '2px' }}>
                  {previewImage.caption || 'Technician inspection photo log'}
                </div>
                {previewImage.createdAt && (
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                    Captured: {new Date(previewImage.createdAt).toLocaleString()}
                  </div>
                )}
              </div>

              <a
                href={previewImage.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Camera size={14} /> Open Full High-Res Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
