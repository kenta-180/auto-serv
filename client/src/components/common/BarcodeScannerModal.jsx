import React, { useState, useEffect, useRef } from 'react';
import { X, Camera, Barcode, CheckCircle, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function BarcodeScannerModal({ onClose, onScan, inventory = [] }) {
  const { t, formatCurrency } = useLanguage();
  const [scannedCode, setScannedCode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [matchedItem, setMatchedItem] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setCameraError('');
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } else {
        setCameraError('Camera access not supported on this device/browser');
      }
    } catch (err) {
      console.warn('Camera access denied or unavailable:', err);
      setCameraError('Camera access denied. Use manual SKU code entry below.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  const handleMatchCode = (code) => {
    const trimmed = (code || '').trim().toUpperCase();
    if (!trimmed) return;

    setScannedCode(trimmed);

    // Search inventory by SKU or ID or exact name match
    const found = inventory.find(item => 
      (item.sku && item.sku.toUpperCase() === trimmed) ||
      (item.id && item.id.toUpperCase() === trimmed) ||
      (item.name && item.name.toUpperCase().includes(trimmed))
    );

    if (found) {
      setMatchedItem(found);
    } else {
      setMatchedItem(null);
    }
  };

  const handleConfirmSelect = () => {
    if (matchedItem) {
      onScan(matchedItem);
      stopCamera();
      onClose();
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      zIndex: 2000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        maxWidth: '500px',
        width: '100%',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        color: 'var(--text-main)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.2)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Barcode size={20} color="#2563eb" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--text-main)' }}>Barcode / QR Part Scanner</h3>
          </div>
          <button 
            type="button" 
            onClick={() => { stopCamera(); onClose(); }}
            style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Camera Viewfinder Box */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: '220px',
          background: 'var(--bg-dark)',
          borderRadius: '12px',
          overflow: 'hidden',
          border: '2px dashed #2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted 
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }}
          />

          {!cameraActive && (
            <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>
              <Camera size={36} color="#64748b" style={{ marginBottom: '8px' }} />
              <div style={{ fontSize: '13px', fontWeight: '600' }}>{cameraError || 'Camera Initializing...'}</div>
            </div>
          )}

          {/* Target Scan Reticle Overlay */}
          <div style={{
            position: 'absolute',
            width: '70%',
            height: '40%',
            border: '2px solid #2563eb',
            borderRadius: '8px',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ width: '100%', height: '2px', background: '#ef4444', boxShadow: '0 0 8px #ef4444' }} />
          </div>
        </div>

        {/* Manual SKU / Barcode Entry */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)' }}>
            Scan or Enter Inventory SKU / Barcode:
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="e.g. OIL-5W30-4L or FLTR-OIL-01" 
              value={manualCode}
              onChange={e => {
                setManualCode(e.target.value);
                handleMatchCode(e.target.value);
              }}
              style={{ flex: 1, textTransform: 'uppercase', minHeight: '40px' }}
            />
          </div>
        </div>

        {/* Match Result Banner */}
        {matchedItem ? (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            borderRadius: '10px',
            padding: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '11px', color: '#059669', fontWeight: '800' }}>✓ PART MATCHED IN INVENTORY</div>
              <div style={{ fontWeight: '800', fontSize: '14px', color: 'var(--text-main)', marginTop: '2px' }}>{matchedItem.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>SKU: {matchedItem.sku} | In Stock: <strong>{matchedItem.quantity}</strong> | ₹{matchedItem.unitPrice?.toFixed(2)}</div>
            </div>
            <button 
              type="button" 
              className="btn btn-success btn-sm"
              onClick={handleConfirmSelect}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={14} /> Select Part
            </button>
          </div>
        ) : (
          scannedCode && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '10px',
              fontSize: '12px',
              color: '#dc2626',
              fontWeight: '600'
            }}>
              ⚠️ No matching inventory item found for code "{scannedCode}". Try typing SKU manually above.
            </div>
          )
        )}

        {/* Quick Inventory Barcode Shortcuts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Tap Quick Barcode Label Shortcut:</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {inventory.slice(0, 5).map(item => (
              <button
                key={item.id}
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setManualCode(item.sku);
                  handleMatchCode(item.sku);
                }}
                style={{ fontSize: '11px', padding: '4px 8px' }}
              >
                🏷️ {item.sku} ({item.name.substring(0, 15)}...)
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
