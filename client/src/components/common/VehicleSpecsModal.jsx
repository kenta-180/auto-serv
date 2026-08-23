import React from 'react';
import { X, Wrench, Fuel, Gauge, Droplet, CheckCircle, Info } from 'lucide-react';

export default function VehicleSpecsModal({ onClose }) {
  const specsData = [
    {
      category: '🛞 Wheel Lug Nut Torque Specs',
      color: '#2563eb',
      items: [
        { label: 'Hatchback / Compact Cars', value: '100 N·m (74 lb-ft)' },
        { label: 'Sedans / Mid-size Cars', value: '110 N·m (81 lb-ft)' },
        { label: 'SUVs / Crossovers / Trucks', value: '135 N·m (100 lb-ft)' },
        { label: 'Alloy Wheels (Aluminum)', value: 'Re-torque after 50 km' }
      ]
    },
    {
      category: '🛢️ Engine Oil Viscosity & Capacities',
      color: '#059669',
      items: [
        { label: 'Standard 4-Cylinder Petrol', value: '5W-30 Synthetic (3.5L - 4.0L)' },
        { label: 'Eco / Hybrid Engine', value: '0W-20 Low Viscosity (3.2L)' },
        { label: 'Turbo Diesel / Heavy Duty', value: '5W-40 / 10W-40 (4.5L - 5.5L)' },
        { label: 'Drain Plug Torque', value: '25 - 30 N·m (Replace Washer)' }
      ]
    },
    {
      category: '🛑 Brake System & Tire Pressure',
      color: '#d97706',
      items: [
        { label: 'Brake Fluid Spec', value: 'DOT 4 Synthetic (Boiling Pt >230°C)' },
        { label: 'Min Brake Pad Thickness', value: '3.0 mm (Replace immediately if <2mm)' },
        { label: 'Caliper Mounting Bolt Torque', value: '35 N·m (Front) / 30 N·m (Rear)' },
        { label: 'Tire Pressure (Cold)', value: '32 PSI (Standard) / 35 PSI (Loaded)' }
      ]
    },
    {
      category: '⚡ Ignition & Electrical Specs',
      color: '#7c3aed',
      items: [
        { label: 'Spark Plug Electrode Gap', value: '0.8 mm - 1.1 mm (Iridium/Platinum)' },
        { label: 'Battery Standby Voltage', value: '12.6V (100%) / <12.0V (Discharged)' },
        { label: 'Alternator Charging Voltage', value: '13.8V - 14.4V (Engine Running)' },
        { label: 'Coolant Mixture Ratio', value: '50/50 Antifreeze & Distilled Water' }
      ]
    }
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '24px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          color: 'var(--text-main)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '8px', borderRadius: '10px', color: '#2563eb' }}>
              <Wrench size={22} color="#2563eb" />
            </div>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                Workshop Torque & Fluid Specifications Cheat-Sheet
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Instant technician reference guide for lug nut torques, fluid capacities, and electrical targets.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Specs Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {specsData.map((section, idx) => (
            <div key={idx} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px' }}>
              <div style={{ fontSize: '13px', fontWeight: '800', color: section.color, marginBottom: '10px' }}>
                {section.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {section.items.map((item, itemIdx) => (
                  <div key={itemIdx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '4px 0', borderBottom: itemIdx < section.items.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{item.label}:</span>
                    <span style={{ fontWeight: '700', color: 'var(--text-main)', background: 'var(--bg-card)', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info note */}
        <div style={{ marginTop: '20px', padding: '10px 14px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6', borderRadius: '8px', fontSize: '11px', color: '#2563eb', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
          <span>Note: Always verify manufacturer specific service manual values for specialized performance vehicles.</span>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={onClose}
          style={{ width: '100%', marginTop: '16px', height: '40px' }}
        >
          Close Cheat-Sheet
        </button>
      </div>
    </div>
  );
}
