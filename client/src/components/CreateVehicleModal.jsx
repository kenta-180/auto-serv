import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { api } from '../services/api';

export default function CreateVehicleModal({ customers, currentUser, onClose, onRefresh }) {
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2023);
  const [vin, setVin] = useState('');
  const [ownerId, setOwnerId] = useState(customers[0]?.id || currentUser.id);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!licensePlate || !make || !model || !year) {
      setError('Please fill in all required vehicle details.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      await api.createVehicle({
        licensePlate: licensePlate.toUpperCase(),
        make,
        model,
        year: parseInt(year, 10),
        vin,
        ownerId: currentUser.role === 'ADMIN' ? ownerId : currentUser.id
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
          <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Register Vehicle</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>License Plate *</label>
              <input type="text" className="form-control" placeholder="e.g. ABC-1234" value={licensePlate} onChange={e => setLicensePlate(e.target.value.toUpperCase())} required />
            </div>

            <div className="form-group">
              <label>Year *</label>
              <input type="number" min="1990" max="2027" className="form-control" value={year} onChange={e => setYear(e.target.value)} required />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Make (Manufacturer) *</label>
              <input type="text" className="form-control" placeholder="e.g. Toyota / Honda / BMW" value={make} onChange={e => setMake(e.target.value)} required />
            </div>

            <div className="form-group">
              <label>Model *</label>
              <input type="text" className="form-control" placeholder="e.g. Camry / Civic / M3" value={model} onChange={e => setModel(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>VIN (Vehicle Identification Number)</label>
            <input type="text" className="form-control" placeholder="17-character VIN code" value={vin} onChange={e => setVin(e.target.value.toUpperCase())} />
          </div>

          {currentUser.role === 'ADMIN' && customers.length > 0 && (
            <div className="form-group">
              <label>Vehicle Owner</label>
              <select className="form-control" value={ownerId} onChange={e => setOwnerId(e.target.value)}>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <Check size={14} /> Register Vehicle
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
