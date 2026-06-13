// ============================================
// ADMIN SETTINGS — Business Info (DB-backed)
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiSave, FiMapPin, FiPhone, FiMail, FiGlobe, FiInfo, FiShield, FiRefreshCw } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import Loader from '../../components/common/Loader';

export default function AdminSettings() {
  const [biz, setBiz] = useState({
    name: '', tagline: '', address: '', phone: '',
    email: '', website: '', gstNo: '', state: '', city: '', pincode: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);

  useEffect(() => {
    api.get('/settings')
      .then(res => setBiz(res.data.settings || {}))
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put('/settings', biz);
      setBiz(res.data.settings);
      toast.success('Settings saved!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const INFO_CARDS = [
    { icon: FiMapPin, label: 'Registered Address', key: 'address',  multiline: true },
    { icon: FiPhone,  label: 'Contact Number',     key: 'phone' },
    { icon: FiMail,   label: 'Support Email',       key: 'email' },
    { icon: FiGlobe,  label: 'Website',             key: 'website' },
    { icon: FiInfo,   label: 'GST Number',          key: 'gstNo',   placeholder: 'e.g. 33AAAAA0000A1Z5' },
    { icon: FiMapPin, label: 'State',               key: 'state' },
    { icon: FiMapPin, label: 'City',                key: 'city' },
    { icon: FiMapPin, label: 'Pincode',             key: 'pincode' },
  ];

  if (loading) return <Loader fullPage={false} />;

  return (
    <>
      <Helmet><title>Settings — Eptomart Admin</title></Helmet>

      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold text-gray-800">⚙️ Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Business details used in invoices, emails and the storefront. Changes take effect immediately.</p>
        </div>

        {/* Business Info Form */}
        <form onSubmit={handleSave} className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Business Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
            <input value={biz.name || ''} onChange={e => setBiz(b => ({...b, name: e.target.value}))}
              className="input-field" placeholder="Eptomart" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tagline</label>
            <input value={biz.tagline || ''} onChange={e => setBiz(b => ({...b, tagline: e.target.value}))}
              className="input-field" placeholder="Your platform tagline" />
          </div>

          {INFO_CARDS.map(({ icon: Icon, label, key, multiline, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Icon size={14} className="text-primary-500" /> {label}
              </label>
              {multiline ? (
                <textarea value={biz[key] || ''} onChange={e => setBiz(b => ({...b, [key]: e.target.value}))}
                  rows={2} className="input-field resize-none" placeholder={placeholder} />
              ) : (
                <input value={biz[key] || ''} onChange={e => setBiz(b => ({...b, [key]: e.target.value}))}
                  className="input-field" placeholder={placeholder} />
              )}
            </div>
          ))}

          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <FiRefreshCw size={15} className="animate-spin" /> : <FiSave size={15} />}
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </form>

        {/* Live Preview — what appears on invoices */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 border-b pb-2 mb-4">Invoice & Document Preview</h2>
          <p className="text-xs text-gray-500 mb-4">This is exactly what appears on all generated invoices:</p>
          <div className="bg-orange-50 rounded-xl p-4 font-mono text-xs text-gray-700 leading-relaxed space-y-1">
            <p className="font-bold text-base font-sans text-primary-600">{biz.name || '—'}</p>
            <p>{biz.address || '—'}</p>
            <p>📞 {biz.phone || '—'}</p>
            <p>✉️  {biz.email || '—'}</p>
            <p>🌐 {biz.website || '—'}</p>
            {biz.gstNo && <p>GST: {biz.gstNo}</p>}
          </div>
        </div>

        {/* Security info */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 border-b pb-2 mb-4 flex items-center gap-2">
            <FiShield size={16} className="text-primary-500" /> Security Notes
          </h2>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Seller accounts can only be created by admins — no self-signup</li>
            <li>• All seller products require admin approval before going live</li>
            <li>• Invoice PDFs are stored securely in Cloudinary with private access</li>
            <li>• Razorpay live keys must be regenerated regularly</li>
            <li>• Firebase service account key must not be committed to git</li>
          </ul>
        </div>
      </div>
    </>
  );
}
