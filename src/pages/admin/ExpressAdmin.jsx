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
  FiGrid, FiDollarSign, FiShoppingCart, FiEye, FiTrendingUp, FiTrendingDown, FiFileText,
  FiBluetooth, FiPrinter, FiPauseCircle, FiPlayCircle,
} from 'react-icons/fi';
import api from '../../utils/api';
import { isBluetoothSupported, connectPrinter, disconnectPrinter, isPrinterConnected, printPluList } from '../../utils/expressThermalPrinter';

// Express's own category list — entirely separate from Koyambedu Daily's
// categories (free-text on ExpressProduct.category, not a KoyambeduCategory
// ref). "Combos" is fixed/reserved: every combo is auto-filed under it
// (see CreateProductTab) so the customer-facing shop can always group combos
// together regardless of what else an admin adds here later.
const EXPRESS_CATEGORIES = [
  'Vegetables', 'Fruits', 'Dairy & Eggs', 'Groceries', 'Snacks & Beverages',
  'Bakery', 'Meat & Seafood', 'Household', 'Personal Care', 'Combos',
];

const TABS = [
  { key: 'dashboard',  label: 'Dashboard',   Icon: FiGrid },
  { key: 'stores',     label: 'Stores',      Icon: FiMapPin },
  { key: 'managers',   label: 'Managers',    Icon: FiUserCheck },
  { key: 'pos',        label: 'POS Users',   Icon: FiUsers },
  { key: 'products',   label: 'Products',    Icon: FiPackage },
  { key: 'allocation', label: 'Store Inventory', Icon: FiBox },
  { key: 'online',     label: 'Online Catalog', Icon: FiEye },
  { key: 'create',     label: 'Create Product/Combo', Icon: FiPlus },
  { key: 'expenses',   label: 'Expenses',    Icon: FiDollarSign },
  { key: 'carts',      label: 'Carts',       Icon: FiShoppingCart },
  { key: 'margin',     label: 'Settings', Icon: FiSliders },
  { key: 'inventory',  label: 'Inventory Requests', Icon: FiClipboard },
];

export default function ExpressAdmin() {
  const [tab, setTab] = useState('dashboard');
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

      {tab === 'dashboard'  && <DashboardTab stores={stores} />}
      {tab === 'stores'    && <StoresTab stores={stores} reload={loadStores} />}
      {tab === 'managers'  && <ManagersTab stores={stores} />}
      {tab === 'pos'       && <POSUsersTab stores={stores} />}
      {tab === 'products'   && <ProductsTab />}
      {tab === 'allocation' && <StoreInventoryTab stores={stores} />}
      {tab === 'online'     && <OnlineCatalogTab stores={stores} reload={loadStores} />}
      {tab === 'create'     && <CreateProductTab />}
      {tab === 'expenses'   && <ExpensesTab stores={stores} />}
      {tab === 'carts'      && <CartsTab />}
      {tab === 'margin'     && <MarginConfigTab stores={stores} />}
      {tab === 'inventory'  && <InventoryRequestsTab />}
    </div>
  );
}

