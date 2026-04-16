// ============================================
// ADMIN SETTINGS — Business Info + Platform Config
// ============================================
import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiSave, FiMapPin, FiPhone, FiMail, FiGlobe, FiInfo, FiShield } from 'react-icons/fi';
import { BUSINESS } from '../../utils/businessInfo';
import toast from 'react-hot-toast';

export default function AdminSettings() {
  const [biz, setBiz] = useState({
    name:    BUSINESS.name,
    address: BUSINESS.address,
    phone:   BUSINESS.phone,
    email:   BUSINESS.email,
    website: BUSINESS.website,
    gstNo:   '',
    state:   BUSINESS.state,
    city:    BUSINESS.city,
    pincode: BUSINESS.pincode,
  });

  const handleSave = (e) => {
    e.preventDefault();
    // These values are currently in businessInfo.js (static).
    // To make them dynamic, store in a Settings collection in MongoDB
    // and expose via GET /api/settings + PUT /api/settings (admin only).
    toast.success('Settings saved (update businessInfo.js to persist)');
  };

  const INFO_CARDS = [
    { icon: FiMapPin, label: 'Registered Address', value: biz.address, key: 'address', multiline: true },
    { icon: FiPhone,  label: 'Contact Number',     value: biz.phone,   key: 'phone' },
    { icon: FiMail,   label: 'Support Email',       value: biz.email,   key: 'email' },
    { icon: FiGlobe,  label: 'Website',             value: biz.website, key: 'website' },
    { icon: FiInfo,   label: 'GST Number',          value: biz.gstNo,   key: 'gstNo', placeholder: 'e.g. 33AAAAA0000A1Z5' },
  ];

  return (
    <>
      <Helmet><title>Settings — Eptomart Admin</title></Helmet>

      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-bold text-gray-800">⚙️ Platform Settings</h1>
          <p className="text-sm text-gray-500 mt-1">Business details used in invoices, emails and the storefront.</p>
        </div>

        {/* Business Info */}
        <form onSubmit={handleSave} className="card p-6 space-y-5">
          <h2 className="font-semibold text-gray-800 border-b pb-2">Business Information</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Business Name</label>
            <input value={biz.name} onChange={e => setBiz(b => ({...b, name: e.target.value}))}
              className="input-field" />
          </div>

          {INFO_CARDS.map(({ icon: Icon, label, key, multiline, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Icon size={14} className="text-primary-500" /> {label}
              </label>
              {multiline ? (
                <textarea value={biz[key]} onChange={e => setBiz(b => ({...b, [key]: e.target.value}))}
                  rows={2} className="input-field resize-none" placeholder={placeholder} />
              ) : (
                <input value={biz[key]} onChange={e => setBiz(b => ({...b, [key]: e.target.value}))}
                  className="input-field" placeholder={placeholder} />
              )}
            </div>
          ))}

          <button type="submit" className="btn-primary flex items-center gap-2">
            <FiSave size={15} /> Save Settings
          </button>
        </form>

        {/* Current business info snapshot — always visible */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 border-b pb-2 mb-4">Invoice & Document Snapshot</h2>
          <p className="text-xs text-gray-500 mb-4">This is what appears on all generated invoices:</p>
          <div className="bg-orange-50 rounded-xl p-4 font-mono text-xs text-gray-700 leading-relaxed space-y-1">
            <p className="font-bold text-base font-sans text-primary-600">{BUSINESS.name}</p>
            <p>{BUSINESS.address}</p>
            <p>📞 {BUSINESS.phone}</p>
            <p>✉️  {BUSINESS.email}</p>
            <p>🌐 {BUSINESS.website}</p>
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
