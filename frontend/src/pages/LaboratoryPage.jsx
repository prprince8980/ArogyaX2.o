import React, { useState, useRef } from 'react';
import arogyaXLogo from '../assets/arogyax-logo.svg';
import '../styles/pages/LaboratoryPage.css';
import { 
  FiFolderPlus, FiFileText, FiCalendar, FiBarChart2, FiUser, 
  FiBell, FiMenu, FiChevronDown, FiDownload, FiArrowRight, FiPhoneCall, FiX 
} from 'react-icons/fi';

const LaboratoryPage = () => {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('Laboratory');
  const [reports, setReports] = useState([]);
  const [upcomingBooking, setUpcomingBooking] = useState(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [notifications, setNotifications] = useState(2);

  // Hidden File input ref for "Add Report" feature
  const fileInputRef = useRef(null);

  // --- HANDLER FUNCTIONS ---
  
  // Trigger file selection window
  const handleTriggerUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Simulate file upload and push to state dynamically
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const today = new Date().toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    const newReport = {
      id: Date.now(),
      type: 'vitamin',
      name: file.name.length > 30 ? file.name.substring(0, 27) + '...' : file.name,
      lab: 'Self Uploaded Document',
      date: today,
      status: 'Normal',
      statusClass: 'status-normal'
    };

    setReports([newReport, ...reports]);
    alert(`Successfully added "${file.name}" to your report list!`);
  };

  // Simulate report downloads
  const handleDownloadReport = (reportName) => {
    alert(`Downloading report: ${reportName}`);
  };

  // Simulate booking a test instantly
  const handleCreateBooking = () => {
    setUpcomingBooking({
      test: 'Comprehensive Health Panel',
      lab: 'ArogyaX Diagnostic Hub',
      time: 'Tomorrow, 09:30 AM'
    });
  };

  return (
    <div className="dashboard-container">
      {/* HIDDEN FILE INPUT COMPONENT */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".pdf,.jpg,.jpeg,.png" 
        onChange={handleFileUpload}
      />

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem 1rem', borderBottom: '1px solid #e2e8f0', gap: '0.5rem' }}>
          <img src={arogyaXLogo} alt="ArogyaX" style={{ height: '36px', width: 'auto' }} />
        </div>

        <nav className="nav-menu">
          {[
            { id: 'Laboratory', label: 'Laboratory', icon: <FiFolderPlus /> },
            { id: 'Add Report', label: 'Add Report', icon: <FiFolderPlus />, action: handleTriggerUpload },
            { id: 'Report History', label: 'Report History', icon: <FiFileText /> },
            { id: 'Book Lab Test', label: 'Book Lab Test', icon: <FiCalendar />, action: handleCreateBooking },
            { id: 'Analyze', label: 'Analyze', icon: <FiBarChart2 /> },
            { id: 'Manage Profile', label: 'Manage Profile', icon: <FiUser /> }
          ].map((item) => (
            <button 
              key={item.id} 
              className={`nav-item-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                if (item.action) item.action();
              }}
            >
              <span className="nav-icon">{item.icon}</span> {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="help-box">
            <h4>Need Help?</h4>
            <p>Our support team is here to help you 24/7</p>
            <button className="btn-support" onClick={() => setShowSupportModal(true)}>
              <FiPhoneCall /> Contact Support
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* TOP NAVBAR */}
        <header className="top-navbar">
          <div className="left-header">
            <FiMenu className="menu-toggle-icon" />
            <h2>{activeTab}</h2>
          </div>
          <div className="right-header">
            <div className="notification-bell" onClick={() => setNotifications(0)}>
              <FiBell />
              {notifications > 0 && <span className="bell-badge">{notifications}</span>}
            </div>
            <div className="user-profile" onClick={() => setActiveTab('Manage Profile')}>
              <div className="avatar">P</div>
              <div className="user-info">
                <span className="user-name">Prakash Kumar</span>
                <span className="user-role">Patient</span>
              </div>
              <FiChevronDown className="dropdown-arrow" />
            </div>
          </div>
        </header>

        {/* DASHBOARD BODY */}
        <div className="dashboard-body">
          {/* BANNER SECTION */}
          <section className="welcome-banner">
            <div className="banner-text">
              <h1>Laboratory</h1>
              <p>Manage your lab reports, bookings and health insights</p>
            </div>
            <div className="banner-illustration">
              <span className="microscope-art">🔬</span>
            </div>
          </section>

          {/* QUICK ACTION CARDS */}
          <section className="action-cards-grid">
            <div className="action-card purple-card" onClick={handleTriggerUpload}>
              <div className="icon-wrapper"><FiFolderPlus /></div>
              <h3>Add Report</h3>
              <p>Upload your lab report in PDF, JPG or PNG</p>
              <FiArrowRight className="arrow-btn" />
            </div>

            <div className="action-card blue-card" onClick={() => setActiveTab('Report History')}>
              <div className="icon-wrapper"><FiFileText /></div>
              <h3>Report History</h3>
              <p>View and download your previous reports</p>
              <FiArrowRight className="arrow-btn" />
            </div>

            <div className="action-card green-card" onClick={handleCreateBooking}>
              <div className="icon-wrapper"><FiCalendar /></div>
              <h3>Book Lab Test</h3>
              <p>Book a lab test from nearby labs</p>
              <FiArrowRight className="arrow-btn" />
            </div>

            <div className="action-card orange-card" onClick={() => setActiveTab('Analyze')}>
              <div className="icon-wrapper"><FiBarChart2 /></div>
              <h3>Analyze</h3>
              <p>Analyze your reports and track your health</p>
              <FiArrowRight className="arrow-btn" />
            </div>

            <div className="action-card pink-card" onClick={() => setActiveTab('Manage Profile')}>
              <div className="icon-wrapper"><FiUser /></div>
              <h3>Manage Profile</h3>
              <p>Manage your lab profile and preferences</p>
              <FiArrowRight className="arrow-btn" />
            </div>
          </section>

          {/* LOWER DATA SECTION */}
          <section className="data-layout-grid">
            {/* RECENT REPORTS */}
            <div className="data-card recent-reports-section">
              <div className="card-header">
                <h3>Recent Reports</h3>
                <span className="view-all-link" style={{cursor: 'pointer'}} onClick={() => setActiveTab('Report History')}>View All</span>
              </div>
              <div className="reports-list">
                {reports.length === 0 ? (
                  <div style={{ padding: '2.5rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.92rem' }}>
                    No reports available. Click "Add Report" to upload one.
                  </div>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="report-row">
                      <div className="report-left">
                        <div className={`report-icon-bg type-${report.type}`}>
                          {report.type === 'blood' && '🩸'}
                          {report.type === 'lipid' && '🧪'}
                          {report.type === 'thyroid' && '🦋'}
                          {report.type === 'vitamin' && '📄'}
                        </div>
                        <div className="report-details">
                          <h4>{report.name}</h4>
                          <p>{report.lab}</p>
                        </div>
                      </div>
                      <div className="report-right">
                        <span className="report-date">{report.date}</span>
                        <span className={`status-badge ${report.statusClass}`}>{report.status}</span>
                        <button className="download-btn" onClick={() => handleDownloadReport(report.name)}><FiDownload /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <button className="view-history-btn" onClick={() => setActiveTab('Report History')}>
                View Full History <FiArrowRight />
              </button>
            </div>

            {/* UPCOMING BOOKING */}
            <div className="data-card upcoming-booking-section">
              <div className="card-header">
                <h3>Upcoming Booking</h3>
                <span className="view-all-link" style={{cursor: 'pointer'}}>View All</span>
              </div>
              
              {!upcomingBooking ? (
                <div className="empty-booking-box">
                  <div className="calendar-placeholder-icon">
                    <FiCalendar />
                  </div>
                  <h4>No Upcoming Booking</h4>
                  <p>Book a lab test to keep track of your health.</p>
                </div>
              ) : (
                <div className="active-booking-box">
                  <div className="booking-status-indicator">Confirmed</div>
                  <h4>{upcomingBooking.test}</h4>
                  <p className="booking-lab">{upcomingBooking.lab}</p>
                  <p className="booking-time">📅 {upcomingBooking.time}</p>
                  <button className="cancel-booking-btn" onClick={() => setUpcomingBooking(null)}>Cancel Booking</button>
                </div>
              )}
              
              <button className="btn-book-test" onClick={handleCreateBooking}>
                {!upcomingBooking ? 'Book a Lab Test' : 'Schedule Another Test'}
              </button>
            </div>
          </section>

          {/* FOOTER INSIGHT BANNER */}
          <footer className="insight-banner">
            <div className="insight-icon">📋</div>
            <div className="insight-content">
              <h3>Accurate Reports. Better Health.</h3>
              <p>Regular testing helps you stay informed about your health and take action early.</p>
            </div>
          </footer>
        </div>
      </main>

      {/* DYNAMIC MODAL BOX FOR SUPPORT CHAT */}
      {showSupportModal && (
        <div className="modal-backdrop">
          <div className="support-modal">
            <div className="modal-header">
              <h3>Support Helpdesk</h3>
              <button className="close-modal-btn" onClick={() => setShowSupportModal(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <p>Connecting you to a healthcare representative... Our support line is fully active.</p>
              <div className="support-dial-box">
                <FiPhoneCall /> <span>+1 (800) AROGYA-X</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratoryPage;