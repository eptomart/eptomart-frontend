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
// ============================================
import { useState, useEffect, useMemo, useRef } from 'react';
import { FiChevronDown, FiChevronUp, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';

export default function KoyambeduAddMoreItems({ order, onAdded }) {
  const [eligibility, setEligibility] = useState(null); // null = still checking
  const [open,        setOpen]        = useState(false);
  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState([]);
  const [searching,   setSearching]   = useState(false);
  const [items,       setItems]       = useState([]); // { productId, name, unit, gradeKey, gradeName, qty, currentQty }
  const [paying,      setPaying]      = useState(false);
  const debounce = useRef(null);

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

  const searchProducts = (q) => {
    setQuery(q);
    clearTimeout(debounce.current);
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/koyambedu/products?search=${encodeURIComponent(q.trim())}&limit=8`);
        setResults(data.products || []);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
  };

  const addProduct = (p) => {
    const gradeKey  = p.gradesEnabled ? (p.grades?.find(g => g.isActive)?.gradeKey || 'premium') : null;
    const gradeName = p.gradesEnabled ? (p.grades?.find(g => g.gradeKey === gradeKey)?.gradeName || gradeKey) : null;
    if (items.some(it => it.productId === p._id && it.gradeKey === gradeKey)) {
      toast.error(`${p.name} is already in your list`);
      return;
    }
    const currentQty = currentQtyMap.get(`${p._id}__${gradeKey || ''}`) || 0;
    // No minQty floor — that's a fresh-cart-checkout rule, not applicable
    // when topping up an order that already cleared the minimum once.
    setItems(prev => [...prev, {
      productId: p._id, name: p.name, unit: p.unit, gradeKey, gradeName,
      currentQty, qty: currentQty + 1,
    }]);
    setQuery(''); setResults([]);
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
              setItems([]); setOpen(false);
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
          <div className="relative mb-2.5">
            <input
              value={query}
              onChange={e => searchProducts(e.target.value)}
              placeholder="Search Koyambedu Daily products…"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm"
            />
            {(searching || results.length > 0) && query.trim().length >= 2 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg mt-1 z-10 max-h-56 overflow-y-auto shadow-lg">
                {searching && <div className="p-2.5 text-xs text-gray-400">Searching…</div>}
                {!searching && results.map(p => (
                  <button key={p._id} onClick={() => addProduct(p)}
                    className="w-full flex justify-between items-center px-2.5 py-2 border-b border-gray-100 last:border-0 text-left">
                    <span className="text-sm">{p.name}</span>
                    <span className="text-[11px] font-bold text-green-700">{formatINR(p.currentPrice)}/{p.unit}</span>
                  </button>
                ))}
                {!searching && results.length === 0 && <div className="p-2.5 text-xs text-gray-400">No products found</div>}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div className="border border-gray-100 rounded-lg mb-2.5">
              {items.map(it => (
                <div key={`${it.productId}__${it.gradeKey || ''}`} className="flex items-center gap-2 px-2.5 py-2 border-b border-gray-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{it.name}{it.gradeName ? ` (${it.gradeName})` : ''}</p>
                    {it.currentQty > 0 && <p className="text-[11px] text-gray-400 mt-0.5">Already on order: {it.currentQty} {it.unit}</p>}
                  </div>
                  <input
                    type="number" step="any"
                    min={it.currentQty > 0 ? it.currentQty + 1 : 1}
                    value={it.qty}
                    onChange={e => updateQty(it.productId, it.gradeKey, e.target.value)}
                    className="w-16 px-1.5 py-1 rounded border border-gray-200 text-xs text-right"
                  />
                  <span className="text-[11px] text-gray-500 w-7">{it.unit}</span>
                  <button onClick={() => removeItem(it.productId, it.gradeKey)} className="text-red-500 p-0.5">
                    <FiX size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-gray-400 mb-2.5">
            You can only add new items or increase quantity — items already on the order can't be removed or reduced. You'll pay only for what you add now, as a separate payment.
          </p>

          <button
            onClick={handlePay}
            disabled={!items.length || paying}
            className="w-full py-2.5 rounded-lg font-bold text-sm text-white disabled:bg-gray-100 disabled:text-gray-400"
            style={items.length ? { background: '#065f46' } : undefined}
          >
            {paying ? 'Processing…' : 'Pay & Add Items'}
          </button>
        </div>
      )}
    </div>
  );
}
