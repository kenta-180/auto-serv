import React, { useState, useEffect } from 'react';
import { 
  Shield, GraduationCap, Lock, Mail, Eye, EyeOff, 
  ArrowRight, AlertCircle, CheckCircle2, User, Phone, Building, Car, KeyRound, Send
} from 'lucide-react';
import { api } from '../services/api';
import { auth, isFirebaseConfigured } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';

export default function RegisterPage({ onRegisterSuccess, onSwitchToLogin }) {
  const { t } = useLanguage();
  // Role Selector limited exclusively to ADMIN or CUSTOMER (Technician cannot self-register)
  const [selectedRole, setSelectedRole] = useState('CUSTOMER'); // 'CUSTOMER' | 'ADMIN'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [workshopName, setWorkshopName] = useState('');
  const [vehicleInfo, setVehicleInfo] = useState('');

  // OTP Verification States
  const [otpCode, setOtpCode] = useState('');
  const [carrierInfo, setCarrierInfo] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpMsg, setOtpMsg] = useState('');
  const [timer, setTimer] = useState(0);

  // Firebase Auth Confirmation Object & Verified ID Token
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [firebaseToken, setFirebaseToken] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Timer countdown effect for Resend OTP
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Handle Send OTP (Twilio Verify Service / Messaging API)
  const handleSendOtp = async () => {
    const rawPhone = phone.trim();
    if (!rawPhone) {
      setError('Please enter a valid mobile phone number before requesting OTP.');
      return;
    }

    // E.164 Normalization & Validation
    let cleaned = rawPhone.replace(/[\s\-\(\)]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        cleaned = '+91' + cleaned;
      } else if (cleaned.length > 10) {
        cleaned = '+' + cleaned;
      }
    }

    const E164_REGEX = /^\+[1-9]\d{6,14}$/;
    if (!E164_REGEX.test(cleaned)) {
      setError('Invalid phone number format. Please enter a valid number with country code in E.164 format (e.g. +919876543210 or +15409175548).');
      return;
    }

    try {
      setOtpLoading(true);
      setError('');
      setOtpMsg('');

      const res = await api.sendOtp(cleaned);
      setOtpSent(true);
      setOtpCode('');
      setOtpMsg(res.message || `OTP verification code sent to ${cleaned} via SMS.`);
      setTimer(60);
    } catch (err) {
      console.error('Send OTP Error:', err);
      setError(err.message || 'Failed to send OTP via Twilio. Please check your phone number or Twilio settings.');
    } finally {
      setOtpLoading(false);
    }
  };

  // Handle Verify OTP (Server Verification via Twilio Verify)
  const handleVerifyOtp = async () => {
    if (!otpCode.trim() || otpCode.trim().length < 4) {
      setError('Please enter the 6-digit OTP code sent to your phone.');
      return;
    }
    try {
      setOtpLoading(true);
      setError('');

      const res = await api.verifyOtp(phone.trim(), otpCode.trim());
      if (res.success || res.status === 'approved') {
        setOtpVerified(true);
        setOtpMsg('Phone number verified successfully via Twilio Verify! ✓');
        setError('');
      } else {
        throw new Error(res.message || 'Incorrect OTP code. Please check and try again.');
      }
    } catch (err) {
      console.error('Verify OTP Error:', err);
      let errMsg = err.message || 'Invalid OTP verification code. Please check and try again.';
      if (err.message && err.message.includes('expired')) {
        errMsg = 'OTP code has expired. Please click Resend OTP to receive a new code.';
      } else if (err.message && err.message.includes('attempts')) {
        errMsg = 'Maximum verification attempts reached for this code. Please request a new OTP.';
      } else if (err.message && err.message.includes('Incorrect')) {
        errMsg = 'Incorrect 6-digit OTP code entered. Please try again.';
      }
      setError(errMsg);
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim()) {
      setError('Please fill in all required fields (Name, Email, Phone Number, Password).');
      return;
    }

    if (!otpVerified) {
      setError('Please verify your mobile number via OTP before completing registration.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Password confirmation does not match.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccessMsg('');

      const payload = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        otp: otpCode.trim(),
        password,
        passwordConfirm,
        role: selectedRole,
        workshopName: selectedRole === 'ADMIN' ? workshopName.trim() : undefined,
        vehicleInfo: selectedRole === 'CUSTOMER' ? vehicleInfo.trim() : undefined
      };

      const data = await api.register(payload);

      setSuccessMsg(`Account created successfully! Welcome to Auto-Serv.`);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      setTimeout(() => {
        if (typeof onRegisterSuccess === 'function') {
          onRegisterSuccess(data.user, data.token);
        }
      }, 1000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: 'var(--bg-dark)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '8px 12px',
      color: 'var(--text-main)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '410px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '14px 18px',
        boxShadow: '0 16px 24px -4px rgba(0, 0, 0, 0.15)'
      }}>
        
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px' }}>
          <h1 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
            {t('auth.register_title')}
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px', margin: 0, fontWeight: '600' }}>
            {t('auth.register_subtitle')}
          </p>
        </div>

        {/* Role Selector Tabs - Exact Same Placement */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          background: 'var(--bg-dark)',
          padding: '2px',
          borderRadius: '8px',
          marginBottom: '8px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            onClick={() => { setSelectedRole('CUSTOMER'); setError(''); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '5px 8px',
              borderRadius: '6px',
              border: 'none',
              background: selectedRole === 'CUSTOMER' ? '#2563eb' : 'transparent',
              color: selectedRole === 'CUSTOMER' ? '#fff' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <GraduationCap size={14} /> {t('auth.customer')}
          </button>

          <button
            type="button"
            onClick={() => { setSelectedRole('ADMIN'); setError(''); }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '5px 8px',
              borderRadius: '6px',
              border: 'none',
              background: selectedRole === 'ADMIN' ? '#2563eb' : 'transparent',
              color: selectedRole === 'ADMIN' ? '#fff' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <Shield size={14} /> {t('auth.admin')}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            color: '#dc2626',
            padding: '5px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px'
          }}>
            <AlertCircle size={13} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMsg && (
          <div style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid #10b981',
            color: '#059669',
            padding: '5px 8px',
            borderRadius: '6px',
            fontSize: '11px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '8px'
          }}>
            <CheckCircle2 size={13} style={{ flexShrink: 0 }} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Invisible Firebase Recaptcha Container */}
        <div id="recaptcha-container"></div>

        {/* Sign-Up Form - Ultra Compact Layout */}
        <form onSubmit={handleSubmit}>
          
          {/* Full Name */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textTransform: 'uppercase' }}>
              {t('auth.full_name')} *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="text"
                required
                className="form-control"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', paddingLeft: '30px', height: '32px', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Email Address */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textTransform: 'uppercase' }}>
              {t('auth.email_phone')} *
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
              <input
                type="email"
                required
                className="form-control"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', paddingLeft: '30px', height: '32px', fontSize: '12px' }}
              />
            </div>
          </div>

          {/* Mobile Phone & OTP - Exact Same Placement */}
          <div style={{ marginBottom: '6px' }}>
            <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textTransform: 'uppercase' }}>
              {t('auth.phone')} * {otpVerified && <span style={{ color: '#059669', marginLeft: '4px' }}>✓ {t('auth.verified')}</span>}
            </label>
            <div style={{ display: 'flex', gap: '6px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Phone size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="tel"
                  required
                  disabled={otpVerified}
                  className="form-control"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (otpSent && !otpVerified) setOtpSent(false);
                  }}
                  style={{ 
                    width: '100%', 
                    paddingLeft: '30px', 
                    height: '32px', 
                    fontSize: '12px',
                    borderColor: otpVerified ? '#059669' : undefined,
                    backgroundColor: otpVerified ? 'rgba(16, 185, 129, 0.08)' : undefined
                  }}
                />
              </div>

              {!otpVerified && (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={otpLoading || !phone.trim() || timer > 0}
                  className="btn btn-secondary"
                  style={{
                    height: '32px',
                    fontSize: '11px',
                    fontWeight: '800',
                    whiteSpace: 'nowrap',
                    padding: '0 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    background: 'var(--bg-dark)',
                    color: '#2563eb',
                    border: '1px solid #2563eb'
                  }}
                >
                  <Send size={12} />
                  {otpLoading ? '...' : timer > 0 ? `${timer}s` : otpSent ? 'Resend' : t('auth.send_otp')}
                </button>
              )}
            </div>
          </div>

          {/* OTP Feedback Message */}
          {otpMsg && (
            <div style={{ fontSize: '10px', marginBottom: '5px', color: otpVerified ? '#059669' : '#2563eb', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '600' }}>
              {otpVerified ? <CheckCircle2 size={11} /> : <AlertCircle size={11} />}
              <span>{otpMsg}</span>
            </div>
          )}

          {/* OTP Verification Box */}
          {otpSent && !otpVerified && (
            <div style={{
              marginBottom: '6px',
              padding: '6px 8px',
              background: 'var(--bg-dark)',
              border: '1px solid #2563eb',
              borderRadius: '6px'
            }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '4px',
                padding: '3px 6px',
                fontSize: '10px',
                color: 'var(--text-main)',
                marginBottom: '4px'
              }}>
                📱 Check your SMS inbox for the 6-digit OTP verification code.
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <KeyRound size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <input
                    type="text"
                    maxLength={6}
                    className="form-control"
                    placeholder="e.g. 582914"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    style={{ width: '100%', paddingLeft: '28px', height: '30px', fontSize: '12px', letterSpacing: '2px', fontWeight: '800' }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleVerifyOtp}
                  disabled={otpLoading || !otpCode.trim()}
                  className="btn btn-primary"
                  style={{
                    height: '30px',
                    fontSize: '11px',
                    fontWeight: '800',
                    padding: '0 10px',
                    background: '#2563eb'
                  }}
                >
                  {otpLoading ? '...' : t('auth.verify')}
                </button>
              </div>
            </div>
          )}

          {/* Role Specific Field */}
          {selectedRole === 'ADMIN' ? (
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textTransform: 'uppercase' }}>
                {t('auth.workshop_name')}
              </label>
              <div style={{ position: 'relative' }}>
                <Building size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Auto-Serv Workshop Bay"
                  value={workshopName}
                  onChange={(e) => setWorkshopName(e.target.value)}
                  style={{ width: '100%', paddingLeft: '30px', height: '32px', fontSize: '12px' }}
                />
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: '6px' }}>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textTransform: 'uppercase' }}>
                {t('auth.vehicle_info')}
              </label>
              <div style={{ position: 'relative' }}>
                <Car size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  className="form-control"
                  placeholder="Toyota Camry (KA-01-AB-1234)"
                  value={vehicleInfo}
                  onChange={(e) => setVehicleInfo(e.target.value)}
                  style={{ width: '100%', paddingLeft: '30px', height: '32px', fontSize: '12px' }}
                />
              </div>
            </div>
          )}

          {/* Passwords Side-by-Side Grid Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textTransform: 'uppercase' }}>
                {t('auth.password')} *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ width: '100%', paddingLeft: '26px', height: '32px', fontSize: '12px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '2px', textTransform: 'uppercase' }}>
                {t('auth.confirm_password')} *
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={13} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="form-control"
                  placeholder="••••••••"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  style={{ width: '100%', paddingLeft: '26px', height: '32px', fontSize: '12px' }}
                />
              </div>
            </div>
          </div>

          {/* Submit Register Button - Exact Same Placement */}
          <button
            type="submit"
            disabled={loading || !otpVerified}
            className="btn btn-primary"
            style={{
              width: '100%',
              height: '34px',
              fontSize: '12px',
              fontWeight: '800',
              opacity: (!otpVerified || loading) ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.4)'
            }}
          >
            {loading ? '...' : !otpVerified ? 'Verify Mobile Number to Continue' : (
              <>
                {t('auth.register_btn')} <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer Link to Sign In - Exact Same Placement */}
        <div style={{ marginTop: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          {t('auth.have_account')}{' '}
          <button
            type="button"
            onClick={onSwitchToLogin}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {t('auth.sign_in_here')}
          </button>
        </div>
      </div>
    </div>
  );
}
