import "../styles/pages/HospitalDashboard.css";
import { useEffect, useState } from 'react';

function HospitalDashboard() {
  const [hospitalUser, setHospitalUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleType, setRoleType] = useState('doctor');
  const [formData, setFormData] = useState({ name: '', role: 'doctor', specialty: '', cabin: '', shift: '', fee: '', employeeId: '', counter: '', ward: '', department: '' });

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
    const response = await fetch('http://localhost:5000/api/auth/hospital-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: hospitalUser.email, user: formData }),
    });
    const data = await response.json();
    if (data.user) {
      setHospitalUser(data.user);
      setUsers(data.user.profile.hospitalProfile.users || []);
      localStorage.setItem('arogax2User', JSON.stringify(data.user));
      setFormData({ name: '', role: 'doctor', specialty: '', cabin: '', shift: '', fee: '', employeeId: '', counter: '', ward: '', department: '' });
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Hospital Master Dashboard</h1>
      <p>Welcome, {hospitalUser?.name}. Manage your hospital staff and internal users.</p>

      <section style={{ marginTop: '2rem', padding: '1.5rem', border: '1px solid #cbd5e1', borderRadius: '1rem', background: '#fff' }}>
        <h2>Hospital Info</h2>
        {hospitalUser?.profile?.hospitalProfile ? (
          <div>
            <p><strong>Hospital Name:</strong> {hospitalUser.profile.hospitalProfile.hospitalName}</p>
            <p><strong>Hospital Type:</strong> {hospitalUser.profile.hospitalProfile.hospitalType}</p>
            <p><strong>Verified:</strong> {hospitalUser.isVerified ? 'Yes' : 'Pending verification'}</p>
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

          <label>Name</label>
          <input value={formData.name} onChange={(e) => handleChange('name', e.target.value)} />

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
