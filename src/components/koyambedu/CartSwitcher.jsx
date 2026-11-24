// Several named carts for Koyambedu Daily ("Home", "Shop", "Mom's house"…), each
// optionally tagged to a saved address (which carries its pin). Tap a chip to
// switch. The cart in use is the normal cart — nothing else in the app changes.
import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useKoyambeduCart } from '../../context/KoyambeduCartContext';

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const inp = 'border border-gray-200 rounded-xl px-3 py-2 text-base sm:text-sm bg-white focus:outline-none focus:border-green-500';

export default function CartSwitcher() {
  const { user } = useAuth();
  const { fetchCart } = useKoyambeduCart();
  const [carts, setCarts] = useState(null);
  const [mode, setMode] = useState(null);        // null | 'new' | 'edit'
  const [name, setName] = useState('');
  const [addressId, setAddressId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const addresses = user?.addresses || [];

  const load = useCallback(() => {
    if (!user) return;
    api.get('/koyambedu/carts').then(({ data }) => setCarts(data.carts || [])).catch(() => setCarts([]));
  }, [user]);
  useEffect(() => { load(); }, [load]);
  if (!user || carts === null) return null;

  const active = carts.find(c => c.isActive);
  // Only worth showing when there is something to switch between or something in the cart
  if (carts.length < 2 && !(active?.itemCount > 0) && mode === null) return null;
  const done = (data, msg) => { setCarts(data.carts || []); setMode(null); setConfirmDel(false); if (msg) toast.success(msg); fetchCart(); };
  const err = (e) => toast.error(e?.response?.data?.message || 'Something went wrong');

  const switchTo = async (c) => {
    if (c.isActive || busy) return;
    setBusy(true);
    try { const { data } = await api.post(`/koyambedu/carts/${c._id}/switch`); done(data, `Switched to ${c.name}`); }
    catch (e) { err(e); } finally { setBusy(false); }
  };
  const create = async () => {
    setBusy(true);
    try { const { data } = await api.post('/koyambedu/carts', { name, addressId }); done(data, `${name.trim()} created`); setName(''); setAddressId(''); }
    catch (e) { err(e); } finally { setBusy(false); }
  };
  const save = async () => {
    setBusy(true);
    try { const { data } = await api.patch(`/koyambedu/carts/${active._id}`, { name, addressId }); done(data, 'Saved'); }
    catch (e) { err(e); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    try { const { data } = await api.delete(`/koyambedu/carts/${active._id}`); done(data, 'Cart deleted'); }
    catch (e) { err(e); } finally { setBusy(false); }
  };
  const addrLabel = (a) => `${a.label || 'Address'} — ${[a.addressLine1, a.pincode].filter(Boolean).join(', ')}${a.lat != null ? ' 📍' : ''}`;

  return (
    <div className="card p-3 mb-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {carts.map(c => (
          <button key={c._id} onClick={() => switchTo(c)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition active:scale-95 ${c.isActive ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-700 border-gray-200'}`}>
            🛒 {c.name} <span className="opacity-80">· {c.itemCount}{c.itemCount ? ` · ${inr(c.total)}` : ''}</span>
          </button>
        ))}
        <button onClick={() => { setMode(mode === 'new' ? null : 'new'); setName(''); setAddressId(''); }}
          className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border border-dashed border-green-400 text-green-700">+ New cart</button>
      </div>

      {active && mode === null && (
        <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-2 flex-wrap">
          <span>Using <b>{active.name}</b>{active.place ? <> · 📍 {active.place.label} {active.place.pincode}{active.place.areaName ? ` (${active.place.areaName})` : ''}</> : ' · no address tagged'}</span>
          <button onClick={() => { setMode('edit'); setName(active.name); setAddressId(active.addressId || ''); setConfirmDel(false); }} className="font-bold text-green-700 underline">Edit</button>
        </p>
      )}

      {mode && (
        <div className="mt-2 bg-gray-50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-bold text-gray-600">{mode === 'new' ? 'New cart' : `Edit “${active?.name}”`}</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Cart name (e.g. Home, Shop, Mom's house)" maxLength={40} className={`${inp} w-full`} />
          <select value={addressId} onChange={e => setAddressId(e.target.value)} className={`${inp} w-full`}>
            <option value="">No address tagged (choose at checkout)</option>
            {addresses.map(a => <option key={a._id} value={a._id}>{addrLabel(a)}</option>)}
          </select>
          {addresses.length === 0 && <p className="text-[11px] text-gray-400">Saved addresses appear here after you save one at checkout.</p>}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={mode === 'new' ? create : save} disabled={busy || !name.trim()}
              className="bg-green-600 text-white text-xs font-bold px-4 py-2 rounded-xl disabled:opacity-50">{mode === 'new' ? 'Create & use' : 'Save'}</button>
            <button onClick={() => setMode(null)} className="text-xs font-bold text-gray-500 px-3 py-2">Cancel</button>
            {mode === 'edit' && carts.length > 1 && (confirmDel ? (
              <span className="ml-auto text-xs"><span className="text-red-600 font-bold mr-1">Delete this cart?</span>
                <button onClick={remove} disabled={busy} className="px-2 py-1 rounded bg-red-600 text-white font-bold mr-1">Yes</button>
                <button onClick={() => setConfirmDel(false)} className="px-2 py-1 rounded bg-gray-200 text-gray-700 font-bold">No</button></span>
            ) : <button onClick={() => setConfirmDel(true)} className="ml-auto text-xs font-bold text-red-600">Delete cart</button>)}
          </div>
        </div>
      )}
    </div>
  );
}
