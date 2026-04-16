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

      {/* ── Page shell: two-panel layout on desktop, stacked on mobile ── */}
      <div className="min-h-screen flex" style={{background:'#0B1729'}}>

        {/* Left panel — branding (hidden on mobile) */}
        <div className="hidden lg:flex flex-col items-center justify-center flex-1 px-12 relative overflow-hidden">
          {/* Subtle radial glow behind logo */}
          <div style={{
            position:'absolute', width:480, height:480,
            borderRadius:'50%', top:'50%', left:'50%',
            transform:'translate(-50%,-50%)',
            background:'radial-gradient(circle, rgba(245,160,32,0.08) 0%, transparent 70%)',
            pointerEvents:'none',
          }}/>

          {/* Actual logo — transparent, no box */}
          <EptomartLogo variant="horizontal" height={56} style={{filter:'drop-shadow(0 4px 24px rgba(245,160,32,0.25))'}} />

          <p className="mt-6 text-gray-500 text-sm text-center max-w-xs leading-relaxed">
            India's premium multi-vendor marketplace. Thousands of products, trusted sellers.
          </p>

          {/* Decorative badges */}
          <div className="flex gap-3 mt-8">
            {['Secure Payments', 'GST Invoice', 'Fast Delivery'].map(b => (
              <span key={b} className="text-xs px-3 py-1.5 rounded-full border font-medium"
                style={{borderColor:'rgba(245,160,32,0.3)', color:'#8899AA', background:'rgba(245,160,32,0.06)'}}>
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* Right panel — form */}
        <div className="flex flex-col items-center justify-center w-full lg:w-[440px] lg:flex-none px-6 py-10"
          style={{background:'rgba(255,255,255,0.03)', borderLeft:'1px solid rgba(255,255,255,0.06)'}}>

          {/* Mobile-only logo */}
          <div className="lg:hidden mb-8">
            <EptomartLogo variant="horizontal" height={44}
              style={{filter:'drop-shadow(0 2px 12px rgba(245,160,32,0.2))'}} />
          </div>

          <div className="w-full max-w-sm">
            {/* Form card */}
            <div style={{
              background:'rgba(255,255,255,0.05)',
              border:'1px solid rgba(255,255,255,0.1)',
              borderRadius:20,
              backdropFilter:'blur(12px)',
              padding:'2rem',
            }}>
              {step === STEPS.CONTACT && (
                <>
                  <h2 className="text-xl font-bold text-white mb-1">Welcome back 👋</h2>
                  <p className="text-gray-500 text-sm mb-6">Sign in to your Eptomart account</p>

                  <form onSubmit={handleSendOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                        Email or Mobile Number
                      </label>
                      <input
                        type="text"
                        placeholder="Enter email or 10-digit phone"
                        value={contact}
                        onChange={handleContactChange}
                        autoFocus
                        required
                        style={{
                          width:'100%', padding:'12px 16px', borderRadius:12,
                          background:'rgba(255,255,255,0.08)',
                          border:'1px solid rgba(255,255,255,0.15)',
                          color:'white', fontSize:14, outline:'none',
                        }}
                        onFocus={e => e.target.style.borderColor='rgba(245,160,32,0.6)'}
                        onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.15)'}
                      />
                      {detected && (
                        <div className={`mt-2 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full
                          ${detected === 'email' ? 'bg-blue-500/15 text-blue-400' : 'bg-green-500/15 text-green-400'}`}>
                          {detected === 'email' ? <FiMail size={11}/> : <FiPhone size={11}/>}
                          {detected === 'email' ? 'Email detected' : 'Mobile detected'}
                        </div>
                      )}
                      {contact && !detected && (
                        <p className="mt-1.5 text-xs text-red-400">
                          Enter a valid email or 10-digit Indian mobile number
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={loading || !detected}
                      style={{
                        width:'100%', padding:'13px', borderRadius:12, border:'none',
                        background: detected ? 'linear-gradient(135deg,#F5A020,#F06810)' : 'rgba(255,255,255,0.1)',
                        color: detected ? 'white' : '#555', fontSize:14,
                        fontWeight:700, cursor: detected ? 'pointer' : 'not-allowed',
                        transition:'all 0.2s', letterSpacing:0.3,
                      }}
                    >
                      {loading ? 'Sending OTP…' : 'Send OTP →'}
                    </button>
                  </form>

                  <p className="text-xs text-gray-600 text-center mt-5">
                    By continuing you agree to our Terms & Privacy Policy
                  </p>
                </>
              )}

              {step === STEPS.OTP && (
                <>
                  <button onClick={handleBack}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 mb-5 transition-colors">
                    <FiArrowLeft size={15}/> Back
                  </button>

                  <h2 className="text-xl font-bold text-white mb-1">Verify OTP 🔐</h2>
                  <p className="text-gray-500 text-sm mb-6">
                    6-digit code sent to{' '}
                    <span className="text-gray-300 font-medium">
                      {detected === 'phone' ? `+91 XXXXX${contact.slice(-5)}` : contact}
                    </span>
                  </p>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">
                        Your Name <span className="normal-case text-gray-600">(new accounts)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Enter your full name"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        style={{
                          width:'100%', padding:'12px 16px', borderRadius:12,
                          background:'rgba(255,255,255,0.08)',
                          border:'1px solid rgba(255,255,255,0.15)',
                          color:'white', fontSize:14, outline:'none',
                        }}
                        onFocus={e => e.target.style.borderColor='rgba(245,160,32,0.6)'}
                        onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.15)'}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide">OTP Code</label>
                      <input
                        type="text"
                        placeholder="• • • • • •"
                        value={otp}
                        onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                        maxLength={6}
                        autoFocus
                        required
                        style={{
                          width:'100%', padding:'14px 16px', borderRadius:12,
                          background:'rgba(255,255,255,0.08)',
                          border:'1px solid rgba(255,255,255,0.15)',
                          color:'white', fontSize:22, fontWeight:800,
                          textAlign:'center', letterSpacing:'0.55em', outline:'none',
                        }}
                        onFocus={e => e.target.style.borderColor='rgba(245,160,32,0.6)'}
                        onBlur={e  => e.target.style.borderColor='rgba(255,255,255,0.15)'}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      style={{
                        width:'100%', padding:'13px', borderRadius:12, border:'none',
                        background: otp.length === 6 ? 'linear-gradient(135deg,#F5A020,#F06810)' : 'rgba(255,255,255,0.1)',
                        color: otp.length === 6 ? 'white' : '#555', fontSize:14,
                        fontWeight:700, cursor: otp.length===6 ? 'pointer' : 'not-allowed',
                        transition:'all 0.2s',
                      }}
                    >
                      {loading ? 'Verifying…' : 'Verify & Login'}
                    </button>
                  </form>

                  <div className="text-center mt-4">
                    <button onClick={handleSendOtp} disabled={loading}
                      className="text-sm text-orange-400 hover:text-orange-300 transition-colors">
                      Resend OTP
                    </button>
                  </div>
                </>
              )}
            </div>

            <p className="text-center text-sm text-gray-600 mt-6">
              <Link to="/" className="text-orange-400 hover:text-orange-300 transition-colors">
                ← Continue Shopping
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
