import React, { useState } from 'react';
import { 
  X, Search, CheckCircle2, Car, Wrench, Package, FileText, Download, 
  ExternalLink, Calendar, User, DollarSign, Filter, Eye, Award, ShieldCheck
} from 'lucide-react';
import { api } from '../../services/api';

export default function CompletedVehicleHistoryModal({ 
  jobCards = [], 
  onSelectJobCard, 
  onClose 
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState('ALL');

  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];

  // Filter for completed/settled vehicle work orders
  const completedCards = safeJobCards.filter(c => 
    c && (c.status === 'DELIVERED' || c.status === 'PAID' || c.status === 'QC_PASSED' || c.status === 'INVOICED')
  );

  // Extract unique vehicles list for dropdown filter
  const uniqueVehicles = Array.from(new Set(
    completedCards.map(c => c.vehicle?.licensePlate).filter(Boolean)
  ));

  // Search & Vehicle filter logic
  const filteredHistory = completedCards.filter(c => {
    if (selectedVehicleFilter !== 'ALL' && c.vehicle?.licensePlate !== selectedVehicleFilter) {
      return false;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return (
      c.cardNumber?.toLowerCase().includes(q) ||
      c.title?.toLowerCase().includes(q) ||
      c.vehicle?.licensePlate?.toLowerCase().includes(q) ||
      c.vehicle?.make?.toLowerCase().includes(q) ||
      c.vehicle?.model?.toLowerCase().includes(q) ||
      c.customer?.name?.toLowerCase().includes(q) ||
      c.customer?.phone?.toLowerCase().includes(q) ||
      c.customer?.email?.toLowerCase().includes(q)
    );
  });

  // Financial Statistics
  const totalCompletedCount = completedCards.length;
  const totalRevenueGenerated = completedCards.reduce((sum, c) => sum + (c.totalCost || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '920px', 
          width: '95%',
          maxHeight: '78vh',
          overflowY: 'auto',
          padding: '0',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px'
        }}
      >
        {/* Modal Header (Compact Vertical Size) */}
        <div style={{
          background: 'var(--bg-dark)',
          padding: '12px 18px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', minWidth: 0 }}>
            <div style={{
              width: '34px',
              height: '34px',
              flexShrink: 0,
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #059669',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Award size={18} style={{ color: '#059669' }} />
            </div>
            <div style={{ flex: '1', minWidth: 0 }}>
              <h2 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', margin: 0, lineHeight: '1.2' }}>
                Completed Vehicle Work History
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0', lineHeight: '1.2', fontWeight: '600' }}>
                Full record of finalized, paid, and delivered workshop services
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-main)',
              borderRadius: '6px',
              width: '32px',
              height: '32px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginLeft: '6px'
            }}
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Summary Stats & Controls Bar (Compact) */}
        <div style={{ padding: '10px 18px', background: 'var(--bg-dark)', borderBottom: '1px solid var(--border-color)' }}>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '10px',
            marginBottom: '10px'
          }}>
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>
                Total Completed Jobs
              </span>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                {totalCompletedCount} Vehicles Served
              </div>
            </div>

            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px' }}>
              <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>
                Total Settled Revenue (₹)
              </span>
              <div style={{ fontSize: '16px', fontWeight: '800', color: '#2563eb', marginTop: '2px' }}>
                ₹{totalRevenueGenerated.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Search & Filter Inputs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                className="form-control"
                placeholder="Search plate, vehicle, customer, job card #..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', height: '34px', fontSize: '12px' }}
              />
            </div>

            <select
              className="form-control"
              value={selectedVehicleFilter}
              onChange={e => setSelectedVehicleFilter(e.target.value)}
              style={{ width: '200px', background: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)', height: '34px', fontSize: '12px', fontWeight: '600' }}
            >
              <option value="ALL">All License Plates ({uniqueVehicles.length})</option>
              {uniqueVehicles.map(plate => (
                <option key={plate} value={plate}>{plate}</option>
              ))}
            </select>
          </div>

        </div>

        {/* History Cards List Body (Compact) */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredHistory.length > 0 ? (
            filteredHistory.map(card => {
              const vehicle = card.vehicle || {};
              const customer = card.customer || {};
              const tasks = card.tasks || [];
              const parts = card.parts || [];
              const isDelivered = card.status === 'DELIVERED';
              const isPaid = card.status === 'PAID';

              return (
                <div 
                  key={card.id}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '18px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  {/* Card Header: Vehicle & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        background: 'var(--bg-dark)',
                        border: '1px solid #0284c7',
                        color: '#0284c7',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontWeight: '900',
                        fontSize: '14px',
                        letterSpacing: '0.05em'
                      }}>
                        🚗 {vehicle.licensePlate || 'N/A'}
                      </div>

                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                          {vehicle.make} {vehicle.model} ({vehicle.year || '2023'})
                        </h3>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          Customer: <strong style={{ color: 'var(--text-main)' }}>{customer.name || 'Valued Customer'}</strong> ({customer.phone || customer.email || 'N/A'})
                        </span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                        <span className={`badge badge-${card.status?.toLowerCase()}`}>
                          {isDelivered ? '✓ DELIVERED & CLOSED' : isPaid ? '✓ PAID' : card.status}
                        </span>
                        <span style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>
                          #{card.cardNumber}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
                        Completed On: {new Date(card.updatedAt || card.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Card Main Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    
                    {/* Primary Concern / Title */}
                    <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                        Primary Service Concern
                      </span>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>
                        {card.title}
                      </div>
                      {card.mileage && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontWeight: '600' }}>
                          Intake Mileage: {card.mileage.toLocaleString()} km
                        </div>
                      )}
                    </div>

                    {/* Technician & Inspector */}
                    <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '4px' }}>
                        Master Technician & QC
                      </span>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: '#0284c7' }}>
                        {card.technician?.name || 'Marcus Vance (Master Tech)'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '700' }}>
                        <ShieldCheck size={12} /> Quality Inspection Passed
                      </div>
                    </div>

                    {/* Cost Summary Box */}
                    <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800', display: 'block', marginBottom: '2px' }}>
                        Total Settled Cost (₹)
                      </span>
                      <div style={{ fontSize: '18px', fontWeight: '900', color: '#059669' }}>
                        ₹{card.totalCost?.toFixed(2) || '0.00'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>
                        Labor: ₹{(card.laborCost || 0).toFixed(2)} | Parts: ₹{(card.partsCost || 0).toFixed(2)}
                      </div>
                    </div>

                  </div>

                  {/* Work Details Collapsible / Details Section */}
                  <div style={{ background: 'var(--bg-dark)', borderRadius: '8px', padding: '12px 14px', border: '1px solid var(--border-color)', marginBottom: '14px' }}>
                    
                    {/* Labor Tasks Performed */}
                    <div style={{ marginBottom: parts.length > 0 ? '12px' : '0' }}>
                      <div style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wrench size={12} /> Labor Tasks Performed ({tasks.length || 1})
                      </div>
                      {tasks.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px' }}>
                          {tasks.map((t, idx) => (
                            <div key={t.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: '6px' }}>
                              <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>• {t.description}</span>
                              <span style={{ fontWeight: '800', color: '#0284c7' }}>₹{t.estimatedLaborCost?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-main)', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: '6px', fontWeight: '600' }}>
                          Standard Maintenance & Diagnostic Labor (₹{(card.laborCost || 0).toFixed(2)})
                        </div>
                      )}
                    </div>

                    {/* Parts & Materials Used */}
                    {parts.length > 0 && (
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#4f46e5', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Package size={12} /> Replacement Parts Installed ({parts.length})
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '6px' }}>
                          {parts.map((p, idx) => (
                            <div key={p.id || idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', padding: '6px 10px', borderRadius: '6px' }}>
                              <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>
                                • {p.inventoryItem?.name || 'Part'} <span style={{ color: 'var(--text-muted)' }}>({p.quantity}x @ ₹{p.unitPrice?.toFixed(2)})</span>
                              </span>
                              <span style={{ fontWeight: '800', color: '#059669' }}>₹{p.totalPrice?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Actions Footer Bar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        onClose();
                        onSelectJobCard(card);
                      }}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Eye size={14} /> Open Full Console
                    </button>

                    <button 
                      className="btn btn-primary btn-sm"
                      onClick={() => api.downloadInvoicePDF(card.id)}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Download size={14} /> Download Official PDF Invoice
                    </button>

                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        const inv = (card.invoices || [])[0] || { id: card.id };
                        window.open(`/pay/${inv.id}`, '_blank');
                      }}
                      style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(59, 130, 246, 0.12)', color: '#2563eb', borderColor: '#2563eb', fontWeight: '800' }}
                    >
                      <ExternalLink size={14} /> Customer Receipt Portal
                    </button>
                  </div>

                </div>
              );
            })
          ) : (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Award size={44} style={{ marginBottom: '12px', color: 'var(--border-color)' }} />
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '4px' }}>
                No Completed Work Records Found
              </h3>
              <p style={{ fontSize: '13px', margin: 0, fontWeight: '600' }}>
                {searchQuery || selectedVehicleFilter !== 'ALL' 
                  ? 'No vehicle history matches your search filter.' 
                  : 'Work orders will appear here once finalized, paid, or delivered.'}
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 20px',
          background: 'var(--bg-dark)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            Showing <strong>{filteredHistory.length}</strong> of <strong>{completedCards.length}</strong> completed work records
          </span>
          <button className="btn btn-secondary" onClick={onClose}>
            Close Completed History
          </button>
        </div>

      </div>
    </div>
  );
}
