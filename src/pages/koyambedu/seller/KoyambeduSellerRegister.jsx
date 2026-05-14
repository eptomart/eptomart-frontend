import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../utils/api';
import { useAuth } from '../../../context/AuthContext';
import toast from 'react-hot-toast';

const PRODUCT_TYPES = [
  { val: 'vegetables',   label: 'Vegetables',    icon: '🥦' },
  { val: 'fruits',       label: 'Fruits',        icon: '🍊' },
  { val: 'flowers',      label: 'Flowers',       icon: '🌸' },
  { val: 'greens',       label: 'Greens',        icon: '🌿' },
  { val: 'coconut',      label: 'Coconut',       icon: '🥥' },
  { val: 'banana_leaves',label: 'Banana Leaves', icon: '🍃' },
  { val: 'pooja_items',  label: 'Pooja Items',   icon: '🪔' },
  { val: 'seasonal',     label: 'Seasonal',      icon: '🌾' },
  { val: 'bulk',         label: 'Bulk/Wholesale',icon: '📦' },
];

export default function KoyambeduSellerRegister() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    businessName: '', ownerName: user?.name || '', stallNumber: '', marketSection: '',
    contactPhone: user?.phone || '', contactEmail: user?.email || '',
    description: '', productTypes: [],
    bankAccountName: '', bankAccountNumber: '', bankIfsc: '', bankName: '', bankUpi: '',
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleType = (val) => setForm(f => ({
    ...f,
    productTypes: f.productTypes.includes(val) ? f.productTypes.filter(x => x !== val) : [...f.productTypes, val],
  }));

  const handleSubmit = async () => {
    if (!form.businessName || !form.ownerName || !form.contactPhone) {
      toast.error('Business name, owner name and phone are required'); return;
    }
    setLoading(true);
    try {
      await api.post('/koyambedu/seller/register', form);
      toast.success('Registration submitted! Awaiting admin approval.');
      navigate('/koyambedu/seller');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 pb-20">
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#14532d,#16a34a)' }} className="px-4 pt-10 pb-6 text-white">
        <button onClick={() => step > 1 ? setStep(s => s-1) : navigate('/koyambedu')} className="mb-3 text-white/80 text-sm flex items-center gap-1">
          ← Back
        </button>
        <h1 className="font-black text-xl">Become a Koyambedu Seller</h1>
        <p className="text-green-200 text-xs mt-1">Sell directly to Chennai homes through Eptomart</p>
        {/* Step indicator */}
        <div className="flex gap-2 mt-4">
          {[1,2,3].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition ${n <= step ? 'bg-white' : 'bg-white/30'}`} />
          ))}
        </div>
      </div>

      <div className="px-4 mt-5 space-y-4">
        {/* STEP 1 — Business Info */}
        {step === 1 && (
          <>
            <h2 className="font-bold text-gray-800">Business Information</h2>
            {[
              ['businessName','Business / Shop Name *','text'],
              ['ownerName','Owner Name *','text'],
              ['stallNumber','Stall Number (optional)','text'],
              ['marketSection','Market Section (e.g. Veg Block A)','text'],
              ['contactPhone','Contact Phone *','tel'],
              ['contactEmail','Contact Email','email'],
            ].map(([k,label,type]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type={type} value={form[k]} onChange={e => set(k, e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}
            <div>
              <label className="text-xs text-gray-500 font-medium">About your shop</label>
              <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                placeholder="Describe your stall, freshness guarantee, specialties..." />
            </div>
            <button onClick={() => setStep(2)}
              className="w-full bg-green-600 text-white font-bold py-3.5 rounded-xl hover:bg-green-700 transition">
              Continue →
            </button>
          </>
        )}

        {/* STEP 2 — Product types */}
        {step === 2 && (
          <>
            <h2 className="font-bold text-gray-800">What do you sell?</h2>
            <p className="text-xs text-gray-500">Select all categories that apply</p>
            <div className="grid grid-cols-3 gap-3">
              {PRODUCT_TYPES.map(pt => (
                <button key={pt.val} onClick={() => toggleType(pt.val)}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition ${form.productTypes.includes(pt.val) ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-2xl">{pt.icon}</span>
                  <span className="text-[10px] font-semibold text-gray-700 text-center leading-tight">{pt.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setStep(1)} className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl">← Back</button>
              <button onClick={() => setStep(3)} className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl">Continue →</button>
            </div>
          </>
        )}

        {/* STEP 3 — Bank details */}
        {step === 3 && (
          <>
            <h2 className="font-bold text-gray-800">Bank Details (for payout)</h2>
            <p className="text-xs text-gray-500">Required for receiving settlement payments from Eptomart</p>
            {[
              ['bankAccountName', 'Account Holder Name'],
              ['bankAccountNumber','Account Number'],
              ['bankIfsc',        'IFSC Code'],
              ['bankName',        'Bank Name'],
              ['bankUpi',         'UPI ID (optional)'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 font-medium">{label}</label>
                <input type="text" value={form[k]} onChange={e => set(k, e.target.value)}
                  className="w-full mt-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
              </div>
            ))}
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-700">
              🔒 Your bank details are encrypted and only used for payout settlement by Eptomart admin. They are never shared with buyers.
            </div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setStep(2)} className="flex-1 border-2 border-green-600 text-green-600 font-bold py-3 rounded-xl">← Back</button>
              <button onClick={handleSubmit} disabled={loading}
                className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl hover:bg-green-700 disabled:opacity-60">
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
