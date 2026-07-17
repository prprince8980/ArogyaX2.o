import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, Bell, ChevronDown, LayoutDashboard, QrCode, FileText, 
  FlaskConical, ShoppingBag, AlertCircle, UserPlus, User, Headset,
  ArrowRight, LogOut
} from 'lucide-react';
import arogyaXLogo from '../assets/arogyax-logo.svg';
import "../styles/pages/DashboardPage.css";

function DashboardPage() {
  const navigate = useNavigate();
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('arogax2User') || '{}') : { name: 'Prakash Kumar', role: 'Patient' };
  
  const userName = user.name || "Prakash Kumar";
  const userInitials = userName.charAt(0).toUpperCase();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('arogax2User');
    navigate('/login');
  };

  const DashboardOverview = () => (
    <>
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome back, {userName}</h1>
        <p className="welcome-subtitle">Here's your health overview</p>
      </div>

      <div className="features-grid">
        <div className="feature-card card-qr" onClick={() => setActiveTab('qr')}>
          <div className="card-icon"><QrCode size={24} /></div>
          <h3>QR Code</h3>
          <p>Generate and share your QR code</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>
        
        <div className="feature-card card-clinic" onClick={() => setActiveTab('clinic')}>
          <div className="card-icon"><FileText size={24} /></div>
          <h3>Clinic Report</h3>
          <p>View and download your clinic reports</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-lab" onClick={() => setActiveTab('lab')}>
          <div className="card-icon"><FlaskConical size={24} /></div>
          <h3>Laboratory Report</h3>
          <p>View and download your lab reports</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-medicine" onClick={() => setActiveTab('medicine')}>
          <div className="card-icon"><ShoppingBag size={24} /></div>
          <h3>Buy Medicine</h3>
          <p>Order medicines quickly and securely</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-emergency" onClick={() => setActiveTab('emergency')}>
          <div className="card-icon"><AlertCircle size={24} /></div>
          <h3>Emergency</h3>
          <p>Contact emergency services quickly</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-member" onClick={() => setActiveTab('member')}>
          <div className="card-icon"><UserPlus size={24} /></div>
          <h3>Add Member</h3>
          <p>Add family members to your account</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-profile" onClick={() => setActiveTab('profile')}>
          <div className="card-icon"><User size={24} /></div>
          <h3>Manage Profile</h3>
          <p>Update your profile and preferences</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>
      </div>

      <div className="recent-activity-section">
        <div className="activity-header">
          <h2>Recent Activity</h2>
        </div>
        
        <div className="activity-list">
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #e2e8f0', fontSize: '0.9rem' }}>
            No recent activity recorded.
          </div>
        </div>
      </div>
    </>
  );

  const QRCodeView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', textAlign: 'center' }}>
      <h2>Your Health QR Code</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Share this with clinics and hospitals to quickly share your medical history.</p>
      <div style={{ 
        width: '200px', height: '200px', margin: '0 auto', 
        backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px dashed #cbd5e1', borderRadius: '1rem'
      }}>
        <QrCode size={100} color="#94a3b8" />
      </div>
      <button style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>
        Download QR
      </button>
    </div>
  );

  const ClinicReportView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem' }}>
      <h2>Clinic Reports</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Access all your past consultation reports here.</p>
      <div style={{ padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '1rem', textAlign: 'center', border: '1px dashed #e2e8f0' }}>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>No clinic reports found.</p>
      </div>
    </div>
  );

  const LabReportView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem' }}>
      <h2>Laboratory Reports</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>View and download your test results.</p>
      <div style={{ padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '1rem', textAlign: 'center', border: '1px dashed #e2e8f0' }}>
        <p style={{ color: '#64748b', margin: 0, fontSize: '0.95rem' }}>No laboratory reports found.</p>
      </div>
    </div>
  );

  const MedicineView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', textAlign: 'center' }}>
      <h2>Buy Medicine</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Order your prescriptions from trusted pharmacies.</p>
      <div style={{ padding: '3rem', backgroundColor: '#fffbeb', borderRadius: '1rem', color: '#f59e0b', display: 'inline-block' }}>
        <ShoppingBag size={48} style={{ marginBottom: '1rem' }} />
        <h3>Coming Soon!</h3>
        <p>Our online pharmacy integration is currently under development.</p>
      </div>
    </div>
  );

  const EmergencyView = () => (
    <div style={{ padding: '2rem', backgroundColor: '#fef2f2', borderRadius: '1rem', border: '1px solid #fee2e2' }}>
      <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <AlertCircle size={28} /> Emergency Contacts
      </h2>
      <p style={{ color: '#991b1b', marginBottom: '2rem' }}>In case of a medical emergency, use the numbers below or go to the nearest hospital immediately.</p>
      
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>National Ambulance</h3>
            <p style={{ margin: 0, color: '#64748b' }}>24/7 Medical Response</p>
          </div>
          <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', cursor: 'pointer' }}>
            Call 911
          </button>
        </div>
      </div>
    </div>
  );

  const AddMemberView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', textAlign: 'center' }}>
      <h2>Add Family Member</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>To add a new member to your account, you need to go to the login screen and select "Add New Profile".</p>
      <button 
        onClick={() => {
          // Go to login to trigger the profile select/add member flow
          navigate('/login');
        }}
        style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
      >
        Go to Profile Selection
      </button>
    </div>
  );

  const ProfileView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem' }}>
      <h2>Manage Profile</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Update your personal and medical information.</p>
      
      <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
        <div style={{ width: '100px', height: '100px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>
          {userInitials}
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Full Name</label>
            <input type="text" defaultValue={userName} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Email / Account</label>
            <input type="text" defaultValue={user.email} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Role</label>
            <input type="text" defaultValue={user.role} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', textTransform: 'capitalize' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
            <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'qr': return <QRCodeView />;
      case 'clinic': return <ClinicReportView />;
      case 'lab': return <LabReportView />;
      case 'medicine': return <MedicineView />;
      case 'emergency': return <EmergencyView />;
      case 'member': return <AddMemberView />;
      case 'profile': return <ProfileView />;
      default: return <DashboardOverview />;
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <img src={arogyaXLogo} alt="ArogyaX" style={{ height: '32px', width: 'auto' }} />
        </div>

        <nav className="sidebar-nav">
          <a href="#" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); }}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'qr' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('qr'); }}>
            <QrCode size={20} />
            <span>QR Code</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'clinic' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('clinic'); }}>
            <FileText size={20} />
            <span>Clinic Report</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'lab' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('lab'); }}>
            <FlaskConical size={20} />
            <span>Laboratory Report</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'medicine' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('medicine'); }}>
            <ShoppingBag size={20} />
            <span>Buy Medicine</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'emergency' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('emergency'); }}>
            <AlertCircle size={20} />
            <span>Emergency</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'member' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('member'); }}>
            <UserPlus size={20} />
            <span>Add Member</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('profile'); }}>
            <User size={20} />
            <span>Manage Profile</span>
          </a>
        </nav>

        <div className="support-card">
          <p className="support-title">Need Help?</p>
          <p className="support-desc">Our support team is here to help you 24/7</p>
          <button className="support-button">
            <Headset size={18} />
            Contact Support
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Topbar */}
        <header className="dashboard-topbar">
          <div className="topbar-right">
            <button className="icon-btn">
              <Bell size={20} />
            </button>
            <div className="user-profile" style={{ position: 'relative' }}>
              <div 
                className="user-profile-trigger" 
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }}
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="avatar">{userInitials}</div>
                <div className="user-info">
                  <span className="user-name">{userName}</span>
                  <span className="user-role" style={{ textTransform: 'capitalize' }}>{user.role}</span>
                </div>
                <ChevronDown size={16} className="dropdown-icon" />
              </div>
              
              {showDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  borderRadius: '0.5rem',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                  border: '1px solid #e2e8f0',
                  minWidth: '150px',
                  zIndex: 50
                }}>
                  <div 
                    onClick={() => { setShowDropdown(false); setActiveTab('profile'); }}
                    style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <User size={16} /> Profile
                  </div>
                  <div 
                    onClick={handleLogout}
                    style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#ef4444' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <LogOut size={16} /> Logout
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="dashboard-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default DashboardPage;
