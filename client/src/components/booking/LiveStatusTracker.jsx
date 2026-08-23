import React, { useState } from 'react';
import { CheckCircle2, Clock, Wrench, ShieldCheck, AlertCircle, Calendar, Camera, X } from 'lucide-react';
import CustomerPaymentLandingModal from '../pay/CustomerPaymentLandingModal';
import { useLanguage } from '../../context/LanguageContext';

const STAGES = [
  {
    key: 'CHECKED_IN',
    label: 'Checked In',
    subLabel: 'Intake & Reception',
    statuses: ['CHECKED_IN'],
    icon: Clock
  },
  {
    key: 'INSPECTING',
    label: 'Inspecting',
    subLabel: 'Diagnosis & Estimate',
    statuses: ['INSPECTED', 'ESTIMATE_APPROVED'],
    icon: AlertCircle
  },
  {
    key: 'IN_PROGRESS',
    label: 'In Progress',
    subLabel: 'Active Work Execution',
    statuses: ['ASSIGNED', 'IN_PROGRESS'],
    icon: Wrench
  },
  {
    key: 'QC_GATE',
    label: 'QC & Billing',
    subLabel: 'Quality Control Check',
    statuses: ['QC_PENDING', 'QC_PASSED', 'INVOICED'],
    icon: ShieldCheck
  },
  {
    key: 'READY',
    label: 'Ready for Pickup',
    subLabel: 'Vehicle Delivery',
    statuses: ['PAID', 'DELIVERED'],
    icon: CheckCircle2
  }
];

