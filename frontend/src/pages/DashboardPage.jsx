import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, Bell, ChevronDown, LayoutDashboard, QrCode, FileText, 
  FlaskConical, ShoppingBag, AlertCircle, UserPlus, User, Headset,
  ArrowRight, LogOut, Search, Check, ShoppingCart, X
} from 'lucide-react';
import arogyaXLogo from '../assets/arogyax-logo.png';
import "../styles/pages/DashboardPage.css";
import { TEMP_MEDICINES, MEDICINE_CATEGORIES, INITIAL_RECENT_ORDERS } from '../data/medicinesData';

function DashboardPage() {
  const navigate = useNavigate();
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('arogax2User') || '{}') : { name: 'Prakash Kumar', role: 'Patient' };
  
  const userName = user.name || "Prakash Kumar";
  const userInitials = userName.charAt(0).toUpperCase();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDropdown, setShowDropdown] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Medicine Store state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [recentOrders, setRecentOrders] = useState(INITIAL_RECENT_ORDERS);
  const [orderNotice, setOrderNotice] = useState('');
  const [activeMedTab, setActiveMedTab] = useState('store'); // 'store' | 'orders'

  const handleLogout = () => {
    localStorage.removeItem('arogax2User');
    navigate('/login');
  };

  const handleAddToCart = (medicine) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === medicine.id);
      if (existing) {
        return prev.map((item) =>
          item.id === medicine.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...medicine, qty: 1 }];
    });
    setOrderNotice(`Added ${medicine.name} to cart.`);
    setTimeout(() => setOrderNotice(''), 3000);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const totalAmount = cart.reduce((sum, item) => sum + item.numericPrice * item.qty, 0);
    const newOrder = {
      id: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      date: new Date().toISOString().split('T')[0],
      items: cart.map((i) => `${i.name} x ${i.qty}`),
      total: `₹${totalAmount.toFixed(2)}`,
      status: 'Processing',
      pharmacy: 'ArogyaX Central Express Pharmacy'
    };
    setRecentOrders([newOrder, ...recentOrders]);
    setCart([]);
    setOrderNotice('Order placed successfully! Pharmacy team will contact you shortly.');
    setTimeout(() => setOrderNotice(''), 5000);
    setActiveMedTab('orders');
  };

  const filteredMedicines = TEMP_MEDICINES.filter((med) => {
    const matchesCategory = selectedCategory === 'All' || med.category === selectedCategory;
    const matchesSearch = med.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          med.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.numericPrice * item.qty, 0);

  const DashboardOverview = () => (
    <>
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome back, {userName}</h1>
        <p className="welcome-subtitle">Here's your health overview & services</p>
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
          <div style={{ padding: '1.5rem', backgroundColor: '#ffffff', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.25rem' }}>💊</span>
                <div>
                  <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>Pharmacy Order ORD-9021</strong>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>Delivered • Paracetamol & Zincovit</p>
                </div>
              </div>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600' }}>₹170.00</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );

  const QRCodeView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
      <h2>Your Health QR Code</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Share this with clinics and hospitals to quickly share your medical history.</p>
      <div style={{ 
        width: '200px', height: '200px', margin: '0 auto', 
        backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center',
        border: '2px dashed #cbd5e1', borderRadius: '1rem'
      }}>
        <QrCode size={100} color="#3b82f6" />
      </div>
      <button style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Sub-tabs */}
      <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.5rem', color: '#0f172a' }}>Pharmacy & Medicine Store</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Order genuine medicines from licensed partner pharmacies</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setActiveMedTab('store')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                borderColor: activeMedTab === 'store' ? '#2563eb' : '#cbd5e1',
                backgroundColor: activeMedTab === 'store' ? '#eff6ff' : 'white',
                color: activeMedTab === 'store' ? '#2563eb' : '#475569',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              💊 Medicine Store ({TEMP_MEDICINES.length})
            </button>
            <button 
              onClick={() => setActiveMedTab('orders')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid',
                borderColor: activeMedTab === 'orders' ? '#2563eb' : '#cbd5e1',
                backgroundColor: activeMedTab === 'orders' ? '#eff6ff' : 'white',
                color: activeMedTab === 'orders' ? '#2563eb' : '#475569',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              📦 Order History ({recentOrders.length})
            </button>
          </div>
        </div>

        {orderNotice && (
          <div style={{ padding: '0.75rem 1rem', backgroundColor: '#dcfce7', border: '1px solid #86efac', color: '#15803d', borderRadius: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
            ✅ {orderNotice}
          </div>
        )}
      </div>

      {activeMedTab === 'store' ? (
        <>
          {/* Controls: Search & Category Pills */}
          <div style={{ backgroundColor: 'white', padding: '1.25rem', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search medicine name, brand, or formula..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
              />
              {searchQuery && (
                <X size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }} onClick={() => setSearchQuery('')} />
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem', scrollbarWidth: 'none' }}>
              {MEDICINE_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '0.4rem 0.85rem',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: selectedCategory === cat ? '#2563eb' : '#e2e8f0',
                    backgroundColor: selectedCategory === cat ? '#2563eb' : '#f8fafc',
                    color: selectedCategory === cat ? 'white' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Cart Bar if item added */}
          {cart.length > 0 && (
            <div style={{ backgroundColor: '#1e293b', color: 'white', padding: '1rem 1.5rem', borderRadius: '0.75rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <strong style={{ fontSize: '1rem', display: 'block' }}>🛒 Cart ({cart.reduce((s, c) => s + c.qty, 0)} items)</strong>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Total: ₹{cartTotal.toFixed(2)}</span>
              </div>
              <button 
                onClick={handleCheckout}
                style={{ padding: '0.65rem 1.25rem', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Place Order Now →
              </button>
            </div>
          )}

          {/* Medicine Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {filteredMedicines.map((med) => (
              <div 
                key={med.id} 
                style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '0.85rem', 
                  border: '1px solid #e2e8f0', 
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justify-content: 'space-between',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '2rem' }}>{med.image}</span>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: '700', padding: '0.2rem 0.5rem', borderRadius: '999px', backgroundColor: med.rxRequired ? '#fee2e2' : '#dcfce7', color: med.rxRequired ? '#991b1b' : '#166534' }}>
                        {med.rxRequired ? 'Rx Required' : 'OTC'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '600' }}>★ {med.rating}</span>
                    </div>
                  </div>

                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', color: '#0f172a' }}>{med.name}</h3>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: '500' }}>By {med.brand}</p>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>{med.description}</p>
                  
                  <div style={{ fontSize: '0.75rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '0.5rem', borderRadius: '0.375rem', marginBottom: '1rem' }}>
                    📦 {med.packSize} • {med.dosage}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  <div>
                    <span style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a' }}>{med.price}</span>
                    <span style={{ display: 'block', fontSize: '0.7rem', color: '#166534', fontWeight: '600' }}>{med.stockStatus}</span>
                  </div>
                  <button 
                    onClick={() => handleAddToCart(med)}
                    style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: '600', fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <ShoppingCart size={14} /> Add
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        /* Order History View */
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #e2e8f0' }}>
          <h3 style={{ margin: '0 0 1rem', fontSize: '1.1rem', color: '#0f172a' }}>Recent Orders</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentOrders.map((ord) => (
              <div key={ord.id} style={{ padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <div>
                    <strong style={{ fontSize: '0.95rem', color: '#0f172a' }}>{ord.id}</strong>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.75rem' }}>{ord.date}</span>
                  </div>
                  <span style={{ padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '700', backgroundColor: ord.status === 'Delivered' ? '#dcfce7' : '#fef3c7', color: ord.status === 'Delivered' ? '#15803d' : '#b45309' }}>
                    {ord.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: '#334155', margin: '0.4rem 0' }}>
                  {ord.items.join(', ')}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px dashed #cbd5e1' }}>
                  <small style={{ color: '#64748b' }}>{ord.pharmacy}</small>
                  <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{ord.total}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const EmergencyView = () => (
    <div style={{ padding: '2rem', backgroundColor: '#fef2f2', borderRadius: '1rem', border: '1px solid #fee2e2' }}>
      <h2 style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: 0 }}>
        <AlertCircle size={28} /> Emergency Contacts
      </h2>
      <p style={{ color: '#991b1b', marginBottom: '2rem' }}>In case of a medical emergency, use the numbers below or go to the nearest hospital immediately.</p>
      
      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.5rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>National Ambulance Line</h3>
            <p style={{ margin: 0, color: '#64748b' }}>24/7 Medical Emergency Response</p>
          </div>
          <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer' }}>
            Call 108 / 911
          </button>
        </div>
      </div>
    </div>
  );

  const AddMemberView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', textAlign: 'center' }}>
      <h2>Add Family Member</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>To add a new member to your account, you can return to profile selection.</p>
      <button 
        onClick={() => navigate('/login')}
        style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' }}
      >
        Go to Profile Selection
      </button>
    </div>
  );

  const ProfileView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem' }}>
      <h2>Manage Profile</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Update your personal and medical information.</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem', alignItems: 'flex-start' }}>
        <div style={{ width: '100px', height: '100px', backgroundColor: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold', margin: '0 auto' }}>
          {userInitials}
        </div>
        <div style={{ flex: '1 1 300px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Full Name</label>
            <input type="text" defaultValue={userName} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Email / Account</label>
            <input type="text" defaultValue={user.email || 'patient@arogyax.com'} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Role</label>
            <input type="text" defaultValue={user.role || 'Patient'} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#f1f5f9', textTransform: 'capitalize' }} />
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
      {/* Mobile Nav Backdrop */}
      {isMobileNavOpen && (
        <div 
          onClick={() => setIsMobileNavOpen(false)}
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', zIndex: 90 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${isMobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
          <img src={arogyaXLogo} alt="ArogyaX" style={{ height: '32px', width: 'auto' }} />
          <button 
            onClick={() => setIsMobileNavOpen(false)}
            className="mobile-close-btn"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'none' }}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <a href="#" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('dashboard'); setIsMobileNavOpen(false); }}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'qr' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('qr'); setIsMobileNavOpen(false); }}>
            <QrCode size={20} />
            <span>QR Code</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'clinic' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('clinic'); setIsMobileNavOpen(false); }}>
            <FileText size={20} />
            <span>Clinic Report</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'lab' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('lab'); setIsMobileNavOpen(false); }}>
            <FlaskConical size={20} />
            <span>Laboratory Report</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'medicine' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('medicine'); setIsMobileNavOpen(false); }}>
            <ShoppingBag size={20} />
            <span>Buy Medicine</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'emergency' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('emergency'); setIsMobileNavOpen(false); }}>
            <AlertCircle size={20} />
            <span>Emergency</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'member' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('member'); setIsMobileNavOpen(false); }}>
            <UserPlus size={20} />
            <span>Add Member</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('profile'); setIsMobileNavOpen(false); }}>
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
          <button 
            className="mobile-hamburger-btn"
            onClick={() => setIsMobileNavOpen(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1e293b' }}
          >
            <Menu size={24} />
          </button>

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
                  >
                    <User size={16} /> Profile
                  </div>
                  <div 
                    onClick={handleLogout}
                    style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#ef4444' }}
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
