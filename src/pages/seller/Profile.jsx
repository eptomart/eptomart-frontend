import React, { useState, useEffect } from 'react';
import { FiSave, FiUser, FiBriefcase, FiMapPin, FiPhone } from 'react-icons/fi';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function SellerProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [form,    setForm]    = useState({
    displayName: '', description: '',
    contact: { phone: '', website: '' },
    bankDetails: { accountNumber: '', ifscCode: '', bankName: '', accountHolder: '' },
  });

  useEffect(() => {
    api.get('/sellers/me/profile')
      .then(r => {
        const s = r.data.seller;
        setProfile(s);
        setForm({
          displayName:  s.displayName || '',
          description:  s.description || '',
          contact: {
            phone:   s.contact?.phone   || '',
            website: s.contact?.website || '',
          },
          bankDetails: {
            accountNumber: s.bankDetails?.accountNumber || '',
            ifscCode:      s.bankDetails?.ifscCode      || '',
            bankName:      s.bankDetails?.bankName      || '',
            accountHolder: s.bankDetails?.accountHolder || '',
          },
        });
      })
      .catch(() => toast.error('Could not load seller profile'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setNested = (section, key, val) =>
    setForm(f => ({ ...f, [section]: { ...f[section], [key]: val } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/sellers/me/profile', form);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="card p-8 text-center text-gray-500">
      <FiUser size={40} className="mx-auto mb-3 text-gray-300" />
      <p className="font-medium">Seller profile not found</p>
      <p className="text-sm mt-1">Contact admin to set up your seller account.</p>
    </div>
  );

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">My Profile</h2>
        <button onClick={handleSave} disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm">
          <FiSave size={15} />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Business Info */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <FiBriefcase size={16} /> Business Info
        </h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
          <input value={profile.businessName} disabled
            className="input-field bg-gray-50 text-gray-500 cursor-not-allowed" />
          <p className="text-xs text-gray-400 mt-0.5">Contact admin to change your business name</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
          <input value={form.displayName} onChange={e => set('displayName', e.target.value)}
            placeholder="Public-facing store name" className="input-field" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Store Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="Tell customers about your store…" className="input-field resize-none" />
        </div>
      </div>

      {/* Address (read-only) */}
      <div className="card p-6 space-y-3">
        <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <FiMapPin size={16} /> Business Address
        </h3>
        <p className="text-sm text-gray-600">
          {[profile.address?.street, profile.address?.city, profile.address?.state, profile.address?.pincode]
            .filter(Boolean).join(', ')}
        </p>
        <p className="text-xs text-gray-400">Contact admin to update your address</p>
      </div>

      {/* Contact */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 border-b pb-2 flex items-center gap-2">
          <FiPhone size={16} /> Contact Details
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.contact.phone} onChange={e => setNested('contact', 'phone', e.target.value)}
              placeholder="Contact number" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
            <input value={form.contact.website} onChange={e => setNested('contact', 'website', e.target.value)}
              placeholder="https://yoursite.com" className="input-field" />
          </div>
        </div>
      </div>

      {/* Bank Details */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 border-b pb-2">Bank Details (for settlements)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Holder Name</label>
            <input value={form.bankDetails.accountHolder}
              onChange={e => setNested('bankDetails', 'accountHolder', e.target.value)}
              placeholder="As per bank records" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
            <input value={form.bankDetails.accountNumber}
              onChange={e => setNested('bankDetails', 'accountNumber', e.target.value)}
              placeholder="Bank account number" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">IFSC Code</label>
            <input value={form.bankDetails.ifscCode}
              onChange={e => setNested('bankDetails', 'ifscCode', e.target.value.toUpperCase())}
              placeholder="e.g. SBIN0001234" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
            <input value={form.bankDetails.bankName}
              onChange={e => setNested('bankDetails', 'bankName', e.target.value)}
              placeholder="e.g. State Bank of India" className="input-field" />
          </div>
        </div>
      </div>

      {/* GST/PAN (read-only) */}
      {(profile.gstNumber || profile.panNumber) && (
        <div className="card p-6 space-y-3">
          <h3 className="font-semibold text-gray-800 border-b pb-2">Tax Details</h3>
          <div className="grid grid-cols-2 gap-4">
            {profile.gstNumber && (
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">GST Number</label>
                <p className="text-sm font-mono font-medium text-gray-800">{profile.gstNumber}</p>
              </div>
            )}
            {profile.panNumber && (
              <div>
                <label className="block text-xs text-gray-500 mb-0.5">PAN Number</label>
                <p className="text-sm font-mono font-medium text-gray-800">{profile.panNumber}</p>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-400">Contact admin to update tax details</p>
        </div>
      )}

      {/* Account Info */}
      <div className="card p-4 bg-gray-50 text-sm text-gray-500 space-y-1">
        <p><span className="font-medium text-gray-700">Login email:</span> {user?.email || '—'}</p>
        <p><span className="font-medium text-gray-700">Login phone:</span> {user?.phone || '—'}</p>
        <p><span className="font-medium text-gray-700">Account status:</span>{' '}
          <span className={profile.status === 'active' ? 'text-green-600 font-medium' : 'text-orange-500 font-medium'}>
            {profile.status}
          </span>
        </p>
      </div>
    </div>
  );
}
