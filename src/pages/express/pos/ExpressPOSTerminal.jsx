// ============================================
// EPTOMART EXPRESS — POS Billing Terminal
// Held-bills tray (max 5) + current bill editor + product search. Covers
// spec sections 6, 17, 18: create/hold/resume/complete bills, thermal
// receipt printing, every sale billed through the POS.
// ============================================
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiZap, FiLogOut, FiPlus, FiMinus, FiTrash2, FiPrinter, FiSearch, FiX, FiBluetooth } from 'react-icons/fi';
import expressPOSApi, { getPOSToken, clearPOSToken } from '../../../utils/expressPOSApi';
import {
  printReceipt, printPluList,
  isBluetoothSupported, connectPrinter, disconnectPrinter, isPrinterConnected,
} from '../../../utils/expressThermalPrinter';

const MAX_HELD = 5;
const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
// Weight/volume units allow fractional quantities (1.35kg, 0.5 litre); the
// discrete units (piece/bunch/dozen) don't, so they keep the simple +/-
// stepper. Unit itself always comes from the linked Koyambedu Daily
// product (see expressAdminController — unit defaults to koyambeduProduct.unit
// or 'kg' when a product is first linked into Express), never hardcoded here.
const isDecimalUnit = (unit) => unit === 'kg' || unit === 'gram' || unit === 'litre';

// ── Audio feedback ──────────────────────────────────────────────
// A short beep on every successful add and a lower buzz on every error, the
// way a real POS/barcode-scanner terminal does — lets the cashier keep
// their eyes on the customer/produce instead of the screen while billing.
// Lazily creates one shared AudioContext (browsers require it to start
// inside a user gesture, which every call site here already is — a click
// or a form submit).
let audioCtx = null;
function getAudioCtx() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}
function beep(freq, duration, type = 'sine') {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch { /* audio is a nice-to-have; never let it break billing */ }
}
const beepSuccess = () => beep(880, 90);
const beepError = () => beep(220, 180, 'square');

