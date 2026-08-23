import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function CreateItemModal({ onClose, onRefresh }) {
  const { t } = useLanguage();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [quantity, setQuantity] = useState(10);
  const [minimumStock, setMinimumStock] = useState(5);
  const [unitPrice, setUnitPrice] = useState(19.99);
  const [location, setLocation] = useState('Shelf A-1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sku || !name || unitPrice === undefined) {
      setError('SKU, Name, and Unit Price are required.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.createInventoryItem({
        sku,
        name,
        category,
        quantity: parseInt(quantity, 10),
        minimumStock: parseInt(minimumStock, 10),
        unitPrice: parseFloat(unitPrice),
        location
      });
      onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>{t('actions.add_inventory_item') || 'Add Inventory Item'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>{t('inventory.sku') || 'SKU / Part Code'} *</label>
              <input type="text" className="form-control" placeholder="e.g. BRK-5021" value={sku} onChange={e => setSku(e.target.value.toUpperCase())} required />
            </div>

            <div className="form-group">
              <label>{t('inventory.category') || 'Category'}</label>
              <input type="text" className="form-control" placeholder="e.g. Brakes / Fluids" value={category} onChange={e => setCategory(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>{t('inventory.item_name') || 'Item Name'} *</label>
            <input type="text" className="form-control" placeholder="e.g. Rear Disc Brake Pads" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div className="form-group">
              <label>{t('inventory.quantity') || 'Initial Stock'}</label>
              <input type="number" min="0" className="form-control" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>

            <div className="form-group">
              <label>{t('inventory.minimum_stock') || 'Min Alert Stock'}</label>
              <input type="number" min="1" className="form-control" value={minimumStock} onChange={e => setMinimumStock(e.target.value)} />
            </div>

            <div className="form-group">
              <label>{t('inventory.unit_price') || 'Unit Price'} *</label>
              <input type="number" step="0.01" className="form-control" value={unitPrice} onChange={e => setUnitPrice(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>{t('inventory.location') || 'Storage Location'}</label>
            <input type="text" className="form-control" placeholder="e.g. Shelf B-4" value={location} onChange={e => setLocation(e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('actions.cancel') || 'Cancel'}</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={14} /> {t('actions.save') || 'Save to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
