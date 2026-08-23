import React, { useState, useEffect } from 'react';
import { 
  Car, Wrench, Package, FileText, CheckCircle, Plus, Users, UserPlus, LogOut,
  Search, Shield, DollarSign, Clock, AlertTriangle, Filter, Eye, RefreshCw, Award
} from 'lucide-react';
import { api } from './services/api';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import CreateJobCardModal from './components/CreateJobCardModal';
import JobCardModal from './components/JobCardModal';
import AddTechnicianModal from './components/AddTechnicianModal';
import CompletedVehicleHistoryModal from './components/jobcards/CompletedVehicleHistoryModal';
import AdminAttendanceModal from './components/users/AdminAttendanceModal';
import RegisterPage from './components/RegisterPage';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import AdminDashboard from './components/dashboards/AdminDashboard';
import TechnicianDashboard from './components/dashboards/TechnicianDashboard';
import StudentDashboard from './components/dashboards/StudentDashboard';
import JobCardsPage from './components/jobcards/JobCardsPage';
import InventoryPage from './components/inventory/InventoryPage';
import ReportsPage from './components/reports/ReportsPage';
import UserManagementPage from './components/users/UserManagementPage';
import InvoicesPage from './components/invoices/InvoicesPage';
import PaymentLandingPage from './components/pay/PaymentLandingPage';
import HostedCheckoutPage from './components/pay/HostedCheckoutPage';
import BookingPage from './components/booking/BookingPage';
import AdminSchedulePage from './components/booking/AdminSchedulePage';
import CustomerGalleryPage from './components/CustomerGalleryPage';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          background: '#0f172a',
          color: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'Inter, sans-serif'
        }}>
          <div style={{
            maxWidth: '450px',
            width: '100%',
            background: '#1e293b',
            border: '1px solid #ef4444',
            borderRadius: '16px',
            padding: '32px',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#ef4444', marginBottom: '12px' }}>
              Application Render Error
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '20px' }}>
              {this.state.error?.message || 'An error occurred while loading the UI component.'}
            </p>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
            >
              Reset Session & Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <MainApp />
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function MainApp() {
  const [user, setUser] = useState(null);
  const [jobCards, setJobCards] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [initError, setInitError] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);
  
  const isUserRegisteredInStorage = () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('hasRegistered') === 'true' || !!localStorage.getItem('lastUserEmail');
  };

  const initialAuthScreen = (typeof window !== 'undefined' && window.location.pathname === '/register') ? 'register' : 'login';
  const [authScreen, setAuthScreen] = useState(initialAuthScreen);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddTechModal, setShowAddTechModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [selectedBookingForCheckIn, setSelectedBookingForCheckIn] = useState(null);

  // Default fallback user for development mode
  const DEFAULT_ADMIN_USER = {
    id: 'admin@autoserv.com',
    name: 'Workshop Administrator',
    email: 'admin@autoserv.com',
    role: 'ADMIN'
  };

  const [sessionError, setSessionError] = useState(null);

  // Check for existing valid session on startup
  const verifySession = async () => {
    setLoadingSession(true);
    setSessionError(null);
    try {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        const getMeWithTimeout = Promise.race([
          api.getMe(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Server response timeout')), 5000))
        ]);

        const me = await getMeWithTimeout.catch((err) => {
          if (err.message === 'Server response timeout') throw err;
          return null;
        });

        if (me && me.user) {
          setUser(me.user);
          localStorage.setItem('hasRegistered', 'true');
          if (me.user.email) localStorage.setItem('lastUserEmail', me.user.email);
          await loadDashboardData();
          setLoadingSession(false);
          return;
        }
      }
      setUser(null);
    } catch (err) {
      console.warn('Session verification error:', err);
      if (err.message === 'Server response timeout' || err.message?.includes('Failed to fetch')) {
        setSessionError('Unable to connect to Auto-Serv workshop server. Please check connection and try again.');
      } else {
        setUser(null);
      }
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    verifySession();
  }, []);

  const loginAs = async (email) => {
    try {
      setInitError(null);
      const authData = await api.login(email, 'password123');
      if (authData.token) localStorage.setItem('token', authData.token);
      localStorage.setItem('hasRegistered', 'true');
      if (authData.user?.email) localStorage.setItem('lastUserEmail', authData.user.email);
      setActiveTab('dashboard');
      setSelectedJobCard(null);
      setUser(authData.user);
      loadDashboardData();
    } catch (err) {
      console.error('Failed login as', email, err);
      setInitError(err.message || 'Server connection failed. Retrying...');
    }
  };

  const handleSignOut = async () => {
    await api.logout().catch(() => {});
    localStorage.removeItem('token');
    const registered = isUserRegisteredInStorage();
    setUser(null);
    setActiveTab('dashboard');
    setSelectedJobCard(null);
    setStatusFilter('ALL');
    setSearchQuery('');

    if (registered) {
      setAuthScreen('login');
      if (typeof window !== 'undefined') window.history.pushState({}, '', '/login');
    } else {
      setAuthScreen('register');
      if (typeof window !== 'undefined') window.history.pushState({}, '', '/register');
    }
  };

  const loadDashboardData = async () => {
    try {
      const [cardsData, invData, techUsers, custUsers, vehiclesData] = await Promise.all([
        api.getJobCards(),
        api.getInventory(),
        api.getUsers('TECHNICIAN'),
        api.getUsers('CUSTOMER'),
        api.getVehicles()
      ]);
      
      setJobCards(Array.isArray(cardsData) ? cardsData : []);
      setInventory(Array.isArray(invData) ? invData : []);
      setTechnicians(Array.isArray(techUsers) ? techUsers : []);
      setCustomers(Array.isArray(custUsers) ? custUsers : []);
      setVehicles(Array.isArray(vehiclesData) ? vehiclesData : []);

      if (selectedJobCard && Array.isArray(cardsData)) {
        const updatedSelected = cardsData.find(c => c && c.id === selectedJobCard.id);
        if (updatedSelected) setSelectedJobCard(updatedSelected);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  const handleRoleSwitch = (role) => {
    setActiveTab('dashboard');
    setSelectedJobCard(null);
    if (role === 'ADMIN') {
      loginAs('admin@autoserv.com');
    } else if (role === 'TECHNICIAN') {
      loginAs('tech@autoserv.com');
    } else if (role === 'CUSTOMER') {
      loginAs('customer@autoserv.com');
    }
  };

  const renderContent = () => {
    if (loadingSession) {
      return (
        <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <RefreshCw size={32} className="spin-icon" style={{ animation: 'spin 1s linear infinite', marginBottom: '12px', color: '#3b82f6' }} />
            <div style={{ fontSize: '15px', fontWeight: '600', color: '#f8fafc' }}>Verifying Session...</div>
          </div>
        </div>
      );
    }

    if (sessionError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
          <div style={{ maxWidth: '400px', width: '90%', background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px', display: 'inline-block' }} />
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Connection Notice</h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '24px' }}>{sessionError}</p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn" style={{ flex: 1, padding: '10px', background: '#334155', color: '#f8fafc', border: 'none', borderRadius: '8px', cursor: 'pointer' }} onClick={() => { localStorage.removeItem('token'); setSessionError(null); setUser(null); }}>
                Reset Session
              </button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '10px', borderRadius: '8px', cursor: 'pointer' }} onClick={verifySession}>
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Public Access Gate for Customer Payment Links & Hosted Gateway Session
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/pay/')) {
        return <PaymentLandingPage />;
      }
      if (pathname.startsWith('/checkout/')) {
        return <HostedCheckoutPage />;
      }
      if (pathname.startsWith('/gallery/')) {
        return <CustomerGalleryPage />;
      }
    }

    // Enforce Authentication Gate: Default to Sign-Up Page (RegisterPage) when unauthenticated
    if (!user) {
      if (authScreen === 'login') {
        return (
          <LoginPage 
            onLoginSuccess={(userData, token) => {
              if (token) localStorage.setItem('token', token);
              localStorage.setItem('hasRegistered', 'true');
              if (userData?.email) localStorage.setItem('lastUserEmail', userData.email);
              setActiveTab('dashboard');
              setSelectedJobCard(null);
              setUser(userData);
              loadDashboardData();
            }}
            onSwitchToRegister={() => {
              setAuthScreen('register');
              if (typeof window !== 'undefined') window.history.pushState({}, '', '/register');
            }}
          />
        );
      }

      return (
        <RegisterPage 
          onRegisterSuccess={(userData, token) => {
            if (token) localStorage.setItem('token', token);
            localStorage.setItem('hasRegistered', 'true');
            if (userData?.email) localStorage.setItem('lastUserEmail', userData.email);
            setActiveTab('dashboard');
            setSelectedJobCard(null);
            setUser(userData);
            loadDashboardData();
          }}
          onSwitchToLogin={() => {
            setAuthScreen('login');
            if (typeof window !== 'undefined') window.history.pushState({}, '', '/login');
          }}
        />
      );
    }

    const activeUser = user;

    const renderTabContent = () => {
      switch (activeTab) {
        case 'dashboard':
          if (activeUser.role === 'ADMIN') {
            return (
              <AdminDashboard
                jobCards={jobCards}
                inventory={inventory}
                customers={customers}
                onNavigateTab={(tab, options) => {
                  setActiveTab(tab);
                }}
                onOpenCheckIn={() => setShowCreateModal(true)}
                onOpenAddTech={() => setShowAddTechModal(true)}
                onOpenHistoryModal={() => setShowHistoryModal(true)}
                onOpenAttendance={() => setShowAttendanceModal(true)}
              />
            );
          } else if (activeUser.role === 'TECHNICIAN') {
            return (
              <TechnicianDashboard
                currentUser={activeUser}
                jobCards={jobCards}
                inventory={inventory}
                onSelectJobCard={setSelectedJobCard}
                onNavigateTab={setActiveTab}
                onRefresh={loadDashboardData}
              />
            );
          } else {
            return (
              <StudentDashboard
                currentUser={activeUser}
                jobCards={jobCards}
                vehicles={vehicles}
                onSelectJobCard={setSelectedJobCard}
                onNavigateTab={setActiveTab}
                onRefresh={loadDashboardData}
              />
            );
          }

        case 'job-cards':
          return (
            <JobCardsPage
              currentUser={activeUser}
              jobCards={jobCards}
              onSelectJobCard={setSelectedJobCard}
              onOpenCheckIn={() => setShowCreateModal(true)}
              onOpenHistoryModal={() => setShowHistoryModal(true)}
            />
          );

        case 'inventory':
          return (
            <InventoryPage
              currentUser={activeUser}
              inventory={inventory}
              jobCards={jobCards}
              onRefresh={loadDashboardData}
            />
          );

        case 'reports':
          return (
            <ReportsPage
              currentUser={activeUser}
              jobCards={jobCards}
              inventory={inventory}
              technicians={technicians}
            />
          );

        case 'users':
          return (
            <UserManagementPage
              currentUser={activeUser}
              technicians={technicians}
              customers={customers}
              onRefresh={loadDashboardData}
            />
          );

        case 'invoices':
          return (
            <InvoicesPage
              currentUser={activeUser}
              jobCards={jobCards}
            />
          );

        case 'book-service':
          return (
            <BookingPage
              currentUser={activeUser}
            />
          );

        case 'schedule':
          return (
            <AdminSchedulePage
              onOpenCheckInWithBooking={(booking) => {
                setSelectedBookingForCheckIn(booking);
                setShowCreateModal(true);
              }}
            />
          );

        default:
          if (activeUser.role === 'ADMIN') {
            return (
              <AdminDashboard
                jobCards={jobCards}
                inventory={inventory}
                customers={customers}
                onNavigateTab={(tab, options) => {
                  setActiveTab(tab);
                }}
                onOpenCheckIn={() => setShowCreateModal(true)}
                onOpenAddTech={() => setShowAddTechModal(true)}
                onOpenHistoryModal={() => setShowHistoryModal(true)}
                onOpenAttendance={() => setShowAttendanceModal(true)}
              />
            );
          } else if (activeUser.role === 'TECHNICIAN') {
            return (
              <TechnicianDashboard
                currentUser={activeUser}
                jobCards={jobCards}
                inventory={inventory}
                onSelectJobCard={setSelectedJobCard}
                onNavigateTab={setActiveTab}
                onRefresh={loadDashboardData}
              />
            );
          } else {
            return (
              <StudentDashboard
                currentUser={activeUser}
                jobCards={jobCards}
                vehicles={vehicles}
                onSelectJobCard={setSelectedJobCard}
                onNavigateTab={setActiveTab}
                onRefresh={loadDashboardData}
              />
            );
          }
      }
    };

    return (
      <div className="app-container">
        {/* Role-Aware Navigation Bar */}
        <Navbar
          user={activeUser}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onRoleSwitch={handleRoleSwitch}
          onSignOut={handleSignOut}
          jobCards={jobCards}
          vehicles={vehicles}
        />

        {/* Main Content Area */}
        <main className="main-content" style={{ paddingTop: '20px', paddingBottom: '85px', maxWidth: '1280px', margin: '0 auto', paddingLeft: '16px', paddingRight: '16px' }}>
          {renderTabContent()}
        </main>

        {/* Modals */}
        {showCreateModal && (
          <CreateJobCardModal
            vehicles={vehicles}
            customers={customers}
            technicians={technicians}
            prefillBooking={selectedBookingForCheckIn}
            onClose={() => {
              setShowCreateModal(false);
              setSelectedBookingForCheckIn(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setSelectedBookingForCheckIn(null);
              loadDashboardData();
            }}
          />
        )}

        {showAddTechModal && (
          <AddTechnicianModal
            onClose={() => setShowAddTechModal(false)}
            onSuccess={() => {
              setShowAddTechModal(false);
              loadDashboardData();
            }}
          />
        )}

        {showHistoryModal && (
          <CompletedVehicleHistoryModal
            jobCards={jobCards}
            onSelectJobCard={setSelectedJobCard}
            onClose={() => setShowHistoryModal(false)}
          />
        )}

        {showAttendanceModal && (
          <AdminAttendanceModal
            technicians={technicians}
            onClose={() => setShowAttendanceModal(false)}
            onRefresh={loadDashboardData}
          />
        )}

        {selectedJobCard && (
          <JobCardModal
            jobCard={selectedJobCard}
            inventory={inventory}
            technicians={technicians}
            currentUser={activeUser}
            onClose={() => setSelectedJobCard(null)}
            onRefresh={loadDashboardData}
          />
        )}
      </div>
    );
  };

  return (
    <LanguageProvider user={user}>
      {renderContent()}
    </LanguageProvider>
  );
}
