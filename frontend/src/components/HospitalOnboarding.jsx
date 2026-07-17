import { useState } from 'react';

const defaultHospitalProfile = {
  hospitalName: '',
  logoUrl: '',
  hospitalType: '',
  registrationNumber: '',
  licenseNumber: '',
  licenseName: '',
  licenseData: '',
  totalBeds: '',
  icuBeds: '',
  ambulanceAvailable: false,
  address: '',
  mapsLink: '',
  emergencyLandline: '',
  bankAccountNumber: '',
  bankAccountName: '',
  bankIFSC: '',
};

function HospitalOnboarding({ onComplete }) {
  const [profile, setProfile] = useState(defaultHospitalProfile);

  const updateField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField('licenseName', file.name);
      updateField('licenseData', reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="onboarding-card">
      <h2>Hospital Onboarding</h2>
      <p>Fill the hospital master registration details.</p>

      <label>Hospital Name</label>
      <input value={profile.hospitalName} onChange={(e) => updateField('hospitalName', e.target.value)} />

      <label>Hospital Logo / Banner URL</label>
      <input value={profile.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} />

      <label>Hospital Type</label>
      <select value={profile.hospitalType} onChange={(e) => updateField('hospitalType', e.target.value)}>
        <option value="">Select</option>
        <option value="General Hospital">General Hospital</option>
        <option value="Eye Care">Eye Care</option>
        <option value="Multispeciality">Multispeciality</option>
        <option value="Other">Other</option>
      </select>

      <label>National Hospital Registry Number</label>
      <input value={profile.registrationNumber} onChange={(e) => updateField('registrationNumber', e.target.value)} />

      <label>Government Health License Number</label>
      <input value={profile.licenseNumber} onChange={(e) => updateField('licenseNumber', e.target.value)} />

      <label>License Upload (PDF)</label>
      <input type="file" accept="application/pdf" onChange={handleFileChange} />
      {profile.licenseName && <p>Uploaded: {profile.licenseName}</p>}

      <label>Total Number of Beds</label>
      <input type="number" value={profile.totalBeds} onChange={(e) => updateField('totalBeds', e.target.value)} />

      <label>Number of ICU Beds</label>
      <input type="number" value={profile.icuBeds} onChange={(e) => updateField('icuBeds', e.target.value)} />

      <label>Emergency Ambulance Availability</label>
      <select value={profile.ambulanceAvailable ? 'Yes' : 'No'} onChange={(e) => updateField('ambulanceAvailable', e.target.value === 'Yes')}>
        <option value="No">No</option>
        <option value="Yes">Yes</option>
      </select>

      <label>Full Physical Address</label>
      <input value={profile.address} onChange={(e) => updateField('address', e.target.value)} />

      <label>Google Maps Link</label>
      <input value={profile.mapsLink} onChange={(e) => updateField('mapsLink', e.target.value)} />

      <label>Emergency Landline Number</label>
      <input value={profile.emergencyLandline} onChange={(e) => updateField('emergencyLandline', e.target.value)} />

      <label>Bank Account Number</label>
      <input value={profile.bankAccountNumber} onChange={(e) => updateField('bankAccountNumber', e.target.value)} />

      <label>Bank Account Name</label>
      <input value={profile.bankAccountName} onChange={(e) => updateField('bankAccountName', e.target.value)} />

      <label>Bank IFSC / Code</label>
      <input value={profile.bankIFSC} onChange={(e) => updateField('bankIFSC', e.target.value)} />

      <div className="onboarding-actions">
        <button onClick={() => onComplete(profile)}>Submit Hospital Registration</button>
      </div>
    </div>
  );
}

export default HospitalOnboarding;
