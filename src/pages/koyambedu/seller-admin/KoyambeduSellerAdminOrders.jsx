// ============================================
// KOYAMBEDU SELLER ADMIN — Orders View
// Filters: order date, delivery date, delivery slot
// Shows all items per order that belong to this SA's sellers
// ============================================
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft, FiFilter, FiPackage, FiChevronDown, FiChevronUp,
} from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const STATUS_COLOR = {
  placed:                 'bg-blue-100 text-blue-700',
  pending_confirmation:   'bg-yellow-100 text-yellow-700',
  price_revision_pending: 'bg-orange-100 text-orange-700',
  confirmed:              'bg-green-100 text-green-700',
  packing:                'bg-purple-100 text-purple-700',
  dispatched:             'bg-sky-100 text-sky-700',
  delivered:              'bg-emerald-100 text-emerald-700',
  cancelled:              'bg-red-100 text-red-700',
  refund_initiated:       'bg-gray-100 text-gray-600',
};
const STATUS_LABEL = {
  placed: 'Placed', pending_confirmation: 'Awaiting', price_revision_pending: 'Price Revision',
  confirmed: 'Confirmed', packing: 'Packing', dispatched: 'On the Way',
  delivered: 'Delivered', cancelled: 'Cancelled', refund_initiated: 'Refund',
};

const SLOTS = ['Morning (6AM-9AM)', 'Afternoon (12PM-3PM)', 'Evening (4PM-7PM)'];

export default function KoyambeduSellerAdminOrders() {
  const navigate = useNavigate();
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState({});

  const [filters, setFilters] = useState({ orderDate: '', deliveryDate: '', deliverySlot: '' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.orderDate)    params.orderDate    = filters.orderDate;
      if (filters.deliveryDate) params.deliveryDate = filters.deliveryDate;
      if (filters.deliverySlot) params.deliverySlot = filters.deliverySlot;
      const { data } = await api.get('/koyambedu/seller-admin/orders', { params });
      setOrders(data.orders || []);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="min-h-screen pb-10" style={{ background: '#F5F4F2' }}>

      {/* Header */}
      <div className="sticky top-0 z-30" style={{
        background: 'linear-gradient(135deg,#064e3b 0%,#065f46 50%,#059669 100%)',
        boxShadow: '0 4px 24px rgba(6,95,70,0.3)',
        paddingTop: 'env(safe-area-inset-top)',
      }}>
        <div className="px-4 py-3.5 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 active:scale-90 transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiArrowLeft size={16} className="text-white" />
          </button>
          <div className="flex-1">
            <h1 className="text-white font-extrabold text-base leading-tight">Received Orders</h1>
            <p className="text-emerald-100 text-[10px] opacity-80">{orders.length} order{orders.length !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={() => setShowFilters(f => !f)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-white active:scale-95 transition"
            style={{ background: 'rgba(255,255,255,0.2)' }}>
            <FiFilter size={12} /> Filters {(filters.orderDate || filters.deliveryDate || filters.deliverySlot) ? '●' : ''}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-emerald-200 mb-1">Order Date</p>
              <input type="date" value={filters.orderDate}
                onChange={e => setFilters(f => ({ ...f, orderDate: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-xs bg-white/90 text-gray-800 outline-none" />
            </div>
            <div>
              <p className="text-[10px] text-emerald-200 mb-1">Delivery Date</p>
              <input type="date" value={filters.deliveryDate}
                onChange={e => setFilters(f => ({ ...f, deliveryDate: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-xs bg-white/90 text-gray-800 outline-none" />
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-emerald-200 mb-1">Delivery Slot</p>
              <select value={filters.deliverySlot}
                onChange={e => setFilters(f => ({ ...f, deliverySlot: e.target.value }))}
                className="w-full rounded-xl px-3 py-2 text-xs bg-white/90 text-gray-800 outline-none">
                <option value="">All Slots</option>
                {SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <button onClick={() => setFilters({ orderDate: '', deliveryDate: '', deliverySlot: '' })}
              className="col-span-2 text-xs text-emerald-200 underline text-center">
              Clear filters
            </button>
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-8">
          <FiPackage size={40} className="text-gray-300" />
          <p className="font-bold text-gray-600">No orders found</p>
          <p className="text-gray-400 text-sm">Try adjusting your filters</p>
        </div>
      )}

      <div className="px-4 mt-4 space-y-3">
        {orders.map(order => {
          const isExpanded = expanded[order._id];
          const myItems = order.myItems || order.items || [];
          const myTotal = myItems.reduce((s, it) => {
            const p = it.finalPrice || it.orderedPrice || 0;
            return s + p * it.quantity;
          }, 0);

          return (
            <div key={order._id} className="bg-white rounded-2xl overflow-hidden"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.04)' }}>

              {/* Order header row */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{order.orderId}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[order.orderStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[order.orderStatus] || order.orderStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                  <span>📦 {myItems.length} item{myItems.length !== 1 ? 's' : ''} from your sellers</span>
                  <span className="font-bold text-green-700">₹{myTotal.toFixed(0)}</span>
                </div>

                {(order.deliveryDate || order.deliverySlot) && (
                  <div className="text-xs text-gray-500 mb-2">
                    {order.deliveryDate && (
                      <span className="mr-3">📅 {new Date(order.deliveryDate).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}</span>
                    )}
                    {order.deliverySlot && <span>🕐 {order.deliverySlot}</span>}
                  </div>
                )}

                <button onClick={() => toggle(order._id)}
                  className="flex items-center gap-1 text-xs font-bold text-green-700 active:opacity-70">
                  {isExpanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                  {isExpanded ? 'Hide items' : 'View all items'}
                </button>
              </div>

              {/* Expanded items */}
              {isExpanded && (
                <div className="border-t border-gray-50">
                  <div className="divide-y divide-gray-50">
                    {myItems.map((item, i) => {
                      const price = item.finalPrice || item.orderedPrice || 0;
                      const line  = price * item.quantity;
                      return (
                        <div key={i} className="px-4 py-3 flex items-center gap-3">
                          {item.product?.images?.[0]?.url
                            ? <img src={item.product.images[0].url} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                            : <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0 text-lg">🌿</div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-800 text-sm">{item.name}</p>
                            <p className="text-xs text-gray-400">{item.quantity}{item.unit} × ₹{price}/{item.unit}</p>
                          </div>
                          <p className="font-bold text-green-700 text-sm shrink-0">₹{line.toFixed(0)}</p>
                        </div>
                      );
                    })}
                  </div>
                  {/* Buyer info (phone hidden per security rules) */}
                  <div className="px-4 py-3 border-t border-gray-50 text-xs text-gray-500">
                    Customer: {order.buyer?.name || 'Guest'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
