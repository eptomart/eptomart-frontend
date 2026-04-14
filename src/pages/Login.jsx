// ============================================
// LOGIN / REGISTER PAGE — OTP-based
// Phone OTP via Firebase (free, unlimited)
// Email OTP via Resend
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiMail, FiPhone, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';

const STEPS = { CONTACT: 1, OTP: 2 };

export default function Login() {
  const [step, setStep] = useState(STEPS.CONTACT);
  const [loginType, setLoginType] = useState('email');
  const [contact, setContact] = useState('');
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmationResultRef = useRef(null);
  const recaptchaVerifierRef = useRef(null);

  const { sendOtp, verifyOtp, loadUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch (_) {}
        recaptchaVerifierRef.current = null;
      }
    };
  }, []);

  // ── Phone OTP via Firebase ──────────────────────────────
  const sendFirebaseOtp = async () => {
    setLoading(true);
    try {
      const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
      const { auth } = await import('../utils/firebase');

      // Clear previous verifier
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch (_) {}
      }

      const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {},
      });
      recaptchaVerifierRef.current = verifier;

      const phoneNumber = `+91${contact}`;
      const result = await signInWithPhoneNumber(auth, phoneNumber, verifier);
      confirmationResultRef.current = result;

      toast.success(`OTP sent to +91 XXXXX${contact.slice(-5)}`);
      setStep(STEPS.OTP);
    } catch (err) {
      console.error('Firebase OTP error:', err);
      const msg = err.code === 'auth/invalid-phone-number'
        ? 'Invalid phone number'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Try again later.'
        : err.message || 'Failed to send OTP';
      toast.error(msg);
      if (recaptchaVerifierRef.current) {
        try { recaptchaVerifierRef.current.clear(); } catch (_) {}
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyFirebaseOtp = async () => {
    if (!confirmationResultRef.current) {
      return toast.error('Please request OTP again');
    }
    setLoading(true);
    try {
      const result = await confirmationResultRef.current.confirm(otp);
      const idToken = await result.user.getIdToken();

      const { data } = await api.post('/auth/firebase-phone-verify', {
        idToken,
        name: name || 'User',
      });

      if (data.success) {
        localStorage.setItem('eptomart_token', data.token);
        await loadUser();
        toast.success(data.message || 'Login successful!');
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error('Firebase verify error:', err);
      const msg = err.code === 'auth/invalid-verification-code'
        ? 'Wrong OTP. Please check and try again.'
        : err.code === 'auth/code-expired'
        ? 'OTP expired. Please request a new one.'
        : err.response?.data?.message || 'Invalid OTP';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Email OTP via backend ───────────────────────────────
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!contact.trim()) return toast.error('Please enter your ' + loginType);

    if (loginType === 'phone') {
      if (!/^[6-9]\d{9}$/.test(contact)) return toast.error('Enter valid 10-digit mobile number');
      await sendFirebaseOtp();
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(contact.trim().toLowerCase(), loginType);
      if (res.success) {
        toast.success(res.message);
        setStep(STEPS.OTP);
        if (res.otp) {
          setOtp(res.otp);
          toast('🔧 Dev mode: OTP auto-filled', { icon: '🧪' });
        }
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');

    if (loginType === 'phone') {
      await verifyFirebaseOtp();
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(contact, otp, loginType, name || 'User');
      if (res.success) navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(STEPS.CONTACT);
    setOtp('');
    if (recaptchaVerifierRef.current) {
      try { recaptchaVerifierRef.current.clear(); } catch (_) {}
      recaptchaVerifierRef.current = null;
    }
  };

  return (
    <>
      <Helmet><title>Login — Eptomart</title></Helmet>

      {/* Invisible reCAPTCHA container — required by Firebase */}
      <div id="recaptcha-container" />

      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <span className="text-white font-bold text-3xl">E</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">
              Epto<span className="text-primary-500">mart</span>
            </h1>
            <p className="text-gray-500 text-sm mt-1">Sign in to continue shopping</p>
          </div>

          <div className="card p-8">
            {step === STEPS.CONTACT && (
              <>
                <h2 className="text-xl font-bold text-gray-800 mb-6">Welcome! 👋</h2>

                {/* Toggle Email/Phone */}
                <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
                  {['email', 'phone'].map(type => (
                    <button
                      key={type}
                      onClick={() => { setLoginType(type); setContact(''); }}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all
                        ${loginType === type ? 'bg-white shadow text-primary-600' : 'text-gray-500'}`}
                    >
                      {type === 'email' ? <FiMail size={16} /> : <FiPhone size={16} />}
                      {type === 'email' ? 'Email' : 'Mobile'}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      {loginType === 'email' ? 'Email Address' : 'Mobile Number'}
                    </label>
                    {loginType === 'phone' ? (
                      <div className="flex">
                        <span className="input-field w-16 text-center rounded-r-none border-r-0 bg-gray-50 font-medium">+91</span>
                        <input
                          type="tel"
                          placeholder="98765 43210"
                          value={contact}
                          onChange={(e) => setContact(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="input-field rounded-l-none flex-1"
                          required
                        />
                      </div>
                    ) : (
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="input-field"
                        required
                      />
                    )}
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full">
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
                    {loginType === 'email' ? contact : `+91 XXXXX${contact.slice(-5)}`}
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
                      placeholder="Enter 6-digit OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="input-field text-center text-xl font-bold tracking-[0.5em]"
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

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/" className="text-primary-500 hover:underline">← Continue Shopping</Link>
          </p>
        </div>
      </div>
    </>
  );
}
