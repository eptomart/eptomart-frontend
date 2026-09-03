// ============================================
// EPTOMART EXPRESS — Super Admin management (Phase 1)
// Completely separate vertical from Koyambedu Daily / EptoFresh / Uzhavar /
// Fruit Baskets. Phase 1 scope: store CRUD, store managers, POS users,
// product catalogue + pricing preview, margin config, inventory requests.
// No customer-facing pages yet — those come in a later phase. Only
// reachable by Super Admin (backend enforces this on every
// /express/admin/* route regardless of what this page does).
// ============================================
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiZap, FiMapPin, FiUsers, FiUserCheck, FiPackage, FiSliders, FiBox,
  FiClipboard, FiPlus, FiToggleLeft, FiToggleRight, FiEdit2, FiTrash2, FiX, FiCheck,
} from 'react-icons/fi';
import api from '../../utils/api';

const TABS = [
  { key: 'stores',     label: 'Stores',      Icon: FiMapPin },
  { key: 'managers',   label: 'Managers',    Icon: FiUserCheck },
  { key: 'pos',        label: 'POS Users',   Icon: FiUsers },
  { key: 'products',   label: 'Products',    Icon: FiPackage },
  { key: 'allocation', label: 'Store Inventory', Icon: FiBox },
  { key: 'margin',     label: 'Settings', Icon: FiSliders },
  { key: 'inventory',  label: 'Inventory Requests', Icon: FiClipboard },
];

export default function ExpressAdmin() {
  const [tab, setTab] = useState('stores');
  const [stores, setStores] = useState([]); // shared across tabs (managers/pos/products need store dropdowns)

  const loadStores = () => {
    api.get('/express/admin/stores').then(r => setStores(r.data.stores || [])).catch(() => {});
  };
  useEffect(() => { loadStores(); }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-black flex items-center gap-2 mb-1 text-indigo-900">
        <FiZap className="text-amber-500" /> Eptomart Express — Same-Day Delivery
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Manage stores, staff, catalogue and margins. Phase 1: admin setup only — no customer-facing storefront yet.
      </p>

      <div className="flex flex-wrap gap-1 rounded-xl p-1 mb-5 w-fit bg-indigo-50">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            style={tab === t.key ? { background: '#fff', color: '#3730a3', boxShadow: '0 1px 4px rgba(55,48,163,0.15)' } : { color: '#6b7280' }}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'stores'    && <StoresTab stores={stores} reload={loadStores} />}
      {tab === 'managers'  && <ManagersTab stores={stores} />}
      {tab === 'pos'       && <POSUsersTab stores={stores} />}
      {tab === 'products'   && <ProductsTab />}
      {tab === 'allocation' && <StoreInventoryTab stores={stores} />}
      {tab === 'margin'     && <MarginConfigTab stores={stores} />}
      {tab === 'inventory'  && <InventoryRequestsTab />}
    </div>
  );
}

