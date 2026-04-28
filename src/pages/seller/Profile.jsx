import React, { useState, useEffect, useCallback } from 'react';
import { FiSave, FiUser, FiBriefcase, FiMapPin, FiPhone, FiPlus, FiTrash2, FiStar, FiLoader } from 'react-icons/fi';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { usePincodeAutofill } from '../../hooks/usePincodeAutofill';

export default function SellerProfile() {
  const { user } = useAuth();
  const [profile,          setProfile]          = useState(null);
  const [loading,          setLoading]          = useState(true);
  const [saving,           setSaving]           = useState(false);
  const [form,             setForm]             = useState({
    displayName: '', description: '',
    fssaiLicenseNumber: '',
    contact: { phone: '', website: '' },
    bankDetails: { accountNumber: '', ifscCode: '', bankName: '', accountHolder: '' },
  });

  // Pickup addresses state
  const [pickupAddresses, setPickupAddresses] = useState([]);
  const [addingAddr,      setAddingAddr]      = useState(false);
  const [addrForm,        setAddrForm]        = useState({ label: '', street: '', city: '', state: '', pincode: '', phone: '', isDefault: false });
  const [addrSaving,      setAddrSaving]      = useState(false);

  // Pincode autofill for pickup address form
  const { lookupPincode: lookupAddrPincode, pincodeLoading: addrPincodeLoading } = usePincodeAutofill(
    useCallback(({ city, state }) => setAddrForm(f => ({ ...f, city, state })), [])
  );

  const loadPickupAddresses = () => {
    api.get('/sellers/me/pickup-addresses')
      .then(r => setPickupAddresses(r.data.addresses || []))
      .catch(() => {});
  };

  useEffect(() => {
    api.get('/sellers/me/profile')
      .then(r => {
        const s = r.data.seller;
        setProfile(s);
        setForm({
          displayName:        s.displayName || '',
          description:        s.description || '',
          fssaiLicenseNumber: s.fssaiLicenseNumber || '',
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

    loadPickupAddresses();
  }, []);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setNested = (section, key, val) =>
    setForm(f => ({ ...f, [section]: { ...f[section], [key]: val } }));

  const setAddr = (key, val) => setAddrForm(f => ({ ...f, [key]: val }));

  const handleAddAddress = async () => {
    if (!addrForm.street || !addrForm.city || !addrForm.state || !addrForm.pincode) {
      toast.error('Street, city, state and pincode are required');
      return;
    }
    setAddrSaving(true);
    try {
      const { data } = await api.post('/sellers/me/pickup-addresses', addrForm);
      setPickupAddresses(data.addresses);
      setAddrForm({ label: '', street: '', city: '', state: '', pincode: '', phone: '', isDefault: false });
      setAddingAddr(false);
      toast.success('Pickup address added');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add address');
    } finally {
      setAddrSaving(false);
    }
  };

  const handleDeleteAddress = async (addrId) => {
    if (!window.confirm('Remove this pickup address?')) return;
    try {
      const { data } = await api.delete(`/sellers/me/pickup-addresses/${addrId}`);
      setPickupAddresses(data.addresses);
      toast.success('Address removed');
    } catch {
      toast.error('Failed to remove address');
    }
  };

  const handleSetDefault = async (addrId) => {
    try {
      const { data } = await api.patch(`/sellers/me/pickup-addresses/${addrId}/set-default`);
      setPickupAddresses(data.addresses);
      toast.success('Default address updated');
    } catch {
      toast.error('Failed to update default');
    }
  };

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

      {/* Pickup / Warehouse Addresses */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <FiMapPin size={16} /> Pickup / Warehouse Addresses
          </h3>
          <button onClick={() => setAddingAddr(v => !v)}
            className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
            <FiPlus size={14} /> Add Address
          </button>
        </div>

        {/* Add form */}
        {addingAddr && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-medium text-orange-800">New Pickup Address</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Label (e.g. Main Warehouse)</label>
                <input value={addrForm.label} onChange={e => setAddr('label', e.target.value)}
                  placeholder="Main Warehouse" className="input-field text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Street *</label>
                <input value={addrForm.street} onChange={e => setAddr('street', e.target.value)}
                  placeholder="Street / Area" className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pincode *</label>
                <div className="relative">
                  <input value={addrForm.pincode}
                    onChange={e => { setAddr('pincode', e.target.value); lookupAddrPincode(e.target.value); }}
                    placeholder="600001" maxLength={6} className="input-field text-sm pr-8" />
                  {addrPincodeLoading && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">City & state auto-filled from pincode</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">City *</label>
                <input value={addrForm.city} onChange={e => setAddr('city', e.target.value)}
                  placeholder="Auto-filled or enter manually" className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State *</label>
                <input value={addrForm.state} onChange={e => setAddr('state', e.target.value)}
                  placeholder="Auto-filled or enter manually" className="input-field text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                <input value={addrForm.phone} onChange={e => setAddr('phone', e.target.value)}
                  placeholder="Optional" className="input-field text-sm" />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input type="checkbox" id="addrDefault" checked={addrForm.isDefault}
                  onChange={e => setAddr('isDefault', e.target.checked)} className="rounded" />
                <label htmlFor="addrDefault" className="text-xs text-gray-600">Set as default pickup address</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleAddAddress} disabled={addrSaving}
                className="btn-primary text-sm py-1.5 px-4">
                {addrSaving ? 'Saving…' : 'Save Address'}
              </button>
              <button onClick={() => setAddingAddr(false)}
                className="text-sm text-gray-500 hover:text-gray-700 py-1.5 px-4 rounded-lg border">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Address list */}
        {pickupAddresses.length === 0 && !addingAddr && (
          <p className="text-sm text-gray-400 text-center py-4">
            No pickup addresses added yet. Add one so admin can select it when creating shipments.
          </p>
        )}
        <div className="space-y-2">
          {pickupAddresses.map(addr => {
            const statusStyle = addr.status === 'approved'
              ? 'border-green-300 bg-green-50'
              : addr.status === 'rejected'
              ? 'border-red-300 bg-red-50'
              : 'border-yellow-300 bg-yellow-50';
            return (
              <div key={addr._id} className={`flex items-start justify-between rounded-xl p-3 border ${addr.isDefault && addr.status === 'approved' ? 'border-primary-300 bg-primary-50' : statusStyle}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{addr.label || 'Warehouse'}</span>
                    {/* Status badge */}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium
                      ${addr.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : addr.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'}`}>
                      {addr.status === 'approved' ? '✓ Approved' : addr.status === 'rejected' ? '✗ Rejected' : '⏳ Pending approval'}
                    </span>
                    {addr.isDefault && addr.status === 'approved' && (
                      <span className="flex items-center gap-0.5 text-xs text-primary-600 font-medium">
                        <FiStar size={11} /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600">
                    {[addr.street, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')}
                  </p>
                  {addr.phone && <p className="text-xs text-gray-400 mt-0.5">{addr.phone}</p>}
                  {addr.status === 'rejected' && addr.adminNote && (
                    <p className="text-xs text-red-600 mt-0.5">❌ {addr.adminNote}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  {!addr.isDefault && addr.status === 'approved' && (
                    <button onClick={() => handleSetDefault(addr._id)}
                      className="text-xs text-gray-500 hover:text-primary-600 border rounded-lg px-2 py-1">
                      Set default
                    </button>
                  )}
                  <button onClick={() => handleDeleteAddress(addr._id)}
                    className="text-red-400 hover:text-red-600 p-1">
                    <FiTrash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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

      {/* GST / PAN / FSSAI */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 border-b pb-2">Tax & Compliance</h3>
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
        <p className="text-xs text-gray-400">Contact admin to update GST / PAN details</p>

        {/* FSSAI — seller can update themselves */}
        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            FSSAI License Number
            <span className="ml-1 text-xs font-normal text-gray-400">(required for food / beverage products)</span>
          </label>
          <input
            value={form.fssaiLicenseNumber}
            onChange={e => set('fssaiLicenseNumber', e.target.value)}
            placeholder="e.g. 10018022000123"
            maxLength={14}
            className="input-field font-mono"
          />
          {!form.fssaiLicenseNumber && (
            <p className="text-xs text-orange-500 mt-0.5">
              ⚠️ Add your FSSAI license to list food products
            </p>
          )}
        </div>
      </div>

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
