// ============================================
// UZHAVAR FRESH — Farmer Registration
// Multi-step onboarding, same pattern as seller
// ============================================
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  FiUser, FiPhone, FiMapPin, FiUploadCloud,
  FiCreditCard, FiCheckCircle, FiChevronRight, FiChevronLeft,
  FiAlertCircle, FiLoader,
} from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const STEPS = [
  { id: 1, label: 'Basic Info',   icon: FiUser },
  { id: 2, label: 'Location',     icon: FiMapPin },
  { id: 3, label: 'Documents',    icon: FiUploadCloud },
  { id: 4, label: 'Bank Details', icon: FiCreditCard },
  { id: 5, label: 'Review',       icon: FiCheckCircle },
];

const DISTRICTS_TN = [
  'Chennai','Coimbatore','Madurai','Tiruchirappalli','Salem','Tirunelveli',
  'Tiruppur','Vellore','Erode','Thoothukudi','Dindigul','Thanjavur',
  'Ranipet','Sivaganga','Virudhunagar','Nagapattinam','Kanyakumari',
  'Krishnagiri','Dharmapuri','Perambalur','Ariyalur','Cuddalore',
  'Villupuram','Kallakurichi','Karur','Namakkal','Nilgiris','Pudukkottai',
  'Ramanathapuram','Tenkasi','Tirupattur','Tiruvannamalai','Vellore',
  'Chengalpattu','Kancheepuram','Tiruvallur','Mayiladuthurai',
];

const empty = {
  // Step 1
  name: '', phone: '', language: 'ta',
  // Step 2
  village: '', taluk: '', district: '', pincode: '',
  deliveryRadius: 5,
  gpsLat: '', gpsLng: '',
  // Step 3
  aadhaarNumber: '',
  aadhaarDoc: null, aadhaarDocUrl: '',
  farmProofDoc: null, farmProofDocUrl: '',
  // Step 4
  bankName: '', accountName: '', accountNumber: '', ifsc: '',
  bankDoc: null, bankDocUrl: '',
};

