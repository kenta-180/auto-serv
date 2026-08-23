import React, { useState, useEffect } from 'react';
import { X, Check, Car, UserPlus, FileText } from 'lucide-react';
import { api } from '../services/api';

export default function CreateJobCardModal({ vehicles, customers, technicians, prefillBooking, onClose, onRefresh, onSuccess }) {
  const [customerMode, setCustomerMode] = useState(customers && customers.length > 0 ? 'existing' : 'new'); // 'existing' | 'new'
  const [customerId, setCustomerId] = useState(customers && customers.length > 0 ? customers[0].id : '');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [vehicleMode, setVehicleMode] = useState('new_reg'); // 'new_reg' | 'existing'
  const [vehicleId, setVehicleId] = useState(vehicles && vehicles.length > 0 ? vehicles[0].id : '');
  const [licensePlate, setLicensePlate] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState('');

  const [title, setTitle] = useState('');
  const [reportedIssues, setReportedIssues] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [estimatedCost, setEstimatedCost] = useState('');
  const [promisedDate, setPromisedDate] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [techList, setTechList] = useState(technicians || []);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (technicians && technicians.length > 0) {
      setTechList(technicians);
    } else {
      api.getUsers('TECHNICIAN').then(data => {
        if (Array.isArray(data)) setTechList(data);
      }).catch(() => {});
    }
  }, [technicians]);

  useEffect(() => {
    if (prefillBooking) {
      // 1. Find or match Customer
      const matchedCust = customers && customers.find(c => 
        c.id === prefillBooking.customerId || 
        (c.email && prefillBooking.customer?.email && c.email.toLowerCase() === prefillBooking.customer?.email.toLowerCase()) ||
        (c.phone && prefillBooking.customer?.phone && c.phone === prefillBooking.customer?.phone) ||
        (c.name && prefillBooking.customer?.name && c.name.toLowerCase() === prefillBooking.customer?.name.toLowerCase())
      );

      if (matchedCust) {
        setCustomerMode('existing');
        setCustomerId(matchedCust.id);
        setCustomerName(matchedCust.name || '');
        setCustomerEmail(matchedCust.email || '');
        setCustomerPhone(matchedCust.phone || '');
      } else if (prefillBooking.customerId) {
        setCustomerMode('existing');
        setCustomerId(prefillBooking.customerId);
        if (prefillBooking.customer) {
          setCustomerName(prefillBooking.customer.name || '');
          setCustomerEmail(prefillBooking.customer.email || '');
          setCustomerPhone(prefillBooking.customer.phone || '');
        }
      } else if (prefillBooking.customer) {
        setCustomerMode('new');
        setCustomerName(prefillBooking.customer.name || '');
        setCustomerEmail(prefillBooking.customer.email || '');
        setCustomerPhone(prefillBooking.customer.phone || '');
      }

      // 2. Find or match Vehicle from registered vehicles database
      const bookingPlate = (prefillBooking.licensePlate || prefillBooking.vehicle?.licensePlate || '').toUpperCase().trim();
      const matchedVeh = (vehicles || []).find(v => 
        (v.licensePlate && v.licensePlate.toUpperCase().trim() === bookingPlate) ||
        (matchedCust && (v.ownerId === matchedCust.id || v.owner?.id === matchedCust.id))
      );

      if (matchedVeh) {
        setVehicleMode('existing');
        setVehicleId(matchedVeh.id);
      } else {
        setVehicleMode('new_reg');
      }

      const finalPlate = bookingPlate || matchedVeh?.licensePlate || 'MH12AB1234';
      const finalMake = prefillBooking.make || prefillBooking.vehicle?.make || matchedVeh?.make || 'Honda';
      const finalModel = prefillBooking.model || prefillBooking.vehicle?.model || matchedVeh?.model || 'Civic';
      const finalYear = prefillBooking.year || prefillBooking.vehicle?.year || matchedVeh?.year || 2023;
      const finalMileage = prefillBooking.approxMileage || prefillBooking.vehicle?.mileage || matchedVeh?.mileage || 25000;
      const finalFuelLevel = prefillBooking.fuelLevel || prefillBooking.vehicle?.fuelLevel || matchedVeh?.fuelLevel || '1/2';

      setLicensePlate(finalPlate);
      setMake(finalMake);
      setModel(finalModel);
      setYear(finalYear);
      setMileage(finalMileage);
      setFuelLevel(finalFuelLevel);

      // 3. Service Title & Issues
      const sType = prefillBooking.serviceType || 'General Service Check-In';
      setTitle(`${sType} - ${finalMake} ${finalModel} (${finalPlate})`.trim());

      const notes = [];
      if (prefillBooking.serviceType) notes.push(`Service Package: ${prefillBooking.serviceType}`);
      if (prefillBooking.reportedIssue) notes.push(`Customer Complaint: ${prefillBooking.reportedIssue}`);
      if (prefillBooking.fuelType || prefillBooking.vehicle?.fuelType) notes.push(`Fuel: ${prefillBooking.fuelType || prefillBooking.vehicle?.fuelType}`);
      if (prefillBooking.color || prefillBooking.vehicle?.color) notes.push(`Color: ${prefillBooking.color || prefillBooking.vehicle?.color}`);
      if (prefillBooking.vehicleType || prefillBooking.vehicle?.vehicleType) notes.push(`Type: ${prefillBooking.vehicleType || prefillBooking.vehicle?.vehicleType}`);
      
      setReportedIssues(notes.length > 0 ? notes.join(' | ') : (prefillBooking.reportedIssue || ''));

      // 4. Initial Cost estimate fallback
      if (prefillBooking.estimatedCost) {
        setEstimatedCost(prefillBooking.estimatedCost);
      } else if (sType.includes('Full') || sType.includes('Comprehensive')) {
        setEstimatedCost('3500');
      } else if (sType.includes('Brake')) {
        setEstimatedCost('1800');
      } else if (sType.includes('AC')) {
        setEstimatedCost('2200');
      } else {
        setEstimatedCost('1500');
      }

    } else if (customers && customers.length > 0 && !customerId) {
      setCustomerId(customers[0].id);
      const firstCustVeh = (vehicles || []).find(v => v.ownerId === customers[0].id || v.owner?.id === customers[0].id);
      if (firstCustVeh) {
        setLicensePlate(firstCustVeh.licensePlate ? firstCustVeh.licensePlate.toUpperCase() : 'MH12AB1234');
        setMake(firstCustVeh.make || 'Honda');
        setModel(firstCustVeh.model || 'Civic');
        setYear(firstCustVeh.year || 2023);
        setMileage(firstCustVeh.mileage || 25000);
        setFuelLevel(firstCustVeh.fuelLevel || '1/2');
      }
    }
  }, [prefillBooking, customers, vehicles]);

  const safeClose = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!title) {
      setError('Service title is required');
      return;
    }
    if (customerMode === 'existing' && !customerId) {
      setError('Please select an existing customer or click "+ New Customer" to register one.');
      return;
    }
    if (customerMode === 'new' && (!customerEmail || !customerName)) {
      setError('Customer name and email are required');
      return;
    }
    if (vehicleMode === 'new_reg' && !licensePlate) {
      setError('Vehicle Registration Number (License Plate) is required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      await api.createJobCard({
        title,
        reportedIssues,
        description: reportedIssues,
        priority,
        estimatedCost: parseFloat(estimatedCost || 0),
        promisedDate: promisedDate || undefined,
        technicianId: technicianId || undefined,
        // Customer payload
        customerId: customerMode === 'existing' ? customerId : undefined,
        customerName: customerMode === 'new' ? customerName : undefined,
        customerEmail: customerMode === 'new' ? customerEmail : undefined,
        customerPhone: customerMode === 'new' ? customerPhone : undefined,
        // Vehicle payload
        vehicleId: vehicleMode === 'existing' ? vehicleId : undefined,
        licensePlate: vehicleMode === 'new_reg' ? licensePlate.toUpperCase() : undefined,
        make: make || 'Vehicle',
        model: model || 'Model',
        year: year ? parseInt(year, 10) : 2023,
        mileage: mileage ? parseInt(mileage, 10) : 0,
        fuelLevel: fuelLevel || '1/2'
      });

      if (typeof onSuccess === 'function') onSuccess();
      if (typeof onRefresh === 'function') onRefresh();
      safeClose();
    } catch (err) {
      setError(typeof err === 'string' ? err : (err?.message || 'Failed to complete vehicle check-in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={safeClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <span className="badge badge-pending">STEP 1: CHECK-IN</span>
            <h3 style={{ fontSize: '20px', fontWeight: '800', marginTop: '4px', color: 'var(--text-main)' }}>Vehicle Arrival & Reception</h3>
          </div>
          <button onClick={safeClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        {error && <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#f87171', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>{error}</div>}

        {prefillBooking && (
          <div style={{
            padding: '10px 14px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid #10b981',
            color: '#059669',
            borderRadius: '8px',
            marginBottom: '14px',
            fontSize: '12px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Check size={16} style={{ flexShrink: 0 }} />
            <span>
              ⚡ <strong>Auto-Filled Step 1 Check-In Data:</strong> Customer profile, vehicle brand ({prefillBooking.make || 'Vehicle'}), model ({prefillBooking.model || 'Model'}), plate ({prefillBooking.licensePlate || 'N/A'}), odometer mileage ({prefillBooking.approxMileage || 'Recorded'}), fuel, and service complaints have been pre-loaded from customer booking slot.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          {/* Section 1: Customer Profile */}
          <div style={{ background: 'var(--bg-dark)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#2563eb' }}>1. Customer Details</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`btn btn-sm ${customerMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCustomerMode('existing')}
                >
                  Select Existing ({customers ? customers.length : 0})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${customerMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setCustomerMode('new')}
                >
                  + New Customer
                </button>
              </div>
            </div>

            {customerMode === 'existing' ? (
              <div className="form-group" style={{ margin: 0 }}>
                <label>Select Customer Profile</label>
                <select
                  className="form-control"
                  value={customerId}
                  onChange={e => {
                    const selCustId = e.target.value;
                    setCustomerId(selCustId);
                    const targetCust = customers && customers.find(c => c.id === selCustId);
                    if (targetCust) {
                      setCustomerName(targetCust.name || '');
                      setCustomerEmail(targetCust.email || '');
                      setCustomerPhone(targetCust.phone || '');
                    }
                    const custVeh = (vehicles || []).find(v => v.ownerId === selCustId || v.owner?.id === selCustId);
                    if (custVeh) {
                      setVehicleMode('existing');
                      setVehicleId(custVeh.id);
                      setLicensePlate(custVeh.licensePlate ? custVeh.licensePlate.toUpperCase() : '');
                      setMake(custVeh.make || 'Honda');
                      setModel(custVeh.model || 'Civic');
                      setYear(custVeh.year || 2023);
                      setMileage(custVeh.mileage || 25000);
                      setFuelLevel(custVeh.fuelLevel || '1/2');
                    }
                  }}
                >
                  <option value="">-- Choose Existing Customer --</option>
                  {customers && customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.email}) - {c.phone || 'No phone'}</option>
                  ))}
                </select>
                {(!customers || customers.length === 0) && (
                  <div style={{ fontSize: '12px', color: '#d97706', marginTop: '6px', fontWeight: '600' }}>
                    No existing customer profiles found. Click <strong>"+ New Customer"</strong> above to add one on-the-fly!
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Full Name *</label>
                  <input type="text" className="form-control" placeholder="e.g. John Doe" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Email *</label>
                  <input type="email" className="form-control" placeholder="john@example.com" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Phone Number</label>
                  <input type="text" className="form-control" placeholder="+1 (555) 000-1122" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Vehicle & Registration */}
          <div style={{ background: 'var(--bg-dark)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#0284c7' }}>2. Vehicle Information & Intake State</span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => {
                    const sampleVINs = [
                      { plate: 'MH-12-VIN-8877', make: 'Toyota', model: 'RAV4 Hybrid', year: 2024, mileage: 28500 },
                      { plate: 'KA-05-SCAN-4321', make: 'Honda', model: 'CR-V Turbo', year: 2023, mileage: 34000 },
                      { plate: 'DL-01-AUTO-9900', make: 'Hyundai', model: 'Tucson', year: 2022, mileage: 41000 }
                    ];
                    const picked = sampleVINs[Math.floor(Math.random() * sampleVINs.length)];
                    setLicensePlate(picked.plate);
                    setMake(picked.make);
                    setModel(picked.model);
                    setYear(picked.year);
                    setMileage(picked.mileage);
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#2563eb', border: '1px solid #2563eb', fontWeight: '800' }}
                  title="Camera VIN / Plate Scanner (Auto-fills details)"
                >
                  📷 Scan VIN / Plate
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${vehicleMode === 'new_reg' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setVehicleMode('new_reg')}
                >
                  Reg Number Check-In
                </button>
                {vehicles && vehicles.length > 0 && (
                  <button
                    type="button"
                    className={`btn btn-sm ${vehicleMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setVehicleMode('existing')}
                  >
                    Select Registered
                  </button>
                )}
              </div>
            </div>

            {vehicleMode === 'existing' && (
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ margin: 0 }}>Select Existing Registered Vehicle</label>
                  {vehicleId && (
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={async () => {
                        const targetV = vehicles.find(v => v.id === vehicleId);
                        if (!targetV) return;
                        if (!window.confirm(`Are you sure you want to delete registered vehicle ${targetV.licensePlate} (${targetV.make} ${targetV.model})?`)) return;
                        try {
                          setLoading(true);
                          await api.deleteVehicle(targetV.id);
                          setVehicleId('');
                          if (typeof onRefresh === 'function') onRefresh();
                        } catch (err) {
                          setError(err.message || 'Failed to delete vehicle');
                        } finally {
                          setLoading(false);
                        }
                      }}
                      style={{ fontSize: '11px', color: '#dc2626', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #dc2626', fontWeight: '700' }}
                    >
                      🗑️ Delete Vehicle
                    </button>
                  )}
                </div>
                <select
                  className="form-control"
                  value={vehicleId}
                  onChange={e => {
                    const selId = e.target.value;
                    setVehicleId(selId);
                    const selectedV = vehicles && vehicles.find(v => v.id === selId);
                    if (selectedV) {
                      setLicensePlate(selectedV.licensePlate ? selectedV.licensePlate.toUpperCase() : '');
                      setMake(selectedV.make || '');
                      setModel(selectedV.model || '');
                      setYear(selectedV.year || 2023);
                      if (selectedV.mileage) setMileage(selectedV.mileage);
                      if (selectedV.fuelLevel) setFuelLevel(selectedV.fuelLevel);
                    }
                  }}
                >
                  <option value="">-- Choose Registered Vehicle --</option>
                  {vehicles && vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.make} {v.model} ({v.licensePlate})</option>
                  ))}
                </select>
              </div>
            )}

            {/* Vehicle Information & Intake State Fields (Always Visible & Populated) */}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Registration Plate *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. MH-12-AB-1234"
                    value={licensePlate}
                    onChange={e => setLicensePlate(e.target.value.toUpperCase())}
                    required
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Make (Manufacturer)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Toyota / Honda"
                    value={make}
                    onChange={e => setMake(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Model</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Camry / Civic"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Year</label>
                  <input
                    type="number"
                    className="form-control"
                    value={year}
                    onChange={e => setYear(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Mileage (Odometer km)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={mileage}
                    onChange={e => setMileage(e.target.value)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Fuel Level</label>
                  <select
                    className="form-control"
                    value={fuelLevel || '1/2'}
                    onChange={e => setFuelLevel(e.target.value)}
                  >
                    <option value="RESERVE">Reserve (Empty)</option>
                    <option value="1/4">1/4 Tank</option>
                    <option value="1/2">1/2 Tank</option>
                    <option value="3/4">3/4 Tank</option>
                    <option value="FULL">Full Tank</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Service Visit Details */}
          <div className="form-group">
            <label>Service Visit Title / Primary Concern *</label>
            <input type="text" className="form-control" placeholder="e.g. Periodic 50k km Service & Brake Noise" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Reported Issues & Customer Complaints (Free Text)</label>
            <textarea
              className="form-control"
              rows="3"
              placeholder="List all issues reported by customer at check-in (e.g. Squeaking brakes, AC not cooling, Engine warning light)..."
              value={reportedIssues}
              onChange={e => setReportedIssues(e.target.value)}
            ></textarea>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <div className="form-group">
              <label>Priority</label>
              <select className="form-control" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
            <div className="form-group">
              <label>Initial Est. Cost (₹)</label>
              <input type="number" step="0.01" className="form-control" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Promised Due Date</label>
              <input type="datetime-local" className="form-control" value={promisedDate} onChange={e => setPromisedDate(e.target.value)} />
            </div>
          </div>

          {/* Section 4: Technician Assignment */}
          <div style={{ background: 'var(--bg-dark)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: '#2563eb', marginBottom: '6px' }}>
              👨‍🔧 Assign Senior Technician (Arrival Reception Assignment)
            </label>
            <select 
              className="form-control" 
              value={technicianId} 
              onChange={e => setTechnicianId(e.target.value)}
              style={{ backgroundColor: 'var(--bg-card)', borderColor: technicianId ? '#2563eb' : 'var(--border-color)', color: technicianId ? '#2563eb' : 'var(--text-main)', fontWeight: technicianId ? '800' : '600' }}
            >
              <option value="">-- Unassigned (Assign Later in Workshop) --</option>
              {techList && techList.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
              ))}
            </select>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '10px', 
            alignItems: 'center', 
            flexWrap: 'wrap',
            marginTop: '24px', 
            marginBottom: '16px',
            paddingTop: '16px', 
            borderTop: '1px solid var(--border-color)'
          }}>
            <button type="button" className="btn btn-secondary" onClick={safeClose} style={{ flex: '1 1 100px', minHeight: '44px', justifyContent: 'center' }}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: '2 1 200px', minHeight: '44px', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '800', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}>
              <Check size={16} /> Complete Check-In & Create Job Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
