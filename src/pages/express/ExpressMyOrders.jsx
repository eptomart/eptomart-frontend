// ============================================
// EPTOMART EXPRESS — My Orders
// Order list with declined items, refunds (wallet / original payment),
// the customer's refund choice, wallet balance and the store's GST invoice.
// ============================================
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiZap, FiPackage, FiFileText } from 'react-icons/fi';
import api from '../../utils/api';

const STATUS_LABEL = {
  placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_COLOR = {
  placed: 'bg-gray-100 text-gray-600', confirmed: 'bg-blue-100 text-blue-700',
  preparing: 'bg-amber-100 text-amber-700', out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
};

export default function ExpressMyOrders() {
  const [orders, setOrders] = useState(null);
  const [wallet, setWallet] = useState(null);

  const load = () => {
    api.get('/express/my-orders').then(({ data }) => setOrders(data.orders || [])).catch(() => setOrders([]));
    api.get('/express/wallet').then(({ data }) => setWallet(data)).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const changePref = async (o, preference) => {
    try {
      await api.patch(`/express/orders/${o._id}/refund-preference`, { preference });
      toast.success(preference === 'source' ? 'Refunds will go to your original payment' : 'Refunds will go to your wallet');
      setOrders(list => list.map(x => x._id === o._id ? { ...x, refundPreference: preference } : x));
    } catch (err) { toast.error(err?.response?.data?.message || 'Could not change'); }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <FiZap className="text-amber-500" size={20} />
        <h1 className="text-xl font-black text-indigo-900">Eptomart Express — My Orders</h1>
      </div>

      {wallet && (wallet.balance > 0 || wallet.transactions?.length > 0) && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-indigo-900">Express wallet</p>
            <p className="text-lg font-black text-indigo-700">₹{wallet.balance}</p>
          </div>
          <p className="text-[11px] text-indigo-500">Refunds for items a store could not supply land here. Use it at your next Express checkout.</p>
          {wallet.transactions?.slice(0, 3).map((t, i) => (
            <p key={i} className="text-[11px] text-gray-500 mt-1">{t.type === 'credit' ? '+' : '−'}₹{t.amount} · {t.note || t.category} · {new Date(t.at).toLocaleDateString('en-IN')}</p>
          ))}
        </div>
      )}

      {orders === null ? (
        <p className="text-sm text-gray-400">Loading…</p>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <FiPackage size={32} className="mx-auto mb-2" />
          <p className="text-sm">No orders yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {orders.map(o => {
            const refunded = o.pricing?.refundedAmount || 0;
            const open = !['delivered', 'cancelled'].includes(o.orderStatus);
            return (
              <div key={o._id} className="bg-white border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-bold text-gray-800">{o.orderId}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${STATUS_COLOR[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[o.orderStatus] || o.orderStatus}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mb-2">{new Date(o.createdAt).toLocaleString('en-IN')}</p>
                <ul className="text-xs text-gray-600 mb-2">
                  {o.items?.map((it, i) => it.status === 'declined'
                    ? <li key={i} className="text-red-500"><span className="line-through">{it.name} × {it.quantity}</span> — not available{it.declineReason ? ` (${it.declineReason})` : ''} · refund ₹{it.refundAmount}</li>
                    : <li key={i}>{it.name} × {it.quantity} — ₹{it.lineTotal}</li>)}
                </ul>
                <p className="font-bold text-gray-800 text-sm pt-2 border-t">
                  Total: ₹{o.pricing?.total}
                  {refunded > 0 && <span className="text-red-500 font-semibold text-xs"> · refunded ₹{refunded}</span>}
                </p>

                {o.refunds?.length > 0 && (
                  <div className="mt-2 bg-red-50 rounded-lg p-2">
                    {o.refunds.map((r, i) => (
                      <p key={i} className="text-[11px] text-gray-700">
                        ₹{r.amount} → {r.mode === 'source' ? 'original payment' : 'Eptomart wallet'}
                        {r.status === 'completed' && r.mode === 'wallet' ? ' · credited' : ''}
                        {r.mode === 'source' && r.status !== 'failed' ? ' · 5–7 working days' : ''}
                        {r.fallbackToWallet ? ' · credited to wallet instead (bank refund could not be processed)' : ''}
                      </p>
                    ))}
                  </div>
                )}

                {o.paymentStatus === 'paid' && open && !o.isDemoOrder && (
                  <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-500">
                    If an item is unavailable, refund to:
                    {['wallet', 'source'].map(k => (
                      <button key={k} onClick={() => o.refundPreference !== k && changePref(o, k)}
                        className={`px-2 py-0.5 rounded-full font-bold ${o.refundPreference === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                        {k === 'wallet' ? 'Wallet' : 'Original payment'}
                      </button>
                    ))}
                  </div>
                )}

                {o.paymentStatus === 'paid' && o.orderStatus !== 'cancelled' && (
                  <Link to={`/express/invoice/${o.orderId}`} className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 underline">
                    <FiFileText size={12} /> {o.orderStatus === 'delivered' ? 'View invoice' : 'View proforma invoice'}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
