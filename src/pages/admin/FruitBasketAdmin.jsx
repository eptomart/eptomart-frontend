// ============================================
// FRUIT BASKETS & HAMPERS — Super Admin management
// Three tabs: Baskets (catalog CRUD), Settings (feature toggle + same-day
// cutoff + delivery slots + distance-tiered delivery pricing), Orders.
// Only reachable by Super Admin (see AdminLayout.jsx nav gating + the
// backend's protectSuperAdmin middleware on every /fruitbaskets/admin/*
// route — this page has no elevated access beyond what the API enforces).
// ============================================
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiGift, FiPlus, FiEdit2, FiTrash2, FiToggleLeft, FiToggleRight,
  FiSave, FiPackage, FiClock, FiTruck, FiX, FiZap,
  FiGrid, FiShoppingCart, FiEye, FiSearch,
} from 'react-icons/fi';
import api from '../../utils/api';
import { FB_THEME } from '../../utils/fruitBasketTheme';

const TABS = [
  { key: 'dashboard', label: 'Dashboard', Icon: FiGrid },
  { key: 'baskets',   label: 'Baskets',   Icon: FiGift },
  { key: 'settings',  label: 'Settings',  Icon: FiClock },
  { key: 'orders',    label: 'Orders',    Icon: FiPackage },
  { key: 'carts',     label: 'Carts',     Icon: FiShoppingCart },
];

