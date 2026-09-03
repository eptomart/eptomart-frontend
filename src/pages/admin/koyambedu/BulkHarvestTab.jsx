// ============================================
// KOYAMBEDU ADMIN — BULK HARVEST TAB
// ============================================
// New, standalone tab, self-contained like PrinterTab.jsx — fetches from
// its own endpoints (/koyambedu/bulk-harvest/admin/*), completely
// separate from every other tab's data/state, so nothing else on
// KoyambeduAdmin.jsx is touched by this file existing.
//
// Three sections: the customer-facing tab on/off switch, the lead
// dashboard (visits + call-clicks), and listing management (create/edit/
// disable/delete, up to 5 photos per listing).
import { useState, useEffect } from 'react';
import { FiToggleLeft, FiToggleRight, FiPlus, FiEdit2, FiTrash2, FiX, FiEye, FiPhoneCall, FiUsers } from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATES = [
  'Andhra Pradesh', 'Karnataka', 'Kerala', 'Tamil Nadu', 'Telangana', 'Maharashtra',
  'Gujarat', 'Madhya Pradesh', 'Uttar Pradesh', 'Punjab', 'Haryana', 'Rajasthan',
  'West Bengal', 'Bihar', 'Odisha', 'Other',
];

const emptyForm = {
  cropName: '', variety: '', headline: '', quantityAvailable: '', quantityUnit: 'tons',
  dailyRate: '', dailyRateUnit: 'tons/day', village: '', district: '', state: STATES[0],
  harvestStart: '', harvestEnd: '', priceText: '', farmerName: '', farmerPhone: '',
};