// ══════════════════════════════════════════════
// STORES TAB
// ══════════════════════════════════════════════
function StoresTab({ stores, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: 'Chennai', pincode: '', lat: '', lng: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.lat || !form.lng) return toast.error('Name, code, lat and lng are required');
    setSaving(true);
    try {
      await api.post('/express/admin/stores', form);
      toast.success('Store created');
      setForm({ name: '', code: '', address: '', city: 'Chennai', pincode: '', lat: '', lng: '', notes: '' });
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create store');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (storeId) => {
    try {
      await api.patch(`/express/admin/stores/${storeId}/toggle`);
      reload();
    } catch {
      toast.error('Failed to toggle store status');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">Store Locations</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={14} /> Add Store
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Store name (e.g. Valasaravakkam)" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Code (e.g. VALASARAVAKKAM)" value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Address" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="City" value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Pincode" value={form.pincode}
            onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Latitude" value={form.lat}
            onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Longitude" value={form.lng}
            onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Notes (optional)" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Store'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {stores.map(s => (
          <div key={s._id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">{s.name} <span className="text-xs text-gray-400 font-normal">({s.code})</span></p>
              <p className="text-xs text-gray-500">{s.address}{s.city ? `, ${s.city}` : ''} {s.pincode}</p>
              <p className="text-xs text-gray-400">Manager: {s.storeManager?.name || 'Not assigned'}</p>
              <p className="text-xs text-gray-400">{s.location?.lat}, {s.location?.lng}</p>
            </div>
            <button onClick={() => toggleActive(s._id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {s.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {s.isActive ? 'Active' : 'Inactive'}
            </button>
          </div>
        ))}
        {stores.length === 0 && <p className="text-sm text-gray-400">No stores yet — add your first one above.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MANAGERS TAB
// ══════════════════════════════════════════════
function ManagersTab({ stores }) {
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', storeId: '' });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/express/admin/managers').then(r => setManagers(r.data.managers || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password || !form.storeId) return toast.error('All fields are required');
    setSaving(true);
    try {
      await api.post('/express/admin/managers', form);
      toast.success('Store manager created');
      setForm({ name: '', phone: '', password: '', storeId: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create manager');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m) => {
    try {
      await api.put(`/express/admin/managers/${m._id}`, { isActive: !m.isActive });
      load();
    } catch { toast.error('Failed to update manager'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">Store Managers</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={14} /> Add Manager
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Phone (10 digits)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Assign to store…</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Manager'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {managers.map(m => (
          <div key={m._id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">{m.name}</p>
              <p className="text-xs text-gray-500">{m.phone} · {m.store?.name || 'No store'}</p>
            </div>
            <button onClick={() => toggleActive(m)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {m.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {m.isActive ? 'Active' : 'Suspended'}
            </button>
          </div>
        ))}
        {managers.length === 0 && <p className="text-sm text-gray-400">No store managers yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// POS USERS TAB
// ══════════════════════════════════════════════
function POSUsersTab({ stores }) {
  const [posUsers, setPosUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', pin: '', storeId: '' });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/express/admin/pos-users').then(r => setPosUsers(r.data.posUsers || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.pin || !form.storeId) return toast.error('All fields are required');
    setSaving(true);
    try {
      await api.post('/express/admin/pos-users', form);
      toast.success('POS user created');
      setForm({ name: '', username: '', pin: '', storeId: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create POS user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    try {
      await api.put(`/express/admin/pos-users/${p._id}`, { isActive: !p.isActive });
      load();
    } catch { toast.error('Failed to update POS user'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">POS Users</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={14} /> Add POS User
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="PIN (min 4 digits)" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Assign to store…</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Create POS User'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {posUsers.map(p => (
          <div key={p._id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-800">{p.name}</p>
              <p className="text-xs text-gray-500">@{p.username} · {p.store?.name || 'No store'}</p>
            </div>
            <button onClick={() => toggleActive(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {p.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {p.isActive ? 'Active' : 'Suspended'}
            </button>
          </div>
        ))}
        {posUsers.length === 0 && <p className="text-sm text-gray-400">No POS users yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PRODUCTS TAB
// ══════════════════════════════════════════════
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // the chosen Koyambedu product
  const [form, setForm] = useState({ unit: 'kg', unitsPerKg: '', procurementBaseCost: '', customMarginPct: '' });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState({}); // productId -> breakdown

  const load = () => api.get('/express/admin/products').then(r => setProducts(r.data.products || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  // Debounced search against Koyambedu Daily's catalogue — Express links to
  // an existing product rather than typing its own name/image/description.
  useEffect(() => {
    if (!showForm) return;
    const t = setTimeout(() => {
      setSearching(true);
      api.get(`/express/admin/koyambedu-catalog?search=${encodeURIComponent(search)}`)
        .then(r => setSearchResults(r.data.products || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, showForm]);

  const pickProduct = (kb) => {
    setSelected(kb);
    setForm(f => ({ ...f, unit: kb.unit || 'kg' }));
    setSearchResults([]);
    setSearch(kb.name);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error('Search and select a Koyambedu Daily product first');
    if (!form.unit || !form.procurementBaseCost) return toast.error('Unit and procurement cost are required');
    setSaving(true);
    try {
      await api.post('/express/admin/products', {
        koyambeduProductId: selected._id,
        unit: form.unit,
        unitsPerKg: form.unitsPerKg || null,
        procurementBaseCost: form.procurementBaseCost,
        customMarginPct: form.customMarginPct || null,
      });
      toast.success('Product linked to Express');
      setForm({ unit: 'kg', unitsPerKg: '', procurementBaseCost: '', customMarginPct: '' });
      setSelected(null); setSearch(''); setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async (productId) => {
    try {
      const { data } = await api.get(`/express/admin/products/${productId}/price-preview?quantity=1`);
      setPreview(p => ({ ...p, [productId]: data.breakdown }));
    } catch { toast.error('Failed to compute price preview'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">Product Catalogue</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={14} /> Link Product
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Product name, description and photo always come from Koyambedu Daily's catalogue — Express only manages its own procurement cost, unit and margin here.
      </p>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 relative">
            <input placeholder="Search Koyambedu Daily products…" value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
              className="border rounded-lg px-3 py-2 text-sm w-full" />
            {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
            {searchResults.length > 0 && !selected && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {searchResults.map(kb => (
                  <button type="button" key={kb._id} onClick={() => pickProduct(kb)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm">
                    {kb.images?.[0]?.url && <img src={kb.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
                    <span>{kb.name} <span className="text-xs text-gray-400">({kb.unit})</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="sm:col-span-2 flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
              {selected.images?.[0]?.url && <img src={selected.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
              <span className="text-sm font-semibold text-indigo-900">{selected.name}</span>
            </div>
          )}
          <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
            {['kg', 'gram', 'piece', 'bunch', 'litre', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input placeholder="Units per kg (only if bunch/piece, e.g. 10)" value={form.unitsPerKg}
            onChange={e => setForm(f => ({ ...f, unitsPerKg: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Procurement cost (₹/kg or ₹/unit)" value={form.procurementBaseCost}
            onChange={e => setForm(f => ({ ...f, procurementBaseCost: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Custom margin % (optional override)" value={form.customMarginPct}
            onChange={e => setForm(f => ({ ...f, customMarginPct: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Link Product'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setSelected(null); setSearch(''); }} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {products.map(p => (
          <div key={p._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {p.koyambeduProduct?.images?.[0]?.url && <img src={p.koyambeduProduct.images[0].url} alt="" className="w-10 h-10 rounded object-cover" />}
                <div>
                  <p className="font-bold text-gray-800">{p.koyambeduProduct?.name || '(linked product not found)'}</p>
                  <p className="text-xs text-gray-500">
                    ₹{p.procurementBaseCost}/{p.unit}{p.unitsPerKg ? ` · ${p.unitsPerKg} ${p.unit}s/kg` : ''}
                    {p.customMarginPct != null ? ` · Custom margin ${p.customMarginPct}%` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => loadPreview(p._id)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                Preview Price
              </button>
            </div>
            {preview[p._id] && (
              <div className="mt-2 pt-2 border-t text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <span>Procurement: ₹{preview[p._id].procurementCost}</span>
                <span>Logistics: ₹{preview[p._id].logisticsCostPerUnit}</span>
                <span>Platform ({preview[p._id].platformPct}%): ₹{preview[p._id].platformCharge}</span>
                <span>Salesman ({preview[p._id].salesmanPct}%): ₹{preview[p._id].salesmanCharge}</span>
                <span>Packing ({preview[p._id].packingPct}%): ₹{preview[p._id].packingCharge}</span>
                <span className="font-bold text-gray-800">Selling Price: ₹{preview[p._id].sellingPricePerUnit}</span>
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-gray-400">No products linked yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// STORE INVENTORY TAB — admin directly allocates stock to a store
// Complements (doesn't replace) the Store Manager request → Admin approve
// flow in Inventory Requests: this is a direct shortcut for the admin to
// set/adjust a store's stock and availability for any linked product
// without waiting on a manager-raised request (e.g. initial stocking of a
// brand-new store, or a quick correction). Uses the same
// GET/POST /express/admin/stores/:storeId/products endpoints that already
// existed for this purpose.
// ══════════════════════════════════════════════
function StoreInventoryTab({ stores }) {
  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState([]);       // master Express catalogue
  const [storeProducts, setStoreProducts] = useState([]); // this store's stock/availability rows
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({});            // productId -> { stockQty, isAvailable }
  const [savingId, setSavingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    api.get('/express/admin/products').then(r => setProducts(r.data.products || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!storeId) { setStoreProducts([]); return; }
    setLoading(true);
    api.get(`/express/admin/stores/${storeId}/products`)
      .then(r => setStoreProducts(r.data.storeProducts || []))
      .catch(() => toast.error('Failed to load store inventory'))
      .finally(() => setLoading(false));
  }, [storeId]);

  // Merge the master catalogue with this store's existing stock rows, so
  // every linked product shows up even if the store has never stocked it yet.
  const rows = products
    .filter(p => !search.trim() || (p.koyambeduProduct?.name || '').toLowerCase().includes(search.trim().toLowerCase()))
    .map(p => {
      const existing = storeProducts.find(sp => String(sp.product?._id) === String(p._id));
      const draft = drafts[p._id];
      return {
        product: p,
        storeProductId: existing?._id || null,
        stockQty: draft?.stockQty ?? existing?.stockQty ?? 0,
        isAvailable: draft?.isAvailable ?? existing?.isAvailable ?? false,
        dirty: !!draft,
      };
    });

  const setDraft = (productId, patch) => {
    setDrafts(d => ({ ...d, [productId]: { stockQty: rows.find(r => r.product._id === productId)?.stockQty ?? 0, isAvailable: rows.find(r => r.product._id === productId)?.isAvailable ?? false, ...d[productId], ...patch } }));
  };

  const save = async (productId) => {
    const row = rows.find(r => r.product._id === productId);
    if (!row) return;
    setSavingId(productId);
    try {
      const { data } = await api.post(`/express/admin/stores/${storeId}/products`, {
        productId,
        stockQty: Number(row.stockQty),
        isAvailable: row.isAvailable,
      });
      setStoreProducts(sp => {
        const others = sp.filter(x => String(x.product?._id) !== String(productId));
        return [...others, { ...data.storeProduct, product: row.product }];
      });
      setDrafts(d => { const next = { ...d }; delete next[productId]; return next; });
      toast.success(`Stock updated for ${row.product.koyambeduProduct?.name || 'product'}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update stock');
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (productId) => {
    const row = rows.find(r => r.product._id === productId);
    if (!row?.storeProductId) return;
    if (!window.confirm(`Remove "${row.product.koyambeduProduct?.name || 'this product'}" from this store's inventory entirely? Its stock record will be deleted (you can re-add it later).`)) return;
    setRemovingId(productId);
    try {
      await api.delete(`/express/admin/stores/${storeId}/products/${productId}`);
      setStoreProducts(sp => sp.filter(x => String(x.product?._id) !== String(productId)));
      setDrafts(d => { const next = { ...d }; delete next[productId]; return next; });
      toast.success('Removed from store inventory');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove product');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <h2 className="font-bold text-gray-700 mb-1">Store Inventory Allocation</h2>
      <p className="text-xs text-gray-400 mb-3">
        Directly allocate, edit, disable or remove any linked product's stock at a specific store — a quick admin
        shortcut alongside the Store Manager request → approve flow in Inventory Requests. "Available/Hidden"
        toggles visibility to customers &amp; POS without losing the stock count; "Remove" deletes the
        store-product record entirely.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm sm:w-64">
          <option value="">Select a store…</option>
          {stores.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        {storeId && (
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1" />
        )}
      </div>

      {!storeId && <p className="text-sm text-gray-400">Choose a store above to view and set its stock levels.</p>}
      {storeId && loading && <p className="text-sm text-gray-400">Loading inventory…</p>}

      {storeId && !loading && (
        <div className="grid gap-2">
          {rows.map(row => (
            <div key={row.product._id} className="bg-white border rounded-xl p-3 flex flex-wrap items-center gap-3">
              {row.product.koyambeduProduct?.images?.[0]?.url && (
                <img src={row.product.koyambeduProduct.images[0].url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-800 text-sm truncate">{row.product.koyambeduProduct?.name || '(linked product not found)'}</p>
                <p className="text-xs text-gray-400">Unit: {row.product.unit}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="text-xs text-gray-500 font-semibold">Stock</label>
                <input type="number" min="0" value={row.stockQty}
                  onChange={e => setDraft(row.product._id, { stockQty: e.target.value })}
                  className="w-20 border rounded-lg px-2 py-1.5 text-sm" />
              </div>

              <button onClick={() => setDraft(row.product._id, { isAvailable: !row.isAvailable })}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold ${row.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {row.isAvailable ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                {row.isAvailable ? 'Available' : 'Hidden'}
              </button>

              <button onClick={() => save(row.product._id)} disabled={!row.dirty || savingId === row.product._id}
                className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">
                {savingId === row.product._id ? 'Saving…' : 'Save'}
              </button>

              {row.storeProductId && (
                <button onClick={() => remove(row.product._id)} disabled={removingId === row.product._id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold disabled:opacity-40">
                  <FiTrash2 size={12} /> {removingId === row.product._id ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-gray-400">No products match — link products in the Products tab first.</p>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// MARGIN CONFIG TAB
// ══════════════════════════════════════════════
function MarginConfigTab({ stores }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logisticsForm, setLogisticsForm] = useState({ totalProcurementKg: '' });
  const [storeCosts, setStoreCosts] = useState({}); // storeId -> cost

  const load = () => api.get('/express/admin/margin-config').then(r => setConfig(r.data.config)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/express/admin/margin-config', {
        platformChargePct: config.platformChargePct,
        salesmanChargePct: config.salesmanChargePct,
        packingChargePct: config.packingChargePct,
        largeOrderThresholdKg: config.largeOrderThresholdKg,
        largeOrderAction: config.largeOrderAction,
        maxDeliveryDistanceKm: config.maxDeliveryDistanceKm,
      });
      toast.success('Margin config saved');
      load();
    } catch { toast.error('Failed to save margin config'); } finally { setSaving(false); }
  };

  const recompute = async () => {
    const costs = stores.map(s => ({ store: s._id, cost: Number(storeCosts[s._id]) || 0 }));
    if (!logisticsForm.totalProcurementKg) return toast.error('Enter total procurement weight (kg)');
    try {
      await api.post('/express/admin/margin-config/logistics', {
        storeCosts: costs,
        totalProcurementKg: Number(logisticsForm.totalProcurementKg),
      });
      toast.success('Logistics cost recalculated');
      load();
    } catch { toast.error('Failed to recompute logistics cost'); }
  };

  const toggleEnabled = async () => {
    try {
      const { data } = await api.patch('/express/admin/margin-config/toggle-enabled', {});
      setConfig(data.config);
      toast.success(data.config.isEnabled ? 'Eptomart Express is now LIVE for customers' : 'Eptomart Express turned OFF');
    } catch { toast.error('Failed to toggle Eptomart Express'); }
  };

  if (!config) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="grid gap-4">
      <div className={`border rounded-xl p-4 flex items-center justify-between ${config.isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
        <div>
          <p className="font-bold text-gray-800">Eptomart Express — Master Switch</p>
          <p className="text-xs text-gray-500">
            {config.isEnabled ? 'Live — customers can access Express and place orders.' : 'Off — Express is hidden from customers.'}
          </p>
        </div>
        <button onClick={toggleEnabled}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold ${config.isEnabled ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          {config.isEnabled ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {config.isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold text-gray-700 mb-3">Default Margin Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-gray-500">Platform Charge %
            <input type="number" value={config.platformChargePct} onChange={e => setConfig(c => ({ ...c, platformChargePct: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Salesman Charge %
            <input type="number" value={config.salesmanChargePct} onChange={e => setConfig(c => ({ ...c, salesmanChargePct: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Packing/Logistics Charge %
            <input type="number" value={config.packingChargePct} onChange={e => setConfig(c => ({ ...c, packingChargePct: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Large Order Threshold (kg)
            <input type="number" value={config.largeOrderThresholdKg} onChange={e => setConfig(c => ({ ...c, largeOrderThresholdKg: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Large Order Action
            <select value={config.largeOrderAction} onChange={e => setConfig(c => ({ ...c, largeOrderAction: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1">
              <option value="warn">Warn only</option>
              <option value="block">Block — redirect to Koyambedu Daily</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-500">Max Delivery Distance (km)
            <input type="number" value={config.maxDeliveryDistanceKm} onChange={e => setConfig(c => ({ ...c, maxDeliveryDistanceKm: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
        </div>
        <button onClick={save} disabled={saving} className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Margin Config'}
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold text-gray-700 mb-1">Logistics Cost per kg</h2>
        <p className="text-xs text-gray-500 mb-3">Current: ₹{config.logisticsCostPerKg}/kg. Enter the latest shipment cost per store and total procurement weight to recalculate.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {stores.map(s => (
            <label key={s._id} className="text-xs font-semibold text-gray-500">{s.name} shipment cost (₹)
              <input type="number" value={storeCosts[s._id] || ''} onChange={e => setStoreCosts(c => ({ ...c, [s._id]: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
            </label>
          ))}
          <label className="text-xs font-semibold text-gray-500">Total procurement weight (kg)
            <input type="number" value={logisticsForm.totalProcurementKg} onChange={e => setLogisticsForm({ totalProcurementKg: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
        </div>
        <button onClick={recompute} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold">
          Recalculate Logistics Cost
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// INVENTORY REQUESTS TAB
// ══════════════════════════════════════════════
function InventoryRequestsTab() {
  const [requests, setRequests] = useState([]);

  const load = () => api.get('/express/admin/inventory-requests').then(r => setRequests(r.data.requests || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    try {
      await api.patch(`/express/admin/inventory-requests/${id}/approve`, {});
      toast.success('Request approved and stock allocated');
      load();
    } catch { toast.error('Failed to approve request'); }
  };

  const reject = async (id) => {
    try {
      await api.patch(`/express/admin/inventory-requests/${id}/reject`, {});
      toast('Request rejected');
      load();
    } catch { toast.error('Failed to reject request'); }
  };

  return (
    <div>
      <h2 className="font-bold text-gray-700 mb-3">Inventory Requests</h2>
      <div className="grid gap-3">
        {requests.map(r => (
          <div key={r._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-gray-800">{r.store?.name || 'Unknown store'}</p>
                <p className="text-xs text-gray-500">Requested by {r.requestedByName} · {new Date(r.createdAt).toLocaleString('en-IN')}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {r.status}
              </span>
            </div>
            <ul className="text-xs text-gray-600 mb-2 list-disc pl-4">
              {r.items?.map((it, i) => (
                <li key={i}>{it.product?.koyambeduProduct?.name || 'Product'} — requested {it.requestedQty} {it.product?.unit || ''}{it.allocatedQty != null ? ` (allocated ${it.allocatedQty})` : ''}</li>
              ))}
            </ul>
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => approve(r._id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold">
                  <FiCheck size={12} /> Approve
                </button>
                <button onClick={() => reject(r._id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold">
                  <FiX size={12} /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-sm text-gray-400">No inventory requests yet — these are raised by Store Managers once the POS/store-manager phase is built.</p>}
      </div>
    </div>
  );
}
