import React, { useState } from 'react';
import { X, Plus, Package } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function AddInventoryModal({ onClose, onSuccess }) {
  const { t } = useLanguage();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('PARTS');
  const [partType, setPartType] = useState('REGULAR'); // FAST_MOVING | REGULAR | SERVICE_PART
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!sku || !name) {
      setError('SKU code and Part Name are required');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.createInventoryItem({
        sku: sku.trim().toUpperCase(),
        name: name.trim(),
        category,
        partType,
        quantity: parseInt(quantity || 0, 10),
        unitPrice: parseFloat(unitPrice || 0)
      });
      if (typeof onSuccess === 'function') onSuccess();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      setError(err.message || 'Failed to add inventory item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Package size={18} color="#2563eb" /> Add Inventory Item
          </h3>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>SKU / Part Code *</label>
            <input type="text" className="form-control" placeholder="e.g. BRK-PAD-001" value={sku} onChange={e => setSku(e.target.value.toUpperCase())} required />
          </div>

          <div className="form-group">
            <label>Part / Item Name *</label>
            <input type="text" className="form-control" placeholder="e.g. Ceramic Front Brake Pads" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div className="form-group">
              <label>Category</label>
              <select className="form-control" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="PARTS">PARTS</option>
                <option value="FLUIDS">FLUIDS</option>
                <option value="FILTERS">FILTERS</option>
                <option value="TYRES">TYRES</option>
                <option value="CONSUMABLES">CONSUMABLES</option>
              </select>
            </div>

            <div className="form-group">
              <label>Part Type Classification *</label>
              <select className="form-control" value={partType} onChange={e => setPartType(e.target.value)}>
                <option value="FAST_MOVING">⚡ Fast-Moving</option>
                <option value="REGULAR">📦 Regular</option>
                <option value="SERVICE_PART">🔧 Service Part</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div className="form-group">
              <label>Initial Stock Quantity</label>
              <input type="number" className="form-control" value={quantity} onChange={e => setQuantity(e.target.value)} min="0" />
            </div>

            <div className="form-group">
              <label>Unit Selling Price (₹)</label>
              <input type="number" step="0.01" className="form-control" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} min="0" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} style={{ flex: '1 1 120px', minHeight: '38px', justifyContent: 'center' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: '1 1 140px', minHeight: '38px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={14} /> Add Stock Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
