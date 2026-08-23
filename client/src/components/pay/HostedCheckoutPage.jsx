import React, { useState, useEffect } from 'react';
import { ShieldCheck, CreditCard, Lock, ArrowLeft, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguage } from '../../context/LanguageContext';

export default function HostedCheckoutPage({ sessionIdParam }) {
  const { t, formatCurrency } = useLanguage();
  const getParams = () => {
    let sessId = sessionIdParam;
    let invId = '';
    let tok = '';

    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/checkout/');
      if (pathParts[1]) {
        sessId = pathParts[1].split('/')[0].split('?')[0];
      }
      const searchParams = new URLSearchParams(window.location.search);
      invId = searchParams.get('invoiceId') || '';
      tok = searchParams.get('token') || '';
    }

    return { sessionId: sessId, invoiceId: invId, token: tok };
  };

  const { sessionId, invoiceId, token } = getParams();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Form states (Simulated hosted form)
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [expiry, setExpiry] = useState('12 / 28');
  const [cvc, setCvc] = useState('•••');
  const [cardHolder, setCardHolder] = useState('');

  useEffect(() => {
    const loadDetails = async () => {
      if (!invoiceId) {
        setError('Missing invoice reference for checkout session.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await api.getPublicInvoice(invoiceId, token);
        setInvoice(data);
        if (data.customer?.name) {
          setCardHolder(data.customer.name);
        }
      } catch (err) {
        console.error('Checkout load error:', err);
        setError('Failed to load session details.');
      } finally {
        setLoading(false);
      }
    };
    loadDetails();
  }, [invoiceId, token]);

  const handleCompletePayment = async (e) => {
    e.preventDefault();
    try {
      setProcessing(true);
      setError(null);

      // Derive signature for webhook call (matches backend crypto HMAC signature rule)
      const amountToCharge = invoice.totalAmount;
      // Fetch fresh session token if needed or compute signature
      const resSession = await api.createCheckoutSession(invoice.id, null, token || invoice.secureToken);

      // Call verified webhook endpoint to settle payment server-side
      const txRef = `RZP-UPI-${Date.now().toString().slice(-8)}`;
      await api.handlePaymentWebhook(invoice.id, resSession.signature, txRef, 'UPI_RAZORPAY');

      // Webhook verified & settled! Redirect back to customer return URL
      window.location.href = `/pay/${invoice.id}?token=${token || invoice.secureToken}&status=success`;
    } catch (err) {
      console.error('Hosted Checkout Error:', err);
      setError(err.message || 'Payment authorization failed. Please try again.');
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    if (invoiceId) {
      window.location.href = `/pay/${invoiceId}?token=${token}&status=cancel`;
    } else {
      window.location.href = '/';
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090d16',
        color: '#94a3b8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Inter, sans-serif'
      }}>
        <RefreshCw size={32} className="animate-spin" style={{ color: '#6366f1' }} />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#090d16',
        color: '#f8fafc',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          background: '#1e1b4b',
          border: '1px solid #6366f1',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center'
        }}>
          <AlertCircle size={44} style={{ color: '#ef4444', marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '12px' }}>
            Checkout Session Unavailable
          </h3>
          <p style={{ fontSize: '13px', color: '#a5b4fc', marginBottom: '24px' }}>
            {error || 'The payment session could not be established.'}
          </p>
          <button className="btn btn-secondary" onClick={handleCancel} style={{ width: '100%' }}>
            Return to Merchant Invoice
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#090d16',
      color: '#f8fafc',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '20px',
        padding: '28px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
      }}>

        {/* Hosted Gateway Banner Header */}
        <div style={{
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={20} style={{ color: '#6366f1' }} />
            <span style={{ fontSize: '13px', fontWeight: '800', color: '#c7d2fe', letterSpacing: '0.04em' }}>
              RAZORPAY UPI & CARD HOSTED CHECKOUT (INR ₹)
            </span>
          </div>
          <span style={{ fontSize: '11px', background: '#1e1b4b', color: '#818cf8', padding: '4px 8px', borderRadius: '6px', fontWeight: '700' }}>
            TEST MODE
          </span>
        </div>

        {/* Merchant & Order Info */}
        <div style={{
          background: '#1e293b',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Merchant</span>
            <div style={{ fontWeight: '800', color: '#f8fafc', fontSize: '14px' }}>AUTO-SERV WORKSHOP</div>
            <div style={{ fontSize: '12px', color: '#60a5fa' }}>{invoice.invoiceNumber}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>Amount Due</span>
            <div style={{ fontSize: '22px', fontWeight: '900', color: '#34d399' }}>
              ₹{invoice.totalAmount?.toFixed(2)}
            </div>
          </div>
        </div>

        {/* PROMINENT DYNAMIC UPI QR SCANNER & INSTANT PAY */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(15, 23, 42, 0.9) 100%)',
          border: '1px solid #10b981',
          borderRadius: '14px',
          padding: '14px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
            📲 Instant UPI QR Scanner & Transfer
          </span>
          
          <div style={{
            background: '#ffffff',
            padding: '8px',
            borderRadius: '10px',
            display: 'inline-block',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            marginBottom: '10px'
          }}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(`upi://pay?pa=8446131495@upi&pn=AutoServ%20Workshop&am=${invoice.totalAmount?.toFixed(2)}&cu=INR`)}`}
              alt="UPI QR Scanner"
              style={{ width: '130px', height: '130px', display: 'block' }}
            />
            <span style={{ fontSize: '9px', fontWeight: '800', color: '#0f172a', display: 'block', marginTop: '4px' }}>
              Scan with GPay / PhonePe / Paytm / BHIM
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px' }}>
            <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '4px 8px', borderRadius: '6px', color: '#cbd5e1' }}>
              UPI ID: <strong style={{ color: '#60a5fa' }}>8446131495@upi</strong>
            </div>
            <div style={{ background: '#0f172a', border: '1px solid #334155', padding: '4px 8px', borderRadius: '6px', color: '#cbd5e1' }}>
              UPI Mobile: <strong style={{ color: '#34d399' }}>+91 8446131495</strong>
            </div>
          </div>
        </div>

        {/* Hosted Card Payment Form */}
        <form onSubmit={handleCompletePayment}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            
            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Card Number
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  value={cardNumber}
                  onChange={e => setCardNumber(e.target.value)}
                  required
                  style={{ paddingLeft: '38px', background: '#090d16', borderColor: '#334155' }}
                />
                <CreditCard size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#6366f1' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  Expiry (MM/YY)
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={expiry}
                  onChange={e => setExpiry(e.target.value)}
                  required
                  style={{ background: '#090d16', borderColor: '#334155' }}
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                  CVC / CVV
                </label>
                <input
                  type="text"
                  className="form-control"
                  value={cvc}
                  onChange={e => setCvc(e.target.value)}
                  required
                  style={{ background: '#090d16', borderColor: '#334155' }}
                />
              </div>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '4px', display: 'block' }}>
                Cardholder Name
              </label>
              <input
                type="text"
                className="form-control"
                value={cardHolder}
                onChange={e => setCardHolder(e.target.value)}
                required
                style={{ background: '#090d16', borderColor: '#334155' }}
              />
            </div>

          </div>

          {/* Complete Payment Button */}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={processing}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '15px',
              fontWeight: '800',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #4338ca)',
              display: 'flex',
              alignItems: 'center',
              justify: 'center',
              gap: '8px',
              cursor: processing ? 'not-allowed' : 'pointer'
            }}
          >
            {processing ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Verifying Webhook & Completing...
              </>
            ) : (
              <>
                <Lock size={16} /> Complete Payment of ₹{invoice.totalAmount?.toFixed(2)}
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={handleCancel}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: '#94a3b8',
            fontSize: '13px',
            marginTop: '16px',
            cursor: 'pointer',
            textAlign: 'center'
          }}
        >
          Cancel and return to AUTO-SERV
        </button>

      </div>
    </div>
  );
}
