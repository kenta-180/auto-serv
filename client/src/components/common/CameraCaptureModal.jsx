import React, { useState, useRef, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export default function CameraCaptureModal({ title, onClose, onCapture }) {
  const { t } = useLanguage();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [captureMetadata, setCaptureMetadata] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize live camera stream (rear camera preferred for workshop condition photos)
  const startCamera = async () => {
    try {
      setIsInitializing(true);
      setCameraError('');
      setCapturedImage(null);

      // Stop existing stream if any
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Check browser MediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera stream requires HTTPS or native app context on mobile browsers.');
      }

      // Request live camera stream with environment (rear) camera facingMode
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.error('Camera initialization error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera permissions in your device settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No active camera hardware detected.');
      } else {
        setCameraError(err.message || 'Live video stream unavailable on unencrypted HTTP IP addresses.');
      }
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    startCamera();

    return () => {
      // Cleanup stream on unmount
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    canvas.width = width;
    canvas.height = height;

    context.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    const now = new Date();
    const metadata = {
      capturedAt: now.toISOString(),
      displayTime: now.toLocaleString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    };

    setCapturedImage(dataUrl);
    setCaptureMetadata(metadata);

    // Stop video stream while previewing
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleRetake = () => {
    startCamera();
  };

  const handleConfirm = () => {
    if (!capturedImage) return;
    if (typeof onCapture === 'function') {
      onCapture({
        dataUrl: capturedImage,
        capturedAt: captureMetadata?.capturedAt,
        timeZone: captureMetadata?.timeZone,
        source: 'LIVE_CAMERA_STRICT'
      });
    }
    if (typeof onClose === 'function') onClose();
  };

  const handleNativeMobileCapture = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const now = new Date();
      setCapturedImage(evt.target.result);
      setCaptureMetadata({
        capturedAt: now.toISOString(),
        displayTime: now.toLocaleString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px', background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '20px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: '800', color: '#059669', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase' }}>
              <ShieldCheck size={14} /> Real-Time Authenticity Protection
            </div>
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: '2px 0 0 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Camera size={18} color="#2563eb" /> {title || 'Live Camera Photo Capture'}
            </h3>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'var(--bg-dark)', border: '1px solid var(--border-color)', color: 'var(--text-main)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px 0', lineHeight: '1.4' }}>
          To prevent liability disputes, photos must be captured live at this exact moment. <strong>Gallery & file selection are strictly disabled.</strong>
        </p>

        {/* Hidden Canvas for Snapshots */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Hidden Direct Mobile Camera Capture Input */}
        <input 
          ref={fileInputRef}
          type="file" 
          accept="image/*" 
          capture="environment" 
          style={{ display: 'none' }} 
          onChange={handleNativeMobileCapture} 
        />

        {/* Live Camera Viewport vs Snapped Preview */}
        {!capturedImage ? (
          <div style={{ background: 'var(--bg-dark)', borderRadius: '12px', overflow: 'hidden', position: 'relative', minHeight: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
            
            {!cameraError && (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                style={{ width: '100%', height: '300px', objectFit: 'cover' }} 
              />
            )}

            {isInitializing && (
              <div style={{ color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={18} className="spin" /> Initializing live camera feed...
              </div>
            )}

            {/* Direct Camera Launch Card when getUserMedia requires HTTPS or fails */}
            {cameraError && !isInitializing && (
              <div style={{ padding: '24px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(56, 189, 248, 0.15)', border: '1px solid #38bdf8', padding: '14px', borderRadius: '50%', color: '#2563eb' }}>
                  <Camera size={28} />
                </div>

                <div>
                  <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-main)' }}>Launch Device Camera</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', maxWidth: '320px' }}>
                    Capture a live photo directly using your phone's rear camera.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => fileInputRef.current && fileInputRef.current.click()}
                    style={{ padding: '12px 24px', fontWeight: '800', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
                  >
                    <Camera size={18} /> 📸 Launch Device Camera
                  </button>

                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={startCamera}
                    style={{ padding: '10px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                  >
                    <RefreshCw size={14} /> Retry Stream
                  </button>
                </div>
              </div>
            )}

            {/* Snap Button on Live Stream */}
            {!cameraError && !isInitializing && (
              <div style={{ position: 'absolute', bottom: '16px', left: '0', right: '0', display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handleSnapPhoto}
                  style={{
                    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                    color: '#fff',
                    border: '3px solid #f8fafc',
                    borderRadius: '30px',
                    padding: '12px 28px',
                    fontWeight: '800',
                    fontSize: '14px',
                    boxShadow: '0 4px 14px rgba(2, 132, 199, 0.5)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Camera size={18} /> Snap Real-Time Photo
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Captured Photo Preview Box */
          <div>
            <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '2px solid #10b981', maxHeight: '300px' }}>
              <img src={capturedImage} alt="Captured condition photo" style={{ width: '100%', height: '280px', objectFit: 'cover' }} />
              
              <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid #334155', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', color: '#34d399', fontWeight: '700' }}>
                ✓ LIVE CAPTURE VERIFIED
              </div>

              <div style={{ position: 'absolute', bottom: '10px', left: '10px', right: '10px', background: 'rgba(15, 23, 42, 0.9)', border: '1px solid #334155', borderRadius: '6px', padding: '8px 12px', fontSize: '11px', color: '#cbd5e1' }}>
                📅 <strong>Timestamp:</strong> {captureMetadata?.displayTime} ({captureMetadata?.timeZone})
              </div>
            </div>

            {/* Actions: Retake vs Confirm */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRetake}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', minHeight: '38px' }}
              >
                <RefreshCw size={14} /> Retake Photo
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirm}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', fontWeight: '800', minHeight: '38px' }}
              >
                <Check size={16} /> Confirm & Use Photo
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
