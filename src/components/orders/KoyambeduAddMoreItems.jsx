// ============================================
// "ADD MORE ITEMS" — Koyambedu Daily only.
// Lets the customer top up an already-paid, not-yet-dispatched order with
// new items or MORE of an item already on it (never fewer, never removed),
// paid via a separate Razorpay charge for just what's added, up until the
// same same-day cutoff used at checkout.
//
// Rendered only from UnifiedOrderDetail.jsx when order.vertical ===
// 'koyambedu' — every other vertical is untouched. Talks directly to the
// koyambedu-specific endpoints (order.id is the KoyambeduOrder Mongo _id,
// per dtoHelpers.baseCard: `id: String(doc._id)`), not the v2/unified API.
//
// Shows a live priced quote (via /amend/quote, no side effects) as the
// customer builds their list, including a warning + fee breakdown if
// adding these items pushes the order's combined weight past the
// small-order discount threshold it was on — see priceAmendmentRequest
// in koyambeduController.js for the actual calculation.
// ============================================
import { useState, useEffect, useMemo, useRef } from 'react';
import { FiChevronDown, FiChevronUp, FiX, FiAlertTriangle, FiImage } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';

const imgOf = (p) => {
  const imgs = p?.images;
  if (!Array.isArray(imgs) || !imgs.length) return null;
  return imgs.find(i => i.isPrimary)?.url || imgs[0]?.url || null;
};

const priceOf = (p) => p.gradesEnabled ? (p.lowestUnitPrice ?? p.currentPrice) : p.currentPrice;

const activeGrades = (p) => (p.gradesEnabled ? (p.grades || []).filter(g => g.isActive && g.gradeKey !== 'base') : []);

