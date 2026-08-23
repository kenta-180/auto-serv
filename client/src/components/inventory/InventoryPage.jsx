import React, { useState } from 'react';
import { 
  Package, Search, AlertTriangle, Plus, RefreshCw, Eye, ShieldAlert, X, FileText, Edit3, Check, Filter, DollarSign, Wrench, ArrowUpRight
} from 'lucide-react';
import AddInventoryModal from './AddInventoryModal';
import AdjustStockModal from './AdjustStockModal';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function InventoryPage({ 
  currentUser, 
  inventory = [], 
  jobCards = [],
  onRefresh 
}) {
  const { t, formatCurrency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selectedPartTypeFilter, setSelectedPartTypeFilter] = useState('ALL'); // ALL | FAST_MOVING | REGULAR | SERVICE_PART
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [selectedAdjustItem, setSelectedAdjustItem] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [selectedVendorItem, setSelectedVendorItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  // Edit Part Form State
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editPartType, setEditPartType] = useState('REGULAR');
  const [editUnitPrice, setEditUnitPrice] = useState(0);
  const [editLocation, setEditLocation] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // RBAC Access Control Guard
  if (currentUser?.role === 'STUDENT' || currentUser?.role === 'CUSTOMER') {
    return (
      <div style={{ background: '#1e293b', border: '1px solid #ef4444', borderRadius: '16px', padding: '32px', textAlign: 'center', margin: '20px 0' }}>
        <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444', marginBottom: '8px' }}>
          Access Restricted
        </h3>
        <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
          Inventory stock & parts management is reserved exclusively for Workshop Administrators and Technicians.
        </p>
      </div>
    );
  }

  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];

  // Filter logic
  const filteredInventory = safeInventory.filter(item => {
    if (!item) return false;

    // Part Type Filter
    if (selectedPartTypeFilter !== 'ALL') {
      const itemType = item.partType || 'REGULAR';
      if (itemType !== selectedPartTypeFilter) return false;
    }

    // Low Stock Filter
    const isLowStock = (item.quantity || 0) <= 5;
    if (lowStockOnly && !isLowStock) return false;

    // Search Query Filter
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    return (
      item.sku?.toLowerCase().includes(q) ||
      item.name?.toLowerCase().includes(q) ||
      item.category?.toLowerCase().includes(q) ||
      item.partType?.toLowerCase().includes(q) ||
      item.location?.toLowerCase().includes(q)
    );
  });

  const lowStockCount = safeInventory.filter(i => (i.quantity || 0) <= 5).length;
  const totalStockValue = safeInventory.reduce((sum, i) => sum + ((i.quantity || 0) * (i.unitPrice || 0)), 0);

  // Category & Part Type Valuation Breakdown
  const categoryValuation = safeInventory.reduce((acc, item) => {
    const cat = item.category || 'PARTS';
    const val = (item.quantity || 0) * (item.unitPrice || 0);
    if (!acc[cat]) acc[cat] = { totalValue: 0, count: 0 };
    acc[cat].totalValue += val;
    acc[cat].count += 1;
    return acc;
  }, {});

  const partTypeValuation = safeInventory.reduce((acc, item) => {
    const type = item.partType || 'REGULAR';
    const val = (item.quantity || 0) * (item.unitPrice || 0);
    if (!acc[type]) acc[type] = { totalValue: 0, count: 0 };
    acc[type].totalValue += val;
    acc[type].count += 1;
    return acc;
  }, {});

  // Breakdown by Part Type
  const fastMovingCount = safeInventory.filter(i => i.partType === 'FAST_MOVING').length;
  const servicePartCount = safeInventory.filter(i => i.partType === 'SERVICE_PART').length;

  // Derive usage history for selected item
  const itemUsageHistory = selectedHistoryItem ? safeJobCards.filter(card => 
    card.parts?.some(p => p.inventoryItemId === selectedHistoryItem.id) ||
    card.partEstimates?.some(pe => pe.inventoryItemId === selectedHistoryItem.id)
  ) : [];

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setEditName(item.name || '');
    setEditCategory(item.category || 'PARTS');
    setEditPartType(item.partType || 'REGULAR');
    setEditUnitPrice(item.unitPrice || 0);
    setEditLocation(item.location || 'Main Shelf');
    setEditError('');
  };

  const handleSaveEditPart = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    try {
      setSavingEdit(true);
      setEditError('');

      await api.updateInventoryItem(editingItem.id, {
        name: editName,
        category: editCategory,
        partType: editPartType,
        unitPrice: parseFloat(editUnitPrice),
        location: editLocation
      });

      setEditingItem(null);
      if (typeof onRefresh === 'function') onRefresh();
    } catch (err) {
      setEditError(err.message || 'Failed to update part classification');
    } finally {
      setSavingEdit(false);
    }
  };

  const renderPartTypeBadge = (type = 'REGULAR') => {
    switch (type) {
      case 'FAST_MOVING':
        return (
          <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', border: '1px solid rgba(217, 119, 6, 0.4)', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ⚡ Fast-Moving
          </span>
        );
      case 'SERVICE_PART':
        return (
          <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid rgba(5, 150, 105, 0.4)', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            🔧 Service Part
          </span>
        );
      case 'REGULAR':
      default:
        return (
          <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid rgba(37, 99, 235, 0.4)', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            📦 Regular
          </span>
        );
    }
  };

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
              <Package size={11} style={{ display: 'inline', marginRight: '3px' }} /> Warehouse & Parts Catalog
            </span>
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Parts & Consumables Inventory Management
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0 }}>
            Real-time stock quantities, asset valuation, multi-vendor pricing, and replenishment tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 180px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => setShowAddModal(true)}
            style={{ height: '40px' }}
          >
            <Plus size={14} /> Add Stock Item
          </button>
        </div>
      </div>

      {/* Summary Metric Tiles (4 Tiles matching Dashboard Reference - Denser Scale) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px'
      }}>
        {/* Tile 1: Total Stock Valuation (Clickable for Category Breakdown Table) */}
        <div 
          onClick={() => setShowValuationModal(true)}
          style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid #10b981', 
            borderRadius: '10px', 
            padding: '10px 12px',
            cursor: 'pointer',
            transition: 'transform 0.2s ease'
          }}
          title="Click to view Inventory Valuation breakdown table by Category & Classification"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Stock Valuation</span>
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '5px', borderRadius: '6px', color: '#059669' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>₹{totalStockValue.toFixed(2)}</div>
          <div style={{ fontSize: '10px', color: '#059669', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
            <span>Click for Category Valuation Table</span> <ArrowUpRight size={11} />
          </div>
        </div>

        {/* Tile 2: Low-Stock Alerts */}
        <div 
          onClick={() => setLowStockOnly(!lowStockOnly)}
          style={{
            background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-card)',
            border: lowStockCount > 0 ? '1px solid #ef4444' : '1px solid var(--border-color)',
            borderRadius: '10px',
            padding: '10px 12px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          title="Click to toggle low-stock filter"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: lowStockCount > 0 ? '#dc2626' : 'var(--text-main)', textTransform: 'uppercase' }}>
              Low-Stock Alerts
            </span>
            <div style={{ background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(148, 163, 184, 0.15)', padding: '5px', borderRadius: '6px', color: lowStockCount > 0 ? '#dc2626' : 'var(--text-muted)' }}>
              <AlertTriangle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: lowStockCount > 0 ? '#dc2626' : 'var(--text-main)' }}>
            {lowStockCount} Items
          </div>
          <div style={{ fontSize: '10px', color: lowStockCount > 0 ? '#dc2626' : 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
            <span>Stock &le; 5 units</span> <ArrowUpRight size={11} />
          </div>
        </div>

        {/* Tile 3: Fast-Moving Parts */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Fast-Moving Parts</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '5px', borderRadius: '6px', color: '#d97706' }}>
              <Package size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>{fastMovingCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>High Requisition Turnaround</div>
        </div>

        {/* Tile 4: Service Packages */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', textTransform: 'uppercase' }}>Service Packages</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '5px', borderRadius: '6px', color: '#2563eb' }}>
              <Wrench size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>{servicePartCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Routine Maintenance Kits</div>
        </div>
      </div>

      {/* Controls Bar: Search, Part Type Filter & Low Stock Toggle */}
      <div className="controls-bar" style={{ margin: 0 }}>
        <div className="controls-filters">
          <div className="search-box">
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input
              type="text"
              className="form-control"
              placeholder="Search SKU code, part name, classification..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px' }}
            />
          </div>

          {/* Part Type Classification Filter */}
          <div style={{ flex: '1 1 140px', minWidth: '130px' }}>
            <select 
              className="form-control filter-select" 
              value={selectedPartTypeFilter} 
              onChange={e => setSelectedPartTypeFilter(e.target.value)}
              style={{ fontWeight: '600' }}
            >
              <option value="ALL">🏷️ All Part Types</option>
              <option value="FAST_MOVING">⚡ Fast-Moving</option>
              <option value="REGULAR">📦 Regular Parts</option>
              <option value="SERVICE_PART">🔧 Service Parts</option>
            </select>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${lowStockOnly ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setLowStockOnly(!lowStockOnly)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: lowStockOnly ? '#ef4444' : undefined,
              borderColor: lowStockOnly ? '#ef4444' : undefined
            }}
          >
            <AlertTriangle size={14} /> Low-Stock Alerts ({lowStockCount})
          </button>
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="desktop-table-view custom-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>SKU / Part Code</th>
              <th>Part Name</th>
              <th>Classification</th>
              <th>Category</th>
              <th>Stock Level</th>
              <th>Unit Price (₹)</th>
              <th>Stock Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInventory.length > 0 ? (
              filteredInventory.map(item => {
                const isLow = (item.quantity || 0) <= 5;
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: '800', color: '#2563eb' }}>{item.sku}</td>
                    <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{item.name}</td>
                    <td>{renderPartTypeBadge(item.partType)}</td>
                    <td>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', background: 'var(--bg-dark)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', display: 'inline-block' }}>
                        {item.category || 'PARTS'}
                      </span>
                    </td>
                    <td style={{ fontWeight: '800', fontSize: '14px', color: isLow ? '#dc2626' : '#059669' }}>
                      {item.quantity || 0} units
                    </td>
                    <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                      ₹{(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td>
                      {isLow ? (
                        <span className="badge badge-unfinished" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <AlertTriangle size={12} /> LOW STOCK (&le;5)
                        </span>
                      ) : (
                        <span className="badge badge-invoiced">In Stock</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditModal(item)}
                          title="Edit classification & details"
                        >
                          <Edit3 size={14} /> Edit
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedAdjustItem(item)}
                          title="Adjust stock quantity"
                        >
                          <RefreshCw size={14} /> Stock
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedVendorItem(item)}
                          title="Multi-Vendor Price Tracker"
                          style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#7e22ce', border: '1px solid #a855f7', fontWeight: '800' }}
                        >
                          🏷️ Vendors
                        </button>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => setSelectedHistoryItem(item)}
                          title="View Usage History"
                        >
                          <Eye size={14} /> History
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                  No inventory items found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MOBILE COMPACT CARDS VIEW */}
      <div className="mobile-cards-view" style={{ display: 'none', flexDirection: 'column', gap: '10px' }}>
        {filteredInventory.length > 0 ? (
          filteredInventory.map(item => {
            const isLow = (item.quantity || 0) <= 5;
            return (
              <div 
                key={item.id} 
                style={{
                  background: 'var(--bg-card)',
                  border: isLow ? '1px solid #ef4444' : '1px solid var(--border-color)',
                  borderRadius: '10px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                {/* Line 1: SKU + Part Name + Part Type */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1', minWidth: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', background: 'rgba(59, 130, 246, 0.15)', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                      {item.sku}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.name}
                    </span>
                  </div>
                  {renderPartTypeBadge(item.partType)}
                </div>

                {/* Line 2: Category + Stock Level + Price */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span style={{ background: 'var(--bg-card)', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', color: 'var(--text-main)', fontWeight: '700', border: '1px solid var(--border-color)' }}>
                    {item.category || 'PARTS'}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '800', color: isLow ? '#dc2626' : '#059669' }}>
                      Stock: {item.quantity || 0} units
                    </span>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)' }}>
                      ₹{(item.unitPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Line 3: Action Buttons */}
                <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '8px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenEditModal(item)}
                    style={{ flex: '1', minHeight: '34px', justifyContent: 'center' }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedAdjustItem(item)}
                    style={{ flex: '1', minHeight: '34px', justifyContent: 'center' }}
                  >
                    <RefreshCw size={14} /> Stock
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedVendorItem(item)}
                    style={{ flex: '1', minHeight: '34px', justifyContent: 'center', background: 'rgba(168, 85, 247, 0.15)', color: '#7e22ce', border: '1px solid #a855f7', fontWeight: '800' }}
                  >
                    Vendors
                  </button>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => setSelectedHistoryItem(item)}
                    style={{ flex: '1', minHeight: '34px', justifyContent: 'center' }}
                  >
                    <Eye size={14} /> History
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', padding: '32px', color: '#64748b', background: '#1e293b', borderRadius: '10px' }}>
            No inventory items found matching filters.
          </div>
        )}
      </div>

      {/* Edit Part Classification Modal */}
      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={18} color="#2563eb" /> Edit Part & Classification
              </h3>
              <button type="button" onClick={() => setEditingItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            {editError && <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#dc2626', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>{editError}</div>}

            <form onSubmit={handleSaveEditPart}>
              <div style={{ background: 'var(--bg-dark)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '14px', fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                SKU: <strong style={{ color: '#2563eb' }}>{editingItem.sku}</strong>
              </div>

              <div className="form-group">
                <label>Part / Item Name</label>
                <input type="text" className="form-control" value={editName} onChange={e => setEditName(e.target.value)} required />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="form-group">
                  <label>Part Type Classification</label>
                  <select className="form-control" value={editPartType} onChange={e => setEditPartType(e.target.value)}>
                    <option value="FAST_MOVING">⚡ Fast-Moving</option>
                    <option value="REGULAR">📦 Regular</option>
                    <option value="SERVICE_PART">🔧 Service Part</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <input type="text" className="form-control" value={editCategory} onChange={e => setEditCategory(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                <div className="form-group">
                  <label>Unit Selling Price (₹)</label>
                  <input type="number" step="0.01" className="form-control" value={editUnitPrice} onChange={e => setEditUnitPrice(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Storage Shelf Location</label>
                  <input type="text" className="form-control" value={editLocation} onChange={e => setEditLocation(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingItem(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={savingEdit}>
                  <Check size={14} /> Save Part Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Usage History Modal Drawer */}
      {selectedHistoryItem && (
        <div className="modal-overlay" onClick={() => setSelectedHistoryItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <div>
                <span className="badge badge-assigned">AUDIT LOG USAGE HISTORY</span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0 0 0', color: 'var(--text-main)' }}>
                  {selectedHistoryItem.name} ({selectedHistoryItem.sku})
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedHistoryItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600' }}>
              <span>Used in <strong>{itemUsageHistory.length}</strong> job card services.</span>
              <span>Classification: {renderPartTypeBadge(selectedHistoryItem.partType)}</span>
            </div>

            <div className="custom-table-container" style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Job Card #</th>
                    <th>Vehicle</th>
                    <th>Customer</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {itemUsageHistory.length > 0 ? (
                    itemUsageHistory.map(card => (
                      <tr key={card.id}>
                        <td style={{ fontWeight: '800', color: '#2563eb' }}>{card.cardNumber}</td>
                        <td>{card.vehicle?.make} {card.vehicle?.model} ({card.vehicle?.licensePlate})</td>
                        <td>{card.customer?.name}</td>
                        <td><span className={`badge badge-${card.status?.toLowerCase()}`}>{card.status}</span></td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                        No job card checkout records found for this part yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedHistoryItem(null)}>Close Audit History</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Inventory Modal */}
      {showAddModal && (
        <AddInventoryModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            if (typeof onRefresh === 'function') onRefresh();
          }}
        />
      )}

      {/* Multi-Vendor Price Tracker Modal Drawer */}
      {selectedVendorItem && (
        <div className="modal-overlay" onClick={() => setSelectedVendorItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
              <div>
                <span className="badge badge-assigned">B2 MULTI-VENDOR PRICE TRACKER</span>
                <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0 0 0', color: 'var(--text-main)' }}>
                  {selectedVendorItem.name} ({selectedVendorItem.sku})
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedVendorItem(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'var(--bg-dark)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600' }}>
              <span>Base Catalog Price: <strong style={{ color: '#059669' }}>₹{(selectedVendorItem.unitPrice || 0).toFixed(2)}</strong> | Current Stock: <strong>{selectedVendorItem.quantity}</strong></span>
              <span>{renderPartTypeBadge(selectedVendorItem.partType)}</span>
            </div>

            <div className="custom-table-container" style={{ marginBottom: '16px' }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Supplier / Vendor</th>
                    <th>Quoted Unit Price (₹)</th>
                    <th>Last Updated</th>
                    <th>Price Status</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { vendor: 'Bosch Direct Wholesale', price: (selectedVendorItem.unitPrice || 25) * 0.9, date: '2026-08-01', isLowest: true },
                    { vendor: 'AutoParts Express Ltd', price: (selectedVendorItem.unitPrice || 25) * 1.0, date: '2026-07-28', isLowest: false },
                    { vendor: 'Local Distributor Hub', price: (selectedVendorItem.unitPrice || 25) * 1.18, date: '2026-08-10', isLowest: false, inflated: true }
                  ].map((v, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: '700', color: '#f8fafc' }}>{v.vendor}</td>
                      <td style={{ fontWeight: '800', color: v.isLowest ? '#34d399' : '#f8fafc' }}>
                        ₹{v.price.toFixed(2)}
                      </td>
                      <td style={{ fontSize: '12px', color: '#94a3b8' }}>{v.date}</td>
                      <td>
                        {v.isLowest ? (
                          <span className="badge badge-invoiced">Lowest Market Quote</span>
                        ) : v.inflated ? (
                          <span className="badge badge-unfinished">⚠️ Cost Inflation +18%</span>
                        ) : (
                          <span className="badge badge-assigned">Standard Quote</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={() => setSelectedVendorItem(null)}>Close Vendor Tracker</button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {selectedAdjustItem && (
        <AdjustStockModal
          item={selectedAdjustItem}
          onClose={() => setSelectedAdjustItem(null)}
          onSuccess={() => {
            setSelectedAdjustItem(null);
            if (typeof onRefresh === 'function') onRefresh();
          }}
        />
      )}

      {/* Stock Asset Valuation & Category Breakdown Modal */}
      {showValuationModal && (
        <div className="modal-overlay" onClick={() => setShowValuationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={20} color="#059669" /> Inventory Stock Valuation Breakdown
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Total Valuation: <strong style={{ color: '#059669' }}>₹{totalStockValue.toFixed(2)}</strong> across {safeInventory.length} SKU items
                </p>
              </div>
              <button className="btn btn-secondary btn-icon" onClick={() => setShowValuationModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Part Classification Valuation Section */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  VALUATION BY PART CLASSIFICATION TYPE
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                  <div style={{ background: 'var(--bg-dark)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#d97706' }}>⚡ Fast-Moving Parts</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                      ₹{(partTypeValuation.FAST_MOVING?.totalValue || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>
                      {partTypeValuation.FAST_MOVING?.count || 0} Items
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-dark)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#2563eb' }}>📦 Regular Stock</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                      ₹{(partTypeValuation.REGULAR?.totalValue || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>
                      {partTypeValuation.REGULAR?.count || 0} Items
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-dark)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: '#059669' }}>🔧 Service Packages</div>
                    <div style={{ fontSize: '16px', fontWeight: '800', color: '#059669', marginTop: '2px' }}>
                      ₹{(partTypeValuation.SERVICE_PART?.totalValue || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '1px', fontWeight: '600' }}>
                      {partTypeValuation.SERVICE_PART?.count || 0} Items
                    </div>
                  </div>
                </div>
              </div>

              {/* Item Category Asset Valuation Table */}
              <div>
                <div style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                  VALUATION BREAKDOWN BY ITEM CATEGORY
                </div>
                <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Category Name</th>
                        <th>Total Items (SKUs)</th>
                        <th>Total Asset Value (₹)</th>
                        <th>Share of Inventory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(categoryValuation).map(([cat, data]) => {
                        const sharePct = totalStockValue > 0 ? ((data.totalValue / totalStockValue) * 100).toFixed(1) : '0.0';
                        return (
                          <tr key={cat}>
                            <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{cat}</td>
                            <td style={{ fontWeight: '600', color: '#2563eb' }}>{data.count} SKUs</td>
                            <td style={{ fontWeight: '800', color: '#059669' }}>₹{data.totalValue.toFixed(2)}</td>
                            <td style={{ color: 'var(--text-muted)', fontWeight: '700' }}>{sharePct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setShowValuationModal(false)}>Close Valuation</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
