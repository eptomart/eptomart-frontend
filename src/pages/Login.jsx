// ============================================
// LOGIN — Centered, premium, brand-consistent
// ============================================
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiMail, FiPhone, FiShield, FiTruck, FiFileText } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import toast from 'react-hot-toast';
import EptomartLogo from '../components/common/EptomartLogo';

// ── Exact brand colours extracted from logo ──────────────────────────────────
const C = {
  orange:     '#F4941C',
  orangeHov:  '#E2850E',
  orangeGlow: 'rgba(244,148,28,0.22)',
  green:      '#6DB651',
  navy:       '#0B1928',
  navyLight:  '#0F2236',
  navyCard:   'rgba(255,255,255,0.05)',
  border:     'rgba(255,255,255,0.10)',
  borderFocus:'rgba(244,148,28,0.55)',
  textPrimary:'#F0F4F8',
  textMuted:  '#8899AA',
  textDim:    '#4A5A6A',
};

const detectType = (val) => {
  if (!val) return null;
  const v = val.trim();
  if (/^\S+@\S+\.\S+$/.test(v)) return 'email';
  if (/^[6-9]\d{9}$/.test(v))   return 'phone';
  return null;
};

const STEPS = { CONTACT: 1, OTP: 2 };

// ── Reusable styled input ────────────────────────────────────────────────────
function DarkInput({ style = {}, ...props }) {
  const [focused, setFocused] = React.useState(false);
  return (
    <input
      {...props}
      onFocus={e  => { setFocused(true);  props.onFocus?.(e); }}
      onBlur={e   => { setFocused(false); props.onBlur?.(e);  }}
      style={{
        width: '100%',
        padding: '13px 16px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.07)',
        border: `1.5px solid ${focused ? C.borderFocus : C.border}`,
        color: C.textPrimary,
        fontSize: 14,
        outline: 'none',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        boxShadow: focused ? `0 0 0 3px ${C.orangeGlow}` : 'none',
        ...style,
      }}
    />
  );
}

// ── Primary button ───────────────────────────────────────────────────────────
function OrangeButton({ disabled, children, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={{
        width: '100%',
        padding: '14px',
        borderRadius: 12,
        border: 'none',
        background: disabled
          ? 'rgba(255,255,255,0.08)'
          : `linear-gradient(135deg, ${C.orange} 0%, ${C.orangeHov} 100%)`,
        color: disabled ? C.textDim : '#fff',
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        letterSpacing: 0.3,
        transition: 'all 0.2s',
        boxShadow: disabled ? 'none' : `0 4px 16px ${C.orangeGlow}`,
      }}
    >
      {children}
    </button>
  );
}

