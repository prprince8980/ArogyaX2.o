import { useEffect, useMemo, useState } from 'react';
import "../styles/pages/AdminPage.css";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const providerRoles = ['clinic', 'doctor', 'laboratory', 'hospital'];

function getProviderName(user) {
  if (user.role === 'hospital') return user.hospitalName || 'Unnamed Hospital';
  if (user.role === 'laboratory') return user.labName || 'Unnamed Lab';
  if (user.role === 'doctor') return user.fullName || user.doctorName || 'Unnamed Doctor';
  return user.clinicName || 'Unnamed Clinic';
}

function getProviderDetails(user) {
  if (user.role === 'hospital') {
    return [
      ['Type', user.hospitalType],
      ['Registration', user.registrationNumber],
      ['License', user.licenseNumber],
      ['Emergency', user.emergencyLandline],
      ['Address', user.address],
    ];
  }

  if (user.role === 'laboratory') {
    return [
      ['Type', user.labType],
      ['Registration', user.registrationNumber],
      ['Chief doctor', user.chiefDoctorName],
      ['Business email', user.businessEmail],
      ['Tests', (user.availableTests || []).join(', ')],
    ];
  }

  // For clinic or doctor
  return [
    ['Speciality', user.specialityType || user.speciality],
    ['Registration', user.registrationNumber || user.medicalLicenseNumber],
    ['Owner', user.ownerName || user.fullName],
    ['Phone', user.emergencyPhone || user.phoneNumber],
    ['Address', user.address || user.clinicAddress],
  ];
}

function formatRole(role) {
  if (role === 'doctor') return 'Doctor';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function AdminPage() {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [activeRole, setActiveRole] = useState('all');

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/pending-verifications`);
      const data = await response.json();
      setPendingUsers(data.pending || []);
      setStatusMessage('');
    } catch (error) {
      console.error('Failed to load pending users', error);
      setStatusMessage('Unable to load pending verifications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (activeRole === 'all') return pendingUsers;
    if (activeRole === 'clinic') return pendingUsers.filter((user) => user.role === 'clinic' || user.role === 'doctor');
    return pendingUsers.filter((user) => user.role === activeRole);
  }, [activeRole, pendingUsers]);

  const counts = useMemo(() => {
    return {
      all: pendingUsers.length,
      clinic: pendingUsers.filter((user) => user.role === 'clinic' || user.role === 'doctor').length,
      laboratory: pendingUsers.filter((user) => user.role === 'laboratory').length,
      hospital: pendingUsers.filter((user) => user.role === 'hospital').length,
    };
  }, [pendingUsers]);

  const updateVerificationStatus = async (user, status) => {
    setUpdatingId(user._id);
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: user.role, profileId: user._id, status }),
      });
      const data = await response.json();
      if (data.success || data.profile) {
        setStatusMessage(`${getProviderName(user)} was ${status}.`);
        await loadPendingUsers();
      } else {
        setStatusMessage(data.message || 'Failed to update verification status.');
      }
    } catch (error) {
      console.error('Verification error', error);
      setStatusMessage('Verification request failed.');
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <main className="admin-dashboard">
      <section className="admin-hero">
        <div>
          <p className="section-kicker">ArogyaX admin</p>
          <h1>Provider verification dashboard</h1>
          <p className="muted">Approve or reject clinic, laboratory, doctor, and hospital onboarding requests.</p>
        </div>
        <button className="ghost-button" type="button" onClick={loadPendingUsers} disabled={loading}>
          Refresh
        </button>
      </section>

      <section className="admin-stats" aria-label="Verification counts">
        {[
          ['all', 'All pending'],
          ['clinic', 'Clinics & Doctors'],
          ['laboratory', 'Laboratories'],
          ['hospital', 'Hospitals'],
        ].map(([role, label]) => (
          <button
            key={role}
            type="button"
            className={`admin-stat-card ${activeRole === role ? 'active' : ''}`}
            onClick={() => setActiveRole(role)}
          >
            <span>{label}</span>
            <strong>{counts[role]}</strong>
          </button>
        ))}
      </section>

      {statusMessage && <p className="admin-status">{statusMessage}</p>}

      <section className="admin-card">
        <div className="admin-card-header">
          <div>
            <p className="section-kicker">Requests</p>
            <h2>{activeRole === 'all' ? 'All pending providers' : `${formatRole(activeRole)} requests`}</h2>
          </div>
          <span className="pill">{filteredUsers.length} waiting</span>
        </div>

        {loading ? (
          <p className="empty-state">Loading pending verification requests...</p>
        ) : filteredUsers.length === 0 ? (
          <p className="empty-state">No pending {activeRole === 'all' ? 'provider' : activeRole} requests right now.</p>
        ) : (
          <div className="verification-list">
            {filteredUsers.map((user) => (
              <article className="verification-card" key={user._id}>
                <div className="verification-topline">
                  <div>
                    <span className={`role-badge ${user.role}`}>{formatRole(user.role)}</span>
                    <h3>{getProviderName(user)}</h3>
                    <p>{user.email || 'No email available'}</p>
                  </div>
                  <span className="badge warning">{user.verificationStatus}</span>
                </div>

                <div className="provider-detail-grid">
                  {getProviderDetails(user).map(([label, value]) => (
                    <div key={label}>
                      <span className="label">{label}</span>
                      <strong>{value || 'Not provided'}</strong>
                    </div>
                  ))}
                </div>

                <div className="verification-actions">
                  <button
                    className="approve-button"
                    type="button"
                    disabled={updatingId === user._id}
                    onClick={() => updateVerificationStatus(user, 'approved')}
                  >
                    Approve
                  </button>
                  <button
                    className="reject-button"
                    type="button"
                    disabled={updatingId === user._id}
                    onClick={() => updateVerificationStatus(user, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default AdminPage;
