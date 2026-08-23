import React, { useState } from 'react';
import { 
  Search, Filter, Plus, Eye, ChevronLeft, ChevronRight, Wrench, Shield, Car, Clock, CheckCircle2, FileText, Calendar
} from 'lucide-react';
import AdminSchedulePage from '../booking/AdminSchedulePage';
import { useLanguage } from '../../context/LanguageContext';

export default function JobCardsPage({ 
  currentUser, 
  jobCards = [], 
  onSelectJobCard, 
  onOpenCheckIn,
  onOpenHistoryModal
}) {
  const { t, getStatusLabel, formatCurrency } = useLanguage();
  const [activeView, setActiveView] = useState('job-cards'); // 'job-cards' | 'master-schedule'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];

  // Role Filtering (Server-scoped records for customer/student role)
  const roleFilteredCards = safeJobCards.filter(card => {
    if (!card) return false;
    if (currentUser?.role === 'TECHNICIAN') {
      return card.technicianId === currentUser.id;
    }
    if (currentUser?.role === 'CUSTOMER' || currentUser?.role === 'STUDENT') {
      return true; // Server API already filtered job cards specifically for this customer account
    }
    return true; // ADMIN sees all
  });

  // Search & Status Filtering
  const filteredCards = roleFilteredCards.filter(card => {
    const matchesStatus = statusFilter === 'ALL' || card.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      card.cardNumber?.toLowerCase().includes(q) ||
      card.title?.toLowerCase().includes(q) ||
      card.vehicle?.licensePlate?.toLowerCase().includes(q) ||
      card.customer?.name?.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  // Metrics for tiles
  const totalCount = roleFilteredCards.length;
  const inProgressCount = roleFilteredCards.filter(c => c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED').length;
  const pendingQcCount = roleFilteredCards.filter(c => c.status === 'QC_PENDING' || c.status === 'INSPECTED').length;
  const completedCount = roleFilteredCards.filter(c => c.status === 'DELIVERED' || c.status === 'PAID' || c.status === 'QC_PASSED').length;
  const totalDailyCapacity = 25; // 5 slots x 5 vehicle capacity
  const activeOccupiedSlots = roleFilteredCards.filter(c => c.status !== 'DELIVERED' && c.status !== 'CANCELLED').length;
  const remainingSlotsCount = Math.max(0, totalDailyCapacity - activeOccupiedSlots);

  // Cursor/Offset Pagination (10 per page)
  const totalPages = Math.ceil(filteredCards.length / itemsPerPage) || 1;
  const paginatedCards = filteredCards.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* View Switcher Segmented Control Bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '6px',
        background: 'var(--bg-dark)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '4px'
      }}>
        <button
          type="button"
          onClick={() => setActiveView('job-cards')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: activeView === 'job-cards' ? '1px solid #3b82f6' : '1px solid transparent',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            background: activeView === 'job-cards' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
            color: activeView === 'job-cards' ? '#ffffff' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: activeView === 'job-cards' ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
          }}
        >
          <Wrench size={15} /> Job Cards Directory
        </button>

        <button
          type="button"
          onClick={() => setActiveView('master-schedule')}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            border: activeView === 'master-schedule' ? '1px solid #3b82f6' : '1px solid transparent',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            background: activeView === 'master-schedule' ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : 'transparent',
            color: activeView === 'master-schedule' ? '#ffffff' : '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease',
            boxShadow: activeView === 'master-schedule' ? '0 2px 8px rgba(37, 99, 235, 0.3)' : 'none'
          }}
        >
          <Calendar size={15} /> Master Schedule
        </button>
      </div>

      {/* Conditional View Switching */}
      {activeView === 'master-schedule' ? (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', overflow: 'hidden' }}>
          <AdminSchedulePage onOpenCheckInWithBooking={onOpenCheckIn} />
        </div>
      ) : (
        <React.Fragment>
          {/* Summary Metric Tiles (4 Tiles in balanced 2x2 Grid) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px'
          }}>
            {/* Tile 1: Active In-Progress */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Active In-Progress</span>
                <div style={{ background: 'rgba(139, 92, 246, 0.15)', padding: '5px', borderRadius: '6px', color: '#8b5cf6' }}>
                  <Clock size={16} />
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#8b5cf6' }}>{inProgressCount}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Under Technician Service</div>
            </div>

            {/* Tile 2: Inspection / QC Gate */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Inspection & QC Gate</span>
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '5px', borderRadius: '6px', color: '#d97706' }}>
                  <FileText size={16} />
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>{pendingQcCount}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Awaiting QC Inspection Pass</div>
            </div>

            {/* Tile 3: Completed & Delivered */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Completed & Delivered</span>
                <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '5px', borderRadius: '6px', color: '#059669' }}>
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>{completedCount}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>QC Passed & Handed Over</div>
            </div>

            {/* Tile 4: Available Slot Capacity / Remaining Vehicles in Slots */}
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Remaining Vehicles in Slots</span>
                <div style={{ background: 'rgba(56, 189, 248, 0.15)', padding: '5px', borderRadius: '6px', color: '#0284c7' }}>
                  <Car size={16} />
                </div>
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#0284c7' }}>{remainingSlotsCount}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Open Slot Capacity Today</div>
            </div>
          </div>

          {/* Controls Bar: Side-by-Side Search & Status Filter (Search is horizontally larger) */}
          <div className="controls-bar" style={{ margin: 0, width: '100%' }}>
            <div className="controls-filters" style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'center', 
              gap: '8px', 
              width: '100%' 
            }}>
              <div className="search-box" style={{ flex: '2.2 1 65%', minWidth: 0, position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search plate, customer, card #..."
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  style={{ paddingLeft: '36px', width: '100%', height: '40px', fontSize: '13px' }}
                />
              </div>

              <select 
                className="form-control filter-select" 
                value={statusFilter} 
                onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                style={{ flex: '1 1 35%', minWidth: 0, height: '40px', fontSize: '12px' }}
              >
                <option value="ALL">All Lifecycle Statuses</option>
                <option value="CHECKED_IN">CHECKED_IN (Step 1)</option>
                <option value="INSPECTED">INSPECTED (Step 2)</option>
                <option value="ESTIMATE_APPROVED">ESTIMATE_APPROVED (Step 2)</option>
                <option value="ASSIGNED">ASSIGNED (Step 3)</option>
                <option value="IN_PROGRESS">IN_PROGRESS (Step 4)</option>
                <option value="UNFINISHED">UNFINISHED (Draft / Hold)</option>
                <option value="QC_PASSED">QC_PASSED (Step 5)</option>
                <option value="INVOICED">INVOICED (Step 6)</option>
                <option value="PAID">PAID (Step 6)</option>
                <option value="DELIVERED">DELIVERED (Step 7)</option>
              </select>
            </div>
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="desktop-table-view custom-table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Job Card #</th>
                  <th>Vehicle / Plate</th>
                  <th>Customer</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Total Cost (₹)</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedCards.length > 0 ? (
                  paginatedCards.map(card => (
                    <tr key={card.id}>
                      <td style={{ fontWeight: '800', color: '#60a5fa' }}>{card.cardNumber}</td>
                      <td>
                        <div style={{ fontWeight: '700', color: '#f8fafc' }}>{card.vehicle?.make} {card.vehicle?.model}</div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{card.vehicle?.licensePlate}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: '600' }}>{card.customer?.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{card.customer?.phone || card.customer?.email}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: '13px', color: card.technician ? '#38bdf8' : '#64748b' }}>
                          {card.technician?.name || 'Unassigned'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${card.status?.toLowerCase()}`}>
                          {card.status}
                        </span>
                      </td>
                      <td style={{ fontWeight: '800', color: '#34d399' }}>
                        ₹{card.totalCost?.toFixed(2) || '0.00'}
                      </td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => onSelectJobCard(card)}>
                          <Eye size={14} /> Open Console
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No job cards found matching the criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE COMPACT CARDS VIEW */}
          <div className="mobile-cards-view" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
            {paginatedCards.length > 0 ? (
              paginatedCards.map(card => (
                <div 
                  key={card.id} 
                  onClick={() => onSelectJobCard(card)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: 0 }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                        {card.cardNumber}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {card.vehicle?.make} {card.vehicle?.model} <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>({card.vehicle?.licensePlate})</span>
                      </span>
                    </div>
                    <span className={`badge badge-${card.status?.toLowerCase()}`} style={{ fontSize: '10px', padding: '2px 6px', flexShrink: 0 }}>
                      {card.status}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '1' }}>
                      <span style={{ fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        👤 {card.customer?.name}
                      </span>
                      {card.customer?.phone && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', flexShrink: 0, fontWeight: '600' }}>• {card.customer.phone}</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', background: card.technician ? 'rgba(56, 189, 248, 0.15)' : 'var(--bg-dark)', color: card.technician ? '#0284c7' : 'var(--text-muted)', border: `1px solid ${card.technician ? '#0284c7' : 'var(--border-color)'}`, fontWeight: '700' }}>
                        🔧 {card.technician?.name || 'Unassigned'}
                      </span>
                      <span style={{ fontWeight: '800', color: '#059669', fontSize: '13px' }}>
                        ₹{card.totalCost?.toFixed(2) || '0.00'}
                      </span>
                    </div>
                  </div>

                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      type="button" 
                      className="btn btn-secondary btn-sm" 
                      onClick={(e) => { e.stopPropagation(); onSelectJobCard(card); }}
                      style={{ width: '100%', minHeight: '34px', justifyContent: 'center', fontSize: '12px', fontWeight: '700' }}
                    >
                      <Eye size={14} /> Open Workstation Console
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', background: '#1e293b', borderRadius: '10px' }}>
                No job cards found matching the criteria.
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Page {currentPage} of {totalPages} ({filteredCards.length} total)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </React.Fragment>
      )}

    </div>
  );
}