export default function ExpressPOSTerminal() {
  const navigate = useNavigate();
  const [posUser, setPosUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState([]);
  const [activeBillId, setActiveBillId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  // Top-level view: billing counter, the store's online orders, today's activity
  const [view, setView] = useState('billing');
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activity, setActivity] = useState(null);
  // Checkout step (review/modify items, add last-minute items, payment mode,
  // cash received → change to return)
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tendered, setTendered] = useState('');
  const [completing, setCompleting] = useState(false);
  const [coSearch, setCoSearch] = useState('');
  const [coCode, setCoCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  // Per-tile quantity typed before adding (e.g. "1.35" for 1.35kg of a
  // weight-based product) — defaults to "1" for every product until edited.
  const [qtyDrafts, setQtyDrafts] = useState({});
  // Quantity being edited inline on an already-added bill line — keyed by
  // productId, so typing "1.35" doesn't get clobbered by a bill refresh.
  const [lineQtyDrafts, setLineQtyDrafts] = useState({});
  // Offer/discount %, applied to the whole bill's subtotal — draft text kept
  // separate from the saved value so typing doesn't fire a request per
  // keystroke; only "Apply" commits it.
  const [discountDraft, setDiscountDraft] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  // Bluetooth thermal printer — same shared connection used by the Express
  // admin panel and Store Manager dashboard (and Koyambedu Daily's own
  // Printer tab, underneath). Connecting here before the shift starts means
  // "Complete Sale & Print" goes straight to the printer with no OS dialog,
  // and the POS operator can print their own code-reference sheet too.
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [printingList, setPrintingList] = useState(false);
  const codeInputRef = useRef(null);
  const refocusCodeInput = () => { codeInputRef.current?.focus(); codeInputRef.current?.select?.(); };

  useEffect(() => {
    if (!getPOSToken()) { navigate('/express/pos/login'); return; }
    expressPOSApi.get('/me').then(({ data }) => setPosUser(data.posUser)).catch(() => {});
    expressPOSApi.get('/products').then(({ data }) => setProducts(data.products || [])).catch(() => {});
    loadBills();
  }, []);

  const loadOrders = () => {
    setOrdersLoading(true);
    expressPOSApi.get('/orders').then(({ data }) => setOnlineOrders(data.orders || [])).catch(() => {}).finally(() => setOrdersLoading(false));
  };
  const loadActivity = () => {
    expressPOSApi.get('/activity').then(({ data }) => setActivity(data)).catch(() => {});
  };
  // Load a tab's data when it's opened; keep the online-orders tab fresh
  useEffect(() => {
    if (view === 'orders') { loadOrders(); const t = setInterval(loadOrders, 30000); return () => clearInterval(t); }
    if (view === 'activity') loadActivity();
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  // Light poll so the Online Orders tab can show a "new" badge while billing
  useEffect(() => {
    const check = () => expressPOSApi.get('/orders').then(({ data }) => setOnlineOrders(data.orders || [])).catch(() => {});
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  const loadBills = () => {
    expressPOSApi.get('/bills').then(({ data }) => {
      const held = (data.bills || []).filter(b => b.status === 'held');
      setBills(held);
      if (!activeBillId && held.length > 0) setActiveBillId(held[0]._id);
    }).catch(() => {});
  };

  const activeBill = bills.find(b => b._id === activeBillId);

  // Keep the discount input in sync with whichever bill is active — e.g.
  // switching from a held bill with a 10% offer to a fresh one with none.
  useEffect(() => {
    setDiscountDraft(activeBill?.discountPercent ? String(activeBill.discountPercent) : '');
  }, [activeBillId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyDiscount = async () => {
    if (!activeBill) return;
    const pct = discountDraft.trim() === '' ? 0 : Number(discountDraft);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast.error('Enter a discount between 0 and 100');
    setApplyingDiscount(true);
    try {
      const { data } = await expressPOSApi.patch(`/bills/${activeBill._id}/discount`, { discountPercent: pct });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
      toast.success(pct > 0 ? `${pct}% offer applied` : 'Discount cleared');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply discount');
    } finally { setApplyingDiscount(false); }
  };

  const newBill = async () => {
    if (bills.length >= MAX_HELD) return toast.error(`You already have ${MAX_HELD} held bills — complete or void one first`);
    try {
      const { data } = await expressPOSApi.post('/bills', {});
      setBills(b => [data.bill, ...b]);
      setActiveBillId(data.bill._id);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to create bill'); }
  };

  const addItem = async (productId, delta = 1) => {
    if (!activeBill) return toast.error('Start a new bill first');
    const existing = activeBill.items.find(i => String(i.product) === String(productId));
    const nextQty = Math.max(0, round3((existing?.quantity || 0) + delta));
    try {
      const { data } = await expressPOSApi.post(`/bills/${activeBill._id}/item`, { productId, quantity: nextQty });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
      beepSuccess();
      refocusCodeInput();
    } catch (err) {
      beepError();
      toast.error(err?.response?.data?.message || 'Failed to update bill');
    }
  };

  // Removes a line item entirely regardless of its current quantity —
  // distinct from the +/- steppers (which only reach 0 one unit at a time)
  // and from clearing the decimal-quantity input (which doesn't submit on
  // its own). Backend already treats quantity<=0 as "remove this line".
  const removeItem = async (productId) => {
    if (!activeBill) return;
    try {
      const { data } = await expressPOSApi.post(`/bills/${activeBill._id}/item`, { productId, quantity: 0 });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
      setLineQtyDrafts(d => { const n = { ...d }; delete n[productId]; return n; });
      toast('Item removed', { icon: '🗑️' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove item');
    }
  };

  // Sets a line's quantity to an exact typed value (e.g. 1.35kg) instead of
  // stepping by whole units — used both when first adding a weight-based
  // product and when correcting its quantity on the bill afterwards.
  const setExactQuantity = async (productId, qty) => {
    if (!activeBill) return toast.error('Start a new bill first');
    if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a quantity greater than 0');
    try {
      const { data } = await expressPOSApi.post(`/bills/${activeBill._id}/item`, { productId, quantity: round3(qty) });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
      setLineQtyDrafts(d => { const n = { ...d }; delete n[productId]; return n; });
      beepSuccess();
    } catch (err) {
      beepError();
      toast.error(err?.response?.data?.message || 'Failed to update quantity');
    }
  };

  const openCheckout = () => {
    if (!activeBill || activeBill.items.length === 0) return toast.error('Add at least one item');
    setTendered(''); setCoSearch(''); setCoCode('');
    setCheckoutOpen(true);
  };

  const completeSale = async () => {
    if (!activeBill || activeBill.items.length === 0) return toast.error('Add at least one item');
    const total = activeBill.total;
    let amountTendered;
    if (paymentMethod === 'cash') {
      amountTendered = Number(tendered);
      if (tendered === '' || !Number.isFinite(amountTendered)) return toast.error('Enter the amount received from the customer');
      if (amountTendered < total) return toast.error(`Amount received is less than the total (₹${total})`);
    }
    setCompleting(true);
    try {
      const { data } = await expressPOSApi.patch(`/bills/${activeBill._id}/complete`, { paymentMethod, amountTendered });
      const b = data.bill;
      toast.success(paymentMethod === 'cash' && b.changeReturned > 0 ? `Sale completed — return ₹${b.changeReturned}` : 'Sale completed');
      printReceipt({
        billNo: b.billNo,
        dateStr: new Date(b.completedAt).toLocaleDateString('en-IN'),
        timeLabel: new Date(b.completedAt).toLocaleTimeString('en-IN'),
        storeName: posUser?.store?.name,
        customerName: b.customerName,
        items: b.items,
        subtotal: b.subtotal,
        discountPercent: b.discountPercent,
        discountAmount: b.discountAmount,
        roundOff: b.roundOff,
        total: b.total,
        paymentMethod: b.paymentMethod,
        amountTendered: b.amountTendered,
        changeReturned: b.changeReturned,
      }).catch(() => toast.error('Sale completed, but the receipt failed to print'));
      setBills(bs => bs.filter(x => x._id !== b._id));
      setActiveBillId(null);
      setDiscountDraft('');
      setCheckoutOpen(false);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to complete sale'); }
    finally { setCompleting(false); }
  };

  const voidBill = async () => {
    if (!activeBill) return;
    try {
      await expressPOSApi.patch(`/bills/${activeBill._id}/void`);
      toast('Bill voided');
      setBills(bs => bs.filter(b => b._id !== activeBill._id));
      setActiveBillId(null);
    } catch { toast.error('Failed to void bill'); }
  };

  const logout = () => { clearPOSToken(); navigate('/express/pos/login'); };

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

  // Uses the products already loaded for the billing grid — no separate
  // endpoint needed, since it's exactly the name/unit/plu/price shape the
  // POS screen itself shows.
  const printCodeList = async () => {
    setPrintingList(true);
    try {
      await printPluList(products, posUser?.store?.name);
    } catch (err) {
      toast.error(err?.message || 'Failed to print code list');
    } finally {
      setPrintingList(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Quick-entry by PLU code — vegetables 100-199, fruits 200-299 — so a POS
  // user can just type the 3-digit code instead of hunting through the grid.
  const addByCode = (e) => {
    e.preventDefault();
    const code = Number(codeInput.trim());
    if (!codeInput.trim() || !Number.isInteger(code)) return;
    if (!activeBill) { toast.error('Start a new bill first'); return; }
    const match = products.find(p => p.plu === code);
    if (!match) { beepError(); toast.error(`No product with code ${code}`); setCodeInput(''); return; }
    if (match.stockQty === 0) { beepError(); toast.error(`${match.name} is out of stock`); setCodeInput(''); return; }
    addItem(match._id, 1);
    setCodeInput('');
  };

  // ── Online orders for this store ──────────────────────────────────
  const STATUS_STYLE = {
    confirmed: 'bg-blue-100 text-blue-700', placed: 'bg-blue-100 text-blue-700', preparing: 'bg-amber-100 text-amber-700',
    out_for_delivery: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
  };
  const renderOrders = () => (
    <div className="p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-700">Online orders for {posUser?.store?.name || 'your store'}</p>
        <button onClick={loadOrders} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">{ordersLoading ? 'Refreshing…' : '↻ Refresh'}</button>
      </div>
      {onlineOrders.length === 0 && <p className="text-sm text-gray-400">No online orders yet.</p>}
      <div className="space-y-3">
        {onlineOrders.map(o => (
          <div key={o._id} className="bg-white border rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-bold text-sm text-gray-800">{o.orderId}</p>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>{String(o.orderStatus || '').replace(/_/g, ' ')}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(o.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {' · '}{o.buyer?.name || o.deliveryAddress?.name || 'Customer'}
              {(o.deliveryAddress?.phone || o.buyer?.phone) ? ` · 📱 ${o.deliveryAddress?.phone || o.buyer?.phone}` : ''}
            </p>
            {o.deliveryAddress?.addressLine && <p className="text-[11px] text-gray-400 mt-0.5">📍 {o.deliveryAddress.addressLine}{o.deliveryAddress.city ? `, ${o.deliveryAddress.city}` : ''}</p>}
            <div className="mt-2 text-xs text-gray-700 space-y-0.5">
              {(o.items || []).map((it, i) => <div key={i} className="flex justify-between"><span>{it.name} × {it.quantity}{it.unit ? ` ${it.unit}` : ''}</span><span>₹{it.lineTotal ?? (it.unitPrice * it.quantity)}</span></div>)}
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t text-sm font-bold text-gray-800"><span>Total</span><span>₹{o.pricing?.total}</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Today's activity (all counters at this store) ─────────────────
  const renderActivity = () => (
    <div className="p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-700">Today at {posUser?.store?.name || 'your store'}</p>
        <button onClick={loadActivity} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">↻ Refresh</button>
      </div>
      {!activity ? <p className="text-sm text-gray-400">Loading…</p> : (<>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[['Sales', `₹${activity.totals.sales}`], ['Bills', activity.totals.completed], ['Cash', `₹${activity.totals.cash}`], ['UPI', `₹${activity.totals.upi}`], ['Card', `₹${activity.totals.card}`], ['Held', activity.totals.held], ['Voided', activity.totals.voided]].map(([l, v]) => (
            <div key={l} className="bg-white border rounded-xl p-3 text-center"><p className="text-lg font-black text-gray-800">{v}</p><p className="text-[10px] text-gray-400 font-semibold uppercase">{l}</p></div>
          ))}
        </div>
        <div className="bg-white border rounded-xl divide-y">
          {activity.bills.length === 0 && <p className="p-3 text-sm text-gray-400">No bills yet today.</p>}
          {activity.bills.map(b => (
            <div key={b._id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">{b.billNo} <span className={`ml-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full ${b.status === 'completed' ? 'bg-green-100 text-green-700' : b.status === 'held' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{b.status}</span></p>
                <p className="text-[11px] text-gray-400">{new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {b.posUserName || 'POS'} · {b.items?.length || 0} items{b.paymentMethod ? ` · ${b.paymentMethod.toUpperCase()}` : ''}</p>
              </div>
              <p className="text-sm font-black text-gray-800 shrink-0">₹{b.total}</p>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );

  // ── Checkout: review/modify items, add more, pay, change ──────────
  const renderCheckout = () => {
    const total = activeBill.total;
    const t = Number(tendered);
    const hasT = tendered !== '' && Number.isFinite(t);
    const change = hasT ? Math.round((t - total) * 100) / 100 : 0;
    const short = hasT && t < total;
    const results = coSearch.trim() ? products.filter(p => p.name.toLowerCase().includes(coSearch.toLowerCase()) && p.stockQty > 0).slice(0, 6) : [];
    const addCoCode = (e) => {
      e.preventDefault();
      const code = Number(coCode.trim());
      if (!Number.isInteger(code)) return;
      const m = products.find(p => p.plu === code);
      if (!m) { beepError(); toast.error(`No product with code ${code}`); setCoCode(''); return; }
      if (m.stockQty === 0) { beepError(); toast.error(`${m.name} is out of stock`); setCoCode(''); return; }
      addItem(m._id, 1); setCoCode('');
    };
    const quick = [50, 100, 200, 500, 2000];
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-black text-gray-800">Checkout · {activeBill.billNo}</p>
            <button onClick={() => setCheckoutOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><FiX size={18} /></button>
          </div>

          {/* Items — modify quantities / remove */}
          <div className="mb-3">
            {activeBill.items.map(it => {
              const pid = String(it.product);
              const decimal = isDecimalUnit(it.unit);
              return (
                <div key={pid} className="flex items-center justify-between py-1.5 border-b">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{it.name}</p>
                    <p className="text-[11px] text-gray-400">₹{it.price}/{it.unit} · <span className="font-bold text-gray-600">₹{(it.price * it.quantity).toFixed(2)}</span></p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {decimal ? (
                      <>
                        <input value={lineQtyDrafts[pid] ?? String(it.quantity)} inputMode="decimal"
                          onChange={e => setLineQtyDrafts(d => ({ ...d, [pid]: e.target.value.replace(/[^0-9.]/g, '') }))}
                          onBlur={() => {
                            const v = lineQtyDrafts[pid]; if (v === undefined) return;
                            const q = Number(v);
                            if (v === '' || !Number.isFinite(q) || q <= 0) { setLineQtyDrafts(d => { const n = { ...d }; delete n[pid]; return n; }); return; }
                            setExactQuantity(it.product, q);
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          className="w-16 border rounded px-1.5 py-1 text-sm font-bold text-center" />
                        <span className="text-[10px] text-gray-400">{it.unit}</span>
                      </>
                    ) : (
                      <>
                        <button onClick={() => addItem(it.product, -1)} className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center"><FiMinus size={12} /></button>
                        <span className="text-sm font-bold w-6 text-center">{it.quantity}</span>
                        <button onClick={() => addItem(it.product, 1)} className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center"><FiPlus size={12} /></button>
                      </>
                    )}
                    <button onClick={() => removeItem(it.product)} title="Remove" className="w-7 h-7 rounded bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add one more item before paying */}
          <div className="bg-indigo-50/60 rounded-xl p-2.5 mb-3">
            <p className="text-[11px] font-bold text-indigo-700 mb-1.5">+ Add another item</p>
            <form onSubmit={addCoCode} className="flex gap-2 mb-1.5">
              <input value={coCode} onChange={e => setCoCode(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Code" inputMode="numeric"
                className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center font-bold" />
              <input value={coSearch} onChange={e => setCoSearch(e.target.value)} placeholder="…or search by name" className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
              <button type="submit" className="px-3 rounded-lg bg-indigo-600 text-white text-xs font-bold">Add</button>
            </form>
            {results.map(p => (
              <button key={p._id} onClick={() => { addItem(p._id, 1); setCoSearch(''); }}
                className="w-full flex items-center justify-between text-left bg-white border rounded-lg px-2.5 py-1.5 mb-1 text-xs">
                <span className="font-semibold text-gray-800 truncate">{p.name}{p.plu != null ? <span className="ml-1 text-indigo-600">#{p.plu}</span> : null}</span>
                <span className="text-gray-500 shrink-0">₹{p.price}/{p.unit} · +1</span>
              </button>
            ))}
          </div>

          {/* Totals */}
          <div className="border-t pt-2 mb-3 text-sm">
            {activeBill.discountAmount > 0 && <div className="flex justify-between text-xs text-green-600"><span>Discount ({activeBill.discountPercent}%)</span><span>−₹{activeBill.discountAmount.toFixed(2)}</span></div>}
            {activeBill.roundOff !== 0 && <div className="flex justify-between text-xs text-gray-500"><span>Round off</span><span>{activeBill.roundOff > 0 ? '+' : '−'}₹{Math.abs(activeBill.roundOff).toFixed(2)}</span></div>}
            <div className="flex justify-between font-black text-lg text-gray-900"><span>Total to pay</span><span>₹{total}</span></div>
          </div>

          {/* Payment mode */}
          <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Payment mode</p>
          <div className="flex gap-2 mb-3">
            {[['cash', '💵 Cash'], ['upi', '📱 UPI'], ['card', '💳 Card']].map(([m, label]) => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${paymentMethod === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
            ))}
          </div>

          {/* Cash received → change */}
          {paymentMethod === 'cash' ? (
            <div className="mb-3">
              <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">Amount received from customer</p>
              <input value={tendered} onChange={e => setTendered(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder={`₹ ${total}`} autoFocus
                className="w-full border-2 border-indigo-200 rounded-xl px-3 py-2.5 text-xl font-black text-center focus:border-indigo-500 focus:outline-none" />
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <button onClick={() => setTendered(String(total))} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700">Exact ₹{total}</button>
                {quick.filter(q => q >= total).slice(0, 3).map(q => (
                  <button key={q} onClick={() => setTendered(String(q))} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700">₹{q}</button>
                ))}
              </div>
              {hasT && (
                <div className={`mt-3 rounded-xl p-3 text-center ${short ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {short ? (
                    <p className="text-sm font-bold text-red-600">Short by ₹{Math.round((total - t) * 100) / 100}</p>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold text-green-700 uppercase">Return to customer</p>
                      <p className="text-3xl font-black text-green-700">₹{change}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-3">Collect ₹{total} by {paymentMethod.toUpperCase()}, then confirm.</p>
          )}

          <button onClick={completeSale} disabled={completing || (paymentMethod === 'cash' && (!hasT || short))}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            <FiPrinter size={16} /> {completing ? 'Completing…' : 'Confirm Payment & Print'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiZap className="text-amber-500" size={18} />
          <div>
            <p className="font-bold text-gray-800 text-sm">🏬 {posUser?.store?.name || 'Loading…'}</p>
            <p className="text-xs text-gray-400">{posUser?.name}{posUser?.phone ? ` · 📱 ${posUser.phone}` : ''}{posUser?.store?.city ? ` · ${posUser.store.city}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={togglePrinterConnection} disabled={connectingPrinter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 ${printerConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <FiBluetooth size={14} /> {connectingPrinter ? 'Connecting…' : printerConnected ? 'Printer Connected' : 'Connect Printer'}
          </button>
          <button onClick={printCodeList} disabled={printingList} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold disabled:opacity-50">
            <FiPrinter size={14} /> {printingList ? 'Printing…' : 'Code List'}
          </button>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><FiLogOut size={16} /></button>
        </div>
      </header>

      {/* View tabs */}
      <div className="bg-white border-b px-4 flex gap-1">
        {[['billing', '🧾 Billing'], ['orders', '📦 Online Orders'], ['activity', '📊 Today\'s Activity']].map(([k, label]) => {
          const pending = k === 'orders' ? onlineOrders.filter(o => ['confirmed', 'placed', 'preparing'].includes(o.orderStatus)).length : 0;
          return (
            <button key={k} onClick={() => setView(k)}
              className={`px-3 py-2 text-xs font-bold border-b-2 ${view === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>
              {label}{pending > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pending}</span>}
            </button>
          );
        })}
      </div>

      {view === 'billing' && (<>
      {/* Held bills tray */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {bills.map(b => (
          <button key={b._id} onClick={() => setActiveBillId(b._id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${activeBillId === b._id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {b.billNo} · ₹{b.total}
          </button>
        ))}
        <button onClick={newBill} disabled={bills.length >= MAX_HELD}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed text-xs font-bold text-indigo-600 disabled:opacity-40">
          <FiPlus size={12} /> New Bill ({bills.length}/{MAX_HELD})
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-5xl mx-auto w-full">
        {/* Product search */}
        <div>
          <form onSubmit={addByCode} className="flex gap-2 mb-2">
            <input ref={codeInputRef} value={codeInput} onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Enter code (e.g. 214)" inputMode="numeric" autoFocus
              className="w-40 border-2 border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold text-center focus:border-indigo-500 focus:outline-none" />
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold">Add</button>
          </form>
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {filteredProducts.map(p => {
              const decimal = isDecimalUnit(p.unit);
              const draft = qtyDrafts[p._id] ?? '1';
              return (
                <div key={p._id} className={`bg-white border rounded-lg p-2 ${(!activeBill || p.stockQty === 0) ? 'opacity-40' : ''}`}>
                  <p className="text-xs font-bold text-gray-800 truncate flex items-center gap-1">
                    {p.name}
                    {p.plu != null && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">{p.plu}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mb-1.5">₹{p.price}/{p.unit} · Stock {p.stockQty}</p>
                  {decimal ? (
                    <div className="flex items-center gap-1">
                      <input value={draft} inputMode="decimal" placeholder="1"
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9.]/g, '');
                          setQtyDrafts(d => ({ ...d, [p._id]: v }));
                        }}
                        disabled={!activeBill || p.stockQty === 0}
                        className="w-16 border rounded px-1.5 py-1 text-xs text-center disabled:bg-gray-50" />
                      <span className="text-[10px] text-gray-400">{p.unit}</span>
                      <button
                        onClick={() => {
                          const qty = Number(draft);
                          if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a quantity greater than 0');
                          addItem(p._id, qty);
                        }}
                        disabled={!activeBill || p.stockQty === 0}
                        className="ml-auto px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-40">
                        Add
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addItem(p._id, 1)} disabled={!activeBill || p.stockQty === 0}
                      className="w-full px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-40">
                      Add 1 {p.unit}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current bill */}
        <div className="bg-white border rounded-xl p-4 flex flex-col">
          {!activeBill ? (
            <p className="text-sm text-gray-400 m-auto">Start a new bill to begin.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-800">{activeBill.billNo}</p>
                <button onClick={voidBill} className="text-red-500 text-xs font-semibold flex items-center gap-1"><FiTrash2 size={12} /> Void</button>
              </div>
              <div className="flex-1 overflow-y-auto mb-3">
                {activeBill.items.length === 0 && <p className="text-xs text-gray-400">No items yet — tap a product to add.</p>}
                {activeBill.items.map(it => {
                  const pid = String(it.product);
                  const decimal = isDecimalUnit(it.unit);
                  return (
                    <div key={pid} className="flex items-center justify-between py-1.5 border-b">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{it.name}</p>
                        <p className="text-xs text-gray-400">₹{it.price}/{it.unit} × {it.quantity} = <span className="font-bold text-gray-600">₹{(it.price * it.quantity).toFixed(2)}</span></p>
                      </div>
                      {decimal ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            value={lineQtyDrafts[pid] ?? String(it.quantity)}
                            inputMode="decimal"
                            onChange={e => {
                              const v = e.target.value.replace(/[^0-9.]/g, '');
                              setLineQtyDrafts(d => ({ ...d, [pid]: v }));
                            }}
                            onBlur={() => {
                              const v = lineQtyDrafts[pid];
                              if (v === undefined) return;
                              const qty = Number(v);
                              if (v === '' || !Number.isFinite(qty) || qty <= 0) {
                                setLineQtyDrafts(d => { const n = { ...d }; delete n[pid]; return n; });
                                return;
                              }
                              setExactQuantity(it.product, qty);
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                            className="w-16 border rounded px-1.5 py-1 text-sm font-bold text-center" />
                          <span className="text-[10px] text-gray-400">{it.unit}</span>
                          <button onClick={() => removeItem(it.product)} title="Remove item"
                            className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => addItem(it.product, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><FiMinus size={12} /></button>
                          <span className="text-sm font-bold w-6 text-center">{it.quantity}</span>
                          <button onClick={() => addItem(it.product, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><FiPlus size={12} /></button>
                          <button onClick={() => removeItem(it.product)} title="Remove item"
                            className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 font-semibold shrink-0">Offer %</span>
                  <input value={discountDraft} inputMode="decimal" placeholder="0"
                    onChange={e => setDiscountDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-16 border rounded px-1.5 py-1 text-sm text-center" />
                  <button onClick={applyDiscount} disabled={applyingDiscount}
                    className="px-2.5 py-1 rounded bg-gray-100 text-gray-700 text-xs font-bold disabled:opacity-50">
                    {applyingDiscount ? 'Applying…' : 'Apply'}
                  </button>
                </div>
                {(activeBill.discountAmount > 0 || activeBill.roundOff !== 0) && (
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Subtotal</span><span>₹{activeBill.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {activeBill.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 mb-1">
                    <span>Discount ({activeBill.discountPercent}%)</span><span>−₹{activeBill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {activeBill.roundOff !== 0 && (
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Round Off</span><span>{activeBill.roundOff > 0 ? '+' : '−'}₹{Math.abs(activeBill.roundOff).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Total</span><span>₹{activeBill.total}</span>
                </div>
              </div>
              <button onClick={openCheckout} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                Checkout · ₹{activeBill.total}
              </button>
            </>
          )}
        </div>
      </div>
      </>)}

      {view === 'orders' && renderOrders()}
      {view === 'activity' && renderActivity()}
      {checkoutOpen && activeBill && renderCheckout()}
    </div>
  );
}