export default function KoyambeduAddMoreItems({ order, onAdded }) {
  const [eligibility, setEligibility] = useState(null); // null = still checking
  const [open,        setOpen]        = useState(false);
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [gradePicker, setGradePicker] = useState(null); // product awaiting a grade choice
  const [items,       setItems]       = useState([]);   // { productId, name, image, unit, gradeKey, gradeName, price, qty, currentQty }
  const [quote,       setQuote]       = useState(null);
  const [quoting,     setQuoting]     = useState(false);
  const [paying,      setPaying]      = useState(false);
  const searchDebounce = useRef(null);
  const quoteDebounce   = useRef(null);

  useEffect(() => {
    api.get(`/koyambedu/orders/${order.id}/amend/eligibility`)
      .then(({ data }) => setEligibility(data))
      .catch(() => setEligibility({ allowed: false, reason: 'Could not check eligibility' }));
  }, [order.id]);

  // Qty already on the order per product+grade — from the canonical
  // itemsConfirmed rows (declined items already excluded by the adapter).
  const currentQtyMap = useMemo(() => {
    const m = new Map();
    for (const it of order.itemsConfirmed || order.itemsOrdered || []) {
      const key = `${it.productId}__${it.gradeKey || ''}`;
      m.set(key, (m.get(key) || 0) + Number(it.quantity || 0));
    }
    return m;
  }, [order.itemsConfirmed, order.itemsOrdered]);

  // ── Live priced quote — refreshed whenever the item list changes ───
  useEffect(() => {
    clearTimeout(quoteDebounce.current);
    if (!items.length) { setQuote(null); return; }
    quoteDebounce.current = setTimeout(async () => {
      setQuoting(true);
      try {
        const payload = { items: items.map(it => ({ productId: it.productId, gradeKey: it.gradeKey, qty: it.qty })) };
        const { data } = await api.post(`/koyambedu/orders/${order.id}/amend/quote`, payload);
        setQuote(data);
      } catch (err) {
        setQuote({ success: false, message: err?.response?.data?.message || 'Could not price this list' });
      } finally {
        setQuoting(false);
      }
    }, 350);
    return () => clearTimeout(quoteDebounce.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, order.id]);

  const searchProducts = (q) => {
    setQuery(q);
    setGradePicker(null);
    clearTimeout(searchDebounce.current);
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    searchDebounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/koyambedu/products?search=${encodeURIComponent(q.trim())}&limit=8`);
        setResults(data.products || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  };

  const finalizeAdd = (p, gradeKey, gradeName, price) => {
    if (items.some(it => it.productId === p._id && it.gradeKey === gradeKey)) {
      toast.error(`${p.name} is already in your list`);
      return;
    }
    const currentQty = currentQtyMap.get(`${p._id}__${gradeKey || ''}`) || 0;
    // No minQty floor — that's a fresh-cart-checkout rule, not applicable
    // when topping up an order that already cleared the minimum once.
    setItems(prev => [...prev, {
      productId: p._id, name: p.name, image: imgOf(p), unit: p.unit, gradeKey, gradeName,
      price, currentQty, qty: currentQty + 1,
    }]);
    setQuery(''); setResults([]); setGradePicker(null);
  };

  const addProduct = (p) => {
    const grades = activeGrades(p);
    if (grades.length > 1) {
      setGradePicker(p); // let the customer pick which grade before adding
      return;
    }
    const grade = grades[0] || null;
    finalizeAdd(p, grade?.gradeKey || null, grade?.gradeName || null, priceOf(p));
  };

  const removeItem = (productId, gradeKey) =>
    setItems(prev => prev.filter(it => !(it.productId === productId && it.gradeKey === gradeKey)));

  const updateQty = (productId, gradeKey, qty) => {
    setItems(prev => prev.map(it => {
      if (it.productId !== productId || it.gradeKey !== gradeKey) return it;
      // Increase-only, enforced here too — the server is the real gate.
      const floor = it.currentQty > 0 ? it.currentQty + 1 : 1;
      return { ...it, qty: Math.max(floor, Number(qty) || floor) };
    }));
  };

  const handlePay = async () => {
    if (!items.length) { toast.error('Add at least one item'); return; }
    setPaying(true);
    try {
      const payload = { items: items.map(it => ({ productId: it.productId, gradeKey: it.gradeKey, qty: it.qty })) };
      const { data: rzp } = await api.post(`/koyambedu/orders/${order.id}/amend/checkout`, payload);

      const launch = () => {
        const rzpModal = new window.Razorpay({
          key: rzp.keyId, amount: rzp.amount * 100, currency: 'INR',
          name: 'Koyambedu Daily', description: `Add items to order #${order.orderId}`,
          order_id: rzp.rzpOrderId,
          handler: async (resp) => {
            try {
              await api.post(`/koyambedu/orders/${order.id}/amend/verify`, {
                razorpayOrderId:   resp.razorpay_order_id,
                razorpayPaymentId: resp.razorpay_payment_id,
                razorpaySignature: resp.razorpay_signature,
              });
              toast.success('Items added to your order!');
              setItems([]); setQuote(null); setOpen(false);
              onAdded?.();
            } catch {
              toast.error('Payment verification failed. Please contact support if the amount was deducted.');
            } finally { setPaying(false); }
          },
          modal: { ondismiss: () => { toast('Payment cancelled', { icon: '💳' }); setPaying(false); } },
          theme: { color: '#16a34a' },
        });
        rzpModal.open();
      };
      if (!window.Razorpay) {
        const s = document.createElement('script');
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = launch;
        document.body.appendChild(s);
      } else launch();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to start payment');
      setPaying(false);
    }
  };

  if (eligibility === null || !eligibility.allowed) return null; // hide entirely rather than show a dead-end button

  const payDisabled = !items.length || paying || quoting || !quote?.success;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className="font-bold text-sm text-gray-800">+ Add More Items</p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {eligibility.cutoffTime ? `Add items or increase quantity until ${eligibility.cutoffTime} today` : 'Add items or increase quantity to this order'}
          </p>
        </div>
        {open ? <FiChevronUp className="text-gray-400 shrink-0" /> : <FiChevronDown className="text-gray-400 shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4">
          <div className="relative mb-3">
            <input
              value={query}
              onChange={e => searchProducts(e.target.value)}
              placeholder="Search Koyambedu Daily products…"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
            />
            {(searching || results.length > 0) && query.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl mt-1 z-20 max-h-72 overflow-y-auto shadow-lg">
                {searching && <div className="p-3 text-xs text-gray-400">Searching…</div>}
                {!searching && results.map(p => {
                  const grades = activeGrades(p);
                  const price  = priceOf(p);
                  return (
                    <button key={p._id} onClick={() => addProduct(p)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 border-b border-gray-100 last:border-0 text-left hover:bg-gray-50">
                      <div className="w-11 h-11 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                        {imgOf(p) ? <img src={imgOf(p)} alt="" className="w-full h-full object-cover" /> : <FiImage size={16} className="text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{p.name}</p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {p.seller?.businessName || 'Koyambedu Market'}{grades.length > 1 ? ` · ${grades.length} grades` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold text-green-700">{formatINR(price)}</p>
                        <p className="text-[10px] text-gray-400">/{p.unit}</p>
                      </div>
                    </button>
                  );
                })}
                {!searching && results.length === 0 && <div className="p-3 text-xs text-gray-400">No products found</div>}
              </div>
            )}
          </div>

          {gradePicker && (
            <div className="border border-gray-200 rounded-lg p-2.5 mb-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 mb-2">Choose a grade for {gradePicker.name}</p>
              <div className="flex flex-wrap gap-1.5">
                {activeGrades(gradePicker).map(g => (
                  <button key={g.gradeKey}
                    onClick={() => finalizeAdd(gradePicker, g.gradeKey, g.gradeName || g.gradeKey,
                      (g.variants || []).find(v => v.finalPrice)?.finalPrice || priceOf(gradePicker))}
                    className="px-2.5 py-1.5 rounded-full bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:border-green-400"
                  >
                    {g.gradeName || g.gradeKey}
                  </button>
                ))}
                <button onClick={() => setGradePicker(null)} className="px-2.5 py-1.5 rounded-full text-xs text-gray-400">Cancel</button>
              </div>
            </div>
          )}

          {items.length > 0 && (
            <div className="border border-gray-100 rounded-xl mb-3 overflow-hidden">
              {items.map(it => (
                <div key={`${it.productId}__${it.gradeKey || ''}`} className="flex items-center gap-2.5 px-2.5 py-2.5 border-b border-gray-100 last:border-0">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden">
                    {it.image ? <img src={it.image} alt="" className="w-full h-full object-cover" /> : <FiImage size={14} className="text-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{it.name}{it.gradeName ? ` (${it.gradeName})` : ''}</p>
                    <p className="text-[11px] text-gray-400">
                      {formatINR(it.price)}/{it.unit}{it.currentQty > 0 ? ` · already on order: ${it.currentQty} ${it.unit}` : ''}
                    </p>
                  </div>
                  <input
                    type="number" step="any"
                    min={it.currentQty > 0 ? it.currentQty + 1 : 1}
                    value={it.qty}
                    onChange={e => updateQty(it.productId, it.gradeKey, e.target.value)}
                    className="w-16 px-1.5 py-1.5 rounded border border-gray-200 text-xs text-right"
                  />
                  <span className="text-[11px] text-gray-500 w-7">{it.unit}</span>
                  <button onClick={() => removeItem(it.productId, it.gradeKey)} className="text-red-500 p-0.5 shrink-0">
                    <FiX size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Live priced breakdown ── */}
          {items.length > 0 && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-3 text-xs">
              {quoting && <p className="text-gray-400">Calculating…</p>}
              {!quoting && quote?.success === false && (
                <p className="text-red-600 font-semibold">{quote.message}</p>
              )}
              {!quoting && quote?.success !== false && quote && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>Items subtotal</span>
                    <span>{formatINR(quote.itemsAmount)}</span>
                  </div>
                  {quote.willExceedSmallOrder && (
                    <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex gap-2">
                      <FiAlertTriangle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-amber-800 font-semibold">
                          This much extra weight moves your order out of the small-order discount.
                        </p>
                        <p className="text-amber-700 mt-1">
                          Delivery and platform charges switch to the standard rate — extra {formatINR(quote.feeSurcharge)} added below.
                        </p>
                      </div>
                    </div>
                  )}
                  {quote.feeSurcharge > 0 && (
                    <div className="flex justify-between text-gray-600 mt-1.5">
                      <span>Delivery/platform fee adjustment</span>
                      <span>+{formatINR(quote.feeSurcharge)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-gray-800 pt-1.5 mt-1.5 border-t border-gray-200">
                    <span>Total to pay now</span>
                    <span>{formatINR(quote.totalAmount)}</span>
                  </div>
                </>
              )}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mb-2.5">
            You can only add new items or increase quantity — items already on the order can't be removed or reduced.
          </p>

          <button
            onClick={handlePay}
            disabled={payDisabled}
            className="w-full py-2.5 rounded-lg font-bold text-sm text-white disabled:bg-gray-100 disabled:text-gray-400"
            style={!payDisabled ? { background: '#065f46' } : undefined}
          >
            {paying ? 'Processing…' : quote?.success && quote.totalAmount ? `Pay ${formatINR(quote.totalAmount)} & Add Items` : 'Pay & Add Items'}
          </button>
        </div>
      )}
    </div>
  );
}
