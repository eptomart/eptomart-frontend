// Admin: add items to a customer's cart from a photo / Excel / CSV list.
// Upload → review matches (fix / search / quick-add missing product) → apply into a named cart.
import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const inp = 'border border-gray-200 rounded-lg px-2 py-1.5 text-base sm:text-sm bg-white focus:outline-none focus:border-green-500';
const BADGE = { matched: 'bg-green-100 text-green-700', suggested: 'bg-amber-100 text-amber-700', notfound: 'bg-red-100 text-red-700' };
const LABEL = { matched: 'Matched', suggested: 'Check', notfound: 'Not found' };

function QuickAdd({ initialName, onClose, onCreated }) {
  const [cats, setCats] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [f, setF] = useState({ name: initialName || '', nameTamil: '', categoryId: '', unit: 'kg', price: '', minQty: 1, sellerId: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api.get('/koyambedu/categories').then(({ data }) => {
      const flat = []; (data.categories || []).forEach(c => { flat.push(c); (c.subcategories || []).forEach(s => flat.push({ ...s, name: `${c.name} › ${s.name}` })); });
      setCats(flat);
    }).catch(() => {});
    api.get('/koyambedu/admin/sellers', { params: { status: 'approved', limit: 100 } }).then(({ data }) => setSellers(data.sellers || [])).catch(() => {});
  }, []);
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/koyambedu/admin/products/quick-add', { ...f, price: Number(f.price), minQty: Number(f.minQty) || 1 });
      toast.success('Product added');
      onCreated(data.product);
    } catch (e) { toast.error(e?.response?.data?.message || 'Could not add product'); }
    setBusy(false);
  };
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md p-4 space-y-2 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <p className="font-black text-gray-800">Add new product</p>
        <input className={`${inp} w-full`} placeholder="Product name" value={f.name} onChange={set('name')} />
        <input className={`${inp} w-full`} placeholder="Tamil name (optional)" value={f.nameTamil} onChange={set('nameTamil')} />
        <select className={`${inp} w-full`} value={f.categoryId} onChange={set('categoryId')}>
          <option value="">Category…</option>{cats.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
        </select>
        <select className={`${inp} w-full`} value={f.sellerId} onChange={set('sellerId')}>
          <option value="">Seller…</option>{sellers.map(s => <option key={s._id} value={s._id}>{s.businessName || s.name || s._id}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <select className={inp} value={f.unit} onChange={set('unit')}>
            {['kg', 'g', 'piece', 'bunch', 'dozen', 'litre', 'pack', 'leaf', 'box', 'bag', 'crate'].map(u => <option key={u}>{u}</option>)}
          </select>
          <input className={inp} type="number" inputMode="decimal" placeholder="Price ₹" value={f.price} onChange={set('price')} />
          <input className={inp} type="number" inputMode="decimal" placeholder="Min qty" value={f.minQty} onChange={set('minQty')} />
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 border border-gray-200 rounded-xl py-2 text-sm font-bold text-gray-600">Cancel</button>
          <button disabled={busy} onClick={save} className="flex-1 bg-green-600 text-white rounded-xl py-2 text-sm font-bold disabled:opacity-50">{busy ? 'Saving…' : 'Add product'}</button>
        </div>
      </div>
    </div>
  );
}

function Line({ line, onChange, onRemove, canAdd, onQuickAdd }) {
  const [q, setQ] = useState('');
  const [res, setRes] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open || q.trim().length < 2) { setRes([]); return; }
    const t = setTimeout(() => api.get('/koyambedu/admin/cart-import/products', { params: { q } }).then(({ data }) => setRes(data.products || [])).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, open]);
  const pick = (p) => { onChange({ match: p, status: 'matched' }); setOpen(false); setQ(''); };
  return (
    <div className="border border-gray-200 rounded-xl p-2 bg-white">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-gray-400 truncate">“{line.raw}”</p>
          <p className="text-sm font-bold text-gray-800 truncate">{line.match ? `${line.match.name}${line.match.nameTamil ? ` · ${line.match.nameTamil}` : ''}` : 'No product chosen'}</p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${BADGE[line.status]}`}>{LABEL[line.status]}</span>
        <button onClick={onRemove} className="text-gray-400 text-lg leading-none px-1" aria-label="Remove">×</button>
      </div>
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        <input type="number" inputMode="decimal" className={`${inp} w-20`} value={line.qty ?? ''} onChange={e => onChange({ qty: e.target.value })} />
        <span className="text-xs text-gray-500">{line.match?.unit || line.unit || ''}{line.qtyAssumed ? ' (qty assumed)' : ''}</span>
        <button onClick={() => setOpen(o => !o)} className="text-xs font-bold text-indigo-600 ml-auto">{open ? 'Close' : 'Change product'}</button>
        {line.status === 'notfound' && canAdd && <button onClick={() => onQuickAdd(line)} className="text-xs font-bold text-green-700">+ Add product</button>}
      </div>
      {line.status !== 'matched' && line.candidates?.length > 0 && !open && (
        <div className="flex gap-1.5 flex-wrap mt-1.5">
          {line.candidates.map(c => <button key={c.productId} onClick={() => pick(c)} className="text-[11px] bg-gray-100 rounded-full px-2 py-0.5 text-gray-700">{c.name}</button>)}
        </div>
      )}
      {open && (
        <div className="mt-1.5">
          <input autoFocus className={`${inp} w-full`} placeholder="Search Koyambedu products…" value={q} onChange={e => setQ(e.target.value)} />
          {res.map(p => <button key={p.productId} onClick={() => pick(p)} className="block w-full text-left text-sm px-2 py-1.5 hover:bg-gray-50 rounded">{p.name} <span className="text-gray-400 text-xs">{p.nameTamil} · ₹{p.price}/{p.unit}</span></button>)}
          {q.trim().length >= 2 && res.length === 0 && canAdd && <button onClick={() => onQuickAdd(line, q)} className="text-xs font-bold text-green-700 mt-1">Not listed — add “{q}” as new product</button>}
        </div>
      )}
    </div>
  );
}

export default function ImportListModal({ userId, name, onClose, onDone }) {
  const { isSuperAdmin } = useAuth();
  const fileRef = useRef(null);
  const [lines, setLines] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cartName, setCartName] = useState('Added by Eptomart');
  const [quick, setQuick] = useState(null);

  const upload = async (file) => {
    if (!file) return;
    setBusy(true);
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await api.post('/koyambedu/admin/cart-import/parse', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 });
      setLines(data.lines || []);
    } catch (e) { toast.error(e?.response?.data?.message || 'Could not read the file'); }
    setBusy(false);
  };
  const upd = (id, patch) => setLines(ls => ls.map(l => l.id === id ? { ...l, ...patch } : l));
  const usable = (lines || []).filter(l => l.match && Number(l.qty) > 0);

  const apply = async () => {
    setBusy(true);
    try {
      const { data } = await api.post('/koyambedu/admin/cart-import/apply', {
        userId, newCartName: cartName.trim() || undefined,
        lines: usable.map(l => ({ productId: l.match.productId, quantity: Number(l.qty) })),
      });
      toast.success(`${data.added?.length || 0} item(s) added to "${data.cartName}"${data.skipped?.length ? ` · ${data.skipped.length} skipped` : ''}`);
      onDone?.(data); onClose();
    } catch (e) { toast.error(e?.response?.data?.message || 'Could not add items'); }
    setBusy(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="bg-gray-50 w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div><p className="font-black text-gray-800">Add items from list</p><p className="text-xs text-gray-500">for {name || 'customer'}</p></div>
          <button onClick={onClose} className="text-2xl text-gray-400 leading-none">×</button>
        </div>
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {!lines ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 mb-3">Upload a photo of a hand-written list, or an Excel / CSV file.</p>
              <input ref={fileRef} type="file" accept="image/*,.xlsx,.csv,text/csv" className="hidden" onChange={e => upload(e.target.files?.[0])} />
              <button disabled={busy} onClick={() => fileRef.current?.click()} className="bg-green-600 text-white font-bold rounded-xl px-5 py-2.5 text-sm disabled:opacity-50">{busy ? 'Reading list…' : 'Choose file'}</button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">{lines.length} line(s) · {lines.filter(l => l.status === 'matched').length} matched. Fix anything marked Check / Not found.</p>
              {lines.map(l => <Line key={l.id} line={l} canAdd={isSuperAdmin} onChange={p => upd(l.id, p)} onRemove={() => setLines(ls => ls.filter(x => x.id !== l.id))} onQuickAdd={(ln, q) => setQuick({ line: ln, name: q || ln.raw })} />)}
            </>
          )}
        </div>
        {lines && (
          <div className="p-4 border-t border-gray-200 space-y-2">
            <input className={`${inp} w-full`} value={cartName} onChange={e => setCartName(e.target.value)} placeholder="Cart name for the customer" maxLength={40} />
            <button disabled={busy || !usable.length} onClick={apply} className="w-full bg-green-600 text-white font-bold rounded-xl py-2.5 text-sm disabled:opacity-50">
              {busy ? 'Adding…' : `Add ${usable.length} item(s) to customer's cart`}
            </button>
          </div>
        )}
      </div>
      {quick && <QuickAdd initialName={quick.name} onClose={() => setQuick(null)} onCreated={(p) => {
        upd(quick.line.id, { match: { productId: String(p._id), name: p.name, nameTamil: p.nameTamil || '', unit: p.unit, price: p.currentPrice }, status: 'matched' });
        setQuick(null);
      }} />}
    </div>
  );
}