export default function Login() {
  const [step,     setStep]     = useState(STEPS.CONTACT);
  const [contact,  setContact]  = useState('');
  const [detected, setDetected] = useState(null);
  const [otp,      setOtp]      = useState('');
  const [name,     setName]     = useState('');
  const [loading,  setLoading]  = useState(false);

  const confirmRef   = useRef(null);
  const recaptchaRef = useRef(null);

  const { sendOtp, verifyOtp, loadUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || '/';

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

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const type = detectType(contact);
    if (!type) return toast.error('Enter a valid email or 10-digit phone number');
    setLoading(true);
    try {
      if (type === 'phone') {
        const { RecaptchaVerifier, signInWithPhoneNumber } = await import('firebase/auth');
        const { auth } = await import('../utils/firebase');
        if (recaptchaRef.current) { try { recaptchaRef.current.clear(); } catch (_) {} }
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', { size: 'invisible', callback: () => {} });
        recaptchaRef.current = verifier;
        const result = await signInWithPhoneNumber(auth, `+91${contact.trim()}`, verifier);
        confirmRef.current = result;
        toast.success(`OTP sent to +91 XXXXX${contact.trim().slice(-5)}`);
        setStep(STEPS.OTP);
      } else {
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
      if (recaptchaRef.current) { try { recaptchaRef.current.clear(); } catch (_) {} recaptchaRef.current = null; }
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');
    const type = detectType(contact);
    setLoading(true);
    try {
      if (type === 'phone') {
        if (!confirmRef.current) return toast.error('Please request OTP again');
        const result  = await confirmRef.current.confirm(otp);
        const idToken = await result.user.getIdToken();
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
    } finally { setLoading(false); }
  };

  const handleBack = () => {
    setStep(STEPS.CONTACT);
    setOtp('');
    if (recaptchaRef.current) { try { recaptchaRef.current.clear(); } catch (_) {} recaptchaRef.current = null; }
  };

  return (
    <>
      <Helmet><title>Login — Eptomart</title></Helmet>
      <div id="recaptcha-container" />

      {/* ── Full-page background ── */}
      <div style={{
        minHeight: '100vh',
        background: C.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Subtle background glow blobs */}
        <div style={{
          position:'absolute', width:600, height:600, borderRadius:'50%',
          top:-100, left:'50%', transform:'translateX(-50%)',
          background:'radial-gradient(circle, rgba(244,148,28,0.06) 0%, transparent 65%)',
          pointerEvents:'none',
        }}/>
        <div style={{
          position:'absolute', width:400, height:400, borderRadius:'50%',
          bottom:-80, left:'20%',
          background:'radial-gradient(circle, rgba(109,182,81,0.05) 0%, transparent 65%)',
          pointerEvents:'none',
        }}/>

        {/* ── Centred content column ── */}
        <div style={{ width:'100%', maxWidth:420, display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>

          {/* Logo + tagline */}
          <div style={{ textAlign:'center', marginBottom:36 }}>
            <EptomartLogo
              height={88}
              style={{ margin:'0 auto' }}
            />
            <p style={{ color:C.textMuted, fontSize:13, marginTop:14, letterSpacing:0.2 }}>
              Sign in to continue shopping
            </p>
          </div>

          {/* ── Form card ── */}
          <div style={{
            width: '100%',
            background: C.navyCard,
            border: `1px solid ${C.border}`,
            borderRadius: 20,
            padding: '32px 28px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: `0 24px 64px rgba(0,0,0,0.4), 0 0 0 1px ${C.border}`,
          }}>

            {/* STEP 1 — Contact */}
            {step === STEPS.CONTACT && (
              <>
                <div style={{ marginBottom:24 }}>
                  <h2 style={{ color:C.textPrimary, fontSize:20, fontWeight:700, margin:0 }}>
                    Welcome back 👋
                  </h2>
                  <p style={{ color:C.textMuted, fontSize:13, marginTop:4 }}>
                    Enter your email or mobile to receive an OTP
                  </p>
                </div>

                <form onSubmit={handleSendOtp} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label style={{ display:'block', color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                      Email or Mobile Number
                    </label>
                    <DarkInput
                      type="text"
                      placeholder="Enter email or 10-digit phone"
                      value={contact}
                      onChange={handleContactChange}
                      autoFocus
                      required
                    />
                    {/* Detection chip */}
                    {detected && (
                      <div style={{
                        display:'inline-flex', alignItems:'center', gap:5,
                        marginTop:8, padding:'4px 10px', borderRadius:20,
                        fontSize:11, fontWeight:600,
                        background: detected==='email' ? 'rgba(99,179,237,0.12)' : 'rgba(109,182,81,0.12)',
                        color: detected==='email' ? '#63B3ED' : C.green,
                        border: `1px solid ${detected==='email' ? 'rgba(99,179,237,0.3)' : 'rgba(109,182,81,0.3)'}`,
                      }}>
                        {detected==='email' ? <FiMail size={11}/> : <FiPhone size={11}/>}
                        {detected==='email' ? 'Email detected' : 'Mobile number detected'}
                      </div>
                    )}
                    {contact && !detected && (
                      <p style={{ color:'#FC8181', fontSize:12, marginTop:6 }}>
                        Enter a valid email or 10-digit Indian mobile number
                      </p>
                    )}
                  </div>

                  <OrangeButton type="submit" disabled={loading || !detected}>
                    {loading ? 'Sending OTP…' : 'Send OTP →'}
                  </OrangeButton>
                </form>

                <p style={{ color:C.textDim, fontSize:11, textAlign:'center', marginTop:20 }}>
                  By continuing, you agree to our Terms &amp; Privacy Policy
                </p>
              </>
            )}

            {/* STEP 2 — OTP */}
            {step === STEPS.OTP && (
              <>
                <button onClick={handleBack} style={{
                  display:'flex', alignItems:'center', gap:6,
                  color:C.textMuted, fontSize:13, background:'none',
                  border:'none', cursor:'pointer', padding:0, marginBottom:20,
                }}>
                  <FiArrowLeft size={15}/> Back
                </button>

                <div style={{ marginBottom:24 }}>
                  <h2 style={{ color:C.textPrimary, fontSize:20, fontWeight:700, margin:0 }}>
                    Verify OTP 🔐
                  </h2>
                  <p style={{ color:C.textMuted, fontSize:13, marginTop:4 }}>
                    6-digit code sent to{' '}
                    <span style={{ color:C.textPrimary, fontWeight:600 }}>
                      {detected==='phone' ? `+91 XXXXX${contact.slice(-5)}` : contact}
                    </span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div>
                    <label style={{ display:'block', color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                      Your Name <span style={{ color:C.textDim, textTransform:'none', letterSpacing:0 }}>(new accounts)</span>
                    </label>
                    <DarkInput
                      type="text"
                      placeholder="Enter your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <label style={{ display:'block', color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                      OTP Code
                    </label>
                    <DarkInput
                      type="text"
                      placeholder="• • • • • •"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                      maxLength={6}
                      autoFocus
                      required
                      style={{ textAlign:'center', fontSize:24, fontWeight:800, letterSpacing:'0.5em' }}
                    />
                  </div>

                  <OrangeButton type="submit" disabled={loading || otp.length !== 6}>
                    {loading ? 'Verifying…' : 'Verify & Login'}
                  </OrangeButton>
                </form>

                <div style={{ textAlign:'center', marginTop:16 }}>
                  <button onClick={handleSendOtp} disabled={loading} style={{
                    background:'none', border:'none', cursor:'pointer',
                    color:C.orange, fontSize:13, fontWeight:600,
                  }}>
                    Resend OTP
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Trust badges */}
          <div style={{ display:'flex', gap:20, marginTop:28, justifyContent:'center', flexWrap:'wrap' }}>
            {[
              { icon:<FiShield size={13}/>, label:'Secure Login' },
              { icon:<FiFileText size={13}/>, label:'GST Invoice' },
              { icon:<FiTruck size={13}/>, label:'Fast Delivery' },
            ].map(({ icon, label }) => (
              <div key={label} style={{ display:'flex', alignItems:'center', gap:5, color:C.textDim, fontSize:12 }}>
                <span style={{ color:C.orange }}>{icon}</span> {label}
              </div>
            ))}
          </div>

          {/* Back to store */}
          <p style={{ marginTop:24, fontSize:13, color:C.textDim }}>
            <Link to="/" style={{ color:C.orange, textDecoration:'none', fontWeight:500 }}>
              ← Continue Shopping
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
