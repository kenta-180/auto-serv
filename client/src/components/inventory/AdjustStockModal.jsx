import React, { useState } from 'react';
import { X, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function AdjustStockModal({ item, onClose, onSuccess }) {
  const { t } = useLanguage();
  const [delta, setDelta] = useState(5);
  const [actionType, setActionType] = useState('add'); // 'add' | 'subtract'
  const [reason, setReason] = useState('Supplier Stock Replenishment');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!item) return null;

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const adjustmentDelta = actionType === 'subtract' ? -Math.abs(parseInt(delta, 10)) : Math.abs(parseInt(delta, 10));

    if (item.quantity + adjustmentDelta < 0) {
      setError('Cannot decrease stock below zero.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await api.updateStock(item.id, adjustmentDelta, reason);
      if (typeof onSuccess === 'function') onSuccess();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      setError(err.message || 'Failed to adjust stock quantity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="badge badge-assigned">STOCK ADJUSTMENT</span>
            <h3 style={{ fontSize: '18px', fontWeight: '800', margin: '4px 0 0 0', color: 'var(--text-main)' }}>{item.name}</h3>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>SKU: {item.sku} | Current Stock: <strong>{item.quantity}</strong></span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#dc2626', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
            <button
              type="button"
              className={`btn btn-sm ${actionType === 'add' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActionType('add')}
              style={{ flex: 1 }}
            >
              + Add Restock (+)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${actionType === 'subtract' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setActionType('subtract')}
              style={{ flex: 1, background: actionType === 'subtract' ? '#ef4444' : undefined, borderColor: actionType === 'subtract' ? '#ef4444' : undefined }}
            >
              - Draw / Deduct (-)
            </button>
          </div>

          <div className="form-group">
            <label>Quantity to {actionType === 'add' ? 'Add' : 'Deduct'}</label>
            <input type="number" className="form-control" value={delta} onChange={e => setDelta(e.target.value)} min="1" required />
          </div>

          <div className="form-group">
            <label>Audit Reason / Notes</label>
            <input type="text" className="form-control" placeholder="e.g. Supplier invoice restock, Damaged part write-off" value={reason} onChange={e => setReason(e.target.value)} required />
          </div>

          <div style={{ background: 'var(--bg-dark)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px', fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
            New Calculated Stock: <strong style={{ color: '#059669' }}>
              {item.quantity + (actionType === 'subtract' ? -Math.abs(parseInt(delta || 0, 10)) : Math.abs(parseInt(delta || 0, 10)))}
            </strong> units
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <RefreshCw size={14} /> Record Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