export default function FarmerRegister() {
  const navigate     = useNavigate();
  const { isLoggedIn, user } = useAuth();

  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState(empty);
  const [errors, setErrors]   = useState({});
  const [uploading, setUploading] = useState({ aadhaar: false, farm: false, bankDoc: false });
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone]       = useState(false);

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); };

  // ── GPS detect ──────────────────────────────
  const detectGPS = () => {
    if (!navigator.geolocation) { toast.error('GPS not supported on this device'); return; }
    setLocLoading(true);
    toast.loading('Getting your location…', { id: 'gps-toast' });
    navigator.geolocation.getCurrentPosition(
      pos => {
        set('gpsLat', pos.coords.latitude.toFixed(6));
        set('gpsLng', pos.coords.longitude.toFixed(6));
        setLocLoading(false);
        toast.success('Location captured! ✓', { id: 'gps-toast' });
      },
      (err) => {
        setLocLoading(false);
        const msg =
          err.code === 1 ? 'Location permission denied. Please allow access in browser settings.' :
          err.code === 2 ? 'Position unavailable. Please enter coordinates manually.' :
          'GPS timed out. Enter coordinates manually below.';
        toast.error(msg, { id: 'gps-toast', duration: 5000 });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // ── Document upload ──────────────────────────
  const uploadDoc = async (file, type) => {
    if (!file) return;
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, WebP or PDF files allowed');
      return;
    }
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }
    const key = type === 'aadhaar' ? 'aadhaar' : type === 'farm' ? 'farm' : 'bankDoc';
    setUploading(u => ({ ...u, [key]: true }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post('/uzhavar/farmer/upload-doc', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (type === 'aadhaar') {
        set('aadhaarDoc', file);
        set('aadhaarDocUrl', data.url);
      } else if (type === 'farm') {
        set('farmProofDoc', file);
        set('farmProofDocUrl', data.url);
      } else {
        set('bankDoc', file);
        set('bankDocUrl', data.url);
      }
      toast.success('Document uploaded ✓');
    } catch {
      toast.error('Upload failed. Try again.');
    } finally {
      setUploading(u => ({ ...u, [key]: false }));
    }
  };

  // ── Validation per step ──────────────────────
  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.name.trim())                       e.name  = 'Name required';
      if (!/^[6-9]\d{9}$/.test(form.phone))        e.phone = 'Valid 10-digit mobile required';
    }
    if (step === 2) {
      if (!form.village.trim()) e.village  = 'Village required';
      if (!form.district)       e.district = 'District required';
      if (!form.pincode || form.pincode.length !== 6) e.pincode = 'Valid 6-digit pincode required';
    }
    if (step === 3) {
      if (!form.aadhaarNumber || form.aadhaarNumber.replace(/\s/g,'').length !== 12)
        e.aadhaarNumber = 'Valid 12-digit Aadhaar required';
      if (!form.aadhaarDocUrl)  e.aadhaarDocUrl  = 'Aadhaar document required';
      if (!form.farmProofDocUrl) e.farmProofDocUrl = 'Farm proof required';
    }
    if (step === 4) {
      if (!form.bankName.trim())      e.bankName      = 'Bank name required';
      if (!form.accountName.trim())   e.accountName   = 'Account holder name required';
      if (!form.accountNumber.trim()) e.accountNumber = 'Account number required';
      if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase())) e.ifsc = 'Valid IFSC required (e.g. SBIN0001234)';
      if (!form.bankDocUrl)           e.bankDocUrl    = 'Bank passbook or cancelled cheque required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  // ── Submit ───────────────────────────────────
  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post('/uzhavar/farmer/register', {
        name:     form.name,
        phone:    form.phone,
        language: form.language,
        gpsLocation: form.gpsLat && form.gpsLng
          ? { type: 'Point', coordinates: [parseFloat(form.gpsLng), parseFloat(form.gpsLat)] }
          : undefined,
        address: {
          village:  form.village,
          taluk:    form.taluk,
          district: form.district,
          pincode:  form.pincode,
          state:    'Tamil Nadu',
        },
        deliveryRadius:  form.deliveryRadius,
        aadhaarNumber:   form.aadhaarNumber.replace(/\s/g, ''),
        aadhaarDoc:      form.aadhaarDocUrl,
        farmProofDoc:    form.farmProofDocUrl,
        bankAccount: {
          bankName:      form.bankName,
          accountName:   form.accountName,
          accountNumber: form.accountNumber,
          ifsc:          form.ifsc.toUpperCase(),
          bankDoc:       form.bankDocUrl,
        },
        user: user?._id || null,
      });
      setDone(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ───────────────────────────
  if (done) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-sm w-full text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-4xl mx-auto mb-4">🌾</div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">Application Submitted!</h2>
            <p className="text-gray-500 text-sm mb-2">
              Your farmer registration is under review. Our team will verify your documents and approve within <strong>24–48 hours</strong>.
            </p>
            <p className="text-gray-400 text-xs mb-6">You'll be notified once approved. Then you can start listing your harvest.</p>
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 text-left">
              <p className="text-sm font-semibold text-green-700 mb-2">What happens next?</p>
              <div className="space-y-1.5 text-xs text-green-600">
                <p>✅ Admin verifies Aadhaar + farm proof</p>
                <p>✅ Bank passbook / cheque verified for payouts</p>
                <p>✅ Account activated — start listing harvest</p>
                <p>✅ Buyers near you start seeing your products</p>
              </div>
            </div>
            <button onClick={() => navigate('/uzhavar')}
              className="w-full bg-green-600 text-white font-bold py-3 rounded-xl">
              Back to Farmer Fresh
            </button>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <>
      <Helmet><title>Register as Farmer — Farmer Fresh</title></Helmet>
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8 pb-16 min-h-screen">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-3xl mb-2">🧑‍🌾</div>
          <h1 className="text-2xl font-black text-gray-800">Join as a Farmer</h1>
          <p className="text-gray-500 text-sm mt-1">Sell your harvest directly to buyers near you</p>
        </div>

        {/* Step indicator */}
        <div className="mb-6">
          {/* Progress bar */}
          <div className="relative h-1.5 bg-gray-200 rounded-full mb-4">
            <div className="absolute left-0 top-0 h-full bg-green-500 rounded-full transition-all duration-500"
                 style={{ width: `${progress}%` }} />
          </div>
          {/* Step dots */}
          <div className="flex justify-between">
            {STEPS.map(s => {
              const Icon = s.icon;
              const active = step === s.id;
              const done   = step > s.id;
              return (
                <div key={s.id} className="flex flex-col items-center gap-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                    done   ? 'bg-green-500 text-white' :
                    active ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-200' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {done ? <FiCheckCircle size={14} /> : <Icon size={13} />}
                  </div>
                  <span className={`text-[10px] font-medium ${active ? 'text-green-700' : 'text-gray-400'}`}>
                    {s.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">

          {/* ── Step 1: Basic Info ── */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-black text-gray-800 text-lg mb-1">Basic Information</h2>
              <p className="text-xs text-gray-400 mb-4">Tell us about yourself</p>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Full Name *</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input value={form.name} onChange={e => set('name', e.target.value)}
                    className={`w-full border rounded-xl pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-400 ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="உங்கள் பெயர் / Your name" />
                </div>
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Mobile Number *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-semibold">+91</span>
                  <input value={form.phone} onChange={e => set('phone', e.target.value.replace(/\D/g,'').slice(0,10))}
                    className={`w-full border rounded-xl pl-12 pr-3 py-2.5 text-sm focus:outline-none focus:border-green-400 ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="9876543210" maxLength={10} />
                </div>
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Preferred Language</label>
                <div className="flex gap-2">
                  {[{ val: 'ta', label: 'தமிழ்' }, { val: 'en', label: 'English' }, { val: 'both', label: 'Both' }].map(l => (
                    <button key={l.val} onClick={() => set('language', l.val)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${form.language === l.val ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Location ── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-black text-gray-800 text-lg mb-1">Your Farm Location</h2>
              <p className="text-xs text-gray-400 mb-4">Help buyers find you</p>

              {/* GPS button */}
              <button onClick={detectGPS} disabled={locLoading}
                className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-green-300 text-green-700 font-semibold py-3 rounded-xl text-sm hover:bg-green-50 transition-colors disabled:opacity-60">
                <FiMapPin size={15} />
                {locLoading
                  ? '📡 Getting location...'
                  : form.gpsLat
                    ? `✅ GPS captured (${form.gpsLat}, ${form.gpsLng}) — tap to refresh`
                    : '📍 Capture GPS Location (Recommended)'}
              </button>

              {/* Manual lat/lng fallback — always visible */}
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">
                  GPS coordinates <span className="font-normal text-gray-400">(auto-filled above, or enter manually)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={form.gpsLat}
                    onChange={e => set('gpsLat', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-400"
                    placeholder="Latitude (e.g. 11.0168)"
                  />
                  <input
                    value={form.gpsLng}
                    onChange={e => set('gpsLng', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none focus:border-green-400"
                    placeholder="Longitude (e.g. 76.9558)"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Open Google Maps → long-press your farm location → copy the numbers shown.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Village / Area *</label>
                  <input value={form.village} onChange={e => set('village', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 ${errors.village ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="Village name" />
                  {errors.village && <p className="text-red-500 text-xs mt-1">{errors.village}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Taluk</label>
                  <input value={form.taluk} onChange={e => set('taluk', e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400"
                    placeholder="Taluk" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">District *</label>
                  <select value={form.district} onChange={e => set('district', e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 ${errors.district ? 'border-red-400' : 'border-gray-200'}`}>
                    <option value="">Select district</option>
                    {DISTRICTS_TN.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Pincode *</label>
                  <input value={form.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g,'').slice(0,6))}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 ${errors.pincode ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder="600001" maxLength={6} />
                  {errors.pincode && <p className="text-red-500 text-xs mt-1">{errors.pincode}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Delivery Radius</label>
                <div className="flex gap-2">
                  {[3, 5, 10].map(r => (
                    <button key={r} onClick={() => set('deliveryRadius', r)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold border transition-colors ${form.deliveryRadius === r ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {r} km
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">How far can you deliver from your farm?</p>
              </div>
            </div>
          )}

          {/* ── Step 3: Documents ── */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="font-black text-gray-800 text-lg mb-1">KYC Documents</h2>
              <p className="text-xs text-gray-400 mb-4">Required for verification. Kept secure.</p>

              {/* Aadhaar number */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Aadhaar Number *</label>
                <input
                  value={form.aadhaarNumber}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g,'').slice(0,12);
                    set('aadhaarNumber', v.replace(/(\d{4})(?=\d)/g, '$1 ').trim());
                  }}
                  className={`w-full border rounded-xl px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:border-green-400 ${errors.aadhaarNumber ? 'border-red-400' : 'border-gray-200'}`}
                  placeholder="XXXX XXXX XXXX" maxLength={14} />
                {errors.aadhaarNumber && <p className="text-red-500 text-xs mt-1">{errors.aadhaarNumber}</p>}
              </div>

              {/* Aadhaar doc upload */}
              <DocUpload
                label="Aadhaar Card (front) *"
                hint="JPG, PNG or PDF · Max 5MB"
                uploading={uploading.aadhaar}
                uploaded={!!form.aadhaarDocUrl}
                error={errors.aadhaarDocUrl}
                onChange={f => uploadDoc(f, 'aadhaar')}
              />

              {/* Farm proof upload */}
              <DocUpload
                label="Farm Proof *"
                hint="Land deed / Patta / Rent agreement · JPG or PDF"
                uploading={uploading.farm}
                uploaded={!!form.farmProofDocUrl}
                error={errors.farmProofDocUrl}
                onChange={f => uploadDoc(f, 'farm')}
              />

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-600">
                🔒 Documents are encrypted and only visible to admin for verification. Not shared with buyers.
              </div>
            </div>
          )}

          {/* ── Step 4: Bank Details ── */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-black text-gray-800 text-lg mb-1">Bank Details</h2>
              <p className="text-xs text-gray-400 mb-4">For receiving payments from orders</p>

              {[
                { k: 'bankName',      label: 'Bank Name *',              placeholder: 'State Bank of India' },
                { k: 'accountName',   label: 'Account Holder Name *',    placeholder: 'As per passbook' },
                { k: 'accountNumber', label: 'Account Number *',         placeholder: '1234567890' },
                { k: 'ifsc',          label: 'IFSC Code *',              placeholder: 'SBIN0001234' },
              ].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">{f.label}</label>
                  <input value={form[f.k]}
                    onChange={e => set(f.k, f.k === 'ifsc' ? e.target.value.toUpperCase() : e.target.value)}
                    className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 ${errors[f.k] ? 'border-red-400' : 'border-gray-200'}`}
                    placeholder={f.placeholder} />
                  {errors[f.k] && <p className="text-red-500 text-xs mt-1">{errors[f.k]}</p>}
                </div>
              ))}

              {/* Bank document upload — mandatory */}
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <label className="block text-xs font-semibold text-gray-600">Bank Passbook / Cancelled Cheque *</label>
                </div>
                <DocUpload
                  label=""
                  hint="First page of passbook OR a cancelled cheque · JPG, PNG or PDF · Max 5MB"
                  uploading={uploading.bankDoc}
                  uploaded={!!form.bankDocUrl}
                  error={errors.bankDocUrl}
                  onChange={f => uploadDoc(f, 'bankDoc')}
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-700">
                ⚠️ Ensure account details are correct. Payouts will be sent directly to this account.
              </div>
            </div>
          )}

          {/* ── Step 5: Review ── */}
          {step === 5 && (
            <div className="space-y-4">
              <h2 className="font-black text-gray-800 text-lg mb-1">Review & Submit</h2>
              <p className="text-xs text-gray-400 mb-4">Confirm your details before submitting</p>

              {[
                { title: '👤 Basic Info', rows: [
                  ['Name', form.name],
                  ['Phone', `+91 ${form.phone}`],
                  ['Language', form.language === 'ta' ? 'Tamil' : form.language === 'en' ? 'English' : 'Both'],
                ]},
                { title: '📍 Location', rows: [
                  ['Village', form.village],
                  ['Taluk', form.taluk || '—'],
                  ['District', form.district],
                  ['Pincode', form.pincode],
                  ['Delivery Radius', `${form.deliveryRadius} km`],
                  ['GPS', form.gpsLat ? `${form.gpsLat}, ${form.gpsLng}` : 'Not captured'],
                ]},
                { title: '📄 Documents', rows: [
                  ['Aadhaar', `XXXX XXXX ${form.aadhaarNumber.slice(-4)}`],
                  ['Aadhaar Doc', form.aadhaarDocUrl ? '✅ Uploaded' : '❌ Missing'],
                  ['Farm Proof', form.farmProofDocUrl ? '✅ Uploaded' : '❌ Missing'],
                ]},
                { title: '🏦 Bank', rows: [
                  ['Bank', form.bankName],
                  ['Account', `XXXX${form.accountNumber.slice(-4)}`],
                  ['IFSC', form.ifsc],
                  ['Bank Doc', form.bankDocUrl ? '✅ Uploaded' : '❌ Missing'],
                ]},
              ].map(section => (
                <div key={section.title} className="bg-gray-50 rounded-xl p-4">
                  <p className="font-bold text-gray-700 text-sm mb-2">{section.title}</p>
                  <div className="space-y-1">
                    {section.rows.map(([k, v]) => (
                      <div key={k} className="flex justify-between text-xs">
                        <span className="text-gray-500">{k}</span>
                        <span className="text-gray-800 font-medium text-right max-w-[55%]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
                By submitting, you agree to Farmer Fresh's terms. Your application will be reviewed within 24–48 hours.
              </div>
            </div>
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 mt-5">
          {step > 1 && (
            <button onClick={back}
              className="flex items-center gap-1.5 px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-colors">
              <FiChevronLeft size={16} /> Back
            </button>
          )}
          {step < 5 ? (
            <button onClick={next}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm transition-colors">
              Continue <FiChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl text-sm disabled:opacity-60 transition-colors">
              {submitting ? <><FiLoader size={15} className="animate-spin" /> Submitting...</> : '🌾 Submit Application'}
            </button>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

// ── Reusable doc upload card ─────────────────
function DocUpload({ label, hint, uploading, uploaded, error, onChange }) {
  const inputRef = React.useRef();
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
      <div
        onClick={() => inputRef.current.click()}
        className={`relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          uploaded ? 'border-green-400 bg-green-50' :
          error    ? 'border-red-400 bg-red-50' :
          'border-gray-200 hover:border-green-300 hover:bg-green-50'
        }`}>
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <FiLoader size={16} className="animate-spin" />
            <span className="text-sm font-medium">Uploading...</span>
          </div>
        ) : uploaded ? (
          <div className="flex items-center justify-center gap-2 text-green-600">
            <FiCheckCircle size={16} />
            <span className="text-sm font-semibold">Document uploaded ✓</span>
          </div>
        ) : (
          <div className="text-gray-400">
            <FiUploadCloud size={22} className="mx-auto mb-1" />
            <p className="text-sm font-medium text-gray-600">Click to upload</p>
            <p className="text-xs mt-0.5">{hint}</p>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*,.pdf" className="hidden"
          onChange={e => onChange(e.target.files[0])} />
      </div>
      {error && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><FiAlertCircle size={11} />{error}</p>}
    </div>
  );
}
