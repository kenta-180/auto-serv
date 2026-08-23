import React, { useState } from 'react';
import { 
  Car, CheckCircle2, Clock, FileText, Image, Wrench, DollarSign, Trash2, Shield, Eye, CreditCard, Calendar, Camera, X
} from 'lucide-react';
import { api } from '../../services/api';
import CustomerPaymentLandingModal from '../pay/CustomerPaymentLandingModal';
import { useLanguage } from '../../context/LanguageContext';

export default function CustomerDashboard({ 
  currentUser, 
  jobCards = [], 
  vehicles = [],
  onSelectJobCard, 
  onNavigateTab,
  onRefresh 
}) {
  const { t, getStatusLabel, formatCurrency } = useLanguage();
  const [selectedJobCardForPayment, setSelectedJobCardForPayment] = useState(null);
  const [selectedDashboardMedia, setSelectedDashboardMedia] = useState(null);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];

  // Filter job cards for current customer (displaying server-scoped records for customer/student login)
  const isCustomerRole = currentUser?.role === 'CUSTOMER' || currentUser?.role === 'STUDENT';
  const customerCards = safeJobCards.filter(c => {
    if (!c) return false;
    if (isCustomerRole) return true;
    const isIdMatch = c.customerId === currentUser?.id || c.customer?.id === currentUser?.id;
    const isEmailMatch = c.customer?.email && currentUser?.email && c.customer.email.toLowerCase() === currentUser.email.toLowerCase();
    const isPhoneMatch = c.customer?.phone && currentUser?.phone && c.customer.phone === currentUser.phone;
    const isVehicleMatch = (vehicles || []).some(v => v.licensePlate === c.vehicle?.licensePlate || v.id === c.vehicleId);
    return isIdMatch || isEmailMatch || isPhoneMatch || isVehicleMatch;
  });
  const activeCards = customerCards.filter(c => c.status !== 'DELIVERED');
  const completedCards = customerCards.filter(c => c.status === 'DELIVERED');

  // Pending payments total
  const pendingTotal = customerCards
    .filter(c => c.status !== 'PAID' && c.status !== 'DELIVERED')
    .reduce((sum, c) => sum + (c.totalCost || 0) * 1.10, 0);

  // Media gallery items across customer's job cards
  const mediaGallery = customerCards.flatMap(c => 
    (c.media || []).map(m => ({ ...m, cardNumber: c.cardNumber, vehicle: c.vehicle }))
  );

  // Filter registered vehicles for current customer strictly
  const customerVehicles = (Array.isArray(vehicles) ? vehicles : []).filter(v => {
    if (!v) return false;
    if (!currentUser) return true;
    const isOwnerIdMatch = v.ownerId === currentUser.id || v.owner?.id === currentUser.id;
    const isOwnerEmailMatch = currentUser.email && (v.owner?.email === currentUser.email || v.userEmail === currentUser.email);
    return isOwnerIdMatch || isOwnerEmailMatch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Customer Header Banner */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '24px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#7c3aed',
              border: '1px solid #8b5cf6',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase'
            }}>
              <Car size={12} style={{ display: 'inline', marginRight: '4px' }} /> Customer Service & Payments Portal
            </span>
          </div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Welcome back, {currentUser?.name || 'Valued Customer'}!
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px', margin: 0 }}>
            Track live vehicle repair progress, inspect pre-service photos, and schedule service bookings.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', width: '100%', maxWidth: '440px', marginTop: '4px' }}>
          <button 
            type="button"
            className="btn btn-primary"
            onClick={() => onNavigateTab('book-service')}
            style={{
              flex: '1 1 140px',
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '12px',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <Calendar size={15} /> Book Vehicle Service
          </button>

          <button 
            type="button"
            className="btn btn-secondary"
            onClick={() => onNavigateTab('invoices')}
            style={{
              flex: '1 1 140px',
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '12px',
              background: 'rgba(124, 58, 237, 0.15)',
              border: '1px solid #8b5cf6',
              color: '#7c3aed',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <FileText size={15} /> View Receipts & Invoices
          </button>
        </div>
      </div>

      {/* QUICK SERVICE SCHEDULING BANNER */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid #3b82f6',
            display: 'flex',
            alignItems: 'center',
            justify: 'center',
            color: '#2563eb',
            flexShrink: 0
          }}>
            <Calendar size={20} />
          </div>
          <div>
            <h4 style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
              Need a Vehicle Checkup or Routine Maintenance?
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Book a 2-hour workshop slot in advance. Guaranteed fast-track intake & priority servicing.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn"
          onClick={() => onNavigateTab('book-service')}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: '#ffffff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: '800',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <Calendar size={15} /> Book Slot Now
        </button>
      </div>

      {/* Customer Dashboard Stat Tiles (4 Tiles - Denser Scale) */}
      <div className="dashboard-stat-grid">
        
        {/* Tile 1: Active Vehicle Repairs */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Active Repairs</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '5px', borderRadius: '6px', color: '#2563eb' }}>
              <Wrench size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>{activeCards.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Vehicles In Workshop</div>
        </div>

        {/* Tile 2: Completed Service History */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Completed Services</span>
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '5px', borderRadius: '6px', color: '#059669' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>{completedCards.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Past Delivered Repairs</div>
        </div>

        {/* Tile 3: Pre-Service Inspection Photos */}
        <div 
          onClick={() => {
            if (mediaGallery.length > 0) {
              setSelectedDashboardMedia(mediaGallery[0]);
              setShowMediaModal(true);
            } else {
              alert('No inspection photos captured yet by technician for your active vehicle service.');
            }
          }}
          style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-color)', 
            borderRadius: '10px', 
            padding: '10px 12px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease, border-color 0.2s ease',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)'
          }}
          title="Click to view all technician-captured inspection photos"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Inspection Media</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '5px', borderRadius: '6px', color: '#d97706' }}>
              <Image size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {mediaGallery.length} Photos <span style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb' }}>(Tap to view)</span>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Condition Verification Logs</div>
        </div>

        {/* Tile 4: Outstanding Invoice Balance */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Pending Invoice</span>
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', padding: '5px', borderRadius: '6px', color: '#dc2626' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: pendingTotal > 0 ? '#dc2626' : '#059669' }}>
            ₹{pendingTotal.toFixed(2)}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Incl. 10% GST Tax</div>
        </div>

      </div>

      {/* Workshop Service History */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '16px' }}>
          My Vehicle Service Work Orders ({customerCards.length})
        </h3>

        {customerCards.length > 0 ? (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Job Card #</th>
                  <th>Vehicle</th>
                  <th>Status</th>
                  <th>Total Cost (₹)</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {customerCards.map(card => (
                  <tr key={card.id}>
                    <td style={{ fontWeight: '800', color: '#2563eb' }}>#{card.cardNumber}</td>
                    <td style={{ color: 'var(--text-main)' }}>{card.vehicle?.make} {card.vehicle?.model} ({card.vehicle?.licensePlate})</td>
                    <td><span className={`badge badge-${card.status?.toLowerCase()}`}>{card.status}</span></td>
                    <td style={{ fontWeight: '700', color: '#059669' }}>₹{((card.totalCost || 0) * 1.10).toFixed(2)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => onSelectJobCard(card)}>
                          <Eye size={14} /> Open Live Tracker
                        </button>
                        {card.status !== 'PAID' && card.status !== 'DELIVERED' && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedJobCardForPayment(card)}
                            style={{ background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CreditCard size={14} /> Pay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontWeight: '600' }}>
            No vehicle service records found for your account.
          </div>
        )}
      </div>

      {/* SAME-PAGE PAYMENT LANDING OVERLAY MODAL */}
      {selectedJobCardForPayment && (
        <CustomerPaymentLandingModal
          jobCard={selectedJobCardForPayment}
          onClose={() => setSelectedJobCardForPayment(null)}
          onSuccess={() => {
            setSelectedJobCardForPayment(null);
            if (typeof onRefresh === 'function') onRefresh();
          }}
        />
      )}

      {/* INSPECTION MEDIA LIGHTBOX MODAL (TRIGGERED WHEN USER CLICKS INSPECTION MEDIA TILE) */}
      {showMediaModal && selectedDashboardMedia && (() => {
        const currentIdx = mediaGallery.findIndex(m => (m.id || m.url) === (selectedDashboardMedia.id || selectedDashboardMedia.url));

        return (
          <div
            className="modal-overlay"
            onClick={() => setShowMediaModal(false)}
            style={{ zIndex: 9999, background: 'rgba(2, 6, 23, 0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          >
            <div
              className="modal-content"
              onClick={e => e.stopPropagation()}
              style={{
                maxWidth: '720px',
                width: '95%',
                padding: '18px',
                background: 'var(--bg-card)',
                border: '1px solid #d97706',
                borderRadius: '16px',
                color: 'var(--text-main)',
                boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
                position: 'relative'
              }}
            >
              {/* Modal Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={18} /> 📸 Inspection Media & Condition Verification ({mediaGallery.length})
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Photo {currentIdx >= 0 ? currentIdx + 1 : 1} of {mediaGallery.length} • Work Order #{selectedDashboardMedia.cardNumber || 'Service'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMediaModal(false)}
                  style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Main Image View with Prev/Next Carousel */}
              <div style={{ position: 'relative', width: '100%', maxHeight: '440px', borderRadius: '12px', overflow: 'hidden', background: '#090d16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={selectedDashboardMedia.url}
                  alt={selectedDashboardMedia.caption || 'Inspection media'}
                  style={{ maxWidth: '100%', maxHeight: '440px', objectFit: 'contain' }}
                />

                {/* Prev Button */}
                {mediaGallery.length > 1 && currentIdx > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDashboardMedia(mediaGallery[currentIdx - 1])}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid #d97706',
                      color: '#ffffff',
                      padding: '8px 14px',
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
                {mediaGallery.length > 1 && currentIdx < mediaGallery.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setSelectedDashboardMedia(mediaGallery[currentIdx + 1])}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(15, 23, 42, 0.85)',
                      border: '1px solid #d97706',
                      color: '#ffffff',
                      padding: '8px 14px',
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

              {/* Thumbnail Strip */}
              {mediaGallery.length > 1 && (
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', padding: '10px 0', marginTop: '10px' }}>
                  {mediaGallery.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      onClick={() => setSelectedDashboardMedia(m)}
                      style={{
                        width: '60px',
                        height: '50px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: (m.id || m.url) === (selectedDashboardMedia.id || selectedDashboardMedia.url) ? '2px solid #d97706' : '1px solid var(--border-color)',
                        opacity: (m.id || m.url) === (selectedDashboardMedia.id || selectedDashboardMedia.url) ? 1 : 0.65,
                        flexShrink: 0
                      }}
                    >
                      <img src={m.url} alt="thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}

              {/* Caption Footer */}
              <div style={{ marginTop: '10px', background: 'var(--bg-dark)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                    📝 {selectedDashboardMedia.caption || 'Vehicle inspection snapshot captured by technician'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>
                    Vehicle: {selectedDashboardMedia.vehicle?.make} {selectedDashboardMedia.vehicle?.model} ({selectedDashboardMedia.vehicle?.licensePlate || 'N/A'}) | Captured: {new Date(selectedDashboardMedia.uploadedAt || Date.now()).toLocaleString()}
                  </div>
                </div>

                <a
                  href={selectedDashboardMedia.url}
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

      {/* Registered Vehicles */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Car size={18} /> My Registered Vehicles ({customerVehicles.length})
        </h3>

        {customerVehicles.length > 0 ? (
          <div className="custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>License Plate</th>
                  <th>Make & Model</th>
                  <th>Year</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customerVehicles.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: '800', color: '#2563eb' }}>{v.licensePlate}</td>
                    <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{v.make} {v.model}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{v.year}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={async () => {
                          if (!window.confirm(`Are you sure you want to delete vehicle ${v.licensePlate}?`)) return;
                          try {
                            await api.deleteVehicle(v.id);
                            if (typeof onRefresh === 'function') onRefresh();
                          } catch (err) {
                            alert(err.message || 'Failed to delete vehicle');
                          }
                        }}
                        style={{ fontSize: '11px', color: '#dc2626', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #dc2626', fontWeight: '700' }}
                      >
                        <Trash2 size={13} style={{ display: 'inline', marginRight: '4px' }} /> Delete Vehicle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontWeight: '600' }}>
            No registered vehicles found for your account.
          </div>
        )}
      </div>

    </div>
  );
}