export default function LiveStatusTracker({ jobCard }) {
  const { t, getStatusLabel } = useLanguage();
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [showPaymentLanding, setShowPaymentLanding] = useState(false);

  if (!jobCard) return null;

  const currentStatus = jobCard.status || 'CHECKED_IN';
  const logs = jobCard.statusLogs || [];
  const mediaList = jobCard.media || [];

  // Determine current active stage index (0 to 4)
  let currentStageIndex = 0;
  if (['INSPECTED', 'ESTIMATE_APPROVED'].includes(currentStatus)) currentStageIndex = 1;
  else if (['ASSIGNED', 'IN_PROGRESS'].includes(currentStatus)) currentStageIndex = 2;
  else if (['QC_PENDING', 'QC_PASSED', 'INVOICED'].includes(currentStatus)) currentStageIndex = 3;
  else if (['PAID', 'DELIVERED'].includes(currentStatus)) currentStageIndex = 4;

  // Helper to find log timestamp for a stage
  const getStageLog = (stage) => {
    return logs.find(l => stage.statuses.includes(l.status));
  };

  // Due Date calculation (promisedDate or fallback CreatedAt + 24 hours)
  const rawDueDate = jobCard.promisedDate
    ? new Date(jobCard.promisedDate)
    : new Date(new Date(jobCard.createdAt || Date.now()).getTime() + 24 * 60 * 60 * 1000);
  
  const dueDateFormatted = rawDueDate.toLocaleString('en-IN', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const isDelivered = currentStatus === 'DELIVERED';
  const isOverdue = !isDelivered && Date.now() > rawDueDate.getTime();

  return (
    <div style={{
      background: 'var(--bg-dark)',
      border: '1px solid var(--border-color)',
      borderRadius: '10px',
      padding: '10px 14px',
      marginTop: '8px',
      color: 'var(--text-main)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
        <div style={{ flex: '1 1 180px' }}>
          <span style={{ fontSize: '10px', color: '#2563eb', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚡ Real-Time Progress
          </span>
          <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '2px 0 0 0', color: 'var(--text-main)', lineHeight: '1.3' }}>
            {jobCard.cardNumber} — {jobCard.title || 'Vehicle Service'}
          </h4>
        </div>
        <span style={{
          fontSize: '10px',
          fontWeight: '800',
          padding: '3px 10px',
          borderRadius: '12px',
          background: isDelivered ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)',
          color: isDelivered ? '#059669' : '#2563eb',
          border: `1px solid ${isDelivered ? '#10b981' : '#3b82f6'}`,
          whiteSpace: 'nowrap'
        }}>
          Stage {currentStageIndex + 1}/5: {STAGES[currentStageIndex]?.label}
        </span>
      </div>

      {/* Stepper Progress Bar */}
      <div style={{ position: 'relative', margin: '16px 0 10px 0' }}>
        {/* Background track line */}
        <div style={{
          position: 'absolute',
          top: '13px',
          left: '10%',
          right: '10%',
          height: '3px',
          background: 'var(--border-color)',
          zIndex: 1
        }} />

        {/* Active progress fill line */}
        <div style={{
          position: 'absolute',
          top: '13px',
          left: '10%',
          width: `${(currentStageIndex / (STAGES.length - 1)) * 80}%`,
          height: '3px',
          background: 'linear-gradient(90deg, #2563eb, #3b82f6, #10b981)',
          zIndex: 2,
          transition: 'width 0.4s ease'
        }} />

        {/* Equal 5-Column Grid for Stage Nodes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '2px', position: 'relative', zIndex: 3 }}>
          {STAGES.map((stage, idx) => {
            const isDone = idx < currentStageIndex;
            const isCurrent = idx === currentStageIndex;
            const stageLog = getStageLog(stage);
            const Icon = stage.icon;

            return (
              <div key={stage.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 2px' }}>
                <div style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: isDone ? '#10b981' : isCurrent ? '#2563eb' : 'var(--bg-card)',
                  border: isDone ? '2px solid #10b981' : isCurrent ? '2px solid #2563eb' : '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: isDone || isCurrent ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: isCurrent ? '0 0 8px rgba(59, 130, 246, 0.5)' : 'none',
                  transition: 'all 0.3s ease',
                  flexShrink: 0
                }}>
                  <Icon size={13} />
                </div>

                <div style={{
                  fontSize: '9px',
                  fontWeight: '700',
                  marginTop: '4px',
                  color: isCurrent ? '#2563eb' : isDone ? '#059669' : 'var(--text-muted)',
                  lineHeight: '1.15',
                  wordBreak: 'break-word',
                  whiteSpace: 'normal'
                }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: '8px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>
                  {stageLog ? new Date(stageLog.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (isDone ? 'Done' : isCurrent ? 'Active' : 'Pending')}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* DEDICATED CUSTOMER VEHICLE DUE DATE TILE */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        padding: '10px 12px',
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 180px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid #2563eb',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            color: '#2563eb',
            flexShrink: 0
          }}>
            <Calendar size={14} />
          </div>
          <div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              📅 ESTIMATED COMPLETION DUE DATE
            </div>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#0284c7', marginTop: '1px' }}>
              {dueDateFormatted}
            </div>
          </div>
        </div>

        <div>
          <span style={{
            fontSize: '10px',
            background: isDelivered ? 'rgba(16, 185, 129, 0.15)' : isOverdue ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
            color: isDelivered ? '#059669' : isOverdue ? '#dc2626' : '#2563eb',
            border: `1px solid ${isDelivered ? '#059669' : isOverdue ? '#dc2626' : '#2563eb'}`,
            padding: '3px 8px',
            borderRadius: '4px',
            fontWeight: '800',
            whiteSpace: 'nowrap'
          }}>
            {isDelivered ? '✓ Delivered' : isOverdue ? '⚠️ Overdue' : '⏰ On Schedule'}
          </span>
        </div>
      </div>

      {/* QC PASSED CUSTOMER REPAIRED NOTIFICATION & UPI QR SCANNER BANNER */}
      {(currentStatus === 'QC_PASSED' || currentStatus === 'INVOICED' || currentStatus === 'PAID') && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, var(--bg-card) 100%)',
          border: '1px solid #10b981',
          borderRadius: '10px',
          padding: '12px 14px',
          marginTop: '10px',
          color: 'var(--text-main)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(16, 185, 129, 0.2)',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justify: 'center',
                color: '#059669'
              }}>
                <CheckCircle2 size={18} />
              </div>
              <div>
                <span style={{ fontSize: '10px', color: '#059669', fontWeight: '800', textTransform: 'uppercase' }}>
                  🎉 Vehicle Repaired & QC Passed!
                </span>
                <h4 style={{ fontSize: '13px', fontWeight: '800', margin: '1px 0 0 0', color: 'var(--text-main)' }}>
                  Complete Payment to Collect Your Vehicle
                </h4>
              </div>
            </div>

            <div style={{ fontSize: '15px', fontWeight: '900', color: '#059669' }}>
              Total: ₹{((jobCard.totalCost || 0) * 1.10).toFixed(2)}
            </div>
          </div>

          {/* UPI Scanner & Pay Details */}
          <div style={{
            background: 'var(--bg-dark)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flexWrap: 'wrap'
          }}>
            {/* UPI QR Scanner Image */}
            <div style={{
              background: '#ffffff',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flexShrink: 0
            }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(`upi://pay?pa=8446131495@upi&pn=AutoServ%20Workshop&am=${((jobCard.totalCost || 0) * 1.10).toFixed(2)}&cu=INR`)}`}
                alt="UPI QR Scanner"
                style={{ width: '100px', height: '100px' }}
              />
              <span style={{ fontSize: '8px', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                Scan with GPay / PhonePe / Paytm
              </span>
            </div>

            <div style={{ flex: 1, minWidth: '180px' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', marginBottom: '4px' }}>
                Direct UPI Payment Details
              </div>
              
              {/* UPI ID */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600' }}>UPI ID:</span>
                <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#60a5fa', fontWeight: '800', fontSize: '11px' }}>
                  8446131495@upi
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('8446131495@upi');
                    alert('Copied UPI ID: 8446131495@upi');
                  }}
                  style={{ fontSize: '9px', padding: '2px 6px', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Copy
                </button>
              </div>

              {/* UPI Phone */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', color: '#cbd5e1', fontWeight: '600' }}>UPI Mobile:</span>
                <code style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '4px', color: '#34d399', fontWeight: '800', fontSize: '11px' }}>
                  +91 8446131495
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText('8446131495');
                    alert('Copied UPI Number: 8446131495');
                  }}
                  style={{ fontSize: '9px', padding: '2px 6px', background: '#1e293b', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', cursor: 'pointer' }}
                >
                  Copy
                </button>
              </div>

              {/* Instant Pay Now Button (Opens Landing Modal on the Same Page) */}
              <button
                type="button"
                className="btn"
                onClick={() => setShowPaymentLanding(true)}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '12px',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                💳 Pay (₹{((jobCard.totalCost || 0) * 1.10).toFixed(2)})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAME-PAGE PAYMENT LANDING OVERLAY MODAL */}
      {showPaymentLanding && (
        <CustomerPaymentLandingModal
          jobCard={jobCard}
          onClose={() => setShowPaymentLanding(false)}
          onSuccess={() => {
            setShowPaymentLanding(false);
            if (typeof window !== 'undefined') window.location.reload();
          }}
        />
      )}

      {/* CUSTOMER CLICKED VEHICLE PHOTOS GALLERY */}
      {mediaList.length > 0 && (
        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={15} /> 📸 Technician Inspection Photos & Media ({mediaList.length})
            </span>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: '600' }}>Tap photo for high-res view</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))',
            gap: '10px'
          }}>
            {mediaList.map((m, idx) => (
              <div
                key={m.id || idx}
                onClick={() => setSelectedMedia(m)}
                style={{
                  position: 'relative',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  height: '75px',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
                }}
              >
                <img
                  src={m.url}
                  alt={m.caption || 'Inspection photo'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  background: 'rgba(15, 23, 42, 0.85)',
                  padding: '3px 4px',
                  fontSize: '8px',
                  color: '#ffffff',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  fontWeight: '800'
                }}>
                  {m.type === 'PRE_SERVICE_CONDITION' ? '📷 Intake' : m.type === 'PROGRESS_UPDATE' ? '🔧 Repair' : '✓ QC Done'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FULL-SCREEN HIGH-RES LIGHTBOX MODAL FOR CUSTOMER PHOTO INSPECTION */}
      {selectedMedia && (() => {
        const currentIdx = mediaList.findIndex(m => (m.id || m.url) === (selectedMedia.id || selectedMedia.url));

        return (
          <div
            className="modal-overlay"
            onClick={() => setSelectedMedia(null)}
            style={{ zIndex: 9999, background: 'rgba(2, 6, 23, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '680px',
                width: '95%',
                padding: '16px',
                background: 'var(--bg-card)',
                border: '1px solid #3b82f6',
                borderRadius: '16px',
                color: 'var(--text-main)',
                boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
                position: 'relative'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} /> 📸 Inspection Photo (Captured by Technician)
                  </div>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    Photo {currentIdx >= 0 ? currentIdx + 1 : 1} of {mediaList.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedMedia(null)}
                  style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Image Container with Prev/Next Controls */}
              <div style={{ position: 'relative', width: '100%', maxHeight: '420px', borderRadius: '10px', overflow: 'hidden', background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={selectedMedia.url} alt="Vehicle inspection detail" style={{ maxWidth: '100%', maxHeight: '420px', objectFit: 'contain' }} />

                {/* Prev Button */}
                {mediaList.length > 1 && currentIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMedia(mediaList[currentIdx - 1])}
                    style={{
                      position: 'absolute',
                      left: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid #3b82f6',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '12px'
                    }}
                  >
                    ◀ Prev
                  </button>
                )}

                {/* Next Button */}
                {mediaList.length > 1 && currentIdx < mediaList.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedMedia(mediaList[currentIdx + 1])}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(15, 23, 42, 0.8)',
                      border: '1px solid #3b82f6',
                      color: '#ffffff',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: '800',
                      fontSize: '12px'
                    }}
                  >
                    Next ▶
                  </button>
                )}
              </div>

              {/* Caption & Timestamp Footer */}
              <div style={{ marginTop: '12px', background: 'var(--bg-dark)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                    📝 {selectedMedia.caption || 'Technician inspection photo log'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>
                    Captured: {new Date(selectedMedia.uploadedAt || Date.now()).toLocaleString()} | Category: {selectedMedia.type === 'PRE_SERVICE_CONDITION' ? '📷 Pre-Service Inspection' : selectedMedia.type === 'PROGRESS_UPDATE' ? '🔧 Repair Execution' : '✓ Quality Check'}
                  </div>
                </div>

                <a
                  href={selectedMedia.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '11px', padding: '6px 12px', borderRadius: '6px', fontWeight: '700' }}
                >
                  <Camera size={13} style={{ marginRight: '4px' }} /> Full High-Res
                </a>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
