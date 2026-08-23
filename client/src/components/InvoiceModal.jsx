import React, { useState } from 'react';
import { X, Check, Printer, CreditCard, Send, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function InvoiceModal({ invoice, currentUser, onClose, onRefresh }) {
  const { t, formatCurrency, formatDate, getStatusLabel } = useLanguage();
  const [paymentMethod, setPaymentMethod] = useState('CARD');
  const [ref, setRef] = useState(`TXN-${Date.now().toString().slice(-6)}`);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [waLoading, setWaLoading] = useState(false);

  // Restrict WhatsApp feature exclusively to TECHNICIAN or ADMIN roles
  const isTechOrAdmin = currentUser?.role === 'TECHNICIAN' || currentUser?.role === 'ADMIN';

  const handlePay = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');
      await api.recordPayment(invoice.id, paymentMethod, ref);
      if (typeof onRefresh === 'function') onRefresh();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = async () => {
    try {
      setWaLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await api.sendInvoiceWhatsApp(invoice.id);
      setSuccessMsg(res.message || `Official Tax Invoice sent via WhatsApp to customer's verified number! ✓`);
    } catch (err) {
      setError(err.message || 'Failed to send WhatsApp invoice.');
    } finally {
      setWaLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '640px', background: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '700' }}>{invoice.invoiceNumber}</span>
            <h2 style={{ fontSize: '20px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>Workshop Tax Invoice</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isTechOrAdmin && (
              <button 
                className="btn btn-sm" 
                onClick={handleSendWhatsApp}
                disabled={waLoading}
                style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid #10b981', fontWeight: '700' }}
                title="Send Tax Invoice PDF & UPI Link to Customer Verified WhatsApp"
              >
                <Send size={14} /> {waLoading ? 'Sending...' : '📱 Send to Verified WhatsApp'}
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={handlePrint}>
              <Printer size={14} /> Print / Save PDF
            </button>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </div>

        {error && <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.15)', color: '#dc2626', border: '1px solid #ef4444', borderRadius: '6px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}
        {successMsg && <div style={{ padding: '8px 12px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid #10b981', borderRadius: '6px', marginBottom: '12px', fontSize: '13px', fontWeight: '700' }}>{successMsg}</div>}

        {/* Printable Receipt Body - Dynamic Theme Compatible */}
        <div style={{ background: 'var(--bg-dark)', padding: '20px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '20px', color: 'var(--text-main)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px', marginBottom: '14px' }}>
            <div>
              <div style={{ fontWeight: '800', fontSize: '16px', color: '#2563eb' }}>AUTO-SERV WORKSHOP</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>100 Service Station Way, Tech District</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Support: +1 (800) 555-AUTO</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className={`badge ${invoice.status === 'PAID' ? 'badge-completed' : 'badge-pending'}`}>
                {invoice.status}
              </span>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Date: {new Date(invoice.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px', fontSize: '13px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Billed To:</span>
              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{invoice.customer?.name}</div>
              <div style={{ color: 'var(--text-muted)' }}>{invoice.customer?.email}</div>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Vehicle Service details:</span>
              <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{invoice.jobCard?.title}</div>
              <div style={{ color: '#0284c7', fontWeight: '600' }}>
                {invoice.jobCard?.vehicle?.make} {invoice.jobCard?.vehicle?.model} ({invoice.jobCard?.vehicle?.licensePlate})
              </div>
            </div>
          </div>

          {/* Line items */}
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
              <span>Labor Service Charge:</span>
              <span style={{ fontWeight: '600' }}>₹{invoice.jobCard?.laborCost?.toFixed(2)}</span>
            </div>
            {invoice.jobCard?.parts && invoice.jobCard.parts.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                <span>{p.quantity} x {p.inventoryItem?.name} ({p.inventoryItem?.sku})</span>
                <span>₹{p.totalPrice?.toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '12px', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>Subtotal:</span>
                <span>₹{invoice.subtotal?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>GST / Tax (10%):</span>
                <span>₹{invoice.tax?.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: '800', color: '#059669', marginTop: '6px' }}>
                <span>Grand Total:</span>
                <span>₹{invoice.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Action Bar */}
        {invoice.status === 'UNPAID' ? (
          <div style={{ background: 'var(--bg-dark)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: 'var(--text-main)' }}>Process & Verify Payment</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Method</label>
                <select className="form-control" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                  <option value="CARD">Credit / Debit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="RAZORPAY">Razorpay / Stripe Online</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Transaction Ref Code</label>
                <input type="text" className="form-control" value={ref} onChange={e => setRef(e.target.value)} />
              </div>
            </div>
            <button className="btn btn-success" onClick={handlePay} disabled={loading} style={{ width: '100%' }}>
              <CreditCard size={16} /> Confirm Paid & Complete Work Order
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid #10b981', borderRadius: '12px', color: '#059669', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <div style={{ fontWeight: '800', fontSize: '15px' }}>
              ✓ Invoice fully paid on {new Date(invoice.paidAt || invoice.updatedAt).toLocaleDateString()}
            </div>
            {isTechOrAdmin && (
              <button
                className="btn"
                onClick={handleSendWhatsApp}
                disabled={waLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#ffffff',
                  fontWeight: '800',
                  fontSize: '13px',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.4)'
                }}
              >
                <Send size={16} /> {waLoading ? 'Dispatching WhatsApp Invoice...' : '📱 Send Paid Invoice & Receipt to Customer Verified WhatsApp'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
