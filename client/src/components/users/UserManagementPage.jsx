import React, { useState } from 'react';
import { Users, UserPlus, Shield, Wrench, GraduationCap, ShieldAlert } from 'lucide-react';
import AddTechnicianModal from '../AddTechnicianModal';

export default function UserManagementPage({ currentUser, technicians = [], customers = [], onRefresh }) {
  const [showAddTechModal, setShowAddTechModal] = useState(false);

  if (currentUser?.role !== 'ADMIN') {
    return (
      <div style={{ background: '#1e293b', border: '1px solid #ef4444', borderRadius: '16px', padding: '32px', textAlign: 'center', margin: '20px 0' }}>
        <ShieldAlert size={48} color="#ef4444" style={{ marginBottom: '12px' }} />
        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444', marginBottom: '8px' }}>
          Admin Access Required
        </h3>
        <p style={{ fontSize: '14px', color: '#94a3b8', maxWidth: '400px', margin: '0 auto' }}>
          User management and staff account provisioning are restricted to System Administrators.
        </p>
      </div>
    );
  }

  const safeTechs = Array.isArray(technicians) ? technicians : [];
  const safeCusts = Array.isArray(customers) ? customers : [];

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
              border: '1px solid #2563eb',
              padding: '1px 6px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.4px'
            }}>
              <Shield size={11} style={{ display: 'inline', marginRight: '3px' }} /> Access & Identity Oversight
            </span>
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            User Accounts & Staff Directory
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0, fontWeight: '600' }}>
            Manage workshop Technicians and registered Customer/Student profiles.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center', flex: '1 1 180px', justifyContent: 'flex-end' }}>
          <button 
            type="button" 
            className="btn btn-primary"
            onClick={() => setShowAddTechModal(true)}
            style={{ height: '40px' }}
          >
            <UserPlus size={14} /> Add Technician
          </button>
        </div>
      </div>

      {/* Summary Metric Tiles (2 Tiles matching Dashboard Reference - Denser Scale) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px'
      }}>
        {/* Tile 1: Workshop Technicians */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Workshop Technicians</span>
            <div style={{ background: 'rgba(20, 184, 166, 0.15)', padding: '5px', borderRadius: '6px', color: '#0d9488' }}>
              <Wrench size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#0d9488' }}>{safeTechs.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Active Mechanics & Technicians</div>
        </div>

        {/* Tile 2: Customers & Students */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Customers & Students</span>
            <div style={{ background: 'rgba(168, 85, 247, 0.15)', padding: '5px', borderRadius: '6px', color: '#7e22ce' }}>
              <GraduationCap size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#7e22ce' }}>{safeCusts.length}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Registered Accounts</div>
        </div>
      </div>

      {/* Technicians Section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0d9488', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Wrench size={18} /> Workshop Technicians ({safeTechs.length})
        </h3>

        {/* DESKTOP TABLE VIEW */}
        <div className="desktop-table-view custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {safeTechs.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{t.name}</td>
                  <td style={{ color: 'var(--text-main)' }}>{t.email}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.phone || 'N/A'}</td>
                  <td><span className="badge badge-assigned">TECHNICIAN</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="mobile-cards-view" style={{ display: 'none', flexDirection: 'column', gap: '8px' }}>
          {safeTechs.map(t => (
            <div key={t.id} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>{t.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.email} {t.phone ? `• ${t.phone}` : ''}</div>
              </div>
              <span className="badge badge-assigned" style={{ fontSize: '10px' }}>TECHNICIAN</span>
            </div>
          ))}
        </div>
      </div>

      {/* Customers & Students Section */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#7e22ce', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <GraduationCap size={18} /> Customers & Students ({safeCusts.length})
        </h3>

        {/* DESKTOP TABLE VIEW */}
        <div className="desktop-table-view custom-table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {safeCusts.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: '700', color: 'var(--text-main)' }}>{c.name}</td>
                  <td style={{ color: 'var(--text-main)' }}>{c.email}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.phone || 'N/A'}</td>
                  <td><span className="badge badge-invoiced">STUDENT / CUSTOMER</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="mobile-cards-view" style={{ display: 'none', flexDirection: 'column', gap: '8px' }}>
          {safeCusts.map(c => (
            <div key={c.id} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '700', color: 'var(--text-main)', fontSize: '13px' }}>{c.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.email} {c.phone ? `• ${c.phone}` : ''}</div>
              </div>
              <span className="badge badge-invoiced" style={{ fontSize: '10px' }}>CUSTOMER</span>
            </div>
          ))}
        </div>
      </div>

      {showAddTechModal && (
        <AddTechnicianModal
          onClose={() => setShowAddTechModal(false)}
          onSuccess={() => {
            setShowAddTechModal(false);
            if (typeof onRefresh === 'function') onRefresh();
          }}
        />
      )}

    </div>
  );
}
