import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PatientOnboarding from '../components/PatientOnboarding';
import ClinicOnboarding from '../components/ClinicOnboarding';
import LabOnboarding from '../components/LabOnboarding';
import HospitalOnboarding from '../components/HospitalOnboarding';
import RoleSelect from '../components/RoleSelect';
import arogyaXLogo from '../assets/arogyax-logo.png';
import '../styles/pages/LoginPage.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '337967019231-2rvoftljiab9cqoanfralqfc3fjtr875.apps.googleusercontent.com';
const SPECIAL_ADMIN_EMAIL = 'princep4732355@gmail.com';
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showAnimation, setShowAnimation] = useState(true);
  
  // Auth state
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authGoogleId, setAuthGoogleId] = useState('');
  const [account, setAccount] = useState(null);
  const [authCredential, setAuthCredential] = useState('');
  
  // UI state
  const [userRole, setUserRole] = useState(''); // for new member onboarding
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfileSelect, setShowProfileSelect] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setShowAnimation(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  // Handle addMember=true — auto-load existing account and show PatientOnboarding
  useEffect(() => {
    const isAddMember = searchParams.get('addMember') === 'true';
    if (!isAddMember) return;

    // Read stored user from localStorage
    let storedUser;
    try {
      storedUser = JSON.parse(localStorage.getItem('arogax2User') || 'null');
    } catch { storedUser = null; }

    if (!storedUser?.email) return;

    const loadAccount = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/check?email=${encodeURIComponent(storedUser.email)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.exists && data.account) {
          setAuthEmail(storedUser.email);
          setAuthName(storedUser.name || '');
          setAccount(data.account);
          setUserRole('patient');
          setShowAnimation(false);
          setShowOnboarding(true);
        }
      } catch (err) {
        console.error('Failed to load account for addMember:', err);
      }
    };

    loadAccount();
  }, [searchParams]);


  useEffect(() => {
    let mounted = true;
    const buttonContainer = () => document.getElementById('google-signin-button');
    const initializeGoogleButton = () => {
      const gsi = window.google?.accounts?.id;
      const container = buttonContainer();
      if (!mounted || !gsi || !container) return false;

      try {
        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: false,
        });
        gsi.renderButton(container, {
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'left',
        });
        setStatusMessage('');
        return true;
      } catch (e) {
        console.error('Google Sign-In initialization error:', e);
        setStatusMessage('Google sign-in encountered an error during initialization.');
        return false;
      }
    };

    const ensureScriptLoaded = () => {
      const existing = document.querySelector('script[data-google-gsi]');
      if (existing) {
        if (window.google?.accounts?.id) {
          initializeGoogleButton();
          return;
        }
      }

      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.setAttribute('data-google-gsi', 'loaded');
      script.onerror = () => {
        if (!mounted) return;
        setStatusMessage('Google login script failed to load. Check your internet connection and browser settings, then refresh.');
      };
      script.onload = () => {
        if (!mounted) return;
        let retries = 0;
        const maxRetries = 40;

        const waitForGsi = () => {
          if (!mounted) return;
          if (initializeGoogleButton()) return;

          retries += 1;
          if (retries > maxRetries) {
            setStatusMessage('Google sign-in is not ready yet. Please refresh the page and make sure https://accounts.google.com is not blocked.');
            return;
          }

          setTimeout(waitForGsi, 250);
        };

        waitForGsi();
      };
      document.head.appendChild(script);

      return () => {
        mounted = false;
        const scriptElement = document.querySelector('script[data-google-gsi]');
        if (scriptElement && scriptElement.parentNode) scriptElement.parentNode.removeChild(scriptElement);
      };
    };

    const cleanup = ensureScriptLoaded();
    return () => {
      mounted = false;
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  const handleCredentialResponse = async (response) => {
    const token = response.credential || response.code;
    if (!token) return;

    if (typeof token !== 'string' || !token.includes('.') || token.startsWith('4/')) {
      console.warn('Received non-JWT credential or OAuth code:', token);
      setStatusMessage(`Received authorization code instead of Google ID token (${token.substring(0, 15)}...). Please sign in via Google login standard popup.`);
      return;
    }

    const parts = token.split('.');
    if (parts.length < 2 || !parts[1]) {
      setStatusMessage('Invalid JWT token received from Google login.');
      return;
    }

    let profile = {};
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => `%${(`00${c.charCodeAt(0).toString(16)}`).slice(-2)}`)
          .join('')
      );
      profile = JSON.parse(jsonPayload);
    } catch (e) {
      console.error('Failed to parse Google JWT payload:', e);
      setStatusMessage('Failed to parse Google login response token.');
      return;
    }

    const { email, name, sub } = profile;
    if (!email) {
      setStatusMessage('No email address found in Google token.');
      return;
    }

    setAuthEmail(email);
    setAuthName(name || '');
    setAuthGoogleId(sub || '');
    setAuthCredential(token);
    setStatusMessage('');

    try {
      const checkRes = await fetch(`${API_URL}/api/auth/check?email=${encodeURIComponent(email)}`);
      if (!checkRes.ok) throw new Error('Auth server is unavailable');
      const checkJson = await checkRes.json();
      
      let userAccount = checkJson.account;

      if (!checkJson.exists) {
        // Create account
        const registerRes = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, googleId: sub, role: 'patient' }), // role doesn't matter much here
        });
        const registerData = await registerRes.json();
        userAccount = registerData.account;
      }

      setAccount(userAccount);

      if (email === 'princep4732355@gmail.com' || email === 'princep4732355@gamil.com') {
        const adminMember = userAccount.members.find(m => m.role === 'admin');
        if (adminMember) {
          await handleProfileSelect(adminMember, userAccount);
          return;
        }
      }

      if (userAccount.members && userAccount.members.length > 0) {
        setShowProfileSelect(true);
      } else {
        setShowRoleSelect(true);
      }

    } catch (error) {
      console.error(error);
      setStatusMessage('Login server is running, but the auth database is not connected. Check MongoDB credentials and try again.');
    }
  };

  const handleProfileSelect = async (member, currentAccount = account) => {
    // Fetch full profile data
    try {
      const res = await fetch(`${API_URL}/api/auth/member/${member.profileId}?role=${member.role}`);
      const data = await res.json();
      
      const userData = {
        email: authEmail,
        accountId: currentAccount._id,
        role: member.role,
        profileId: member.profileId,
        name: member.name,
        token: authCredential || 'mock-token',
        profile: data.profile || {}
      };

      if (data.profile?.verificationStatus === 'pending') {
         setStatusMessage('This profile is pending verification. You will be notified once it is approved.');
         return;
      }
      if (data.profile?.verificationStatus === 'rejected') {
         setStatusMessage('This profile was rejected. Please contact support.');
         return;
      }

      localStorage.setItem('arogax2User', JSON.stringify(userData));
      navigateToDashboard(member.role);

    } catch(err) {
      console.error(err);
      setStatusMessage('Failed to load profile. Please try again.');
    }
  };

  const handleRoleSelect = (selectedRole) => {
    setStatusMessage('');
    setUserRole(selectedRole);
    setShowRoleSelect(false);
    setShowProfileSelect(false);
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = async (endpoint, profileData, role) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, ...profileData }),
      });
      const data = await res.json();
      
      // data returns { account, profile }
      const newMember = data.account.members[data.account.members.length - 1];
      
      const userData = {
        email: authEmail,
        accountId: data.account._id,
        role: newMember.role,
        profileId: newMember.profileId,
        name: newMember.name,
        token: authCredential || 'mock-token',
        profile: data.profile
      };

      localStorage.setItem('arogax2User', JSON.stringify(userData));
      setShowOnboarding(false);
      
      if (data.profile.verificationStatus === 'pending') {
        setStatusMessage(`${role} onboarding submitted. Your profile is now pending verification.`);
        setShowProfileSelect(true); // Go back to profile select
        setAccount(data.account);
      } else {
        navigateToDashboard(newMember.role);
      }
    } catch (err) {
      console.error(err);
      setStatusMessage('Failed to save profile. Please try again.');
    }
  };

  const navigateToDashboard = (role) => {
    if (role === 'admin') return navigate('/admin');
    if (role === 'hospital') return navigate('/hospital');
    if (role === 'laboratory') return navigate('/laboratory');
    if (role === 'clinic' || role === 'doctor') return navigate('/clinic');
    return navigate('/patient-dashboard'); // Patient dashboard
  };

  if (showAnimation) {
    return (
      <div className="login-animation-screen">
        <div className="login-logo-animation">
          <img src={arogyaXLogo} alt="ArogyaX" />
          <div className="login-loader" aria-label="Loading login" />
        </div>
      </div>
    );
  }

  let formContent = null;

  if (showProfileSelect && account) {
    formContent = (
      <div className="login-card">
        <img className="login-brand-logo-centered" src={arogyaXLogo} alt="ArogyaX" />
        <div className="login-copy">
          <p className="section-kicker">Who's logging in?</p>
          <h1>Select Profile</h1>
          <p>Choose an existing profile or add a new one.</p>
        </div>
        
        <div className="profile-select-grid">
          {account.members.map((member, idx) => (
            <div 
              key={idx}
              className="profile-card"
              onClick={() => handleProfileSelect(member)}
            >
              <div className="profile-avatar">
                {member.name ? member.name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="profile-name" title={member.name}>{member.name}</div>
              <div className="profile-role-badge">{member.role}</div>
            </div>
          ))}
          
          <div 
            className="profile-card add-profile-card"
            onClick={() => {
              setUserRole('patient');
              setShowProfileSelect(false);
              setShowOnboarding(true);
            }}
          >
            <div className="plus-icon">+</div>
            <span>Add New Profile</span>
          </div>
        </div>

        {statusMessage && (
          <p className="login-status">{statusMessage}</p>
        )}
      </div>
    );
  } else if (showRoleSelect) {
    formContent = (
      <div className="login-card">
        <img className="login-brand-logo-centered" src={arogyaXLogo} alt="ArogyaX" />
        <div className="login-copy">
          <p className="section-kicker">Create a profile</p>
          <h1>Choose your role</h1>
          <p>Select whether you are a patient, clinic provider, laboratory, or hospital to continue.</p>
        </div>
        <RoleSelect onSelect={handleRoleSelect} />
        {account?.members?.length > 0 && (
          <button 
            className="back-link-btn"
            onClick={() => { setShowRoleSelect(false); setShowProfileSelect(true); }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back to profiles
          </button>
        )}
        {statusMessage && (
          <p className="login-status">{statusMessage}</p>
        )}
      </div>
    );
  } else if (showOnboarding) {
    formContent = (
      <div className="login-card" style={{ maxWidth: '600px', textAlign: 'left' }}>
        <img className="login-brand-logo-centered" src={arogyaXLogo} alt="ArogyaX" />
        {userRole === 'clinic' || userRole === 'doctor' ? (
          <ClinicOnboarding onComplete={(profile) => handleOnboardingComplete('clinic-profile', { clinicProfile: profile }, 'Clinic')} />
        ) : userRole === 'laboratory' ? (
          <LabOnboarding onComplete={(profile) => handleOnboardingComplete('lab-profile', { labProfile: profile }, 'Laboratory')} />
        ) : userRole === 'hospital' ? (
          <HospitalOnboarding onComplete={(profile) => handleOnboardingComplete('hospital-profile', { hospitalProfile: profile }, 'Hospital')} />
        ) : (
          <PatientOnboarding onComplete={(profile) => handleOnboardingComplete('patient-profile', { profile, memberName: profile.fullName }, 'Patient')} email={authEmail} />
        )}
      </div>
    );
  } else {
    formContent = (
      <div className="login-card">
        <img className="login-brand-logo-centered" src={arogyaXLogo} alt="ArogyaX" />
        <div className="google-login-shell">
          <div id="google-signin-button" />
        </div>
        {statusMessage && (
          <p className="login-status">{statusMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div className="login-container">
      {formContent}
    </div>
  );
}

export default LoginPage;

