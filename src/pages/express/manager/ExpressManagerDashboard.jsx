// ============================================
// EPTOMART EXPRESS — Store Manager Dashboard
// Everything a Store Manager needs day-to-day: fulfil incoming orders,
// toggle product/store availability, request more stock. Scoped entirely
// to their own store by the backend (protectExpressManager + req.manager).
// ============================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiZap, FiLogOut, FiGrid, FiPackage, FiToggleLeft, FiToggleRight,
  FiClipboard, FiPlus, FiTruck,
} from 'react-icons/fi';
import expressManagerApi, { getManagerToken, clearManagerToken } from '../../../utils/expressManagerApi';

const TABS = [
  { key: 'orders',    label: 'Orders',    Icon: FiPackage },
  { key: 'products',  label: 'Products',  Icon: FiGrid },
  { key: 'inventory', label: 'Inventory', Icon: FiClipboard },
];

export default function ExpressManagerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('orders');
  const [manager, setManager] = useState(null);
  const [store, setStore] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!getManagerToken()) { navigate('/express/manager/login'); return; }
    expressManagerApi.get('/me').then(({ data }) => setManager(data.manager)).catch(() => {});
    expressManagerApi.get('/store').then(({ data }) => setStore(data.store)).catch(() => {});
    expressManagerApi.get('/dashboard').then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  const toggleStore = async () => {
    try {
      const { data } = await expressManagerApi.patch('/store/toggle');
      setStore(data.store);
      toast.success(data.store.isActive ? 'Store turned ON' : 'Store turned OFF');
    } catch { toast.error('Failed to update store status'); }
  };

  const logout = () => { clearManagerToken(); navigate('/express/manager/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiZap className="text-amber-500" size={18} />
          <div>
            <p className="font-bold text-gray-800 text-sm">{store?.name || 'Loading…'}</p>
            <p className="text-xs text-gray-400">{manager?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {store && (
            <button onClick={toggleStore}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {store.isActive ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {store.isActive ? 'Store ON' : 'Store OFF'}
            </button>
          )}
          <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><FiLogOut size={16} /></button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              ['Pending', stats.pendingOrders],
              ["Today's Orders", stats.todayOrders],
              ['Delivered Today', stats.deliveredToday],
              ['Low Stock', stats.lowStockCount],
            ].map(([label, val]) => (
              <div key={label} className="bg-white border rounded-xl p-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-lg font-black text-indigo-900">{val}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 rounded-xl p-1 mb-4 w-fit bg-indigo-50">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              style={tab === t.key ? { background: '#fff', color: '#3730a3' } : { color: '#6b7280' }}>
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'orders'    && <OrdersTab />}
        {tab === 'products'  && <ProductsTab />}
        {tab === 'inventory' && <InventoryTab />}
      </div>
    </div>
  );
}

const NEXT_STATUS = {
  confirmed: 'preparing',
  preparing: 'out_for_delivery',
  out_for_delivery: 'delivered',
};
const NEXT_LABEL = {
  confirmed: 'Start Preparing',
  preparing: 'Out for Delivery',
  out_for_delivery: 'Mark Delivered',
};

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [expenseForm, setExpenseForm] = useState({}); // orderId -> { partner, amount }

  const load = () => expressManagerApi.get('/orders').then(({ data }) => setOrders(data.orders || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const advance = async (order) => {
    const next = NEXT_STATUS[order.orderStatus];
    if (!next) return;
    try {
      await expressManagerApi.patch(`/orders/${order._id}/status`, { status: next });
      toast.success(`Order marked ${next.replace(/_/g, ' ')}`);
      load();
    } catch { toast.error('Failed to update order'); }
  };

  const saveExpense = async (orderId) => {
    const form = expenseForm[orderId];
    if (!form?.amount) return toast.error('Enter the delivery amount');
    try {
      await expressManagerApi.patch(`/orders/${orderId}/delivery-expense`, form);
      toast.success('Delivery expense recorded');
      load();
    } catch { toast.error('Failed to record expense'); }
  };

  return (
    <div className="grid gap-3">
      {orders.map(o => (
        <div key={o._id} className="bg-white border rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="font-bold text-gray-800">{o.orderId}</p>
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{o.orderStatus.replace(/_/g, ' ')}</span>
          </div>
          <p className="text-xs text-gray-500 mb-1">{o.buyer?.name} · {o.buyer?.phone}</p>
          <p className="text-xs text-gray-500 mb-2">{o.deliveryAddress?.addressLine}, {o.deliveryAddress?.city} {o.deliveryAddress?.pincode}</p>
          <ul className="text-xs text-gray-600 mb-3">
            {o.items?.map((it, i) => <li key={i}>{it.name} × {it.quantity}</li>)}
          </ul>
          <p className="font-bold text-sm text-gray-800 mb-3">Total: ₹{o.pricing?.total}</p>

          {NEXT_STATUS[o.orderStatus] && (
            <button onClick={() => advance(o)} className="mb-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold">
              {NEXT_LABEL[o.orderStatus]}
            </button>
          )}

          <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <FiTruck className="text-gray-400" size={14} />
            <input placeholder="Delivery partner" value={expenseForm[o._id]?.partner || o.deliveryExpense?.partner || ''}
              onChange={e => setExpenseForm(f => ({ ...f, [o._id]: { ...f[o._id], partner: e.target.value } }))}
              className="border rounded-lg px-2 py-1 text-xs w-28" />
            <input placeholder="₹ amount" type="number" value={expenseForm[o._id]?.amount ?? o.deliveryExpense?.amount ?? ''}
              onChange={e => setExpenseForm(f => ({ ...f, [o._id]: { ...f[o._id], amount: e.target.value } }))}
              className="border rounded-lg px-2 py-1 text-xs w-20" />
            <button onClick={() => saveExpense(o._id)} className="px-2 py-1 rounded-lg border text-xs font-semibold">Save</button>
          </div>
        </div>
      ))}
      {orders.length === 0 && <p className="text-sm text-gray-400">No orders yet.</p>}
    </div>
  );
}

function ProductsTab() {
  const [storeProducts, setStoreProducts] = useState([]);

  const load = () => expressManagerApi.get('/products').then(({ data }) => setStoreProducts(data.storeProducts || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggle = async (sp) => {
    try {
      await expressManagerApi.patch(`/products/${sp._id}/toggle`);
      load();
    } catch { toast.error('Failed to update product'); }
  };

  return (
    <div className="grid gap-2">
      {storeProducts.map(sp => (
        <div key={sp._id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm text-gray-800">{sp.product?.koyambeduProduct?.name}</p>
            <p className="text-xs text-gray-400">Stock: {sp.stockQty} {sp.product?.unit}</p>
          </div>
          <button onClick={() => toggle(sp)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${sp.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {sp.isAvailable ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {sp.isAvailable ? 'ON' : 'OFF'}
          </button>
        </div>
      ))}
      {storeProducts.length === 0 && <p className="text-sm text-gray-400">No products assigned to your store yet — ask Admin to allocate inventory.</p>}
    </div>
  );
}

function InventoryTab() {
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [items, setItems] = useState([{ product: '', requestedQty: '' }]);

  const load = () => {
    expressManagerApi.get('/inventory-requests').then(({ data }) => setRequests(data.requests || [])).catch(() => {});
    expressManagerApi.get('/products').then(({ data }) => setProducts((data.storeProducts || []).map(sp => sp.product).filter(Boolean))).catch(() => {});
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    const valid = items.filter(i => i.product && i.requestedQty);
    if (valid.length === 0) return toast.error('Add at least one item');
    try {
      await expressManagerApi.post('/inventory-requests', { items: valid });
      toast.success('Request submitted to Admin');
      setItems([{ product: '', requestedQty: '' }]);
      setShowForm(false);
      load();
    } catch { toast.error('Failed to submit request'); }
  };

  return (
    <div>
      <button onClick={() => setShowForm(s => !s)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold mb-3">
        <FiPlus size={14} /> Request Stock
      </button>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid gap-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <select value={it.product} onChange={e => setItems(arr => arr.map((x, j) => j === i ? { ...x, product: e.target.value } : x))}
                className="border rounded-lg px-2 py-1.5 text-sm flex-1">
                <option value="">Select product…</option>
                {products.map(p => <option key={p._id} value={p._id}>{p.koyambeduProduct?.name}</option>)}
              </select>
              <input placeholder="Qty" type="number" value={it.requestedQty}
                onChange={e => setItems(arr => arr.map((x, j) => j === i ? { ...x, requestedQty: e.target.value } : x))}
                className="border rounded-lg px-2 py-1.5 text-sm w-24" />
            </div>
          ))}
          <button type="button" onClick={() => setItems(arr => [...arr, { product: '', requestedQty: '' }])} className="text-xs font-semibold text-indigo-600 text-left">
            + Add another item
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold">Submit Request</button>
        </form>
      )}

      <div className="grid gap-2">
        {requests.map(r => (
          <div key={r._id} className="bg-white border rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString('en-IN')}</p>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span>
            </div>
            <ul className="text-xs text-gray-600">
              {r.items?.map((it, i) => <li key={i}>{it.product?.koyambeduProduct?.name} — {it.requestedQty} requested{it.allocatedQty != null ? `, ${it.allocatedQty} allocated` : ''}</li>)}
            </ul>
          </div>
        ))}
        {requests.length === 0 && <p className="text-sm text-gray-400">No inventory requests yet.</p>}
      </div>
    </div>
  );
}