// ══════════════════════════════════════════════
// DASHBOARD TAB — profit/loss finance summary + recent visitors
// Mirrors the FruitBasketAdmin/KoyambeduAdmin dashboard pattern: stat cards
// fed by the finance-dashboard endpoint (revenue, COGS, losses, other
// expenses, net profit) plus a recent-visitors list from the shared
// Analytics collection, filtered to Express's own API paths.
// ══════════════════════════════════════════════
function DashboardTab({ stores }) {
  const [finance, setFinance] = useState(null);
  const [visits, setVisits] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeId) params.set('storeId', storeId);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    Promise.all([
      api.get(`/express/admin/finance-dashboard?${params.toString()}`).then(r => setFinance(r.data.finance)).catch(() => setFinance(null)),
      api.get('/express/admin/visitors?limit=12').then(r => setVisits(r.data.visits || [])).catch(() => setVisits([])),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [storeId, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const Stat = ({ label, value, positive, negative, icon: Icon }) => (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold mb-1">
        {Icon && <Icon size={12} />} {label}
      </div>
      <p className={`text-xl font-black ${positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-bold text-gray-700">Finance Overview</h2>
        <div className="flex flex-wrap gap-2">
          <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs">
            <option value="">All stores</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="border rounded-lg px-2.5 py-1.5 text-xs" />
          <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="border rounded-lg px-2.5 py-1.5 text-xs" />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && finance && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Stat label="Revenue" value={`₹${finance.revenue}`} icon={FiDollarSign} />
            <Stat label="Procurement + Logistics Cost" value={`₹${finance.cogs}`} icon={FiPackage} />
            <Stat label="Loss Value" value={`₹${finance.lossValue}`} icon={FiTrendingDown} negative={finance.lossValue > 0} />
            <Stat label="Other Expenses" value={`₹${finance.otherExpenses}`} icon={FiFileText} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Stat label="Online Revenue" value={`₹${finance.onlineRevenue}`} />
            <Stat label="POS Revenue" value={`₹${finance.posRevenue}`} />
            <Stat label="Orders + Bills" value={`${finance.onlineOrderCount} / ${finance.posBillCount}`} />
            <Stat label="Net Profit / Loss" value={`₹${finance.netProfit}`} icon={finance.netProfit >= 0 ? FiTrendingUp : FiTrendingDown}
              positive={finance.netProfit >= 0} negative={finance.netProfit < 0} />
          </div>
        </>
      )}

      <h3 className="font-bold text-gray-700 mb-2 text-sm flex items-center gap-1.5"><FiEye size={14} /> Recent Visitors</h3>
      <div className="bg-white border rounded-xl divide-y">
        {visits.map(v => (
          <div key={v._id} className="flex items-center justify-between px-3 py-2 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-gray-700 truncate">{v.page}</p>
              <p className="text-gray-400">{v.user ? v.user.name : 'Guest'} · {v.city || v.country || 'Unknown location'} · {v.device || ''}</p>
            </div>
            <span className="text-gray-400 shrink-0 ml-2">{new Date(v.timestamp).toLocaleString('en-IN')}</span>
          </div>
        ))}
        {visits.length === 0 && <p className="text-sm text-gray-400 px-3 py-3">No visits recorded yet.</p>}
      </div>
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
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

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

  const togglePause = async (s) => {
    let message = null;
    if (!s.isPaused) {
      message = window.prompt(
        "Message to show customers while this store is paused (optional):",
        "We're currently busy with existing orders — we'll be back online shortly!"
      );
      if (message === null) return; // cancelled
    }
    try {
      await api.patch(`/express/admin/stores/${s._id}/toggle-pause`, { message });
      toast.success(s.isPaused ? 'Store resumed — taking new orders again' : 'Store put on hold — customers will see the busy message');
      reload();
    } catch {
      toast.error('Failed to update hold status');
    }
  };

  const openEdit = (s) => {
    setEditId(s._id);
    setEditForm({
      name: s.name || '', address: s.address || '', city: s.city || '', pincode: s.pincode || '',
      lat: s.location?.lat ?? '', lng: s.location?.lng ?? '', notes: s.notes || '',
    });
  };

  const saveEdit = async (storeId) => {
    if (!editForm.name || !editForm.lat || !editForm.lng) return toast.error('Name, lat and lng are required');
    setEditSaving(true);
    try {
      await api.put(`/express/admin/stores/${storeId}`, editForm);
      toast.success('Store updated');
      setEditId(null);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update store');
    } finally {
      setEditSaving(false);
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
          <div key={s._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-bold text-gray-800">{s.name} <span className="text-xs text-gray-400 font-normal">({s.code})</span>
                  {s.isPaused && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold align-middle">ON HOLD</span>}
                </p>
                <p className="text-xs text-gray-500">{s.address}{s.city ? `, ${s.city}` : ''} {s.pincode}</p>
                <p className="text-xs text-gray-400">Manager: {s.storeManager?.name || 'Not assigned'}</p>
                <p className="text-xs text-gray-400">{s.location?.lat}, {s.location?.lng}</p>
                {s.isPaused && <p className="text-xs text-amber-600 mt-1 italic">&ldquo;{s.pauseMessage}&rdquo;</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(s)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => togglePause(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${s.isPaused ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.isPaused ? <FiPlayCircle size={16} /> : <FiPauseCircle size={16} />} {s.isPaused ? 'Resume Orders' : 'Hold (Busy)'}
                </button>
                <button onClick={() => toggleActive(s._id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {s.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            {editId === s._id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input placeholder="Store name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="City" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Address" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
                <input placeholder="Pincode" value={editForm.pincode} onChange={e => setEditForm(f => ({ ...f, pincode: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Notes" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Latitude" value={editForm.lat} onChange={e => setEditForm(f => ({ ...f, lat: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Longitude" value={editForm.lng} onChange={e => setEditForm(f => ({ ...f, lng: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(s._id)} disabled={editSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
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
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

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

  const openEdit = (m) => { setEditId(m._id); setEditForm({ name: m.name || '', phone: m.phone || '', password: '' }); };

  const saveEdit = async (managerId) => {
    if (!editForm.name || !editForm.phone) return toast.error('Name and phone are required');
    setEditSaving(true);
    try {
      const payload = { name: editForm.name, phone: editForm.phone };
      if (editForm.password) payload.password = editForm.password;
      await api.put(`/express/admin/managers/${managerId}`, payload);
      toast.success(editForm.password ? 'Manager updated and password reset' : 'Manager updated');
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update manager');
    } finally {
      setEditSaving(false);
    }
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
          <div key={m._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-bold text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-500">{m.phone} · {m.store?.name || 'No store'}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(m)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => toggleActive(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {m.isActive ? 'Active' : 'Suspended'}
                </button>
              </div>
            </div>

            {editId === m._id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input placeholder="Full name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Phone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="New password (leave blank to keep current)" type="password" value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(m._id)} disabled={editSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
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
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

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

  const openEdit = (p) => { setEditId(p._id); setEditForm({ name: p.name || '', pin: '' }); };

  const saveEdit = async (posUserId) => {
    if (!editForm.name) return toast.error('Name is required');
    setEditSaving(true);
    try {
      const payload = { name: editForm.name };
      if (editForm.pin) payload.pin = editForm.pin;
      await api.put(`/express/admin/pos-users/${posUserId}`, payload);
      toast.success(editForm.pin ? 'POS user updated and PIN reset' : 'POS user updated');
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update POS user');
    } finally {
      setEditSaving(false);
    }
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
          <div key={p._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-bold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">@{p.username} · {p.store?.name || 'No store'}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => toggleActive(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {p.isActive ? 'Active' : 'Suspended'}
                </button>
              </div>
            </div>

            {editId === p._id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input placeholder="Full name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="New PIN (leave blank to keep current)" value={editForm.pin}
                  onChange={e => setEditForm(f => ({ ...f, pin: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(p._id)} disabled={editSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
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
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // click-to-confirm, no native dialog
  const [pluEditId, setPluEditId] = useState(null);
  const [pluDraft, setPluDraft] = useState('');
  const [pluSavingId, setPluSavingId] = useState(null);

  const load = () => api.get('/express/admin/products').then(r => setProducts(r.data.products || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  // PLU (Price Look-Up) quick-entry code shown/edited inline on each product
  // row — vegetables 100-199, fruits 200-299, auto-assigned on link but
  // overridable here. Lets POS staff key in a 3-digit code instead of
  // searching by name.
  const openPluEdit = (p) => { setPluEditId(p._id); setPluDraft(p.plu != null ? String(p.plu) : ''); };
  const savePlu = async (productId) => {
    setPluSavingId(productId);
    try {
      await api.patch(`/express/admin/products/${productId}/plu`, { plu: pluDraft === '' ? null : Number(pluDraft) });
      toast.success('PLU code updated');
      setPluEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update PLU code');
    } finally {
      setPluSavingId(null);
    }
  };

  const openEdit = (p) => {
    setEditId(p._id);
    setEditForm({
      unit: p.unit || 'kg',
      unitsPerKg: p.unitsPerKg ?? '',
      procurementBaseCost: p.procurementBaseCost ?? '',
      customMarginPct: p.customMarginPct ?? '',
      isActive: p.isActive !== false,
    });
  };

  const saveEdit = async (productId) => {
    setEditSaving(true);
    try {
      await api.put(`/express/admin/products/${productId}`, {
        unit: editForm.unit,
        unitsPerKg: editForm.unitsPerKg === '' ? null : editForm.unitsPerKg,
        procurementBaseCost: editForm.procurementBaseCost,
        customMarginPct: editForm.customMarginPct === '' ? null : editForm.customMarginPct,
        isActive: editForm.isActive,
      });
      toast.success('Product updated');
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update product');
    } finally {
      setEditSaving(false);
    }
  };

  // Click-to-confirm instead of window.confirm() — native confirm() dialogs
  // can be silently suppressed in some embedded/webview contexts, which
  // made Delete appear to do nothing. First click arms it; a second click
  // on the now-red "Confirm Delete?" button actually deletes; it
  // auto-disarms after a few seconds or if you click elsewhere.
  const deleteProduct = async (p) => {
    if (confirmDeleteId !== p._id) { setConfirmDeleteId(p._id); return; }
    setConfirmDeleteId(null);
    setDeletingId(p._id);
    try {
      await api.delete(`/express/admin/products/${p._id}`);
      toast.success('Product deleted from Express');
      load();
    } catch (err) {
      console.error('[ExpressAdmin.deleteProduct]', err);
      toast.error(err?.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

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
                    {kb.isActive === false && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Disabled in Koyambedu</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="sm:col-span-2 flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
              {selected.images?.[0]?.url && <img src={selected.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
              <span className="text-sm font-semibold text-indigo-900">{selected.name}</span>
              {selected.isActive === false && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">Disabled in Koyambedu</span>}
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
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {(p.koyambeduProduct?.images?.[0]?.url || p.image) && <img src={p.koyambeduProduct?.images?.[0]?.url || p.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate flex items-center gap-1.5">
                    {p.koyambeduProduct?.name || p.name || '(unnamed product)'}
                    {!p.koyambeduProduct && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{p.isCombo ? 'Combo' : 'Native'}</span>}
                    {p.isActive === false && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.plu != null ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                      PLU {p.plu != null ? p.plu : '—'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    ₹{p.procurementBaseCost}/{p.unit}{p.unitsPerKg ? ` · ${p.unitsPerKg} ${p.unit}s/kg` : ''}
                    {p.customMarginPct != null ? ` · Custom margin ${p.customMarginPct}%` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => loadPreview(p._id)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  Preview Price
                </button>
                <button onClick={() => openPluEdit(p)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  Set PLU
                </button>
                <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => deleteProduct(p)} disabled={deletingId === p._id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${confirmDeleteId === p._id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>
                  <FiTrash2 size={12} /> {deletingId === p._id ? 'Deleting…' : confirmDeleteId === p._id ? 'Confirm Delete?' : 'Delete'}
                </button>
              </div>
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

            {pluEditId === p._id && (
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <input type="number" min="100" max="299" placeholder="e.g. 214" value={pluDraft}
                  onChange={e => setPluDraft(e.target.value)}
                  className="w-28 border rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-xs text-gray-400">100-199 vegetables · 200-299 fruits · blank clears</span>
                <button onClick={() => savePlu(p._id)} disabled={pluSavingId === p._id}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">
                  {pluSavingId === p._id ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setPluEditId(null)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold">Cancel</button>
              </div>
            )}

            {editId === p._id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                  {['kg', 'gram', 'piece', 'bunch', 'litre', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input placeholder="Units per kg" value={editForm.unitsPerKg}
                  onChange={e => setEditForm(f => ({ ...f, unitsPerKg: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Procurement cost" value={editForm.procurementBaseCost}
                  onChange={e => setEditForm(f => ({ ...f, procurementBaseCost: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Custom margin % (optional)" value={editForm.customMarginPct}
                  onChange={e => setEditForm(f => ({ ...f, customMarginPct: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <button onClick={() => setEditForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold justify-center sm:col-span-2 ${editForm.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {editForm.isActive ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {editForm.isActive ? 'Active' : 'Inactive'}
                </button>
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(p._id)} disabled={editSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
                </div>
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
// flow in Inventory Requests. "Add Stock" ADDS to whatever the store
// already has (each delivery accumulates onto existing stock, rather than
// overwriting it) — the toggle and remove actions are separate, immediate
// actions. A "Stock Report" section below shows every addition (by admin)
// and loss (reported by the Store Manager) for the selected store.
// ══════════════════════════════════════════════
// ── Online Catalog ──────────────────────────────────────────────────────
// Every active Koyambedu Daily product is a candidate for every store — no
// "link into Express" step needed first. Admin just picks which ones to
// show online for THIS store, at what price (Koyambedu's own price is shown
// alongside purely as a wholesale reference point). Deliberately separate
// from the Store Inventory tab above: toggling a product on here never
// touches stock, the manager dashboard, or the POS terminal — it only
// controls what the customer-facing Express shop displays and at what
// price. One "Save All" action for the whole screen, not a click per row.
function OnlineCatalogTab({ stores, reload }) {
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({}); // rowId (koyambeduProductId or expressProductId) -> { isEnabled, price }
  const [saving, setSaving] = useState(false);
  const [togglingShop, setTogglingShop] = useState(false);

  // Looked up from the shared `stores` list (kept in sync by the parent's
  // reload()) rather than its own state, so it always reflects the latest
  // toggle without a second round-trip.
  const selectedStore = stores.find(s => s._id === storeId);

  const toggleOnlineShop = async () => {
    if (!storeId) return;
    setTogglingShop(true);
    try {
      await api.patch(`/express/admin/stores/${storeId}/toggle-online-shop`);
      toast.success(selectedStore?.onlineShopEnabled ? 'Online shop turned OFF for this store' : 'Online shop turned ON for this store');
      reload?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update online shop status');
    } finally {
      setTogglingShop(false);
    }
  };

  const loadCatalog = () => {
    if (!storeId) { setItems([]); return; }
    setLoading(true);
    api.get(`/express/admin/stores/${storeId}/online-catalog`)
      .then(r => { setItems(r.data.items || []); setStoreName(r.data.store?.name || ''); setDrafts({}); })
      .catch(() => toast.error('Failed to load online catalog'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadCatalog(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generic row id works for both a Koyambedu-linked row and a fully-native
  // Express product/combo row — exactly one of the two ids is ever present.
  const rowId = (it) => String(it.koyambeduProductId || it.expressProductId);

  const rows = items.filter(it => !search.trim() || it.name.toLowerCase().includes(search.trim().toLowerCase()));

  const draftFor = (id) => drafts[id] || {};
  const setDraft = (id, patch) => setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));

  const saveAll = async () => {
    if (!storeId) return toast.error('Select a store first');
    const changed = Object.entries(drafts).filter(([, v]) => v.isEnabled !== undefined || v.price !== undefined);
    if (!changed.length) return toast('Nothing changed to save', { icon: 'ℹ️' });

    const payload = changed.map(([id, v]) => {
      const row = items.find(it => rowId(it) === id);
      const base = row?.source === 'native' ? { expressProductId: id } : { koyambeduProductId: id };
      return {
        ...base,
        isEnabled: v.isEnabled ?? row?.isEnabled ?? false,
        price: v.price !== undefined ? (v.price === '' ? null : Number(v.price)) : row?.price,
      };
    });

    setSaving(true);
    try {
      await api.patch(`/express/admin/stores/${storeId}/online-catalog`, { items: payload });
      toast.success(`Saved ${payload.length} item${payload.length === 1 ? '' : 's'}`);
      loadCatalog();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save online catalog');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border p-4">
      <h3 className="font-bold text-gray-800 mb-1">Online Catalog</h3>
      <p className="text-xs text-gray-500 mb-4">
        Every Koyambedu Daily product, plus every Express-native product/combo created in "Create Product/Combo",
        is listed here automatically. Tick "Online" to make it appear in the Express shop for this store — the
        wholesale/base cost shown is only a reference, it does not have to match. If you don't type a price, it
        defaults to cost + 15%; type your own number anytime to override it. Leaving a product unticked keeps it
        out of the online shop without affecting anything else.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm sm:w-64">
          <option value="">Select a store…</option>
          {stores.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        {storeId && (
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1" />
        )}
        {storeId && (
          <button onClick={saveAll} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shrink-0">
            {saving ? 'Saving…' : 'Save All'}
          </button>
        )}
      </div>

      {storeId && (
        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl border bg-gray-50">
          <div>
            <p className="text-sm font-bold text-gray-700">Online Shop — {selectedStore?.name}</p>
            <p className="text-xs text-gray-500">
              Master switch for this store's customer-facing online shop — separate from the Store Active switch
              (Stores tab), which controls POS/in-person business. Turning this off hides the store from the Express
              app's store list entirely, even if individual products below are ticked online.
            </p>
          </div>
          <button onClick={toggleOnlineShop} disabled={togglingShop}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold shrink-0 disabled:opacity-50"
            style={selectedStore?.onlineShopEnabled
              ? { background: '#dcfce7', color: '#16a34a' }
              : { background: '#fee2e2', color: '#dc2626' }}>
            {selectedStore?.onlineShopEnabled ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
            {togglingShop ? 'Updating…' : selectedStore?.onlineShopEnabled ? 'Online Shop: ON' : 'Online Shop: OFF'}
          </button>
        </div>
      )}

      {!storeId ? (
        <p className="text-sm text-gray-400 py-6 text-center">Select a store to manage its online catalog.</p>
      ) : loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Wholesale / Base Cost</th>
                <th className="px-3 py-2 text-center">Online</th>
                <th className="px-3 py-2 text-right">Online Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const id = rowId(row);
                const d = draftFor(id);
                const isEnabled = d.isEnabled ?? row.isEnabled;
                return (
                  <tr key={id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">
                      {row.name} <span className="text-gray-400 font-normal">· {row.unit}</span>
                      {row.source === 'native' && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 align-middle">
                          {row.isCombo ? 'Combo' : 'Native'}
                        </span>
                      )}
                      {row.category && <span className="block text-[10px] text-gray-400 font-normal">{row.category}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">₹{(row.wholesalePrice || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={isEnabled}
                        onChange={e => {
                          const checked = e.target.checked;
                          const patch = { isEnabled: checked };
                          // Pre-fill a default +15% markup over wholesale the moment a
                          // product is switched online with no price set yet — admin
                          // can still type their own number before (or after) saving.
                          if (checked && d.price === undefined && row.price == null) {
                            patch.price = (Math.round(row.wholesalePrice * 1.15 * 100) / 100).toFixed(2);
                          }
                          setDraft(id, patch);
                        }}
                        className="w-4 h-4 accent-indigo-600" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" placeholder="Default: +15%"
                        value={d.price ?? (row.price ?? '')}
                        onChange={e => setDraft(id, { price: e.target.value })}
                        className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:border-indigo-400" />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="text-center text-gray-400 py-6">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// CREATE PRODUCT / COMBO TAB
// Lets the Express admin create a brand-new product (or a combo bundling
// several existing Express products) entirely within Express — this never
// touches Koyambedu Daily's catalogue, sellers, or categories in any way.
// Posts to Express's own native-product endpoint (POST
// /express/admin/products/native), creating a standalone ExpressProduct
// with koyambeduProduct left absent. The combo-contents picker searches
// Express's OWN catalogue (GET /express/admin/products/native/search,
// which covers both native and Koyambedu-linked Express products) — so a
// combo can bundle either kind, but the search itself never calls into
// Koyambedu Daily. Once created, the product/combo shows up automatically
// in the Online Catalog tab (source: 'native') to be switched on per store.
// Category here is a simple free-text field scoped to Express only — see
// EXPRESS_CATEGORIES below for the fixed list including "Combos".
// ══════════════════════════════════════════════
function CreateProductTab() {
  const blankForm = { name: '', category: '', unit: 'kg', procurementBaseCost: '', description: '', isCombo: false };
  const [form, setForm] = useState(blankForm);
  const [comboContents, setComboContents] = useState([]); // [{ product, name, unit, qty }]
  const [comboSearch, setComboSearch] = useState('');
  const [comboResults, setComboResults] = useState([]);
  const [comboSearching, setComboSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState([]);

  // Debounced search against Express's OWN catalogue (native + Koyambedu-
  // linked Express products) — never Koyambedu Daily directly.
  useEffect(() => {
    if (!comboSearch || comboSearch.length < 2) { setComboResults([]); return; }
    setComboSearching(true);
    const t = setTimeout(() => {
      api.get('/express/admin/products/native/search', { params: { search: comboSearch } })
        .then(r => setComboResults((r.data.products || []).slice(0, 8)))
        .catch(() => setComboResults([]))
        .finally(() => setComboSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [comboSearch]);

  const addComboItem = (p) => {
    if (comboContents.some(c => c.product === p._id)) return;
    setComboContents(c => [...c, { product: p._id, name: p.name, unit: p.unit, qty: 1 }]);
    setComboSearch(''); setComboResults([]);
  };
  const updateComboQty = (productId, qty) => setComboContents(c => c.map(i => i.product === productId ? { ...i, qty } : i));
  const removeComboItem = (productId) => setComboContents(c => c.filter(i => i.product !== productId));

  const resetForm = () => { setForm({ ...blankForm, category: form.isCombo ? 'Combos' : '' }); setComboContents([]); setComboSearch(''); setComboResults([]); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Product name is required');
    if (!form.procurementBaseCost) return toast.error('Base/procurement cost is required — Express’s margin engine prices off this');
    if (form.isCombo && comboContents.length === 0) return toast.error('Add at least one item to the combo');

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.isCombo ? 'Combos' : (form.category || undefined),
        unit: form.unit,
        description: form.description,
        procurementBaseCost: Number(form.procurementBaseCost),
        isCombo: form.isCombo,
        comboContents: form.isCombo ? comboContents.map(c => ({ product: c.product, name: c.name, unit: c.unit, qty: Number(c.qty) || 0 })) : [],
      };
      const { data } = await api.post('/express/admin/products/native', payload);
      toast.success(`"${form.name}" created — go to Online Catalog to enable it for a store and set its price.`);
      setRecentlyCreated(c => [{ _id: data.product._id, name: data.product.name, isCombo: form.isCombo }, ...c].slice(0, 5));
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 max-w-2xl">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800">
        Create a brand-new product, or a combo bundling several existing Express products, entirely within Express —
        this never touches Koyambedu Daily's catalogue. After creating it here, go to <strong>Online Catalog</strong> to
        switch it on for a store and set its Express price (new items default to a +15% markup over base cost, which
        you can override).
      </div>

      <form onSubmit={submit} className="bg-white border rounded-xl p-4 grid gap-3">
        <label className="text-xs font-semibold text-gray-500">Product name
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sunday Veg Combo" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-500">Category {form.isCombo && <span className="font-normal text-gray-400">(auto: Combos)</span>}
            <select value={form.isCombo ? 'Combos' : form.category} disabled={form.isCombo}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1 disabled:bg-gray-100 disabled:text-gray-400">
              <option value="">Choose category…</option>
              {EXPRESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-500">Unit
            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mt-1">
              {['kg', 'g', 'piece', 'bunch', 'dozen', 'litre'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </div>

        <label className="text-xs font-semibold text-gray-500">Base / procurement cost (₹)
          <input type="number" value={form.procurementBaseCost} onChange={e => setForm(f => ({ ...f, procurementBaseCost: e.target.value }))}
            placeholder="What it costs Express to procure/pack this" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>

        <label className="text-xs font-semibold text-gray-500">Description (optional)
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>

        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={form.isCombo}
            onChange={e => setForm(f => ({ ...f, isCombo: e.target.checked, category: e.target.checked ? 'Combos' : f.category }))}
            className="w-4 h-4 accent-indigo-600" />
          This is a combo (bundles several existing Express products)
        </label>

        {form.isCombo && (
          <div className="border rounded-xl p-3 bg-gray-50">
            <p className="text-xs font-bold text-gray-600 mb-2">Combo contents</p>
            <div className="relative mb-2">
              <input value={comboSearch} onChange={e => setComboSearch(e.target.value)} placeholder="Search an Express product to add…"
                className="border rounded-lg px-3 py-2 text-sm w-full" />
              {comboSearching && <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching…</span>}
              {comboResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {comboResults.map(p => (
                    <button type="button" key={p._id} onClick={() => addComboItem(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b last:border-b-0">
                      {p.name} <span className="text-gray-400">· {p.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              {comboContents.map(item => (
                <div key={item.product} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5">
                  <span className="flex-1 text-sm text-gray-700 truncate">{item.name}</span>
                  <input type="number" value={item.qty} onChange={e => updateComboQty(item.product, e.target.value)}
                    className="w-20 border rounded px-2 py-1 text-xs text-right" />
                  <span className="text-xs text-gray-400 w-10">{item.unit}</span>
                  <button type="button" onClick={() => removeComboItem(item.product)} className="text-red-400 hover:text-red-600"><FiX size={14} /></button>
                </div>
              ))}
              {comboContents.length === 0 && <p className="text-xs text-gray-400">No items added yet.</p>}
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 w-fit">
          {saving ? 'Creating…' : form.isCombo ? 'Create Combo' : 'Create Product'}
        </button>
      </form>

      {recentlyCreated.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-gray-700 text-sm mb-2">Just created</h3>
          <ul className="text-sm text-gray-600 grid gap-1">
            {recentlyCreated.map(p => (
              <li key={p._id} className="flex items-center gap-1.5">
                <FiCheck className="text-green-600" size={13} /> {p.name} {p.isCombo && <span className="text-xs text-indigo-500 font-semibold">(combo)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function StoreInventoryTab({ stores }) {
  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState([]);       // master Express catalogue
  const [storeProducts, setStoreProducts] = useState([]); // this store's stock/availability rows
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [addDrafts, setAddDrafts] = useState({});       // productId -> { qty, note }
  const [addingId, setAddingId] = useState(null);
  const [priceDrafts, setPriceDrafts] = useState({});    // productId -> typed selling price
  const [savingPriceId, setSavingPriceId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null); // click-to-confirm, no native dialog
  const [logs, setLogs] = useState([]);
  const [logsOpen, setLogsOpen] = useState(false);

  // Bluetooth thermal printer — same shared connection/pairing used by
  // Koyambedu Daily's Printer tab (see utils/thermalPrinter.js). Connect
  // once here before a shift/session; the Store Manager and POS terminal
  // reuse the same paired printer to print receipts and this same PLU
  // code-reference sheet without reconnecting.
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [printingList, setPrintingList] = useState(false);

  const togglePrinterConnection = async () => {
    if (printerConnected) { disconnectPrinter(); setPrinterConnected(false); return; }
    if (!isBluetoothSupported()) return toast.error('Web Bluetooth is not supported in this browser — use Chrome/Edge on Android, Windows, macOS or ChromeOS.');
    setConnectingPrinter(true);
    try {
      const { name } = await connectPrinter();
      setPrinterConnected(true);
      toast.success(`Connected to ${name}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to connect to printer');
    } finally {
      setConnectingPrinter(false);
    }
  };

  const printCodeList = async () => {
    if (!storeId) return toast.error('Select a store first');
    setPrintingList(true);
    try {
      const { data } = await api.get(`/express/admin/stores/${storeId}/products/print-list`);
      const storeName = stores.find(s => s._id === storeId)?.name;
      await printPluList(data.products || [], storeName);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to print code list');
    } finally {
      setPrintingList(false);
    }
  };

  // Combined "pick a Koyambedu product → assign to this store with stock +
  // price" flow — one screen instead of Products-tab-link then
  // Inventory-tab-stock. If the product isn't linked into Express yet, this
  // links it too (auto-assigning its PLU code) in the same submit.
  const [showAssign, setShowAssign] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignResults, setAssignResults] = useState([]);
  const [assignSearching, setAssignSearching] = useState(false);
  const [assignSelected, setAssignSelected] = useState(null); // chosen Koyambedu product
  const [assignForm, setAssignForm] = useState({ unit: 'kg', procurementBaseCost: '', customMarginPct: '', stockQty: '', priceOverride: '', note: '' });
  const [assignSaving, setAssignSaving] = useState(false);

  const assignAlreadyLinked = assignSelected && products.some(p => String(p.koyambeduProduct?._id) === String(assignSelected._id));

  useEffect(() => {
    if (!showAssign) return;
    const t = setTimeout(() => {
      setAssignSearching(true);
      api.get(`/express/admin/koyambedu-catalog?search=${encodeURIComponent(assignSearch)}`)
        .then(r => setAssignResults(r.data.products || []))
        .catch(() => setAssignResults([]))
        .finally(() => setAssignSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [assignSearch, showAssign]);

  const pickAssignProduct = (kb) => {
    setAssignSelected(kb);
    setAssignForm(f => ({ ...f, unit: kb.unit || 'kg' }));
    setAssignResults([]);
    setAssignSearch(kb.name);
  };

  const resetAssignForm = () => {
    setShowAssign(false); setAssignSelected(null); setAssignSearch('');
    setAssignForm({ unit: 'kg', procurementBaseCost: '', customMarginPct: '', stockQty: '', priceOverride: '', note: '' });
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!storeId) return toast.error('Select a store first');
    if (!assignSelected) return toast.error('Search and select a Koyambedu Daily product first');
    if (!assignAlreadyLinked && !assignForm.procurementBaseCost) {
      return toast.error('Procurement cost is required to link this product into Express for the first time');
    }
    setAssignSaving(true);
    try {
      const payload = {
        storeId,
        koyambeduProductId: assignSelected._id,
        unit: assignForm.unit,
        procurementBaseCost: assignForm.procurementBaseCost || undefined,
        customMarginPct: assignForm.customMarginPct || null,
        stockQty: assignForm.stockQty || 0,
        note: assignForm.note || undefined,
      };
      if (assignForm.priceOverride !== '') payload.priceOverride = assignForm.priceOverride;
      const { data } = await api.post('/express/admin/products/assign-to-store', payload);
      toast.success(`${data.product.koyambeduProduct?.name || 'Product'} assigned to store`);
      resetAssignForm();
      api.get('/express/admin/products').then(r => setProducts(r.data.products || [])).catch(() => {});
      loadStoreProducts();
      if (logsOpen) loadLogs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign product to store');
    } finally {
      setAssignSaving(false);
    }
  };

  useEffect(() => {
    if (!confirmRemoveId) return;
    const t = setTimeout(() => setConfirmRemoveId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmRemoveId]);

  useEffect(() => {
    api.get('/express/admin/products').then(r => setProducts(r.data.products || [])).catch(() => {});
  }, []);

  const loadStoreProducts = () => {
    if (!storeId) { setStoreProducts([]); return; }
    setLoading(true);
    api.get(`/express/admin/stores/${storeId}/products`)
      .then(r => setStoreProducts(r.data.storeProducts || []))
      .catch(() => toast.error('Failed to load store inventory'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadStoreProducts(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = () => {
    if (!storeId) { setLogs([]); return; }
    api.get(`/express/admin/stock-logs?storeId=${storeId}`).then(r => setLogs(r.data.logs || [])).catch(() => {});
  };
  useEffect(() => { if (logsOpen) loadLogs(); }, [logsOpen, storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge the master catalogue with this store's existing stock rows, so
  // every linked product shows up even if the store has never stocked it yet.
  const rows = products
    .filter(p => !search.trim() || (p.koyambeduProduct?.name || '').toLowerCase().includes(search.trim().toLowerCase()))
    .map(p => {
      const existing = storeProducts.find(sp => String(sp.product?._id) === String(p._id));
      return {
        product: p,
        storeProductId: existing?._id || null,
        stockQty: existing?.stockQty ?? 0,
        isAvailable: existing?.isAvailable ?? false,
        priceOverride: existing?.priceOverride ?? null,
        autoPrice: existing?.autoPrice ?? null,
        addQty: addDrafts[p._id]?.qty ?? '',
      };
    });

  // Manually set (or clear, with an empty value) the selling price for one
  // product at this store — rounds off whatever the margin engine computed.
  const savePrice = async (productId) => {
    const draft = priceDrafts[productId];
    if (draft === undefined) return; // nothing typed, nothing to save
    if (draft !== '' && (!Number.isFinite(Number(draft)) || Number(draft) < 0)) {
      return toast.error('Enter a valid selling price');
    }
    setSavingPriceId(productId);
    try {
      const { data } = await api.post(`/express/admin/stores/${storeId}/products`, {
        productId, priceOverride: draft === '' ? '' : Number(draft),
      });
      setStoreProducts(sp => {
        const others = sp.filter(x => String(x.product?._id) !== String(productId));
        const row = rows.find(r => r.product._id === productId);
        return [...others, { ...data.storeProduct, product: row?.product, autoPrice: row?.autoPrice }];
      });
      setPriceDrafts(d => { const n = { ...d }; delete n[productId]; return n; });
      toast.success(draft === '' ? 'Reverted to automatic pricing' : 'Selling price updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update selling price');
    } finally { setSavingPriceId(null); }
  };

  const setAddQty = (productId, qty) => setAddDrafts(d => ({ ...d, [productId]: { ...d[productId], qty } }));

  const addStock = async (productId) => {
    const row = rows.find(r => r.product._id === productId);
    const qty = Number(row?.addQty);
    if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a quantity greater than 0 to add');
    setAddingId(productId);
    try {
      const { data } = await api.post(`/express/admin/stores/${storeId}/products/${productId}/add-stock`, { qty });
      setStoreProducts(sp => {
        const others = sp.filter(x => String(x.product?._id) !== String(productId));
        return [...others, { ...data.storeProduct, product: row.product }];
      });
      setAddDrafts(d => ({ ...d, [productId]: { qty: '' } }));
      toast.success(`Added ${qty} ${row.product.unit} — new total ${data.storeProduct.stockQty}`);
      if (logsOpen) loadLogs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add stock');
    } finally {
      setAddingId(null);
    }
  };

  const toggleAvailability = async (productId, current) => {
    setTogglingId(productId);
    try {
      const { data } = await api.post(`/express/admin/stores/${storeId}/products`, { productId, isAvailable: !current });
      setStoreProducts(sp => {
        const others = sp.filter(x => String(x.product?._id) !== String(productId));
        return [...others, data.storeProduct];
      });
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (productId) => {
    const row = rows.find(r => r.product._id === productId);
    if (!row?.storeProductId) return;
    if (confirmRemoveId !== productId) { setConfirmRemoveId(productId); return; }
    setConfirmRemoveId(null);
    setRemovingId(productId);
    try {
      await api.delete(`/express/admin/stores/${storeId}/products/${productId}`);
      setStoreProducts(sp => sp.filter(x => String(x.product?._id) !== String(productId)));
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
        "Add Stock" adds to whatever the store already has — each delivery accumulates onto the existing quantity.
        "Available/Hidden" toggles visibility to customers &amp; POS without touching stock. "Remove" deletes the
        store-product record entirely. "Save Price" lets you manually round off the selling price for this store —
        leave it blank and save to go back to the auto-computed price shown next to the stock count.
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
        {storeId && (
          <button onClick={() => setLogsOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold hover:bg-gray-50 shrink-0">
            <FiFileText size={14} /> {logsOpen ? 'Hide' : 'View'} Stock Report
          </button>
        )}
        {storeId && (
          <button onClick={() => setShowAssign(s => !s)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shrink-0">
            <FiPlus size={14} /> Assign Koyambedu Product
          </button>
        )}
        <button onClick={togglePrinterConnection} disabled={connectingPrinter}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold shrink-0 disabled:opacity-50 ${printerConnected ? 'bg-green-50 text-green-700 border-green-200' : 'hover:bg-gray-50'}`}>
          <FiBluetooth size={14} /> {connectingPrinter ? 'Connecting…' : printerConnected ? 'Printer Connected' : 'Connect Printer'}
        </button>
        {storeId && (
          <button onClick={printCodeList} disabled={printingList} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold hover:bg-gray-50 shrink-0 disabled:opacity-50">
            <FiPrinter size={14} /> {printingList ? 'Printing…' : 'Print Code List'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3 -mt-2">
        Connect a Bluetooth thermal printer once before starting your shift, then print a code-reference sheet (PLU codes, names, prices) for the counter — the POS terminal can print its own copy too.
      </p>

      {storeId && showAssign && (
        <form onSubmit={submitAssign} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-xs text-gray-400 -mt-1">
            Pick a Koyambedu Daily product, set its stock and (optionally) a price just for this store — in one step.
            If it isn&#39;t linked into Express yet, it will be linked automatically with a PLU code.
          </p>
          <div className="sm:col-span-2 relative">
            <input placeholder="Search Koyambedu Daily products…" value={assignSearch}
              onChange={e => { setAssignSearch(e.target.value); setAssignSelected(null); }}
              className="border rounded-lg px-3 py-2 text-sm w-full" />
            {assignSearching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
            {assignResults.length > 0 && !assignSelected && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {assignResults.map(kb => (
                  <button type="button" key={kb._id} onClick={() => pickAssignProduct(kb)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm">
                    {kb.images?.[0]?.url && <img src={kb.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
                    <span>{kb.name} <span className="text-xs text-gray-400">({kb.unit})</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {assignSelected && (
            <div className="sm:col-span-2 flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
              {assignSelected.images?.[0]?.url && <img src={assignSelected.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
              <span className="text-sm font-semibold text-indigo-900">{assignSelected.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-200 text-indigo-800">
                {assignAlreadyLinked ? 'Already in Express' : 'Will be linked now'}
              </span>
            </div>
          )}
          {!assignAlreadyLinked && (
            <>
              <select value={assignForm.unit} onChange={e => setAssignForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['kg', 'gram', 'piece', 'bunch', 'litre', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input placeholder="Procurement cost (₹/kg or ₹/unit)" value={assignForm.procurementBaseCost}
                onChange={e => setAssignForm(f => ({ ...f, procurementBaseCost: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Custom margin % (optional)" value={assignForm.customMarginPct}
                onChange={e => setAssignForm(f => ({ ...f, customMarginPct: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            </>
          )}
          <input type="number" min="0" placeholder="Stock to add at this store" value={assignForm.stockQty}
            onChange={e => setAssignForm(f => ({ ...f, stockQty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" min="0" placeholder="Price override for this store (optional)" value={assignForm.priceOverride}
            onChange={e => setAssignForm(f => ({ ...f, priceOverride: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Note (optional, e.g. delivery ref)" value={assignForm.note}
            onChange={e => setAssignForm(f => ({ ...f, note: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={assignSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {assignSaving ? 'Assigning…' : 'Assign to Store'}
            </button>
            <button type="button" onClick={resetAssignForm} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      {!storeId && <p className="text-sm text-gray-400">Choose a store above to view and set its stock levels.</p>}
      {storeId && loading && <p className="text-sm text-gray-400">Loading inventory…</p>}

      {storeId && logsOpen && (
        <div className="bg-white border rounded-xl divide-y mb-4 max-h-64 overflow-y-auto">
          {logs.map(l => (
            <div key={l._id} className="flex items-center justify-between px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-gray-700 truncate">
                  {l.product?.koyambeduProduct?.name || l.product?.name || 'Product'} —{' '}
                  <span className={l.type === 'addition' ? 'text-green-600' : 'text-red-600'}>
                    {l.type === 'addition' ? '+' : '−'}{l.qty}
                  </span> ({l.previousQty} → {l.newQty})
                </p>
                <p className="text-gray-400">{l.actorType === 'admin' ? 'Admin' : 'Store Manager'}: {l.actorName}{l.reason ? ` — ${l.reason}` : ''}</p>
              </div>
              <span className="text-gray-400 shrink-0 ml-2">{new Date(l.createdAt).toLocaleString('en-IN')}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-gray-400 px-3 py-3">No stock movements recorded yet for this store.</p>}
        </div>
      )}

      {storeId && !loading && (
        <div className="grid gap-2">
          {rows.map(row => (
            <div key={row.product._id} className="bg-white border rounded-xl p-3 flex flex-wrap items-center gap-3">
              {(row.product.koyambeduProduct?.images?.[0]?.url || row.product.image) && (
                <img src={row.product.koyambeduProduct?.images?.[0]?.url || row.product.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-800 text-sm truncate flex items-center gap-1.5">
                  {row.product.koyambeduProduct?.name || row.product.name || '(unnamed product)'}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${row.product.plu != null ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                    PLU {row.product.plu != null ? row.product.plu : '—'}
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  Current stock: <span className="font-bold text-gray-600">{row.stockQty}</span> {row.product.unit}
                  {row.autoPrice != null && <span className="ml-2">Auto price: ₹{row.autoPrice}</span>}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 shrink-0">₹</span>
                <input type="number" min="0" step="0.01"
                  placeholder={row.priceOverride != null ? String(row.priceOverride) : 'Selling price'}
                  value={priceDrafts[row.product._id] ?? (row.priceOverride != null ? String(row.priceOverride) : '')}
                  onChange={e => setPriceDrafts(d => ({ ...d, [row.product._id]: e.target.value }))}
                  className="w-24 border rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={() => savePrice(row.product._id)} disabled={savingPriceId === row.product._id}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold disabled:opacity-40">
                  {savingPriceId === row.product._id ? 'Saving…' : 'Save Price'}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input type="number" min="0" placeholder="+ qty" value={row.addQty}
                  onChange={e => setAddQty(row.product._id, e.target.value)}
                  className="w-20 border rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={() => addStock(row.product._id)} disabled={addingId === row.product._id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">
                  <FiPlus size={12} /> {addingId === row.product._id ? 'Adding…' : 'Add Stock'}
                </button>
              </div>

              <button onClick={() => toggleAvailability(row.product._id, row.isAvailable)} disabled={togglingId === row.product._id}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 ${row.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {row.isAvailable ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                {row.isAvailable ? 'Available' : 'Hidden'}
              </button>

              {row.storeProductId && (
                <button onClick={() => remove(row.product._id)} disabled={removingId === row.product._id}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${confirmRemoveId === row.product._id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>
                  <FiTrash2 size={12} /> {removingId === row.product._id ? 'Removing…' : confirmRemoveId === row.product._id ? 'Confirm?' : 'Remove'}
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
// EXPENSES TAB — admin-entered misc costs (rent, salary, utilities, etc.)
// ══════════════════════════════════════════════
function ExpensesTab({ stores }) {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ storeId: '', category: 'other', amount: '', note: '', date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/express/admin/expenses').then(r => setExpenses(r.data.expenses || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount) return toast.error('Amount is required');
    setSaving(true);
    try {
      await api.post('/express/admin/expenses', form);
      toast.success('Expense recorded');
      setForm({ storeId: '', category: 'other', amount: '', note: '', date: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // click-to-confirm, no native dialog
  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  const remove = async (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    try {
      await api.delete(`/express/admin/expenses/${id}`);
      load();
    } catch { toast.error('Failed to delete expense'); }
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <h2 className="font-bold text-gray-700 mb-3">Other Expenses</h2>

      <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Company-wide (no specific store)</option>
          {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
          {['rent', 'salary', 'utilities', 'maintenance', 'packaging', 'fuel', 'marketing', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="number" min="0" placeholder="Amount (₹)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
        <button type="submit" disabled={saving} className="sm:col-span-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Record Expense'}
        </button>
      </form>

      <p className="text-xs text-gray-400 mb-2">Total recorded: <span className="font-bold text-gray-700">₹{total}</span></p>

      <div className="grid gap-2">
        {expenses.map(e => (
          <div key={e._id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-sm">₹{e.amount} <span className="text-xs font-normal text-gray-400">· {e.category}{e.store ? ` · ${e.store.name}` : ' · company-wide'}</span></p>
              <p className="text-xs text-gray-400 truncate">{e.note || '—'} · {new Date(e.date).toLocaleDateString('en-IN')} · by {e.enteredByName}</p>
            </div>
            <button onClick={() => remove(e._id)}
              className={`shrink-0 rounded-lg ${confirmDeleteId === e._id ? 'px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold flex items-center gap-1' : 'p-1.5 hover:bg-red-50 text-red-500'}`}>
              <FiTrash2 size={14} /> {confirmDeleteId === e._id ? 'Confirm?' : ''}
            </button>
          </div>
        ))}
        {expenses.length === 0 && <p className="text-sm text-gray-400">No expenses recorded yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// CARTS TAB — customers currently holding items in their Express cart
// ══════════════════════════════════════════════
function CartsTab() {
  const [carts, setCarts] = useState([]);
  const [search, setSearch] = useState('');

  const load = (q) => api.get(`/express/admin/carts${q ? `?search=${encodeURIComponent(q)}` : ''}`).then(r => setCarts(r.data.carts || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-bold text-gray-700">Customer Carts</h2>
        <input placeholder="Search name, phone or email…" value={search} onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm w-56" />
      </div>
      <div className="grid gap-3">
        {carts.map(c => (
          <div key={c._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-gray-800">{c.customerName}</p>
                <p className="text-xs text-gray-500">{c.phone} · {c.email} · {c.store}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-indigo-700">₹{c.cartValue}</p>
                <p className="text-xs text-gray-400">{c.itemCount} item(s)</p>
              </div>
            </div>
            <ul className="text-xs text-gray-600 list-disc pl-4">
              {c.items.map((it, i) => <li key={i}>{it.name} — {it.quantity} {it.unit} @ ₹{it.price}</li>)}
            </ul>
          </div>
        ))}
        {carts.length === 0 && <p className="text-sm text-gray-400">No customers currently have items in their Express cart.</p>}
      </div>
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
        freeDeliveryRadiusKm: config.freeDeliveryRadiusKm,
        minOrderForFreeDelivery: config.minOrderForFreeDelivery,
        deliveryFeeBelowMinimum: config.deliveryFeeBelowMinimum,
        customOrderPhone: config.customOrderPhone,
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
        <h2 className="font-bold text-gray-700 mb-1">Delivery Fee Rules</h2>
        <p className="text-xs text-gray-500 mb-3">
          Within the free radius, delivery is always free. Beyond it, delivery stays free if the order
          meets the minimum — otherwise the flat fee below is charged. Beyond Max Delivery Distance
          (set above), customers are offered the &ldquo;call for custom order&rdquo; option instead of checkout.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-gray-500">Free Delivery Radius (km)
            <input type="number" value={config.freeDeliveryRadiusKm} onChange={e => setConfig(c => ({ ...c, freeDeliveryRadiusKm: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Minimum Order for Free Delivery (₹)
            <input type="number" value={config.minOrderForFreeDelivery} onChange={e => setConfig(c => ({ ...c, minOrderForFreeDelivery: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Delivery Fee Below Minimum (₹)
            <input type="number" value={config.deliveryFeeBelowMinimum} onChange={e => setConfig(c => ({ ...c, deliveryFeeBelowMinimum: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500 sm:col-span-3">Custom Order Phone (shown to customers beyond Max Delivery Distance)
            <input type="text" placeholder="e.g. +91 98765 43210" value={config.customOrderPhone || ''} onChange={e => setConfig(c => ({ ...c, customOrderPhone: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
        </div>
        <button onClick={save} disabled={saving} className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Delivery Rules'}
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
