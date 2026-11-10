// ============================================
// EPTOMART EXPRESS — Store Owner tabs
// Catalogue (inherit Koyambedu products / own products, price, stock,
// online visibility), POS staff, and the owner's own accounts. All calls go
// to /express/manager/owner/* which the backend hard-scopes to this
// owner's store.
// ============================================
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiPlus, FiSearch, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi';
import expressManagerApi from '../../../utils/expressManagerApi';
import { DeliverySlotsPanel, DeliveryFeePanel } from '../../../components/express/StoreDeliveryPanels';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const errMsg = (e, d) => e?.response?.data?.message || d;
const UNITS = ['kg', 'gram', 'piece', 'bunch', 'litre', 'dozen'];

// ── Headline revenue strip ───────────────────────────────────────────────
export function OwnerOverview() {
  const [o, setO] = useState(null);
  useEffect(() => { expressManagerApi.get('/owner/overview').then(({ data }) => setO(data.overview)).catch(() => {}); }, []);
  if (!o) return null;
  return (
    <div className="rounded-2xl p-4 mb-4 text-white" style={{ background: 'linear-gradient(135deg,#312e81,#4f46e5)' }}>
      <p className="text-[11px] font-bold tracking-widest uppercase text-indigo-200">Your store · sales</p>
      <div className="grid grid-cols-2 gap-3 mt-2">
        <div>
          <p className="text-3xl font-black leading-none">{inr(o.todayTotal)}</p>
          <p className="text-xs text-indigo-200 mt-1">today · online {inr(o.todayOnline)} · offline {inr(o.todayOffline)}</p>
        </div>
        <div>
          <p className="text-3xl font-black leading-none">{inr(o.monthTotal)}</p>
          <p className="text-xs text-indigo-200 mt-1">this month · online {inr(o.monthOnline)} · offline {inr(o.monthOffline)}</p>
        </div>
      </div>
      <p className="text-[11px] text-indigo-200 mt-3">{o.itemsInStore} items in your store · {o.onlineItems} visible online · {o.todayOnlineOrders} online orders & {o.todayBills} counter bills today</p>
    </div>
  );
}