function ListingForm({ initial, onCancel, onSaved }) {
  const [form, setForm] = useState(initial?.form || emptyForm);
  const [existingImages, setExistingImages] = useState(initial?.listing?.images || []);
  const [newFiles, setNewFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const totalImageCount = existingImages.length + newFiles.length;

  const handleFiles = (files) => {
    const room = 5 - existingImages.length - newFiles.length;
    if (room <= 0) return toast.error('Up to 5 images per listing');
    setNewFiles(prev => [...prev, ...Array.from(files).slice(0, room)]);
  };

  const removeExistingImage = async (index) => {
    if (!initial?.listing) {
      setExistingImages(prev => prev.filter((_, i) => i !== index));
      return;
    }
    try {
      const { data } = await api.delete(`/koyambedu/bulk-harvest/admin/${initial.listing._id}/image/${index}`);
      setExistingImages(data.listing.images);
    } catch {
      toast.error('Failed to remove image');
    }
  };

  const submit = async () => {
    if (!form.cropName || !form.quantityAvailable || !form.state || !form.farmerName || !form.farmerPhone) {
      return toast.error('Crop, quantity, state, farmer name and phone are required');
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v ?? ''));
      newFiles.forEach(f => fd.append('images', f));

      if (initial?.listing) {
        const { data } = await api.put(`/koyambedu/bulk-harvest/admin/${initial.listing._id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Listing updated');
        onSaved(data.listing);
      } else {
        const { data } = await api.post('/koyambedu/bulk-harvest/admin', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Listing created');
        onSaved(data.listing);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save listing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border-2 border-green-200 rounded-xl p-4 mb-4 grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-700 text-sm">{initial?.listing ? 'Edit listing' : 'New bulk harvest listing'}</h3>
        <button onClick={onCancel}><FiX size={16} className="text-gray-400" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Crop name (e.g. Sweet lime)" value={form.cropName} onChange={e => set('cropName', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Variety (optional)" value={form.variety} onChange={e => set('variety', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      <input placeholder="Headline — the hook line buyers see first (e.g. Premium sweet lime, hand-picked and ready to ship today)"
        value={form.headline} onChange={e => set('headline', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />

      <div className="grid grid-cols-4 gap-3">
        <input type="number" placeholder="Quantity" value={form.quantityAvailable} onChange={e => set('quantityAvailable', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <select value={form.quantityUnit} onChange={e => set('quantityUnit', e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {['tons', 'quintals', 'kg'].map(u => <option key={u}>{u}</option>)}
        </select>
        <input type="number" placeholder="Daily rate (optional)" value={form.dailyRate} onChange={e => set('dailyRate', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <select value={form.dailyRateUnit} onChange={e => set('dailyRateUnit', e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {['tons/day', 'quintals/day', 'kg/day'].map(u => <option key={u}>{u}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input placeholder="Village (optional)" value={form.village} onChange={e => set('village', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="District" value={form.district} onChange={e => set('district', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <select value={form.state} onChange={e => set('state', e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          {STATES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input type="date" value={form.harvestStart} onChange={e => set('harvestStart', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={form.harvestEnd} onChange={e => set('harvestEnd', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Price (e.g. ₹28-30/kg)" value={form.priceText} onChange={e => set('priceText', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Farmer name" value={form.farmerName} onChange={e => set('farmerName', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Farmer phone" value={form.farmerPhone} onChange={e => set('farmerPhone', e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
      </div>
      <p className="text-[11px] text-gray-400 -mt-2">Farmer name and phone are only shown to logged-in customers who tap "Call Farmer" — never shown publicly.</p>

      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Photos ({totalImageCount}/5)</p>
        <div className="flex gap-2 flex-wrap">
          {existingImages.map((img, i) => (
            <div key={img.publicId || i} className="relative w-16 h-16">
              <img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg border" />
              <button onClick={() => removeExistingImage(i)} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
            </div>
          ))}
          {newFiles.map((f, i) => (
            <div key={i} className="relative w-16 h-16">
              <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border" />
              <button onClick={() => setNewFiles(prev => prev.filter((_, j) => j !== i))} className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">×</button>
            </div>
          ))}
          {totalImageCount < 5 && (
            <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-400 hover:border-green-400">
              <FiPlus size={18} />
              <input type="file" accept="image/*" multiple hidden onChange={e => handleFiles(e.target.files)} />
            </label>
          )}
        </div>
      </div>

      <button onClick={submit} disabled={saving} className="bg-green-600 text-white rounded-lg py-2 text-sm font-bold disabled:opacity-50">
        {saving ? 'Saving…' : initial?.listing ? 'Update listing' : 'Create listing'}
      </button>
    </div>
  );
}

export default function BulkHarvestTab() {
  const [settings, setSettings] = useState(null);
  const [listings, setListings] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editListing, setEditListing] = useState(null);
  const [view, setView] = useState('listings'); // 'listings' | 'leads'

  const load = async () => {
    setLoading(true);
    try {
      const [settingsRes, listingsRes, dashRes] = await Promise.all([
        api.get('/koyambedu/home-tabs/admin/settings'),
        api.get('/koyambedu/bulk-harvest/admin/all'),
        api.get('/koyambedu/bulk-harvest/admin/dashboard'),
      ]);
      setSettings(settingsRes.data.settings);
      setListings(listingsRes.data.listings || []);
      setDashboard(dashRes.data);
    } catch {
      toast.error('Failed to load Bulk Harvest data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggleTab = async () => {
    try {
      const { data } = await api.patch('/koyambedu/home-tabs/admin/settings/bulk-harvest', { enabled: !settings.bulkHarvestEnabled });
      setSettings(data.settings);
      toast.success(data.settings.bulkHarvestEnabled ? 'Bulk Harvest tab is now live for customers' : 'Bulk Harvest tab hidden from customers');
    } catch {
      toast.error('Failed to update');
    }
  };

  const setStatus = async (id, status) => {
    try {
      const { data } = await api.patch(`/koyambedu/bulk-harvest/admin/${id}/status`, { status });
      setListings(prev => prev.map(l => l._id === id ? data.listing : l));
    } catch {
      toast.error('Failed to update status');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/koyambedu/bulk-harvest/admin/${id}`);
      setListings(prev => prev.filter(l => l._id !== id));
      toast.success('Listing deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div>
      <div className="bg-white border rounded-xl p-4 mb-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-700 text-sm">Bulk Harvest tab</p>
          <p className="text-xs text-gray-400">
            {settings?.bulkHarvestEnabled ? 'Visible to customers on the /koyambedu tab switcher' : 'Hidden — customers only see Koyambedu Daily'}
          </p>
        </div>
        <button onClick={toggleTab} className="flex items-center gap-1.5">
          {settings?.bulkHarvestEnabled
            ? <FiToggleRight size={32} className="text-green-600" />
            : <FiToggleLeft size={32} className="text-gray-300" />}
        </button>
      </div>

      {dashboard && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white border rounded-xl p-3 text-center">
            <p className="text-lg font-black text-gray-800">{dashboard.totals.activeListings}</p>
            <p className="text-[11px] text-gray-400">Active listings</p>
          </div>
          <div className="bg-white border rounded-xl p-3 text-center">
            <p className="text-lg font-black text-gray-800">{dashboard.totals.totalViews}</p>
            <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1"><FiEye size={11} /> Views</p>
          </div>
          <div className="bg-white border rounded-xl p-3 text-center">
            <p className="text-lg font-black text-green-700">{dashboard.totals.totalCalls}</p>
            <p className="text-[11px] text-gray-400 flex items-center justify-center gap-1"><FiPhoneCall size={11} /> Calls (leads)</p>
          </div>
          <div className="bg-white border rounded-xl p-3 text-center">
            <p className="text-lg font-black text-gray-800">{dashboard.totals.totalListings}</p>
            <p className="text-[11px] text-gray-400">Total listings</p>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('listings')} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${view === 'listings' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>Listings</button>
        <button onClick={() => setView('leads')} className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 ${view === 'leads' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          <FiUsers size={12} /> Leads
        </button>
      </div>

      {view === 'listings' && (
        <>
          {!showForm && (
            <button onClick={() => { setEditListing(null); setShowForm(true); }} className="mb-4 flex items-center gap-1.5 text-sm font-bold text-green-700 bg-green-50 px-3 py-2 rounded-lg">
              <FiPlus size={14} /> Add listing
            </button>
          )}

          {showForm && (
            <ListingForm
              initial={editListing ? { listing: editListing, form: {
                cropName: editListing.cropName, variety: editListing.variety, headline: editListing.headline,
                quantityAvailable: editListing.quantityAvailable, quantityUnit: editListing.quantityUnit,
                dailyRate: editListing.dailyRate ?? '', dailyRateUnit: editListing.dailyRateUnit,
                village: editListing.location?.village || '', district: editListing.location?.district || '', state: editListing.location?.state,
                harvestStart: editListing.harvestWindow?.start ? editListing.harvestWindow.start.slice(0, 10) : '',
                harvestEnd: editListing.harvestWindow?.end ? editListing.harvestWindow.end.slice(0, 10) : '',
                priceText: editListing.priceText, farmerName: editListing.farmerName, farmerPhone: editListing.farmerPhone,
              } } : null}
              onCancel={() => setShowForm(false)}
              onSaved={(listing) => {
                setListings(prev => editListing ? prev.map(l => l._id === listing._id ? listing : l) : [listing, ...prev]);
                setShowForm(false);
              }}
            />
          )}

          <div className="grid gap-3">
            {listings.map(l => (
              <div key={l._id} className="bg-white border rounded-xl p-3 flex gap-3">
                <img src={l.images?.[0]?.url || 'https://placehold.co/64x64/dcfce7/166534?text=%F0%9F%8C%BE'} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-gray-800 text-sm">{l.cropName}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${l.status === 'active' ? 'bg-green-100 text-green-700' : l.status === 'expired' ? 'bg-gray-100 text-gray-500' : 'bg-amber-100 text-amber-700'}`}>{l.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">{l.location?.district ? `${l.location.district}, ` : ''}{l.location?.state} · {l.quantityAvailable} {l.quantityUnit}{l.dailyRate ? ` · ${l.dailyRate} ${l.dailyRateUnit}` : ''}</p>
                  <p className="text-xs text-gray-400">{l.priceText} · {l.viewCount || 0} views · {l.callCount || 0} calls</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => { setEditListing(l); setShowForm(true); }} className="text-gray-400 hover:text-green-600"><FiEdit2 size={14} /></button>
                  <button onClick={() => setStatus(l._id, l.status === 'active' ? 'inactive' : 'active')} className="text-[10px] font-bold text-gray-500 underline">
                    {l.status === 'active' ? 'Hide' : 'Show'}
                  </button>
                  <button onClick={() => remove(l._id)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={14} /></button>
                </div>
              </div>
            ))}
            {listings.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No listings yet.</p>}
          </div>
        </>
      )}

      {view === 'leads' && dashboard && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-3 py-2">Buyer</th>
                <th className="text-left px-3 py-2">Phone</th>
                <th className="text-left px-3 py-2">Crop</th>
                <th className="text-left px-3 py-2">Location</th>
                <th className="text-left px-3 py-2">When</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {dashboard.leads.map((lead, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 font-semibold text-gray-700">{lead.userName}</td>
                  <td className="px-3 py-2 text-gray-600">{lead.userPhone}</td>
                  <td className="px-3 py-2 text-gray-600">{lead.cropName}</td>
                  <td className="px-3 py-2 text-gray-500">{lead.location ? `${lead.location.district || ''} ${lead.location.state || ''}`.trim() : '—'}</td>
                  <td className="px-3 py-2 text-gray-400">{new Date(lead.at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dashboard.leads.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No calls yet.</p>}
        </div>
      )}
    </div>
  );
}
