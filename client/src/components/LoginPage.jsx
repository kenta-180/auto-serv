import React, { useState } from 'react';
import { 
  Car, Shield, Wrench, GraduationCap, Lock, Mail, Eye, EyeOff, 
  ArrowRight, AlertCircle, CheckCircle2, HelpCircle
} from 'lucide-react';
import { api, getApiBase } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage({ onLoginSuccess, onSwitchToRegister }) {
  const { t } = useLanguage();
  // UI Role Selector (Admin | Technician | Student)
  const [selectedRole, setSelectedRole] = useState('ADMIN'); // 'ADMIN' | 'TECHNICIAN' | 'STUDENT'
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Role Tab Configuration
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setError('');
  };

  const handleQuickLogin = async (email) => {
    try {
      setLoading(true);
      setError('');
      const data = await api.login(email, 'password123');
      if (data.token) {
        localStorage.setItem('token', data.token);
      }
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      const msg = err.name === 'TimeoutError' ? 'Server request timed out. Please check backend connection.' : (err.message || 'Server error');
      setError('Quick login failed: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    // Client-side non-empty validation
    if (!identifier.trim() || !password.trim()) {
      setError('Please enter both your identifier/email and password.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Backend call to /auth/login
      const data = await api.login(identifier.trim(), password);

      // Store JWT token if persistent session selected
      if (data.token) {
        localStorage.setItem('token', data.token);
      }

      // Execute login callback with server-authenticated user payload
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err) {
      if (err.name === 'TimeoutError' || (err.message && (err.message.includes('fetch') || err.message.includes('timed out') || err.message.includes('aborted')))) {
        setShowServerConfig(true);
      }
      const msg = err.name === 'TimeoutError' ? 'Server request timed out. Please check backend connection.' : (err.message || 'Network error');
      setError('Invalid credentials or server connection failed. (' + msg + ')');
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
      padding: '12px 16px',
      color: 'var(--text-main)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '410px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '16px 20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)'
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '12px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: '#fff',
            marginBottom: '6px',
            boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.5)'
          }}>
            <Car size={22} />
          </div>
          <h1 style={{ fontSize: '19px', fontWeight: '800', letterSpacing: '-0.02em', margin: '0 0 2px 0', color: 'var(--text-main)' }}>
            {t('auth.login_title')}
          </h1>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0, fontWeight: '600' }}>
            {t('auth.login_subtitle')}
          </p>
        </div>

        {/* Instant 1-Click Role Switcher Section */}
        <div style={{
          background: 'var(--bg-dark)',
          border: '1px solid var(--border-color)',
          borderRadius: '10px',
          padding: '8px 10px',
          marginBottom: '12px'
        }}>
          <div style={{ fontSize: '10px', fontWeight: '800', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px', textAlign: 'center' }}>
            {t('auth.quick_login')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
            <button
              type="button"
              className="btn-touch"
              onClick={() => handleQuickLogin('admin@autoserv.com')}
              disabled={loading}
              style={{
                minHeight: '34px',
                padding: '4px 6px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.3)'
              }}
            >
              <Shield size={13} /> {t('auth.admin')}
            </button>
            <button
              type="button"
              className="btn-touch"
              onClick={() => handleQuickLogin('tech@autoserv.com')}
              disabled={loading}
              style={{
                minHeight: '34px',
                padding: '4px 6px',
                background: 'linear-gradient(135deg, #0d9488, #0f766e)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)'
              }}
            >
              <Wrench size={13} /> {t('auth.tech')}
            </button>
            <button
              type="button"
              className="btn-touch"
              onClick={() => handleQuickLogin('customer@autoserv.com')}
              disabled={loading}
              style={{
                minHeight: '34px',
                padding: '4px 6px',
                background: 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: '700',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.3)'
              }}
            >
              <Car size={13} /> {t('auth.customer')}
            </button>
          </div>
        </div>

        {/* Role Segmented Selector */}
        <div style={{
          background: 'var(--bg-dark)',
          padding: '2px',
          borderRadius: '8px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '4px',
          marginBottom: '12px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            type="button"
            onClick={() => handleRoleSelect('ADMIN')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: selectedRole === 'ADMIN' ? '#2563eb' : 'transparent',
              color: selectedRole === 'ADMIN' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <Shield size={13} /> {t('auth.admin')}
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('TECHNICIAN')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: selectedRole === 'TECHNICIAN' ? '#2563eb' : 'transparent',
              color: selectedRole === 'TECHNICIAN' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <Wrench size={13} /> {t('auth.tech')}
          </button>

          <button
            type="button"
            onClick={() => handleRoleSelect('CUSTOMER')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
              padding: '6px 8px',
              borderRadius: '6px',
              border: 'none',
              fontSize: '11px',
              fontWeight: '800',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              background: selectedRole === 'CUSTOMER' ? '#2563eb' : 'transparent',
              color: selectedRole === 'CUSTOMER' ? '#fff' : 'var(--text-muted)'
            }}
          >
            <Car size={13} /> {t('auth.customer')}
          </button>
        </div>

        {/* Inline Error Display */}
        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            color: '#f87171',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <AlertCircle size={14} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form Controls */}
        <form onSubmit={handleSubmit} noValidate>
          {/* Identifier Input */}
          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', marginBottom: '3px' }}>
              {t('auth.email_phone')}
            </label>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                <Mail size={15} />
              </div>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={selectedRole === 'STUDENT' ? 'student@autoserv.com' : 'user@autoserv.com'}
                disabled={loading}
                className="form-control"
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  height: '34px',
                  fontSize: '12px'
                }}
                required
              />
            </div>
          </div>

          {/* Password Input with Show/Hide Toggle */}
          <div style={{ marginBottom: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
              <label style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-main)', margin: 0 }}>
                {t('auth.password')}
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '700', cursor: 'pointer', padding: 0 }}
              >
                {t('auth.forgot_password')}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                <Lock size={15} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="form-control"
                style={{
                  width: '100%',
                  paddingLeft: '32px',
                  paddingRight: '36px',
                  height: '34px',
                  fontSize: '12px'
                }}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', fontWeight: '600' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#2563eb', width: '14px', height: '14px', cursor: 'pointer' }}
              />
              {t('auth.remember_me')}
            </label>
          </div>

          {/* Submit Button with Loading State */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? '#475569' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              height: '36px',
              fontSize: '13px',
              fontWeight: '800',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: loading ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.4)'
            }}
          >
            {loading ? (
              <>
                <div style={{
                  width: '14px',
                  height: '14px',
                  border: '2px solid rgba(255, 255, 255, 0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite'
                }} />
                {t('auth.authenticating')}
              </>
            ) : (
              <>
                {t('auth.login_btn')} <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer Note & Sign Up Link */}
        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-color)', textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>
          {t('auth.no_account')}{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            style={{ background: 'none', border: 'none', color: '#2563eb', fontWeight: '800', cursor: 'pointer', textDecoration: 'underline' }}
          >
            {t('auth.create_new_account_link')}
          </button>
        </div>
      </div>

      {/* Forgot Password Flow Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', padding: '24px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '8px' }}>
              Reset Password Instructions
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: '1.5', marginBottom: '16px' }}>
              For security compliance, password resets are handled directly by the Workshop System Administrator.
            </p>
            <div style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', border: '1px solid #334155', fontSize: '12px', color: '#cbd5e1', marginBottom: '20px' }}>
              <div>Contact Administrator: <strong>admin@autoserv.com</strong></div>
              <div>System Desk Extension: <strong>Ext #404</strong></div>
            </div>
            <button className="btn btn-primary" onClick={() => setShowForgotModal(false)} style={{ width: '100%' }}>
              Close & Return to Sign In
            </button>
          </div>
        </div>
      )}

      {/* CSS Keyframes for Spinner */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
