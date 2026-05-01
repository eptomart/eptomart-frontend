import React, { useState, useEffect, useCallback } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight, FiSearch, FiUser, FiX, FiRefreshCw, FiChevronDown, FiChevronUp, FiCheckCircle, FiXCircle, FiDownload, FiUpload } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import { usePincodeAutofill } from '../../hooks/usePincodeAutofill';

const BLANK_FORM = {
  businessName: '', email: '', phone: '',
  address: { street: '', city: '', state: '', pincode: '' },
  gstNumber: '', panNumber: '', fssaiLicenseNumber: '', notes: '',
};

const STATUS_COLOR = {
  active:    'bg-green-100 text-green-700',
  inactive:  'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-700',
};

export default function AdminSellers() {
  const [sellers,       setSellers]       = useState([]);
  const [deletedSellers,setDeletedSellers] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [search,        setSearch]        = useState('');
  const [modal,         setModal]         = useState(false);
  const [editing,       setEditing]       = useState(null);
  const [form,          setForm]          = useState(BLANK_FORM);
  const [saving,        setSaving]        = useState(false);
  const [deleting,      setDeleting]      = useState(null);
  const [restoring,     setRestoring]     = useState(null);
  const [showDeleted,   setShowDeleted]   = useState(false);

  const load = async (q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get(`/sellers?search=${q}`);
      setSellers(data.sellers || []);
    } catch (_) {} finally { setLoading(false); }
  };

  const loadDeleted = async () => {
    try {
      const { data } = await api.get('/sellers?includeDeleted=true');
      setDeletedSellers(data.sellers || []);
    } catch (_) {}
  };

  useEffect(() => { load(); loadDeleted(); }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    const t = setTimeout(() => load(e.target.value), 400);
    return () => clearTimeout(t);
  };

  const openCreate = () => { setEditing(null); setForm(BLANK_FORM); setModal('create'); };

  const openEdit = (s) => {
    setEditing(s);
    setForm({
      businessName:       s.businessName || '',
      email:              s.contact?.email || s.user?.email || '',
      phone:              s.contact?.phone || s.user?.phone || '',
      address: {
        street:  s.address?.street  || '',
        city:    s.address?.city    || '',
        state:   s.address?.state   || '',
        pincode: s.address?.pincode || '',
      },
      gstNumber:          s.gstNumber || '',
      panNumber:          s.panNumber || '',
      fssaiLicenseNumber: s.fssaiLicenseNumber || '',
      notes:              s.notes || '',
    });
    setModal('edit');
  };

  const closeModal = () => { setModal(false); setEditing(null); setForm(BLANK_FORM); };

  const setStatus = async (seller, status) => {
    try {
      await api.patch(`/sellers/${seller._id}/status`, { status });
      setSellers(s => s.map(x => x._id === seller._id ? { ...x, status } : x));
      toast.success(`Seller ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const createSeller = async () => {
    const missing = [];
    if (!form.businessName.trim())                    missing.push('Business Name');
    if (!form.email.trim() && !form.phone.trim())     missing.push('Email or Phone');
    if (!form.address.street.trim())                  missing.push('Street Address');
    if (!form.address.city.trim())                    missing.push('City');
    if (!form.address.state.trim())                   missing.push('State');
    if (!form.address.pincode.trim())                 missing.push('Pincode');
    if (!form.gstNumber.trim())                       missing.push('GST Number');
    if (!form.panNumber.trim())                       missing.push('PAN Number');
    if (missing.length > 0)
      return toast.error(`Please fill: ${missing.join(', ')}`);
    if (form.gstNumber.trim().length !== 15)
      return toast.error('GST number must be exactly 15 characters');
    if (form.panNumber.trim().length !== 10)
      return toast.error('PAN number must be exactly 10 characters');
    setSaving(true);
    try {
      await api.post('/sellers', form);
      toast.success('Seller created! Credentials sent.');
      closeModal(); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create seller');
    } finally { setSaving(false); }
  };

  const saveSeller = async () => {
    if (!form.businessName) return toast.error('Business name is required');
    setSaving(true);
    try {
      await api.put(`/sellers/${editing._id}`, {
        businessName:       form.businessName,
        contact:            { email: form.email, phone: form.phone },
        address:            form.address,
        gstNumber:          form.gstNumber,
        fssaiLicenseNumber: form.fssaiLicenseNumber,
        notes:              form.notes,
      });
      toast.success('Seller updated');
      closeModal(); load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update seller');
    } finally { setSaving(false); }
  };

  const confirmDelete = async (seller) => {
    if (!window.confirm(`Delete "${seller.businessName}"? They will be moved to the Deleted Sellers list.`)) return;
    setDeleting(seller._id);
    try {
      await api.delete(`/sellers/${seller._id}`);
      setSellers(s => s.filter(x => x._id !== seller._id));
      await loadDeleted();
      toast.success('Seller deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete seller');
    } finally { setDeleting(null); }
  };

  const restoreSellerFn = async (seller) => {
    setRestoring(seller._id);
    try {
      await api.patch(`/sellers/${seller._id}/restore`);
      setDeletedSellers(s => s.filter(x => x._id !== seller._id));
      await load();
      toast.success('Seller restored — set status to Active to re-enable');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to restore');
    } finally { setRestoring(null); }
  };

  const set    = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAddr = (key, val) => setForm(f => ({ ...f, address: { ...f.address, [key]: val } }));

  // Pincode autofill — auto-populate city + state from India Post API
  const { lookupPincode, pincodeLoading } = usePincodeAutofill(
    useCallback(({ city, state }) => setForm(f => ({ ...f, address: { ...f.address, city, state } })), [])
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Sellers Management</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus size={15} /> Add Seller
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input value={search} onChange={handleSearch} placeholder="Search by name, email, phone..."
          className="input-field pl-9" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/>
        </div>
      ) : sellers.length === 0 ? (
        <div className="card p-12 text-center text-gray-400">No sellers found</div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-4">Seller</th>
                <th className="text-left p-4 hidden sm:table-cell">Contact</th>
                <th className="text-left p-4 hidden md:table-cell">City</th>
                <th className="text-left p-4 hidden lg:table-cell">KYC Status</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sellers.map(s => (
                <tr key={s._id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiUser size={16} className="text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{s.businessName}</p>
                        <p className="text-xs text-gray-400">{s.user?.email || s.contact?.email || '—'}</p>
                        {s.sellerId && <p className="text-xs text-gray-400 font-mono">{s.sellerId}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell text-gray-600">
                    {s.contact?.phone || s.user?.phone || '—'}
                  </td>
                  <td className="p-4 hidden md:table-cell text-gray-600">
                    {s.address?.city || '—'}
                  </td>
                  <td className="p-4 hidden lg:table-cell">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      {[
                        { key: 'idProofUploaded',      label: 'ID' },
                        { key: 'addressProofUploaded', label: 'Addr' },
                        { key: 'agreementUploaded',    label: 'Agr' },
                        { key: 'chequeUploaded',       label: 'Chq' },
                        { key: 'bankDetailsComplete',  label: 'Bank' },
                      ].map(({ key, label }) => (
                        <span key={key} title={label}
                          className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-medium ${
                            s.kycStatus?.[key]
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-400'
                          }`}>
                          {s.kycStatus?.[key]
                            ? <FiCheckCircle size={10} />
                            : <FiXCircle size={10} />}
                          {label}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Edit */}
                      <button onClick={() => openEdit(s)} title="Edit Seller"
                        className="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 hover:text-blue-700 transition-colors">
                        <FiEdit2 size={15} />
                      </button>
                      {/* Suspend / Activate */}
                      {s.status === 'active' ? (
                        <button onClick={() => setStatus(s, 'suspended')} title="Suspend"
                          className="p-1.5 rounded-lg text-orange-400 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                          <FiToggleRight size={18} />
                        </button>
                      ) : (
                        <button onClick={() => setStatus(s, 'active')} title="Activate"
                          className="p-1.5 rounded-lg text-green-500 hover:bg-green-50 hover:text-green-700 transition-colors">
                          <FiToggleLeft size={18} />
                        </button>
                      )}
                      {/* Delete */}
                      <button onClick={() => confirmDelete(s)} title="Delete Seller"
                        disabled={deleting === s._id}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40">
                        {deleting === s._id
                          ? <span className="w-3.5 h-3.5 border-2 border-red-400/40 border-t-red-400 rounded-full animate-spin block"/>
                          : <FiTrash2 size={15} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Deleted Sellers Section */}
      {deletedSellers.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowDeleted(v => !v)}
            className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-800 mb-2"
          >
            {showDeleted ? <FiChevronUp size={15}/> : <FiChevronDown size={15}/>}
            🗑 Deleted Sellers ({deletedSellers.length})
          </button>

          {showDeleted && (
            <div className="card overflow-hidden border border-red-100">
              <table className="w-full text-sm">
                <thead className="bg-red-50 text-red-700">
                  <tr>
                    <th className="text-left p-3">Seller</th>
                    <th className="text-left p-3 hidden sm:table-cell">Contact</th>
                    <th className="text-left p-3 hidden md:table-cell">Deleted On</th>
                    <th className="text-right p-3">Restore</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-50">
                  {deletedSellers.map(s => (
                    <tr key={s._id} className="hover:bg-red-50/40 opacity-70">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <FiUser size={14} className="text-red-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-700 line-through">{s.businessName}</p>
                            <p className="text-xs text-gray-400">{s.user?.email || s.contact?.email || '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-gray-500">{s.contact?.phone || '—'}</td>
                      <td className="p-3 hidden md:table-cell text-gray-400 text-xs">
                        {s.deletedAt ? new Date(s.deletedAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => restoreSellerFn(s)}
                          disabled={restoring === s._id}
                          title="Restore Seller"
                          className="flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-all disabled:opacity-50 ml-auto"
                        >
                          {restoring === s._id
                            ? <span className="w-3 h-3 border-2 border-green-300 border-t-green-600 rounded-full animate-spin"/>
                            : <FiRefreshCw size={12}/>}
                          Restore
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800 text-lg">
                {modal === 'edit' ? `Edit — ${editing?.businessName}` : 'Create New Seller'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1">
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input value={form.businessName} onChange={e => set('businessName', e.target.value)}
                  className="input-field" placeholder="ABC Electronics" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email {modal === 'create' ? '' : ''}
                  </label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                    className="input-field" placeholder="seller@email.com"
                    disabled={modal === 'edit'} // contact changes handled separately
                  />
                  {modal === 'edit' && <p className="text-xs text-gray-400 mt-1">Contact email is read-only</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)}
                    className="input-field" placeholder="9876543210"
                    disabled={modal === 'edit'}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <input value={form.address.street} onChange={e => setAddr('street', e.target.value)}
                  className="input-field" placeholder="12 Main Street" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* Pincode with autofill */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                  <div className="relative">
                    <input value={form.address.pincode}
                      onChange={e => { setAddr('pincode', e.target.value); lookupPincode(e.target.value); }}
                      className="input-field pr-8" placeholder="600001" maxLength={6} />
                    {pincodeLoading && (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">City & state auto-filled</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input value={form.address.city} onChange={e => setAddr('city', e.target.value)}
                    className="input-field" placeholder="Chennai" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input value={form.address.state} onChange={e => setAddr('state', e.target.value)}
                    className="input-field" placeholder="Tamil Nadu" />
                </div>
              </div>

              {/* GST + PAN — both mandatory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Number *</label>
                  <input value={form.gstNumber}
                    onChange={e => set('gstNumber', e.target.value.toUpperCase())}
                    className="input-field font-mono" placeholder="29ABCDE1234F1Z5" maxLength={15} />
                  {form.gstNumber && form.gstNumber.trim().length !== 15 && (
                    <p className="text-xs text-red-500 mt-0.5">Must be 15 characters</p>
                  )}
                  {!form.gstNumber && <p className="text-xs text-red-500 mt-0.5">Required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PAN Number *</label>
                  <input value={form.panNumber}
                    onChange={e => set('panNumber', e.target.value.toUpperCase())}
                    className="input-field font-mono" placeholder="ABCDE1234F" maxLength={10} />
                  {form.panNumber && form.panNumber.trim().length !== 10 && (
                    <p className="text-xs text-red-500 mt-0.5">Must be 10 characters</p>
                  )}
                  {!form.panNumber && <p className="text-xs text-red-500 mt-0.5">Required</p>}
                </div>
              </div>

              {/* FSSAI — optional but shown for completeness */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  FSSAI License Number
                  <span className="ml-1 text-xs font-normal text-gray-400">(for food/beverage sellers)</span>
                </label>
                <input value={form.fssaiLicenseNumber}
                  onChange={e => set('fssaiLicenseNumber', e.target.value)}
                  className="input-field font-mono" placeholder="e.g. 10018022000123" maxLength={14} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                  rows={2} className="input-field resize-none" placeholder="Any internal notes..." />
              </div>

              {/* KYC Agreement Section — shown in edit mode */}
              {modal === 'edit' && editing && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">KYC & Agreements</h4>
                  <div className="space-y-3">
                    {/* Agreement File */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <FiUpload size={14} /> Signed Agreement
                      </label>
                      {editing.agreementFile?.url ? (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg p-3">
                          <FiCheckCircle size={16} className="text-green-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-green-800">Agreement Uploaded</p>
                            <a href={editing.agreementFile.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 mt-0.5">
                              <FiDownload size={12} /> View Document
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                          <p className="text-sm text-gray-600">No agreement uploaded yet</p>
                        </div>
                      )}
                    </div>

                    {/* KYC Status Badges */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: 'idProofUploaded',      label: 'ID Proof',      fileKey: 'idProof' },
                        { key: 'addressProofUploaded', label: 'Address Proof', fileKey: 'addressProof' },
                        { key: 'agreementUploaded',    label: 'Agreement',     fileKey: 'agreementFile' },
                        { key: 'chequeUploaded',       label: 'Cheque',        fileKey: 'cancelledCheque' },
                        { key: 'bankDetailsComplete',  label: 'Bank Details',  fileKey: null },
                      ].map(({ key, label, fileKey }) => {
                        const done = editing.kycStatus?.[key];
                        const url  = fileKey ? editing[fileKey]?.url : null;
                        return (
                          <div key={key} className={`rounded-lg p-3 text-center text-xs font-medium ${
                            done ? 'bg-green-50 text-green-700 border border-green-200'
                                 : 'bg-gray-50 text-gray-600 border border-gray-200'
                          }`}>
                            {done ? <FiCheckCircle size={16} className="mx-auto mb-1" /> : <FiXCircle size={16} className="mx-auto mb-1" />}
                            {label}
                            {url && (
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                className="block mt-1 text-xs text-green-600 hover:underline flex items-center justify-center gap-0.5">
                                <FiDownload size={10} /> View
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={closeModal} className="btn-outline flex-1">Cancel</button>
              <button
                onClick={modal === 'edit' ? saveSeller : createSeller}
                disabled={saving}
                className="btn-primary flex-1"
              >
                {saving
                  ? 'Saving...'
                  : modal === 'edit' ? '💾 Save Changes' : '✅ Create & Send Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