// ── Catalogue ────────────────────────────────────────────────────────────
function ItemRow({ it, onSaved }) {
  const suggested = it.wholesalePrice ? Math.round(it.wholesalePrice * 1.15) : '';
  const [price, setPrice] = useState(it.sellingPrice ?? it.price ?? '');
  const [stock, setStock] = useState('');
  const [online, setOnline] = useState(!!it.isEnabled);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setOnline(!!it.isEnabled); setPrice(it.sellingPrice ?? it.price ?? ''); }, [it.isEnabled, it.sellingPrice, it.price]);

  const ref = it.source === 'koyambedu' ? { koyambeduProductId: it.koyambeduProductId } : { expressProductId: it.expressProductId };
  const post = async (payload, okMsg) => {
    setBusy(true);
    try {
      await expressManagerApi.post('/owner/items', { ...ref, ...payload });
      toast.success(okMsg);
      setStock('');
      onSaved();
    } catch (e) { toast.error(errMsg(e, 'Failed to save')); } finally { setBusy(false); }
  };

  return (
    <div className="bg-white border rounded-xl p-3">
      <div className="flex items-start gap-3">
        {it.image ? <img src={it.image} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" /> : <div className="w-12 h-12 rounded-lg bg-indigo-50 shrink-0" />}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-gray-800 truncate">{it.name}</p>
          <p className="text-[11px] text-gray-400">
            per {it.unit}{it.category ? ` · ${it.category}` : ''}
            {it.source === 'koyambedu' && it.wholesalePrice ? ` · Koyambedu ${inr(it.wholesalePrice)}` : ''}
            {it.isOwn && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold">My product</span>}
            {it.approvalStatus === 'pending' && <span className="ml-1 px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 font-bold">Awaiting approval</span>}
            {it.approvalStatus === 'rejected' && <span className="ml-1 px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold" title={it.approvalNote || ''}>Rejected{it.approvalNote ? `: ${it.approvalNote}` : ''}</span>}
          </p>
        </div>
        {it.inStore && (
          <button disabled={busy} onClick={() => post({ isOnline: !online }, online ? 'Hidden from online shop' : 'Now visible online')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold shrink-0 ${online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {online ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {online ? (it.approvalStatus === 'approved' ? 'Online' : 'Online (not live yet)') : 'Offline only'}
          </button>
        )}
      </div>

      {!it.inStore ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input type="number" min="0" placeholder={suggested ? `Price (e.g. ${suggested})` : 'Selling price'} value={price}
            onChange={e => setPrice(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs w-32" />
          <input type="number" min="0" step="any" placeholder="Opening stock" value={stock}
            onChange={e => setStock(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs w-28" />
          <label className="flex items-center gap-1 text-[11px] text-gray-600">
            <input type="checkbox" checked={online} onChange={e => setOnline(e.target.checked)} /> Show online
          </label>
          <button disabled={busy} onClick={() => post({ price: price === '' ? suggested : price, addStock: stock, isOnline: online }, 'Added to your store')}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold disabled:opacity-50">Add to my store</button>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-bold px-2 py-1 rounded-lg ${it.stockQty > 0 ? 'bg-indigo-50 text-indigo-700' : 'bg-red-50 text-red-600'}`}>Stock {it.stockQty}</span>
          <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs w-24" />
          <button disabled={busy || price === ''} onClick={() => post({ price }, 'Price updated')} className="px-2.5 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-50">Save price</button>
          <input type="number" min="0" step="any" placeholder="+ stock" value={stock} onChange={e => setStock(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs w-20" />
          <button disabled={busy || !stock} onClick={() => post({ addStock: stock }, 'Stock added')} className="px-2.5 py-1.5 rounded-lg border text-xs font-bold disabled:opacity-50">Add stock</button>
        </div>
      )}
    </div>
  );
}

export function OwnerCatalogTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('mine'); // mine | online | koyambedu | own | all
  const [limit, setLimit] = useState(40);
  const [showNew, setShowNew] = useState(false);
  const blank = { name: '', unit: 'kg', procurementBaseCost: '', category: '', description: '', price: '', stock: '', online: true, gstRate: '', hsnCode: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  const load = () => expressManagerApi.get('/owner/catalog')
    .then(({ data }) => setItems(data.items || [])).catch(() => toast.error('Failed to load catalogue')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter(it => {
      if (t && !String(it.name || '').toLowerCase().includes(t)) return false;
      if (filter === 'mine') return it.inStore;
      if (filter === 'online') return it.inStore && it.isEnabled;
      if (filter === 'pending') return it.approvalStatus === 'pending' || it.approvalStatus === 'rejected';
      if (filter === 'koyambedu') return it.source === 'koyambedu' && !it.inStore;
      if (filter === 'own') return it.isOwn;
      return true;
    });
  }, [items, q, filter]);
  useEffect(() => { setLimit(40); }, [q, filter]);

  // Products already in the catalogue with a similar name — suggest using
  // them instead of creating a duplicate.
  const similar = useMemo(() => {
    const t = form.name.trim().toLowerCase();
    if (t.length < 2) return [];
    return items.filter(it => it.source !== 'own' && String(it.name || '').toLowerCase().includes(t)).slice(0, 4);
  }, [form.name, items]);
  const pickExisting = (name) => { setShowNew(false); setForm(blank); setQ(name); setFilter('all'); toast.success('Add it to your store from the list below'); };

  const createOwn = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Enter the product name');
    if (form.procurementBaseCost === '') return toast.error('Enter your cost price');
    setSaving(true);
    try {
      const { data } = await expressManagerApi.post('/owner/products', {
        name: form.name, unit: form.unit, procurementBaseCost: form.procurementBaseCost, category: form.category, description: form.description,
        ...(form.gstRate !== '' ? { gstRate: form.gstRate } : {}), ...(form.hsnCode.trim() ? { hsnCode: form.hsnCode.trim() } : {}),
      });
      if (form.price !== '' || form.stock !== '' || form.online) {
        try {
          await expressManagerApi.post('/owner/items', {
            expressProductId: data.product._id, price: form.price !== '' ? form.price : undefined,
            addStock: form.stock !== '' ? form.stock : undefined, isOnline: form.online,
          });
        } catch (e2) {
          toast.error(`Product created, but adding it to your store failed: ${errMsg(e2, 'try "Add to my store" from My products')}`);
          setForm(blank); setShowNew(false); setFilter('own'); load();
          return;
        }
      }
      toast.success('Product created and added to your store');
      setForm(blank); setShowNew(false); setFilter('own'); load();
    } catch (err) {
      const d = err?.response?.data;
      if (d?.duplicate && d.matches?.length) { toast(d.message, { icon: '💡', duration: 6000 }); pickExisting(d.matches[0].name); }
      else toast.error(errMsg(err, 'Failed to create product'));
    } finally { setSaving(false); }
  };

  const pendingCount = items.filter(i => i.approvalStatus === 'pending').length;
  const chips = [['mine', 'In my store'], ['online', 'Online'], ['pending', `Approval${pendingCount ? ` (${pendingCount})` : ''}`], ['koyambedu', 'Add from Koyambedu'], ['own', 'My products'], ['all', 'All']];
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <FiSearch className="absolute left-3 top-2.5 text-gray-400" size={14} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products…" className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm bg-white" />
        </div>
        <button onClick={() => setShowNew(s => !s)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold"><FiPlus size={13} /> New product</button>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {chips.map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1 rounded-full text-[11px] font-bold ${filter === k ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600'}`}>{l}</button>
        ))}
      </div>

      {showNew && (
        <form onSubmit={createOwn} className="bg-white border rounded-xl p-3 mb-3 grid grid-cols-2 gap-2">
          <p className="col-span-2 text-xs font-bold text-indigo-900">Create your own product (visible only in your store)</p>
          <input placeholder="Product name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
          {similar.length > 0 && (
            <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-lg p-2">
              <p className="text-[11px] font-bold text-amber-800 mb-1">Already in the catalogue — use the same product instead?</p>
              {similar.map(it => (
                <div key={it.koyambeduProductId || it.expressProductId} className="flex items-center justify-between gap-2 py-0.5">
                  <span className="text-xs text-gray-700 truncate">{it.name} <span className="text-gray-400">· per {it.unit}{it.inStore ? ' · already in your store' : ''}</span></span>
                  <button type="button" onClick={() => pickExisting(it.name)} className="px-2 py-1 rounded-md bg-amber-600 text-white text-[11px] font-bold shrink-0">{it.inStore ? 'Open' : 'Use this'}</button>
                </div>
              ))}
            </div>
          )}
          <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
            {UNITS.map(u => <option key={u} value={u}>per {u}</option>)}
          </select>
          <input placeholder="Category (optional)" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" min="0" placeholder="Your cost price" value={form.procurementBaseCost} onChange={e => setForm(f => ({ ...f, procurementBaseCost: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" min="0" placeholder="Selling price" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" min="0" step="any" placeholder="Opening stock" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" min="0" max="28" step="any" placeholder="GST % (blank = store default)" value={form.gstRate} onChange={e => setForm(f => ({ ...f, gstRate: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="HSN code (optional)" value={form.hsnCode} onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-xs text-gray-600"><input type="checkbox" checked={form.online} onChange={e => setForm(f => ({ ...f, online: e.target.checked }))} /> Show in online shop</label>
          <textarea placeholder="Description (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm col-span-2" rows={2} />
          <div className="col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Saving…' : 'Create & add'}</button>
            <button type="button" onClick={() => setShowNew(false)} className="px-4 py-2 rounded-lg border text-sm">Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p className="text-sm text-gray-400">Loading catalogue…</p> : (
        <div className="grid gap-2">
          {shown.slice(0, limit).map(it => <ItemRow key={`${it.source}-${it.koyambeduProductId || it.expressProductId}`} it={it} onSaved={load} />)}
          {shown.length === 0 && (
            <p className="text-sm text-gray-400">
              {filter === 'mine' ? 'Nothing in your store yet — open "Add from Koyambedu" to inherit products, or create your own.' : 'No products match.'}
            </p>
          )}
          {shown.length > limit && <button onClick={() => setLimit(l => l + 40)} className="py-2 rounded-lg border text-sm font-semibold bg-white">Show more ({shown.length - limit} left)</button>}
        </div>
      )}
    </div>
  );
}

// ── POS staff ────────────────────────────────────────────────────────────
export function OwnerPOSTab() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', pin: '' });
  const [saving, setSaving] = useState(false);
  const load = () => expressManagerApi.get('/owner/pos-users').then(({ data }) => setUsers(data.posUsers || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await expressManagerApi.post('/owner/pos-users', form);
      toast.success('POS user added'); setForm({ name: '', phone: '', pin: '' }); load();
    } catch (err) { toast.error(errMsg(err, 'Failed to add')); } finally { setSaving(false); }
  };
  const patch = async (u, body, msg) => {
    try { await expressManagerApi.patch(`/owner/pos-users/${u._id}`, body); toast.success(msg); load(); } catch (err) { toast.error(errMsg(err, 'Failed')); }
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-3">Create POS users as you wish — they sell offline at <b>/express/pos</b> with their mobile + PIN. Stock reduces automatically with each bill.</p>
      <form onSubmit={add} className="bg-white border rounded-xl p-3 mb-3 grid grid-cols-1 sm:grid-cols-4 gap-2">
        <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Mobile" maxLength={10} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="PIN (4+ digits)" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <button disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Adding…' : 'Add POS user'}</button>
      </form>
      <div className="grid gap-2">
        {users.map(u => (
          <div key={u._id} className="bg-white border rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div><p className="font-bold text-sm text-gray-800">{u.name}</p><p className="text-xs text-gray-500">{u.phone}</p></div>
            <div className="flex items-center gap-2">
              <button onClick={() => { const np = (document.getElementById(`pin-${u._id}`) || {}).value; if (!np) return toast.error('Type a new PIN in the box first'); patch(u, { pin: np }, 'PIN changed'); }}
                className="px-2.5 py-1.5 rounded-lg border text-xs font-bold">Set PIN</button>
              <input id={`pin-${u._id}`} placeholder="new PIN" className="border rounded-lg px-2 py-1.5 text-xs w-20" />
              <button onClick={() => patch(u, { isActive: !u.isActive }, u.isActive ? 'Suspended' : 'Activated')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{u.isActive ? 'Active' : 'Suspended'}</button>
            </div>
          </div>
        ))}
        {users.length === 0 && <p className="text-sm text-gray-400">No POS users yet.</p>}
      </div>
    </div>
  );
}

// ── Accounts ─────────────────────────────────────────────────────────────
export function OwnerAccountsTab() {
  const [range, setRange] = useState({ from: '', to: '' });
  const [acc, setAcc] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ category: 'other', amount: '', note: '' });
  const params = () => { const p = {}; if (range.from) p.from = range.from; if (range.to) p.to = `${range.to}T23:59:59`; return p; };

  const load = () => {
    expressManagerApi.get('/owner/accounts', { params: params() }).then(({ data }) => setAcc(data)).catch(() => toast.error('Failed to load accounts'));
    expressManagerApi.get('/owner/expenses', { params: params() }).then(({ data }) => setExpenses(data.expenses || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const addExpense = async (e) => {
    e.preventDefault();
    if (form.amount === '') return toast.error('Enter the amount');
    try { await expressManagerApi.post('/owner/expenses', form); toast.success('Expense recorded'); setForm({ category: 'other', amount: '', note: '' }); load(); }
    catch (err) { toast.error(errMsg(err, 'Failed')); }
  };
  const del = async (id) => { try { await expressManagerApi.delete(`/owner/expenses/${id}`); load(); } catch { toast.error('Failed to delete'); } };

  const f = acc?.finance;
  const col = (n) => (n < 0 ? 'text-red-600' : 'text-green-700');
  return (
    <div>
      <div className="flex flex-wrap items-end gap-2 mb-3">
        <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
        <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="border rounded-lg px-2 py-1.5 text-sm" />
        <button onClick={load} className="px-4 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold">Apply</button>
      </div>

      {f && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {[
            ['Total revenue', inr(f.revenue)],
            ['Online revenue', `${inr(f.onlineRevenue)} · ${f.onlineOrderCount} orders`],
            ['Offline (counter)', `${inr(f.posRevenue)} · ${f.posBillCount} bills`],
            ['Cost of goods', inr(f.cogs)],
            ['Losses', inr(f.lossValue)],
            ['Expenses', inr(f.otherExpenses)],
            ['Net profit', inr(f.netProfit), col(f.netProfit)],
            ['Online profit', inr(acc.onlineTotals?.profit), col(acc.onlineTotals?.profit)],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-white border rounded-xl p-3"><p className="text-xs text-gray-400">{l}</p><p className={`text-sm font-black ${c || 'text-indigo-900'}`}>{v}</p></div>
          ))}
        </div>
      )}

      <p className="font-bold text-sm text-gray-700 mb-2">Expenses</p>
      <form onSubmit={addExpense} className="bg-white border rounded-xl p-3 mb-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
        <select value={form.category} onChange={e => setForm(x => ({ ...x, category: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm">
          {['rent', 'salary', 'utilities', 'maintenance', 'packaging', 'fuel', 'marketing', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="number" min="0" placeholder="Amount" value={form.amount} onChange={e => setForm(x => ({ ...x, amount: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm" />
        <input placeholder="Note" value={form.note} onChange={e => setForm(x => ({ ...x, note: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm" />
        <button className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">Add</button>
      </form>
      <div className="grid gap-1.5 mb-4">
        {expenses.map(x => (
          <div key={x._id} className="bg-white border rounded-lg px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-gray-600">{new Date(x.date).toLocaleDateString('en-IN')} · <b>{x.category}</b>{x.note ? ` · ${x.note}` : ''}</span>
            <span className="flex items-center gap-2"><b>{inr(x.amount)}</b><button onClick={() => del(x._id)} className="text-gray-400 hover:text-red-500"><FiTrash2 size={13} /></button></span>
          </div>
        ))}
        {expenses.length === 0 && <p className="text-xs text-gray-400">No expenses in this period.</p>}
      </div>

      <p className="font-bold text-sm text-gray-700 mb-2">Online bills (latest)</p>
      <div className="grid gap-1.5">
        {(acc?.bills || []).slice(0, 30).map(b => (
          <div key={b._id} className="bg-white border rounded-lg px-3 py-2 flex items-center justify-between text-xs">
            <span className="text-gray-600">{b.orderId} · {new Date(b.createdAt).toLocaleDateString('en-IN')}</span>
            <span>{inr(b.revenue)} · <b className={col(b.profit)}>{inr(b.profit)}</b></span>
          </div>
        ))}
        {(acc?.bills || []).length === 0 && <p className="text-xs text-gray-400">No paid online orders yet.</p>}
      </div>
    </div>
  );
}

// ── Team & WhatsApp alerts (owner only) ──────────────────────────────────
const ROLE_HELP = {
  manager: 'Manager — can see orders, move them forward and close them (delivered), and handle stock availability.',
  accountant: 'Accountant — can see accounts, record expenses and view orders (read-only).',
};
export function OwnerTeamTab() {
  const [team, setTeam] = useState([]);
  const [form, setForm] = useState({ name: '', phone: '', role: 'manager' });
  const [saving, setSaving] = useState(false);
  const [phones, setPhones] = useState([]);
  const [newPhone, setNewPhone] = useState('');
  const [savingPhones, setSavingPhones] = useState(false);

  const load = () => {
    expressManagerApi.get('/owner/team').then(({ data }) => setTeam(data.team || [])).catch(() => {});
    expressManagerApi.get('/owner/alerts').then(({ data }) => setPhones(data.phones || [])).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    setSaving(true);
    try { await expressManagerApi.post('/owner/team', form); toast.success('Team member added'); setForm({ name: '', phone: '', role: 'manager' }); load(); }
    catch (err) { toast.error(errMsg(err, 'Failed to add')); } finally { setSaving(false); }
  };
  const patch = async (m, body, msg) => { try { await expressManagerApi.patch(`/owner/team/${m._id}`, body); toast.success(msg); load(); } catch (err) { toast.error(errMsg(err, 'Failed')); } };
  const remove = async (m) => { try { await expressManagerApi.delete(`/owner/team/${m._id}`); toast.success('Removed'); load(); } catch (err) { toast.error(errMsg(err, 'Failed')); } };

  const savePhones = async (list) => {
    setSavingPhones(true);
    try { const { data } = await expressManagerApi.put('/owner/alerts', { phones: list }); setPhones(data.phones); toast.success('Alert numbers saved'); }
    catch (err) { toast.error(errMsg(err, 'Failed to save')); } finally { setSavingPhones(false); }
  };
  const addPhone = () => {
    const p = newPhone.replace(/\D/g, '');
    if (!/^[6-9]\d{9}$/.test(p)) return toast.error('Enter a valid 10-digit mobile');
    if (phones.includes(p)) return toast.error('Already added');
    savePhones([...phones, p]); setNewPhone('');
  };

  return (
    <div className="grid gap-5">
      <div>
        <p className="font-bold text-sm text-gray-800 mb-1">WhatsApp order alerts</p>
        <p className="text-xs text-gray-500 mb-2">These numbers get a WhatsApp message for every order at your store — new order, confirmed, being prepared, out for delivery, delivered and cancelled.</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {phones.map(p => (
            <span key={p} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-100 text-green-800 text-xs font-bold">
              {p}<button disabled={savingPhones} onClick={() => savePhones(phones.filter(x => x !== p))} className="text-green-700 hover:text-red-600"><FiTrash2 size={11} /></button>
            </span>
          ))}
          {phones.length === 0 && <span className="text-xs text-gray-400">No numbers yet.</span>}
        </div>
        <div className="flex gap-2">
          <input value={newPhone} maxLength={10} onChange={e => setNewPhone(e.target.value.replace(/\D/g, ''))} placeholder="WhatsApp mobile (10 digits)" className="border rounded-lg px-3 py-2 text-sm w-56" />
          <button onClick={addPhone} disabled={savingPhones} className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold disabled:opacity-50">Add number</button>
        </div>
      </div>

      <div>
        <p className="font-bold text-sm text-gray-800 mb-1">Team profiles</p>
        <p className="text-xs text-gray-500 mb-2">Add a manager or accountant by mobile number. They sign in with the normal Eptomart login (mobile + OTP) and see <b>Manage Store</b> in their Profile.</p>
        <form onSubmit={add} className="bg-white border rounded-xl p-3 mb-2 grid grid-cols-1 sm:grid-cols-4 gap-2">
          <input placeholder="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Mobile" maxLength={10} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '') }))} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
            <option value="manager">Manager</option><option value="accountant">Accountant</option>
          </select>
          <button disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">{saving ? 'Adding…' : 'Add'}</button>
          <p className="sm:col-span-4 text-[11px] text-gray-400">{ROLE_HELP[form.role]}</p>
        </form>
        <div className="grid gap-2">
          {team.map(m => (
            <div key={m._id} className="bg-white border rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
              <div><p className="font-bold text-sm text-gray-800">{m.name} <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-bold uppercase">{m.role}</span></p><p className="text-xs text-gray-500">{m.phone}</p></div>
              <div className="flex items-center gap-2">
                <select value={m.role} onChange={e => patch(m, { role: e.target.value }, 'Role updated')} className="border rounded-lg px-2 py-1.5 text-xs">
                  <option value="manager">Manager</option><option value="accountant">Accountant</option>
                </select>
                <button onClick={() => patch(m, { isActive: !m.isActive }, m.isActive ? 'Suspended' : 'Activated')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{m.isActive ? 'Active' : 'Suspended'}</button>
                <button onClick={() => remove(m)} className="p-1.5 text-gray-400 hover:text-red-500"><FiTrash2 size={14} /></button>
              </div>
            </div>
          ))}
          {team.length === 0 && <p className="text-sm text-gray-400">No manager or accountant yet.</p>}
        </div>
      </div>
    </div>
  );
}

// ── GST & Invoice profile (owner; identity locks after the first final invoice) ──
export function OwnerGstTab() {
  const [g, setG] = useState(null);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const load = () => expressManagerApi.get('/owner/gst').then(({ data }) => {
    const x = data.gst || {};
    setLocked(!!data.locked);
    setG({
      registered: !!x.registered, gstin: x.gstin || '', legalName: x.legalName || '', tradeName: x.tradeName || data.storeName || '',
      address: x.address || '', pincode: x.pincode || '', pan: x.pan || '', fssai: x.fssai || '',
      defaultGstRate: x.defaultGstRate ?? 0, deliveryGstRate: x.deliveryGstRate ?? 18, hsnDefault: x.hsnDefault || '0709', invoicePrefix: x.invoicePrefix || '',
      stateCode: x.stateCode || '', complete: data.complete,
    });
  }).catch(() => toast.error('Failed to load GST profile'));
  useEffect(() => { load(); }, []);
  if (!g) return <p className="text-sm text-gray-400">Loading…</p>;
  const set = (k, v) => setG(s => ({ ...s, [k]: v }));
  const idLocked = locked;

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const { complete, stateCode, ...body } = g;
      await expressManagerApi.put('/owner/gst', body);
      toast.success('GST & invoice profile saved'); await load();
    } catch (err) { toast.error(errMsg(err, 'Failed to save')); } finally { setSaving(false); }
  };
  const inp = 'border rounded-lg px-3 py-2 text-sm w-full disabled:bg-gray-100 disabled:text-gray-500';
  return (
    <form onSubmit={save} className="bg-white border rounded-xl p-4 grid gap-3">
      {!g.complete && <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">Set this up once — every customer invoice is issued in your store's name using these details.</div>}
      {idLocked && <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 text-xs text-indigo-800">🔒 Invoices have been issued, so GST status, GSTIN, legal name, PAN and invoice prefix are locked. Contact Eptomart admin to change them. You can still update the other fields.</div>}
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
        <input type="checkbox" disabled={idLocked} checked={g.registered} onChange={e => set('registered', e.target.checked)} /> My store is GST registered
      </label>
      <p className="text-[11px] text-gray-500 -mt-2">{g.registered ? 'Customers get a GST Tax Invoice.' : 'Customers get a Bill of Supply (no GST charged).'}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        {g.registered && <div><p className="text-[11px] text-gray-500 mb-1">GSTIN</p><input disabled={idLocked} value={g.gstin} onChange={e => set('gstin', e.target.value.toUpperCase())} maxLength={15} placeholder="33ABCDE1234F1Z5" className={inp} /></div>}
        <div><p className="text-[11px] text-gray-500 mb-1">Legal / business name *</p><input disabled={idLocked} value={g.legalName} onChange={e => set('legalName', e.target.value)} className={inp} /></div>
        <div><p className="text-[11px] text-gray-500 mb-1">Trade name (optional)</p><input value={g.tradeName} onChange={e => set('tradeName', e.target.value)} className={inp} /></div>
        <div><p className="text-[11px] text-gray-500 mb-1">PAN (optional)</p><input disabled={idLocked} value={g.pan} onChange={e => set('pan', e.target.value.toUpperCase())} maxLength={10} className={inp} /></div>
        <div className="sm:col-span-2"><p className="text-[11px] text-gray-500 mb-1">Business address *</p><input value={g.address} onChange={e => set('address', e.target.value)} className={inp} /></div>
        <div><p className="text-[11px] text-gray-500 mb-1">Pincode</p><input value={g.pincode} onChange={e => set('pincode', e.target.value.replace(/\D/g, '').slice(0, 6))} className={inp} /></div>
        <div><p className="text-[11px] text-gray-500 mb-1">FSSAI licence no. (food)</p><input value={g.fssai} onChange={e => set('fssai', e.target.value)} className={inp} /></div>
        <div><p className="text-[11px] text-gray-500 mb-1">Default GST % on products</p><input type="number" min="0" max="28" step="any" value={g.defaultGstRate} onChange={e => set('defaultGstRate', e.target.value)} className={inp} /></div>
        <div><p className="text-[11px] text-gray-500 mb-1">GST % on delivery charge</p><input type="number" min="0" max="28" step="any" value={g.deliveryGstRate} onChange={e => set('deliveryGstRate', e.target.value)} className={inp} /></div>
        <div><p className="text-[11px] text-gray-500 mb-1">Default HSN code</p><input value={g.hsnDefault} onChange={e => set('hsnDefault', e.target.value)} className={inp} /></div>
        <div><p className="text-[11px] text-gray-500 mb-1">Invoice number prefix</p><input disabled={idLocked} value={g.invoicePrefix} onChange={e => set('invoicePrefix', e.target.value.toUpperCase())} placeholder="e.g. VALASA" className={inp} /></div>
      </div>
      {g.stateCode && <p className="text-[11px] text-gray-500">State code {g.stateCode}{g.registered ? ' (from GSTIN)' : ' (from pincode)'} — decides CGST+SGST vs IGST.</p>}
      <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 w-fit">{saving ? 'Saving…' : 'Save profile'}</button>
    </form>
  );
}

// ── Delivery & store settings (owner) ────────────────────────────────────
export function OwnerDeliveryTab() {
  const [store, setStore] = useState(null);
  const [holdMsg, setHoldMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const load = () => expressManagerApi.get('/owner/store').then(({ data }) => setStore(data.store)).catch(() => toast.error('Failed to load store settings'));
  useEffect(() => { load(); }, []);
  if (!store) return <p className="text-sm text-gray-400">Loading…</p>;

  const toggle = async (path, body, msg) => {
    setBusy(true);
    try { await expressManagerApi.patch(`/owner/store/${path}`, body || {}); toast.success(msg); await load(); }
    catch (e) { toast.error(errMsg(e, 'Failed')); } finally { setBusy(false); }
  };
  return (
    <div className="grid gap-4">
      <div className="bg-white border rounded-xl p-4">
        <p className="font-bold text-sm text-gray-800 mb-1">Online shop</p>
        <p className="text-xs text-gray-500 mb-3">Turn your store's online ordering on or off. Counter (POS) sales are never affected.</p>
        <button disabled={busy} onClick={() => toggle('toggle-online-shop', {}, store.onlineShopEnabled ? 'Online shop turned OFF' : 'Online shop turned ON')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold ${store.onlineShopEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {store.onlineShopEnabled ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {store.onlineShopEnabled ? 'Online shop is ON' : 'Online shop is OFF'}
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <p className="font-bold text-sm text-gray-800 mb-1">Busy? Put checkout on hold</p>
        <p className="text-xs text-gray-500 mb-3">Customers can still browse and fill their cart but can't check out until you resume.</p>
        {store.isPaused ? (
          <div>
            <p className="text-xs text-amber-700 mb-2">On hold{store.pauseMessage ? `: "${store.pauseMessage}"` : ''}</p>
            <button disabled={busy} onClick={() => toggle('toggle-pause', {}, 'Checkout resumed')} className="px-4 py-2 rounded-lg bg-green-600 text-white text-xs font-bold">Resume checkout</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <input value={holdMsg} onChange={e => setHoldMsg(e.target.value)} placeholder="Message customers see (optional)" className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px]" />
            <button disabled={busy} onClick={() => toggle('toggle-pause', { message: holdMsg }, 'Checkout on hold')} className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-bold">Hold checkout</button>
          </div>
        )}
      </div>

      <div className="bg-white border rounded-xl p-4">
        <p className="font-bold text-sm text-gray-800 mb-2">Delivery time slots</p>
        <DeliverySlotsPanel store={store} onChanged={load} client={expressManagerApi} basePath="/owner/store" />
      </div>
      <div className="bg-white border rounded-xl p-4">
        <p className="font-bold text-sm text-gray-800 mb-2">Delivery fees & range</p>
        <DeliveryFeePanel store={store} onChanged={load} client={expressManagerApi} basePath="/owner/store" />
      </div>
    </div>
  );
}
