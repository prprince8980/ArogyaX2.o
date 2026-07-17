import { Routes, Route, Link, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AdminPage from './pages/AdminPage';
import PatientPage from './pages/PatientPage';
import ClinicPage from './pages/ClinicPage';
import LaboratoryPage from './pages/LaboratoryPage';
import HospitalPage from './pages/HospitalPage';
import HospitalDashboard from './pages/HospitalDashboard';

function App() {
  const isLoginPage = window.location.pathname === '/login';

  return (
    <div>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/hospital-dashboard" element={<HospitalDashboard />} />
        <Route path="/patient-dashboard" element={<PatientPage />} />
        <Route path="/clinic" element={<ClinicPage />} />
        <Route path="/laboratory" element={<LaboratoryPage />} />
        <Route path="/hospital" element={<HospitalPage />} />
      </Routes>
    </div>
  );
}

export default App;
