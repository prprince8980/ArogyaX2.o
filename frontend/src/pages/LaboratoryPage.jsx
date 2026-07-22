import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import arogyaXLogo from '../assets/arogyax-logo.png';
import '../styles/pages/LaboratoryPage.css';
import { 
  FiFolderPlus, FiFileText, FiCalendar, FiBarChart2, FiUser, 
  FiBell, FiMenu, FiChevronDown, FiDownload, FiArrowRight, FiPhoneCall, FiX, FiCamera,
  FiUpload, FiCheckCircle, FiAlertCircle, FiEye, FiImage, FiFile
} from 'react-icons/fi';
import { Html5Qrcode } from 'html5-qrcode';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Get stored lab user from localStorage
function getStoredLabUser() {
  try {
    const user = JSON.parse(localStorage.getItem('arogax2User') || 'null');
    if (!user) return { labId: '', labName: '', accountId: '', email: '', fallbackName: '' };

    // Check direct properties saved by login or onboarding
    const directLabId = user.profileId || user.labId || user._id || user.accountId || '';
    const directLabName = user.name || user.labName || user.accountName || 'Laboratory';

    // Check nested member list if full account object was saved
    const labMember = user?.members?.find(m => m.role === 'laboratory');

    return { 
      labId: labMember?.profileId || directLabId || 'LAB-SESSION-DEFAULT',
      labName: labMember?.name || directLabName || 'Laboratory',
      accountId: user?.accountId || user?._id || '',
      email: user?.email || '',
      fallbackName: user?.accountName || directLabName || 'Laboratory'
    };
  } catch (_) {
    return { labId: 'LAB-SESSION-DEFAULT', labName: 'Laboratory', accountId: '', email: '', fallbackName: 'Laboratory' };
  }
}

const getStatusClass = (status) => {
  if (status === 'Normal' || status === 'Reviewed') return 'status-normal';
  if (status === 'Pending Review') return 'status-borderline';
  return 'status-deficient';
};

const inferReportType = (testType = '', reportTitle = '') => {
  const value = `${testType} ${reportTitle}`.toLowerCase();
  if (value.includes('lipid') || value.includes('cholesterol')) return 'lipid';
  if (value.includes('thyroid')) return 'thyroid';
  if (value.includes('vitamin')) return 'vitamin';
  return 'blood';
};

const mapBackendReportToCard = (report) => ({
  id: report._id,
  type: inferReportType(report.testType, report.reportTitle),
  name: report.reportTitle,
  lab: report.patientName ? `${report.patientName} · ${report.labName}` : report.labName,
  date: report.date,
  status: report.status || 'Pending Review',
  statusClass: getStatusClass(report.status),
});

const normalizePatientFromQr = (payload) => {
  if (!payload || typeof payload !== 'object') return null;
  const patientId = payload.patientId || payload.id || '';
  const email = payload.email || '';
  const name = payload.name || payload.fullName || '';

  // Validate patient fields: reject non-patient payloads or OAuth tokens starting with 4/
  if (!patientId && !email && !payload.patientName) {
    return null;
  }
  if (name && (name.startsWith('4/') || name.includes('4/0AXEQ'))) {
    return null;
  }

  return {
    patientId: patientId || email || '',
    name: (name && !name.startsWith('4/')) ? name : 'Patient',
    dob: payload.dob || payload.dateOfBirth || '',
    gender: payload.gender || '',
    bloodType: payload.bloodType || payload.bloodGroup || '',
    allergies: Array.isArray(payload.allergies) ? payload.allergies.join(', ') : (payload.allergies || ''),
    email: email || '',
  };
};

const normalizePatientFromEmailResult = (result, email) => {
  const profile = result?.profile || {};
  return {
    patientId: result?.memberId || profile?._id || '',
    name: result?.name || profile?.fullName || 'Unknown Patient',
    dob: profile?.dob || '',
    gender: profile?.gender || '',
    bloodType: profile?.bloodGroup || '',
    allergies: Array.isArray(profile?.allergies) ? profile.allergies.join(', ') : (profile?.allergies || ''),
    email: email || '',
  };
};

