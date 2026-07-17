import { useState } from 'react';

const defaultLabProfile = {
  labName: '',
  logoUrl: '',
  labType: '',
  operatingModel: '',
  registrationNumber: '',
  chiefDoctorName: '',
  licenseNumber: '',
  certificateName: '',
  certificateData: '',
  businessEmail: '',
  mapsLink: '',
  bankAccountNumber: '',
  bankAccountName: '',
  bankCode: '',
  chequeName: '',
  chequeData: '',
  workingDays: [],
  openingTime: '',
  closingTime: '',
  weeklyOff: [],
  homeCollection: false,
  availableTests: [],
  pricingSheet: '',
};

function LabOnboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(defaultLabProfile);

  const updateField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMulti = (key, value) => {
    setProfile((prev) => {
      const values = prev[key] || [];
      return {
        ...prev,
        [key]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
  };

  const handleFileChange = (key) => (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField(`${key}Name`, file.name);
      updateField(`${key}Data`, reader.result);
    };
    reader.readAsDataURL(file);
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  return (
    <div className="onboarding-card">
      <h2>Laboratory Onboarding - Step {step} of 4</h2>

      {step === 1 && (
        <div>
          <p>Basic Laboratory Identity</p>
          <label>Laboratory Name</label>
          <input value={profile.labName} onChange={(e) => updateField('labName', e.target.value)} />
          <label>Lab Logo / Banner URL</label>
          <input value={profile.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} />
          <label>Lab Type</label>
          <select value={profile.labType} onChange={(e) => updateField('labType', e.target.value)}>
            <option value="">Select</option>
            <option value="Pathology">Pathology</option>
            <option value="Radiology">Radiology</option>
            <option value="Comprehensive">Comprehensive</option>
          </select>
          <label>Operating Model</label>
          <select value={profile.operatingModel} onChange={(e) => updateField('operatingModel', e.target.value)}>
            <option value="">Select</option>
            <option value="Standalone single lab">Standalone single lab</option>
            <option value="Hospital-owned lab">Hospital-owned lab</option>
            <option value="Franchise/Chain collection center">Franchise/Chain collection center</option>
          </select>
        </div>
      )}

      {step === 2 && (
        <div>
          <p>Legal & Medical Certification</p>
          <label>NABL / Government Registration Number</label>
          <input value={profile.registrationNumber} onChange={(e) => updateField('registrationNumber', e.target.value)} />
          <label>Chief Pathologist / Radiologist Name</label>
          <input value={profile.chiefDoctorName} onChange={(e) => updateField('chiefDoctorName', e.target.value)} />
          <label>Chief Doctor's License Number</label>
          <input value={profile.licenseNumber} onChange={(e) => updateField('licenseNumber', e.target.value)} />
          <label>Certificate Upload (PDF)</label>
          <input type="file" accept="application/pdf" onChange={handleFileChange('certificate')} />
          {profile.certificateName && <p>Uploaded: {profile.certificateName}</p>}
        </div>
      )}

      {step === 3 && (
        <div>
          <p>Digital Proof & Business Verification</p>
          <label>Official Business Email</label>
          <input value={profile.businessEmail} onChange={(e) => updateField('businessEmail', e.target.value)} />
          <label>Google Business / Maps Link</label>
          <input value={profile.mapsLink} onChange={(e) => updateField('mapsLink', e.target.value)} />
          <label>Bank Account Number</label>
          <input value={profile.bankAccountNumber} onChange={(e) => updateField('bankAccountNumber', e.target.value)} />
          <label>Account Name</label>
          <input value={profile.bankAccountName} onChange={(e) => updateField('bankAccountName', e.target.value)} />
          <label>Bank Code</label>
          <input value={profile.bankCode} onChange={(e) => updateField('bankCode', e.target.value)} />
          <label>Cancelled Cheque Upload</label>
          <input type="file" accept="image/*" onChange={handleFileChange('cheque')} />
          {profile.chequeName && <p>Uploaded: {profile.chequeName}</p>}
        </div>
      )}

      {step === 4 && (
        <div>
          <p>Test Menu & Timings Configuration</p>
          <label>Working Hours</label>
          <input value={profile.openingTime} onChange={(e) => updateField('openingTime', e.target.value)} placeholder="Open - Close" />
          <label>Weekly Off Days</label>
          <div className="checkbox-group">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={profile.weeklyOff.includes(day)}
                  onChange={() => toggleMulti('weeklyOff', day)}
                />
                {day}
              </label>
            ))}
          </div>
          <label>Home Sample Collection</label>
          <select value={profile.homeCollection ? 'Yes' : 'No'} onChange={(e) => updateField('homeCollection', e.target.value === 'Yes')}>
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          <label>Available Test Checklist</label>
          <div className="checkbox-group">
            {['Complete Blood Count', 'Blood Sugar', 'Lipid Profile', 'Thyroid', 'X-Ray', 'Covid-19'].map((test) => (
              <label key={test}>
                <input
                  type="checkbox"
                  checked={profile.availableTests.includes(test)}
                  onChange={() => toggleMulti('availableTests', test)}
                />
                {test}
              </label>
            ))}
          </div>
          <label>Test Pricing Sheet</label>
          <textarea
            value={profile.pricingSheet}
            onChange={(e) => updateField('pricingSheet', e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '0.8rem', borderRadius: '0.65rem', border: '1px solid #cbd5e1' }}
            placeholder="Example: Complete Blood Count - 450, Blood Sugar - 200"
          />
        </div>
      )}

      <div className="onboarding-actions">
        {step > 1 && <button onClick={prevStep}>Previous</button>}
        {step < 4 && <button onClick={nextStep}>Next</button>}
        {step === 4 && <button onClick={() => onComplete(profile)}>Submit for Review</button>}
      </div>
    </div>
  );
}

export default LabOnboarding;
