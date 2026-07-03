// ============================================
// REORDER BUTTON — available on every order,
// regardless of status. Adds all items back to
// the vertical's cart at today's prices.
// ============================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useCart } from '../../context/CartContext';

export default function ReorderButton({ order, compact = false }) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [busy, setBusy] = useState(false);

  const reorder = async (e) => {
    // The order card is a <Link> — don't navigate to the order detail
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/v2/orders/${order.vertical}/${order.id}/reorder`);

      if (data.mode === 'redirect') {
        toast(data.message || 'Taking you to the shop…', { icon: '🛒', duration: 4000 });
        navigate(data.redirect);
        return;
      }

      if (data.mode === 'client') {
        // Parent-app cart lives on the client — add each item locally
        let added = 0;
        for (const { product, quantity } of data.items || []) {
          try { addToCart(product, quantity); added++; } catch { /* skip */ }
        }
        if (!added) { toast.error('None of the items are available right now'); return; }
        if (data.skipped?.length) toast(`Unavailable now: ${data.skipped.join(', ')}`, { icon: 'ℹ️', duration: 4000 });
        toast.success(`${added} item${added > 1 ? 's' : ''} added to cart`);
        navigate(data.cartPath || '/cart');
        return;
      }

      // Server-side cart (Koyambedu / EptoFresh)
      if (!data.added) { toast.error('None of the items are available right now'); return; }
      if (data.skipped?.length) toast(`Unavailable now: ${data.skipped.join(', ')}`, { icon: 'ℹ️', duration: 4000 });
      if (data.replacedCart) toast('Your cart was replaced with this order (one seller per cart)', { icon: '🛒', duration: 4000 });
      toast.success(`${data.added} item${data.added > 1 ? 's' : ''} added to cart at today's prices`);
      // Full navigation so the cart page loads fresh server state
      window.location.assign(data.cartPath);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not reorder');
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button onClick={reorder} disabled={busy}
        className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-lg active:scale-95 transition disabled:opacity-50"
        style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #86efac' }}>
        <FiRefreshCw size={11} className={busy ? 'animate-spin' : ''} />
        {busy ? 'Adding…' : 'Reorder'}
      </button>
    );
  }

  return (
    <button onClick={reorder} disabled={busy}
      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-white text-sm active:scale-[0.98] transition disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg,#065f46,#16a34a)', boxShadow: '0 4px 14px rgba(22,163,74,0.35)' }}>
      <FiRefreshCw size={15} className={busy ? 'animate-spin' : ''} />
      {busy ? 'Adding to cart…' : 'Reorder — add all items to cart'}
    </button>
  );
}
