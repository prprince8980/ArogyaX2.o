import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import L from 'leaflet';
import { QRCodeSVG } from 'qrcode.react';
import arogyaXLogo from '../assets/arogyax-logo.png';
import "../styles/pages/PatientPage.css";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const emptyFamilyForm = {
  name: '',
  relationship: 'Child',
  dateOfBirth: '',
  gender: 'Female',
  phone: '',
  email: '',
  address: '',
  bloodType: '',
  allergies: '',
  chronicIllnesses: '',
  currentMedications: '',
  dietaryPreferences: '',
  lifestyleHabits: '',
  emergencyContact: '',
  preferredLanguage: '',
};

function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('arogax2User') || 'null');
  } catch (error) {
    return null;
  }
}

function createPatientProfileFromUser(user) {
  const profile = user?.profile || {};
  const name = profile.fullName || user?.name || 'Patient';
  const email = user?.email || '';
  const toText = (value) => (Array.isArray(value) ? value.join(', ') : value || '');

  return {
    id: profile.patientId || `PAT-${email.split('@')[0] || 'unknown'}`,
    name,
    relationship: 'Self',
    dateOfBirth: profile.dob || '',
    age: profile.dob ? calculateAge(profile.dob) : '',
    gender: profile.gender || '',
    bloodType: profile.bloodGroup || '',
    allergies: toText(profile.allergies),
    chronicIllnesses: toText(profile.chronicConditions),
    phone: profile.contactMethods?.[0] || '',
    email,
    address: profile.address || '',
    emergencyContact: profile.emergencyContactName ? `${profile.emergencyContactName} - ${profile.emergencyPhone || ''}` : '',
    reports: profile.reports || [],
    medicines: profile.medicines || [],
    labReports: profile.labReports || [],
  };
}

function normalizePatientProfile(profile) {
  return {
    reports: [],
    medicines: [],
    labReports: [],
    bloodType: 'Not set',
    allergies: 'None recorded',
    chronicIllnesses: 'None recorded',
    ...profile,
  };
}

function updateStoredUserFamilyMembers(user, familyMembers) {
  if (typeof window === 'undefined' || !user) return;

  const nextUser = {
    ...user,
    profile: {
      ...(user.profile || {}),
      familyMembers,
    },
  };
  localStorage.setItem('arogax2User', JSON.stringify(nextUser));
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) {
    return '';
  }

  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDelta = today.getMonth() - birthDate.getMonth();

  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return Math.max(age, 0);
}

function getInitials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