export default function FruitBasketAdmin() {
  const [tab, setTab] = useState('dashboard');

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-black flex items-center gap-2 mb-1" style={{ color: FB_THEME.purple900 }}>
        <FiGift style={{ color: FB_THEME.goldDark }} /> Fruit Baskets & Hampers
      </h1>
      <p className="text-sm text-gray-500 mb-4">Manage the basket catalog, delivery settings, and orders for this vertical.</p>

      <div className="flex gap-1 rounded-xl p-1 mb-5 w-fit" style={{ background: FB_THEME.purple50 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            style={tab === t.key ? { background: '#fff', color: FB_THEME.purple700, boxShadow: '0 1px 4px rgba(76,29,149,0.15)' } : { color: '#6b7280' }}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard' && <DashboardTab />}
      {tab === 'baskets'   && <BasketsTab />}
      {tab === 'settings'  && <SettingsTab />}
      {tab === 'orders'    && <OrdersTab />}
      {tab === 'carts'     && <CartsTab />}
    </div>
  );
}

// ══════════════════════════════════════════════
// DASHBOARD TAB
// Same stat-card pattern as KoyambeduAdmin's Dashboard tab, plus visitor
// and in-progress-cart counts (reusing the existing site-wide Analytics
// tracking + the FruitBasketCart collection — no new tracking added).
// ══════════════════════════════════════════════
function DashboardTab() {
  const [stats, setStats]     = useState(null);
  const [visitors, setVisitors] = useState(null);

  const load = () => {
    api.get('/fruitbaskets/admin/dashboard').then(r => setStats(r.data.stats)).catch(() => toast.error('Failed to load dashboard'));
    api.get('/fruitbaskets/admin/visitors?limit=10').then(r => setVisitors(r.data.visits || [])).catch(() => setVisitors([]));
  };
  useEffect(() => { load(); }, []);

  if (!stats) return <p className="text-sm text-gray-400">Loading…</p>;

  const cards = [
    ['Today Orders',    stats.todayOrders,     FB_THEME.purple700],
    ['Pending',         stats.pendingOrders,   '#b45309'],
    ['Delivered Today', stats.deliveredToday,  '#15803d'],
    ['Today Revenue',   `₹${stats.todayRevenue}`, FB_THEME.purple700],
    ['Active Baskets',  stats.activeBaskets,   FB_THEME.purple700],
    ['Carts With Items', stats.cartsWithItems, '#b45309'],
    ['Page Visits',     stats.totalVisits,     '#0369a1'],
    ['Unique Visitors', stats.uniqueVisitors,  '#0369a1'],
    ['Logged-in Visitors', stats.loggedInVisitors, '#0369a1'],
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(([label, value, color]) => (
          <div key={label} className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-black mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Recent visitors — same underlying Analytics data as the site-wide
          Visitors admin page, filtered to Fruit Basket pages. */}
      <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
        <p className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5"><FiEye size={14} /> Recent Visitors</p>
        {visitors === null ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : visitors.length === 0 ? (
          <p className="text-sm text-gray-400">No visits recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {visitors.map(v => (
              <div key={v._id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-700 truncate">{v.user ? `${v.user.name} (${v.user.phone || v.user.email || 'logged in'})` : 'Guest visitor'}</p>
                  <p className="text-gray-400 mt-0.5">{v.page} {v.city ? `· ${v.city}` : ''} {v.device ? `· ${v.device}` : ''}</p>
                </div>
                <span className="text-gray-400 whitespace-nowrap ml-2">{new Date(v.timestamp).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// CARTS TAB — customers with baskets in cart, order not yet placed
// (same pattern as KoyambeduAdmin's "Users Cart" tab)
// ══════════════════════════════════════════════
function CartsTab() {
  const [carts, setCarts]   = useState(null);
  const [search, setSearch] = useState('');

  const load = () => {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get(`/fruitbaskets/admin/carts${params}`).then(r => setCarts(r.data.carts || [])).catch(() => toast.error('Failed to load carts'));
  };
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl p-3" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
        <div className="flex gap-2">
          <input
            type="text" value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load()}
            placeholder="Search by customer name / phone / email…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button onClick={load} className="flex items-center gap-1.5 text-white text-xs font-bold px-3.5 py-2 rounded-lg"
            style={{ background: FB_THEME.gradientButton }}>
            <FiSearch size={13} /> Search
          </button>
        </div>
      </div>

      {carts === null ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : (
        <>
          <p className="text-xs text-gray-400 px-1">{carts.length} customer{carts.length !== 1 ? 's' : ''} with baskets in cart</p>
          {carts.map(c => (
            <div key={c._id} className="bg-white rounded-xl p-3" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{c.customerName}</p>
                  <p className="text-xs text-gray-500">📞 {c.phone} {c.email && c.email !== '—' ? `· ✉️ ${c.email}` : ''}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Updated {new Date(c.updatedAt).toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-sm" style={{ color: FB_THEME.purple700 }}>₹{c.cartValue?.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400">{c.itemCount} item{c.itemCount !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-2 space-y-1">
                {c.items.map((it, ii) => (
                  <div key={ii} className="flex justify-between text-xs">
                    <span className="text-gray-700">{it.name} {it.occasion ? `(${it.occasion})` : ''} × {it.quantity}</span>
                    <span className="text-gray-500">₹{((it.price || 0) * (it.quantity || 0)).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {carts.length === 0 && (
            <p className="text-center text-gray-400 py-8">No customers currently have baskets in their cart</p>
          )}
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// BASKETS TAB
// ══════════════════════════════════════════════
function BasketsTab() {
  const [products, setProducts] = useState(null);
  const [editing, setEditing]   = useState(null); // product being edited, or {} for new

  const load = () => api.get('/fruitbaskets/admin/products').then(r => setProducts(r.data.products || [])).catch(() => toast.error('Failed to load baskets'));
  useEffect(() => { load(); }, []);

  const toggleField = async (p, field) => {
    try {
      await api.put(`/fruitbaskets/admin/products/${p._id}`, { [field]: !p[field] });
      load();
    } catch { toast.error('Update failed'); }
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try { await api.delete(`/fruitbaskets/admin/products/${p._id}`); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div>
      <button onClick={() => setEditing({})} className="mb-4 flex items-center gap-1.5 text-white text-sm font-bold px-3.5 py-2 rounded-lg"
        style={{ background: FB_THEME.gradientButton }}>
        <FiPlus size={14} /> New Basket
      </button>

      {products === null ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-gray-400">No baskets yet — create one above.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(p => (
            <div key={p._id} className="bg-white rounded-xl p-3" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
              <div className="flex gap-3">
                <div className="w-16 h-16 rounded-lg bg-gray-50 flex-shrink-0 overflow-hidden">
                  {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">₹{p.price} · {p.occasion}</p>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => toggleField(p, 'isActive')} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: p.isActive ? FB_THEME.purple600 : '#9ca3af' }}>
                      {p.isActive ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {p.isActive ? 'Active' : 'Hidden'}
                    </button>
                    <button onClick={() => toggleField(p, 'isAvailable')} className="text-[11px] font-semibold flex items-center gap-1" style={{ color: p.isAvailable ? FB_THEME.purple600 : '#dc2626' }}>
                      {p.isAvailable ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {p.isAvailable ? 'In Stock' : 'Out of Stock'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-2.5">
                <button onClick={() => setEditing(p)} className="flex-1 flex items-center justify-center gap-1 text-xs font-bold bg-gray-50 text-gray-600 rounded-lg py-1.5">
                  <FiEdit2 size={11} /> Edit
                </button>
                <button onClick={() => remove(p)} className="flex-1 flex items-center justify-center gap-1 text-xs font-bold bg-red-50 text-red-600 rounded-lg py-1.5">
                  <FiTrash2 size={11} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && <BasketEditorModal product={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}

function BasketEditorModal({ product, onClose, onSaved }) {
  const isNew = !product._id;
  const [form, setForm] = useState({
    name: product.name || '', description: product.description || '',
    price: product.price ?? '', compareAtPrice: product.compareAtPrice ?? '',
    occasion: product.occasion || 'general', weightKg: product.weightKg ?? '',
    stock: product.stock ?? '', images: product.images || [],
    contents: product.contents || [],
  });
  // Short note is only used to prompt the AI description generator below —
  // it's never saved to the product itself.
  const [shortNote, setShortNote] = useState('');
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);

  const generateDescription = async () => {
    if (!form.name && !shortNote) { toast.error('Enter a basket name or a short note first'); return; }
    setGeneratingDesc(true);
    try {
      const { data } = await api.post('/fruitbaskets/admin/generate-description', {
        name: form.name, shortNote, occasion: form.occasion, contents: form.contents,
      });
      if (data.success) setForm(f => ({ ...f, description: data.description }));
      else toast.error(data.message || 'Could not generate description');
    } catch (err) { toast.error(err?.response?.data?.message || 'Could not generate description'); }
    finally { setGeneratingDesc(false); }
  };

  const uploadImage = async (file) => {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append('image', file);
      const { data } = await api.post('/fruitbaskets/admin/upload-image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.success) setForm(f => ({ ...f, images: [...f.images, data.url] }));
    } catch { toast.error('Image upload failed'); }
    finally { setUploading(false); }
  };

  const addContentLine = () => setForm(f => ({ ...f, contents: [...f.contents, { item: '', qty: '' }] }));
  const updateContentLine = (i, key, val) => setForm(f => {
    const contents = [...f.contents]; contents[i] = { ...contents[i], [key]: val }; return { ...f, contents };
  });
  const removeContentLine = (i) => setForm(f => ({ ...f, contents: f.contents.filter((_, idx) => idx !== i) }));

  const save = async () => {
    if (!form.name || !form.price) { toast.error('Name and price are required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice === '' ? null : Number(form.compareAtPrice),
        weightKg: form.weightKg === '' ? null : Number(form.weightKg),
        stock: form.stock === '' ? null : Number(form.stock),
      };
      if (isNew) await api.post('/fruitbaskets/admin/products', payload);
      else await api.put(`/fruitbaskets/admin/products/${product._id}`, payload);
      toast.success(isNew ? 'Basket created' : 'Basket updated');
      onSaved();
    } catch (err) { toast.error(err?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-gray-800">{isNew ? 'New Basket' : 'Edit Basket'}</h3>
          <button onClick={onClose}><FiX size={18} /></button>
        </div>

        <div className="space-y-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Basket name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />

          {/* Short note → AI expands this (+ name/occasion/contents) into a full description */}
          <div className="flex gap-2">
            <input value={shortNote} onChange={e => setShortNote(e.target.value)}
              placeholder="Short note for AI, e.g. 'premium mixed fruits with red roses, for anniversaries'"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <button type="button" onClick={generateDescription} disabled={generatingDesc}
              className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold text-white px-3 py-2 rounded-lg disabled:opacity-50 whitespace-nowrap"
              style={{ background: FB_THEME.gradientGold, color: FB_THEME.purple900 }}>
              <FiZap size={13} /> {generatingDesc ? 'Writing…' : 'Generate with AI'}
            </button>
          </div>

          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description (or generate it above)" rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" />
          <div className="grid grid-cols-2 gap-2">
            <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="Price (₹)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
            <input type="number" value={form.compareAtPrice} onChange={e => setForm({ ...form, compareAtPrice: e.target.value })} placeholder="MRP (optional)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.occasion} onChange={e => setForm({ ...form, occasion: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
              {/* 'general' shows this basket under EVERY occasion tab on the shop
                  page, not just the "All Occasions" tab — see fruitBasketController's
                  getProducts occasion filter. */}
              <option value="general">general (shows in all occasions)</option>
              {['birthday', 'anniversary', 'get-well', 'festival', 'congratulations', 'condolence'].map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} placeholder="Stock (blank = unlimited)"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>

          {/* Images */}
          <div>
            <p className="text-xs font-bold text-gray-500 mb-1.5">Images</p>
            <div className="flex flex-wrap gap-2">
              {form.images.map((img, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setForm(f => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                    className="absolute top-0 right-0 bg-black/60 text-white w-4 h-4 flex items-center justify-center text-[10px]">×</button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer text-gray-400 text-xs">
                {uploading ? '…' : '+'}
                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && uploadImage(e.target.files[0])} />
              </label>
            </div>
          </div>

          {/* Contents */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs font-bold text-gray-500">What's Inside</p>
              <button onClick={addContentLine} className="text-xs font-bold" style={{ color: FB_THEME.purple600 }}>+ Add item</button>
            </div>
            {form.contents.map((c, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input value={c.item} onChange={e => updateContentLine(i, 'item', e.target.value)} placeholder="Item (e.g. Apple)"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                <input value={c.qty} onChange={e => updateContentLine(i, 'qty', e.target.value)} placeholder="Qty (e.g. 4 pcs)"
                  className="w-24 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
                <button onClick={() => removeContentLine(i)} className="text-red-400"><FiX size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="mt-4 w-full text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          style={{ background: FB_THEME.gradientButton }}>
          <FiSave size={14} /> {saving ? 'Saving…' : 'Save Basket'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// SETTINGS TAB
// ══════════════════════════════════════════════
function SettingsTab() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving]     = useState(false);

  const load = () => api.get('/fruitbaskets/admin/settings').then(r => setSettings(r.data.settings)).catch(() => toast.error('Failed to load settings'));
  useEffect(() => { load(); }, []);

  if (!settings) return <p className="text-sm text-gray-400">Loading…</p>;

  const toggleFeature = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch('/fruitbaskets/admin/settings/feature', { enabled: !settings.featureEnabled });
      setSettings(data.settings);
      toast.success(data.settings.featureEnabled ? 'Fruit Baskets is now LIVE' : 'Fruit Baskets turned OFF');
    } catch { toast.error('Failed to update'); }
    finally { setSaving(false); }
  };

  const saveSameDayDelivery = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/fruitbaskets/admin/settings/same-day-delivery', {
        enabled: settings.sameDayDelivery.enabled, cutoffTime: settings.sameDayDelivery.cutoffTime,
      });
      setSettings(s => ({ ...s, sameDayDelivery: data.sameDayDelivery }));
      toast.success('Same-day delivery settings saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const saveSlots = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/fruitbaskets/admin/settings/delivery-slots', { slots: settings.deliverySlots });
      setSettings(s => ({ ...s, deliverySlots: data.deliverySlots }));
      toast.success('Delivery slots saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const saveDeliveryCharges = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/fruitbaskets/admin/settings/delivery-charges', settings.delivery);
      setSettings(s => ({ ...s, delivery: data.delivery }));
      toast.success('Delivery pricing saved');
    } catch { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const updateSlot = (i, field, val) => setSettings(s => {
    const slots = [...s.deliverySlots]; slots[i] = { ...slots[i], [field]: val }; return { ...s, deliverySlots: slots };
  });
  const addSlot = () => setSettings(s => ({ ...s, deliverySlots: [...s.deliverySlots, { key: `slot${Date.now()}`, label: '', startTime: '09:00', endTime: '12:00', enabled: true }] }));
  const removeSlot = (i) => setSettings(s => ({ ...s, deliverySlots: s.deliverySlots.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Master toggle */}
      <div className="bg-white rounded-xl p-4 flex items-center justify-between" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
        <div>
          <p className="font-bold text-gray-800 text-sm">Fruit Baskets & Hampers — Master Switch</p>
          <p className="text-xs text-gray-500 mt-0.5">When off, the shop/checkout pages and the Home page banner are hidden platform-wide.</p>
        </div>
        <button onClick={toggleFeature} disabled={saving} className="flex-shrink-0">
          {settings.featureEnabled
            ? <FiToggleRight size={34} style={{ color: FB_THEME.purple600 }} />
            : <FiToggleLeft size={34} className="text-gray-300" />}
        </button>
      </div>

      {/* Same-day cutoff */}
      <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
        <p className="font-bold text-gray-800 text-sm mb-3 flex items-center gap-1.5"><FiClock size={14} /> Same-Day Delivery Cutoff</p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={settings.sameDayDelivery.enabled}
              onChange={e => setSettings(s => ({ ...s, sameDayDelivery: { ...s.sameDayDelivery, enabled: e.target.checked } }))} />
            Enabled
          </label>
          <input type="time" value={settings.sameDayDelivery.cutoffTime}
            onChange={e => setSettings(s => ({ ...s, sameDayDelivery: { ...s.sameDayDelivery, cutoffTime: e.target.value } }))}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm" />
          <button onClick={saveSameDayDelivery} disabled={saving} className="ml-auto text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ background: FB_THEME.gradientButton }}>Save</button>
        </div>
      </div>

      {/* Delivery slots */}
      <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
        <div className="flex items-center justify-between mb-3">
          <p className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><FiTruck size={14} /> Delivery Slots</p>
          <button onClick={addSlot} className="text-xs font-bold" style={{ color: FB_THEME.purple600 }}>+ Add slot</button>
        </div>
        <div className="space-y-2">
          {settings.deliverySlots.map((s, i) => (
            <div key={s.key} className="flex items-center gap-2">
              <input type="checkbox" checked={s.enabled} onChange={e => updateSlot(i, 'enabled', e.target.checked)} />
              <input value={s.label} onChange={e => updateSlot(i, 'label', e.target.value)} placeholder="Label"
                className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs" />
              <input type="time" value={s.startTime} onChange={e => updateSlot(i, 'startTime', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
              <input type="time" value={s.endTime} onChange={e => updateSlot(i, 'endTime', e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs" />
              <button onClick={() => removeSlot(i)} className="text-red-400"><FiX size={15} /></button>
            </div>
          ))}
        </div>
        <button onClick={saveSlots} disabled={saving} className="mt-3 text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ background: FB_THEME.gradientButton }}>Save Slots</button>
      </div>

      {/* Delivery charges */}
      <div className="bg-white rounded-xl p-4" style={{ boxShadow: '0 1px 6px rgba(76,29,149,0.08)', border: `1px solid ${FB_THEME.purple100}` }}>
        <p className="font-bold text-gray-800 text-sm mb-1 flex items-center gap-1.5"><FiTruck size={14} /> Delivery Charges (distance-based)</p>
        <p className="text-xs text-gray-500 mb-3">Free delivery within the radius below; beyond that, a charge applies per extra block of distance.</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-gray-500 font-semibold">Free delivery radius (km)</label>
            <input type="number" value={settings.delivery.freeRadiusKm}
              onChange={e => setSettings(s => ({ ...s, delivery: { ...s.delivery, freeRadiusKm: e.target.value } }))}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 font-semibold">Charge block size (km)</label>
            <input type="number" value={settings.delivery.blockSizeKm}
              onChange={e => setSettings(s => ({ ...s, delivery: { ...s.delivery, blockSizeKm: e.target.value } }))}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 font-semibold">Charge per block (₹)</label>
            <input type="number" value={settings.delivery.chargePerBlock}
              onChange={e => setSettings(s => ({ ...s, delivery: { ...s.delivery, chargePerBlock: e.target.value } }))}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm mt-1" />
          </div>
          <div>
            <label className="text-[11px] text-gray-500 font-semibold">Max delivery distance (km)</label>
            <input type="number" value={settings.delivery.maxDeliveryKm}
              onChange={e => setSettings(s => ({ ...s, delivery: { ...s.delivery, maxDeliveryKm: e.target.value } }))}
              className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm mt-1" />
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Example: free for the first {settings.delivery.freeRadiusKm || 5} km, then ₹{settings.delivery.chargePerBlock || 40} for every additional {settings.delivery.blockSizeKm || 5} km.
        </p>
        <button onClick={saveDeliveryCharges} disabled={saving} className="mt-3 text-xs font-bold text-white px-3 py-1.5 rounded-lg" style={{ background: FB_THEME.gradientButton }}>Save Pricing</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ORDERS TAB
// ══════════════════════════════════════════════
function OrdersTab() {
  const [orders, setOrders] = useState(null);

  const load = () => api.get('/fruitbaskets/admin/orders').then(r => setOrders(r.data.orders || [])).catch(() => toast.error('Failed to load orders'));
  useEffect(() => { load(); }, []);

  const updateStatus = async (order, status) => {
    try { await api.patch(`/fruitbaskets/admin/orders/${order._id}/status`, { status }); load(); }
    catch { toast.error('Update failed'); }
  };

  if (orders === null) return <p className="text-sm text-gray-400">Loading…</p>;
  if (orders.length === 0) return <p className="text-sm text-gray-400">No orders yet.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400 uppercase border-b border-gray-100">
            <th className="py-2 pr-3">Order</th>
            <th className="py-2 pr-3">Customer</th>
            <th className="py-2 pr-3">Items</th>
            <th className="py-2 pr-3">Delivery</th>
            <th className="py-2 pr-3">Total</th>
            <th className="py-2 pr-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o._id} className="border-b border-gray-50">
              <td className="py-2 pr-3 font-bold">{o.orderId}</td>
              <td className="py-2 pr-3">{o.buyer?.name}<br /><span className="text-xs text-gray-400">{o.buyer?.phone}</span></td>
              <td className="py-2 pr-3 text-xs">{o.items?.map(it => `${it.name} ×${it.quantity}`).join(', ')}</td>
              <td className="py-2 pr-3 text-xs">{new Date(o.deliveryDate).toLocaleDateString('en-IN')}<br />{o.deliverySlot?.label}</td>
              <td className="py-2 pr-3 font-bold">₹{o.pricing?.total}</td>
              <td className="py-2 pr-3">
                <select value={o.orderStatus} onChange={e => updateStatus(o, e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-xs">
                  {['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
