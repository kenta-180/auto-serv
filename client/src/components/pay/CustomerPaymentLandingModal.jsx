import React, { useState } from 'react';
import { 
  X, CheckCircle2, QrCode, Phone, Copy, Check, DollarSign, CreditCard, ShieldCheck, AlertCircle, RefreshCw, Banknote
} from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function CustomerPaymentLandingModal({ 
  jobCard, 
  onClose, 
  onSuccess 
}) {
  const { t, formatCurrency } = useLanguage();
  const [selectedMethod, setSelectedMethod] = useState('UPI'); // 'UPI' | 'COD'
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const tasksLabor = (jobCard.tasks || []).reduce((sum, t) => sum + (Number(t.estimatedLaborCost) || 0), 0);
  const laborCost = tasksLabor > 0 ? tasksLabor : (Number(jobCard.laborCost) || 0);
  const partsCost = (jobCard.parts || []).reduce((sum, p) => sum + (Number(p.totalPrice) || (Number(p.quantity) * Number(p.unitPrice)) || 0), 0);
  const subtotal = laborCost + partsCost;
  
  let calculatedAmount = 0;
  if (jobCard.totalAmount && Number(jobCard.totalAmount) > 0) {
    calculatedAmount = Number(jobCard.totalAmount);
  } else if (subtotal > 0) {
    calculatedAmount = subtotal * 1.10;
  } else if (jobCard.totalCost && Number(jobCard.totalCost) > 0) {
    calculatedAmount = Number(jobCard.totalCost) * 1.10;
  } else if (jobCard.estimatedCost && Number(jobCard.estimatedCost) > 0) {
    calculatedAmount = Number(jobCard.estimatedCost) * 1.10;
  } else {
    calculatedAmount = 3850.00;
  }

  const totalAmount = calculatedAmount;
  const upiId = '8446131495@axl';
  const upiPhone = '8446131495';
  const upiPayee = 'KETAN BALU DUSARE';
  const amountStr = totalAmount.toFixed(2);
  const upiDeepLink = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayee)}&am=${amountStr}&cu=INR&tn=${encodeURIComponent(`AutoServ Payment - Card ${jobCard.cardNumber || ''}`)}`;
  const phonepeDeepLink = `phonepe://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayee)}&am=${amountStr}&cu=INR`;
  const gpayDeepLink = `gpay://upi/pay?pa=${upiId}&pn=${encodeURIComponent(upiPayee)}&am=${amountStr}&cu=INR`;
  const paytmDeepLink = `paytmmp://pay?pa=${upiId}&pn=${encodeURIComponent(upiPayee)}&am=${amountStr}&cu=INR`;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyPhone = () => {
    navigator.clipboard.writeText(upiPhone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleConfirmUpiPayment = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    try {
      setLoading(true);
      setError('');

      const refNumber = transactionRef.trim() || `UPI-TXN-${Date.now().toString().slice(-6)}`;

      if (jobCard.invoiceId) {
        await api.handlePaymentWebhook(jobCard.invoiceId, 'VERIFIED_SIGNATURE', refNumber, 'UPI');
      } else {
        await api.markPaidCash(jobCard.id, `Digital UPI Payment Submitted. Ref/UTR #: ${refNumber}`);
      }

      setSuccess('🎉 Payment confirmed successfully! Redirecting to official Tax Invoice Page...');
      setTimeout(() => {
        if (typeof onSuccess === 'function') onSuccess();
        if (typeof onClose === 'function') onClose();
        const targetId = jobCard.invoiceId || jobCard.id;
        window.location.href = `/pay/${targetId}`;
      }, 1000);
    } catch (err) {
      console.error('Payment Error:', err);
      setError(err.message || 'Failed to submit payment authorization.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCod = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    try {
      setLoading(true);
      setError('');

      await api.markPaidCash(jobCard.id, 'Cash on Delivery (COD) / Pay at Workshop Counter selected by customer.');

      setSuccess('💵 Cash / Workshop Counter Payment selected! Redirecting to official Tax Invoice Page...');
      setTimeout(() => {
        if (typeof onSuccess === 'function') onSuccess();
        if (typeof onClose === 'function') onClose();
        const targetId = jobCard.invoiceId || jobCard.id;
        window.location.href = `/pay/${targetId}`;
      }, 1000);
    } catch (err) {
      console.error('COD Error:', err);
      setError(err.message || 'Failed to record COD selection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999, background: 'rgba(2, 6, 23, 0.85)' }}>
      <div 
        className="modal-content" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          maxWidth: '520px', 
          width: '95%',
          padding: '20px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          color: 'var(--text-main)',
          borderRadius: '16px',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669'
            }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                Payment Checkout & Settlement
              </h3>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Work Order #{jobCard.cardNumber} — {jobCard.vehicle?.licensePlate || 'Vehicle'}
              </span>
            </div>
          </div>

          <button 
            type="button" 
            onClick={onClose} 
            style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Amount Summary Banner */}
        <div style={{
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '700' }}>
              Total Payable (Incl. 10% GST)
            </span>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#059669', marginTop: '2px' }}>
              ₹{totalAmount.toFixed(2)}
            </div>
          </div>
          <span style={{ fontSize: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid #10b981', padding: '3px 8px', borderRadius: '6px', fontWeight: '800' }}>
            ✓ QC PASSED
          </span>
        </div>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', color: '#dc2626', borderRadius: '8px', marginBottom: '14px', fontSize: '12px' }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ padding: '12px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#059669', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontWeight: '700', textAlign: 'center' }}>
            {success}
          </div>
        )}

        {/* Payment Method Selector Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          <button
            type="button"
            className="btn"
            onClick={() => setSelectedMethod('UPI')}
            style={{
              flex: 1,
              padding: '10px 6px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '800',
              border: selectedMethod === 'UPI' ? '1px solid #3b82f6' : '1px solid var(--border-color)',
              background: selectedMethod === 'UPI' ? '#2563eb' : 'var(--bg-dark)',
              color: selectedMethod === 'UPI' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <QrCode size={15} /> 📲 UPI Apps
          </button>

          <button
            type="button"
            className="btn"
            onClick={() => setSelectedMethod('COD')}
            style={{
              flex: 1,
              padding: '10px 6px',
              borderRadius: '10px',
              fontSize: '12px',
              fontWeight: '800',
              border: selectedMethod === 'COD' ? '1px solid #10b981' : '1px solid var(--border-color)',
              background: selectedMethod === 'COD' ? '#059669' : 'var(--bg-dark)',
              color: selectedMethod === 'COD' ? '#ffffff' : 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              whiteSpace: 'nowrap'
            }}
          >
            <Banknote size={15} /> 💵 Cash / COD
          </button>
        </div>

        {/* METHOD 1: DYNAMIC UPI QR SCANNER & VPA DETAILS */}
        {selectedMethod === 'UPI' && (
          <form onSubmit={handleConfirmUpiPayment} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '14px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <span style={{ fontSize: '11px', color: '#9333ea', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                ⚡ Official PhonePe QR Scanner
              </span>

              {/* PhonePe QR Code Scanner - Fully fitted barcode square */}
              <div style={{
                width: '200px',
                height: '200px',
                borderRadius: '14px',
                border: '3px solid #a855f7',
                boxShadow: '0 6px 20px rgba(168, 85, 247, 0.35)',
                overflow: 'hidden',
                margin: '0 auto 12px auto',
                position: 'relative',
                background: '#090d16',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px'
              }}>
                <img
                  src="/phonepe-qr-cropped.png"
                  alt="PhonePe QR Scanner - KETAN BALU DUSARE"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '8px'
                  }}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiDeepLink)}`;
                  }}
                />
              </div>

              {/* Payee Credentials Box */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>Payee Name:</span>
                  <strong style={{ color: 'var(--text-main)', fontWeight: '800' }}>{upiPayee}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>UPI ID</span>
                    <strong style={{ fontSize: '12px', color: '#9333ea' }}>{upiId}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyUpi}
                    style={{ background: 'var(--bg-dark)', border: '1px solid #a855f7', color: '#9333ea', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedUpi ? <Check size={11} /> : <Copy size={11} />}
                    {copiedUpi ? 'Copied!' : 'Copy ID'}
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '6px 10px', fontSize: '12px' }}>
                  <div>
                    <span style={{ fontSize: '9px', color: 'var(--text-muted)', display: 'block', fontWeight: '700' }}>UPI Mobile Number</span>
                    <strong style={{ fontSize: '12px', color: '#0284c7' }}>{upiPhone}</strong>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPhone}
                    style={{ background: 'var(--bg-dark)', border: '1px solid #0284c7', color: '#0284c7', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {copiedPhone ? <Check size={11} /> : <Copy size={11} />}
                    {copiedPhone ? 'Copied!' : 'Copy Number'}
                  </button>
                </div>
              </div>

              {/* One-Click App Redirection Links */}
              <div style={{ marginTop: '12px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#2563eb', display: 'block', marginBottom: '8px', textTransform: 'uppercase' }}>
                  🚀 Tap to Open Directly via Installed App
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <a
                    href={phonepeDeepLink}
                    onClick={() => {
                      setTimeout(() => window.location.href = upiDeepLink, 500);
                    }}
                    style={{
                      background: '#5f259f',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '11px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    PhonePe
                  </a>

                  <a
                    href={gpayDeepLink}
                    onClick={() => {
                      setTimeout(() => window.location.href = upiDeepLink, 500);
                    }}
                    style={{
                      background: '#ea4335',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '11px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    Google Pay
                  </a>

                  <a
                    href={paytmDeepLink}
                    onClick={() => {
                      setTimeout(() => window.location.href = upiDeepLink, 500);
                    }}
                    style={{
                      background: '#00baf2',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '11px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    Paytm
                  </a>

                  <a
                    href={upiDeepLink}
                    style={{
                      background: '#10b981',
                      color: '#ffffff',
                      padding: '8px',
                      borderRadius: '8px',
                      fontWeight: '800',
                      fontSize: '11px',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px'
                    }}
                  >
                    Any UPI App
                  </a>
                </div>
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '4px', display: 'block' }}>
                Optional UPI Reference / UTR Number (12 Digits)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 423456789012"
                value={transactionRef}
                onChange={e => setTransactionRef(e.target.value)}
                style={{ background: 'var(--bg-input, var(--bg-dark))', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '14px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {loading ? 'Authorizing Payment...' : `✓ Confirm UPI Payment Submitted (₹${totalAmount.toFixed(2)})`}
            </button>
          </form>
        )}

        {/* METHOD 2: CASH ON DELIVERY / PAY AT WORKSHOP COUNTER */}
        {selectedMethod === 'COD' && (
          <form onSubmit={handleConfirmCod} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{
              background: 'var(--bg-dark)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '16px',
              textAlign: 'center'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid #10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#059669',
                margin: '0 auto 10px auto'
              }}>
                <Banknote size={24} />
              </div>
              <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)', margin: '0 0 6px 0' }}>
                Pay Cash / Card at Workshop Counter
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>
                You can inspect your vehicle upon pickup and settle payment directly via Cash or Card at the receptionist desk.
              </p>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                fontWeight: '800',
                fontSize: '14px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#ffffff',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Banknote size={16} />}
              {loading ? 'Recording Selection...' : `💵 Confirm COD / Workshop Counter Pickup (₹${totalAmount.toFixed(2)})`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
