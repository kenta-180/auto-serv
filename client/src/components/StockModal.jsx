import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function StockModal({ item, onClose, onRefresh }) {
  const { t } = useLanguage();
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState('Stock Audit Adjustment');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!delta || parseInt(delta, 10) === 0) {
      setError('Please specify a positive or negative stock adjustment value.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.updateStock(item.id, parseInt(delta, 10), reason);
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{t('inventory.adjust_stock') || 'Adjust Stock'}</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>{item.name} (SKU: {item.sku})</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

        <div style={{ background: '#0f172a', padding: '12px', borderRadius: '6px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', color: '#94a3b8' }}>{t('inventory.current_stock') || 'Current Stock'}:</span>
          <span style={{ fontSize: '15px', fontWeight: '700', color: '#38bdf8' }}>{item.quantity} units</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('inventory.stock_change') || 'Stock Quantity Change (+/-)'}</label>
            <input
              type="number"
              className="form-control"
              placeholder="e.g. +10 or -5"
              value={delta}
              onChange={e => setDelta(e.target.value)}
              required
            />
            <span style={{ fontSize: '11px', color: '#64748b' }}>Use positive numbers to add stock, negative to reduce stock.</span>
          </div>

          <div className="form-group">
            <label>{t('inventory.reason') || 'Mandatory Reason (Logged in Audit Log)'}</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Received new shipment / Damaged stock"
              value={reason}
              onChange={e => setReason(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('actions.cancel') || 'Cancel'}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={14} /> {t('actions.save') || 'Confirm & Log Audit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
