import { useMemo, useState } from 'react';

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
  const [activeMenu, setActiveMenu] = useState('home');
  const [activePatientId, setActivePatientId] = useState(patients[0].id);
  const [patientSearch, setPatientSearch] = useState('');
  const [trafficFilter, setTrafficFilter] = useState('today');
  const [approvedAppointments, setApprovedAppointments] = useState([]);
  const [handledRequests, setHandledRequests] = useState([]);
  const [inventory, setInventory] = useState(startingInventory);
  const [medicineForm, setMedicineForm] = useState(blankMedicine);
  const [notice, setNotice] = useState('');

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
        <div>
          <p className="section-kicker">AarogyaX Central</p>
          <h2>Hospital Admin</h2>
        </div>
        <button className={`nav-link ${activeMenu === 'home' ? 'active' : ''}`} onClick={() => setActiveMenu('home')}>Dashboard Home</button>
        <button className={`nav-link ${activeMenu === 'analyzer' ? 'active' : ''}`} onClick={() => setActiveMenu('analyzer')}>Hospital Analyzer</button>
        <button className={`nav-link ${activeMenu === 'patients' ? 'active' : ''}`} onClick={() => setActiveMenu('patients')}>Patient Directory</button>
        <button className={`nav-link ${activeMenu === 'appointments' ? 'active' : ''}`} onClick={() => setActiveMenu('appointments')}>Appointment Requests</button>
        <button className={`nav-link ${activeMenu === 'inventory' ? 'active' : ''}`} onClick={() => setActiveMenu('inventory')}>Medicine Inventory</button>
        <button className={`nav-link ${activeMenu === 'verification' ? 'active' : ''}`} onClick={() => setActiveMenu('verification')}>Verification Desk</button>
      </aside>

      <main className="clinic-main">
        {notice && <p className="save-message">{notice}</p>}

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
    </div>
  );
}

export default HospitalPage;
