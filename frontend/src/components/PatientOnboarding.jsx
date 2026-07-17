import { useState, useRef, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { useNavigate } from 'react-router-dom';

const defaultProfile = {
  fullName: '',
  pictureFile: null,
  picturePreview: '',
  dob: '',
  gender: '',
  bloodGroup: '',
  preferredLanguage: '', 
  address: '',
  contactMethods: [],
  emergencyContactName: '',
  emergencyRelationship: '',
  emergencyPhone: '',
  allergies: '',
  chronicConditions: [],
  currentMedications: '',
  dietaryPreferences: '',
  lifestyleHabits: '',
  familyMedicalHistory: [],
  insuranceProvider: '',
  policyNumber: '',
  consentGiven: false,
};

const COMMON_MEDICATIONS = [
  'Acetaminophen', 'Albuterol', 'Amlodipine', 'Amoxicillin', 'Atorvastatin',
  'Azithromycin', 'Carvedilol', 'Clopidogrel', 'Duloxetine', 'Gabapentin',
  'Hydrochlorothiazide', 'Ibuprofen', 'Levothyroxine', 'Lisinopril', 'Losartan',
  'Metformin', 'Metoprolol', 'Omeprazole', 'Pantoprazole', 'Prednisone',
  'Rosuvastatin', 'Sertraline', 'Simvastatin', 'Tramadol', 'Paracetamol'
];

function PatientOnboarding({ onComplete, email }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(defaultProfile);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Track save submission

  // Scanner State Management
  const [isScanning, setIsScanning] = useState(false);
  const [detectedStatus, setDetectedStatus] = useState('Position your medicine label/sticker in the box...');
  
  // Refs for automated video loops
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const isProcessingRef = useRef(false);
  const loopActiveRef = useRef(false);
  const navigate = useNavigate();

  // Safety cleanup: Turn off camera stream if the user unmounts/leaves the page mid-scan
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const updateField = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMulti = (key, value) => {
    setProfile((prev) => {
      const values = prev[key] || [];
      return {
        ...prev,
        [key]: values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
      };
    });
  };

  const handleFileChange = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFileError('File size exceeds 5MB.'); return; }
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) { setFileError('Upload a valid JPG/PNG.'); return; }
    setFileError('');
    setProfile((prev) => ({ ...prev, pictureFile: file, picturePreview: URL.createObjectURL(file) }));
  };

  // --- AUTOMATIC LIVE SCANNER CORE LOGIC ---
  const startCameraScanner = async () => {
    setIsScanning(true);
    setDetectedStatus('Warming up camera sensor...');
    loopActiveRef.current = true;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          requestAnimationFrame(analyzeLiveFrame);
        };
      }
    } catch (err) {
      console.error("Camera access fault: ", err);
      alert("Could not access camera source. Please clear permissions settings.");
      stopCameraScanner();
    }
  };

  const stopCameraScanner = () => {
    loopActiveRef.current = false;
    isProcessingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const analyzeLiveFrame = async () => {
    if (!loopActiveRef.current || !videoRef.current) return;
    if (isProcessingRef.current) {
      requestAnimationFrame(analyzeLiveFrame);
      return;
    }

    isProcessingRef.current = true;
    const video = videoRef.current;
    
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      try {
        setDetectedStatus('Scanning sticker for text...');
        const { data: { text } } = await Tesseract.recognize(canvas, 'eng');
        
        const foundMed = COMMON_MEDICATIONS.find(med => 
          text.toLowerCase().includes(med.toLowerCase())
        );

        if (foundMed) {
          updateField('currentMedications', foundMed);
          setDetectedStatus(`Matched: ${foundMed}! Closing window...`);
          setTimeout(() => {
            stopCameraScanner();
          }, 1200);
          return; 
        }
      } catch (ocrErr) {
        console.error("Frame OCR analysis dropped: ", ocrErr);
      }
    }

    isProcessingRef.current = false;
    if (loopActiveRef.current) {
      setTimeout(() => {
        requestAnimationFrame(analyzeLiveFrame);
      }, 400); 
    }
  };

  const nextStep = () => setStep((prev) => Math.min(prev + 1, 4));
  const prevStep = () => setStep((prev) => Math.max(prev - 1, 1));

  // Improved submit handler with loading states and proper route string navigation
  const handleSubmit = async () => {
    if (!profile.consentGiven) return alert('Please agree to terms.');
    
    setIsSubmitting(true);
    try {
      await onComplete(profile);
      // Fixed relative route file name to a proper application path destination
      navigate('/patient-dashboard'); 
    } catch (error) {
      console.error("Error saving onboarding details:", error);
      alert("There was an issue creating your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) {
      return (
        profile.fullName.trim() !== '' && 
        profile.dob !== '' && 
        profile.gender !== '' &&
        profile.preferredLanguage !== ''
      );
    }
    if (step === 2) {
      return (
        profile.address.trim() !== '' && 
        profile.contactMethods.length > 0 && 
        profile.emergencyContactName.trim() !== '' && 
        profile.emergencyRelationship !== '' && 
        profile.emergencyPhone.trim() !== ''
      );
    }
    return true;
  };

  return (
    <div className="onboarding-container" style={{ textAlign: 'left', fontFamily: 'system-ui, sans-serif', color: '#1e293b', maxWidth: '540px', margin: '0 auto', padding: '1rem' }}>
      
      {/* Step Progress Display */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '700' }}>Patient Onboarding</h2>
          <span style={{ fontSize: '0.875rem', color: '#64748b', fontWeight: '600' }}>Step {step} of 4</span>
        </div>
        <div style={{ height: '6px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${(step / 4) * 100}%`, backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }} />
        </div>
      </div>

      {/* STEP 1: IDENTITY DETAILS */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Full Name *</label>
            <input type="text" value={profile.fullName} onChange={(e) => updateField('fullName', e.target.value)} placeholder="John Doe" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Profile Picture</label>
            <div onClick={() => document.getElementById('pic').click()} style={{ border: '2px dashed #cbd5e1', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'center', backgroundColor: '#f8fafc', cursor: 'pointer' }}>
              <input id="pic" type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => handleFileChange(e.target.files[0])} />
              {profile.picturePreview ? "Change photo" : "Select profile photo"}
            </div>
            {fileError && <p style={{ color: '#ef4444', fontSize: '0.85rem' }}>{fileError}</p>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Date of Birth *</label>
              <input type="date" value={profile.dob} onChange={(e) => updateField('dob', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Gender *</label>
              <select value={profile.gender} onChange={(e) => updateField('gender', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Blood Group</label>
              <select value={profile.bloodGroup} onChange={(e) => updateField('bloodGroup', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="">Select</option>
                <option value="A+">A+</option><option value="A-">A-</option>
                <option value="B+">B+</option><option value="B-">B-</option>
                <option value="O+">O+</option><option value="O-">O-</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Preferred Language *</label>
              <select value={profile.preferredLanguage} onChange={(e) => updateField('preferredLanguage', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', boxSizing: 'border-box' }}>
                <option value="">Select Language</option>
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Spanish">Spanish</option>
                <option value="Gujarati">Gujarati</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: CONTACT */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Permanent Address *</label>
            <input type="text" value={profile.address} onChange={(e) => updateField('address', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Preferred Contact Method *</label>
            <div style={{ display: 'flex', gap: '1.5rem' }}>
              {['WhatsApp', 'SMS', 'Email'].map(m => (
                <label key={m} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" checked={profile.contactMethods.includes(m)} onChange={() => toggleMulti('contactMethods', m)} />{m}
                </label>
              ))}
            </div>
          </div>
          <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem', borderRadius: '0.75rem', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ margin: 0 }}>Emergency Contact</h4>
            <input type="text" placeholder="Name" value={profile.emergencyContactName} onChange={(e) => updateField('emergencyContactName', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            <input type="text" placeholder="Relationship" value={profile.emergencyRelationship} onChange={(e) => updateField('emergencyRelationship', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            <input type="tel" placeholder="Phone" value={profile.emergencyPhone} onChange={(e) => updateField('emergencyPhone', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>
        </div>
      )}

      {/* STEP 3: MEDICAL CONTROLS */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Known Allergies</label>
            <input type="text" value={profile.allergies} onChange={(e) => updateField('allergies', e.target.value)} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.5rem' }}>Chronic Conditions</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {['Diabetes', 'High Blood Pressure', 'Asthma', 'None'].map(c => (
                <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input type="checkbox" checked={profile.chronicConditions.includes(c)} onChange={() => toggleMulti('chronicConditions', c)} />{c}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: '500', marginBottom: '0.35rem' }}>Current Medications</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input 
                type="text" 
                value={profile.currentMedications} 
                onChange={(e) => updateField('currentMedications', e.target.value)} 
                placeholder="Type name or scan medicine package sticker..." 
                list="meds"
                style={{ flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} 
              />
              <button 
                type="button" 
                onClick={startCameraScanner} 
                style={{ padding: '0.75rem 1.25rem', borderRadius: '0.5rem', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontWeight: '600', cursor: 'pointer' }}
              >
                📷 Live Scan
              </button>
            </div>
            <datalist id="meds">
              {COMMON_MEDICATIONS.map((m, i) => <option key={i} value={m} />)}
            </datalist>
          </div>

          {isScanning && (
            <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(15,23,42,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', boxSizing: 'border-box' }}>
              <div style={{ background: '#fff', padding: '1.25rem', borderRadius: '0.75rem', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                <h3 style={{ marginTop: 0 }}>Point Camera at Sticker</h3>
                <div style={{ position: 'relative', width: '100%', height: '280px', backgroundColor: '#000', borderRadius: '0.5rem', overflow: 'hidden', marginBottom: '1rem' }}>
                  <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  {/* Fixed box pointers typo to pointerEvents */}
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '80%', height: '50%', border: '3px dashed #3b82f6', pointerEvents: 'none', boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)' }} />
                </div>
                <div style={{ backgroundColor: '#f1f5f9', padding: '0.75rem', borderRadius: '0.375rem', fontSize: '0.9rem', marginBottom: '1.25rem' }}>{detectedStatus}</div>
                <button type="button" onClick={stopCameraScanner} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 4: CONSENT */}
      {step === 4 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.5rem' }}>
            <label style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={profile.consentGiven} onChange={(e) => updateField('consentGiven', e.target.checked)} />
              <span>I agree to let ArogaX store my medical records securely.</span>
            </label>
          </div>
        </div>
      )}

      {/* Footer Controls */}
      <div style={{ display: 'flex', justifyContent: step === 1 ? 'flex-end' : 'space-between', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
        {step > 1 && <button type="button" onClick={prevStep} disabled={isSubmitting} style={{ padding: '0.75rem 1.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', backgroundColor: '#fff', cursor: isSubmitting ? 'not-allowed' : 'pointer' }}>Previous</button>}
        {step < 4 ? (
          <button type="button" onClick={nextStep} disabled={!isStepValid()} style={{ padding: '0.75rem 1.75rem', borderRadius: '0.5rem', border: 'none', backgroundColor: isStepValid() ? '#0f172a' : '#cbd5e1', color: isStepValid() ? '#fff' : '#94a3b8', cursor: isStepValid() ? 'pointer' : 'not-allowed', fontWeight: '600' }}>Next</button>
        ) : (
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={!profile.consentGiven || isSubmitting} 
            style={{ 
              padding: '0.75rem 1.75rem', 
              borderRadius: '0.5rem', 
              border: 'none', 
              backgroundColor: (profile.consentGiven && !isSubmitting) ? '#10b981' : '#cbd5e1', 
              color: (profile.consentGiven && !isSubmitting) ? '#fff' : '#94a3b8', 
              cursor: (profile.consentGiven && !isSubmitting) ? 'pointer' : 'not-allowed', 
              fontWeight: '600' 
            }}
          >
            {isSubmitting ? 'Saving...' : 'Finish Setup'}
          </button>
        )}
      </div>

    </div>
  );
}

export default PatientOnboarding;