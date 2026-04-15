import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiToggleLeft, FiToggleRight, FiSearch, FiUser } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const BLANK_FORM = {
  businessName: '', email: '', phone: '',
  address: { street: '', city: '', state: '', pincode: '' },
  gstNumber: '', notes: '',
};

const STATUS_COLOR = {
  active:    'bg-green-100 text-green-700',
  inactive:  'bg-gray-100 text-gray-600',
  suspended: 'bg-red-100 text-red-700',
};

export default function AdminSellers() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(BLANK_FORM);
  const [saving,  setSaving]  = useState(false);

  const load = async (q = '') => {
    setLoading(true);
    try {
      const { data } = await api.get(`/sellers?search=${q}`);
      setSellers(data.sellers || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    const t = setTimeout(() => load(e.target.value), 400);
    return () => clearTimeout(t);
  };

  const setStatus = async (seller, status) => {
    try {
      await api.patch(`/sellers/${seller._id}/status`, { status });
      setSellers(s => s.map(x => x._id === seller._id ? { ...x, status } : x));
      toast.success(`Seller ${status}`);
    } catch { toast.error('Failed to update status'); }
  };

  const createSeller = async () => {
    if (!form.businessName || !form.address.pincode || (!form.email && !form.phone)) {
      return toast.error('Business name, pincode, and email or phone required');
    }
    setSaving(true);
    try {
      await api.post('/sellers', form);
      toast.success('Seller created! Credentials sent.');
      setModal(false); setForm(BLANK_FORM);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create seller');
    } finally { setSaving(false); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const setAddr = (key, val) => setForm(f => ({ ...f, address: { ...f.address, [key]: val } }));

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-800">Sellers Management</h1>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
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
        <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>
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
                      </div>
                    </div>
                  </td>
                  <td className="p-4 hidden sm:table-cell text-gray-600">
                    <p>{s.contact?.phone || s.user?.phone || '—'}</p>
                  </td>
                  <td className="p-4 hidden md:table-cell text-gray-600">
                    {s.address?.city || '—'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[s.status] || 'bg-gray-100 text-gray-600'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {s.status === 'active' ? (
                        <button onClick={() => setStatus(s, 'suspended')} title="Suspend"
                          className="text-orange-400 hover:text-orange-600 p-1.5 rounded-lg hover:bg-orange-50">
                          <FiToggleRight size={18} />
                        </button>
                      ) : (
                        <button onClick={() => setStatus(s, 'active')} title="Activate"
                          className="text-green-500 hover:text-green-600 p-1.5 rounded-lg hover:bg-green-50">
                          <FiToggleLeft size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Seller Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-gray-800 text-lg mb-4">Create New Seller</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input value={form.businessName} onChange={e => set('businessName', e.target.value)} className="input-field" placeholder="ABC Electronics" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className="input-field" placeholder="seller@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} className="input-field" placeholder="9876543210" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                <input value={form.address.street} onChange={e => setAddr('street', e.target.value)} className="input-field" placeholder="12 Main Street" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                  <input value={form.address.city} onChange={e => setAddr('city', e.target.value)} className="input-field" placeholder="Chennai" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                  <input value={form.address.state} onChange={e => setAddr('state', e.target.value)} className="input-field" placeholder="Tamil Nadu" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pincode *</label>
                  <input value={form.address.pincode} onChange={e => setAddr('pincode', e.target.value)} className="input-field" placeholder="600001" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GST Number</label>
                  <input value={form.gstNumber} onChange={e => set('gstNumber', e.target.value)} className="input-field" placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="input-field resize-none" placeholder="Any internal notes..." />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => { setModal(false); setForm(BLANK_FORM); }} className="btn-outline flex-1">Cancel</button>
              <button onClick={createSeller} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Creating...' : '✅ Create & Send Credentials'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
