import { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import arogyaXLogo from '../assets/arogyax-logo.png';
import '../styles/pages/HospitalPage.css';

const patients = [
  {
    id: 'PAT-2048',
    name: 'Ava Thompson',
    age: 31,
    phone: '+1 555 0148',
    doctor: 'Dr. Lena Ortiz',
    medicines: ['Amoxicillin 500mg', 'Vitamin D3'],
    labs: ['CBC Panel', 'Chest X-Ray'],
    timeline: [
      '09:24 QR check-in at reception',
      '09:40 Consultation with Dr. Lena Ortiz',
      '10:15 CBC Panel uploaded by ArogaX Diagnostics',
      '10:40 Medicines bought from admin inventory',
    ],
  },
  {
    id: 'PAT-3119',
    name: 'Noah Patel',
    age: 46,
    phone: '+1 555 0172',
    doctor: 'Dr. Marcus Hale',
    medicines: ['Metformin 500mg', 'Atorvastatin 10mg'],
    labs: ['HbA1c', 'Lipid Profile'],
    timeline: [
      '10:12 QR check-in at reception',
      '10:30 Consultation with Dr. Marcus Hale',
      '11:20 HbA1c lab report uploaded',
      '11:45 Pharmacy bill generated',
    ],
  },
  {
    id: 'PAT-5101',
    name: 'Mira Thompson',
    age: 57,
    phone: '+1 555 0190',
    doctor: 'Dr. Nina Park',
    medicines: ['Amlodipine 5mg'],
    labs: ['Kidney Function Test', 'Lipid Profile'],
    timeline: [
      '16:42 QR check-in yesterday',
      '17:00 Cardiology follow-up',
      '17:25 Kidney Function Test requested',
      '17:50 Follow-up appointment booked',
    ],
  },
];

const trafficData = {
  today: [18, 32, 46, 38, 54, 41],
  yesterday: [14, 25, 40, 35, 42, 30],
  week: [155, 184, 211, 176, 198, 165],
  month: [620, 742, 811, 780, 860, 904],
  year: [5900, 6400, 7100, 7600, 8214, 8900],
};

const repeatedPatients = [
  { month: 'Jan', count: 210 },
  { month: 'Feb', count: 244 },
  { month: 'Mar', count: 260 },
  { month: 'Apr', count: 238 },
  { month: 'May', count: 286 },
  { month: 'Jun', count: 315 },
  { month: 'Jul', count: 348 },
];

const appointments = [
  { id: 1, patient: 'Ethan Brooks', requested: 'Today, 2:30 PM', department: 'General Doctor', doctor: 'Dr. Lena Ortiz' },
  { id: 2, patient: 'Sara Wilson', requested: 'Tomorrow, 10:00 AM', department: 'Laboratory', doctor: 'Dr. Marcus Hale' },
  { id: 3, patient: 'Arjun Mehta', requested: 'Tomorrow, 12:15 PM', department: 'Pharmacy Follow-up', doctor: 'Dr. Nina Park' },
];

const verificationRequests = [
  { id: 1, source: 'Doctor', text: "Dr. Amit requested to change Clinic Name to 'City Care Clinic'." },
  { id: 2, source: 'Lab', text: 'ArogaX Diagnostics requested to update contact phone number.' },
  { id: 3, source: 'Doctor', text: 'Dr. Lena Ortiz requested to update schedule to 8 AM - 4 PM.' },
];

const startingInventory = [
  { id: 1, name: 'Amoxicillin 500mg', stock: 8, price: '$12', expiry: '2027-02-10' },
  { id: 2, name: 'Vitamin D3', stock: 42, price: '$8', expiry: '2028-06-01' },
  { id: 3, name: 'Metformin 500mg', stock: 16, price: '$9', expiry: '2027-11-18' },
];

const blankMedicine = { name: '', stock: '', price: '', expiry: '' };

function HospitalPage() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState('home');
  const [activePatientId, setActivePatientId] = useState(patients[0].id);
  const [patientSearch, setPatientSearch] = useState('');
  const [trafficFilter, setTrafficFilter] = useState('today');
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [handledRequests, setHandledRequests] = useState([]);
  const [inventory, setInventory] = useState(startingInventory);
  const [medicineForm, setMedicineForm] = useState(blankMedicine);
  const [notice, setNotice] = useState('');

  const [hospitalProfile, setHospitalProfile] = useState({
    hospitalName: 'AaroGyaX Central Hospital',
    adminName: 'Dr. Robert Vance',
    email: 'admin@aarogyax.com',
    phone: '+1 555 0199',
    hospitalType: 'Super Specialty Hospital',
    address: '100 Healthcare Blvd, Metro City',
    registrationNo: 'HOSP-2026-904',
    emergencyContact: '+1 555 0911',
  });

  useEffect(() => {
    const stored = localStorage.getItem('arogax2User');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.profile?.hospitalProfile?.hospitalName) {
          setHospitalProfile((prev) => ({
            ...prev,
            hospitalName: parsed.profile.hospitalProfile.hospitalName || prev.hospitalName,
            hospitalType: parsed.profile.hospitalProfile.hospitalType || prev.hospitalType,
            email: parsed.email || prev.email,
            adminName: parsed.name || prev.adminName,
          }));
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('arogax2User');
    navigate('/login');
  };

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setNotice('Hospital profile details updated successfully.');
  };

  const [empTab, setEmpTab] = useState('landing'); // 'landing' | 'add' | 'manage'
  const [addFlowStep, setAddFlowStep] = useState('select_role'); // 'select_role' | 'google_auth' | 'fill_form'
  const [googleAuthUser, setGoogleAuthUser] = useState(null); // null until authenticated via Google ID
  const [selectedRole, setSelectedRole] = useState(null); // null until category selected ('doctor' | 'nurse' | 'staff')
  const [formStep, setFormStep] = useState(1); // 1 | 2 | 3
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    if (activeMenu !== 'employees' || empTab !== 'add' || addFlowStep !== 'google_auth' || googleAuthUser) return;

    let mounted = true;
    const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '337967019231-2rvoftljiab9cqoanfralqfc3fjtr875.apps.googleusercontent.com';

    const handleGoogleCallback = (response) => {
      try {
        const token = response.credential;
        if (!token) return;
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64).split('').map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`).join('')
        );
        const profile = JSON.parse(jsonPayload);
        const userObj = {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
          picture: profile.picture || ''
        };
        setGoogleAuthUser(userObj);
        setEmployeeForm(prev => ({
          ...prev,
          email: profile.email || prev.email,
          name: profile.name || prev.name,
          photo: profile.picture || prev.photo
        }));
        setAddFlowStep('fill_form');
        setFormStep(1);
        setNotice(`Google Account Authenticated: ${profile.email}`);
      } catch (err) {
        console.error('Google Auth Parse Error:', err);
      }
    };

    const initGsi = () => {
      const gsi = window.google?.accounts?.id;
      const container = document.getElementById('add-emp-google-button');
      if (!mounted || !gsi || !container) return false;
      try {
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCallback,
          auto_select: false,
        });
        gsi.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
        });
        return true;
      } catch (e) {
        console.error('Google GSI init error:', e);
        return false;
      }
    };

    const script = document.querySelector('script[data-google-gsi]');
    if (script && window.google?.accounts?.id) {
      setTimeout(initGsi, 200);
    } else {
      const newScript = document.createElement('script');
      newScript.src = 'https://accounts.google.com/gsi/client';
      newScript.async = true;
      newScript.defer = true;
      newScript.setAttribute('data-google-gsi', 'loaded');
      newScript.onload = () => { if (mounted) setTimeout(initGsi, 200); };
      document.head.appendChild(newScript);
    }
  }, [activeMenu, empTab, addFlowStep, googleAuthUser]);

  const handleSimulateGoogleLogin = (mockEmail, mockName) => {
    const defaultEmail = selectedRole === 'doctor' 
      ? 'doctor.google@arogyax.com' 
      : selectedRole === 'nurse' 
      ? 'nurse.google@arogyax.com' 
      : 'staff.google@arogyax.com';
    const defaultName = selectedRole === 'doctor' 
      ? 'Dr. Alex Vance' 
      : selectedRole === 'nurse' 
      ? 'Nurse Clara Barton' 
      : 'Staff Officer Morgan';

    const mockUser = {
      email: mockEmail || defaultEmail,
      name: mockName || defaultName,
      googleId: `GID-${Date.now().toString().slice(-6)}`,
      picture: selectedRole === 'doctor' 
        ? 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200' 
        : selectedRole === 'nurse'
        ? 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=200'
        : 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
    };
    setGoogleAuthUser(mockUser);
    setEmployeeForm(prev => ({
      ...prev,
      email: mockUser.email,
      name: mockUser.name,
      photo: mockUser.picture
    }));
    setAddFlowStep('fill_form');
    setFormStep(1);
    setNotice(`Google Account Authenticated: ${mockUser.email}`);
  };

  const selectPositionRole = (role) => {
    setSelectedRole(role);
    setEmployeeForm(prev => ({
      ...prev,
      role: role,
      department: role === 'doctor' ? 'Cardiology' : role === 'nurse' ? 'ICU & Emergency' : 'Reception & Billing'
    }));
    setGoogleAuthUser(null);
    setFormStep(1);
    setFormErrors({});
    setNotice('');
    setAddFlowStep('google_auth');
  };

  const [employees, setEmployees] = useState([
    {
      _id: 'emp-101',
      hospitalId: 'HOSP-2026-904',
      hospitalName: 'AaroGyaX Central Hospital',
      email: 'marcus.hale@arogyax.com',
      name: 'Dr. Marcus Hale',
      phone: '+1 555 0172',
      gender: 'Male',
      dob: '1982-04-14',
      address: '42 Medical Arts Plaza, Metro City',
      joiningDate: '2021-03-15',
      role: 'doctor',
      department: 'Cardiology',
      photo: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=200',
      emergencyContact: '+1 555 9110',
      specialization: 'Cardiologist',
      medicalLicenseNo: 'MED-LIC-98401',
      qualification: 'MD, FACC',
      experienceYears: '12 Years',
      consultationTimings: '09:00 AM - 02:00 PM',
      consultationFees: '$120',
      status: 'Active'
    },
    {
      _id: 'emp-102',
      hospitalId: 'HOSP-2026-904',
      hospitalName: 'AaroGyaX Central Hospital',
      email: 'ortiz@arogyax.com',
      name: 'Dr. Lena Ortiz',
      phone: '+1 555 0148',
      gender: 'Female',
      dob: '1988-09-22',
      address: '108 Healthcare Ave, Metro City',
      joiningDate: '2022-01-10',
      role: 'doctor',
      department: 'General Medicine',
      photo: 'https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=200',
      emergencyContact: '+1 555 9112',
      specialization: 'Internal Medicine',
      medicalLicenseNo: 'MED-LIC-44102',
      qualification: 'MBBS, MD',
      experienceYears: '8 Years',
      consultationTimings: '08:00 AM - 04:00 PM',
      consultationFees: '$90',
      status: 'Active'
    },
    {
      _id: 'emp-103',
      hospitalId: 'HOSP-2026-904',
      hospitalName: 'AaroGyaX Central Hospital',
      email: 'sarah.j@arogyax.com',
      name: 'Sarah Jenkins',
      phone: '+1 555 0199',
      gender: 'Female',
      dob: '1992-06-18',
      address: '15 Hope Lane, Metro City',
      joiningDate: '2023-06-01',
      role: 'nurse',
      department: 'ICU & Emergency',
      photo: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=200',
      emergencyContact: '+1 555 9115',
      nursingRegNo: 'NUR-REG-7701',
      assignedWard: 'ICU Ward 2',
      shiftTimings: '07:00 PM - 07:00 AM (Night Shift)',
      nurseExperience: '6 Years',
      status: 'Active'
    },
    {
      _id: 'emp-104',
      hospitalId: 'HOSP-2026-904',
      hospitalName: 'AaroGyaX Central Hospital',
      email: 'prakash.k@arogyax.com',
      name: 'Prakash Kumar',
      phone: '+1 555 0133',
      gender: 'Male',
      dob: '1990-11-05',
      address: '77 Civic Center Dr, Metro City',
      joiningDate: '2024-02-01',
      role: 'staff',
      department: 'Reception & Billing',
      photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      emergencyContact: '+1 555 9118',
      designation: 'Receptionist',
      responsibilities: 'Patient check-in, appointments scheduling, initial query resolution',
      employeeId: 'STF-2026-809',
      status: 'Active'
    }
  ]);

  const defaultFormState = {
    name: '',
    email: '',
    phone: '',
    gender: 'Male',
    dob: '',
    address: '',
    joiningDate: new Date().toISOString().split('T')[0],
    department: 'Cardiology',
    photo: '',
    emergencyContact: '',
    role: 'doctor',

    specialization: '',
    medicalLicenseNo: '',
    qualification: '',
    experienceYears: '',
    consultationTimings: '09:00 AM - 05:00 PM',
    consultationFees: '$100',

    nursingRegNo: '',
    assignedWard: 'ICU Ward 1',
    shiftTimings: 'Day Shift (07 AM - 03 PM)',
    nurseExperience: '3 Years',

    designation: 'Receptionist',
    responsibilities: 'Managing patient registration desk and general assistance',
    employeeId: '',
    status: 'Active'
  };

  const [employeeForm, setEmployeeForm] = useState(defaultFormState);

  // Filters, sorting, pagination state
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeRoleFilter, setEmployeeRoleFilter] = useState('all');
  const [employeeDeptFilter, setEmployeeDeptFilter] = useState('all');
  const [employeeSortBy, setEmployeeSortBy] = useState('name-asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

  // Modal dialog states
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null);

  const validateStep = (step) => {
    let errors = {};
    if (step === 1) {
      if (!employeeForm.name.trim()) errors.name = 'Full Name is required';
      if (!employeeForm.email.trim()) errors.email = 'Email Address is required';
      if (!employeeForm.phone.trim()) errors.phone = 'Phone Number is required';
      if (!employeeForm.gender) errors.gender = 'Gender is required';
      if (!employeeForm.dob) errors.dob = 'Date of Birth is required';
      if (!employeeForm.address.trim()) errors.address = 'Address is required';
      if (!employeeForm.joiningDate) errors.joiningDate = 'Joining Date is required';
      if (!employeeForm.department.trim()) errors.department = 'Department is required';
      if (!employeeForm.emergencyContact.trim()) errors.emergencyContact = 'Emergency Contact is required';
    } else if (step === 2) {
      if (selectedRole === 'doctor') {
        if (!employeeForm.specialization.trim()) errors.specialization = 'Doctor Specialization is required';
        if (!employeeForm.medicalLicenseNo.trim()) errors.medicalLicenseNo = 'Medical License Number is required';
        if (!employeeForm.qualification.trim()) errors.qualification = 'Qualification is required';
        if (!employeeForm.experienceYears.trim()) errors.experienceYears = 'Years of Experience is required';
        if (!employeeForm.consultationTimings.trim()) errors.consultationTimings = 'Consultation Timings are required';
        if (!employeeForm.consultationFees.trim()) errors.consultationFees = 'Consultation Fees are required';
      } else if (selectedRole === 'nurse') {
        if (!employeeForm.nursingRegNo.trim()) errors.nursingRegNo = 'Nursing Registration Number is required';
        if (!employeeForm.assignedWard.trim()) errors.assignedWard = 'Assigned Ward is required';
        if (!employeeForm.shiftTimings.trim()) errors.shiftTimings = 'Shift Timings are required';
        if (!employeeForm.nurseExperience.trim()) errors.nurseExperience = 'Experience is required';
      } else if (selectedRole === 'staff') {
        if (!employeeForm.designation.trim()) errors.designation = 'Designation is required';
        if (!employeeForm.responsibilities.trim()) errors.responsibilities = 'Responsibilities description is required';
      }
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNextStep = (e) => {
    if (e) e.preventDefault();
    if (validateStep(formStep)) {
      if (formStep < 3) {
        setFormStep(prev => prev + 1);
        setNotice('');
      }
    } else {
      setNotice('Please complete all required fields for this step before continuing.');
    }
  };

  const handlePrevStep = () => {
    if (formStep > 1) {
      setFormStep(prev => prev - 1);
      setNotice('');
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/auth/hospital-employees?hospitalId=${hospitalProfile.registrationNo}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.employees && data.employees.length > 0) {
          setEmployees(data.employees);
        }
      }
    } catch (err) {
      console.error("Error fetching employees:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [hospitalProfile.registrationNo]);

  const handleEmployeeSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(1) || !validateStep(2)) {
      setNotice('Please ensure all required fields across all steps are filled correctly.');
      return;
    }

    const payload = {
      ...employeeForm,
      role: selectedRole
    };

    try {
      const res = await fetch('http://localhost:5000/api/auth/hospital-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospitalProfile.registrationNo,
          hospitalName: hospitalProfile.hospitalName,
          employee: payload
        })
      });
      const data = await res.json();
      if (data.success && data.employee) {
        setNotice(`Employee ${payload.name} (${selectedRole.toUpperCase()}) successfully registered & associated with ${hospitalProfile.hospitalName}!`);
        fetchEmployees();
      } else {
        setEmployees(prev => [{ _id: `emp-${Date.now()}`, ...payload }, ...prev]);
        setNotice(`Employee ${payload.name} saved to local hospital record.`);
      }
    } catch (err) {
      setEmployees(prev => [{ _id: `emp-${Date.now()}`, ...payload }, ...prev]);
      setNotice(`Employee ${payload.name} registered.`);
    }

    setEmployeeForm(defaultFormState);
    setFormStep(1);
    setFormErrors({});
    setEmpTab('manage');
  };

  const handleToggleStatus = async (emp) => {
    const newStatus = emp.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`http://localhost:5000/api/auth/hospital-employee/${emp._id || emp.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setNotice(data.message || `Status for ${emp.name} updated to ${newStatus}.`);
      }
    } catch (err) {
      setNotice(`Status for ${emp.name} updated to ${newStatus}.`);
    }
    setEmployees(prev => prev.map(e => (e._id === emp._id || e.id === emp.id ? { ...e, status: newStatus } : e)));
  };

  const handleSaveEditedEmployee = async (e) => {
    e.preventDefault();
    if (!editingEmployee || !editingEmployee.name || !editingEmployee.email) return;

    try {
      const res = await fetch(`http://localhost:5000/api/auth/hospital-employee/${editingEmployee._id || editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingEmployee)
      });
      if (res.ok) {
        const data = await res.json();
        setNotice(data.message || `Details updated for ${editingEmployee.name}.`);
      }
    } catch (err) {
      setNotice(`Employee details for ${editingEmployee.name} updated.`);
    }
    setEmployees(prev => prev.map(e => (e._id === editingEmployee._id || e.id === editingEmployee.id ? editingEmployee : e)));
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = async (id) => {
    try {
      await fetch(`http://localhost:5000/api/auth/hospital-employee/${id}`, {
        method: 'DELETE'
      });
      setNotice('Employee record removed successfully.');
    } catch (err) {
      setNotice('Employee record deleted locally.');
    }
    setEmployees(prev => prev.filter(e => e._id !== id && e.id !== id));
    setDeletingEmployeeId(null);
  };

  const uniqueDepartments = useMemo(() => {
    const depts = new Set(employees.map(e => e.department).filter(Boolean));
    return Array.from(depts);
  }, [employees]);

  const processedEmployees = useMemo(() => {
    let result = employees.filter(emp => {
      const query = employeeSearch.toLowerCase().trim();
      const matchSearch = !query ||
        (emp.name || '').toLowerCase().includes(query) ||
        (emp.email || '').toLowerCase().includes(query) ||
        (emp.phone || '').toLowerCase().includes(query) ||
        (emp.department || '').toLowerCase().includes(query) ||
        (emp.designation || '').toLowerCase().includes(query) ||
        (emp.specialization || '').toLowerCase().includes(query);

      const matchRole = employeeRoleFilter === 'all' || emp.role === employeeRoleFilter;
      const matchDept = employeeDeptFilter === 'all' || emp.department === employeeDeptFilter;

      return matchSearch && matchRole && matchDept;
    });

    result.sort((a, b) => {
      if (employeeSortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (employeeSortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (employeeSortBy === 'date-desc') return new Date(b.joiningDate || 0) - new Date(a.joiningDate || 0);
      if (employeeSortBy === 'date-asc') return new Date(a.joiningDate || 0) - new Date(b.joiningDate || 0);
      if (employeeSortBy === 'dept') return (a.department || '').localeCompare(b.department || '');
      return 0;
    });

    return result;
  }, [employees, employeeSearch, employeeRoleFilter, employeeDeptFilter, employeeSortBy]);

  const totalPages = Math.ceil(processedEmployees.length / itemsPerPage) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedEmployees.slice(start, start + itemsPerPage);
  }, [processedEmployees, currentPage, itemsPerPage]);

  const activePatient = patients.find((patient) => patient.id === activePatientId) || patients[0];
  const filteredPatients = patients.filter((patient) => {
    const searchValue = patientSearch.toLowerCase();
    return patient.name.toLowerCase().includes(searchValue) || patient.id.toLowerCase().includes(searchValue);
  });

  const trafficPath = useMemo(() => {
    const points = trafficData[trafficFilter];
    const max = Math.max(...points);
    const min = Math.min(...points);
    return points
      .map((value, index) => {
        const x = 20 + index * 46;
        const y = 125 - ((value - min) / Math.max(max - min, 1)) * 85;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [trafficFilter]);

  const approveAppointment = (id, doctor) => {
    setApprovedAppointments((current) => [...current, id]);
    setNotice(`Appointment approved and assigned to ${doctor}'s queue.`);
  };

  const handleVerification = (id, action) => {
    setHandledRequests((current) => [...current, id]);
    setNotice(action === 'approve' ? 'Profile update approved and pushed live.' : 'Profile update rejected. Old data remains locked.');
  };

  const handleMedicineChange = (event) => {
    const { name, value } = event.target;
    setMedicineForm((current) => ({ ...current, [name]: value }));
  };

  const addMedicine = (event) => {
    event.preventDefault();
    setInventory((current) => [
      { id: Date.now(), name: medicineForm.name, stock: Number(medicineForm.stock), price: medicineForm.price, expiry: medicineForm.expiry },
      ...current,
    ]);
    setMedicineForm(blankMedicine);
    setNotice('Medicine added to the patient shop inventory.');
  };

  return (
    <div className="hospital-dashboard">
      <aside className="clinic-sidebar hospital-sidebar">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem', paddingLeft: '0.25rem' }}>
          <img src={arogyaXLogo} alt="ArogyaX Logo" style={{ height: '46px', width: 'auto', objectFit: 'contain', alignSelf: 'flex-start' }} />
          <div>
            <p className="section-kicker" style={{ margin: '0.25rem 0 0 0' }}>AarogyaX Central</p>
            <h2>Hospital Admin</h2>
          </div>
        </div>
        <button className={`nav-link ${activeMenu === 'home' ? 'active' : ''}`} onClick={() => setActiveMenu('home')}>Dashboard Home</button>
        <button className={`nav-link ${activeMenu === 'employees' ? 'active' : ''}`} onClick={() => setActiveMenu('employees')}>Employee Management</button>
        <button className={`nav-link ${activeMenu === 'profile' ? 'active' : ''}`} onClick={() => setActiveMenu('profile')}>Manage Profile</button>
        <button className={`nav-link ${activeMenu === 'analyzer' ? 'active' : ''}`} onClick={() => setActiveMenu('analyzer')}>Hospital Analyzer</button>
        <button className={`nav-link ${activeMenu === 'patients' ? 'active' : ''}`} onClick={() => setActiveMenu('patients')}>Patient Directory</button>
        <button className={`nav-link ${activeMenu === 'appointments' ? 'active' : ''}`} onClick={() => setActiveMenu('appointments')}>Appointment Requests</button>
        <button className={`nav-link ${activeMenu === 'inventory' ? 'active' : ''}`} onClick={() => setActiveMenu('inventory')}>Medicine Inventory</button>
        <button className={`nav-link ${activeMenu === 'verification' ? 'active' : ''}`} onClick={() => setActiveMenu('verification')}>Verification Desk</button>

        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
          <button className="nav-link logout-nav-link" onClick={handleLogout}>Log Out</button>
        </div>
      </aside>

      <main className="clinic-main">
        {notice && <p className="save-message">{notice}</p>}

        {activeMenu === 'employees' && (
          <section className="hospital-workspace">
            {/* Main Toggle Navigation Bar */}
            <div className="emp-main-toggle-bar">
              <button
                type="button"
                className={`emp-toggle-btn ${empTab === 'landing' ? 'active' : ''}`}
                onClick={() => { setEmpTab('landing'); setAddFlowStep('select_role'); setNotice(''); }}
              >
                <span>🏠</span> Overview
              </button>
              <button
                type="button"
                className={`emp-toggle-btn ${empTab === 'add' ? 'active' : ''}`}
                onClick={() => { setEmpTab('add'); setAddFlowStep('select_role'); setSelectedRole(null); setGoogleAuthUser(null); setNotice(''); setFormErrors({}); }}
              >
                <span>➕</span> Add Employee
              </button>
              <button
                type="button"
                className={`emp-toggle-btn ${empTab === 'manage' ? 'active' : ''}`}
                onClick={() => { setEmpTab('manage'); setNotice(''); }}
              >
                <span>👥</span> Manage Employees <span className="emp-count-pill">{employees.length}</span>
              </button>
            </div>

            {/* ==================== SCREEN 1: LANDING VIEW (FIRSTLY ONLY SHOW 2 OPTIONS) ==================== */}
            {empTab === 'landing' && (
              <article className="dashboard-card emp-landing-card" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                <div style={{ maxWidth: '650px', margin: '0 auto 2.5rem' }}>
                  <span style={{ fontSize: '3rem', display: 'block', marginBottom: '0.75rem' }}>🏥</span>
                  <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>Hospital Employee Management</h2>
                  <p style={{ color: '#64748b', fontSize: '1.05rem', lineHeight: 1.6 }}>
                    Welcome to the central workforce portal. Please select an option below to proceed.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.75rem', maxWidth: '850px', margin: '0 auto' }}>
                  {/* Option 1: Add Employee */}
                  <div 
                    className="emp-landing-option-card"
                    onClick={() => { setEmpTab('add'); setAddFlowStep('select_role'); setSelectedRole(null); setGoogleAuthUser(null); setNotice(''); }}
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)',
                      border: '2px solid #0284c7',
                      borderRadius: '1.25rem',
                      padding: '2.25rem 1.75rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 20px rgba(2, 132, 199, 0.08)'
                    }}
                  >
                    <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: '#e0f2fe', color: '#0284c7', fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                      ➕
                    </div>
                    <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', marginBottom: '0.5rem' }}>Add Employee</h3>
                    <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                      Register a new Doctor, Staff member, or Nurse. Authenticate with Google login and fill out position profile details.
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7', fontWeight: 700, fontSize: '0.95rem' }}>
                      Click to Add Employee →
                    </div>
                  </div>

                  {/* Option 2: Manage Employee */}
                  <div 
                    className="emp-landing-option-card"
                    onClick={() => { setEmpTab('manage'); setNotice(''); }}
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                      border: '2px solid #cbd5e1',
                      borderRadius: '1.25rem',
                      padding: '2.25rem 1.75rem',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)'
                    }}
                  >
                    <div style={{ width: '56px', height: '56px', borderRadius: '1rem', background: '#f1f5f9', color: '#334155', fontSize: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                      👥
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Manage Employee</h3>
                      <span style={{ background: '#0284c7', color: '#fff', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
                        {employees.length} Active
                      </span>
                    </div>
                    <p style={{ color: '#475569', fontSize: '0.925rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
                      View employee directory, edit credentials, toggle active status, search and filter personnel.
                    </p>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: '#0f172a', fontWeight: 700, fontSize: '0.95rem' }}>
                      Click to Manage Employees →
                    </div>
                  </div>
                </div>
              </article>
            )}

            {/* ==================== SCREEN 2: ADD EMPLOYEE FLOW ==================== */}
            {empTab === 'add' && (
              <>
                {/* STEP A: SELECT POSITION ROLE (DOCTOR, STAFF, OR NURSE) */}
                {addFlowStep === 'select_role' && (
                  <article className="dashboard-card emp-add-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setEmpTab('landing')} 
                        style={{ padding: '0.45rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        ← Back to Options
                      </button>
                      <span className="badge subtle">Step 1 of 3: Role Selection</span>
                    </div>

                    <div className="card-heading" style={{ marginBottom: '1.5rem' }}>
                      <div>
                        <p className="section-kicker">New Employee Registration</p>
                        <h3>Select Employee Position</h3>
                      </div>
                    </div>

                    <div className="position-select-container">
                      <p className="position-select-label" style={{ fontSize: '1rem', marginBottom: '1rem', color: '#334155', fontWeight: 700 }}>
                        Click one of the three options below to choose employee position:
                      </p>
                      <div className="position-cards-grid">
                        <div
                          className={`position-card ${selectedRole === 'doctor' ? 'selected' : ''}`}
                          onClick={() => selectPositionRole('doctor')}
                        >
                          <div className="position-icon">🩺</div>
                          <div>
                            <strong>Doctor</strong>
                            <small>Specialists, Surgeons & Consultants</small>
                          </div>
                        </div>
                        <div
                          className={`position-card ${selectedRole === 'staff' ? 'selected' : ''}`}
                          onClick={() => selectPositionRole('staff')}
                        >
                          <div className="position-icon">👤</div>
                          <div>
                            <strong>Staff</strong>
                            <small>Reception, Lab, Pharmacy & Admin</small>
                          </div>
                        </div>
                        <div
                          className={`position-card ${selectedRole === 'nurse' ? 'selected' : ''}`}
                          onClick={() => selectPositionRole('nurse')}
                        >
                          <div className="position-icon">💉</div>
                          <div>
                            <strong>Nurse</strong>
                            <small>Staff Nurses & Ward Supervisors</small>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )}

                {/* STEP B: GOOGLE AUTHENTICATION LOGIN */}
                {addFlowStep === 'google_auth' && (
                  <article className="dashboard-card emp-add-card" style={{ maxWidth: '650px', margin: '0 auto', padding: '2.5rem 2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <button 
                        type="button" 
                        onClick={() => setAddFlowStep('select_role')} 
                        style={{ padding: '0.45rem 0.9rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: '#fff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        ← Back to Position Selection
                      </button>
                      <span className="badge primary" style={{ textTransform: 'uppercase', fontWeight: 700, padding: '0.35rem 0.75rem', borderRadius: '999px', background: '#e0f2fe', color: '#0284c7' }}>
                        Role: {selectedRole}
                      </span>
                    </div>

                    <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f0f9ff', color: '#0284c7', fontSize: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', border: '2px solid #bae6fd' }}>
                        🔑
                      </div>
                      <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '0.5rem' }}>
                        Google Login Required
                      </h3>
                      <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '2rem' }}>
                        To proceed with registering a <strong>{selectedRole?.toUpperCase()}</strong>, please authenticate with Google Login to verify identity and auto-fill official credentials.
                      </p>

                      {/* Real Google GSI Sign In Button Container */}
                      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                        <div id="add-emp-google-button" />
                      </div>

                      <div style={{ margin: '1.75rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>OR DEMO AUTHENTICATION</span>
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
                      </div>

                      {/* Quick Simulation Login Button */}
                      <button
                        type="button"
                        onClick={() => handleSimulateGoogleLogin()}
                        style={{
                          width: '100%',
                          padding: '0.85rem 1.25rem',
                          background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '0.75rem',
                          fontWeight: 700,
                          fontSize: '0.95rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justify: 'center',
                          gap: '0.75rem',
                          boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>🌐</span> Continue with Google (Demo Auto-Fill)
                      </button>
                    </div>
                  </article>
                )}

                {/* STEP C: FILL FORM BASED ON POSITION */}
                {addFlowStep === 'fill_form' && (
                  <article className="dashboard-card emp-add-card">
                    {/* Google Verified Account Notification Banner */}
                    {googleAuthUser && (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '0.85rem 1.25rem', borderRadius: '0.85rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {googleAuthUser.picture ? (
                            <img src={googleAuthUser.picture} alt="Google Profile" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ fontSize: '1.25rem' }}>✅</span>
                          )}
                          <div>
                            <strong style={{ display: 'block', color: '#166534', fontSize: '0.9rem' }}>Google Identity Verified</strong>
                            <small style={{ color: '#15803d' }}>{googleAuthUser.name} ({googleAuthUser.email})</small>
                          </div>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setAddFlowStep('google_auth')}
                          style={{ background: 'transparent', border: 'none', color: '#166534', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Change Account
                        </button>
                      </div>
                    )}

                    <div className="card-heading">
                      <div>
                        <p className="section-kicker">Multi-Step Registration Form</p>
                        <h3>Fill {selectedRole?.toUpperCase()} Profile Details</h3>
                      </div>
                      <span className="badge subtle" style={{ textTransform: 'capitalize' }}>
                        Category: {selectedRole}
                      </span>
                    </div>

                    {/* Stepper Progress Bar */}
                    <div className="form-steps-progress">
                      <div className={`step-item ${formStep >= 1 ? 'active' : ''} ${formStep > 1 ? 'completed' : ''}`}>
                        <div className="step-number">{formStep > 1 ? '✓' : '1'}</div>
                        <span className="step-title">1. Common Details</span>
                      </div>
                      <div className="step-line" />
                      <div className={`step-item ${formStep >= 2 ? 'active' : ''} ${formStep > 2 ? 'completed' : ''}`}>
                        <div className="step-number">{formStep > 2 ? '✓' : '2'}</div>
                        <span className="step-title">2. {selectedRole === 'doctor' ? 'Doctor Credentials' : selectedRole === 'nurse' ? 'Nursing Registration' : 'Role Specifications'}</span>
                      </div>
                      <div className="step-line" />
                      <div className={`step-item ${formStep >= 3 ? 'active' : ''}`}>
                        <div className="step-number">3</div>
                        <span className="step-title">3. Review & Submit</span>
                      </div>
                    </div>

                {/* Multi-Step Form */}
                <form className="profile-form emp-step-form" onSubmit={formStep === 3 ? handleEmployeeSubmit : handleNextStep}>
                  
                  {/* STEP 1: Common Employee Details */}
                  {formStep === 1 && (
                    <div className="step-content-pane">
                      <div className="step-pane-header">
                        <h4>Step 1: Common Personal & Contact Details</h4>
                        <p>Provide primary identity, contact, department, and emergency contact details for the employee.</p>
                      </div>
                      <div className="form-grid-2">
                        <label>
                          Full Name *
                          <input
                            type="text"
                            placeholder="e.g. Dr. Marcus Hale or Nurse Sarah Jenkins"
                            value={employeeForm.name}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                            style={{ borderColor: formErrors.name ? '#ef4444' : undefined }}
                          />
                          {formErrors.name && <small style={{ color: '#ef4444' }}>{formErrors.name}</small>}
                        </label>

                        <label>
                          Email Address * (Used for login & pairing)
                          <input
                            type="email"
                            placeholder="e.g. employee@arogyax.com"
                            value={employeeForm.email}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                            style={{ borderColor: formErrors.email ? '#ef4444' : undefined }}
                          />
                          {formErrors.email && <small style={{ color: '#ef4444' }}>{formErrors.email}</small>}
                        </label>

                        <label>
                          Phone Number *
                          <input
                            type="text"
                            placeholder="e.g. +1 555 0199"
                            value={employeeForm.phone}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
                            style={{ borderColor: formErrors.phone ? '#ef4444' : undefined }}
                          />
                          {formErrors.phone && <small style={{ color: '#ef4444' }}>{formErrors.phone}</small>}
                        </label>

                        <label>
                          Gender *
                          <select
                            className="filter-select"
                            value={employeeForm.gender}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, gender: e.target.value })}
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>

                        <label>
                          Date of Birth *
                          <input
                            type="date"
                            value={employeeForm.dob}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, dob: e.target.value })}
                            style={{ borderColor: formErrors.dob ? '#ef4444' : undefined }}
                          />
                          {formErrors.dob && <small style={{ color: '#ef4444' }}>{formErrors.dob}</small>}
                        </label>

                        <label>
                          Joining Date *
                          <input
                            type="date"
                            value={employeeForm.joiningDate}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, joiningDate: e.target.value })}
                            style={{ borderColor: formErrors.joiningDate ? '#ef4444' : undefined }}
                          />
                          {formErrors.joiningDate && <small style={{ color: '#ef4444' }}>{formErrors.joiningDate}</small>}
                        </label>

                        <label>
                          Department *
                          <input
                            type="text"
                            placeholder="e.g. Cardiology, ICU, Reception, Pharmacy"
                            value={employeeForm.department}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, department: e.target.value })}
                            style={{ borderColor: formErrors.department ? '#ef4444' : undefined }}
                          />
                          {formErrors.department && <small style={{ color: '#ef4444' }}>{formErrors.department}</small>}
                        </label>

                        <label>
                          Emergency Contact Number *
                          <input
                            type="text"
                            placeholder="e.g. +1 555 9110"
                            value={employeeForm.emergencyContact}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, emergencyContact: e.target.value })}
                            style={{ borderColor: formErrors.emergencyContact ? '#ef4444' : undefined }}
                          />
                          {formErrors.emergencyContact && <small style={{ color: '#ef4444' }}>{formErrors.emergencyContact}</small>}
                        </label>

                        <label style={{ gridColumn: 'span 2' }}>
                          Address *
                          <input
                            type="text"
                            placeholder="e.g. 42 Medical Arts Plaza, Metro City"
                            value={employeeForm.address}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, address: e.target.value })}
                            style={{ borderColor: formErrors.address ? '#ef4444' : undefined }}
                          />
                          {formErrors.address && <small style={{ color: '#ef4444' }}>{formErrors.address}</small>}
                        </label>

                        <label style={{ gridColumn: 'span 2' }}>
                          Profile Photo URL (Optional)
                          <input
                            type="url"
                            placeholder="e.g. https://images.unsplash.com/photo-..."
                            value={employeeForm.photo}
                            onChange={(e) => setEmployeeForm({ ...employeeForm, photo: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: Category Tailored Fields */}
                  {formStep === 2 && (
                    <div className="step-content-pane">
                      <div className="step-pane-header">
                        <h4>Step 2: Professional Specifications for {selectedRole.toUpperCase()}</h4>
                        <p>Configure credentials, licenses, timings, and department assignments tailored for {selectedRole}.</p>
                      </div>

                      {/* Doctor Category Fields */}
                      {selectedRole === 'doctor' && (
                        <div className="form-grid-2">
                          <label>
                            Specialization *
                            <input
                              type="text"
                              placeholder="e.g. Senior Cardiologist, MD Physician"
                              value={employeeForm.specialization}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, specialization: e.target.value })}
                              style={{ borderColor: formErrors.specialization ? '#ef4444' : undefined }}
                            />
                            {formErrors.specialization && <small style={{ color: '#ef4444' }}>{formErrors.specialization}</small>}
                          </label>

                          <label>
                            Medical License Number *
                            <input
                              type="text"
                              placeholder="e.g. MED-LIC-98401"
                              value={employeeForm.medicalLicenseNo}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, medicalLicenseNo: e.target.value })}
                              style={{ borderColor: formErrors.medicalLicenseNo ? '#ef4444' : undefined }}
                            />
                            {formErrors.medicalLicenseNo && <small style={{ color: '#ef4444' }}>{formErrors.medicalLicenseNo}</small>}
                          </label>

                          <label>
                            Qualification *
                            <input
                              type="text"
                              placeholder="e.g. MBBS, MD, FACC, MS"
                              value={employeeForm.qualification}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, qualification: e.target.value })}
                              style={{ borderColor: formErrors.qualification ? '#ef4444' : undefined }}
                            />
                            {formErrors.qualification && <small style={{ color: '#ef4444' }}>{formErrors.qualification}</small>}
                          </label>

                          <label>
                            Years of Experience *
                            <input
                              type="text"
                              placeholder="e.g. 10 Years"
                              value={employeeForm.experienceYears}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, experienceYears: e.target.value })}
                              style={{ borderColor: formErrors.experienceYears ? '#ef4444' : undefined }}
                            />
                            {formErrors.experienceYears && <small style={{ color: '#ef4444' }}>{formErrors.experienceYears}</small>}
                          </label>

                          <label>
                            Consultation Timings *
                            <input
                              type="text"
                              placeholder="e.g. 09:00 AM - 02:00 PM"
                              value={employeeForm.consultationTimings}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, consultationTimings: e.target.value })}
                              style={{ borderColor: formErrors.consultationTimings ? '#ef4444' : undefined }}
                            />
                            {formErrors.consultationTimings && <small style={{ color: '#ef4444' }}>{formErrors.consultationTimings}</small>}
                          </label>

                          <label>
                            Consultation Fees *
                            <input
                              type="text"
                              placeholder="e.g. $120 / ₹1000"
                              value={employeeForm.consultationFees}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, consultationFees: e.target.value })}
                              style={{ borderColor: formErrors.consultationFees ? '#ef4444' : undefined }}
                            />
                            {formErrors.consultationFees && <small style={{ color: '#ef4444' }}>{formErrors.consultationFees}</small>}
                          </label>
                        </div>
                      )}

                      {/* Nurse Category Fields */}
                      {selectedRole === 'nurse' && (
                        <div className="form-grid-2">
                          <label>
                            Nursing Registration Number *
                            <input
                              type="text"
                              placeholder="e.g. NUR-REG-7701"
                              value={employeeForm.nursingRegNo}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, nursingRegNo: e.target.value })}
                              style={{ borderColor: formErrors.nursingRegNo ? '#ef4444' : undefined }}
                            />
                            {formErrors.nursingRegNo && <small style={{ color: '#ef4444' }}>{formErrors.nursingRegNo}</small>}
                          </label>

                          <label>
                            Assigned Ward / Department *
                            <input
                              type="text"
                              placeholder="e.g. ICU Ward 2, OPD Emergency"
                              value={employeeForm.assignedWard}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, assignedWard: e.target.value })}
                              style={{ borderColor: formErrors.assignedWard ? '#ef4444' : undefined }}
                            />
                            {formErrors.assignedWard && <small style={{ color: '#ef4444' }}>{formErrors.assignedWard}</small>}
                          </label>

                          <label>
                            Shift Timings *
                            <input
                              type="text"
                              placeholder="e.g. 07:00 PM - 07:00 AM (Night Shift)"
                              value={employeeForm.shiftTimings}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, shiftTimings: e.target.value })}
                              style={{ borderColor: formErrors.shiftTimings ? '#ef4444' : undefined }}
                            />
                            {formErrors.shiftTimings && <small style={{ color: '#ef4444' }}>{formErrors.shiftTimings}</small>}
                          </label>

                          <label>
                            Nursing Experience *
                            <input
                              type="text"
                              placeholder="e.g. 5 Years"
                              value={employeeForm.nurseExperience}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, nurseExperience: e.target.value })}
                              style={{ borderColor: formErrors.nurseExperience ? '#ef4444' : undefined }}
                            />
                            {formErrors.nurseExperience && <small style={{ color: '#ef4444' }}>{formErrors.nurseExperience}</small>}
                          </label>
                        </div>
                      )}

                      {/* Staff Category Fields */}
                      {selectedRole === 'staff' && (
                        <div className="form-grid-2">
                          <label>
                            Selected Designation *
                            <select
                              className="filter-select"
                              value={employeeForm.designation}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, designation: e.target.value })}
                            >
                              <option value="Receptionist">Receptionist</option>
                              <option value="Lab Technician">Lab Technician</option>
                              <option value="Pharmacist">Pharmacist</option>
                              <option value="Accountant">Accountant</option>
                              <option value="Administrator">Administrator</option>
                              <option value="Security Officer">Security Officer</option>
                              <option value="Facilities Manager">Facilities Manager</option>
                              <option value="HR Coordinator">HR Coordinator</option>
                            </select>
                          </label>

                          <label>
                            Staff Employee ID (Auto-generated if empty)
                            <input
                              type="text"
                              placeholder="e.g. STF-2026-809"
                              value={employeeForm.employeeId}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })}
                            />
                          </label>

                          <label style={{ gridColumn: 'span 2' }}>
                            Department & Role Responsibilities *
                            <textarea
                              rows="3"
                              placeholder="Specify key responsibilities and operational duties for this staff member..."
                              value={employeeForm.responsibilities}
                              onChange={(e) => setEmployeeForm({ ...employeeForm, responsibilities: e.target.value })}
                              style={{
                                padding: '0.75rem 1rem',
                                border: formErrors.responsibilities ? '1px solid #ef4444' : '1px solid #cbd5e1',
                                borderRadius: '0.65rem',
                                fontSize: '0.9rem',
                                width: '100%',
                                fontFamily: 'inherit'
                              }}
                            />
                            {formErrors.responsibilities && <small style={{ color: '#ef4444' }}>{formErrors.responsibilities}</small>}
                          </label>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STEP 3: Summary & Final Confirmation */}
                  {formStep === 3 && (
                    <div className="step-content-pane">
                      <div className="step-pane-header">
                        <h4>Step 3: Summary & Registration Confirmation</h4>
                        <p>Review all details prior to saving into database and associating with {hospitalProfile.hospitalName}.</p>
                      </div>

                      <div className="summary-confirm-box">
                        <h5>📋 Employee Registration Summary</h5>
                        <div className="summary-details-grid">
                          <p><strong>Role Category:</strong> <span className="badge success" style={{ textTransform: 'capitalize' }}>{selectedRole}</span></p>
                          <p><strong>Full Name:</strong> {employeeForm.name}</p>
                          <p><strong>Email Address:</strong> {employeeForm.email}</p>
                          <p><strong>Phone Number:</strong> {employeeForm.phone}</p>
                          <p><strong>Gender & DOB:</strong> {employeeForm.gender} ({employeeForm.dob})</p>
                          <p><strong>Department:</strong> {employeeForm.department}</p>
                          <p><strong>Joining Date:</strong> {employeeForm.joiningDate}</p>
                          <p><strong>Emergency Contact:</strong> {employeeForm.emergencyContact}</p>

                          {selectedRole === 'doctor' && (
                            <>
                              <p><strong>Specialization:</strong> {employeeForm.specialization}</p>
                              <p><strong>Medical License:</strong> {employeeForm.medicalLicenseNo}</p>
                              <p><strong>Qualification:</strong> {employeeForm.qualification} ({employeeForm.experienceYears})</p>
                              <p><strong>Consultation:</strong> {employeeForm.consultationTimings} | Fee: {employeeForm.consultationFees}</p>
                            </>
                          )}

                          {selectedRole === 'nurse' && (
                            <>
                              <p><strong>Nursing Reg No:</strong> {employeeForm.nursingRegNo}</p>
                              <p><strong>Assigned Ward:</strong> {employeeForm.assignedWard}</p>
                              <p><strong>Shift & Exp:</strong> {employeeForm.shiftTimings} ({employeeForm.nurseExperience})</p>
                            </>
                          )}

                          {selectedRole === 'staff' && (
                            <>
                              <p><strong>Designation:</strong> {employeeForm.designation}</p>
                              <p><strong>Employee ID:</strong> {employeeForm.employeeId || 'Auto-generated'}</p>
                              <p><strong>Duties:</strong> {employeeForm.responsibilities}</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stepper Control Buttons */}
                  <div className="step-form-actions">
                    {formStep > 1 ? (
                      <button className="ghost-button" type="button" onClick={handlePrevStep}>
                        ← Previous Step
                      </button>
                    ) : <div />}

                    {formStep < 3 ? (
                      <button className="primary-button" type="button" onClick={handleNextStep}>
                        Next Step →
                      </button>
                    ) : (
                      <button className="primary-button" type="submit">
                        ✓ Submit & Save Employee
                      </button>
                    )}
                  </div>
                </form>
              </article>
            )}
          </>
        )}

            {/* ==================== TAB 2: MANAGE EMPLOYEES TABLE ==================== */}
            {empTab === 'manage' && (
              <article className="dashboard-card">
                <div className="card-heading">
                  <div>
                    <p className="section-kicker">Hospital Staff & Doctor Records</p>
                    <h3>Manage Employees Directory</h3>
                  </div>
                  <span className="pill">Total: {processedEmployees.length} Employees</span>
                </div>

                {/* Filter and Search Controls Toolbar */}
                <div className="filter-toolbar-grid">
                  <input
                    className="search-input"
                    style={{ marginBottom: 0 }}
                    type="search"
                    placeholder="Search by name, email, department, designation, or specialization..."
                    value={employeeSearch}
                    onChange={(e) => { setEmployeeSearch(e.target.value); setCurrentPage(1); }}
                  />

                  <select
                    className="filter-select"
                    value={employeeRoleFilter}
                    onChange={(e) => { setEmployeeRoleFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">All Categories</option>
                    <option value="doctor">Doctors</option>
                    <option value="nurse">Nurses</option>
                    <option value="staff">Staff Members</option>
                  </select>

                  <select
                    className="filter-select"
                    value={employeeDeptFilter}
                    onChange={(e) => { setEmployeeDeptFilter(e.target.value); setCurrentPage(1); }}
                  >
                    <option value="all">All Departments</option>
                    {uniqueDepartments.map((dept, idx) => (
                      <option key={idx} value={dept}>{dept}</option>
                    ))}
                  </select>

                  <select
                    className="filter-select"
                    value={employeeSortBy}
                    onChange={(e) => setEmployeeSortBy(e.target.value)}
                  >
                    <option value="name-asc">Sort: Name (A-Z)</option>
                    <option value="name-desc">Sort: Name (Z-A)</option>
                    <option value="date-desc">Sort: Joining Date (Newest)</option>
                    <option value="date-asc">Sort: Joining Date (Oldest)</option>
                    <option value="dept">Sort: Department</option>
                  </select>
                </div>

                {/* Employee Searchable and Filterable Data Table */}
                <div className="emp-data-table-wrapper">
                  <table className="emp-data-table">
                    <thead>
                      <tr>
                        <th>Employee Photo & Name</th>
                        <th>Category</th>
                        <th>Department & Title</th>
                        <th>Contact Info</th>
                        <th>Joining Date</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedEmployees.length > 0 ? (
                        paginatedEmployees.map((emp, index) => (
                          <tr key={emp._id || emp.id || index}>
                            <td>
                              <div className="emp-table-user-cell">
                                {emp.photo ? (
                                  <img src={emp.photo} alt={emp.name} className="emp-table-photo" onError={(e) => { e.target.style.display = 'none'; }} />
                                ) : (
                                  <span
                                    className="avatar"
                                    style={{
                                      width: '40px',
                                      height: '40px',
                                      fontSize: '0.85rem',
                                      background: emp.role === 'doctor' ? 'linear-gradient(135deg, #0284c7, #2563eb)' : emp.role === 'nurse' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)'
                                    }}
                                  >
                                    {(emp.name || 'E').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                                  </span>
                                )}
                                <div>
                                  <strong style={{ color: '#0f172a', fontSize: '0.925rem', display: 'block' }}>{emp.name}</strong>
                                  <small style={{ color: '#64748b' }}>{emp.email}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${emp.role === 'doctor' ? 'success' : emp.role === 'nurse' ? 'warning' : 'subtle'}`} style={{ textTransform: 'capitalize' }}>
                                {emp.role === 'doctor' ? '🩺 Doctor' : emp.role === 'nurse' ? '💉 Nurse' : '👤 Staff'}
                              </span>
                            </td>
                            <td>
                              <strong>{emp.department || 'General'}</strong>
                              <small style={{ display: 'block', color: '#64748b' }}>
                                {emp.specialization || emp.designation || emp.assignedWard || 'Staff Member'}
                              </small>
                            </td>
                            <td>
                              <span>{emp.phone || 'N/A'}</span>
                              <small style={{ display: 'block', color: '#64748b' }}>Emerg: {emp.emergencyContact || 'N/A'}</small>
                            </td>
                            <td>
                              <span>{emp.joiningDate || '2024-01-01'}</span>
                            </td>
                            <td>
                              <span className={`status-badge ${emp.status === 'Inactive' ? 'inactive' : 'active'}`}>
                                {emp.status === 'Inactive' ? '🔴 Inactive' : '🟢 Active'}
                              </span>
                            </td>
                            <td>
                              <div className="table-actions-cell">
                                <button
                                  className="action-btn view-btn"
                                  title="View Details"
                                  onClick={() => setViewingEmployee(emp)}
                                >
                                  👁️ View
                                </button>
                                <button
                                  className="action-btn edit-btn"
                                  title="Edit Employee"
                                  onClick={() => setEditingEmployee({ ...emp })}
                                >
                                  ✏️ Edit
                                </button>
                                <button
                                  className="action-btn toggle-btn"
                                  title={emp.status === 'Inactive' ? 'Activate Employee' : 'Deactivate Employee'}
                                  onClick={() => handleToggleStatus(emp)}
                                >
                                  ⚡ {emp.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                                </button>
                                <button
                                  className="action-btn delete-btn"
                                  title="Delete Employee"
                                  onClick={() => setDeletingEmployeeId(emp._id || emp.id)}
                                >
                                  🗑️ Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                            No matching employees found for your filter/search criteria.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="emp-pagination-bar">
                  <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Showing {processedEmployees.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, processedEmployees.length)} of {processedEmployees.length} employees
                  </div>

                  <div className="pagination-pages">
                    <button
                      className="ghost-button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        className={`page-num-btn ${currentPage === page ? 'active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className="ghost-button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </article>
            )}
          </section>
        )}

        {activeMenu === 'profile' && (
          <section className="hospital-workspace">
            <article className="dashboard-card patient-file-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Account & Settings</p>
                  <h3>Manage Hospital Profile</h3>
                </div>
                <button className="danger-button small" onClick={handleLogout}>Log Out</button>
              </div>

              <form className="profile-form" onSubmit={handleProfileUpdate}>
                <div className="info-grid" style={{ marginBottom: '1.5rem' }}>
                  <div>
                    <span className="label">Verification Status</span>
                    <span className="badge success">Verified Hospital</span>
                  </div>
                  <div>
                    <span className="label">Registration ID</span>
                    <strong>{hospitalProfile.registrationNo}</strong>
                  </div>
                  <div>
                    <span className="label">Primary Admin</span>
                    <strong>{hospitalProfile.adminName}</strong>
                  </div>
                  <div>
                    <span className="label">Account Email</span>
                    <strong>{hospitalProfile.email}</strong>
                  </div>
                </div>

                <div className="form-grid-2">
                  <label>
                    Hospital Name
                    <input
                      type="text"
                      value={hospitalProfile.hospitalName}
                      onChange={(e) => setHospitalProfile({ ...hospitalProfile, hospitalName: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Hospital Category / Type
                    <input
                      type="text"
                      value={hospitalProfile.hospitalType}
                      onChange={(e) => setHospitalProfile({ ...hospitalProfile, hospitalType: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Admin Full Name
                    <input
                      type="text"
                      value={hospitalProfile.adminName}
                      onChange={(e) => setHospitalProfile({ ...hospitalProfile, adminName: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Contact Email
                    <input
                      type="email"
                      value={hospitalProfile.email}
                      onChange={(e) => setHospitalProfile({ ...hospitalProfile, email: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Hospital Phone Number
                    <input
                      type="text"
                      value={hospitalProfile.phone}
                      onChange={(e) => setHospitalProfile({ ...hospitalProfile, phone: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    24/7 Emergency Line
                    <input
                      type="text"
                      value={hospitalProfile.emergencyContact}
                      onChange={(e) => setHospitalProfile({ ...hospitalProfile, emergencyContact: e.target.value })}
                      required
                    />
                  </label>
                </div>

                <label style={{ marginTop: '1rem' }}>
                  Full Address & Location
                  <input
                    type="text"
                    value={hospitalProfile.address}
                    onChange={(e) => setHospitalProfile({ ...hospitalProfile, address: e.target.value })}
                    required
                  />
                </label>

                <div className="action-buttons-group">
                  <button className="primary-button" type="submit">
                    Save Profile Changes
                  </button>
                  <button className="danger-button" type="button" onClick={handleLogout}>
                    Log Out Account
                  </button>
                </div>
              </form>
            </article>
          </section>
        )}

        {activeMenu === 'home' && (
          <section className="hospital-workspace">
            <div className="counter-grid">
              <article className="counter-card"><span>Total Doctors</span><strong>24</strong><small>18 currently on duty</small></article>
              <article className="counter-card"><span>Total Patients Today</span><strong>312</strong><small>QR check-ins live</small></article>
              <article className="counter-card"><span>Active Labs</span><strong>6</strong><small>128 tests running</small></article>
              <article className="counter-card"><span>Total Revenue</span><strong>$48,920</strong><small>Consults, pharmacy, labs</small></article>
            </div>

            <article className="dashboard-card patient-file-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Live traffic</p>
                  <h3>Hospital control panel</h3>
                </div>
                <span className="badge success">Live</span>
              </div>
              <svg className="vitals-chart" viewBox="0 0 280 150" role="img" aria-label="Hospital traffic trend">
                <path d="M 20 130 H 260" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M 20 25 V 130" stroke="#cbd5e1" strokeWidth="2" />
                <path d={trafficPath} fill="none" stroke="#2563eb" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </article>
          </section>
        )}

        {activeMenu === 'analyzer' && (
          <section className="hospital-workspace">
            <article className="dashboard-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Repeated patients</p>
                  <h3>Follow-up tracker</h3>
                </div>
              </div>
              <div className="vital-bars hospital-bars">
                {repeatedPatients.map((item) => (
                  <div key={item.month}>
                    <span style={{ height: `${item.count / 4}px` }} />
                    <small>{item.month}</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="dashboard-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Time & traffic</p>
                  <h3>Trend filter</h3>
                </div>
              </div>
              <div className="segmented-control">
                {Object.keys(trafficData).map((key) => (
                  <button className={trafficFilter === key ? 'active' : ''} key={key} onClick={() => setTrafficFilter(key)}>{key}</button>
                ))}
              </div>
              <svg className="vitals-chart" viewBox="0 0 280 150" role="img" aria-label="Filtered hospital traffic trend">
                <path d="M 20 130 H 260" stroke="#cbd5e1" strokeWidth="2" />
                <path d="M 20 25 V 130" stroke="#cbd5e1" strokeWidth="2" />
                <path d={trafficPath} fill="none" stroke="#0f766e" strokeWidth="4" strokeLinecap="round" />
              </svg>
            </article>

            <article className="dashboard-card patient-file-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Department performance</p>
                  <h3>Patient source split</h3>
                </div>
              </div>
              <div className="department-performance">
                <div className="pie-chart" />
                <div className="report-list">
                  <div className="list-item"><strong>General Doctor</strong><span className="badge subtle">50%</span></div>
                  <div className="list-item"><strong>Laboratory</strong><span className="badge success">30%</span></div>
                  <div className="list-item"><strong>Pharmacy</strong><span className="badge warning">20%</span></div>
                </div>
              </div>
            </article>
          </section>
        )}

        {activeMenu === 'patients' && (
          <section className="hospital-workspace patient-directory-layout">
            <article className="dashboard-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">All Patients</p>
                  <h3>Master list</h3>
                </div>
              </div>
              <input className="search-input" type="search" placeholder="Search patient" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} />
              <div className="report-list directory-panel">
                {filteredPatients.map((patient) => (
                  <button className={`directory-item light ${patient.id === activePatientId ? 'active' : ''}`} key={patient.id} onClick={() => setActivePatientId(patient.id)}>
                    <span className="avatar">{patient.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                    <span><strong>{patient.name}</strong><small>{patient.id}</small></span>
                  </button>
                ))}
              </div>
            </article>

            <article className="dashboard-card patient-file-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Master file</p>
                  <h3>{activePatient.name}</h3>
                </div>
                <span className="pill">{activePatient.id}</span>
              </div>
              <div className="info-grid">
                <div><span className="label">Age</span><strong>{activePatient.age}</strong></div>
                <div><span className="label">Phone</span><strong>{activePatient.phone}</strong></div>
                <div><span className="label">Doctor</span><strong>{activePatient.doctor}</strong></div>
                <div><span className="label">Lab reports</span><strong>{activePatient.labs.join(', ')}</strong></div>
              </div>
              <div className="split-list">
                <div>
                  <h4>Medicines bought</h4>
                  <ul className="detail-list">{activePatient.medicines.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h4>Full timeline</h4>
                  <ul className="detail-list">{activePatient.timeline.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </article>
          </section>
        )}

        {activeMenu === 'appointments' && (
          <section className="hospital-workspace">
            <article className="dashboard-card patient-file-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Central inbox</p>
                  <h3>Online appointment requests</h3>
                </div>
                <span className="badge subtle">{appointments.length} incoming</span>
              </div>
              <div className="report-list">
                {appointments.map((appointment) => {
                  const approved = approvedAppointments.includes(appointment.id);
                  return (
                    <div className="list-item" key={appointment.id}>
                      <div>
                        <h4>{appointment.patient}</h4>
                        <p>{appointment.department} - {appointment.requested}</p>
                        <p>Queue: {appointment.doctor}</p>
                      </div>
                      <button className={approved ? 'ghost-button' : 'primary-button small'} disabled={approved} onClick={() => approveAppointment(appointment.id, appointment.doctor)}>
                        {approved ? 'Assigned' : 'Approve & Assign'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        )}

        {activeMenu === 'inventory' && (
          <section className="hospital-workspace">
            <article className="dashboard-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Admin control</p>
                  <h3>Add medicines</h3>
                </div>
              </div>
              <form className="profile-form" onSubmit={addMedicine}>
                <label>Medicine name<input name="name" value={medicineForm.name} onChange={handleMedicineChange} required /></label>
                <label>Stock quantity<input name="stock" type="number" value={medicineForm.stock} onChange={handleMedicineChange} required /></label>
                <label>Price<input name="price" value={medicineForm.price} onChange={handleMedicineChange} required /></label>
                <label>Expiry date<input name="expiry" type="date" value={medicineForm.expiry} onChange={handleMedicineChange} required /></label>
                <button className="primary-button" type="submit">Add Medicine</button>
              </form>
            </article>

            <article className="dashboard-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Stock alerts</p>
                  <h3>Medicine inventory</h3>
                </div>
              </div>
              <div className="report-list">
                {inventory.map((item) => (
                  <div className={`list-item ${item.stock < 10 ? 'low-stock' : ''}`} key={item.id}>
                    <div>
                      <h4>{item.name}</h4>
                      <p>Expires {item.expiry} - {item.price}</p>
                    </div>
                    <span className={item.stock < 10 ? 'badge warning' : 'badge success'}>{item.stock} boxes</span>
                  </div>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeMenu === 'verification' && (
          <section className="hospital-workspace">
            <article className="dashboard-card patient-file-card">
              <div className="card-heading">
                <div>
                  <p className="section-kicker">Security gate</p>
                  <h3>Admin verification desk</h3>
                </div>
                <span className="badge warning">Pending approvals</span>
              </div>
              <div className="report-list">
                {verificationRequests.map((request) => {
                  const handled = handledRequests.includes(request.id);
                  return (
                    <div className="list-item" key={request.id}>
                      <div>
                        <h4>{request.source} profile change</h4>
                        <p>{request.text}</p>
                      </div>
                      <div className="medicine-actions">
                        <button className="primary-button small" disabled={handled} onClick={() => handleVerification(request.id, 'approve')}>Approve</button>
                        <button className="ghost-button" disabled={handled} onClick={() => handleVerification(request.id, 'reject')}>Reject</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          </section>
        )}
      </main>

      {/* ==================== VIEW EMPLOYEE MODAL ==================== */}
      {viewingEmployee && (
        <div className="emp-modal-overlay" onClick={() => setViewingEmployee(null)}>
          <div className="emp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3>Employee Profile Card</h3>
              <button className="emp-modal-close-btn" onClick={() => setViewingEmployee(null)}>×</button>
            </div>
            <div className="emp-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
                {viewingEmployee.photo ? (
                  <img src={viewingEmployee.photo} alt={viewingEmployee.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none'; }} />
                ) : (
                  <span className="avatar" style={{ width: '64px', height: '64px', fontSize: '1.4rem' }}>
                    {(viewingEmployee.name || 'E').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                )}
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.2rem' }}>{viewingEmployee.name}</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                    <span className={`badge ${viewingEmployee.role === 'doctor' ? 'success' : viewingEmployee.role === 'nurse' ? 'warning' : 'subtle'}`} style={{ textTransform: 'capitalize' }}>
                      {viewingEmployee.role}
                    </span>
                    <span className={`status-badge ${viewingEmployee.status === 'Inactive' ? 'inactive' : 'active'}`}>
                      {viewingEmployee.status || 'Active'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="info-grid">
                <div><span className="label">Registered Email</span><strong>{viewingEmployee.email}</strong></div>
                <div><span className="label">Phone</span><strong>{viewingEmployee.phone || 'N/A'}</strong></div>
                <div><span className="label">Department</span><strong>{viewingEmployee.department}</strong></div>
                <div><span className="label">Joining Date</span><strong>{viewingEmployee.joiningDate || 'N/A'}</strong></div>
                <div><span className="label">Gender & DOB</span><strong>{viewingEmployee.gender} ({viewingEmployee.dob || 'N/A'})</strong></div>
                <div><span className="label">Emergency Contact</span><strong>{viewingEmployee.emergencyContact || 'N/A'}</strong></div>
                <div style={{ gridColumn: 'span 2' }}><span className="label">Address</span><strong>{viewingEmployee.address || 'N/A'}</strong></div>

                {viewingEmployee.role === 'doctor' && (
                  <>
                    <div><span className="label">Specialization</span><strong>{viewingEmployee.specialization}</strong></div>
                    <div><span className="label">License No</span><strong>{viewingEmployee.medicalLicenseNo}</strong></div>
                    <div><span className="label">Qualification</span><strong>{viewingEmployee.qualification}</strong></div>
                    <div><span className="label">Experience</span><strong>{viewingEmployee.experienceYears}</strong></div>
                    <div><span className="label">Consultation Hours</span><strong>{viewingEmployee.consultationTimings}</strong></div>
                    <div><span className="label">Consultation Fee</span><strong>{viewingEmployee.consultationFees}</strong></div>
                  </>
                )}

                {viewingEmployee.role === 'nurse' && (
                  <>
                    <div><span className="label">Nursing Reg No</span><strong>{viewingEmployee.nursingRegNo}</strong></div>
                    <div><span className="label">Assigned Ward</span><strong>{viewingEmployee.assignedWard}</strong></div>
                    <div><span className="label">Shift Timings</span><strong>{viewingEmployee.shiftTimings}</strong></div>
                    <div><span className="label">Experience</span><strong>{viewingEmployee.nurseExperience}</strong></div>
                  </>
                )}

                {viewingEmployee.role === 'staff' && (
                  <>
                    <div><span className="label">Designation</span><strong>{viewingEmployee.designation}</strong></div>
                    <div><span className="label">Employee ID</span><strong>{viewingEmployee.employeeId}</strong></div>
                    <div style={{ gridColumn: 'span 2' }}><span className="label">Responsibilities</span><strong>{viewingEmployee.responsibilities}</strong></div>
                  </>
                )}
              </div>
            </div>
            <div className="emp-modal-footer">
              <button className="primary-button" onClick={() => setViewingEmployee(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== EDIT EMPLOYEE MODAL ==================== */}
      {editingEmployee && (
        <div className="emp-modal-overlay" onClick={() => setEditingEmployee(null)}>
          <div className="emp-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3>Edit Employee Details</h3>
              <button className="emp-modal-close-btn" onClick={() => setEditingEmployee(null)}>×</button>
            </div>
            <form onSubmit={handleSaveEditedEmployee}>
              <div className="emp-modal-body">
                <div className="form-grid-2">
                  <label>
                    Full Name
                    <input
                      type="text"
                      value={editingEmployee.name || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Email Address
                    <input
                      type="email"
                      value={editingEmployee.email || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Phone Number
                    <input
                      type="text"
                      value={editingEmployee.phone || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
                    />
                  </label>
                  <label>
                    Department
                    <input
                      type="text"
                      value={editingEmployee.department || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, department: e.target.value })}
                    />
                  </label>
                  <label>
                    Status
                    <select
                      className="filter-select"
                      value={editingEmployee.status || 'Active'}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, status: e.target.value })}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </label>
                  <label>
                    Emergency Contact
                    <input
                      type="text"
                      value={editingEmployee.emergencyContact || ''}
                      onChange={(e) => setEditingEmployee({ ...editingEmployee, emergencyContact: e.target.value })}
                    />
                  </label>

                  {editingEmployee.role === 'doctor' && (
                    <>
                      <label>
                        Specialization
                        <input
                          type="text"
                          value={editingEmployee.specialization || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, specialization: e.target.value })}
                        />
                      </label>
                      <label>
                        Medical License No
                        <input
                          type="text"
                          value={editingEmployee.medicalLicenseNo || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, medicalLicenseNo: e.target.value })}
                        />
                      </label>
                      <label>
                        Consultation Timings
                        <input
                          type="text"
                          value={editingEmployee.consultationTimings || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, consultationTimings: e.target.value })}
                        />
                      </label>
                      <label>
                        Consultation Fees
                        <input
                          type="text"
                          value={editingEmployee.consultationFees || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, consultationFees: e.target.value })}
                        />
                      </label>
                    </>
                  )}

                  {editingEmployee.role === 'nurse' && (
                    <>
                      <label>
                        Assigned Ward
                        <input
                          type="text"
                          value={editingEmployee.assignedWard || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, assignedWard: e.target.value })}
                        />
                      </label>
                      <label>
                        Shift Timings
                        <input
                          type="text"
                          value={editingEmployee.shiftTimings || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, shiftTimings: e.target.value })}
                        />
                      </label>
                    </>
                  )}

                  {editingEmployee.role === 'staff' && (
                    <>
                      <label>
                        Designation
                        <input
                          type="text"
                          value={editingEmployee.designation || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, designation: e.target.value })}
                        />
                      </label>
                      <label>
                        Employee ID
                        <input
                          type="text"
                          value={editingEmployee.employeeId || ''}
                          onChange={(e) => setEditingEmployee({ ...editingEmployee, employeeId: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                </div>
              </div>
              <div className="emp-modal-footer">
                <button className="ghost-button" type="button" onClick={() => setEditingEmployee(null)}>Cancel</button>
                <button className="primary-button" type="submit">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
      {deletingEmployeeId && (
        <div className="emp-modal-overlay" onClick={() => setDeletingEmployeeId(null)}>
          <div className="emp-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="emp-modal-header">
              <h3 style={{ color: '#dc2626' }}>Confirm Delete Employee</h3>
              <button className="emp-modal-close-btn" onClick={() => setDeletingEmployeeId(null)}>×</button>
            </div>
            <div className="emp-modal-body">
              <p style={{ margin: 0, color: '#334155', fontSize: '0.95rem' }}>
                Are you sure you want to permanently delete this employee from your hospital records? This action cannot be undone.
              </p>
            </div>
            <div className="emp-modal-footer">
              <button className="ghost-button" onClick={() => setDeletingEmployeeId(null)}>Cancel</button>
              <button className="danger-button" onClick={() => handleDeleteEmployee(deletingEmployeeId)}>Delete Permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HospitalPage;

