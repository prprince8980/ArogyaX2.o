import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import { Html5Qrcode } from 'html5-qrcode';
import L from 'leaflet';
import { 
  Menu, Bell, ChevronDown, LayoutDashboard, Users, QrCode, FileText, 
  Activity, User, LogOut, ArrowRight, PlusCircle, Search, Headset,
  Calendar, Clock, Trash2, AlertTriangle, Camera, X, CheckCircle, ChevronRight,
  MapPin
} from 'lucide-react';
import arogyaXLogo from '../assets/arogyax-logo.png';
import "../styles/pages/DashboardPage.css";
import "../styles/pages/ClinicPage.css";

const blankReport = {
  title: '',
  type: 'Diagnosis',
  note: '',
};

function calculateAge(dobString) {
  if (!dobString) return '—';
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

function ClinicPage() {
  const navigate = useNavigate();
  const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('arogax2User') || '{}') : { name: 'Dr. Marcus Hale', role: 'Doctor' };
  
  const userName = user.name || "Dr. Marcus Hale";
  const userInitials = userName.charAt(0).toUpperCase();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [showDropdown, setShowDropdown] = useState(false);
  
  // Modals / Specific Views
  const [showScanner, setShowScanner] = useState(false);
  const [registeredPatients, setRegisteredPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState('');
  const [reportForm, setReportForm] = useState(blankReport);
  const [toast, setToast] = useState('');
  
  const [myReports, setMyReports] = useState([]);

  // QR Scanner states
  const [scannerStep, setScannerStep] = useState('camera'); // 'camera' | 'info' | 'report'
  const [scannedPatient, setScannedPatient] = useState(null);
  const [scannedPatientReports, setScannedPatientReports] = useState([]);
  const [scanReportForm, setScanReportForm] = useState({ title: '', type: 'Diagnosis', notes: '' });
  const [scanSubmitting, setScanSubmitting] = useState(false);
  const [scanError, setScanError] = useState('');
  const [allPatientsList, setAllPatientsList] = useState([]);
  const html5QrRef = useRef(null);

  // Email search states
  const [searchEmail, setSearchEmail] = useState('');
  const [searchEmailResult, setSearchEmailResult] = useState([]);
  const [searchEmailError, setSearchEmailError] = useState('');
  const [searchEmailSubmitting, setSearchEmailSubmitting] = useState(false);

  const [clinicAppointments, setClinicAppointments] = useState([]);
  const [availabilitySlots, setAvailabilitySlots] = useState([]);

  // Hospital association states
  const [associatedHospitals, setAssociatedHospitals] = useState([]);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [showHospitalMenu, setShowHospitalMenu] = useState(false);

  const fetchDoctorHospitals = async () => {
    const doctorEmail = user.email || 'marcus.hale@arogyax.com';
    try {
      const res = await fetch(`http://localhost:5000/api/auth/doctor-hospitals?email=${encodeURIComponent(doctorEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.hospitals && data.hospitals.length > 0) {
          setAssociatedHospitals(data.hospitals);
          setSelectedHospital(data.hospitals[0]);
        }
      }
    } catch (err) {
      console.error("Error fetching associated hospitals:", err);
      const fallbackList = [{
        hospitalId: 'HOSP-2026-904',
        hospitalName: 'AaroGyaX Central Hospital',
        department: 'Cardiology',
        designation: 'Senior Consultant Doctor'
      }];
      setAssociatedHospitals(fallbackList);
      setSelectedHospital(fallbackList[0]);
    }
  };

  useEffect(() => {
    fetchDoctorHospitals();
  }, [user.email]);

  const fetchClinicReports = async () => {
    if (!user.profileId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/auth/clinic-reports-by-clinic?clinicId=${user.profileId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reports) {
          const formatted = data.reports.map(r => ({
            id: r._id,
            patientName: r.patientName,
            title: r.title,
            date: r.date,
            type: r.type,
            notes: r.notes
          }));
          setMyReports(formatted);
        }
      }
    } catch (err) {
      console.error("Error fetching clinic reports history:", err);
    }
  };

  const fetchClinicAppointments = async () => {
    if (!user.profileId) return;
    try {
      const res = await fetch(`http://localhost:5002/api/clinic/appointments?profileId=${user.profileId}&role=clinic`);
      if (res.ok) {
        const data = await res.json();
        setClinicAppointments(data.appointments || []);
      }
    } catch (err) {
      console.error("Error fetching clinic appointments:", err);
    }
  };

  const fetchClinicAvailability = async () => {
    if (!user.profileId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/auth/member/${user.profileId}?role=clinic`);
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setAvailabilitySlots(data.profile.availabilitySlots || []);
        }
      }
    } catch (err) {
      console.error("Error fetching availability slots:", err);
    }
  };

  const fetchRegisteredPatients = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/auth/patients');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.patients) {
          const formatted = data.patients.map(p => ({
            id: p.profile?.patientId || p._id,
            dbId: p._id,
            name: p.name,
            age: p.profile?.dob ? calculateAge(p.profile.dob) : '—',
            gender: p.profile?.gender || '—',
            lastVisit: '—',
          }));
          setRegisteredPatients(formatted);
          if (formatted.length > 0) {
            setActivePatientId(formatted[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching registered patients:", err);
    }
  };

  useEffect(() => {
    if (user.profileId) {
      fetchClinicAppointments();
      fetchClinicAvailability();
      fetchClinicReports();
      fetchRegisteredPatients();
    }
  }, [user.profileId]);



  useEffect(() => {
    if (!user.profileId) return;
    const socket = io('http://localhost:5002');
    
    socket.emit('join_room', `clinic_${user.profileId}`);
    
    socket.on('appointment_booked', (data) => {
      fetchClinicAppointments();
      setToast(`🔔 Real-Time Alert: New appointment booked by ${data.appointment.patientName} for ${data.appointment.slot} on ${data.appointment.date}!`);
      setTimeout(() => setToast(''), 5500);
    });

    socket.on('slot_cancelled', (data) => {
      fetchClinicAppointments();
    });

    return () => {
      socket.disconnect();
    };
  }, [user.profileId]);

  const handleLogout = () => {
    localStorage.removeItem('arogax2User');
    navigate('/login');
  };

  // --- QR Scanner logic ---
  const fetchScannedPatientReports = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/auth/clinic-reports?patientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reports) {
          setScannedPatientReports(data.reports);
        }
      }
    } catch (err) {
      console.error("Error fetching scanned patient reports:", err);
    }
  };

  const startQrScanner = useCallback(() => {
    setScannerStep('camera');
    setScanError('');
    setTimeout(() => {
      const qrElement = document.getElementById('clinic-qr-reader');
      if (!qrElement) return;
      const scanner = new Html5Qrcode('clinic-qr-reader');
      html5QrRef.current = scanner;
      scanner.start(
        { facingMode: 'environment' },
        { fps: 12, qrbox: { width: 240, height: 240 } },
        async (decodedText) => {
          // Stop camera immediately after a successful scan
          try { await scanner.stop(); } catch (_) {}
          html5QrRef.current = null;

          // Parse QR payload
          let payload = {};
          try { payload = JSON.parse(decodedText); } catch (_) { payload = { name: decodedText }; }

          // Try to enrich with live patient data from backend
          if (payload.patientId) {
            try {
              const res = await fetch(`http://localhost:5000/api/auth/patient-by-id?patientId=${payload.patientId}`);
              if (res.ok) {
                const data = await res.json();
                if (data.success && data.patient) {
                  const p = data.patient;
                  payload = {
                    ...payload,
                    name: p.fullName || payload.name,
                    dob: p.dob ? new Date(p.dob).toLocaleDateString() : payload.dob,
                    gender: p.gender || payload.gender,
                    bloodType: p.bloodGroup || payload.bloodType,
                    allergies: p.allergies || payload.allergies,
                    chronicIllnesses: Array.isArray(p.chronicConditions) ? p.chronicConditions.join(', ') : payload.chronicIllnesses,
                    currentMedications: p.currentMedications || '',
                    emergencyContact: p.emergencyContactName ? `${p.emergencyContactName} (${p.emergencyRelationship}) — ${p.emergencyPhone}` : payload.emergencyContact,
                    address: p.address || payload.address,
                    email: data.account?.email || payload.email,
                  };
                }
              }
            } catch (_) { /* Use payload from QR as fallback */ }
          }

          setScannedPatient(payload);
          setScanReportForm({ title: '', type: 'Diagnosis', notes: '' });
          setScannerStep('info');
          setToast(`✅ QR Scanned: ${payload.name || 'Patient'} loaded.`);
          setTimeout(() => setToast(''), 4000);
          fetchScannedPatientReports(payload.patientId || payload.id);
        },
        (errorMsg) => { /* ignore per-frame errors */ }
      ).catch((err) => {
        setScanError('Camera not accessible. Please allow camera permission.');
        console.error('QR scanner error:', err);
      });
    }, 300);
  }, []);

  const stopQrScanner = useCallback(async () => {
    if (html5QrRef.current) {
      try { await html5QrRef.current.stop(); } catch (_) {}
      html5QrRef.current = null;
    }
  }, []);

  const handleOpenScanner = () => {
    setShowScanner(true);
    setScannerStep('camera');
    setScannedPatient(null);
    setScannedPatientReports([]);
    setScanError('');
    setSearchEmail('');
    setSearchEmailResult([]);
    setSearchEmailError('');
  };

  const handleSimulatePatientSelect = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/auth/patient-by-id?patientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.patient) {
          const p = data.patient;
          const payload = {
            patientId: p.id || p._id,
            name: p.fullName,
            dob: p.dob ? new Date(p.dob).toLocaleDateString() : '',
            gender: p.gender,
            bloodType: p.bloodGroup,
            allergies: p.allergies,
            chronicIllnesses: Array.isArray(p.chronicConditions) ? p.chronicConditions.join(', ') : p.chronicConditions || '',
            currentMedications: p.currentMedications || '',
            emergencyContact: p.emergencyContactName ? `${p.emergencyContactName} (${p.emergencyRelationship}) — ${p.emergencyPhone}` : '',
            address: p.address,
            email: data.account?.email || '',
          };
          setScannedPatient(payload);
          setScanReportForm({ title: '', type: 'Diagnosis', notes: '' });
          setScannerStep('info');
          setToast(`✅ Simulated Scan: ${payload.name} loaded.`);
          setTimeout(() => setToast(''), 4000);
          fetchScannedPatientReports(payload.patientId);
        }
      }
    } catch (err) {
      console.error("Simulation error:", err);
      setScanError("Failed to simulate scanning.");
    }
  };

  const handleEmailSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail) return;
    setSearchEmailSubmitting(true);
    setSearchEmailError('');
    setSearchEmailResult([]);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/patients-by-email?email=${encodeURIComponent(searchEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          if (!data.exists) {
            setSearchEmailError('No account found for this email address.');
          } else if (data.patients.length === 0) {
            setSearchEmailError('Account found, but it has no patient profiles.');
          } else {
            setSearchEmailResult(data.patients);
          }
        } else {
          setSearchEmailError(data.message || 'Search failed.');
        }
      } else {
        setSearchEmailError('Failed to connect to authentication database.');
      }
    } catch (err) {
      console.error("Email search error:", err);
      setSearchEmailError('Failed to search email.');
    } finally {
      setSearchEmailSubmitting(false);
    }
  };

  const handleSelectEmailPatient = (p) => {
    const payload = {
      patientId: p.profile._id || p.memberId,
      name: p.profile.fullName || p.name,
      dob: p.profile.dob ? new Date(p.profile.dob).toLocaleDateString() : '',
      gender: p.profile.gender,
      bloodType: p.profile.bloodGroup,
      allergies: p.profile.allergies,
      chronicIllnesses: Array.isArray(p.profile.chronicConditions) ? p.profile.chronicConditions.join(', ') : p.profile.chronicConditions || '',
      currentMedications: p.profile.currentMedications || '',
      emergencyContact: p.profile.emergencyContactName ? `${p.profile.emergencyContactName} (${p.profile.emergencyRelationship}) — ${p.profile.emergencyPhone}` : '',
      address: p.profile.address,
      email: searchEmail,
    };
    setScannedPatient(payload);
    setScanReportForm({ title: '', type: 'Diagnosis', notes: '' });
    setScannerStep('info');
    setToast(`✅ Patient Loaded: ${payload.name}`);
    setTimeout(() => setToast(''), 4000);
    fetchScannedPatientReports(payload.patientId);
  };

  const handleCloseScanner = async () => {
    await stopQrScanner();
    setShowScanner(false);
    setScannedPatient(null);
    setScannedPatientReports([]);
    setScannerStep('camera');
    setScanError('');
    setSearchEmail('');
    setSearchEmailResult([]);
    setSearchEmailError('');
  };

  const handleScanReportSubmit = async (e) => {
    e.preventDefault();
    if (!scannedPatient || !scanReportForm.title) return;
    setScanSubmitting(true);
    try {
      const res = await fetch('http://localhost:5000/api/auth/clinic-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: scannedPatient.patientId || scannedPatient.id || 'unknown',
          patientName: scannedPatient.name,
          clinicId: user.profileId || 'clinic',
          clinicName: user.name || 'Clinic',
          doctorName: userName,
          title: scanReportForm.title,
          type: scanReportForm.type,
          notes: scanReportForm.notes,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast(`📋 Report "${scanReportForm.title}" saved for ${scannedPatient.name}.`);
        setTimeout(() => setToast(''), 4000);
        fetchClinicReports();
        await handleCloseScanner();
      } else {
        setScanError(data.message || 'Failed to save report.');
      }
    } catch (err) {
      setScanError('Could not connect to server. Report not saved.');
    } finally {
      setScanSubmitting(false);
    }
  };

  const saveReport = async (event) => {
    event.preventDefault();
    const activePatient = patientsData.find(p => p.id === activePatientId) || patientsData[0];
    try {
      const res = await fetch('http://localhost:5000/api/auth/clinic-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: activePatient.id,
          patientName: activePatient.name,
          clinicId: user.profileId || 'clinic',
          clinicName: user.name || 'Clinic',
          doctorName: userName,
          title: reportForm.title,
          type: reportForm.type,
          notes: reportForm.note,
        }),
      });
      if (res.ok) {
        setReportForm(blankReport);
        setToast(`${reportForm.type} saved to ${activePatient.name}'s profile.`);
        setTimeout(() => setToast(''), 3000);
        fetchClinicReports();
        setActiveTab('dashboard');
      } else {
        alert("Failed to save report to backend");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving report to backend");
    }
  };

  const DashboardOverview = () => (
    <>
      <div className="welcome-section">
        <h1 className="welcome-title">Welcome back, {userName}</h1>
        <p className="welcome-subtitle">Here is your clinic overview</p>
      </div>

      {toast && (
        <div style={{ padding: '1rem', backgroundColor: '#dcfce7', color: '#166534', borderRadius: '0.5rem', marginBottom: '1.5rem', border: '1px solid #bbf7d0' }}>
          {toast}
        </div>
      )}

      <div className="features-grid">
        <div className="feature-card card-clinic" onClick={() => setActiveTab('patients')}>
          <div className="card-icon"><Users size={24} /></div>
          <h3>Patient Directory</h3>
          <p>View and manage your patients</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>
        
        <div className="feature-card card-qr" onClick={handleOpenScanner}>
          <div className="card-icon"><QrCode size={24} /></div>
          <h3>Scan QR</h3>
          <p>Scan a patient's health QR code</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-lab" onClick={() => setActiveTab('report')}>
          <div className="card-icon"><PlusCircle size={24} /></div>
          <h3>Write Report</h3>
          <p>Add a diagnosis or prescription</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-lab" onClick={() => setActiveTab('appointments')}>
          <div className="card-icon"><Activity size={24} /></div>
          <h3>Appointments & Slots</h3>
          <p>Configure slots and manage bookings</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-emergency" onClick={() => setActiveTab('analytics')}>
          <div className="card-icon"><Activity size={24} /></div>
          <h3>Analytics</h3>
          <p>View clinic volume and stats</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>

        <div className="feature-card card-profile" onClick={() => setActiveTab('profile')}>
          <div className="card-icon"><User size={24} /></div>
          <h3>Manage Profile</h3>
          <p>Update your doctor profile</p>
          <ArrowRight className="card-arrow" size={20} />
        </div>
      </div>

      <div className="recent-activity-section">
        <div className="activity-header">
          <h2>Recent Reports Issued</h2>
          <a href="#" className="view-all">View All</a>
        </div>
        
        <div className="activity-list">
          <div className="activity-table-header">
            <span>Report Details</span>
            <span>Date</span>
          </div>
          {myReports.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px dashed #e2e8f0', fontSize: '0.9rem' }}>
              No reports issued recently.
            </div>
          ) : (
            myReports.slice(0, 3).map(report => (
              <div className="activity-item" key={report.id}>
                <div className="activity-info">
                  <div className="activity-icon icon-clinic"><FileText size={16} /></div>
                  <span>{report.title} for {report.patientName}</span>
                </div>
                <span className="activity-date">{report.date}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  const PatientsView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem' }}>
      <h2>Patient Directory</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Select a patient to view details or write a report.</p>
      
      {registeredPatients.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '1rem', border: '1px dashed #e2e8f0' }}>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>No registered patients found in the system database.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {registeredPatients.map(p => (
            <div 
              key={p.id} 
              style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem',
                backgroundColor: activePatientId === p.id ? '#eff6ff' : 'white',
                borderColor: activePatientId === p.id ? '#3b82f6' : '#e2e8f0',
                cursor: 'pointer'
              }}
              onClick={() => setActivePatientId(p.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '40px', height: '40px', backgroundColor: '#e0f2fe', color: '#3b82f6', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {(p.name || 'P').charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: '500' }}>{p.name} <span style={{ color: '#64748b', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{p.id}</span></div>
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Age: {p.age} • Gender: {p.gender}</div>
                </div>
              </div>
              {activePatientId === p.id && (
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveTab('report'); }}
                  style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer' }}
                >
                  Write Report
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const WriteReportView = () => {
    const activePatient = registeredPatients.find(p => p.id === activePatientId) || registeredPatients[0];
    
    if (!activePatient) {
      return (
        <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', textAlign: 'center' }}>
          <h2>Write Report</h2>
          <div style={{ padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '1rem', border: '1px dashed #e2e8f0', color: '#64748b', marginTop: '2rem' }}>
            Please select a patient from the <span style={{ color: '#2563eb', cursor: 'pointer', fontWeight: 600 }} onClick={() => setActiveTab('patients')}>Patient Directory</span> first to write a report.
          </div>
        </div>
      );
    }

    return (
      <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem' }}>
        <h2>Write Report</h2>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Writing report for <strong>{activePatient.name}</strong> ({activePatient.id}). To change patient, go to the Directory.</p>
        
        <form onSubmit={saveReport} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Report Title</label>
            <input 
              required
              value={reportForm.title}
              onChange={(e) => setReportForm({...reportForm, title: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }} 
              placeholder="e.g. Annual Checkup Note"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Type</label>
            <select 
              value={reportForm.type}
              onChange={(e) => setReportForm({...reportForm, type: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
            >
              <option>Diagnosis</option>
              <option>Clinical note</option>
              <option>Prescription</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.5rem' }}>Clinical Notes</label>
            <textarea 
              required
              value={reportForm.note}
              onChange={(e) => setReportForm({...reportForm, note: e.target.value})}
              style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minHeight: '150px', resize: 'vertical' }} 
              placeholder="Enter detailed observations and instructions..."
            />
          </div>
          <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', alignSelf: 'flex-start' }}>
            Submit Report
          </button>
        </form>
      </div>
    );
  };

  const AnalyticsView = () => (
    <div style={{ padding: '2rem', backgroundColor: 'white', borderRadius: '1rem', textAlign: 'center' }}>
      <h2>Clinic Analytics</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>Overview of today's volume and earnings.</p>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ padding: '2rem', backgroundColor: '#f1f5f9', borderRadius: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>32</div>
          <div style={{ color: '#64748b' }}>Patients Today</div>
        </div>
        <div style={{ padding: '2rem', backgroundColor: '#f1f5f9', borderRadius: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>$3,840</div>
          <div style={{ color: '#64748b' }}>Earnings Today</div>
        </div>
        <div style={{ padding: '2rem', backgroundColor: '#f1f5f9', borderRadius: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#8b5cf6' }}>10:12 AM</div>
          <div style={{ color: '#64748b' }}>Peak Time</div>
        </div>
      </div>
      
      <div style={{ height: '200px', backgroundColor: '#f8fafc', borderRadius: '1rem', border: '1px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
        Detailed charts coming soon
      </div>
    </div>
  );

  const ClinicLocationView = () => {
    const [coords, setCoords] = useState({ lat: 0, lng: 0 });
    const [address, setAddress] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [alertMsg, setAlertMsg] = useState({ type: '', text: '' });
    
    const mapRef = useRef(null);
    const markerRef = useRef(null);
    const mapContainerId = 'clinic-location-map';

    const showAlert = (type, text) => {
      setAlertMsg({ type, text });
      setTimeout(() => setAlertMsg({ type: '', text: '' }), 5000);
    };

    useEffect(() => {
      const loadSavedLocation = async () => {
        try {
          const res = await fetch('http://localhost:5002/api/clinic/location', {
            headers: {
              'Authorization': `Bearer ${user.token || 'mock-token'}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.location) {
              const { latitude, longitude, address: savedAddress } = data.location;
              if (latitude !== 0 || longitude !== 0) {
                setCoords({ lat: latitude, lng: longitude });
                setAddress(savedAddress || '');
                setIsSaved(true);
              } else {
                useDefaultLocation();
              }
            }
          } else {
            useDefaultLocation();
          }
        } catch (error) {
          console.error('Failed to load clinic location:', error);
          useDefaultLocation();
        }
      };

      const useDefaultLocation = () => {
        setCoords({ lat: 12.9716, lng: 77.5946 }); // Default center: Bangalore
        setAddress('');
      };

      loadSavedLocation();
    }, []);

    useEffect(() => {
      const container = document.getElementById(mapContainerId);
      if (!container || coords.lat === 0) return;

      if (!mapRef.current) {
        mapRef.current = L.map(mapContainerId).setView([coords.lat, coords.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);

        mapRef.current.on('click', async (e) => {
          const { lat, lng } = e.latlng;
          updateMarkerAndCoords(lat, lng);
          
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) {
                setAddress(data.display_name);
              }
            }
          } catch (err) {
            console.error('Reverse geocoding error:', err);
          }
        });
      } else {
        mapRef.current.setView([coords.lat, coords.lng]);
      }

      if (!markerRef.current) {
        markerRef.current = L.marker([coords.lat, coords.lng], {
          draggable: true,
          icon: L.divIcon({
            className: 'clinic-marker-red',
            html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #ef4444; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">H</div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }).addTo(mapRef.current);

        markerRef.current.on('dragend', async (e) => {
          const { lat, lng } = e.target.getLatLng();
          setCoords({ lat, lng });
          
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) {
                setAddress(data.display_name);
              }
            }
          } catch (err) {
            console.error('Reverse geocoding error:', err);
          }
        });
      } else {
        markerRef.current.setLatLng([coords.lat, coords.lng]);
      }

      return () => {};
    }, [coords.lat, coords.lng]);

    useEffect(() => {
      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
          markerRef.current = null;
        }
      };
    }, []);

    const updateMarkerAndCoords = (lat, lng) => {
      setCoords({ lat, lng });
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      }
      if (mapRef.current) {
        mapRef.current.setView([lat, lng]);
      }
    };

    const handleUseCurrentLocation = () => {
      if (!navigator.geolocation) {
        showAlert('error', 'Geolocation is not supported by your browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          updateMarkerAndCoords(latitude, longitude);
          showAlert('success', 'Located current coordinates successfully!');

          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            if (res.ok) {
              const data = await res.json();
              if (data.display_name) {
                setAddress(data.display_name);
              }
            }
          } catch (err) {
            console.error(err);
          }
        },
        (error) => {
          console.error(error);
          showAlert('error', 'Location permission denied or GPS unavailable. Please enable location permissions in browser settings.');
        }
      );
    };

    const handleSearchAddress = async (e) => {
      e.preventDefault();
      if (!searchQuery.trim()) return;

      setSearching(true);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            updateMarkerAndCoords(lat, lon);
            setAddress(data[0].display_name);
            showAlert('success', `Found address: ${data[0].display_name}`);
          } else {
            showAlert('error', 'Address not found. Please try a different query.');
          }
        } else {
          showAlert('error', 'Geocoding service unavailable.');
        }
      } catch (error) {
        console.error('Geocoding search error:', error);
        showAlert('error', 'Network error while searching address.');
      } finally {
        setSearching(false);
      }
    };

    const handleSaveLocation = async () => {
      if (coords.lat === 0 || coords.lng === 0 || !address.trim()) {
        showAlert('error', 'Please place a marker on the map and enter/search an address.');
        return;
      }

      setSaving(true);
      try {
        const res = await fetch('http://localhost:5000/api/auth/clinic/location', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            clinicId: user.profileId,
            latitude: coords.lat,
            longitude: coords.lng,
            clinicAddress: address
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setIsSaved(true);
          showAlert('success', 'Clinic location saved successfully!');
        } else {
          showAlert('error', data.message || 'Failed to save clinic location.');
        }
      } catch (error) {
        console.error('Error saving clinic location:', error);
        showAlert('error', 'Could not connect to Clinic location backend. Make sure the server is running.');
      } finally {
        setSaving(false);
      }
    };


    return (
      <div className="clinic-location-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="view-header">
          <h2>📍 Clinic Location on Map</h2>
          <p className="subtitle">Configure and update the precise geographical location of your clinic so patients can find you nearby.</p>
        </div>

        {alertMsg.text && (
          <div className={`toast alert-${alertMsg.type}`} style={{
            padding: '1rem 1.25rem',
            borderRadius: '0.5rem',
            backgroundColor: alertMsg.type === 'success' ? '#f0fdf4' : '#fef2f2',
            color: alertMsg.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${alertMsg.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.3s ease'
          }}>
            {alertMsg.type === 'success' ? '✅' : '❌'} {alertMsg.text}
          </div>
        )}

        <div className="location-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>
          {/* Map Panel */}
          <div className="map-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <form onSubmit={handleSearchAddress} className="search-form" style={{ display: 'flex', gap: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="Search address, city, or zip code..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}
              />
              <button 
                type="submit" 
                disabled={searching}
                style={{ padding: '0.75rem 1.25rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}
              >
                {searching ? 'Searching...' : '🔍 Search'}
              </button>
              <button 
                type="button" 
                onClick={handleUseCurrentLocation}
                style={{ padding: '0.75rem 1rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '0.5rem', fontWeight: 600, cursor: 'pointer' }}
              >
                📍 GPS Location
              </button>
            </form>

            <div 
              id={mapContainerId} 
              style={{ 
                height: '450px', 
                width: '100%', 
                borderRadius: '0.75rem', 
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                zIndex: 1
              }} 
            />
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
              * Click anywhere on the map or drag the marker to position your clinic location.
            </p>
          </div>

          {/* Details panel */}
          <div className="details-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)' }}>
            <h3>Location Coordinates</h3>
            <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.5rem' }}>These parameters define your geographic point on patient searches.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Saved Address</label>
                <textarea 
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Address is populated automatically when clicking map, geocoding, or using GPS."
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Latitude</label>
                <input 
                  type="text" 
                  value={coords.lat !== 0 ? coords.lat.toFixed(6) : '—'} 
                  readOnly 
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.9rem', color: '#475569' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>Longitude</label>
                <input 
                  type="text" 
                  value={coords.lng !== 0 ? coords.lng.toFixed(6) : '—'} 
                  readOnly 
                  style={{ width: '100%', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0', backgroundColor: '#f8fafc', fontSize: '0.9rem', color: '#475569' }}
                />
              </div>
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                type="button" 
                onClick={handleSaveLocation}
                disabled={saving || coords.lat === 0}
                style={{ 
                  width: '100%', 
                  padding: '0.85rem', 
                  backgroundColor: coords.lat === 0 ? '#94a3b8' : (isSaved ? '#10b981' : '#2563eb'), 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.5rem', 
                  fontWeight: 600, 
                  cursor: coords.lat === 0 || saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: coords.lat === 0 ? 'none' : `0 4px 6px ${isSaved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(37, 99, 235, 0.2)'}`
                }}
              >
                {saving ? (
                  <>Saving...</>
                ) : (
                  <>{isSaved ? '✏️ Update Location' : '💾 Save Location'}</>
                )}
              </button>
              
              {isSaved && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: '#166534', fontSize: '0.78rem', fontWeight: 600 }}>
                  <span>✓</span> Location active on Map search
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AppointmentsView = () => {
    // State for creating new slot
    const [dayType, setDayType] = useState('everyday');
    const [customDays, setCustomDays] = useState([]);
    const [time, setTime] = useState('09:00 - 10:00');
    const [saving, setSaving] = useState(false);

    const toggleCustomDay = (day) => {
      setCustomDays(prev => 
        prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
      );
    };

    const formatDateString = (dateStr) => {
      try {
        const dateObj = new Date(dateStr + 'T00:00:00');
        return dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    const handleAddSlotRule = async (e) => {
      e.preventDefault();
      if (dayType === 'custom' && customDays.length === 0) {
        alert("Please select at least one day for custom availability.");
        return;
      }

      // Check duplicate
      const isDuplicate = availabilitySlots.some(s => 
        s.time === time && 
        s.dayType === dayType &&
        (dayType !== 'custom' || JSON.stringify(s.customDays?.sort()) === JSON.stringify(customDays.sort()))
      );
      if (isDuplicate) {
        alert("This slot rule already exists.");
        return;
      }

      setSaving(true);
      const newRule = {
        dayType,
        customDays: dayType === 'custom' ? customDays : [],
        time
      };

      const updatedSlots = [...availabilitySlots, newRule];
      try {
        const res = await fetch('http://localhost:5002/api/clinic/doctor/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId: user.profileId, availabilitySlots: updatedSlots })
        });
        if (res.ok) {
          setAvailabilitySlots(updatedSlots);
          setToast("Availability slot rule added successfully.");
          setTimeout(() => setToast(''), 3000);
          setCustomDays([]);
        } else {
          alert("Failed to save slot rule.");
        }
      } catch (err) {
        console.error("Save slot error:", err);
      } finally {
        setSaving(false);
      }
    };

    const handleDeleteSlotRule = async (idxToDelete) => {
      const updatedSlots = availabilitySlots.filter((_, idx) => idx !== idxToDelete);
      try {
        const res = await fetch('http://localhost:5002/api/clinic/doctor/slots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId: user.profileId, availabilitySlots: updatedSlots })
        });
        if (res.ok) {
          setAvailabilitySlots(updatedSlots);
          setToast("Slot rule deleted.");
          setTimeout(() => setToast(''), 3000);
        } else {
          alert("Failed to delete slot rule.");
        }
      } catch (err) {
        console.error("Delete slot error:", err);
      }
    };

    const handleCancelSlotForDate = async (date, slot, slotAppointments) => {
      const activeBookings = slotAppointments.filter(app => app.status === 'booked');
      if (activeBookings.length > 0) {
        const confirmMsg = `⚠️ WARNING: There are ${activeBookings.length} active patient booking(s) in this slot (${slot} on ${date}).\n\nCancelling this slot will automatically cancel all these bookings and send emergency real-time alerts to the patients.\n\nAre you sure you want to cancel this slot?`;
        if (!window.confirm(confirmMsg)) {
          return;
        }
      } else {
        if (!window.confirm(`Are you sure you want to cancel the ${slot} slot on ${date}?`)) {
          return;
        }
      }

      try {
        const res = await fetch('http://localhost:5002/api/clinic/doctor/cancel-slot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clinicId: user.profileId, date, slot })
        });
        if (res.ok) {
          setToast(`Cancelled slot ${slot} on ${date}. Patients notified!`);
          fetchClinicAppointments();
          setTimeout(() => setToast(''), 5000);
        } else {
          alert("Failed to cancel slot.");
        }
      } catch (err) {
        console.error("Cancel slot error:", err);
      }
    };

    // Group appointments by date and slot
    const groupedAppointments = useMemo(() => {
      const groups = {};
      clinicAppointments.forEach(app => {
        const key = `${app.date}___${app.slot}`;
        if (!groups[key]) {
          groups[key] = {
            date: app.date,
            slot: app.slot,
            appointments: []
          };
        }
        groups[key].appointments.push(app);
      });
      // Sort groups by date descending, then slot ascending
      return Object.values(groups).sort((a, b) => {
        if (a.date !== b.date) return new Date(b.date) - new Date(a.date);
        return a.slot.localeCompare(b.slot);
      });
    }, [clinicAppointments]);

    const timeOptions = [
      '08:00 - 09:00',
      '09:00 - 10:00',
      '10:00 - 11:00',
      '11:00 - 12:00',
      '12:00 - 13:00',
      '13:00 - 14:00',
      '14:00 - 15:00',
      '15:00 - 16:00',
      '16:00 - 17:00',
      '17:00 - 18:00',
      '18:00 - 19:00',
      '19:00 - 20:00'
    ];

    return (
      <div className="appointments-schedule-container">
        <div className="view-header">
          <h2>Appointments & Schedule</h2>
          <p className="subtitle">Configure availability rules and manage scheduled patient bookings in real-time.</p>
        </div>

        <div className="appointments-grid">
          {/* Left Column: Configure Slots */}
          <div className="left-panel">
            <div className="dashboard-card card-form">
              <h3>
                <Clock size={18} />
                Availability Setup
              </h3>
              <p className="card-desc">Configure recurring 1-hour slots when you are available to see patients.</p>
              
              <form onSubmit={handleAddSlotRule} className="slot-form">
                <div className="form-group">
                  <label>Occurrence Pattern</label>
                  <select 
                    value={dayType} 
                    onChange={e => setDayType(e.target.value)}
                    className="form-select"
                  >
                    <option value="everyday">Every day</option>
                    <option value="weekday">Weekdays (Mon-Fri)</option>
                    <option value="weekend">Weekends (Sat-Sun)</option>
                    <option value="custom">Custom Days</option>
                  </select>
                </div>

                {dayType === 'custom' && (
                  <div className="form-group custom-days-group">
                    <label>Select Available Days</label>
                    <div className="checkbox-grid">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <label key={day} className="checkbox-label">
                          <input 
                            type="checkbox" 
                            checked={customDays.includes(day)} 
                            onChange={() => toggleCustomDay(day)}
                          />
                          <span>{day.substring(0, 3)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Choose 1-Hour Slot</label>
                  <select 
                    value={time} 
                    onChange={e => setTime(e.target.value)}
                    className="form-select"
                  >
                    {timeOptions.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="primary-button add-rule-btn" disabled={saving}>
                  <Clock size={16} />
                  {saving ? 'Saving...' : 'Add Slot Rule'}
                </button>
              </form>
            </div>

            <div className="dashboard-card card-rules-list">
              <h3>
                <Calendar size={18} />
                Active Slot Rules
              </h3>
              <p className="card-desc">Active patterns generating available bookable slots on the patient app.</p>
              
              <div className="rules-list">
                {availabilitySlots.map((rule, idx) => (
                  <div key={idx} className="rule-item">
                    <div className="rule-info">
                      <div className="rule-time">
                        <Clock size={14} className="icon" />
                        <strong>{rule.time}</strong>
                      </div>
                      <div className="rule-pattern">
                        <span className="badge-pattern" data-type={rule.dayType}>
                          {rule.dayType === 'custom' ? rule.customDays.join(', ') : rule.dayType}
                        </span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDeleteSlotRule(idx)}
                      className="delete-rule-btn"
                      title="Remove Rule"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                {availabilitySlots.length === 0 && (
                  <p className="muted empty-rules">No slot availability rules configured yet. Setup a rule above to open bookings.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Manage Bookings */}
          <div className="right-panel">
            <div className="dashboard-card card-bookings-board">
              <div className="board-header">
                <h3>Patient Bookings Board</h3>
                <span className="live-pill">Live Updates</span>
              </div>
              <p className="card-desc">Real-time timeline of upcoming patient appointments. Cancel specific slot dates to close booking availability.</p>

              <div className="timeline-container">
                {groupedAppointments.map(group => {
                  const activeCount = group.appointments.filter(a => a.status === 'booked').length;
                  const isSlotCancelled = group.appointments.every(a => a.status === 'cancelled') && 
                                          group.appointments.some(a => a.cancellationReason === 'Cancelled by doctor');
                  
                  return (
                    <div 
                      key={`${group.date}___${group.slot}`} 
                      className={`timeline-slot-card ${isSlotCancelled ? 'cancelled-slot' : ''}`}
                    >
                      <div className="slot-card-header">
                        <div className="slot-title">
                          <Calendar size={16} className="icon" />
                          <span>{formatDateString(group.date)}</span>
                          <span className="bullet">•</span>
                          <Clock size={14} className="icon" />
                          <span>{group.slot}</span>
                          {isSlotCancelled ? (
                            <span className="badge-status cancelled-text">Cancelled Slot</span>
                          ) : (
                            <span className="badge-count">{activeCount} booked</span>
                          )}
                        </div>
                        {!isSlotCancelled && (
                          <button 
                            type="button"
                            onClick={() => handleCancelSlotForDate(group.date, group.slot, group.appointments)}
                            className="cancel-slot-btn"
                          >
                            <AlertTriangle size={14} />
                            Cancel Slot
                          </button>
                        )}
                      </div>
                      
                      <div className="slot-appointments">
                        {group.appointments.map(app => {
                          const isCancelled = app.status === 'cancelled';
                          return (
                            <div key={app._id} className={`appointment-patient-row ${isCancelled ? 'patient-cancelled' : ''}`}>
                              <div className="patient-avatar">
                                {app.patientName.charAt(0).toUpperCase()}
                              </div>
                              <div className="patient-main-info">
                                <div className="patient-name-row">
                                  <strong>{app.patientName}</strong>
                                  <span className="patient-relationship-tag">
                                    {app.patientId.includes('FAM') ? 'Family Member' : 'Self'}
                                  </span>
                                </div>
                                <div className="patient-sub-details">
                                  <span>Age: {app.age || 'N/A'}</span>
                                  <span className="bullet">•</span>
                                  <span>Gender: {app.gender || 'N/A'}</span>
                                </div>
                                {isCancelled && (
                                  <div className="cancel-reason">
                                    Reason: {app.cancellationReason || 'Cancelled by doctor'}
                                  </div>
                                )}
                              </div>
                              <div className="patient-status-col">
                                <span className={`status-badge ${app.status}`}>
                                  {app.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                {groupedAppointments.length === 0 && (
                  <div className="empty-bookings">
                    <span className="empty-icon">📅</span>
                    <h4>No Appointments Scheduled</h4>
                    <p className="muted">Patients booking slots at your clinic will appear here in real-time.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'patients': return <PatientsView />;
      case 'report': return <WriteReportView />;
      case 'analytics': return <AnalyticsView />;
      case 'profile': return <ProfileView />;
      case 'appointments': return <AppointmentsView />;
      case 'location': return <ClinicLocationView />;
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
          <a href="#" className={`nav-item ${activeTab === 'patients' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('patients'); }}>
            <Users size={20} />
            <span>Patient Directory</span>
          </a>
          <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); handleOpenScanner(); }}>
            <QrCode size={20} />
            <span>Scan QR</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'report' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('report'); }}>
            <PlusCircle size={20} />
            <span>Write Report</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'appointments' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('appointments'); }}>
            <Activity size={20} />
            <span>Appointments & Slots</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('analytics'); }}>
            <Activity size={20} />
            <span>Analytics</span>
          </a>
          <a href="#" className={`nav-item ${activeTab === 'location' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('location'); }}>
            <MapPin size={20} />
            <span>Clinic Location</span>
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
          {selectedHospital && (
            <div style={{ position: 'relative', marginRight: 'auto' }}>
              <div
                onClick={() => setShowHospitalMenu(!showHospitalMenu)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem',
                  background: 'linear-gradient(135deg, #e0f2fe 0%, #f0f9ff 100%)',
                  border: '1px solid #bae6fd',
                  padding: '0.45rem 0.95rem',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: '0 2px 6px rgba(2, 132, 199, 0.08)',
                  transition: 'all 0.2s ease'
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>🏥</span>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    {selectedHospital.hospitalName}
                    {associatedHospitals.length > 1 && <span style={{ fontSize: '0.7rem', color: '#0284c7' }}>▼</span>}
                  </div>
                  <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                    {selectedHospital.department ? `${selectedHospital.department} • ` : ''}{selectedHospital.designation || 'Specialist Doctor'}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('/hospital');
                  }}
                  title="Click to view hospital profile & details"
                  style={{
                    marginLeft: '0.5rem',
                    background: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.775rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}
                >
                  View Hospital →
                </button>
              </div>

              {showHospitalMenu && associatedHospitals.length > 1 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '0.5rem',
                  backgroundColor: 'white',
                  borderRadius: '0.75rem',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                  border: '1px solid #e2e8f0',
                  minWidth: '270px',
                  zIndex: 50,
                  padding: '0.4rem'
                }}>
                  <div style={{ padding: '0.4rem 0.6rem', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                    Switch Hospital Profile
                  </div>
                  {associatedHospitals.map((hosp, idx) => (
                    <div
                      key={hosp.hospitalId || idx}
                      onClick={() => {
                        setSelectedHospital(hosp);
                        setShowHospitalMenu(false);
                      }}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '0.5rem',
                        cursor: 'pointer',
                        background: selectedHospital?.hospitalId === hosp.hospitalId ? '#f0f9ff' : 'transparent',
                        border: selectedHospital?.hospitalId === hosp.hospitalId ? '1px solid #bae6fd' : '1px solid transparent',
                        marginBottom: '0.25rem'
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#0f172a' }}>🏥 {hosp.hospitalName}</div>
                      <div style={{ fontSize: '0.775rem', color: '#64748b' }}>{hosp.department} ({hosp.designation || 'Doctor'})</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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

      {/* QR Scanner Modal Overlay — Full Real Scanner Flow */}
      {showScanner && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseScanner(); }}
        >
          <div style={{ backgroundColor: 'white', borderRadius: '1.25rem', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4)' }}>

            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', backgroundColor: '#eff6ff', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <QrCode size={18} color="#2563eb" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    {scannerStep === 'camera' && 'Scan Patient QR Code'}
                    {scannerStep === 'info' && 'Patient Information'}
                    {scannerStep === 'report' && 'Add Medical Report'}
                  </h2>
                  <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                    {scannerStep === 'camera' && 'Point camera at the patient QR code'}
                    {scannerStep === 'info' && (scannedPatient?.name || 'Scanned patient')}
                    {scannerStep === 'report' && `Report for ${scannedPatient?.name || 'Patient'}`}
                  </p>
                </div>
              </div>
              <button onClick={handleCloseScanner} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }}>
                <X size={22} />
              </button>
            </div>

            {/* Step breadcrumb */}
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #f1f5f9' }}>
              {['camera', 'info', 'report'].map((step, idx) => (
                <div
                  key={step}
                  style={{
                    flex: 1, textAlign: 'center', padding: '0.6rem',
                    fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: scannerStep === step ? '#2563eb' : '#94a3b8',
                    borderBottom: scannerStep === step ? '2px solid #2563eb' : '2px solid transparent',
                    transition: 'all 0.2s'
                  }}
                >
                  {idx + 1}. {step === 'camera' ? 'Scan' : step === 'info' ? 'View Info' : 'Add Report'}
                </div>
              ))}
            </div>

            <div style={{ padding: '1.5rem' }}>

              {/* ── STEP 1: Camera ── */}
              {scannerStep === 'camera' && (
                <div>
                  <p style={{ color: '#64748b', marginBottom: '1rem', fontSize: '0.875rem', textAlign: 'center' }}>
                    Allow camera access and point the viewfinder at the patient's QR code from their ArogyaX app.
                  </p>

                  {/* Camera viewfinder */}
                  <div
                    id="clinic-qr-reader"
                    style={{ width: '100%', borderRadius: '0.75rem', overflow: 'hidden', backgroundColor: '#0f172a', minHeight: '280px', position: 'relative' }}
                  />

                  {scanError && (
                    <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.5rem', border: '1px solid #fecaca', fontSize: '0.85rem' }}>
                      ⚠️ {scanError}
                    </div>
                  )}

                  <button
                    id="clinic-start-scan-btn"
                    onClick={startQrScanner}
                    style={{ marginTop: '1.25rem', width: '100%', padding: '0.875rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.95rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                  >
                    <Camera size={18} /> Start Camera Scanner
                  </button>

                   {/* ─── Or Search by Email ─── */}
                   <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', color: '#94a3b8' }}>
                     <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #cbd5e1)' }}></div>
                     <span style={{ padding: '0 0.85rem', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>Or Search by Email</span>
                     <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #cbd5e1)' }}></div>
                   </div>

                   {/* Email search form */}
                   <form onSubmit={handleEmailSearch} style={{
                     background: 'linear-gradient(135deg, #f0f9ff 0%, #f8fafc 100%)',
                     padding: '1.25rem',
                     borderRadius: '0.85rem',
                     border: '1px solid #e0e7ff',
                     display: 'flex',
                     flexDirection: 'column',
                     gap: '0.85rem',
                     boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                   }}>
                     <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       <Search size={14} color="#6366f1" /> Enter Patient's Email Address
                     </label>
                     <div style={{ display: 'flex', gap: '0.5rem' }}>
                       <input
                         type="email"
                         value={searchEmail}
                         onChange={(e) => setSearchEmail(e.target.value)}
                         placeholder="e.g. patient@example.com"
                         required
                         style={{
                           flex: 1,
                           padding: '0.7rem 0.875rem',
                           border: '1.5px solid #c7d2fe',
                           borderRadius: '0.6rem',
                           fontSize: '0.88rem',
                           outline: 'none',
                           transition: 'border-color 0.2s, box-shadow 0.2s',
                           boxSizing: 'border-box',
                           backgroundColor: 'white',
                         }}
                         onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)'; }}
                         onBlur={(e) => { e.target.style.borderColor = '#c7d2fe'; e.target.style.boxShadow = 'none'; }}
                       />
                       <button
                         type="submit"
                         disabled={searchEmailSubmitting}
                         style={{
                           padding: '0.7rem 1.1rem',
                           background: searchEmailSubmitting ? '#a5b4fc' : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                           color: 'white',
                           border: 'none',
                           borderRadius: '0.6rem',
                           cursor: searchEmailSubmitting ? 'not-allowed' : 'pointer',
                           fontWeight: 700,
                           fontSize: '0.82rem',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.4rem',
                           transition: 'transform 0.15s, box-shadow 0.15s',
                           boxShadow: '0 2px 8px rgba(99,102,241,0.25)',
                           flexShrink: 0,
                         }}
                         onMouseOver={(e) => { if (!searchEmailSubmitting) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(99,102,241,0.35)'; } }}
                         onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(99,102,241,0.25)'; }}
                       >
                         {searchEmailSubmitting ? (
                           <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                         ) : (
                           <Search size={15} />
                         )}
                         {searchEmailSubmitting ? 'Searching...' : 'Search'}
                       </button>
                     </div>
                     <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>
                       Enter the email address associated with the patient's account to find and select their profile.
                     </p>
                   </form>

                   {/* Email search error */}
                   {searchEmailError && (
                     <div style={{
                       marginTop: '0.75rem',
                       padding: '0.7rem 1rem',
                       background: 'linear-gradient(135deg, #fef2f2, #fff1f2)',
                       color: '#be123c',
                       borderRadius: '0.6rem',
                       border: '1px solid #fecdd3',
                       fontSize: '0.82rem',
                       fontWeight: 500,
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.5rem',
                     }}>
                       <AlertTriangle size={15} /> {searchEmailError}
                     </div>
                   )}

                   {/* Email search results — patient cards */}
                   {searchEmailResult.length > 0 && (
                     <div style={{ marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                       <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <Users size={14} color="#6366f1" />
                         {searchEmailResult.length} Patient{searchEmailResult.length > 1 ? 's' : ''} found — select one:
                       </div>
                       {searchEmailResult.map((p, idx) => (
                         <div
                           key={p.memberId || idx}
                           onClick={() => handleSelectEmailPatient(p)}
                           style={{
                             display: 'flex',
                             alignItems: 'center',
                             gap: '0.85rem',
                             padding: '0.85rem 1rem',
                             background: 'white',
                             borderRadius: '0.75rem',
                             border: '1.5px solid #e0e7ff',
                             cursor: 'pointer',
                             transition: 'all 0.2s ease',
                             boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                           }}
                           onMouseOver={(e) => {
                             e.currentTarget.style.borderColor = '#6366f1';
                             e.currentTarget.style.boxShadow = '0 4px 16px rgba(99,102,241,0.13)';
                             e.currentTarget.style.transform = 'translateY(-2px)';
                           }}
                           onMouseOut={(e) => {
                             e.currentTarget.style.borderColor = '#e0e7ff';
                             e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                             e.currentTarget.style.transform = 'translateY(0)';
                           }}
                         >
                           {/* Avatar */}
                           <div style={{
                             width: '44px', height: '44px',
                             background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                             color: 'white',
                             borderRadius: '0.65rem',
                             display: 'flex', alignItems: 'center', justifyContent: 'center',
                             fontSize: '1.1rem', fontWeight: 800, flexShrink: 0,
                             boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                           }}>
                             {(p.profile?.fullName || p.name || 'P').charAt(0).toUpperCase()}
                           </div>
                           {/* Info */}
                           <div style={{ flex: 1, minWidth: 0 }}>
                             <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                               {p.profile?.fullName || p.name || 'Unknown'}
                             </div>
                             <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                               {p.profile?.gender && (
                                 <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '999px', fontWeight: 600 }}>
                                   {p.profile.gender}
                                 </span>
                               )}
                               {p.profile?.bloodGroup && (
                                 <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '999px', fontWeight: 700 }}>
                                   🩸 {p.profile.bloodGroup}
                                 </span>
                               )}
                               {p.profile?.dob && (
                                 <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', backgroundColor: '#f0fdf4', color: '#15803d', borderRadius: '999px', fontWeight: 600 }}>
                                   {new Date(p.profile.dob).toLocaleDateString()}
                                 </span>
                               )}
                             </div>
                           </div>
                           {/* Arrow indicator */}
                           <ChevronRight size={18} color="#94a3b8" style={{ flexShrink: 0 }} />
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )}

              {/* ── STEP 2: Patient Info ── */}
              {scannerStep === 'info' && scannedPatient && (
                <div>
                  {/* Patient ID badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8fafc', borderRadius: '0.75rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ width: '52px', height: '52px', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 700, flexShrink: 0 }}>
                      {(scannedPatient.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#0f172a' }}>{scannedPatient.name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.2rem' }}>{scannedPatient.patientId || scannedPatient.id || 'Unknown ID'}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                        {scannedPatient.gender && <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', backgroundColor: '#eff6ff', color: '#2563eb', borderRadius: '999px' }}>{scannedPatient.gender}</span>}
                        {scannedPatient.bloodType && <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '999px', fontWeight: 700 }}>🩸 {scannedPatient.bloodType}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Info rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {[
                      { label: 'Date of Birth', value: scannedPatient.dob },
                      { label: 'Allergies', value: scannedPatient.allergies },
                      { label: 'Chronic Conditions', value: scannedPatient.chronicIllnesses },
                      { label: 'Current Medications', value: scannedPatient.currentMedications },
                      { label: 'Emergency Contact', value: scannedPatient.emergencyContact },
                      { label: 'Address', value: scannedPatient.address },
                      { label: 'Email', value: scannedPatient.email },
                    ].filter(row => row.value).map(row => (
                      <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.6rem 0.75rem', backgroundColor: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, flexShrink: 0 }}>{row.label}</span>
                        <span style={{ fontSize: '0.82rem', color: '#0f172a', textAlign: 'right', wordBreak: 'break-word' }}>{row.value || '—'}</span>
                      </div>
                    ))}
                   </div>

                   {/* Report History */}
                   {scannedPatientReports.length > 0 && (
                     <div style={{ marginBottom: '1.25rem' }}>
                       <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                         <FileText size={14} color="#6366f1" /> Report History ({scannedPatientReports.length})
                       </div>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '0.25rem' }}>
                         {scannedPatientReports.map((r, idx) => (
                           <div key={r._id || idx} style={{
                             display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                             padding: '0.6rem 0.75rem',
                             backgroundColor: '#faf5ff', borderRadius: '0.5rem', border: '1px solid #ede9fe',
                             animation: `fadeSlideUp 0.25s ease ${idx * 0.05}s both`,
                           }}>
                             <div style={{ minWidth: 0 }}>
                               <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                               <div style={{ fontSize: '0.68rem', color: '#7c3aed', fontWeight: 500 }}>{r.type} • {r.doctorName || 'Doctor'}</div>
                             </div>
                             <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0, marginLeft: '0.5rem' }}>{r.date}</span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => { setShowScanner(false); startQrScanner(); setScannerStep('camera'); }}
                      style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      ↩ Scan Again
                    </button>
                    <button
                      onClick={() => setScannerStep('report')}
                      style={{ flex: 2, padding: '0.75rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      <PlusCircle size={16} /> Add Medical Report
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 3: Add Report ── */}
              {scannerStep === 'report' && scannedPatient && (
                <form onSubmit={handleScanReportSubmit}>
                  {/* Mini patient badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', backgroundColor: '#eff6ff', borderRadius: '0.6rem', border: '1px solid #bfdbfe', marginBottom: '1.25rem' }}>
                    <div style={{ width: '36px', height: '36px', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                      {(scannedPatient.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#1e3a8a' }}>Writing report for: <strong>{scannedPatient.name}</strong></div>
                      <div style={{ fontSize: '0.72rem', color: '#3b82f6' }}>{scannedPatient.patientId || scannedPatient.id}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Report Title *</label>
                      <input
                        required
                        value={scanReportForm.title}
                        onChange={e => setScanReportForm(f => ({...f, title: e.target.value}))}
                        placeholder="e.g. Annual Checkup, Hypertension Follow-up..."
                        style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Report Type</label>
                      <select
                        value={scanReportForm.type}
                        onChange={e => setScanReportForm(f => ({...f, type: e.target.value}))}
                        style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', backgroundColor: 'white', boxSizing: 'border-box' }}
                      >
                        <option>Diagnosis</option>
                        <option>Clinical note</option>
                        <option>Prescription</option>
                        <option>Referral</option>
                        <option>Lab Request</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Clinical Notes</label>
                      <textarea
                        value={scanReportForm.notes}
                        onChange={e => setScanReportForm(f => ({...f, notes: e.target.value}))}
                        placeholder="Observations, treatment details, instructions..."
                        rows={4}
                        style={{ width: '100%', padding: '0.7rem 0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                      />
                    </div>

                    {scanError && (
                      <div style={{ padding: '0.7rem 0.875rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '0.5rem', border: '1px solid #fecaca', fontSize: '0.82rem' }}>
                        ⚠️ {scanError}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        type="button"
                        onClick={() => setScannerStep('info')}
                        style={{ flex: 1, padding: '0.75rem', backgroundColor: 'transparent', color: '#64748b', border: '1px solid #cbd5e1', borderRadius: '0.6rem', cursor: 'pointer', fontWeight: 600 }}
                      >
                        ← Back
                      </button>
                      <button
                        type="submit"
                        disabled={scanSubmitting}
                        style={{ flex: 2, padding: '0.75rem', backgroundColor: scanSubmitting ? '#93c5fd' : '#2563eb', color: 'white', border: 'none', borderRadius: '0.6rem', cursor: scanSubmitting ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        {scanSubmitting ? 'Saving...' : <><CheckCircle size={16} /> Save Report</>}
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClinicPage;
