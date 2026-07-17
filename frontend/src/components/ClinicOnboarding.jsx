import { useState } from 'react';

const defaultClinicProfile = {
  clinicName: '',
  logoUrl: '',
  specialityType: '',
  establishmentYear: '',
  registrationNumber: '',
  ownerName: '',
  taxId: '',
  proofDocumentName: '',
  proofDocumentData: '',
  address: '',
  mapsLink: '',
  phoneNumber: '',
  emergencyPhone: '',
  workingDays: [],
  morningHours: '',
  eveningHours: '',
  consultationTime: '',
  consultationFee: '',
};

function ClinicOnboarding({ onComplete }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(defaultClinicProfile);

  const updateField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleDays = (day) => {
    setProfile((prev) => {
      const values = prev.workingDays || [];
      return {
        ...prev,
        workingDays: values.includes(day)
          ? values.filter((item) => item !== day)
          : [...values, day],
      };
    });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateField('proofDocumentName', file.name);
      updateField('proofDocumentData', reader.result);
    };
    reader.readAsDataURL(file);
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  const handleSubmit = () => {
    onComplete(profile);
  };

  return (
    <div className="onboarding-card">
      <h2>Clinic Onboarding - Step {step} of 4</h2>

      {step === 1 && (
        <div>
          <p>Basic Clinic Identity</p>
          <label>Clinic Name</label>
          <input value={profile.clinicName} onChange={(e) => updateField('clinicName', e.target.value)} />
          <label>Clinic Logo / Photo URL</label>
          <input value={profile.logoUrl} onChange={(e) => updateField('logoUrl', e.target.value)} />
          <label>Speciality Type</label>
          <select value={profile.specialityType} onChange={(e) => updateField('specialityType', e.target.value)}>
            <option value="">Select</option>
            <option value="Dental Clinic">Dental Clinic</option>
            <option value="Pediatrics">Pediatrics</option>
            <option value="General Medicine">General Medicine</option>
            <option value="Ayurveda">Ayurveda</option>
            <option value="Other">Other</option>
          </select>
          <label>Establishment Year</label>
          <input type="number" value={profile.establishmentYear} onChange={(e) => updateField('establishmentYear', e.target.value)} />
        </div>
      )}

      {step === 2 && (
        <div>
          <p>Legal Verification & Registrations</p>
          <label>Medical Registration Number</label>
          <input value={profile.registrationNumber} onChange={(e) => updateField('registrationNumber', e.target.value)} />
          <label>Owner / Chief Doctor Name</label>
          <input value={profile.ownerName} onChange={(e) => updateField('ownerName', e.target.value)} />
          <label>Tax / Business ID</label>
          <input value={profile.taxId} onChange={(e) => updateField('taxId', e.target.value)} />
          <label>Proof Document Upload (PDF)</label>
          <input type="file" accept="application/pdf" onChange={handleFileChange} />
          {profile.proofDocumentName && <p>Uploaded: {profile.proofDocumentName}</p>}
        </div>
      )}

      {step === 3 && (
        <div>
          <p>Location & Contact Details</p>
          <label>Full Clinic Address</label>
          <input value={profile.address} onChange={(e) => updateField('address', e.target.value)} />
          <label>Google Maps Link</label>
          <input value={profile.mapsLink} onChange={(e) => updateField('mapsLink', e.target.value)} />
          <label>Official Phone Number</label>
          <input value={profile.phoneNumber} onChange={(e) => updateField('phoneNumber', e.target.value)} />
          <label>Emergency Contact</label>
          <input value={profile.emergencyPhone} onChange={(e) => updateField('emergencyPhone', e.target.value)} />
        </div>
      )}

      {step === 4 && (
        <div>
          <p>Timings & Slot Configuration</p>
          <label>Working Days</label>
          <div className="checkbox-group">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
              <label key={day}>
                <input
                  type="checkbox"
                  checked={profile.workingDays.includes(day)}
                  onChange={() => toggleDays(day)}
                />
                {day}
              </label>
            ))}
          </div>
          <label>Morning Hours</label>
          <input value={profile.morningHours} onChange={(e) => updateField('morningHours', e.target.value)} placeholder="9:00 AM - 1:00 PM" />
          <label>Evening Hours</label>
          <input value={profile.eveningHours} onChange={(e) => updateField('eveningHours', e.target.value)} placeholder="5:00 PM - 9:00 PM" />
          <label>Average Consultation Time</label>
          <select value={profile.consultationTime} onChange={(e) => updateField('consultationTime', e.target.value)}>
            <option value="">Select</option>
            <option value="10 mins">10 mins</option>
            <option value="15 mins">15 mins</option>
            <option value="20 mins">20 mins</option>
          </select>
          <label>Consultation Fee</label>
          <input value={profile.consultationFee} onChange={(e) => updateField('consultationFee', e.target.value)} placeholder="e.g. 500" />
        </div>
      )}

      <div className="onboarding-actions">
        {step > 1 && <button onClick={prevStep}>Previous</button>}
        {step < 4 && <button onClick={nextStep}>Next</button>}
        {step === 4 && <button onClick={handleSubmit}>Finish Setup</button>}
      </div>
    </div>
  );
}

export default ClinicOnboarding;
