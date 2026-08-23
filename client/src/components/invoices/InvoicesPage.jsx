import React, { useState } from 'react';
import { FileText, DollarSign, CheckCircle2, Download, Clock, Eye } from 'lucide-react';
import { api } from '../../services/api';
import InvoiceModal from '../InvoiceModal';
import { useLanguage } from '../../context/LanguageContext';

export default function InvoicesPage({ currentUser, jobCards = [] }) {
  const { t, formatCurrency, formatDate, getStatusLabel } = useLanguage();
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const safeJobCards = Array.isArray(jobCards) ? jobCards : [];

  // Filter student/customer job cards with invoices
  const invoicesList = safeJobCards
    .filter(c => c && (c.status === 'INVOICED' || c.status === 'PAID' || c.status === 'DELIVERED'))
    .map(c => ({
      id: c.id,
      cardNumber: c.cardNumber,
      vehicle: c.vehicle,
      status: c.status,
      totalCost: c.totalCost || 0,
      createdAt: c.createdAt
    }));

  const totalInvoicesCount = invoicesList.length;
  const totalSettledAmount = invoicesList
    .filter(inv => inv.status === 'PAID' || inv.status === 'DELIVERED')
    .reduce((sum, inv) => sum + inv.totalCost, 0);
  const pendingAmount = invoicesList
    .filter(inv => inv.status === 'INVOICED')
    .reduce((sum, inv) => sum + inv.totalCost, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {/* Header Banner */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '14px 16px',
        display: 'flex',
        justifyContent: 'space-between',
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
              <FileText size={11} style={{ display: 'inline', marginRight: '3px' }} /> Financial & Billing Portal
            </span>
          </div>
          <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            Fee Receipts & Invoices History
          </h2>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', margin: 0, fontWeight: '600' }}>
            Inspect itemized billing statements, tax receipts, and online checkout history.
          </p>
        </div>
      </div>

      {/* Summary Metric Tiles (3 Tiles matching Dashboard Reference - Denser Scale) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '10px'
      }}>
        {/* Tile 1: Total Invoices */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Billing Receipts</span>
            <div style={{ background: 'rgba(59, 130, 246, 0.15)', padding: '5px', borderRadius: '6px', color: '#2563eb' }}>
              <FileText size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>{totalInvoicesCount}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Invoices Generated to Date</div>
        </div>

        {/* Tile 2: Settled Paid Amount */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Settled Receipts</span>
            <div style={{ background: 'rgba(52, 211, 153, 0.15)', padding: '5px', borderRadius: '6px', color: '#059669' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>₹{totalSettledAmount.toFixed(2)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Fully Settled Payments</div>
        </div>

        {/* Tile 3: Outstanding Balance */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '10px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Pending Balance</span>
            <div style={{ background: 'rgba(245, 158, 11, 0.15)', padding: '5px', borderRadius: '6px', color: '#d97706' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '18px', fontWeight: '800', color: '#d97706' }}>₹{pendingAmount.toFixed(2)}</div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>Awaiting Customer Settlement</div>
        </div>
      </div>

      <div className="custom-table-container">
        <table className="custom-table">
          <thead>
            <tr>
              <th>Receipt / Invoice #</th>
              <th>Vehicle / Service</th>
              <th>Date</th>
              <th>Status</th>
              <th>Amount (₹)</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoicesList.length > 0 ? (
              invoicesList.map(inv => (
                <tr key={inv.id}>
                  <td style={{ fontWeight: '800', color: '#2563eb' }}>{inv.cardNumber}</td>
                  <td style={{ color: 'var(--text-main)' }}>{inv.vehicle?.make} {inv.vehicle?.model} ({inv.vehicle?.licensePlate})</td>
                  <td style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '600' }}>
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <span className={`badge badge-${inv.status?.toLowerCase()}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: '800', color: '#059669' }}>
                    ₹{inv.totalCost.toFixed(2)}
                  </td>
                  <td>
                    {inv.status === 'DELIVERED' || inv.status === 'PAID' ? (
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => {
                          const card = safeJobCards.find(c => c.id === inv.id) || inv;
                          const subtotal = card.totalCost || 0;
                          const tax = subtotal * 0.10;
                          setSelectedInvoice({
                            id: card.id,
                            invoiceNumber: card.cardNumber ? `INV-${card.cardNumber}` : `INV-${card.id}`,
                            status: card.status === 'DELIVERED' ? 'PAID' : (card.status || 'PAID'),
                            createdAt: card.createdAt || new Date().toISOString(),
                            paidAt: card.updatedAt || new Date().toISOString(),
                            customer: {
                              name: card.customer?.name || currentUser?.name || 'Valued Customer',
                              email: card.customer?.email || currentUser?.email || 'customer@autoserv.com',
                              phone: card.customer?.phone || currentUser?.phone || ''
                            },
                            jobCard: {
                              title: card.title || 'Vehicle Maintenance & Repair',
                              laborCost: subtotal * 0.6,
                              vehicle: card.vehicle || { make: 'Vehicle', model: '', licensePlate: '' },
                              parts: card.parts || [
                                { id: 'p1', quantity: 1, inventoryItem: { name: 'Engine Oil & Filter Service', sku: 'FLT-102' }, totalPrice: subtotal * 0.4 }
                              ]
                            },
                            subtotal: subtotal,
                            tax: tax,
                            totalAmount: subtotal + tax
                          });
                        }}
                        style={{ fontSize: '11px', padding: '5px 12px', background: 'rgba(16, 185, 129, 0.15)', color: '#059669', border: '1px solid #10b981', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', borderRadius: '6px' }}
                        title="Display full interactive vehicle invoice directly on screen"
                      >
                        <FileText size={14} /> Display Invoice
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => {
                          const invoiceObj = (inv.invoices || [])[0] || { id: inv.id };
                          window.open(`/pay/${invoiceObj.id}`, '_blank');
                        }}
                        style={{ fontSize: '12px', padding: '4px 10px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', fontWeight: '800', cursor: 'pointer' }}
                      >
                        Pay Online Portal
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontWeight: '600' }}>
                  No fee receipts or settled invoices found for your account.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Directly Display Invoice Modal On-Screen */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          currentUser={currentUser}
          onClose={() => setSelectedInvoice(null)}
          onRefresh={() => {}}
        />
      )}

    </div>
  );
}
