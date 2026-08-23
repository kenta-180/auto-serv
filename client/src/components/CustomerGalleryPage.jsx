import React, { useState, useEffect } from 'react';
import { 
  Car, Calendar, ShieldCheck, Camera, FileText, ExternalLink, 
  Lock, AlertCircle, X, CheckCircle2, User, Clock, Image as ImageIcon
} from 'lucide-react';
import { api } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function CustomerGalleryPage({ jobCardId: propJobCardId }) {
  const { t, formatDate, getStatusLabel } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMedia, setActiveMedia] = useState(null); // Lightbox selected image

  // Extract jobCardId and token from URL
  const getQueryParams = () => {
    if (typeof window === 'undefined') return { id: propJobCardId, token: '' };
    const pathname = window.location.pathname;
    const parts = pathname.split('/');
    const idFromPath = parts[parts.length - 1] || propJobCardId;
    
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get('token') || '';
    return { id: idFromPath, token };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');
        const { id, token } = getQueryParams();

        if (!id) {
          setError('Job Card ID is missing.');
          setLoading(false);
          return;
        }

        const res = await api.getPublicGallery(id, token);
        setData(res);
      } catch (err) {
        console.error('Gallery Fetch Error:', err);
        setError(err.message || 'Failed to load photo gallery. Access link may be expired or invalid.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [propJobCardId]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{
            width: '40px',
            height: '40px',
            border: '4px solid rgba(59, 130, 246, 0.2)',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }}></div>
          <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>Loading Vehicle Service Photo Gallery...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          maxWidth: '440px',
          width: '100%',
          background: '#1e293b',
          border: '1px solid #ef4444',
          borderRadius: '16px',
          padding: '32px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: '#ef4444'
          }}>
            <Lock size={28} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 8px 0', color: '#fff' }}>Access Restricted</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0', lineHeight: '1.5' }}>
            {error}
          </p>
          <div style={{ fontSize: '11px', color: '#64748b', borderTop: '1px solid #334155', paddingTop: '16px' }}>
            Auto-Serv Workshop Security & Access Control
          </div>
        </div>
      </div>
    );
  }

  const { jobCard, vehicle, customer, invoice, media } = data || {};
  const preServiceMedia = (media || []).filter(m => m.type === 'PRE_SERVICE_CONDITION');
  const progressMedia = (media || []).filter(m => m.type === 'PROGRESS_UPDATE' || m.type === 'POST_SERVICE_CONDITION' || !m.type);

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#0f172a',
      color: '#f8fafc',
      fontFamily: 'Inter, system-ui, sans-serif',
      padding: '20px 12px 40px 12px'
    }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        
        {/* Brand Header */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          paddingBottom: '16px',
          borderBottom: '1px solid #334155'
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '11px',
            fontWeight: '800',
            color: '#60a5fa',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '10px'
          }}>
            <ShieldCheck size={14} /> Auto-Serv Customer Portal
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#fff', margin: 0 }}>
            Vehicle Service Photo Gallery
          </h1>
          <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', margin: 0 }}>
            Job Card #{jobCard?.cardNumber || 'Job'} • Service Documentation & Inspection Photos
          </p>
        </div>

        {/* Vehicle Summary Card */}
        {vehicle && (
          <div style={{
            background: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '14px',
            padding: '18px',
            marginBottom: '16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#60a5fa'
                }}>
                  <Car size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#fff' }}>
                    {vehicle.make} {vehicle.model}
                  </h3>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                    {vehicle.year ? `${vehicle.year} • ` : ''}{vehicle.fuelType || 'Petrol'}
                  </div>
                </div>
              </div>

              <div style={{
                background: '#0f172a',
                border: '1px solid #3b82f6',
                color: '#60a5fa',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '800',
                letterSpacing: '1px'
              }}>
                {vehicle.licensePlate}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', paddingTop: '10px', borderTop: '1px solid #334155', fontSize: '11px', color: '#cbd5e1' }}>
              <div>👤 <strong>Customer:</strong> {customer?.name || 'Customer'}</div>
              <div>📅 <strong>Status:</strong> <span style={{ color: '#34d399', fontWeight: '700' }}>{jobCard?.status}</span></div>
            </div>
          </div>
        )}

        {/* Invoice Link Card */}
        {invoice && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(15, 23, 42, 0.9) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase' }}>
                Tax Invoice #{invoice.invoiceNumber}
              </div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                ₹{invoice.totalAmount.toFixed(2)}
              </div>
            </div>

            <a
              href={`/pay/${jobCard?.id}`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: '#2563eb',
                color: '#fff',
                padding: '8px 14px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '700',
                textDecoration: 'none',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.4)'
              }}
            >
              <FileText size={14} /> View Invoice & Pay <ExternalLink size={12} />
            </a>
          </div>
        )}

        {/* Media Section: Pre-Service Condition */}
        {preServiceMedia.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Camera size={16} style={{ color: '#60a5fa' }} />
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#fff', margin: 0 }}>
                Intake & Pre-Service Inspection Photos ({preServiceMedia.length})
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '10px'
            }}>
              {preServiceMedia.map(item => (
                <div
                  key={item.id}
                  onClick={() => setActiveMedia(item)}
                  style={{
                    position: 'relative',
                    aspectRatio: '4/3',
                    background: '#1e293b',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <img
                    src={item.url}
                    alt={item.caption || 'Pre-service photo'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {item.caption && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(15, 23, 42, 0.85)',
                      padding: '4px 6px',
                      fontSize: '10px',
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Media Section: Repair Progress & Completed Work */}
        {progressMedia.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <ImageIcon size={16} style={{ color: '#34d399' }} />
              <h2 style={{ fontSize: '15px', fontWeight: '800', color: '#fff', margin: 0 }}>
                Repair Progress & Completed Work Photos ({progressMedia.length})
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: '10px'
            }}>
              {progressMedia.map(item => (
                <div
                  key={item.id}
                  onClick={() => setActiveMedia(item)}
                  style={{
                    position: 'relative',
                    aspectRatio: '4/3',
                    background: '#1e293b',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #334155',
                    cursor: 'pointer',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <img
                    src={item.url}
                    alt={item.caption || 'Repair progress photo'}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  {item.caption && (
                    <div style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      background: 'rgba(15, 23, 42, 0.85)',
                      padding: '4px 6px',
                      fontSize: '10px',
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {(!media || media.length === 0) && (
          <div style={{
            background: '#1e293b',
            border: '1px dashed #475569',
            borderRadius: '14px',
            padding: '32px',
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            <Camera size={32} style={{ margin: '0 auto 10px auto', display: 'block', opacity: 0.5 }} />
            <h4 style={{ margin: '0 0 4px 0', color: '#cbd5e1' }}>No Inspection Photos Captured</h4>
            <p style={{ fontSize: '12px', margin: 0 }}>No media files were recorded for this job card.</p>
          </div>
        )}

        {/* Lightbox Modal */}
        {activeMedia && (
          <div 
            onClick={() => setActiveMedia(null)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.95)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px'
            }}
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                background: '#1e293b',
                borderRadius: '14px',
                overflow: 'hidden',
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <button
                type="button"
                onClick={() => setActiveMedia(null)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(15, 23, 42, 0.75)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  zIndex: 10
                }}
              >
                <X size={18} />
              </button>

              <img
                src={activeMedia.url}
                alt={activeMedia.caption || 'Full view'}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  background: '#0f172a'
                }}
              />

              {activeMedia.caption && (
                <div style={{ padding: '12px 16px', background: '#1e293b', fontSize: '12px', color: '#e2e8f0' }}>
                  📝 <strong>Caption:</strong> {activeMedia.caption}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer Security Badge */}
        <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '11px', color: '#64748b' }}>
          🔒 Cryptographically Tokenized Gallery • Auto-Serv Workshop Quality Assurance
        </div>

      </div>
    </div>
  );
}
