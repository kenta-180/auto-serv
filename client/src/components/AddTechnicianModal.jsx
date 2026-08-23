import React, { useState } from 'react';
import { X, Check, UserPlus, Wrench } from 'lucide-react';
import { api } from '../services/api';

export default function AddTechnicianModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const safeClose = () => {
    if (typeof onClose === 'function') onClose();
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!name || !email || !password) {
      setError('Technician name, email, and password are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await api.createUser({
        name,
        email,
        phone,
        password,
        role: 'TECHNICIAN'
      });

      if (typeof onSuccess === 'function') onSuccess();
      safeClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to add technician'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={safeClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="badge badge-in_progress" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Wrench size={12} /> ADMIN USER MANAGEMENT
            </span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: 'var(--text-main)' }}>Add Master Technician</h3>
          </div>
          <button onClick={safeClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Technician Full Name *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. David Vance"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address (Login Username) *</label>
            <input
              type="email"
              className="form-control"
              placeholder="e.g. david.tech@autoserv.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. +1 (555) 018-9944"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Account Password *</label>
            <input
              type="text"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block', fontWeight: '600' }}>
              Default initial login password for this technician profile.
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={safeClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              <UserPlus size={14} /> Register Technician Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