const LaboratoryPage = () => {
  const labSession = getStoredLabUser();

  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState('Laboratory');
  const [reports, setReports] = useState([]);
  const [uploadedLabReports, setUploadedLabReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [labProfile, setLabProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [profileForm, setProfileForm] = useState({
    labName: '',
    businessEmail: '',
    registrationNumber: '',
    labType: '',
  });
  
  // QR Scanner state
  const [showScanner, setShowScanner] = useState(false);
  const [scannedPatient, setScannedPatient] = useState(null);
  const [scannerStep, setScannerStep] = useState('choice'); // choice | camera | email | info | upload | success
  const [scanError, setScanError] = useState('');
  const [lookupEmail, setLookupEmail] = useState('');
  const [emailLookupLoading, setEmailLookupLoading] = useState(false);
  const [emailLookupError, setEmailLookupError] = useState('');
  const [emailLookupResults, setEmailLookupResults] = useState([]);

  // Report upload state
  const [uploadReportTitle, setUploadReportTitle] = useState('');
  const [uploadTestType, setUploadTestType] = useState('Blood Test');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const html5QrRef = useRef(null);
  const reportUploadRef = useRef(null);
  const imageUploadRef = useRef(null);
  const qrImageRef = useRef(null);
  const userMenuRef = useRef(null);
  const displayLabName = labProfile?.labName || labSession.labName || labSession.fallbackName || 'Laboratory';

  const handleQrImageFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError('');
    try {
      const html5Qr = new Html5Qrcode('lab-qr-temp-reader', { verbose: false });
      const decodedText = await html5Qr.scanFile(file, true);
      try { html5Qr.clear(); } catch (_) {}

      let payload = null;
      try {
        payload = JSON.parse(decodedText);
      } catch (_) {
        payload = null;
      }

      const patient = normalizePatientFromQr(payload);
      if (!patient) {
        setScanError(`Scanned image does not contain a valid ArogyaX Patient QR code. (${decodedText.substring(0, 20)}...). Please upload a valid Patient QR code image or find patient by Email.`);
        setScannerStep('choice');
        return;
      }

      setScannedPatient(patient);
      setScannerStep('info');
      setScanError('');
    } catch (err) {
      console.error('QR file scan error:', err);
      setScanError('Could not detect a valid QR code in the uploaded image. Please ensure the QR code is clearly visible or search by Patient Email.');
      setScannerStep('choice');
    }
  };

  // Clean up scanner instance if the component unmounts unexpectedly
  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const fetchLabProfile = useCallback(async () => {
    if (!labSession.labId) return;

    setLoadingProfile(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/member/${labSession.labId}?role=laboratory`);
      const data = await res.json();
      if (res.ok && data?.profile) {
        setLabProfile(data.profile);
        setProfileForm({
          labName: data.profile.labName || '',
          businessEmail: data.profile.businessEmail || '',
          registrationNumber: data.profile.registrationNumber || '',
          labType: data.profile.labType || '',
        });
      }
    } catch (error) {
      console.error('Error fetching lab profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  }, [labSession.labId]);

  // Fetch lab's uploaded reports history
  const fetchLabReports = useCallback(async () => {
    if (!labSession.labId) {
      setUploadedLabReports([]);
      setReports([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const res = await fetch(`${API_URL}/api/auth/lab-reports-by-lab?labId=${labSession.labId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const nextReports = data.reports || [];
          setUploadedLabReports(nextReports);
          setReports(nextReports.map(mapBackendReportToCard));
        }
      }
    } catch (err) {
      console.error('Error fetching lab reports history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [labSession.labId]);

  useEffect(() => {
    fetchLabProfile();
    fetchLabReports();
  }, [fetchLabProfile, fetchLabReports]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // --- HANDLER FUNCTIONS ---

  const stopQrScanner = async () => {
    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
      } catch (_) {}
      html5QrRef.current = null;
    }
  };

  const handleOpenScanner = (mode = 'choice') => {
    setShowScanner(true);
    setScannerStep(mode);
    setScannedPatient(null);
    setScanError('');
    setLookupEmail('');
    setEmailLookupLoading(false);
    setEmailLookupError('');
    setEmailLookupResults([]);
    resetUploadState();
    if (mode === 'camera') {
      startQrScanner();
    }
  };

  const startQrScanner = async () => {
    setScannerStep('camera');
    setScanError('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setScanError('Camera API is not supported or site is accessed over insecure HTTP. Please use http://localhost:5173 or HTTPS.');
      return;
    }

    try {
      const testStream = await navigator.mediaDevices.getUserMedia({ video: true });
      testStream.getTracks().forEach((track) => track.stop());
    } catch (permErr) {
      console.error('Lab camera permission check failed:', permErr);
      if (permErr.name === 'NotAllowedError' || permErr.name === 'PermissionDeniedError') {
        setScanError('Camera permission was blocked. Please click the lock/camera icon in your browser URL bar to allow camera access.');
      } else {
        setScanError('Camera not accessible: ' + (permErr.message || 'Please check camera permissions in browser.'));
      }
      return;
    }

    setTimeout(async () => {
      if (html5QrRef.current) {
        try { await html5QrRef.current.stop(); } catch (_) {}
        html5QrRef.current = null;
      }

      const scanner = new Html5Qrcode('lab-qr-reader', {
        verbose: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        }
      });
      html5QrRef.current = scanner;

      const scanConfig = {
        fps: 30,
        qrbox: (viewfinderWidth, viewfinderHeight) => {
          const minDim = Math.min(viewfinderWidth, viewfinderHeight);
          const size = Math.floor(minDim * 0.85);
          return { width: size, height: size };
        },
        aspectRatio: 1.0,
        disableFlip: false
      };

      const handleSuccess = (decodedText) => {
        try { 
          scanner.stop().then(() => { html5QrRef.current = null; }); 
        } catch (_) {}
        
        let payload = null;
        try { 
          payload = JSON.parse(decodedText); 
        } catch (_) { 
          payload = null; 
        }

        const patient = normalizePatientFromQr(payload);
        if (!patient) {
          setScanError(`Scanned code is not a valid ArogyaX Patient QR code. (${decodedText.substring(0, 20)}...). Please scan a valid Patient QR code or find patient by Email.`);
          return;
        }

        setScannedPatient(patient);
        setScannerStep('info');
        setScanError('');
      };

      const handleError = () => {};

      try {
        await scanner.start({ facingMode: 'environment' }, scanConfig, handleSuccess, handleError);
      } catch (err1) {
        console.warn('Environment camera failed, attempting front/user camera:', err1);
        try {
          await scanner.start({ facingMode: 'user' }, scanConfig, handleSuccess, handleError);
        } catch (err2) {
          console.warn('User camera failed, attempting default camera input:', err2);
          try {
            await scanner.start(true, scanConfig, handleSuccess, handleError);
          } catch (err3) {
            setScanError('Unable to start camera stream. Please check camera permissions.');
            console.error('All lab camera startup attempts failed:', err3);
          }
        }
      }
    }, 50);
  };

  const handleCloseScanner = async () => {
    await stopQrScanner();
    setShowScanner(false);
    setScannedPatient(null);
    setScannerStep('choice');
    setScanError('');
    setLookupEmail('');
    setEmailLookupLoading(false);
    setEmailLookupError('');
    setEmailLookupResults([]);
    resetUploadState();
  };

  const resetUploadState = () => {
    setUploadReportTitle('');
    setUploadTestType('Blood Test');
    setUploadFile(null);
    setUploadProgress(false);
    setUploadMessage('');
    setUploadSuccess(false);
  };

  const handleLookupByEmail = async () => {
    if (!lookupEmail.trim()) {
      setEmailLookupError('Please enter a patient email ID.');
      return;
    }

    setEmailLookupLoading(true);
    setEmailLookupError('');
    setEmailLookupResults([]);
    setScannedPatient(null);

    try {
      const res = await fetch(`${API_URL}/api/auth/patients-by-email?email=${encodeURIComponent(lookupEmail.trim())}`);
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Unable to search this email ID.');
      }

      if (!data.exists || !Array.isArray(data.patients) || data.patients.length === 0) {
        setEmailLookupError('No patient profile was found for this email ID.');
        return;
      }

      setEmailLookupResults(data.patients);

      if (data.patients.length === 1) {
        setScannedPatient(normalizePatientFromEmailResult(data.patients[0], lookupEmail.trim()));
        setScannerStep('info');
      }
    } catch (error) {
      setEmailLookupError(error.message || 'Failed to search by email.');
    } finally {
      setEmailLookupLoading(false);
    }
  };

  const handleSelectEmailPatient = (patientResult) => {
    setScannedPatient(normalizePatientFromEmailResult(patientResult, lookupEmail.trim()));
    setScannerStep('info');
  };

  const handleProfileFieldChange = (event) => {
    const { name, value } = event.target;
    setProfileForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveProfile = async () => {
    if (!labSession.labId) {
      setProfileMessage('Laboratory profile ID is missing.');
      return;
    }

    setProfileSaving(true);
    setProfileMessage('');

    try {
      const res = await fetch(`${API_URL}/api/auth/lab-profile/${labSession.labId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();

      if (!res.ok || !data?.success) {
        throw new Error(data?.message || 'Could not update laboratory info.');
      }

      setLabProfile(data.profile);
      setProfileForm({
        labName: data.profile.labName || '',
        businessEmail: data.profile.businessEmail || '',
        registrationNumber: data.profile.registrationNumber || '',
        labType: data.profile.labType || '',
      });
      setProfileMessage('Laboratory information updated successfully.');
    } catch (error) {
      setProfileMessage(error.message || 'Failed to update laboratory information.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('arogax2User');
    window.location.href = '/login';
  };

  // Called when user picks a file in the upload step
  const handleReportFileSelect = (e, mode) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadFile(file);
    setUploadMessage('');
    // Auto-generate a title from file name if empty
    if (!uploadReportTitle) {
      setUploadReportTitle(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
  };

  // Convert file to base64 helper
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // strip data:...;base64,
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Upload report to backend
  const handleUploadReport = async () => {
    if (!uploadFile) {
      setUploadMessage('Please select a file first.');
      return;
    }
    if (!uploadReportTitle.trim()) {
      setUploadMessage('Please enter a report title.');
      return;
    }
    if (!scannedPatient?.patientId) {
      setUploadMessage('Patient ID not found in QR code. Cannot upload.');
      return;
    }

    setUploadProgress(true);
    setUploadMessage('');

    try {
      const base64 = await fileToBase64(uploadFile);
      const isImage = uploadFile.type ? uploadFile.type.startsWith('image/') : /\.(jpg|jpeg|png|webp|gif)$/i.test(uploadFile.name);
      const fileType = isImage ? 'image' : 'pdf';
      const fileMimeType = uploadFile.type || (isImage ? 'image/jpeg' : 'application/pdf');

      const activeLabId = labSession.labId || labProfile?._id || 'LAB-DEFAULT';
      const activeLabName = displayLabName || 'Laboratory';
      const patientId = scannedPatient.patientId || scannedPatient.email || 'PATIENT-DEFAULT';
      const patientName = scannedPatient.name || 'Patient';

      const body = {
        patientId,
        patientName,
        labId: activeLabId,
        labName: activeLabName,
        reportTitle: uploadReportTitle.trim() || uploadFile.name || 'Lab Report',
        testType: uploadTestType || 'Blood Test',
        fileName: uploadFile.name || 'report',
        fileType,
        fileData: base64,
        fileMimeType,
      };

      const res = await fetch(`${API_URL}/api/auth/lab-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      let data = null;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await res.json();
        } catch (e) {
          console.error("Error parsing JSON response:", e);
        }
      }

      if (res.ok && data?.success) {
        setUploadSuccess(true);
        setScannerStep('success');
        setUploadMessage(`Report "${uploadReportTitle}" uploaded successfully for ${scannedPatient.name}!`);
        fetchLabReports();
      } else {
        const errorText = !contentType?.includes('application/json') ? await res.text() : '';
        const defaultMsg = `Server returned status ${res.status}: ${res.statusText || 'Error'}`;
        const errorMsg = data?.message || (errorText ? `${defaultMsg} (${errorText.substring(0, 100)})` : defaultMsg);
        setUploadMessage(`Upload failed: ${errorMsg}`);
        setUploadProgress(false);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadMessage(`Network or parsing error: ${err.message || 'Please check your connection and try again.'}`);
      setUploadProgress(false);
    }
  };

  const handleDownloadReport = (reportName) => {
    alert(`Initiating download secure stream for: ${reportName}`);
  };

  // View a lab report file (fetches base64 and opens in new tab)
  const handleViewLabReport = async (reportId, fileName, fileMimeType) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/lab-report-file/${reportId}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}: ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server response was not JSON');
      }
      const data = await res.json();
      if (data.success) {
        const dataUri = `data:${data.fileMimeType};base64,${data.fileData}`;
        const win = window.open();
        if (data.fileMimeType === 'application/pdf') {
          win.document.write(`<iframe src="${dataUri}" style="width:100%;height:100vh;border:none;"></iframe>`);
        } else {
          win.document.write(`<img src="${dataUri}" style="max-width:100%;display:block;margin:auto;" />`);
        }
      } else {
        throw new Error(data.message || 'Failed to retrieve file data');
      }
    } catch (err) {
      alert(`Could not load file: ${err.message || 'Please try again.'}`);
    }
  };

  // Download a lab report file
  const handleDownloadLabReport = async (reportId, fileName) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/lab-report-file/${reportId}`);
      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}: ${res.statusText}`);
      }
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server response was not JSON');
      }
      const data = await res.json();
      if (data.success) {
        const dataUri = `data:${data.fileMimeType};base64,${data.fileData}`;
        const a = document.createElement('a');
        a.href = dataUri;
        a.download = data.fileName || fileName;
        a.click();
      } else {
        throw new Error(data.message || 'Failed to retrieve file data');
      }
    } catch (err) {
      alert(`Could not download file: ${err.message || 'Please try again.'}`);
    }
  };

  const handleCreateBooking = () => {
    setActiveTab('Report History');
  };

  const TEST_TYPES = ['Blood Test', 'Urine Test', 'X-Ray', 'MRI', 'CT Scan', 'Ultrasound', 'ECG', 'Thyroid Panel', 'Lipid Profile', 'Vitamin Panel', 'Other'];

  const historyReports = uploadedLabReports;

  const analytics = useMemo(() => {
    const source = historyReports;
    const totalReports = source.length;
    const uniquePatients = new Set(source.map((report) => report.patientName || 'Unknown Patient')).size;
    const pendingReview = source.filter((report) => report.status === 'Pending Review').length;
    const abnormalReports = source.filter((report) => report.status === 'Abnormal' || report.status === 'High Cholesterol').length;
    const reviewedReports = source.filter((report) => report.status === 'Reviewed' || report.status === 'Normal').length;

    const byTestTypeMap = source.reduce((acc, report) => {
      const key = report.testType || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byStatusMap = source.reduce((acc, report) => {
      const key = report.status || 'Pending Review';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const byMonthMap = source.reduce((acc, report) => {
      const dateValue = report.uploadedAt || report.date;
      const monthKey = Number.isNaN(new Date(dateValue).getTime())
        ? String(report.date || 'Unknown').slice(3)
        : new Date(dateValue).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
      acc[monthKey] = (acc[monthKey] || 0) + 1;
      return acc;
    }, {});

    const topTestTypeEntry = Object.entries(byTestTypeMap).sort((a, b) => b[1] - a[1])[0];
    const abnormalRate = totalReports ? Math.round((abnormalReports / totalReports) * 100) : 0;

    return {
      totalReports,
      uniquePatients,
      pendingReview,
      abnormalReports,
      reviewedReports,
      abnormalRate,
      topTestType: topTestTypeEntry ? topTestTypeEntry[0] : 'No data',
      byTestType: Object.entries(byTestTypeMap).sort((a, b) => b[1] - a[1]).slice(0, 5),
      byStatus: Object.entries(byStatusMap).sort((a, b) => b[1] - a[1]),
      byMonth: Object.entries(byMonthMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-6),
    };
  }, [historyReports]);

  return (
    <div className="dashboard-container">
      {/* Hidden inputs for report upload inside scanner modal */}
      <input
        type="file"
        ref={reportUploadRef}
        style={{ display: 'none' }}
        accept=".pdf"
        onChange={(e) => handleReportFileSelect(e, 'pdf')}
      />
      <input
        type="file"
        ref={imageUploadRef}
        style={{ display: 'none' }}
        accept=".jpg,.jpeg,.png,.webp"
        onChange={(e) => handleReportFileSelect(e, 'image')}
      />
      <input
        type="file"
        ref={qrImageRef}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={handleQrImageFileUpload}
      />
      <div id="lab-qr-temp-reader" style={{ display: 'none' }} />

      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar">
        <div className="logo-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem 1rem', borderBottom: '1px solid #e2e8f0', gap: '0.5rem' }}>
          <img src={arogyaXLogo} alt="ArogyaX" style={{ height: '36px', width: 'auto' }} />
        </div>

        <nav className="nav-menu">
          {[
            { id: 'Laboratory', label: 'Dashboard Home', icon: <FiFolderPlus /> },
            { id: 'Add Report', label: 'Scan / Find Patient', icon: <FiCamera />, action: () => handleOpenScanner('choice') },
            { id: 'Report History', label: 'Report History', icon: <FiFileText /> },
            { id: 'Book Lab Test', label: 'Book Lab Test', icon: <FiCalendar />, action: handleCreateBooking },
            { id: 'Analyze', label: 'Health Trends', icon: <FiBarChart2 /> },
            { id: 'Manage Profile', label: 'Account Settings', icon: <FiUser /> }
          ].map((item) => (
            <button 
              key={item.id} 
              className={`nav-item-btn ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                if (item.action) { item.action(); } 
                else { setActiveTab(item.id); }
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

      {/* MAIN VIEWPORT FRAME */}
      <main className="main-content">
        {/* TOP INTERACTION CONTROL BAR */}
        <header className="top-navbar">
          <div className="left-header">
            <FiMenu className="menu-toggle-icon" />
            <h2>{activeTab} Overview</h2>
          </div>
          <div className="right-header">
            <div className="notification-bell" style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setNotifications(0)}>
              <FiBell />
              {notifications > 0 && <span className="bell-badge">{notifications}</span>}
            </div>
            <div className="user-menu-container" ref={userMenuRef}>
              <div className="user-profile" onClick={() => setShowUserMenu((current) => !current)} style={{ cursor: 'pointer' }}>
                <div className="avatar">{displayLabName.charAt(0).toUpperCase()}</div>
                <div className="user-info">
                  <span className="user-name">{displayLabName}</span>
                  <span className="user-role">Laboratory</span>
                </div>
                <FiChevronDown className="dropdown-arrow" />
              </div>
              {showUserMenu && (
                <div className="lab-user-dropdown">
                  <button className="lab-user-dropdown-item" onClick={() => { setShowUserMenu(false); setActiveTab('Manage Profile'); }}>
                    <FiUser /> Account Settings
                  </button>
                  <button className="lab-user-dropdown-item lab-user-dropdown-item-danger" onClick={handleLogout}>
                    <FiX /> Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONDITIONALLY RENDERED SUB-PAGES */}
        <div className="dashboard-body">
          
          {/* 1. MAIN INTEGRATED DASHBOARD VIEW */}
          {activeTab === 'Laboratory' && (
            <>
              <section className="welcome-banner">
                <div className="banner-text">
                  <h1>Welcome, {displayLabName}</h1>
                  <p>Scan patient QR codes to upload reports, track history, and interface with connected facilities.</p>
                </div>
                <div className="banner-illustration">
                  <span className="microscope-art" style={{ fontSize: '3rem' }}>🔬</span>
                </div>
              </section>

              <section className="action-cards-grid">
                <div className="action-card blue-card" onClick={handleOpenScanner}>
                  <div className="icon-wrapper"><FiCamera /></div>
                  <h3>Scan Patient QR</h3>
                  <p>Scan & upload reports directly to patient profile</p>
                  <FiArrowRight className="arrow-btn" />
                </div>
                <div className="action-card purple-card" onClick={() => handleOpenScanner('email')}>
                  <div className="icon-wrapper">@</div>
                  <h3>Find By Email</h3>
                  <p>Search patient using email ID, then upload the report</p>
                  <FiArrowRight className="arrow-btn" />
                </div>
                <div className="action-card blue-card" onClick={() => setActiveTab('Report History')}>
                  <div className="icon-wrapper"><FiFileText /></div>
                  <h3>View History</h3>
                  <p>Access all lab reports uploaded to patients</p>
                  <FiArrowRight className="arrow-btn" />
                </div>
                <div className="action-card green-card" onClick={handleCreateBooking}>
                  <div className="icon-wrapper"><FiCalendar /></div>
                  <h3>Review Queue</h3>
                  <p>Jump to report history and review pending uploads</p>
                  <FiArrowRight className="arrow-btn" />
                </div>
              </section>

              <section className="data-layout-grid">
                {/* RECENT RECORDS BOX */}
                <div className="data-card recent-reports-section">
                  <div className="card-header">
                    <h3>Recent Report Intake</h3>
                    <span className="view-all-link" onClick={() => setActiveTab('Report History')}>See All</span>
                  </div>
                  {reports.length > 0 ? (
                    <div className="reports-list">
                      {reports.slice(0, 3).map((report) => (
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
                      ))}
                    </div>
                  ) : (
                    <div className="empty-booking-box" style={{ textAlign: 'center', padding: '2rem 0' }}>
                      <FiFileText style={{ fontSize: '2.2rem', color: '#94a3b8', marginBottom: '1rem' }} />
                      <h4>No Reports In Mongo Yet</h4>
                      <p>Uploaded laboratory reports from MongoDB will appear here.</p>
                    </div>
                  )}
                </div>

                {/* FETCHED INSIGHTS BLOCK */}
                <div className="data-card upcoming-booking-section">
                  <div className="card-header">
                    <h3>Lab Activity</h3>
                  </div>
                  <div className="active-booking-box" style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                    <div className="booking-status-indicator" style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                      Mongo Synced
                    </div>
                    <h4 style={{ margin: '0.75rem 0 0.25rem 0' }}>{analytics.totalReports} reports uploaded</h4>
                    <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0' }}>{analytics.uniquePatients} unique patients in history</p>
                    <p style={{ margin: '0.5rem 0', fontWeight: '500' }}>Pending review: {analytics.pendingReview}</p>
                    <p style={{ color: '#64748b', fontSize: '0.86rem', margin: 0 }}>
                      Most common test: {analytics.topTestType}
                    </p>
                  </div>
                  <button className="btn-book-test" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem', borderRadius: '6px', cursor: 'pointer' }} onClick={handleCreateBooking}>
                    Open Report History
                  </button>
                </div>
              </section>
            </>
          )}

          {/* 2. REPORT HISTORY VIEW */}
          {activeTab === 'Report History' && (
            <div className="data-card full-history-view" style={{ padding: '1.5rem', background: '#fff', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Uploaded Lab Reports</h3>
                  <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>Track uploads from QR scan or email-based patient lookup</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button className="btn-support" style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }} onClick={() => handleOpenScanner('choice')}>
                    <FiCamera /> Find Patient
                  </button>
                  <button className="btn-support" style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: '#334155' }} onClick={fetchLabReports}>
                    ↻ Refresh
                  </button>
                </div>
              </div>

              <div className="lab-summary-grid">
                <div className="lab-summary-card">
                  <span>Total Reports</span>
                  <strong>{analytics.totalReports}</strong>
                  <small>Reports stored by this laboratory</small>
                </div>
                <div className="lab-summary-card">
                  <span>Unique Patients</span>
                  <strong>{analytics.uniquePatients}</strong>
                  <small>Patients served in report history</small>
                </div>
                <div className="lab-summary-card">
                  <span>Pending Review</span>
                  <strong>{analytics.pendingReview}</strong>
                  <small>Uploads needing a follow-up review</small>
                </div>
                <div className="lab-summary-card">
                  <span>Abnormal Findings</span>
                  <strong>{analytics.abnormalReports}</strong>
                  <small>{analytics.abnormalRate}% of all uploaded reports</small>
                </div>
              </div>

              <div className="lab-chart-grid">
                <div className="lab-chart-card">
                  <div className="lab-chart-header">
                    <h4>Reports by Test Type</h4>
                    <span>Top categories</span>
                  </div>
                  <div className="lab-chart-bars">
                    {analytics.byTestType.length > 0 ? analytics.byTestType.map(([label, count]) => (
                      <div key={label} className="lab-chart-row">
                        <div className="lab-chart-labels">
                          <span>{label}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className="lab-chart-track">
                          <div
                            className="lab-chart-fill blue"
                            style={{ width: `${Math.max((count / analytics.totalReports) * 100, 10)}%` }}
                          />
                        </div>
                      </div>
                    )) : <p className="lab-chart-empty">Upload reports to see category distribution.</p>}
                  </div>
                </div>
                <div className="lab-chart-card">
                  <div className="lab-chart-header">
                    <h4>Status Snapshot</h4>
                    <span>Operational quality view</span>
                  </div>
                  <div className="lab-chart-bars">
                    {analytics.byStatus.length > 0 ? analytics.byStatus.map(([label, count]) => (
                      <div key={label} className="lab-chart-row">
                        <div className="lab-chart-labels">
                          <span>{label}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className="lab-chart-track">
                          <div
                            className={`lab-chart-fill ${label === 'Abnormal' ? 'red' : label === 'Pending Review' ? 'amber' : 'green'}`}
                            style={{ width: `${Math.max((count / analytics.totalReports) * 100, 10)}%` }}
                          />
                        </div>
                      </div>
                    )) : <p className="lab-chart-empty">Status insights appear after uploads.</p>}
                  </div>
                </div>
              </div>

              {loadingHistory ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  <div className="lab-spinner" />
                  <p>Loading uploaded reports…</p>
                </div>
              ) : uploadedLabReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔬</div>
                  <h4 style={{ color: '#334155' }}>No Reports Uploaded Yet</h4>
                  <p style={{ color: '#64748b', maxWidth: '350px', margin: '0 auto 1.5rem' }}>
                    Scan a patient's QR code or search by email ID to upload a report and see it appear here.
                  </p>
                  <button className="btn-support" onClick={() => handleOpenScanner('choice')} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FiCamera /> Find Patient & Upload
                  </button>
                </div>
              ) : (
                <div className="lab-reports-history-list">
                  {uploadedLabReports.map((report) => (
                    <div key={report._id} className="lab-history-row">
                      <div className="lab-history-icon">
                        {report.fileType === 'pdf' ? <FiFile /> : <FiImage />}
                      </div>
                      <div className="lab-history-info">
                        <h4>{report.reportTitle}</h4>
                        <p>
                          <span className="lab-patient-name">👤 {report.patientName}</span>
                          <span className="lab-divider">·</span>
                          <span>{report.testType}</span>
                          <span className="lab-divider">·</span>
                          <span>{report.date}</span>
                        </p>
                      </div>
                      <div className="lab-history-actions">
                        <span className={`lab-file-badge ${report.fileType === 'pdf' ? 'badge-pdf' : 'badge-img'}`}>
                          {report.fileType === 'pdf' ? '📄 PDF' : '🖼️ Image'}
                        </span>
                        <span className="status-badge status-normal" style={{ fontSize: '0.75rem' }}>
                          {report.status}
                        </span>
                        <button className="download-btn" title="View" onClick={() => handleViewLabReport(report._id, report.fileName, report.fileMimeType)}>
                          <FiEye />
                        </button>
                        <button className="download-btn" title="Download" onClick={() => handleDownloadLabReport(report._id, report.fileName)}>
                          <FiDownload />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. HEALTH TREND ANALYTICS VIEW */}
          {activeTab === 'Analyze' && (
            <div className="data-card analytics-view" style={{ padding: '2rem', background: '#fff', borderRadius: '12px' }}>
              <div className="lab-chart-header" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <h3 style={{ margin: 0 }}>Laboratory Analytics</h3>
                  <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>Operational insight from your uploaded report history</p>
                </div>
              </div>

              <div className="lab-summary-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="lab-summary-card insight">
                  <span>Most Requested Test</span>
                  <strong>{analytics.topTestType}</strong>
                  <small>Top recurring test in uploaded history</small>
                </div>
                <div className="lab-summary-card insight">
                  <span>Reviewed Reports</span>
                  <strong>{analytics.reviewedReports}</strong>
                  <small>Reports already marked reviewed or normal</small>
                </div>
                <div className="lab-summary-card insight">
                  <span>Pending Queue</span>
                  <strong>{analytics.pendingReview}</strong>
                  <small>Uploads that may need a lab follow-up</small>
                </div>
                <div className="lab-summary-card insight">
                  <span>Risk Indicator</span>
                  <strong>{analytics.abnormalRate}%</strong>
                  <small>Share of uploaded reports flagged abnormal</small>
                </div>
              </div>

              <div className="lab-chart-grid">
                <div className="lab-chart-card">
                  <div className="lab-chart-header">
                    <h4>Monthly Upload Trend</h4>
                    <span>Recent activity</span>
                  </div>
                  <div className="lab-chart-bars">
                    {analytics.byMonth.length > 0 ? analytics.byMonth.map(([label, count]) => (
                      <div key={label} className="lab-chart-row">
                        <div className="lab-chart-labels">
                          <span>{label}</span>
                          <strong>{count}</strong>
                        </div>
                        <div className="lab-chart-track">
                          <div
                            className="lab-chart-fill purple"
                            style={{ width: `${Math.max((count / Math.max(...analytics.byMonth.map(([, value]) => value), 1)) * 100, 10)}%` }}
                          />
                        </div>
                      </div>
                    )) : <p className="lab-chart-empty">Monthly trend appears after uploads are recorded.</p>}
                  </div>
                </div>
                <div className="lab-chart-card">
                  <div className="lab-chart-header">
                    <h4>Important Notes</h4>
                    <span>Actionable lab guidance</span>
                  </div>
                  <ul className="lab-insight-list">
                    <li>Prioritize review for pending uploads so patients can access final results faster.</li>
                    <li>Monitor abnormal findings closely and coordinate with clinics for follow-up cases.</li>
                    <li>Use patient email lookup when QR scanning is not available at the collection desk.</li>
                    <li>Keep report titles specific so history stays searchable and easier to audit.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 4. PROFILE MANAGEMENT VIEW */}
          {activeTab === 'Manage Profile' && (
            <div className="data-card profile-view" style={{ padding: '2rem', background: '#fff', borderRadius: '12px' }}>
              <h3>Account Settings</h3>
              <p style={{ color: '#64748b', margin: '0.35rem 0 1rem' }}>Choose what you want to do with this laboratory account.</p>
              <div className="lab-settings-actions">
                <button className="lab-settings-action-card" onClick={() => setShowProfileEditor((current) => !current)}>
                  <FiUser />
                  <div>
                    <strong>Change Info</strong>
                    <p>Update laboratory name and contact details from MongoDB data.</p>
                  </div>
                </button>
                <button className="lab-settings-action-card danger" onClick={handleLogout}>
                  <FiX />
                  <div>
                    <strong>Log Out</strong>
                    <p>Sign out from this laboratory account safely.</p>
                  </div>
                </button>
              </div>

              {showProfileEditor && (
                <>
                  <hr style={{ borderColor: '#f1f5f9', margin: '1rem 0' }} />
                  {loadingProfile ? (
                    <div style={{ color: '#64748b' }}>Loading laboratory information...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '460px' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Lab Name</label>
                        <input
                          type="text"
                          name="labName"
                          className="profile-input"
                          value={profileForm.labName}
                          onChange={handleProfileFieldChange}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Business Email</label>
                        <input
                          type="email"
                          name="businessEmail"
                          className="profile-input"
                          value={profileForm.businessEmail}
                          onChange={handleProfileFieldChange}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Registration Number</label>
                        <input
                          type="text"
                          name="registrationNumber"
                          className="profile-input"
                          value={profileForm.registrationNumber}
                          onChange={handleProfileFieldChange}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Lab Type</label>
                        <input
                          type="text"
                          name="labType"
                          className="profile-input"
                          value={profileForm.labType}
                          onChange={handleProfileFieldChange}
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.25rem' }}>Lab ID</label>
                        <input
                          type="text"
                          className="profile-input"
                          value={labSession.labId}
                          readOnly
                          style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#94a3b8' }}
                        />
                      </div>
                      {profileMessage && (
                        <div className={profileMessage.toLowerCase().includes('successfully') ? 'lab-profile-message success' : 'lab-profile-message'}>
                          {profileMessage}
                        </div>
                      )}
                      <button className="btn-book-test" style={{ padding: '0.65rem', alignSelf: 'flex-start' }} onClick={handleSaveProfile} disabled={profileSaving}>
                        {profileSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* FOOTER INSIGHT FOOTNOTE */}
          <footer className="insight-banner">
            <div className="insight-icon">📋</div>
            <div className="insight-content">
              <h3>Accurate Reports. Better Health.</h3>
              <p>Regular testing helps you stay informed about your health and take action early.</p>
            </div>
          </footer>
        </div>
      </main>

      {/* MODAL: HELPDESK ENGINE */}
      {showSupportModal && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div className="support-modal" style={{ background: '#fff', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '450px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3>Support Helpdesk</h3>
              <button className="close-modal-btn" onClick={() => setShowSupportModal(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <p>Connecting you to a healthcare representative... Our support line is fully active.</p>
              <div className="support-dial-box" style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '8px', display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1rem', fontWeight: 'bold' }}>
                <FiPhoneCall /> <span>+1 (800) AROGYA-X</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR SCANNER + REPORT UPLOAD */}
      {showScanner && (
        <div className="modal-backdrop" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '1rem' }}>
          <div className="scanner-modal lab-upload-modal">
            <div className="modal-header">
              <div>
                <h3>
                  {scannerStep === 'camera' && '📷 Scan Patient QR'}
                  {scannerStep === 'info' && '✅ Patient Identified'}
                  {scannerStep === 'upload' && '📤 Upload Report'}
                  {scannerStep === 'success' && '🎉 Upload Successful'}
                </h3>
                <p className="modal-subtitle">
                  {scannerStep === 'camera' && 'Align the QR code within the frame'}
                  {scannerStep === 'info' && 'Review patient info and upload their lab report'}
                  {scannerStep === 'upload' && `Uploading for: ${scannedPatient?.name || 'Patient'}`}
                  {scannerStep === 'success' && 'Report saved to patient dashboard'}
                </p>
              </div>
              <button className="close-modal-btn" onClick={handleCloseScanner}><FiX /></button>
            </div>

            <div className="modal-body">
              {scannerStep === 'choice' && (
                <div className="patient-lookup-choice">
                  {scanError && (
                    <div className="lab-upload-error" style={{ marginBottom: '1rem' }}>
                      <FiAlertCircle /> {scanError}
                    </div>
                  )}
                  <div className="upload-type-buttons">
                    <button className="upload-type-btn upload-img-btn" onClick={() => handleOpenScanner('camera')}>
                      <FiCamera className="upload-type-icon" />
                      <span>Camera Scan</span>
                      <small>Use camera to scan patient QR</small>
                    </button>
                    <button className="upload-type-btn upload-img-btn" onClick={() => qrImageRef.current?.click()}>
                      <FiImage className="upload-type-icon" />
                      <span>Upload QR Image</span>
                      <small>Select QR image file from device</small>
                    </button>
                    <button className="upload-type-btn upload-pdf-btn" onClick={() => handleOpenScanner('email')}>
                      <span className="upload-type-icon">@</span>
                      <span>Enter Email ID</span>
                      <small>Search patient by registered email</small>
                    </button>
                  </div>
                  <p className="upload-prompt-text">
                    First identify the patient using camera scan, QR image upload, or email lookup.
                  </p>
                </div>
              )}
              
              {/* STEP 1: CAMERA */}
              {scannerStep === 'camera' && (
                <div>
                  <div id="lab-qr-reader" className="qr-reader-box" />
                  {scanError && (
                    <div className="lab-upload-error">
                      <FiAlertCircle /> {scanError}
                    </div>
                  )}
                  <p style={{ fontSize: '0.83rem', color: '#64748b', textAlign: 'center', marginTop: '0.75rem' }}>
                    Point the camera at the patient's ArogyaX QR code
                  </p>
                  <div className="upload-action-row" style={{ marginTop: '1rem' }}>
                    <button className="btn-dismiss" onClick={async () => { await stopQrScanner(); setScannerStep('choice'); }}>← Back</button>
                    <button className="btn-upload-confirm" onClick={async () => { await stopQrScanner(); setScannerStep('email'); }}>
                      Use Email Instead
                    </button>
                  </div>
                </div>
              )}

              {scannerStep === 'email' && (
                <div className="upload-form">
                  <div className="form-group">
                    <label>Patient Email ID</label>
                    <input
                      type="email"
                      className="upload-input"
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      placeholder="patient@example.com"
                    />
                  </div>

                  {emailLookupError && (
                    <div className="lab-upload-error"><FiAlertCircle /> {emailLookupError}</div>
                  )}

                  {emailLookupResults.length > 1 && (
                    <div className="email-results-list">
                      <div className="lab-chart-header" style={{ marginBottom: '0.75rem' }}>
                        <h4>Choose Patient Profile</h4>
                        <span>{emailLookupResults.length} linked profiles</span>
                      </div>
                      {emailLookupResults.map((patientResult) => (
                        <button
                          key={patientResult.memberId}
                          className="email-result-card"
                          onClick={() => handleSelectEmailPatient(patientResult)}
                        >
                          <div>
                            <strong>{patientResult.name}</strong>
                            <p>{patientResult.profile?.dob || 'DOB not set'} · {patientResult.profile?.gender || 'Gender not set'}</p>
                          </div>
                          <span>Select</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="upload-action-row">
                    <button className="btn-dismiss" onClick={() => setScannerStep('choice')}>← Back</button>
                    <button className="btn-upload-confirm" onClick={handleLookupByEmail} disabled={emailLookupLoading}>
                      {emailLookupLoading ? <><span className="lab-spinner-sm" /> Searching…</> : <>Search Patient</>}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 2: PATIENT INFO */}
              {scannerStep === 'info' && scannedPatient && (
                <div>
                  <div className="patient-info-card">
                    <div className="patient-avatar-circle">
                      {(scannedPatient.name || 'P').charAt(0).toUpperCase()}
                    </div>
                    <div className="patient-info-details">
                      <h4>{scannedPatient.name || 'Unknown Patient'}</h4>
                      {scannedPatient.patientId && <p><strong>ID:</strong> {scannedPatient.patientId}</p>}
                      {scannedPatient.email && <p><strong>Email:</strong> {scannedPatient.email}</p>}
                      {scannedPatient.dob && <p><strong>DOB:</strong> {scannedPatient.dob}</p>}
                      {scannedPatient.gender && <p><strong>Gender:</strong> {scannedPatient.gender}</p>}
                      {scannedPatient.bloodType && <p><strong>Blood Type:</strong> <span style={{ color: '#dc2626', fontWeight: 700 }}>{scannedPatient.bloodType}</span></p>}
                      {scannedPatient.allergies && scannedPatient.allergies !== 'None recorded' && (
                        <p><strong>Allergies:</strong> {scannedPatient.allergies}</p>
                      )}
                    </div>
                  </div>

                  <p className="upload-prompt-text">
                    Upload a lab report for this patient. Add the report title before saving so it is clear in patient history.
                  </p>

                  <div className="upload-type-buttons">
                    <button 
                      className="upload-type-btn upload-pdf-btn"
                      onClick={() => { setScannerStep('upload'); reportUploadRef.current?.click(); }}
                    >
                      <FiFile className="upload-type-icon" />
                      <span>Upload PDF</span>
                      <small>Lab report document</small>
                    </button>
                    <button 
                      className="upload-type-btn upload-img-btn"
                      onClick={() => { setScannerStep('upload'); imageUploadRef.current?.click(); }}
                    >
                      <FiImage className="upload-type-icon" />
                      <span>Upload Image</span>
                      <small>Scan or photo of report</small>
                    </button>
                  </div>

                  <div className="upload-action-row">
                    <button className="btn-dismiss" onClick={() => setScannerStep(scannedPatient.email ? 'email' : 'choice')}>
                      ← Change Patient
                    </button>
                    <button className="btn-upload-confirm" onClick={handleCloseScanner}>
                      Done
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 3: UPLOAD FORM */}
              {scannerStep === 'upload' && (
                <div className="upload-form">
                  {uploadFile ? (
                    <div className="selected-file-preview">
                      <div className="file-icon-wrap">
                        {uploadFile.type === 'application/pdf' ? <FiFile style={{ color: '#ef4444' }} /> : <FiImage style={{ color: '#6366f1' }} />}
                      </div>
                      <div>
                        <p className="file-name">{uploadFile.name}</p>
                        <p className="file-size">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button className="file-change-btn" onClick={() => {
                        setUploadFile(null);
                        setScannerStep('info');
                      }}>
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="no-file-prompt">
                      <FiUpload />
                      <p>No file selected. Go back to choose.</p>
                      <button className="btn-dismiss" onClick={() => setScannerStep('info')}>← Back</button>
                    </div>
                  )}

                  <div className="upload-form-fields">
                    <div className="form-group">
                      <label>Report Title *</label>
                      <input
                        type="text"
                        className="upload-input"
                        value={uploadReportTitle}
                        onChange={e => setUploadReportTitle(e.target.value)}
                        placeholder="e.g. Complete Blood Count"
                      />
                    </div>
                    <div className="form-group">
                      <label>Test Type</label>
                      <select className="upload-input" value={uploadTestType} onChange={e => setUploadTestType(e.target.value)}>
                        {TEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  {uploadMessage && !uploadSuccess && (
                    <div className="lab-upload-error"><FiAlertCircle /> {uploadMessage}</div>
                  )}

                  <div className="upload-action-row">
                    <button className="btn-dismiss" onClick={() => setScannerStep('info')}>← Back</button>
                    <button
                      className="btn-upload-confirm"
                      onClick={handleUploadReport}
                      disabled={uploadProgress || !uploadFile}
                    >
                      {uploadProgress ? (
                        <><span className="lab-spinner-sm" /> Uploading…</>
                      ) : (
                        <><FiUpload /> Upload Report</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* STEP 4: SUCCESS */}
              {scannerStep === 'success' && (
                <div className="upload-success-view">
                  <div className="success-icon-circle">
                    <FiCheckCircle />
                  </div>
                  <h4>Report Uploaded Successfully!</h4>
                  <p>The report <strong>"{uploadReportTitle}"</strong> has been saved to <strong>{scannedPatient?.name}'s</strong> dashboard.</p>
                  <p className="success-note">The patient can view and download this report from their Laboratory Reports section.</p>
                  <div className="success-actions">
                    <button className="btn-upload-confirm" onClick={() => { resetUploadState(); setScannerStep('info'); }}>
                      Upload Another Report
                    </button>
                    <button className="btn-dismiss" onClick={() => { handleCloseScanner(); setActiveTab('Report History'); }}>Go To History</button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LaboratoryPage;
