// ============================================
// LOGIN — Centered, premium, brand-consistent
// ============================================
import React, { useState, useEffect } from 'react';
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

const STEPS = { CONTACT: 1, OTP: 2, PROFILE: 3 };

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
function OrangeButton({ disabled, loading, children, ...props }) {
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {loading && (
        <span style={{
          width: 14,
          height: 14,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.35)',
          borderTopColor: '#fff',
          flexShrink: 0,
          animation: 'btn-spin 0.65s linear infinite',
        }} />
      )}
      {children}
    </button>
  );
}

const LAST_CONTACT_KEY = 'eptomart_last_contact';

export default function Login() {
  const [step,     setStep]     = useState(STEPS.CONTACT);
  // Prefill with last used contact from localStorage
  const [contact,  setContact]  = useState(() => {
    try { return localStorage.getItem(LAST_CONTACT_KEY) || ''; } catch { return ''; }
  });
  const [detected, setDetected] = useState(() => {
    try {
      const saved = localStorage.getItem(LAST_CONTACT_KEY) || '';
      return saved ? detectType(saved) : null;
    } catch { return null; }
  });
  const [otp,           setOtp]          = useState('');
  const [name,          setName]         = useState('');
  const [loading,       setLoading]      = useState(false);
  const [address,       setAddress]      = useState({ addressLine1: '', city: '', state: '', pincode: '', phone: '' });
  const [accountExists, setAccountExists] = useState(null); // null = unknown, true = existing, false = new

  const { sendOtp, verifyOtp, loadUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || '/';

  const handleContactChange = (e) => {
    const val = e.target.value;
    setContact(val);
    setDetected(detectType(val));
    setAccountExists(null);
    try { localStorage.setItem(LAST_CONTACT_KEY, val); } catch {}
  };

  // Unified OTP send — same backend flow for both email and phone.
  // Phone OTP is delivered via WhatsApp (no Firebase / no CAPTCHA required).
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    const type = detectType(contact);
    if (!type) return toast.error('Enter a valid email or 10-digit phone number');
    setLoading(true);
    try {
      const normalised = type === 'email' ? contact.trim().toLowerCase() : contact.trim();
      const res = await sendOtp(normalised, type);
      if (res.success) {
        setAccountExists(res.accountExists ?? null);
        const hint = type === 'phone'
          ? `OTP sent via WhatsApp to XXXXX${normalised.slice(-5)}`
          : res.accountExists
            ? `Welcome back! OTP sent to ${normalised}`
            : res.message;
        toast.success(hint);
        setStep(STEPS.OTP);
        if (res.otp) { setOtp(res.otp); toast('🔧 Dev: OTP auto-filled', { icon: '🧪' }); }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // Unified OTP verify — same backend flow for both email and phone.
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length !== 6) return toast.error('Enter 6-digit OTP');
    const type = detectType(contact);
    const normalised = type === 'email' ? contact.trim().toLowerCase() : contact.trim();
    setLoading(true);
    try {
      const res = await verifyOtp(normalised, otp, type);
      if (res.success) {
        const needsProfile = res.isNewUser && res.user?.role === 'user' && !res.user?.name;
        if (needsProfile) { setStep(STEPS.PROFILE); return; }
        navigate(from, { replace: true });
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message;
      const isBlocked = err.response?.data?.blocked || serverMsg?.includes('deactivated');
      toast.error(serverMsg || 'Invalid OTP', { duration: isBlocked ? 8000 : 4000 });
    } finally { setLoading(false); }
  };

  const handleBack = () => {
    setStep(STEPS.CONTACT);
    setOtp('');
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter your name');
    setLoading(true);
    try {
      await api.put('/auth/update-profile', { name: name.trim(), address });
      await loadUser();
      toast.success('Welcome to Eptomart! 🎉');
      navigate(from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Helmet><title>Login — Eptomart</title></Helmet>
      <style>{`@keyframes btn-spin { to { transform: rotate(360deg); } }`}</style>
      {/* ── Full-page background ── */}
      <div style={{
        minHeight: '100vh',
        background: C.navy,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        position: 'relative',
        overflow: 'visible',   /* was 'hidden' — that clipped the logo */
      }}>

        {/* Subtle background glow blobs — clipped only within themselves */}
        <div style={{
          position:'absolute', width:600, height:600, borderRadius:'50%',
          top:-100, left:'50%', transform:'translateX(-50%)',
          background:'radial-gradient(circle, rgba(244,148,28,0.06) 0%, transparent 65%)',
          pointerEvents:'none', zIndex:0,
        }}/>
        <div style={{
          position:'absolute', width:400, height:400, borderRadius:'50%',
          bottom:-80, left:'20%',
          background:'radial-gradient(circle, rgba(109,182,81,0.05) 0%, transparent 65%)',
          pointerEvents:'none', zIndex:0,
        }}/>

        {/* ── Centred content column ── */}
        <div style={{ position:'relative', zIndex:1, width:'100%', maxWidth:420, display:'flex', flexDirection:'column', alignItems:'center', gap:0 }}>

          {/* Logo + tagline */}
          <div style={{ marginBottom:32 }}>
            {/* Login logo wrapper */}
            <div style={{
              margin: '0 auto 12px',
              overflow: 'visible',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <img
                src="/logo-v3.png?v=3"
                alt="Eptomart"
                style={{
                  width: 'auto',
                  height: 72,
                  objectFit: 'contain',
                  display: 'block',
                }}
              />
            </div>
            <p style={{ color:C.textMuted, fontSize:13, textAlign:'center', margin:0, letterSpacing:0.2 }}>
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

                  <OrangeButton type="submit" disabled={loading || !detected} loading={loading}>
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
                    {accountExists === true ? 'Welcome back! 👋' : accountExists === false ? 'Create your account ✨' : 'Verify OTP 🔐'}
                  </h2>
                  <p style={{ color:C.textMuted, fontSize:13, marginTop:4 }}>
                    6-digit code sent to{' '}
                    <span style={{ color:C.textPrimary, fontWeight:600 }}>
                      {detected==='phone' ? `+91 XXXXX${contact.slice(-5)}` : contact}
                    </span>
                  </p>
                  {/* Account match badge */}
                  {accountExists !== null && (
                    <div style={{
                      display:'inline-flex', alignItems:'center', gap:5,
                      marginTop:8, padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:600,
                      background: accountExists ? 'rgba(109,182,81,0.12)' : 'rgba(244,148,28,0.12)',
                      color: accountExists ? C.green : C.orange,
                      border: `1px solid ${accountExists ? 'rgba(109,182,81,0.3)' : 'rgba(244,148,28,0.3)'}`,
                    }}>
                      {accountExists ? '✓ Existing account found — logging you in' : '✦ New account will be created'}
                    </div>
                  )}
                </div>

                <form onSubmit={handleVerifyOtp} style={{ display:'flex', flexDirection:'column', gap:16 }}>
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

                  <OrangeButton type="submit" disabled={loading || otp.length !== 6} loading={loading}>
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

            {/* STEP 3 — Profile (new users only) */}
            {step === STEPS.PROFILE && (
              <>
                <div style={{ marginBottom:24 }}>
                  <h2 style={{ color:C.textPrimary, fontSize:20, fontWeight:700, margin:0 }}>
                    Complete Your Profile 🏠
                  </h2>
                  <p style={{ color:C.textMuted, fontSize:13, marginTop:4 }}>
                    Help us deliver to you faster — add your details below.
                  </p>
                </div>

                <form onSubmit={handleSaveProfile} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div>
                    <label style={{ display:'block', color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                      Full Name *
                    </label>
                    <DarkInput
                      type="text"
                      placeholder="Your full name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>

                  <div>
                    <label style={{ display:'block', color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                      Address Line *
                    </label>
                    <DarkInput
                      type="text"
                      placeholder="House/Flat no., Street, Area"
                      value={address.addressLine1}
                      onChange={e => setAddress(a => ({ ...a, addressLine1: e.target.value }))}
                      required
                    />
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                    <div>
                      <label style={{ display:'block', color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                        City *
                      </label>
                      <DarkInput
                        type="text"
                        placeholder="City"
                        value={address.city}
                        onChange={e => setAddress(a => ({ ...a, city: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label style={{ display:'block', color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                        Pincode *
                      </label>
                      <DarkInput
                        type="text"
                        placeholder="6-digit pincode"
                        value={address.pincode}
                        onChange={e => setAddress(a => ({ ...a, pincode: e.target.value.replace(/\D/g,'').slice(0,6) }))}
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display:'block', color:C.textMuted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:'uppercase', marginBottom:8 }}>
                      State
                    </label>
                    <DarkInput
                      type="text"
                      placeholder="State"
                      value={address.state}
                      onChange={e => setAddress(a => ({ ...a, state: e.target.value }))}
                    />
                  </div>

                  <div style={{ display:'flex', gap:10 }}>
                    <button
                      type="button"
                      onClick={() => navigate(from, { replace: true })}
                      style={{
                        flex:1, padding:'13px', borderRadius:12, border:`1.5px solid ${C.border}`,
                        background:'transparent', color:C.textMuted, fontSize:14, cursor:'pointer',
                      }}
                    >
                      Skip for now
                    </button>
                    <div style={{ flex:2 }}>
                      <OrangeButton type="submit" disabled={loading} loading={loading}>
                        {loading ? 'Saving…' : 'Save & Continue →'}
                      </OrangeButton>
                    </div>
                  </div>
                </form>
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
