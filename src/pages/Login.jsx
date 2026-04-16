// ============================================
// LOGIN — Unified email / phone input
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiMail, FiPhone } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import EptomartLogo from '../components/common/EptomartLogo';

const detectType = (val) => {
  if (!val) return null;
  const v = val.trim();
  if (/^\S+@\S+\.\S+$/.test(v)) return 'email';
  if (/^[6-9]\d{9}$/.test(v))   return 'phone';
  return null;
};

const STEPS = { CONTACT: 1, OTP: 2 };

export default function Login() {
  const [step,     setStep]     = useState(STEPS.CONTACT);
  const [contact,  setContact]  = useState('');
  const [detected, setDetected] = useState(null);   // 'email' | 'phone' | null
  const [otp,      setOtp]      = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);

  const confirmRef = useRef(null);
  const recaptchaRef = useRef(null);

  const { sendOtp, verifyOtp, loadUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || '/';

  // Auto-detect on every keystroke
  const handleContactChange = (e) => {
    const val = e.target.value;
    setContact(val);
    setDetected(detectType(val));
  };

  useEffect(() => {
    return () => {
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch (_) {}
      }
    };
  }, []);

  // ── Send OTP ────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const type = detectType(contact);
    if (!type) {
      return toast.error('Enter a valid email or 10-digit phone number');
    }

    setLoading(true);
    try {
      if (type === 'phone') {
        // Firebase phone OTP
        const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
        const { auth } = await import('../utils/firebase');

        if (recaptchaRef.current) {
          try { recaptchaRef.current.clear(); } catch (_) {}
        }
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible', callback: () => {},
        });
        recaptchaRef.current = verifier;

        const result = await signInWithPhoneNumber(auth, `+91${contact.trim()}`, verifier);
        confirmRef.current = result;
        toast.success(`OTP sent to +91 XXXXX${contact.trim().slice(-5)}`);
        setStep(STEPS.OTP);
      } else {
        // Email OTP via backend
        const res = await sendOtp(contact.trim().toLowerCase(), 'email');
        if (res.success) {
          toast.success(res.message);
          setStep(STEPS.OTP);
          if (res.otp) { setOtp(res.otp); toast('🔧 Dev: OTP auto-filled', { icon: '🧪' }); }
        }
      }
    } catch (err) {
      const msg = err.code === 'auth/too-many-requests' ? 'Too many attempts. Try later.'
                : err.code === 'auth/invalid-phone-number' ? 'Invalid phone number'
                : err.message || 'Failed to send OTP';
      toast.error(msg);
      if (recaptchaRef.current) {
        try { recaptchaRef.current.clear(); } catch (_) {}
        recaptchaRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ──────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');

    const type = detectType(contact);
    setLoading(true);
    try {
      if (type === 'phone') {
        if (!confirmRef.current) return toast.error('Please request OTP again');
        const result   = await confirmRef.current.confirm(otp);
        const idToken  = await result.user.getIdToken();
        const { data } = await api.post('/auth/firebase-phone-verify', { idToken, name: name || 'User' });
        if (data.success) {
          localStorage.setItem('eptomart_token', data.token);
          await loadUser();
          toast.success(data.message || 'Login successful!');
          navigate(from, { replace: true });
        }
      } else {
        const res = await verifyOtp(contact, otp, 'email', name || 'User');
        if (res.success) navigate(from, { replace: true });
      }
    } catch (err) {
      const msg = err.code === 'auth/invalid-verification-code' ? 'Wrong OTP. Try again.'
                : err.code === 'auth/code-expired' ? 'OTP expired. Request new one.'
                : err.response?.data?.message || 'Invalid OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(STEPS.CONTACT);
    setOtp('');
    if (recaptchaRef.current) {
      try { recaptchaRef.current.clear(); } catch (_) {}
      recaptchaRef.current = null;
    }
  };

  return (
    <>
      <Helmet><title>Login — Eptomart</title></Helmet>
      <div id="recaptcha-container" />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-900 to-slate-800 flex items-center justify-center p-4" style={{background: 'linear-gradient(135deg, #0D1B3E 0%, #1E3A5F 50%, #0D1B3E 100%)'}}>
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <EptomartLogo variant="full" height={140} className="mb-3" />
            <p className="text-gray-400 text-sm">Sign in to continue shopping</p>
          </div>

          <div className="card p-8 bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            {step === STEPS.CONTACT && (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-6">Welcome! 👋</h2>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email or Mobile Number
                    </label>
                    <input
                      type="text"
                      placeholder="Enter email or 10-digit phone"
                      value={contact}
                      onChange={handleContactChange}
                      autoFocus
                      className="input-field"
                      required
                    />
                    {/* Detection indicator */}
                    {detected && (
                      <div className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full w-fit
                        ${detected === 'email' ? 'bg-blue-50 text-blue-600' : 'bg-green-50 text-green-600'}`}>
                        {detected === 'email' ? <FiMail size={12} /> : <FiPhone size={12} />}
                        Detected as: {detected === 'email' ? 'Email Address' : 'Mobile Number'}
                      </div>
                    )}
                    {contact && !detected && (
                      <p className="mt-1.5 text-xs text-red-500">
                        Enter a valid email or 10-digit Indian mobile number
                      </p>
                    )}
                  </div>

                  <button type="submit" disabled={loading || !detected} className="btn-primary w-full">
                    {loading ? 'Sending OTP...' : 'Send OTP →'}
                  </button>
                </form>

                <p className="text-xs text-gray-400 text-center mt-4">
                  By continuing, you agree to our Terms & Privacy Policy
                </p>
              </>
            )}

            {step === STEPS.OTP && (
              <>
                <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-6">
                  <FiArrowLeft size={16} /> Back
                </button>

                <h2 className="text-xl font-bold text-gray-800 mb-1">Verify OTP 🔐</h2>
                <p className="text-gray-500 text-sm mb-6">
                  6-digit OTP sent to{' '}
                  <span className="font-medium text-gray-700">
                    {detected === 'phone' ? `+91 XXXXX${contact.slice(-5)}` : contact}
                  </span>
                </p>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Your Name <span className="text-gray-400">(for new accounts)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">OTP Code</label>
                    <input
                      type="text"
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input-field text-center text-2xl font-bold tracking-[0.6em]"
                      maxLength={6}
                      autoFocus
                      required
                    />
                  </div>

                  <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>
                </form>

                <div className="text-center mt-4">
                  <button onClick={handleSendOtp} disabled={loading} className="text-sm text-primary-500 hover:underline">
                    Resend OTP
                  </button>
                </div>
              </>
            )}
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">
            <Link to="/" className="text-green-400 hover:text-green-300 hover:underline transition-colors">← Continue Shopping</Link>
          </p>
        </div>
      </div>
    </>
  );
}