function PatientPage() {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const initialProfile = createPatientProfileFromUser(storedUser);
  const savedFamilyMembers = storedUser?.profile?.familyMembers || [];
  const [profiles, setProfiles] = useState([
    normalizePatientProfile(initialProfile),
    ...savedFamilyMembers.map(normalizePatientProfile),
  ]);
  const [activeProfileId, setActiveProfileId] = useState(initialProfile.id);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSideNav, setShowSideNav] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileSection, setProfileSection] = useState('overview');
  const [showEmergency, setShowEmergency] = useState(false);
  const [showFamilyHub, setShowFamilyHub] = useState(false);
  const [showFamilyForm, setShowFamilyForm] = useState(false);
  const [familyFormStep, setFamilyFormStep] = useState(1);
  const [familyForm, setFamilyForm] = useState(emptyFamilyForm);
  const [savedMessage, setSavedMessage] = useState('');
  const [cartMessage, setCartMessage] = useState('Pickup is ready at the front desk.');
  const [cartCount, setCartCount] = useState(0);
  const [activePage, setActivePage] = useState('dashboard');
  const [preSelectedClinic, setPreSelectedClinic] = useState(null);
  const [viewedClinicProfile, setViewedClinicProfile] = useState(null);
  const totalFamilySteps = 3;
  const [myAppointments, setMyAppointments] = useState([]);
  const [clinicReportsFromBackend, setClinicReportsFromBackend] = useState([]);
  const [labReportsFromBackend, setLabReportsFromBackend] = useState([]);
  const [loadingLabReports, setLoadingLabReports] = useState(false);
  const patient = profiles.find((profile) => profile.id === activeProfileId) || profiles[0];
  const isMainProfile = patient.relationship === 'Self';

  const fetchAppointments = async () => {
    if (!storedUser?.accountId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/clinic/appointments?profileId=${storedUser.accountId}&role=patient`);
      if (res.ok) {
        const data = await res.json();
        setMyAppointments(data.appointments || []);
      }
    } catch (error) {
      console.error("Error fetching appointments:", error);
    }
  };

  const fetchClinicReports = async (patientId) => {
    if (!patientId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/auth/clinic-reports?patientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setClinicReportsFromBackend(data.reports || []);
        }
      }
    } catch (error) {
      console.error('Error fetching clinic reports:', error);
    }
  };

  const fetchLabReports = async (patientId) => {
    if (!patientId) return;
    setLoadingLabReports(true);
    try {
      const res = await fetch(`http://localhost:5000/api/auth/lab-reports?patientId=${patientId}`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            setLabReportsFromBackend(data.reports || []);
          }
        } else {
          console.error('Failed to fetch lab reports: response is not JSON');
        }
      } else {
        console.error(`Failed to fetch lab reports: Server returned ${res.status}`);
      }
    } catch (error) {
      console.error('Error fetching lab reports:', error);
    } finally {
      setLoadingLabReports(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [storedUser?.accountId]);

  // Fetch clinic & lab reports whenever the active patient profile changes
  useEffect(() => {
    const pid = patient?.id || storedUser?.profile?.patientId || storedUser?.profileId || storedUser?.accountId;
    if (pid) {
      fetchClinicReports(pid);
      fetchLabReports(pid);
    }
  }, [activeProfileId, patient?.id, storedUser?.profile?.patientId, storedUser?.profileId, storedUser?.accountId]);

  useEffect(() => {
    if (!storedUser?.accountId) return;
    const socket = io('http://localhost:5000');
    
    socket.emit('join_room', `patient_${storedUser.accountId}`);
    
    socket.on('appointment_cancelled_alert', (data) => {
      const alertMsg = `⚠️ EMERGENCY UPDATE: Your appointment at ${data.clinicName} on ${data.date} during ${data.slot} has been CANCELLED by the doctor.`;
      setSavedMessage(alertMsg);
      fetchAppointments();
      setTimeout(() => {
        setSavedMessage('');
      }, 10000);
    });

    socket.on('my_appointment_booked', (data) => {
      fetchAppointments();
    });

    return () => {
      socket.disconnect();
    };
  }, [storedUser?.accountId]);

  useEffect(() => {
    let isMounted = true;
    const loadFamilyMembers = async () => {
      if (!storedUser?.email) return;

      try {
        const response = await fetch(`${API_URL}/api/auth/patient-family?email=${encodeURIComponent(storedUser.email)}`);
        if (!response.ok) return;

        const data = await response.json();
        if (!isMounted || !Array.isArray(data.familyMembers)) return;

        setProfiles([
          normalizePatientProfile(initialProfile),
          ...data.familyMembers.map(normalizePatientProfile),
        ]);
        updateStoredUserFamilyMembers(storedUser, data.familyMembers);
      } catch (error) {
        console.error('Unable to load family members:', error);
      }
    };

    loadFamilyMembers();
    return () => {
      isMounted = false;
    };
  }, [storedUser?.email]);

  // Merge local profile reports with those fetched from backend
  const allClinicReports = [
    ...clinicReportsFromBackend.map(r => ({
      id: r._id,
      title: r.title,
      doctor: r.doctorName,
      date: r.date,
      type: r.type,
      notes: r.notes,
      clinicName: r.clinicName,
    })),
    ...(patient.reports || []),
  ];

  const allLabReports = [
    ...labReportsFromBackend.map((report) => ({
      id: report._id,
      reportTitle: report.reportTitle || report.title || 'Laboratory Report',
      testType: report.testType || report.category || 'Diagnostic Test',
      labName: report.labName || 'ArogyaX Laboratory',
      date: report.date || report.createdAt || 'Recently added',
      status: report.status || 'Uploaded',
      fileType: report.fileType || (report.fileMimeType === 'application/pdf' ? 'pdf' : 'image'),
      source: 'backend',
      raw: report,
    })),
    ...(patient.labReports || []).map((report, index) => ({
      id: report.id || report._id || `local-lab-report-${index}`,
      reportTitle: report.reportTitle || report.title || report.name || 'Laboratory Report',
      testType: report.testType || report.category || 'Diagnostic Test',
      labName: report.labName || report.lab || 'ArogyaX Laboratory',
      date: report.date || report.reportDate || 'Recently added',
      status: report.status || 'Uploaded',
      fileType: report.fileType || (report.fileUrl?.toLowerCase().includes('.pdf') ? 'pdf' : 'image'),
      fileUrl: report.fileUrl || report.url || '',
      source: 'local',
      raw: report,
    })),
  ];

  const filteredReports = allClinicReports.filter((report) => {
    const searchValue = searchTerm.toLowerCase();
    return (
      (report.title || '').toLowerCase().includes(searchValue) ||
      (report.doctor || '').toLowerCase().includes(searchValue) ||
      (report.clinicName || '').toLowerCase().includes(searchValue) ||
      (report.date || '').includes(searchValue)
    );
  });

  const qrSquares = useMemo(() => {
    const size = 10;
    const squares = [];
    const seed = `${patient.id}-${patient.name}-${patient.dateOfBirth}`;
    const base = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const finder = (x < 3 && y < 3) || (x > 6 && y < 3) || (x < 3 && y > 6);
        const pattern = (base + x * 7 + y * 11 + x * y) % 4;
        if (finder || pattern === 0 || pattern === 2) {
          squares.push({ x, y });
        }
      }
    }

    return squares;
  }, [patient.dateOfBirth, patient.id, patient.name]);

  const handleProfileChange = (event) => {
    const { name, value } = event.target;
    setProfiles((current) =>
      current.map((profile) => (profile.id === activeProfileId ? { ...profile, [name]: value } : profile)),
    );
  };

  const handleFamilyFormChange = (event) => {
    const { name, value } = event.target;
    setFamilyForm((current) => ({ ...current, [name]: value }));
  };

  const saveFamilyMembers = async (nextProfiles, successText) => {
    const familyMembers = nextProfiles.filter((profile) => profile.relationship !== 'Self');

    if (!storedUser?.email) {
      setSavedMessage('Sign in again to save family members to MongoDB.');
      return;
    }

    updateStoredUserFamilyMembers(storedUser, familyMembers);

    try {
      const response = await fetch(`${API_URL}/api/auth/patient-family`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: storedUser.email, familyMembers }),
      });

      if (!response.ok) {
        throw new Error('Family profile save failed');
      }

      const data = await response.json();
      localStorage.setItem('arogax2User', JSON.stringify(data.user));
      setSavedMessage(successText);
    } catch (error) {
      console.error('Unable to save family members:', error);
      setSavedMessage('Could not save family members to MongoDB. Please check the auth server.');
    }
  };

  const handleFamilyFormSubmit = (event) => {
    event.preventDefault();
    if (familyFormStep < totalFamilySteps) {
      setFamilyFormStep((current) => current + 1);
      return;
    }

    const age = calculateAge(familyForm.dateOfBirth);
    const newProfile = {
      id: `PAT-FAM-${Date.now().toString().slice(-6)}`,
      name: familyForm.name.trim(),
      relationship: familyForm.relationship,
      dateOfBirth: familyForm.dateOfBirth,
      age,
      gender: familyForm.gender,
      bloodType: familyForm.bloodType || 'Not set',
      allergies: familyForm.allergies || 'None recorded',
      chronicIllnesses: familyForm.chronicIllnesses || 'None recorded',
      currentMedications: familyForm.currentMedications || '',
      dietaryPreferences: familyForm.dietaryPreferences || '',
      lifestyleHabits: familyForm.lifestyleHabits || '',
      preferredLanguage: familyForm.preferredLanguage || '',
      phone: familyForm.phone || profiles[0].phone,
      email: familyForm.email || '',
      address: familyForm.address || profiles[0].address,
      emergencyContact: familyForm.emergencyContact || `${profiles[0].name} - ${profiles[0].phone}`,
      reports: [],
      medicines: [],
      labReports: [],
    };

    const nextProfiles = [...profiles, newProfile];
    setProfiles(nextProfiles);
    setActiveProfileId(newProfile.id);
    setFamilyForm(emptyFamilyForm);
    setFamilyFormStep(1);
    setShowFamilyForm(false);
    setShowFamilyHub(false);
    setActivePage('dashboard');
    setSearchTerm('');
    setCartCount(0);
    setCartMessage(`${newProfile.name}'s medicine pickup list is empty.`);
    saveFamilyMembers(nextProfiles, `✅ ${newProfile.name}'s profile has been created successfully!`);
  };

  const handleSaveProfile = (event) => {
    event.preventDefault();
    saveFamilyMembers(profiles, `${patient.name}'s profile updated and synced to MongoDB.`);
    if (profileSection === 'overview') {
      setShowProfile(false);
      return;
    }
    setShowProfile(false);
  };

  const handleSwitchProfile = (profileId) => {
    const nextProfile = profiles.find((profile) => profile.id === profileId);
    setActiveProfileId(profileId);
    setSearchTerm('');
    setCartCount(0);
    setCartMessage(`${nextProfile?.name || 'This member'}'s medicine pickup list is ready.`);
    setShowFamilyHub(false);
  };

  const handleBuyNow = (medicineName) => {
    setCartCount((current) => current + 1);
    setCartMessage(`${medicineName} has been added to ${patient.name}'s pickup order.`);
  };

  const handleSideNavAction = (action) => {
    setShowSideNav(false);

    if (action === 'qr') {
      setActivePage('qr');
    }

    if (action === 'clinicReports') {
      setActivePage('clinicReports');
    }

    if (action === 'labReports') {
      setActivePage('labReports');
    }

    if (action === 'emergency') {
      setActivePage('emergency');
    }

    if (action === 'medicines') {
      setActivePage('medicines');
    }

    if (action === 'family') {
      setFamilyFormStep(1);
      setFamilyForm(emptyFamilyForm);
      setShowFamilyForm(true);
    }

    if (action === 'profile') {
      setProfileSection('overview');
      setShowProfile(true);
    }

    if (action === 'bookAppointment') {
      setActivePage('bookAppointment');
    }
  };

  const BookAppointmentView = () => {
    const [clinics, setClinics] = useState([]);
    const [hospitals, setHospitals] = useState([]);
    const [patientLocation, setPatientLocation] = useState({ lat: 47.6062, lng: -122.3321 }); // Default Seattle
    const [loadingCoords, setLoadingCoords] = useState(false);
    const [coordsAllowed, setCoordsAllowed] = useState(false);
    const [selectedClinic, setSelectedClinic] = useState(preSelectedClinic || null);
    
    useEffect(() => {
      if (preSelectedClinic) {
        setSelectedClinic(preSelectedClinic);
      }
    }, [preSelectedClinic]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [slots, setSlots] = useState([]);
    const [selectedSlot, setSelectedSlot] = useState('');
    const [attendeeId, setAttendeeId] = useState(profiles[0]?.id || '');
    const [clinicSearch, setClinicSearch] = useState('');

    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);

    // Geolocation
    useEffect(() => {
      setLoadingCoords(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPatientLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setCoordsAllowed(true);
          setLoadingCoords(false);
        },
        (error) => {
          console.warn("Geolocation permission denied or error. Using default location.", error);
          setLoadingCoords(false);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }, []);

    // Haversine formula
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
      if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
      const R = 6371; // km
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLon = (lon2 - lon1) * Math.PI / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    // Fetch clinics
    const fetchClinics = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/clinic/all');
        if (res.ok) {
          const data = await res.json();
          let fetchedClinics = data.clinics || [];

          // Coordinate offsets for mock clinic distribution near user location
          const mockOffsets = [
            { lat: 0.005, lng: 0.005 },
            { lat: -0.008, lng: -0.003 },
            { lat: 0.002, lng: -0.007 },
            { lat: -0.004, lng: 0.009 },
            { lat: 0.009, lng: -0.002 }
          ];

          const processedClinics = await Promise.all(fetchedClinics.map(async (clinic, idx) => {
            if (!clinic.latitude || clinic.latitude === 0 || !clinic.longitude || clinic.longitude === 0) {
              const offset = mockOffsets[idx % mockOffsets.length];
              const mockLat = patientLocation.lat + offset.lat;
              const mockLng = patientLocation.lng + offset.lng;
              
              // Persist coordinates in database
              try {
                await fetch('http://localhost:5000/api/clinic/coordinates', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ clinicId: clinic._id, latitude: mockLat, longitude: mockLng })
                });
              } catch (err) {
                console.error("Failed to save coordinates:", err);
              }
              
              clinic.latitude = mockLat;
              clinic.longitude = mockLng;
            }
            return clinic;
          }));

          setClinics(processedClinics);
        }
      } catch (error) {
        console.error("Error fetching clinics:", error);
      }
    };

    useEffect(() => {
      fetchClinics();
    }, [patientLocation]);

    // Initialize/Update map markers
    useEffect(() => {
      const mapEl = document.getElementById('patient-map');
      if (!mapEl || clinics.length === 0) return;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map('patient-map').setView([patientLocation.lat, patientLocation.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapInstanceRef.current);
      } else {
        mapInstanceRef.current.setView([patientLocation.lat, patientLocation.lng], 13);
      }

      const map = mapInstanceRef.current;

      // Clear markers
      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      // Patient blue pin
      const patientMarker = L.marker([patientLocation.lat, patientLocation.lng], {
        icon: L.divIcon({
          className: 'patient-marker',
          html: `<div style="background-color: #3b82f6; width: 16px; height: 16px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 8px #3b82f6;"></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(map).bindPopup("<b>You are here</b>");
      markersRef.current.push(patientMarker);

      // Clinic pins
      clinics.forEach(clinic => {
        if (clinic.latitude && clinic.longitude) {
          const isSelected = selectedClinic?._id === clinic._id;
          const color = isSelected ? '#10b981' : '#ef4444';
          const shadowColor = isSelected ? '#10b981' : '#ef4444';
          const clinicMarker = L.marker([clinic.latitude, clinic.longitude], {
            icon: L.divIcon({
              className: 'clinic-marker',
              html: `<div style="background-color: ${color}; width: 18px; height: 18px; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 0 8px ${shadowColor}; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">H</div>`,
              iconSize: [18, 18],
              iconAnchor: [9, 9]
            })
          }).addTo(map);

          clinicMarker.bindPopup(`<b>${clinic.clinicName}</b><br/>${clinic.specialityType || 'General'}<br/>Fee: $${clinic.consultationFee || 0}`);
          clinicMarker.on('click', () => {
            setSelectedClinic(clinic);
          });
          markersRef.current.push(clinicMarker);
        }
      });

      return () => {};
    }, [clinics, patientLocation, selectedClinic]);

    // Cleanup Leaflet Map on tab switch
    useEffect(() => {
      return () => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    }, []);

    // Fetch slots
    const fetchSlots = async () => {
      if (!selectedClinic?._id) return;
      try {
        const res = await fetch(`http://localhost:5000/api/clinic/slots?clinicId=${selectedClinic._id}&date=${selectedDate}`);
        if (res.ok) {
          const data = await res.json();
          setSlots(data.slots || []);
        }
      } catch (err) {
        console.error("Error fetching slots:", err);
      }
    };

    useEffect(() => {
      fetchSlots();
    }, [selectedClinic, selectedDate]);

    // WebSockets room join and event handler for real-time slots capacity updates
    useEffect(() => {
      if (!selectedClinic?._id) return;
      const socket = io('http://localhost:5000');
      socket.emit('join_room', `clinic_${selectedClinic._id}`);
      
      socket.on('appointment_booked', () => {
        fetchSlots();
      });
      socket.on('slot_cancelled', () => {
        fetchSlots();
      });
      socket.on('slots_config_updated', () => {
        fetchSlots();
      });

      return () => {
        socket.disconnect();
      };
    }, [selectedClinic]);

    // Booking Submission
    const handleBook = async (e) => {
      e.preventDefault();
      if (!selectedClinic || !selectedSlot || !selectedDate || !attendeeId) {
        alert("Please choose a clinic, date, time slot, and patient attendee.");
        return;
      }

      const attendee = profiles.find(p => p.id === attendeeId) || profiles[0];
      const payload = {
        patientId: attendee.id,
        patientName: attendee.name,
        clinicId: selectedClinic._id,
        clinicName: selectedClinic.clinicName,
        doctorName: selectedClinic.ownerName || 'Chief Doctor',
        date: selectedDate,
        slot: selectedSlot,
        bookedBy: storedUser.accountId,
        gender: attendee.gender || 'Not specified',
        age: attendee.age ? String(attendee.age) : 'N/A'
      };

      try {
        const res = await fetch('http://localhost:5000/api/clinic/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
          setSavedMessage(`🎉 Appointment successfully booked for ${attendee.name}!`);
          setSelectedSlot('');
          fetchSlots();
          fetchAppointments();
          setTimeout(() => setSavedMessage(''), 5000);
        } else {
          alert(data.message || "Failed to book appointment");
        }
      } catch (error) {
        console.error("Booking error:", error);
        alert("Could not connect to Clinic booking service.");
      }
    };

    // Sort clinics nearest first
    const sortedClinics = useMemo(() => {
      return clinics
        .map(c => ({
          ...c,
          distance: calculateDistance(patientLocation.lat, patientLocation.lng, c.latitude, c.longitude)
        }))
        .filter(c => 
          c.clinicName.toLowerCase().includes(clinicSearch.toLowerCase()) ||
          (c.specialityType && c.specialityType.toLowerCase().includes(clinicSearch.toLowerCase()))
        )
        .sort((a, b) => a.distance - b.distance);
    }, [clinics, patientLocation, clinicSearch]);

    return (
      <div className="patient-page-view" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ backgroundColor: '#eff6ff', padding: '1rem 1.5rem', borderRadius: '0.75rem', border: '1px solid #bfdbfe', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>📍 Location Source:</strong> {loadingCoords ? 'Requesting GPS coordinates...' : coordsAllowed ? `GPS Coordinates (${patientLocation.lat.toFixed(4)}, ${patientLocation.lng.toFixed(4)})` : 'Using Default Location (Seattle, WA)'}
          </div>
          {!coordsAllowed && !loadingCoords && (
            <button 
              className="ghost-button small" 
              onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  (p) => { setPatientLocation({ lat: p.coords.latitude, lng: p.coords.longitude }); setCoordsAllowed(true); },
                  (err) => alert("Could not fetch location. Please enable location permissions in browser settings.")
                );
              }}
            >
              Retry GPS
            </button>
          )}
        </div>

        <div className="booking-grid">
          {/* Map and Clinics List */}
          <div className="map-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3>Select Clinic</h3>
              <input 
                type="text" 
                placeholder="Search clinics..." 
                value={clinicSearch} 
                onChange={e => setClinicSearch(e.target.value)} 
                style={{ padding: '0.4rem 0.8rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '180px' }}
              />
            </div>
            
            <div id="patient-map"></div>

            <div className="clinics-list">
              {sortedClinics.map(clinic => {
                const isSelected = selectedClinic?._id === clinic._id;
                return (
                  <div 
                    key={clinic._id}
                    className={`clinic-booking-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedClinic(clinic);
                      if (mapInstanceRef.current) {
                        mapInstanceRef.current.setView([clinic.latitude, clinic.longitude], 14);
                      }
                    }}
                  >
                    <div>
                      <strong style={{ display: 'block', fontSize: '1rem' }}>{clinic.clinicName}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{clinic.specialityType || 'General Practice'}</span>
                      <div style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 'bold', marginTop: '0.2rem' }}>
                        🚗 {clinic.distance.toFixed(1)} km away (Nearest Clinic First)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 'bold', color: '#0f172a' }}>${clinic.consultationFee || 150}</span>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Consult fee</span>
                    </div>
                  </div>
                );
              })}
              {sortedClinics.length === 0 && <p className="muted">No clinics match search criteria.</p>}
            </div>
          </div>

          {/* Time Slot Picker and Booking details */}
          <div className="booking-details-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {selectedClinic ? (
              <>
                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                  <span className="badge" style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.8rem' }}>Selected Clinic</span>
                  <h3 style={{ marginTop: '0.4rem' }}>{selectedClinic.clinicName}</h3>
                  <p className="muted" style={{ fontSize: '0.9rem' }}>👨‍⚕️ Doctor: {selectedClinic.ownerName || 'Dr. Marcus Hale'}</p>
                  <p className="muted" style={{ fontSize: '0.85rem' }}>📍 Address: {selectedClinic.address || 'Seattle, WA'}</p>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>1. Choose Appointment Date</label>
                  <input 
                    type="date" 
                    value={selectedDate} 
                    onChange={e => { setSelectedDate(e.target.value); setSelectedSlot(''); }} 
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>2. Available 1-Hour Slots (Max 15 capacity)</label>
                  <div className="slots-grid">
                    {slots.map(slot => {
                      const isSelected = selectedSlot === slot.time;
                      const count = slot.bookedCount;
                      const capacity = slot.capacity;
                      const spotsLeft = capacity - count;

                      if (slot.isCancelled) {
                        return (
                          <button key={slot.id} className="slot-btn cancelled" disabled>
                            {slot.time}
                            <div style={{ fontSize: '0.65rem', textDecoration: 'none' }}>Cancelled</div>
                          </button>
                        );
                      }

                      if (spotsLeft <= 0) {
                        return (
                          <button key={slot.id} className="slot-btn full" disabled>
                            {slot.time}
                            <div style={{ fontSize: '0.65rem' }}>Fully Booked</div>
                          </button>
                        );
                      }

                      return (
                        <button 
                          key={slot.id} 
                          type="button"
                          className={`slot-btn available ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedSlot(slot.time)}
                        >
                          {slot.time}
                          <div style={{ fontSize: '0.7rem', color: isSelected ? 'white' : '#16a34a' }}>
                            {spotsLeft} spot{spotsLeft === 1 ? '' : 's'} left
                          </div>
                        </button>
                      );
                    })}
                    {slots.length === 0 && <p className="muted" style={{ gridColumn: '1 / -1' }}>No slots configured by doctor for this date.</p>}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', color: '#64748b', marginBottom: '0.5rem' }}>3. Attendee Patient (Self or Family Member)</label>
                  <select 
                    value={attendeeId} 
                    onChange={e => setAttendeeId(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
                  >
                    {profiles.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.relationship})
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  className="primary-button" 
                  disabled={!selectedSlot} 
                  onClick={handleBook}
                  style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem' }}
                >
                  Book Appointment
                </button>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>
                <span style={{ fontSize: '3rem' }}>🩺</span>
                <h4 style={{ marginTop: '1rem', color: '#64748b' }}>No Clinic Selected</h4>
                <p style={{ fontSize: '0.85rem', maxWidth: '300px' }}>Select any nearby clinic from the list or click on map markers to configure and book appointment slots.</p>
              </div>
            )}
          </div>
        </div>

        {/* My Booked Appointments Timeline */}
        <div className="dashboard-card" style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3>My Booked Appointments</h3>
          <p className="muted" style={{ fontSize: '0.85rem', marginBottom: '1.25rem' }}>Your real-time list of upcoming bookings. Doctors can cancel slots, which will update your status immediately.</p>
          <div className="appointments-list">
            {myAppointments.map(app => {
              const isCancelled = app.status === 'cancelled';
              return (
                <div key={app._id} className={`appointment-item ${isCancelled ? 'cancelled' : 'booked'}`}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem' }}>📅 {app.date} • 🕒 {app.slot}</h4>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: '#475569' }}>
                      🏥 Clinic: <strong>{app.clinicName}</strong> (Doctor: {app.doctorName})
                    </p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                      👤 Patient Attendee: <strong>{app.patientName}</strong> {app.patientId.includes('FAM') ? '(Family Member)' : '(Self)'}
                    </p>
                    {isCancelled && (
                      <p style={{ margin: '0.4rem 0 0 0', color: '#ef4444', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        Reason: {app.cancellationReason || 'Cancelled by doctor'}
                      </p>
                    )}
                  </div>
                  <div>
                    <span className={isCancelled ? 'badge-cancelled' : 'badge-booked'}>
                      {app.status}
                    </span>
                  </div>
                </div>
              );
            })}
            {myAppointments.length === 0 && (
              <p className="empty-state">No appointments booked yet. Choose a clinic above to schedule your first appointment.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const NearbyClinicsView = () => {
    const [patientLocation, setPatientLocation] = useState({ lat: 12.9716, lng: 77.5946 }); // Default Bangalore
    const [distance, setDistance] = useState(5000); // 5km
    const [clinics, setClinics] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [locationLoading, setLocationLoading] = useState(false);

    const mapRef = useRef(null);
    const markersRef = useRef([]);

    const fetchNearbyClinics = async (lat, lng, radius) => {
      setLoading(true);
      setError('');
      try {
        const [clinicRes, hospitalRes] = await Promise.all([
          fetch(`http://localhost:5000/api/clinic/nearby?lat=${lat}&lng=${lng}&distance=${radius}`),
          fetch('http://localhost:5000/api/auth/hospitals/all')
        ]);
        
        let fetchedClinics = [];
        if (clinicRes.ok) {
          const data = await clinicRes.json();
          if (data.success) fetchedClinics = data.clinics || [];
        }

        let fetchedHospitals = [];
        if (hospitalRes.ok) {
          const data = await hospitalRes.json();
          if (data.success) fetchedHospitals = data.hospitals || [];
        }

        setClinics([...fetchedClinics, ...fetchedHospitals.map(h => ({ ...h, isHospital: true }))]);
      } catch (err) {
        console.error(err);
        setError('Network error: Could not reach backend.');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      setLocationLoading(true);
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser.');
        setLocationLoading(false);
        fetchNearbyClinics(patientLocation.lat, patientLocation.lng, distance);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setPatientLocation({ lat, lng });
          setLocationLoading(false);
          fetchNearbyClinics(lat, lng, distance);
        },
        (err) => {
          console.warn("GPS permission denied. Using fallback location.", err);
          setLocationLoading(false);
          fetchNearbyClinics(patientLocation.lat, patientLocation.lng, distance);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }, []);

    const handleDistanceChange = (newDistance) => {
      setDistance(newDistance);
      fetchNearbyClinics(patientLocation.lat, patientLocation.lng, newDistance);
    };

    const filteredClinics = useMemo(() => {
      return clinics.filter(clinic => {
        const name = (clinic.clinicName || '').toLowerCase();
        const addr = (clinic.clinicAddress || '').toLowerCase();
        const spec = (clinic.specialityType || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || addr.includes(search) || spec.includes(search);
      });
    }, [clinics, searchTerm]);

    useEffect(() => {
      window.handlePopupBook = (clinicId) => {
        const clinic = clinics.find(c => c._id === clinicId);
        if (clinic) {
          setPreSelectedClinic(clinic);
          setActivePage('bookAppointment');
        }
      };
      window.handlePopupViewProfile = (clinicId) => {
        const clinic = clinics.find(c => c._id === clinicId);
        if (clinic) {
          setViewedClinicProfile(clinic);
        }
      };

      return () => {
        delete window.handlePopupBook;
        delete window.handlePopupViewProfile;
      };
    }, [clinics]);

    useEffect(() => {
      const mapContainer = document.getElementById('patient-nearby-map');
      if (!mapContainer) return;

      if (!mapRef.current) {
        mapRef.current = L.map('patient-nearby-map').setView([patientLocation.lat, patientLocation.lng], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(mapRef.current);
      } else {
        mapRef.current.setView([patientLocation.lat, patientLocation.lng], 13);
      }

      const map = mapRef.current;

      markersRef.current.forEach(m => m.remove());
      markersRef.current = [];

      const patientMarker = L.marker([patientLocation.lat, patientLocation.lng], {
        icon: L.divIcon({
          className: 'patient-marker-blue',
          html: `<div style="background-color: #3b82f6; width: 18px; height: 18px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3b82f6;"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      }).addTo(map).bindPopup("<b>Your Location</b>");
      markersRef.current.push(patientMarker);

      const markersToFit = [patientMarker];

      filteredClinics.forEach(clinic => {
        if (clinic.latitude && clinic.longitude) {
          const lat = parseFloat(clinic.latitude);
          const lng = parseFloat(clinic.longitude);
          
          const distKm = calculateDistance(patientLocation.lat, patientLocation.lng, lat, lng);
          const distText = distKm < 1 ? `${(distKm * 1000).toFixed(0)} m` : `${distKm.toFixed(2)} km`;

          const popupContent = `
            <div style="font-family: 'Inter', sans-serif; padding: 4px; min-width: 220px; line-height: 1.4;">
              <h4 style="margin: 0 0 4px; color: #0f172a; font-size: 0.95rem; font-weight: 600;">🏥 ${clinic.clinicName || clinic.hospitalName || 'Health Center'}</h4>
              <p style="margin: 0 0 4px; color: #475569; font-size: 0.78rem;">📍 ${clinic.clinicAddress || clinic.address || 'No address'}</p>
              <p style="margin: 0 0 4px; color: #475569; font-size: 0.78rem;">📞 ${clinic.phoneNumber || clinic.emergencyLandline || 'N/A'}</p>
              <p style="margin: 0 0 10px; color: #2563eb; font-size: 0.8rem; font-weight: 600;">⚡ Distance: ${distText}</p>
              <div style="display: flex; gap: 6px; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 4px;">
                ${clinic.isHospital ? '' : `<button onclick="window.handlePopupBook('${clinic._id}')" style="flex: 1; padding: 6px 10px; background-color: #2563eb; color: white; border: none; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">Book Visit</button>`}
                <button onclick="window.handlePopupViewProfile('${clinic._id}')" style="flex: 1; padding: 6px 10px; background-color: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 0.75rem; font-weight: 600; cursor: pointer; transition: all 0.2s;">Profile</button>
              </div>
            </div>
          `;

          const clinicMarker = L.marker([lat, lng], {
            icon: L.divIcon({
              className: 'clinic-marker-red',
              html: `<div style="background-color: #ef4444; width: 20px; height: 20px; border-radius: 50%; border: 3.5px solid white; box-shadow: 0 0 10px #ef4444; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 10px;">H</div>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10]
            })
          }).addTo(map).bindPopup(popupContent);

          markersRef.current.push(clinicMarker);
          markersToFit.push(clinicMarker);
        }
      });

      if (markersToFit.length > 1) {
        const group = L.featureGroup(markersToFit);
        map.fitBounds(group.getBounds().pad(0.15));
      }

      return () => {};
    }, [filteredClinics, patientLocation]);

    useEffect(() => {
      return () => {
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
      };
    }, []);

    const handleRefreshLocation = () => {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setPatientLocation({ lat, lng });
          setLocationLoading(false);
          fetchNearbyClinics(lat, lng, distance);
        },
        (err) => {
          console.warn(err);
          setLocationLoading(false);
          alert('Location permission denied. Please allow GPS access in browser settings.');
        }
      );
    };

    return (
      <div className="nearby-clinics-layout" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', height: 'calc(100vh - 220px)', minHeight: '500px' }}>
        <div className="nearby-sidebar" style={{ backgroundColor: 'white', borderRadius: '1rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ padding: '1.25rem', borderBottom: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>🔍 Filters</span>
              <button 
                onClick={handleRefreshLocation} 
                disabled={locationLoading}
                style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
              >
                🔄 {locationLoading ? 'Locating...' : 'Refresh GPS'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Search Radius</label>
              <select 
                value={distance} 
                onChange={e => handleDistanceChange(parseInt(e.target.value))}
                style={{ padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: 'white', cursor: 'pointer' }}
              >
                <option value={1000}>Within 1 km</option>
                <option value={3000}>Within 3 km</option>
                <option value={5000}>Within 5 km</option>
                <option value={10000}>Within 10 km</option>
                <option value={25000}>Within 25 km</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Search Name / City / Address</label>
              <input 
                type="text" 
                placeholder="Type name, speciality or city..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{ padding: '0.6rem 0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', backgroundColor: '#f8fafc' }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} style={{ padding: '1rem', backgroundColor: 'white', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ height: '14px', width: '60%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                  <div style={{ height: '10px', width: '85%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                  <div style={{ height: '10px', width: '40%', backgroundColor: '#e2e8f0', borderRadius: '4px' }} />
                </div>
              ))
            ) : error ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#b91c1c', fontSize: '0.85rem' }}>
                ⚠️ {error}
              </div>
            ) : filteredClinics.length === 0 ? (
              <div style={{ padding: '2rem 1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.5rem', color: '#64748b' }}>
                <span style={{ fontSize: '2rem' }}>🏥</span>
                <strong style={{ fontSize: '0.9rem', color: '#0f172a' }}>No clinics found</strong>
                <p style={{ margin: 0, fontSize: '0.75rem', lineHeight: 1.4 }}>Try typing a different name or expanding the search radius from the dropdown above.</p>
              </div>
            ) : (
              filteredClinics.map(clinic => {
                const hasCoords = clinic.latitude !== undefined && clinic.longitude !== undefined && clinic.latitude !== 0;
                const distKm = hasCoords ? calculateDistance(patientLocation.lat, patientLocation.lng, clinic.latitude, clinic.longitude) : null;
                const distText = distKm !== null ? (distKm < 1 ? `${(distKm * 1000).toFixed(0)} m` : `${distKm.toFixed(2)} km`) : 'N/A';
                
                return (
                  <div 
                    key={clinic._id} 
                    style={{ 
                      padding: '1rem', 
                      backgroundColor: 'white', 
                      borderRadius: '0.75rem', 
                      border: '1px solid #e2e8f0', 
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      if (mapRef.current && clinic.latitude && clinic.longitude) {
                        mapRef.current.setView([clinic.latitude, clinic.longitude], 15);
                        const marker = markersRef.current.find(m => {
                          const latLng = m.getLatLng();
                          return Math.abs(latLng.lat - clinic.latitude) < 0.0001 && Math.abs(latLng.lng - clinic.longitude) < 0.0001;
                        });
                        if (marker) {
                          marker.openPopup();
                        }
                      }
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#0f172a', fontWeight: 600 }}>{clinic.clinicName || clinic.hospitalName || 'Health Center'}</h4>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb', whiteSpace: 'nowrap' }}>⚡ {distText}</span>
                    </div>
                    
                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#475569', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>📍</span> {clinic.clinicAddress || clinic.address || 'No address registered'}
                    </p>
                    
                    {(clinic.phoneNumber || clinic.emergencyLandline) && (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                        <span>📞</span> {clinic.phoneNumber || clinic.emergencyLandline}
                      </p>
                    )}
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid #f1f5f9', paddingTop: '0.5rem' }}>
                      {!clinic.isHospital && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreSelectedClinic(clinic);
                            setActivePage('bookAppointment');
                          }}
                          style={{ flex: 1, padding: '0.45rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                        >
                          Book Appointment
                        </button>
                      )}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewedClinicProfile(clinic);
                        }}
                        style={{ flex: 1, padding: '0.45rem', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={{ position: 'relative', borderRadius: '1rem', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <div id="patient-nearby-map" style={{ height: '100%', width: '100%', zIndex: 1 }} />
          
          <div style={{ position: 'absolute', bottom: '1.25rem', left: '1.25rem', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '0.5rem 0.75rem', borderRadius: '0.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.75rem', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', backgroundColor: '#3b82f6', borderRadius: '50%' }} />
              <strong>You (Blue)</strong>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '50%' }} />
              <strong>Clinics (Red)</strong>
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── nav items ── */
  const navItems = [
    { id: 'dashboard', label: 'Dashboard',        icon: '🏠' },
    { id: 'nearbyClinics', label: 'Nearby Clinics', icon: '🏥' },
    { id: 'qr',        label: 'QR Code',           icon: '⬛' },
    { id: 'clinicReports', label: 'Clinic Report', icon: '📋' },
    { id: 'labReports', label: 'Laboratory Report',icon: '🔬' },
    { id: 'medicines', label: 'Buy Medicine',      icon: '💊' },
    { id: 'emergency', label: 'Emergency',         icon: '🚨' },
    { id: 'family',    label: 'Add Member',        icon: '👤' },
    { id: 'profile',   label: 'Manage Profile',    icon: '⚙️' },
  ];

  /* ── feature cards shown on the main dashboard page ── */
  const featureCards = [
    { id: 'nearbyClinics', label: 'Nearby Clinics',  desc: 'Find clinics around you on the interactive map', icon: '🏥', color: 'indigo' },
    { id: 'qr',        label: 'QR Code',            desc: 'Generate and share your QR code',          icon: '⬛', color: 'blue'   },
    { id: 'clinicReports', label: 'Clinic Report',  desc: 'View and download your clinic reports',    icon: '📋', color: 'green'  },
    { id: 'labReports', label: 'Laboratory Report', desc: 'View and download your lab reports',       icon: '🔬', color: 'purple' },
    { id: 'medicines', label: 'Buy Medicine',        desc: 'Order medicines quickly and securely',    icon: '🛍️', color: 'orange' },
    { id: 'emergency', label: 'Emergency',           desc: 'Contact emergency services quickly',      icon: '🚨', color: 'red'    },
    { id: 'family',    label: 'Add Member',          desc: 'Add family members to your account',      icon: '👥', color: 'teal'   },
    { id: 'profile',   label: 'Manage Profile',      desc: 'Update your profile and preferences',     icon: '⚙️', color: 'indigo' },
  ];

  /* ── recent activity mock (uses real appointments if available) ── */
  const recentActivity = myAppointments.slice(0, 5).map(app => ({
    label: `Appointment at ${app.clinicName}`,
    date: app.date,
    type: app.status === 'cancelled' ? 'red' : 'green',
    icon: '📅',
  }));

  if (recentActivity.length === 0) {
    recentActivity.push(
      { label: 'No recent activity yet', date: '—', type: 'blue', icon: 'ℹ️' },
    );
  }

  const handleNavClick = (id) => {
    if (id === 'dashboard') { setActivePage('dashboard'); return; }
    if (id === 'family') {
      // Navigate to login page with addMember flag — shows the same PatientOnboarding form
      navigate('/login?addMember=true');
      return;
    }
    if (id === 'profile') {
      setProfileSection('overview');
      setShowProfile(true);
      return;
    }
    setActivePage(id);
  };

  return (
    <div className="pd-shell">
      {/* ── Sidebar ────────────────────────────────────────── */}
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 99 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <nav className={`pd-sidebar${sidebarOpen ? ' open' : ''}`} aria-label="Patient navigation">
        <div className="pd-sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', justifyContent: 'flex-start' }}>
          <img src={arogyaXLogo} alt="ArogyaX" style={{ height: '32px', width: 'auto' }} />
        </div>

        <div className="pd-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              type="button"
              className={`pd-nav-item ${activePage === item.id || (item.id === 'dashboard' && activePage === 'dashboard') ? 'active' : ''}`}
              onClick={() => { handleNavClick(item.id); setSidebarOpen(false); }}
            >
              <span className="pd-nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        <div className="pd-sidebar-help">
          <p>Need Help?</p>
          <small>Our support team is here to help you 24/7</small>
          <button className="pd-support-btn">🎧 Contact Support</button>
        </div>
      </nav>

      {/* ── Main Area ──────────────────────────────────────── */}
      <div className="pd-main">
        {/* Top bar */}
        <header className="pd-topbar">
          <button
            className="pd-bell-btn"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(o => !o)}
            style={{ display: 'none' }}
            id="pd-hamburger"
          >☰</button>
          <div className="pd-topbar-actions">
            <button className="pd-bell-btn" aria-label="Notifications">🔔</button>

            {/* User menu */}
            <div className="pd-user-menu-wrap">
              <button
                className="pd-user-chip"
                type="button"
                onClick={() => setShowUserMenu(v => !v)}
                aria-haspopup="true"
                aria-expanded={showUserMenu}
              >
                <div className="pd-user-avatar">{getInitials(patient.name)}</div>
                <div className="pd-user-info">
                  <strong>{patient.name}</strong>
                  <small>Patient</small>
                </div>
                <span style={{ color: '#94a3b8', fontSize: '0.75rem', transition: 'transform 0.2s', display: 'inline-block', transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)' }}>▾</span>
              </button>

              {showUserMenu && (
                <>
                  {/* Click-outside backdrop */}
                  <div
                    className="pd-user-menu-backdrop"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="pd-user-dropdown" role="menu">
                    <div className="pd-user-dropdown-header">
                      <div className="pd-user-avatar" style={{ width: '40px', height: '40px', fontSize: '0.9rem' }}>{getInitials(patient.name)}</div>
                      <div>
                        <strong style={{ fontSize: '0.9rem', color: 'var(--text-primary)', display: 'block' }}>{patient.name}</strong>
                        <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{patient.email || 'Patient'}</small>
                      </div>
                    </div>
                    <div className="pd-user-dropdown-divider" />
                    <button
                      className="pd-user-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setShowUserMenu(false);
                        setProfileSection('overview');
                        setShowProfile(true);
                      }}
                    >
                      <span>👤</span> Manage Profile
                    </button>
                    <button
                      className="pd-user-dropdown-item"
                      role="menuitem"
                      onClick={() => {
                        setShowUserMenu(false);
                        setActivePage('qr');
                      }}
                    >
                      <span>⬛</span> My QR Code
                    </button>
                    <div className="pd-user-dropdown-divider" />
                    <button
                      className="pd-user-dropdown-item pd-user-dropdown-logout"
                      role="menuitem"
                      onClick={() => {
                        localStorage.removeItem('arogax2User');
                        window.location.href = '/login';
                      }}
                    >
                      <span>🚪</span> Log Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page body */}
        <main className="pd-body">

          {/* ── Profile switcher chips ── */}
          {profiles.length > 1 && (
            <div className="pd-member-chips">
              {profiles.map((profile) => (
                <button
                  key={profile.id}
                  type="button"
                  className={`pd-member-chip ${profile.id === activeProfileId ? 'active' : ''}`}
                  onClick={() => handleSwitchProfile(profile.id)}
                >
                  <span className="pd-chip-avatar">{getInitials(profile.name)}</span>
                  {profile.name}
                </button>
              ))}
            </div>
          )}

          {/* ────────────────── DASHBOARD HOME ──────────────── */}
          {activePage === 'dashboard' && (
            <div className="pd-content-view">
              {/* Welcome Banner */}
              <div className="pd-welcome">
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h1>Welcome back, {patient.name} 👋</h1>
                    <p>Here's your complete health overview for today</p>
                  </div>
                  <button
                    className="pd-btn"
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: '1.5px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(4px)' }}
                    onClick={() => setActivePage('bookAppointment')}
                  >
                    📅 Book Appointment
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="pd-stats-row">
                <div className="pd-stat-card">
                  <div className="pd-stat-icon">📅</div>
                  <div className="pd-stat-value">{myAppointments.filter(a => a.status !== 'cancelled').length}</div>
                  <div className="pd-stat-label">Upcoming Appts</div>
                </div>
                <div className="pd-stat-card">
                  <div className="pd-stat-icon">📋</div>
                  <div className="pd-stat-value">{patient.reports?.length || 0}</div>
                  <div className="pd-stat-label">Clinic Reports</div>
                </div>
                <div className="pd-stat-card">
                  <div className="pd-stat-icon">🔬</div>
                  <div className="pd-stat-value">{allLabReports.length}</div>
                  <div className="pd-stat-label">Lab Reports</div>
                </div>
                <div className="pd-stat-card">
                  <div className="pd-stat-icon">👨‍👩‍👧</div>
                  <div className="pd-stat-value">{profiles.length}</div>
                  <div className="pd-stat-label">Family Members</div>
                </div>
                <div className="pd-stat-card">
                  <div className="pd-stat-icon">🩸</div>
                  <div className="pd-stat-value" style={{ fontSize: '1.1rem' }}>{patient.bloodType || '—'}</div>
                  <div className="pd-stat-label">Blood Type</div>
                </div>
              </div>

              {/* Feature Cards */}
              <div className="pd-cards-grid">
                {featureCards.map(card => (
                  <button
                    key={card.id}
                    type="button"
                    className="pd-feature-card"
                    onClick={() => handleNavClick(card.id)}
                  >
                    <div className={`pd-card-icon-wrap ${card.color}`}>{card.icon}</div>
                    <h3>{card.label}</h3>
                    <p>{card.desc}</p>
                    <span className="pd-card-arrow">→</span>
                  </button>
                ))}
              </div>

              {/* Recent Activity */}
              <div className="pd-activity-section">
                <div className="pd-activity-header">
                  <h2>Recent Appointments</h2>
                  <button className="pd-view-all-btn" onClick={() => setActivePage('bookAppointment')}>View All</button>
                </div>
                <table className="pd-activity-table">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((item, idx) => (
                      <tr key={idx}>
                        <td>
                          <span className="pd-activity-icon">
                            <span className={`pd-activity-icon-dot ${item.type}`}>{item.icon}</span>
                            {item.label}
                          </span>
                        </td>
                        <td>
                          <span className={`pd-badge ${item.type === 'green' ? 'pd-badge-green' : item.type === 'red' ? 'pd-badge-red' : 'pd-badge-blue'}`}>
                            {item.type === 'green' ? 'Confirmed' : item.type === 'red' ? 'Cancelled' : 'Info'}
                          </span>
                        </td>
                        <td className="pd-date-text">{item.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ────────────────── QR PAGE ──────────────────────── */}
          {activePage === 'qr' && (() => {
            const qrPayload = JSON.stringify({
              patientId:   patient.id,
              name:        patient.name,
              dob:         patient.dateOfBirth,
              gender:      patient.gender,
              bloodType:   patient.bloodType,
              allergies:   patient.allergies,
              chronicIllnesses: patient.chronicIllnesses,
              emergencyContact: patient.emergencyContact,
              email:       patient.email,
              phone:       patient.phone,
              issuedBy:    'ArogyaX2',
            });

            const handleDownloadQR = () => {
              const svg = document.getElementById('patient-real-qr')?.querySelector('svg');
              if (!svg) return;
              const serializer = new XMLSerializer();
              const svgStr = serializer.serializeToString(svg);
              const blob = new Blob([svgStr], { type: 'image/svg+xml' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${patient.name.replace(/\s+/g, '_')}_QR.svg`;
              a.click();
              URL.revokeObjectURL(url);
            };

            return (
              <div className="pd-content-view">
                <div className="pd-section-header">
                  <div>
                    <h2>Patient QR Code</h2>
                    <p className="pd-section-subtitle">
                      Unique scannable identity for {patient.name} — scan to view full medical profile
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="pd-btn pd-btn-ghost" onClick={handleDownloadQR}>
                      ⬇️ Download
                    </button>
                    <button className="pd-btn pd-btn-ghost" onClick={() => setSavedMessage(`${patient.name}'s QR code is ready to show or print.`)}>
                      🖨️ Print QR
                    </button>
                  </div>
                </div>

                <div className="pd-card pd-qr-wrap">
                  {/* Real scannable QR code */}
                  <div id="patient-real-qr" className="pd-qr-box-real">
                    <QRCodeSVG
                      value={qrPayload}
                      size={192}
                      bgColor="#ffffff"
                      fgColor="#0f172a"
                      level="H"
                      includeMargin={true}
                    />
                    <p className="pd-qr-label-below">Scan with any QR reader</p>
                  </div>

                  {/* Patient info panel */}
                  <div className="pd-qr-info-panel">
                    <div className="pd-qr-info-badge">ArogyaX Patient ID</div>
                    <div className="pd-qr-info-row">
                      <span className="pd-label">Patient ID</span>
                      <span className="pd-value pd-value-mono">{patient.id}</span>
                    </div>
                    <div className="pd-qr-info-row">
                      <span className="pd-label">Full Name</span>
                      <span className="pd-value">{patient.name}</span>
                    </div>
                    <div className="pd-qr-info-row">
                      <span className="pd-label">Date of Birth</span>
                      <span className="pd-value">{patient.dateOfBirth || '—'}</span>
                    </div>
                    <div className="pd-qr-info-row">
                      <span className="pd-label">Gender</span>
                      <span className="pd-value">{patient.gender || '—'}</span>
                    </div>
                    <div className="pd-qr-info-row">
                      <span className="pd-label">Blood Type</span>
                      <span className="pd-value" style={{ color: '#dc2626', fontWeight: 700 }}>{patient.bloodType || '—'}</span>
                    </div>
                    <div className="pd-qr-info-row">
                      <span className="pd-label">Allergies</span>
                      <span className="pd-value">{patient.allergies || 'None'}</span>
                    </div>
                    <div className="pd-qr-info-row">
                      <span className="pd-label">Chronic Conditions</span>
                      <span className="pd-value">{patient.chronicIllnesses || 'None'}</span>
                    </div>
                    <p className="pd-qr-disclaimer">
                      🔒 This QR code encodes your verified medical identity. Doctors can scan it to instantly access your full health record securely through ArogyaX.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}


          {/* ────────────────── BOOK APPOINTMENT ─────────────── */}
          {activePage === 'bookAppointment' && (
            <div className="pd-content-view">
              <div className="pd-section-header">
                <div>
                  <h2>Book Appointment</h2>
                  <p className="pd-section-subtitle">Find a nearby clinic and schedule your visit</p>
                </div>
              </div>
              <BookAppointmentView />
            </div>
          )}

          {/* ────────────────── NEARBY CLINICS ────────────────── */}
          {activePage === 'nearbyClinics' && (
            <div className="pd-content-view" style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '1rem' }}>
              <div className="pd-section-header">
                <div>
                  <h2>🏥 Nearby Clinics</h2>
                  <p className="pd-section-subtitle">Find clinics close to you using interactive map search</p>
                </div>
              </div>
              <NearbyClinicsView />
            </div>
          )}

          {/* ────────────────── CLINIC REPORTS ───────────────── */}
          {activePage === 'clinicReports' && (
            <div className="pd-content-view">
              <div className="pd-section-header">
                <div>
                  <h2>{patient.name}'s Clinic Reports</h2>
                  <p className="pd-section-subtitle">
                    {filteredReports.length} medical report{filteredReports.length !== 1 ? 's' : ''} from your doctors
                  </p>
                </div>
                <input
                  className="pd-search-input"
                  type="search"
                  placeholder="Search by title, doctor, or clinic"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <div className="pd-card">
                {filteredReports.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {filteredReports.map((report) => (
                      <div
                        key={report.id}
                        style={{
                          padding: '1rem 1.25rem',
                          background: '#f8fafc',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                          borderLeft: '4px solid #2563eb',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                          <div style={{ flex: 1, minWidth: '200px' }}>
                            <h4 style={{ margin: '0 0 0.3rem', fontSize: '0.95rem', color: '#0f172a', fontWeight: 600 }}>
                              📋 {report.title}
                            </h4>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.78rem', color: '#64748b' }}>
                              {report.doctor && <span>👨‍⚕️ Dr. {report.doctor}</span>}
                              {report.clinicName && <span>🏥 {report.clinicName}</span>}
                              {report.date && <span>📅 {report.date}</span>}
                            </div>
                            {report.notes && (
                              <div style={{ marginTop: '0.6rem', padding: '0.5rem 0.75rem', backgroundColor: '#eff6ff', borderRadius: '0.4rem', fontSize: '0.8rem', color: '#1e40af', borderLeft: '3px solid #93c5fd' }}>
                                <strong>Notes:</strong> {report.notes}
                              </div>
                            )}
                          </div>
                          <span
                            style={{
                              flexShrink: 0,
                              padding: '0.2rem 0.6rem',
                              borderRadius: '999px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              backgroundColor:
                                report.type === 'Prescription' ? '#f0fdf4' :
                                report.type === 'Diagnosis' ? '#eff6ff' :
                                report.type === 'Referral' ? '#fdf4ff' :
                                report.type === 'Lab Request' ? '#fff7ed' : '#f8fafc',
                              color:
                                report.type === 'Prescription' ? '#15803d' :
                                report.type === 'Diagnosis' ? '#1d4ed8' :
                                report.type === 'Referral' ? '#7e22ce' :
                                report.type === 'Lab Request' ? '#c2410c' : '#374151',
                              border: '1px solid currentColor',
                            }}
                          >
                            {report.type || 'Report'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pd-empty">
                    <div className="pd-empty-icon">📋</div>
                    <h3>No reports yet</h3>
                    <p>No medical reports are stored for this profile. Ask your doctor to scan your QR code during your next visit.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ────────────────── LAB REPORTS ──────────────────── */}
          {activePage === 'labReports' && (
            <div className="pd-content-view">
              <div className="pd-section-header">
                <div>
                  <h2>{patient.name}'s Laboratory Reports</h2>
                  <p className="pd-section-subtitle">Diagnostic test results uploaded by your lab</p>
                </div>
                <button
                  className="pd-btn pd-btn-ghost"
                  style={{ fontSize: '0.82rem' }}
                  onClick={() => {
                    const pid = patient?.id || storedUser?.profile?.patientId || storedUser?.profileId || storedUser?.accountId;
                    if (pid) fetchLabReports(pid);
                  }}
                >
                  ↻ Refresh
                </button>
              </div>
              <div className="pd-card">
                {loadingLabReports ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: '#64748b' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
                    <p>Loading your lab reports…</p>
                  </div>
                ) : allLabReports.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {allLabReports.map((report) => (
                      <div
                        key={report.id}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '1rem 1.1rem', background: '#f8fafc', borderRadius: '10px',
                          border: '1px solid #eaecf0', gap: '1rem', flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                          <div style={{
                            width: '40px', height: '40px', borderRadius: '8px',
                            background: report.fileType === 'pdf' ? '#fff1f2' : '#f5f3ff',
                            color: report.fileType === 'pdf' ? '#dc2626' : '#6366f1',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '1.25rem', flexShrink: 0
                          }}>
                            {report.fileType === 'pdf' ? '📄' : '🖼️'}
                          </div>
                          <div>
                            <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                              {report.reportTitle}
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              <span>🔬 {report.testType}</span>
                              <span style={{ color: '#cbd5e1' }}>·</span>
                              <span style={{ color: '#3b82f6', fontWeight: 600 }}>🏥 {report.labName}</span>
                              <span style={{ color: '#cbd5e1' }}>·</span>
                              <span>📅 {report.date}</span>
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{
                            padding: '0.22rem 0.65rem', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 700,
                            background: report.status === 'Normal' ? '#dcfce7' : report.status === 'Abnormal' ? '#fee2e2' : '#fef9c3',
                            color: report.status === 'Normal' ? '#166534' : report.status === 'Abnormal' ? '#dc2626' : '#854d0e'
                          }}>
                            {report.status}
                          </span>
                          <span style={{
                            padding: '0.22rem 0.65rem', borderRadius: '20px', fontSize: '0.74rem', fontWeight: 700,
                            background: report.fileType === 'pdf' ? '#fff1f2' : '#f5f3ff',
                            color: report.fileType === 'pdf' ? '#dc2626' : '#6366f1',
                            border: `1px solid ${report.fileType === 'pdf' ? '#fecaca' : '#c4b5fd'}`
                          }}>
                            {report.fileType === 'pdf' ? '📄 PDF' : '🖼️ Image'}
                          </span>
                          <button
                            className="pd-btn pd-btn-ghost"
                            style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={async () => {
                              if (report.source === 'local' && report.fileUrl) {
                                window.open(report.fileUrl, '_blank', 'noopener,noreferrer');
                                return;
                              }

                              if (!report.raw?._id) {
                                alert('This lab report file is not available yet.');
                                return;
                              }

                              try {
                                const res = await fetch(`http://localhost:5000/api/auth/lab-report-file/${report.raw._id}`);
                                if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                                const contentType = res.headers.get('content-type');
                                if (!contentType || !contentType.includes('application/json')) throw new Error('Response is not JSON');
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
                                  throw new Error(data.message || 'Failed to load report');
                                }
                              } catch (e) { alert(`Could not open file: ${e.message}`); }
                            }}
                          >
                            👁️ View
                          </button>
                          <button
                            className="pd-btn pd-btn-ghost"
                            style={{ padding: '0.3rem 0.7rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            onClick={async () => {
                              if (report.source === 'local' && report.fileUrl) {
                                const a = document.createElement('a');
                                a.href = report.fileUrl;
                                a.download = report.reportTitle;
                                a.click();
                                return;
                              }

                              if (!report.raw?._id) {
                                alert('This lab report file is not available yet.');
                                return;
                              }

                              try {
                                const res = await fetch(`http://localhost:5000/api/auth/lab-report-file/${report.raw._id}`);
                                if (!res.ok) throw new Error(`HTTP error ${res.status}`);
                                const contentType = res.headers.get('content-type');
                                if (!contentType || !contentType.includes('application/json')) throw new Error('Response is not JSON');
                                const data = await res.json();
                                if (data.success) {
                                  const a = document.createElement('a');
                                  a.href = `data:${data.fileMimeType};base64,${data.fileData}`;
                                  a.download = data.fileName || report.reportTitle;
                                  a.click();
                                } else {
                                  throw new Error(data.message || 'Failed to download report');
                                }
                              } catch (e) { alert(`Could not download file: ${e.message}`); }
                            }}
                          >
                            ⬇️ Download
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pd-empty">
                    <div className="pd-empty-icon">🔬</div>
                    <h3>No lab reports yet</h3>
                    <p>Your laboratory will upload reports here after scanning your QR code. Show your QR code to the lab during your next visit.</p>
                    <button
                      className="pd-btn pd-btn-primary"
                      style={{ marginTop: '1rem' }}
                      onClick={() => setActivePage('qr')}
                    >
                      🔲 Show My QR Code
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ────────────────── BUY MEDICINE ─────────────────── */}
          {activePage === 'medicines' && (
            <div className="pd-content-view">
              <div className="pd-section-header">
                <div>
                  <h2>{patient.name}'s Medicines</h2>
                  <p className="pd-section-subtitle">Pharmacy – separate orders per profile</p>
                </div>
              </div>
              <div className="pd-card">
                {patient.medicines.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {patient.medicines.map((medicine) => (
                      <div key={medicine.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #eaecf0' }}>
                        <div>
                          <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.9rem' }}>{medicine.name}</h4>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{medicine.stock}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <strong style={{ fontSize: '0.9rem' }}>{medicine.price}</strong>
                          <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => handleBuyNow(medicine.name)}>Buy now</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="pd-empty">
                    <div className="pd-empty-icon">💊</div>
                    <h3>No medicines yet</h3>
                    <p>No medicines have been bought for this profile yet.</p>
                  </div>
                )}
                <p className="pd-muted" style={{ marginTop: '1rem', fontSize: '0.82rem' }}>{cartMessage}</p>
              </div>
            </div>
          )}

          {/* ────────────────── EMERGENCY ────────────────────── */}
          {activePage === 'emergency' && (
            <div className="pd-content-view">
              <div className="pd-section-header">
                <div>
                  <h2>{patient.name}'s Emergency Services</h2>
                  <p className="pd-section-subtitle">Urgent care information and contacts</p>
                </div>
                <button className="pd-btn pd-btn-danger" onClick={() => setShowEmergency(true)}>🚨 Open Help</button>
              </div>
              <div className="pd-card">
                <ul style={{ margin: 0, padding: '0 0 0 1.25rem', lineHeight: 2, color: '#334155' }}>
                  <li>Clinic emergency line: <strong>+1 555 0100</strong></li>
                  <li>Ambulance dispatch: Ready with blood type <strong>{patient.bloodType}</strong></li>
                  <li>Allergies on file: <strong>{patient.allergies}</strong></li>
                  <li>Chronic illnesses: <strong>{patient.chronicIllnesses}</strong></li>
                  <li>Emergency contact: <strong>{patient.emergencyContact || 'Not set'}</strong></li>
                </ul>
              </div>
            </div>
          )}


        </main>
      </div>

      {/* ── Modals & Overlays ──────────────────────────────── */}

      {showFamilyHub && (
        <div className="pd-overlay" onClick={() => setShowFamilyHub(false)}>
          <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Family hub</p>
                <h3>Connected family members</h3>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="pd-btn pd-btn-primary pd-btn-sm" onClick={() => setShowFamilyForm(true)}>+ Add New</button>
                <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setShowFamilyHub(false)}>Close</button>
              </div>
            </div>
            <div className="pd-family-grid">
              {profiles.map((profile) => (
                <button key={profile.id} type="button"
                  className={`pd-family-card ${profile.id === activeProfileId ? 'active' : ''}`}
                  onClick={() => handleSwitchProfile(profile.id)}
                >
                  <div className="pd-family-avatar">{getInitials(profile.name)}</div>
                  <strong>{profile.name}</strong>
                  <small>{profile.relationship}</small>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{profile.id}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}



      {showEmergency && (
        <div className="pd-overlay" onClick={() => setShowEmergency(false)}>
          <div className="pd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', color: '#dc2626', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Emergency help</p>
                <h3 style={{ margin: 0 }}>{patient.name}'s one-tap assistance</h3>
              </div>
              <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setShowEmergency(false)}>Close</button>
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 1.25rem', lineHeight: 2.2, color: '#334155' }}>
              <li>Clinic emergency line: <strong>+1 555 0100</strong></li>
              <li>Ambulance dispatch: Activated with blood type <strong>{patient.bloodType}</strong></li>
              <li>Allergies on file: <strong>{patient.allergies}</strong></li>
              <li>Chronic illnesses: <strong>{patient.chronicIllnesses}</strong></li>
              <li>Emergency contact: <strong>{patient.emergencyContact}</strong></li>
            </ul>
          </div>
        </div>
      )}

      {viewedClinicProfile && (
        <div className="pd-overlay" onClick={() => setViewedClinicProfile(null)}>
          <div className="pd-modal" style={{ width: 'min(500px, 100%)' }} onClick={(e) => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {viewedClinicProfile.isHospital ? '🏥 Hospital Profile' : '🏥 Clinic Profile'}
                </p>
                <h3 style={{ margin: 0 }}>{viewedClinicProfile.clinicName || viewedClinicProfile.hospitalName}</h3>
              </div>
              <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setViewedClinicProfile(null)}>Close</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.9rem', color: '#334155' }}>
              {viewedClinicProfile.logoUrl && (
                <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
                  <img src={viewedClinicProfile.logoUrl} alt="Logo" style={{ maxHeight: '80px', maxWidth: '100%', borderRadius: '8px' }} />
                </div>
              )}
              
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <strong>Speciality:</strong>
                <span>{viewedClinicProfile.specialityType || viewedClinicProfile.hospitalType || 'General Health'}</span>
              </div>

              {!viewedClinicProfile.isHospital && viewedClinicProfile.ownerName && (
                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                  <strong>Lead Doctor:</strong>
                  <span>{viewedClinicProfile.ownerName}</span>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <strong>Address:</strong>
                <span>{viewedClinicProfile.clinicAddress || viewedClinicProfile.address || 'N/A'}</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                <strong>Contact:</strong>
                <span>{viewedClinicProfile.phoneNumber || viewedClinicProfile.emergencyLandline || 'N/A'}</span>
              </div>

              {!viewedClinicProfile.isHospital && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <strong>Hours:</strong>
                    <span>
                      {viewedClinicProfile.morningHours && `Morning: ${viewedClinicProfile.morningHours}`}
                      {viewedClinicProfile.eveningHours && ` | Evening: ${viewedClinicProfile.eveningHours}`}
                      {!viewedClinicProfile.morningHours && !viewedClinicProfile.eveningHours && 'N/A'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <strong>Consultation Fee:</strong>
                    <span style={{ fontWeight: 600, color: '#16a34a' }}>
                      {viewedClinicProfile.consultationFee ? `$${viewedClinicProfile.consultationFee}` : 'Free / Varies'}
                    </span>
                  </div>
                </>
              )}

              {viewedClinicProfile.isHospital && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <strong>Beds Count:</strong>
                    <span>Total: {viewedClinicProfile.totalBeds || 'N/A'} | ICU: {viewedClinicProfile.icuBeds || 'N/A'}</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
                    <strong>Ambulance:</strong>
                    <span>{viewedClinicProfile.ambulanceAvailable ? '✅ Available' : '❌ Not Available'}</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button 
                className="pd-btn pd-btn-ghost" 
                onClick={() => setViewedClinicProfile(null)}
              >
                Close
              </button>
              {!viewedClinicProfile.isHospital && (
                <button 
                  className="pd-btn pd-btn-primary"
                  onClick={() => {
                    setPreSelectedClinic(viewedClinicProfile);
                    setViewedClinicProfile(null);
                    setActivePage('bookAppointment');
                  }}
                >
                  Book Appointment
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div className="pd-overlay" onClick={() => setShowProfile(false)}>
          <div className="pd-modal" style={{ width: 'min(680px,100%)', maxHeight: '90vh' }} onClick={(e) => e.stopPropagation()}>
            <div className="pd-modal-header">
              <div>
                <p style={{ margin: '0 0 0.2rem', fontSize: '0.75rem', color: '#2563eb', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Profile management</p>
                <h3 style={{ margin: 0 }}>{patient.name}'s account</h3>
              </div>
              <button className="pd-btn pd-btn-ghost pd-btn-sm" onClick={() => setShowProfile(false)}>Close</button>
            </div>

            <div className="pd-profile-sections">
              {['overview', 'contact', 'health', 'emergency'].map(sec => (
                <button key={sec} type="button"
                  className={`pd-profile-sec-card ${profileSection === sec ? 'active' : ''}`}
                  onClick={() => setProfileSection(sec)}
                >
                  <h4>{sec.charAt(0).toUpperCase() + sec.slice(1)}</h4>
                  <p>{sec === 'overview' ? 'All family members' : sec === 'contact' ? 'Phone, email, address' : sec === 'health' ? 'Blood group, allergies' : 'Emergency contacts'}</p>
                </button>
              ))}
            </div>

            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '1.25rem' }}>
              {profileSection === 'overview' && (
                <div className="pd-family-grid">
                  {profiles.map((profile) => (
                    <button key={profile.id} type="button"
                      className={`pd-family-card ${profile.id === activeProfileId ? 'active' : ''}`}
                      onClick={() => setActiveProfileId(profile.id)}
                    >
                      <div className="pd-family-avatar">{getInitials(profile.name)}</div>
                      <strong>{profile.name}</strong>
                      <small>{profile.relationship}</small>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{profile.phone || 'No phone'}</span>
                    </button>
                  ))}
                </div>
              )}

              {(profileSection === 'contact' || profileSection === 'health' || profileSection === 'emergency') && (
                <form className="pd-form" id="profile-form" onSubmit={handleSaveProfile}>
                  {profileSection === 'contact' && (<>
                    <label>Phone number<input name="phone" value={patient.phone} onChange={handleProfileChange} /></label>
                    <label>Email<input name="email" value={patient.email} onChange={handleProfileChange} /></label>
                    <label>Home address<input name="address" value={patient.address} onChange={handleProfileChange} /></label>
                  </>)}
                  {profileSection === 'health' && (<>
                    <label>Gender<input name="gender" value={patient.gender} onChange={handleProfileChange} /></label>
                    <label>Blood type<input name="bloodType" value={patient.bloodType} onChange={handleProfileChange} /></label>
                    <label>Known allergies<input name="allergies" value={patient.allergies} onChange={handleProfileChange} /></label>
                    <label>Chronic illnesses<input name="chronicIllnesses" value={patient.chronicIllnesses} onChange={handleProfileChange} /></label>
                  </>)}
                  {profileSection === 'emergency' && (<>
                    <label>Emergency contact<input name="emergencyContact" value={patient.emergencyContact} onChange={handleProfileChange} /></label>
                    <label>Preferred language<input name="preferredLanguage" value={patient.preferredLanguage || ''} onChange={handleProfileChange} /></label>
                    <label>Address<input name="address" value={patient.address} onChange={handleProfileChange} /></label>
                  </>)}
                </form>
              )}
            </div>

            {profileSection !== 'overview' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem' }}>
                <button className="pd-btn pd-btn-ghost" type="button" onClick={() => setProfileSection('overview')}>Back</button>
                <button className="pd-btn pd-btn-primary" type="submit" form="profile-form">Save changes</button>
              </div>
            )}
          </div>
        </div>
      )}

      {savedMessage && (
        <div className="pd-toast">{savedMessage}</div>
      )}
    </div>
  );
  
}

function DescriptionCard({ onClose }) {
  return (
    <div className="description-card">
      <div className="description-content">
        <p>Health overview: status, upcoming appointments, recent reports.</p>
        <p>Welcome back! Manage your care, view QR, buy medicines, and get emergency help.</p>
        <p>Click OK to access your personalized dashboard.</p>
      </div>
      <button className="primary-button" onClick={onClose}>OK</button>
    </div>
  );
}


export default PatientPage;
