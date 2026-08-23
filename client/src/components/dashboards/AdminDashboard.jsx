import React from 'react';
import { 
  DollarSign, Clock, Package, AlertTriangle, Users, CheckCircle2, 
  ArrowUpRight, TrendingUp, Shield, Wrench, Plus, UserPlus
} from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function AdminDashboard({ 
  jobCards = [], 
  inventory = [], 
  customers = [], 
  onNavigateTab, 
  onOpenCheckIn, 
  onOpenAddTech,
  onOpenHistoryModal,
  onOpenAttendance
}) {
  const { t, getStatusLabel, formatCurrency } = useLanguage();
  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];

  // Metrics Calculations
  const totalRevenue = safeJobCards
    .filter(c => c && (c.status === 'PAID' || c.status === 'DELIVERED'))
    .reduce((sum, c) => sum + (c.totalCost || 0), 0);

  const pendingPayments = safeJobCards
    .filter(c => c && (c.status === 'INVOICED' || c.status === 'QC_PASSED'))
    .reduce((sum, c) => sum + (c.totalCost || 0), 0);

  const stockValuation = safeInventory
    .reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitPrice || 0)), 0);

  const lowStockCount = safeInventory
    .filter(item => (item.quantity || 0) <= 5).length;

  const activeWorkOrders = safeJobCards
    .filter(c => c && c.status !== 'DELIVERED').length;

  // Task Completion Rate %
  const totalTasksCount = safeJobCards.reduce((sum, c) => sum + (c.tasks?.length || 0), 0);
  const completedTasksCount = safeJobCards.reduce((sum, c) => 
    sum + (c.tasks?.filter(t => t.status === 'COMPLETED')?.length || 0), 0);
  const taskCompletionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 85;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        justify: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#2563eb',
              border: '1px solid #3b82f6',
              padding: '1px 6px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.4px'
            }}>
              <Shield size={11} style={{ display: 'inline', marginRight: '3px' }} /> Executive Portal
            </span>
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            {t('dashboard.welcome_admin')}
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
            {t('dashboard.admin_subtitle')}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 240px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onOpenAttendance}
            style={{ flex: '1 1 120px', height: '40px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid #2563eb', fontWeight: '800' }}
          >
            📅 {t('actions.attendance_roster')}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onOpenHistoryModal}
            style={{ flex: '1 1 120px', height: '40px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid #10b981', fontWeight: '800' }}
          >
            📋 {t('actions.view_history')}
          </button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={onOpenCheckIn}
            style={{ flex: '1 1 120px', height: '40px' }}
          >
            <Plus size={14} /> {t('actions.create_job_card')}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary" 
            onClick={onOpenAddTech}
            style={{ flex: '1 1 120px', height: '40px' }}
          >
            <UserPlus size={14} /> {t('actions.add_technician')}
          </button>
        </div>
      </div>

      {/* Required Admin Dashboard Tiles (6 Compact Tiles) */}
      <div className="dashboard-stat-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
        
        {/* Tile 1: Total Revenue */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>{t('dashboard.total_revenue')}</span>
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#059669' }}>
              <DollarSign size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#059669' }}>{formatCurrency(totalRevenue)}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>Settled Paid & Invoiced</div>
        </div>

        {/* Tile 2: Task Completion Rate % */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>{t('dashboard.completion_rate')}</span>
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#16a34a' }}>
              <TrendingUp size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#16a34a' }}>{taskCompletionRate}%</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>Work Order Efficiency</div>
        </div>

        {/* Tile 3: Today's Scheduled Bookings */}
        <div 
          onClick={() => onNavigateTab && onNavigateTab('schedule')}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid #2563eb',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer'
          }}
          title="Click to open Admin Master Schedule"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Today's Bookings</span>
            <div style={{ background: 'rgba(37, 99, 235, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#2563eb' }}>
              <Clock size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb' }}>
            {safeJobCards.filter(c => c && c.status === 'CHECKED_IN').length} {getStatusLabel('CHECKED_IN')}
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
            <span>Master 2-Hour Slots</span> <ArrowUpRight size={10} />
          </div>
        </div>

        {/* Tile 4: Pending Payments */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>{t('dashboard.pending_invoices')}</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#d97706' }}>
              <Clock size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#d97706' }}>{formatCurrency(pendingPayments)}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>Awaiting Settlement</div>
        </div>

        {/* Tile 5: Total Stock Valuation */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>{t('dashboard.stock_valuation')}</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#2563eb' }}>
              <Package size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#2563eb' }}>{formatCurrency(stockValuation)}</div>
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>Total Asset Value</div>
        </div>

        {/* Tile 6: Low-Stock Alerts */}
        <div 
          onClick={() => onNavigateTab('inventory', { lowStockOnly: true })}
          style={{
            background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
            border: lowStockCount > 0 ? '1px solid #ef4444' : '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '6px 10px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Click to view low-stock items in Inventory"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '800', color: lowStockCount > 0 ? '#dc2626' : 'var(--text-main)', textTransform: 'uppercase' }}>
              {t('inventory.low_stock_count')}
            </span>
            <div style={{ background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.15)', padding: '3px 5px', borderRadius: '4px', color: lowStockCount > 0 ? '#dc2626' : 'var(--text-muted)' }}>
              <AlertTriangle size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: lowStockCount > 0 ? '#dc2626' : 'var(--text-main)' }}>
            {lowStockCount} Items
          </div>
          <div style={{ fontSize: '9px', color: lowStockCount > 0 ? '#fca5a5' : '#64748b', marginTop: '1px' }}>Reorder Threshold ≤5</div>
        </div>

        {/* Tile 7: Active Customers */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' }}>Active Customers</span>
            <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '3px 5px', borderRadius: '4px', color: '#c084fc' }}>
              <Users size={13} />
            </div>
          </div>
          <div style={{ fontSize: '14px', fontWeight: '800', color: '#c084fc' }}>{safeCustomers.length}</div>
          <div style={{ fontSize: '9px', color: '#64748b', marginTop: '1px' }}>Registered Accounts</div>
        </div>
      </div>

      {/* Recent Work Orders Overview */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#fff', margin: 0 }}>
            {t('dashboard.recent_job_cards')} ({activeWorkOrders})
          </h3>
          <button 
            type="button" 
            className="btn btn-secondary btn-sm"
            onClick={() => onNavigateTab('job-cards')}
          >
            {t('nav.job_cards')} &rarr;
          </button>
        </div>

        <div className="custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>{t('job_cards.card_number')}</th>
                <th>{t('job_cards.vehicle')}</th>
                <th>{t('job_cards.customer')}</th>
                <th>{t('job_cards.status')}</th>
                <th>{t('job_cards.total_cost')}</th>
              </tr>
            </thead>
            <tbody>
              {safeJobCards.slice(0, 5).map(card => (
                <tr key={card.id}>
                  <td style={{ fontWeight: '800', color: '#60a5fa' }}>{card.cardNumber}</td>
                  <td>{card.vehicle?.make} {card.vehicle?.model} ({card.vehicle?.licensePlate})</td>
                  <td>{card.customer?.name}</td>
                  <td><span className={`badge badge-${card.status?.toLowerCase()}`}>{getStatusLabel(card.status)}</span></td>
                  <td style={{ fontWeight: '700', color: '#34d399' }}>{formatCurrency(card.totalCost || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
