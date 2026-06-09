// ============================================
// EPTOFRESH SELLER REGISTRATION
// ============================================
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { FiArrowLeft, FiMapPin, FiUpload } from 'react-icons/fi';

const CATEGORIES = [
  { key: 'chicken', label: '🍗 Chicken' },
  { key: 'mutton',  label: '🥩 Mutton' },
  { key: 'fish',    label: '🐟 Fish' },
  { key: 'seafood', label: '🦐 Seafood' },
  { key: 'beef',    label: '🥩 Beef' },
  { key: 'pork',    label: '🐖 Pork' },
  { key: 'ready_to_cook', label: '🍱 Ready to Cook' },
];

export default function EptoFreshSellerRegister() {
  const navigate = useNavigate();
  const [step, setStep]       = useState(0);
  const [form, setForm]       = useState({
    shopName: '', ownerName: '', contactPhone: '', contactEmail: '',
    address: { addressLine1: '', addressLine2: '', city: 'Chennai', state: 'Tamil Nadu', pincode: '', landmark: '' },
    locationLat: '', locationLng: '',
    categories: [],
    panNumber: '', aadhaarNumber: '', gstNumber: '', fssaiNumber: '',
    openingTime: '06:00', closingTime: '21:00', deliveryRadius: 10,
  });
  const [files, setFiles]     = useState({ meatLicense: null, aadhaar: null, pan: null, fssai: null });
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const updateAddress = (key, val) => setForm(f => ({ ...f, address: { ...f.address, [key]: val } }));

  const toggleCategory = (cat) => {
    setForm(f => ({
      ...f,
      categories: f.categories.includes(cat) ? f.categories.filter(c => c !== cat) : [...f.categories, cat],
    }));
  };

  const getGPS = () => {
    if (!navigator.geolocation) return toast.error('GPS not supported');
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        update('locationLat', pos.coords.latitude.toString());
        update('locationLng', pos.coords.longitude.toString());
        toast.success('Location captured!');
        setGpsLoading(false);
      },
      () => { toast.error('GPS denied'); setGpsLoading(false); }
    );
  };

  const handleSubmit = async () => {
    if (!form.shopName || !form.ownerName || !form.contactPhone || !form.fssaiNumber) {
      return toast.error('Please fill all required fields');
    }
    if (!form.locationLat) return toast.error('Please capture your shop GPS location');
    if (!form.categories.length) return toast.error('Select at least one category');

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'address') fd.append('address', JSON.stringify(v));
        else if (Array.isArray(v)) v.forEach(item => fd.append(`${k}[]`, item));
        else fd.append(k, v);
      });
      if (files.meatLicense) fd.append('meatLicense', files.meatLicense);
      if (files.aadhaar)     fd.append('aadhaar', files.aadhaar);
      if (files.pan)         fd.append('pan', files.pan);
      if (files.fssai)       fd.append('fssai', files.fssai);

      const { data } = await api.post('/eptofresh/seller/register', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.success) {
        toast.success('Registration submitted! Admin will review within 24 hours.');
        navigate('/eptofresh/seller/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const Input = ({ label, value, onChange, type = 'text', placeholder = '', required }) => (
    <div>
      <label className="text-gray-400 text-xs mb-1 block">{label}{required && <span className="text-red-400 ml-1">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', fontSize: '16px' }} />
    </div>
  );

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0B1729' }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <button onClick={() => navigate(-1)} className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.07)' }}><FiArrowLeft className="text-white" /></button>
        <div>
          <h1 className="text-white font-bold">Sell on EptoFresh</h1>
          <p className="text-gray-500 text-xs">Register your meat/fish shop</p>
        </div>
      </div>

      {/* Step tabs */}
      <div className="flex" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        {['Shop Info', 'Categories', 'KYC Docs'].map((s, i) => (
          <button key={s} onClick={() => setStep(i)} className="flex-1 py-3 text-xs font-semibold transition-all"
            style={{ color: step === i ? '#f4941c' : 'rgba(255,255,255,0.4)', borderBottom: step === i ? '2px solid #f4941c' : '2px solid transparent' }}>
            {s}
          </button>
        ))}
      </div>

      <div className="px-4 py-4 space-y-4">
        {step === 0 && (
          <>
            <Input label="Shop Name" value={form.shopName} onChange={v => update('shopName', v)} required />
            <Input label="Owner Name" value={form.ownerName} onChange={v => update('ownerName', v)} required />
            <Input label="Phone Number" value={form.contactPhone} onChange={v => update('contactPhone', v)} type="tel" required />
            <Input label="Email" value={form.contactEmail} onChange={v => update('contactEmail', v)} type="email" />
            <Input label="Shop Address" value={form.address.addressLine1} onChange={v => updateAddress('addressLine1', v)} required />
            <Input label="Area / Street" value={form.address.addressLine2} onChange={v => updateAddress('addressLine2', v)} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" value={form.address.city} onChange={v => updateAddress('city', v)} />
              <Input label="Pincode" value={form.address.pincode} onChange={v => updateAddress('pincode', v)} />
            </div>

            <div>
              <label className="text-gray-400 text-xs mb-1 block">Shop GPS Location <span className="text-red-400">*</span></label>
              <button onClick={getGPS} className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                style={{ background: form.locationLat ? 'rgba(52,211,153,0.12)' : 'rgba(244,148,28,0.12)', color: form.locationLat ? '#34d399' : '#f4941c', border: `1px solid ${form.locationLat ? 'rgba(52,211,153,0.2)' : 'rgba(244,148,28,0.2)'}` }}>
                <FiMapPin size={14} />
                {gpsLoading ? 'Getting location...' : form.locationLat ? `✓ Location captured (${parseFloat(form.locationLat).toFixed(4)}, ${parseFloat(form.locationLng).toFixed(4)})` : 'Capture Shop Location'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Opening Time" value={form.openingTime} onChange={v => update('openingTime', v)} type="time" />
              <Input label="Closing Time" value={form.closingTime} onChange={v => update('closingTime', v)} type="time" />
            </div>

            <button onClick={() => setStep(1)} className="w-full py-3 rounded-2xl font-bold text-white" style={{ background: '#f4941c' }}>
              Next: Categories →
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-gray-400 text-sm">Select categories you sell <span className="text-red-400">*</span></p>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => (
                <button key={c.key} onClick={() => toggleCategory(c.key)}
                  className="py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background:   form.categories.includes(c.key) ? '#f4941c' : 'rgba(255,255,255,0.05)',
                    color:        form.categories.includes(c.key) ? '#fff' : 'rgba(255,255,255,0.5)',
                    border:       `1px solid ${form.categories.includes(c.key) ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                  }}>
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => setStep(0)} className="flex-1 py-3 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: '#fff' }}>← Back</button>
              <button onClick={() => setStep(2)} disabled={!form.categories.length} className="flex-1 py-3 rounded-2xl font-bold text-white disabled:opacity-50" style={{ background: '#f4941c' }}>Next: KYC Docs →</button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <Input label="PAN Number" value={form.panNumber} onChange={v => update('panNumber', v.toUpperCase())} placeholder="ABCDE1234F" required />
            <Input label="Aadhaar Number" value={form.aadhaarNumber} onChange={v => update('aadhaarNumber', v)} placeholder="12-digit Aadhaar" />
            <Input label="FSSAI License Number" value={form.fssaiNumber} onChange={v => update('fssaiNumber', v)} required />
            <Input label="GST Number (Optional)" value={form.gstNumber} onChange={v => update('gstNumber', v.toUpperCase())} />

            {/* Document uploads */}
            {[
              { key: 'meatLicense', label: 'Meat/Fish License', required: true },
              { key: 'fssai', label: 'FSSAI Certificate', required: false },
              { key: 'pan', label: 'PAN Card Copy', required: true },
              { key: 'aadhaar', label: 'Aadhaar Copy', required: false },
            ].map(doc => (
              <div key={doc.key}>
                <label className="text-gray-400 text-xs mb-1 block flex items-center gap-1">
                  <FiUpload size={11} /> {doc.label} {doc.required && <span className="text-red-400">*</span>}
                </label>
                <label className="block cursor-pointer">
                  <div className="w-full py-2.5 px-3 rounded-xl text-sm flex items-center gap-2"
                    style={{ background: files[doc.key] ? 'rgba(52,211,153,0.08)' : 'rgba(255,255,255,0.05)', border: '1px dashed rgba(255,255,255,0.15)', color: files[doc.key] ? '#34d399' : 'rgba(255,255,255,0.4)' }}>
                    <FiUpload size={14} />
                    {files[doc.key] ? files[doc.key].name : 'Upload file (JPG / PNG / PDF)'}
                  </div>
                  <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={e => setFiles(f => ({ ...f, [doc.key]: e.target.files[0] }))} />
                </label>
              </div>
            ))}

            <div className="flex gap-2 mt-2">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-2xl text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.07)', color: '#fff' }}>← Back</button>
              <button onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-2xl font-bold text-white disabled:opacity-60" style={{ background: '#f4941c' }}>
                {submitting ? 'Submitting...' : 'Submit Registration'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
