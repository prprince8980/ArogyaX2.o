import "../styles/pages/HospitalDashboard.css";
import { useEffect, useState } from 'react';

function HospitalDashboard() {
  const [hospitalUser, setHospitalUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleType, setRoleType] = useState('doctor');
  const [formData, setFormData] = useState({ email: '', name: '', role: 'doctor', specialty: '', cabin: '', shift: '', fee: '', employeeId: '', counter: '', ward: '', department: '' });

  useEffect(() => {
    const stored = localStorage.getItem('arogax2User');
    if (stored) {
      const parsed = JSON.parse(stored);
      setHospitalUser(parsed);
      setUsers(parsed.profile?.hospitalProfile?.users || []);
    }
  }, []);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const createUser = async () => {
    try {
      await fetch('http://localhost:5000/api/auth/hospital-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospitalId: hospitalUser?.profile?.hospitalProfile?.registrationNumber || 'HOSP-2026-904',
          hospitalName: hospitalUser?.profile?.hospitalProfile?.hospitalName || 'AaroGyaX Central Hospital',
          employee: {
            email: formData.email,
            name: formData.name,
            role: formData.role,
            department: formData.department || formData.specialty || 'General',
            specialization: formData.specialty,
            designation: `${formData.role} - ${formData.specialty || 'Staff'}`,
            cabin: formData.cabin,
            shift: formData.shift,
            fee: formData.fee
          }
        })
      });
    } catch (e) {
      console.error('Error linking hospital employee:', e);
    }

    const response = await fetch('http://localhost:5000/api/auth/hospital-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hospitalUser?.email, user: formData }),
    });
    const data = await response.json();
    if (data.user) {
      setHospitalUser(data.user);
      setUsers(data.user.profile?.hospitalProfile?.users || []);
      localStorage.setItem('arogax2User', JSON.stringify(data.user));
    } else {
      setUsers(prev => [...prev, { role: formData.role, name: formData.name, username: formData.email, details: `${formData.specialty || formData.department || ''}` }]);
    }
    setFormData({ email: '', name: '', role: 'doctor', specialty: '', cabin: '', shift: '', fee: '', employeeId: '', counter: '', ward: '', department: '' });
  };

  const handleLogout = () => {
    localStorage.removeItem('arogax2User');
    window.location.href = '/login';
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.8rem' }}>Hospital Master Dashboard</h1>
          <p style={{ margin: '0.25rem 0 0 0', color: '#64748b' }}>Welcome, {hospitalUser?.name || 'Admin'}. Manage your hospital staff and internal users.</p>
        </div>
        <button 
          onClick={handleLogout} 
          style={{ padding: '0.65rem 1.25rem', border: '1px solid #ef4444', borderRadius: '0.65rem', background: '#fef2f2', color: '#dc2626', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          Log Out
        </button>
      </div>

      <section style={{ marginTop: '1.5rem', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '1rem', background: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ margin: 0 }}>Manage Profile & Hospital Info</h2>
          <button 
            onClick={handleLogout}
            style={{ padding: '0.45rem 0.9rem', border: 'none', borderRadius: '0.5rem', background: '#dc2626', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            Log Out Account
          </button>
        </div>
        {hospitalUser?.profile?.hospitalProfile ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '0.75rem' }}>
            <p style={{ margin: 0 }}><strong>Hospital Name:</strong> {hospitalUser.profile.hospitalProfile.hospitalName}</p>
            <p style={{ margin: 0 }}><strong>Hospital Type:</strong> {hospitalUser.profile.hospitalProfile.hospitalType}</p>
            <p style={{ margin: 0 }}><strong>Admin Email:</strong> {hospitalUser.email}</p>
            <p style={{ margin: 0 }}><strong>Status:</strong> {hospitalUser.isVerified ? 'Verified Hospital' : 'Pending verification'}</p>
          </div>
        ) : (
          <p>No hospital profile found.</p>
        )}
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '1rem', background: '#fff' }}>
        <h2>User Management</h2>
        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
          <label>Internal Role</label>
          <select value={formData.role} onChange={(e) => { handleChange('role', e.target.value); setRoleType(e.target.value); }}>
            <option value="doctor">Doctor</option>
            <option value="staff">Hospital Staff</option>
            <option value="nurse">Nurse</option>
            <option value="support">Support Staff</option>
          </select>

          <label>Registered Email Address (Used for auto-linking doctor logins)</label>
          <input type="email" placeholder="e.g. doctor@arogyax.com" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} required />

          <label>Full Name</label>
          <input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required />

          {roleType === 'doctor' && (
            <>
              <label>Specialization</label>
              <input value={formData.specialty} onChange={(e) => handleChange('specialty', e.target.value)} />
              <label>Cabin Number</label>
              <input value={formData.cabin} onChange={(e) => handleChange('cabin', e.target.value)} />
              <label>Shift Timing</label>
              <input value={formData.shift} onChange={(e) => handleChange('shift', e.target.value)} />
              <label>Consultation Fee</label>
              <input value={formData.fee} onChange={(e) => handleChange('fee', e.target.value)} />
            </>
          )}

          {roleType === 'staff' && (
            <>
              <label>Employee ID</label>
              <input value={formData.employeeId} onChange={(e) => handleChange('employeeId', e.target.value)} />
              <label>Reception Counter</label>
              <input value={formData.counter} onChange={(e) => handleChange('counter', e.target.value)} />
              <label>Shift Timing</label>
              <input value={formData.shift} onChange={(e) => handleChange('shift', e.target.value)} />
            </>
          )}

          {roleType === 'nurse' && (
            <>
              <label>Ward Assignment</label>
              <input value={formData.ward} onChange={(e) => handleChange('ward', e.target.value)} />
            </>
          )}

          {roleType === 'support' && (
            <>
              <label>Department</label>
              <input value={formData.department} onChange={(e) => handleChange('department', e.target.value)} />
            </>
          )}

          <button onClick={createUser} style={{ padding: '0.85rem 1.2rem', border: 'none', borderRadius: '0.8rem', background: '#0f172a', color: 'white', cursor: 'pointer' }}>
            Create Account
          </button>
        </div>
      </section>

      <section style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '1rem', background: '#fff' }}>
        <h2>Internal Users</h2>
        {users.length > 0 ? (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #cbd5e1', padding: '0.75rem' }}>Role</th>
                <th style={{ borderBottom: '1px solid #cbd5e1', padding: '0.75rem' }}>Name</th>
                <th style={{ borderBottom: '1px solid #cbd5e1', padding: '0.75rem' }}>Username</th>
                <th style={{ borderBottom: '1px solid #cbd5e1', padding: '0.75rem' }}>Details</th>
              </tr>
            </thead>
            <tbody>
              {users.map((userEntry, index) => (
                <tr key={index}>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '0.75rem' }}>{userEntry.role}</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '0.75rem' }}>{userEntry.name}</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '0.75rem' }}>{userEntry.username}</td>
                  <td style={{ borderBottom: '1px solid #e2e8f0', padding: '0.75rem' }}>{userEntry.details || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No internal users created yet.</p>
        )}
      </section>
    </div>
  );
}

export default HospitalDashboard;
