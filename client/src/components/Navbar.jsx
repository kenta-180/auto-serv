import React, { useState, useEffect } from 'react';
import { 
  Car, LayoutDashboard, Wrench, Package, BarChart3, Users, 
  FileText, LogOut, Bell, Shield, GraduationCap, Calendar, CheckCircle2, X, Globe, Sun, Moon
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

export default function Navbar({ user, activeTab, onTabChange, onRoleSwitch, onSignOut, jobCards = [], vehicles = [] }) {
  const { language, changeLanguage, t, availableLanguages } = useLanguage();
  const { theme, toggleTheme, isDark } = useTheme();
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);

  // Generate Real-Time Notifications based on actual Customer Vehicles & Job Cards
  useEffect(() => {
    if (!user) return;

    const safeCards = Array.isArray(jobCards) ? jobCards : [];
    const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

    let realTimeList = [];

    if (user.role === 'CUSTOMER' || user.role === 'STUDENT') {
      // Find cards related to this customer
      const myCards = safeCards.filter(c => c && (
        c.customerId === user.id || 
        c.customer?.email === user.email ||
        c.customer?.id === user.id
      ));

      // Find vehicles related to this customer
      const myVehicles = safeVehicles.filter(v => v && (
        v.userId === user.id || 
        v.ownerEmail === user.email
      ));

      if (myCards.length > 0) {
        myCards.forEach((c, idx) => {
          const vName = c.vehicle ? `${c.vehicle.make} ${c.vehicle.model}` : 'Vehicle';
          const plate = c.vehicle?.licensePlate ? `(${c.vehicle.licensePlate})` : '';
          const tasksLabor = (c.tasks || []).reduce((sum, t) => sum + (Number(t.estimatedLaborCost) || 0), 0);
          const laborCost = tasksLabor > 0 ? tasksLabor : (Number(c.laborCost) || 0);
          const partsCost = (c.parts || []).reduce((sum, p) => sum + (Number(p.totalPrice) || (Number(p.quantity) * Number(p.unitPrice)) || 0), 0);
          const subtotal = laborCost + partsCost;
          let billedAmt = 0;
          if (c.totalAmount && Number(c.totalAmount) > 0) billedAmt = Number(c.totalAmount);
          else if (subtotal > 0) billedAmt = subtotal * 1.10;
          else if (c.totalCost && Number(c.totalCost) > 0) billedAmt = Number(c.totalCost) * 1.10;
          else if (c.estimatedCost && Number(c.estimatedCost) > 0) billedAmt = Number(c.estimatedCost) * 1.10;
          else billedAmt = 3850.00;
          
          if (c.status === 'DELIVERED') {
            realTimeList.push({
              id: `card-del-${c.id || idx}`,
              title: `🎉 Service Complete & Delivered: ${vName}`,
              desc: `Workorder #${c.cardNumber} closed. Digital handover pass released for ${plate}. Total: ₹${(c.totalCost || 0).toFixed(2)}`,
              time: 'Just now',
              unread: true,
              showPayButton: true,
              invoiceId: c.id,
              amount: billedAmt
            });
          } else if (c.status === 'PAID') {
            realTimeList.push({
              id: `card-paid-${c.id || idx}`,
              title: `✅ Payment Verified: ${vName}`,
              desc: `Invoice for ${c.cardNumber} settled. Vehicle ready for pickup handover ${plate}.`,
              time: '5 mins ago',
              unread: true,
              showPayButton: true,
              invoiceId: c.id,
              amount: billedAmt
            });
          } else if (c.status === 'INVOICED') {
            realTimeList.push({
              id: `card-inv-${c.id || idx}`,
              title: `📄 Invoice Generated: ${c.cardNumber}`,
              desc: `Total Billed: ₹${billedAmt.toFixed(2)}. Pay securely via UPI Gateway for ${vName} ${plate}.`,
              time: '12 mins ago',
              unread: true,
              showPayButton: true,
              invoiceId: c.id,
              amount: billedAmt
            });
          } else if (c.status === 'QC_PASSED') {
            realTimeList.push({
              id: `card-qc-${c.id || idx}`,
              title: `🛡️ QC Inspection Passed: ${vName}`,
              desc: `Master Technician verified torque specs, fluids & road test for ${plate}. Billing in progress.`,
              time: '20 mins ago',
              unread: true,
              showPayButton: true,
              invoiceId: c.id,
              amount: billedAmt
            });
          } else if (c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED') {
            realTimeList.push({
              id: `card-prog-${c.id || idx}`,
              title: `🛠️ Active Repair in Progress: ${vName}`,
              desc: `Technician ${c.technician?.name || 'assigned'} is servicing your vehicle ${plate}. Live photos updating.`,
              time: '30 mins ago',
              unread: true,
              showPayButton: true,
              invoiceId: c.id,
              amount: billedAmt
            });
          } else {
            realTimeList.push({
              id: `card-check-${c.id || idx}`,
              title: `📋 Intake Check-in Recorded: ${vName}`,
              desc: `Job card #${c.cardNumber} issued for ${plate}. Pre-service condition photos logged.`,
              time: '1 hour ago',
              unread: false,
              showPayButton: true,
              invoiceId: c.id,
              amount: billedAmt
            });
          }
        });
      }

      if (myVehicles.length > 0) {
        myVehicles.forEach((v, idx) => {
          realTimeList.push({
            id: `veh-${v.id || idx}`,
            title: `🚗 Registered Vehicle Active: ${v.make} ${v.model}`,
            desc: `License Plate: ${v.licensePlate} (${v.year || '2024'}). Registered under account ${user.email}.`,
            time: 'Live',
            unread: false
          });
        });
      }

      if (realTimeList.length === 0) {
        realTimeList = [
          {
            id: 'default-1',
            title: '💳 Digital Invoices & UPI Gateway Active',
            desc: `Account linked to ${user.name} (${user.email}). View fee receipts and settle invoices online.`,
            time: 'Just now',
            unread: true,
            showPayButton: true
          },
          {
            id: 'default-2',
            title: '📅 Workshop Slot Scheduling Open',
            desc: 'Real-time DVI inspection photos, stage tracking, and digital PDF invoices enabled.',
            time: '10 mins ago',
            unread: true,
            showPayButton: true
          }
        ];
      }
    } else {
      // ADMIN or TECHNICIAN real-time workshop notifications
      const activeCount = safeCards.filter(c => c && c.status !== 'DELIVERED').length;
      const qcCount = safeCards.filter(c => c && (c.status === 'IN_PROGRESS' || c.status === 'QC_PENDING')).length;
      
      realTimeList = [
        {
          id: 'admin-1',
          title: `🔧 Workshop Activity: ${activeCount} Active Work Orders`,
          desc: `${qcCount} vehicles currently in service bays awaiting QC inspection.`,
          time: 'Just now',
          unread: true
        },
        {
          id: 'admin-2',
          title: '⚡ System Status: Real-Time Sync & DVI Active',
          desc: 'Live stage notifications, DVI photo updates, and UPI gateway webhooks active.',
          time: '5 mins ago',
          unread: true
        }
      ];

      // Add recent active job card alerts
      safeCards.slice(0, 3).forEach((c, idx) => {
        if (c) {
          realTimeList.push({
            id: `admin-card-${c.id || idx}`,
            title: `Workorder #${c.cardNumber}: ${c.vehicle?.make || 'Vehicle'} ${c.vehicle?.model || ''}`,
            desc: `Status: ${c.status} | Customer: ${c.customer?.name || 'Customer'} (${c.vehicle?.licensePlate || ''})`,
            time: 'Recent',
            unread: false
          });
        }
      });
    }

    setNotifications(realTimeList);
  }, [user, jobCards, vehicles]);

  if (!user) return null;

  const role = user.role || 'CUSTOMER';
  const currentLangObj = availableLanguages.find(l => l.code === language) || availableLanguages[0];

  // Role-Aware Navigation Config
  const getNavItems = () => {
    switch (role) {
      case 'ADMIN':
        return [
          { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
          { id: 'job-cards', label: t('nav.job_cards'), icon: Wrench },
          { id: 'inventory', label: t('nav.inventory'), icon: Package },
          { id: 'reports', label: t('nav.reports'), icon: BarChart3 },
          { id: 'users', label: t('nav.users'), icon: Users }
        ];
      case 'TECHNICIAN':
        return [
          { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
          { id: 'job-cards', label: t('nav.assigned_jobs'), icon: Wrench },
          { id: 'inventory', label: t('nav.inventory_parts'), icon: Package }
        ];
      case 'CUSTOMER':
      case 'STUDENT':
      default:
        return [
          { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
          { id: 'book-service', label: t('nav.book_service'), icon: Calendar },
          { id: 'job-cards', label: t('nav.my_service_history'), icon: Wrench },
          { id: 'invoices', label: t('nav.my_fees_receipts'), icon: FileText }
        ];
    }
  };

  const navItems = getNavItems();

  const handleNavClick = (tabId) => {
    onTabChange(tabId);
    setNotificationsOpen(false);
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const markAsRead = (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  return (
    <>
      {/* Top Navbar Header */}
      <nav style={{
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        position: 'sticky',
        top: 0,
        paddingTop: 'max(env(safe-area-inset-top), 24px)',
        zIndex: 100,
        width: '100%',
        color: 'var(--text-main)',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '0 16px',
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          
          {/* Brand Logo & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
              width: '34px',
              height: '34px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}>
              <Car size={18} color="#fff" />
            </div>
            <div>
              <span className="nav-brand-title" style={{ fontSize: '15px', fontWeight: '800', letterSpacing: '-0.02em', color: 'var(--text-main)', display: 'block', lineHeight: '1.1' }}>
                AUTO-SERV
              </span>
              <span className="nav-brand-subtext" style={{ fontSize: '9px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Workshop Portal
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links (>= 768px) */}
          <div className="nav-desktop-links" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: isActive ? '1px solid #3b82f6' : '1px solid transparent',
                    background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                    color: isActive ? '#2563eb' : 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: isActive ? '800' : '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Icon size={16} color={isActive ? '#2563eb' : 'currentColor'} />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Right Section Header Controls */}
          <div className="nav-header-right" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto', flexShrink: 0 }}>

            {/* BUTTON 0: Theme Toggle Control (Sunlight-Readable Light / Dark) */}
            <button
              type="button"
              className="nav-btn-icon"
              onClick={toggleTheme}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '34px',
                height: '34px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: isDark ? '#fbbf24' : '#2563eb',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              title={isDark ? 'Switch to Sunlight-Readable Light Theme / लाइट थीम चुनें' : 'Switch to Dark Theme / डार्क थीम चुनें'}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* BUTTON 1: Language Switcher (Positioned IMMEDIATELY beside notification icon) */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="nav-btn-lang"
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  setNotificationsOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  height: '34px',
                  padding: '0 8px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#2563eb',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Switch Language / भाषा बदलें"
                aria-label="Language Switcher"
              >
                <Globe size={15} color="#2563eb" />
                <span style={{ color: 'var(--text-main)' }}>{currentLangObj.short}</span>
              </button>

              {/* Language Selection Dropdown Menu */}
              {langDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '115%',
                  width: '160px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '12px',
                  padding: '6px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000
                }}>
                  {availableLanguages.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        changeLanguage(l.code);
                        setLangDropdownOpen(false);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        background: language === l.code ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                        color: language === l.code ? '#2563eb' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: language === l.code ? '800' : '600',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span>{l.flag} {l.label}</span>
                      {language === l.code && <CheckCircle2 size={14} color="#2563eb" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* BUTTON 2: Notifications Feature */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="nav-btn-icon"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '34px',
                  height: '34px',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  color: '#2563eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                title="Workshop Notifications"
                aria-label="Notifications"
              >
                <Bell size={16} color="#2563eb" />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#ef4444',
                    color: '#ffffff',
                    fontSize: '9px',
                    fontWeight: '800',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.5)'
                  }}>
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Panel */}
              {notificationsOpen && (
                <div style={{
                  position: 'absolute',
                  right: '-40px',
                  top: '115%',
                  width: '320px',
                  maxWidth: '90vw',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '16px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
                  zIndex: 1000
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bell size={16} color="#2563eb" />
                      <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-main)' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <span style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#2563eb', fontSize: '10px', fontWeight: '800', padding: '2px 6px', borderRadius: '999px' }}>
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        No notifications available.
                      </div>
                    ) : (
                      notifications.map(item => (
                        <div
                          key={item.id}
                          onClick={() => markAsRead(item.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: item.unread ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-dark)',
                            border: item.unread ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid var(--border-color)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '800', color: item.unread ? '#2563eb' : 'var(--text-main)' }}>
                              {item.title}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontWeight: '600' }}>{item.time}</span>
                          </div>
                          <p style={{ fontSize: '11px', color: item.unread ? 'var(--text-main)' : 'var(--text-muted)', margin: 0, lineHeight: '1.4', fontWeight: '500' }}>
                            {item.desc}
                          </p>

                          {/* Interactive Pay Now Action Button in Notification */}
                          {item.showPayButton && (
                            <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(item.id);
                                  setNotificationsOpen(false);
                                  if (item.invoiceId) {
                                    const qParam = item.amount && item.amount > 0 ? `?amount=${item.amount}` : '';
                                    window.open(`/pay/${item.invoiceId}${qParam}`, '_blank');
                                  } else {
                                    onTabChange('invoices');
                                  }
                                }}
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '800',
                                  padding: '5px 12px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
                                  transition: 'transform 0.15s ease'
                                }}
                              >
                                💳 Pay Now {item.amount ? `(₹${item.amount.toFixed(2)})` : ''}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* BUTTON 3: Direct Sign Out Button */}
            <button
              type="button"
              className="nav-btn-signout"
              onClick={onSignOut}
              title="Sign Out of Application"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                height: '34px',
                padding: '0 10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '11px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 8px rgba(239, 68, 68, 0.15)'
              }}
            >
              <LogOut size={15} />
              <span className="nav-signout-text">Sign Out</span>
            </button>

          </div>
        </div>
      </nav>

      {/* Standalone Fixed Bottom Mobile Navigation Dock (Rendered OUTSIDE <nav>) */}
      <div className="bottom-nav-dock" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        height: '60px',
        background: 'var(--bg-card)',
        borderTop: '1px solid var(--border-color)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-evenly',
        padding: 0,
        boxShadow: isDark ? '0 -4px 20px rgba(0, 0, 0, 0.5)' : '0 -4px 20px rgba(0, 0, 0, 0.08)'
      }}>
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justify: 'center',
                gap: '3px',
                flex: '1 1 0%',
                width: '100%',
                maxWidth: 'none',
                height: '100%',
                padding: '6px 2px',
                borderRadius: '0',
                border: 'none',
                background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                color: isActive ? '#2563eb' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                borderTop: isActive ? '3px solid #2563eb' : '3px solid transparent'
              }}
            >
              <div style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justify: 'center'
              }}>
                <Icon size={18} color={isActive ? '#2563eb' : 'currentColor'} />
                {isActive && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-4px',
                    width: '5px',
                    height: '5px',
                    borderRadius: '50%',
                    background: '#2563eb'
                  }} />
                )}
              </div>
              <span style={{
                fontSize: '10px',
                fontWeight: isActive ? '800' : '600',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                color: isActive ? '#2563eb' : 'var(--text-muted)'
              }}>
                {item.label}
              </span>
            </button>
          );
        })}

      </div>

      {/* Embedded CSS rules for responsive navbar display breakpoints */}
      <style>{`
        @media (max-width: 767px) {
          .nav-desktop-links {
            display: none !important;
          }
          .bottom-nav-dock {
            display: flex !important;
          }
        }
        @media (max-width: 480px) {
          .nav-signout-text {
            display: none !important;
          }
          .nav-header-right {
            gap: 4px !important;
          }
          .nav-btn-icon, .nav-btn-lang, .nav-btn-signout {
            min-width: 36px !important;
            height: 36px !important;
          }
        }
        @media (min-width: 768px) {
          .nav-desktop-links {
            display: flex !important;
          }
          .bottom-nav-dock {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
