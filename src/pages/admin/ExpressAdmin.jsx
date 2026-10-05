// ============================================
// EPTOMART EXPRESS — Super Admin management (Phase 1)
// Completely separate vertical from Koyambedu Daily / EptoFresh / Uzhavar /
// Fruit Baskets. Phase 1 scope: store CRUD, store managers, POS users,
// product catalogue + pricing preview, margin config, inventory requests.
// No customer-facing pages yet — those come in a later phase. Only
// reachable by Super Admin (backend enforces this on every
// /express/admin/* route regardless of what this page does).
// ============================================
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import {
  FiZap, FiMapPin, FiUsers, FiUserCheck, FiPackage, FiSliders, FiBox,
  FiClipboard, FiPlus, FiToggleLeft, FiToggleRight, FiEdit2, FiTrash2, FiX, FiCheck,
  FiGrid, FiDollarSign, FiShoppingCart, FiEye, FiTrendingUp, FiTrendingDown, FiFileText,
  FiBluetooth, FiPrinter, FiPauseCircle, FiPlayCircle, FiLink2, FiClock,
} from 'react-icons/fi';
import api from '../../utils/api';
import { isBluetoothSupported, connectPrinter, disconnectPrinter, isPrinterConnected, printPluList, printReceipt } from '../../utils/expressThermalPrinter';

// Shareable customer-facing link for a single Express product — used by the
// "Copy Link" button on the Product Catalogue so an admin can drop it
// straight into a Hero Banner's "Links to" field, or share it with a
// customer/on social media. Falls back to a manual prompt when the
// clipboard API is blocked (older browsers, non-HTTPS contexts).
const copyExpressProductLink = (productId) => {
  const url = `${window.location.origin}/express/product/${productId}`;
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Product link copied'))
      .catch(() => window.prompt('Copy this link:', url));
  } else {
    window.prompt('Copy this link:', url);
  }
};

// Express's own category list — entirely separate from Koyambedu Daily's
// categories (free-text on ExpressProduct.category, not a KoyambeduCategory
// ref). "Combos" is fixed/reserved: every combo is auto-filed under it
// (see CreateProductTab) so the customer-facing shop can always group combos
// together regardless of what else an admin adds here later.
const EXPRESS_CATEGORIES = [
  'Vegetables', 'Fruits', 'Dairy & Eggs', 'Groceries', 'Snacks & Beverages',
  'Bakery', 'Meat & Seafood', 'Household', 'Personal Care', 'Combos',
];

const TABS = [
  { key: 'dashboard',  label: 'Dashboard',   Icon: FiGrid },
  { key: 'orders',     label: 'Orders',      Icon: FiFileText },
  { key: 'pnl',        label: 'P&L',         Icon: FiTrendingUp },
  { key: 'stores',     label: 'Stores',      Icon: FiMapPin },
  { key: 'managers',   label: 'Managers',    Icon: FiUserCheck },
  { key: 'pos',        label: 'POS Users',   Icon: FiUsers },
  { key: 'products',   label: 'Products',    Icon: FiPackage },
  { key: 'prodmgmt',   label: 'Product Management', Icon: FiSliders },
  { key: 'copy',       label: 'Copy Items',  Icon: FiLink2 },
  { key: 'messages',   label: 'Messages',    Icon: FiClipboard },
  { key: 'allocation', label: 'Store Inventory', Icon: FiBox },
  { key: 'online',     label: 'Online Catalog', Icon: FiEye },
  { key: 'create',     label: 'Create Product/Combo', Icon: FiPlus },
  { key: 'banners',    label: 'Hero Banners', Icon: FiZap },
  { key: 'expenses',   label: 'Expenses',    Icon: FiDollarSign },
  { key: 'carts',      label: 'Carts',       Icon: FiShoppingCart },
  { key: 'margin',     label: 'Settings', Icon: FiSliders },
  { key: 'inventory',  label: 'Inventory Requests', Icon: FiClipboard },
];

export default function ExpressAdmin() {
  const [tab, setTab] = useState('dashboard');
  const [stores, setStores] = useState([]); // shared across tabs (managers/pos/products need store dropdowns)

  const loadStores = () => {
    api.get('/express/admin/stores').then(r => setStores(r.data.stores || [])).catch(() => {});
  };
  useEffect(() => { loadStores(); }, []);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-black flex items-center gap-2 mb-1 text-indigo-900">
        <FiZap className="text-amber-500" /> Eptomart Express — Same-Day Delivery
      </h1>
      <p className="text-sm text-gray-500 mb-4">
        Manage stores, staff, catalogue and margins. Phase 1: admin setup only — no customer-facing storefront yet.
      </p>

      <div className="flex flex-wrap gap-1 rounded-xl p-1 mb-5 w-fit bg-indigo-50">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-colors"
            style={tab === t.key ? { background: '#fff', color: '#3730a3', boxShadow: '0 1px 4px rgba(55,48,163,0.15)' } : { color: '#6b7280' }}>
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'dashboard'  && <DashboardTab stores={stores} />}
      {tab === 'orders'     && <OrdersTab stores={stores} />}
      {tab === 'pnl'        && <OrdersPnLTab stores={stores} />}
      {tab === 'stores'    && <StoresTab stores={stores} reload={loadStores} />}
      {tab === 'managers'  && <ManagersTab stores={stores} />}
      {tab === 'pos'       && <POSUsersTab stores={stores} />}
      {tab === 'products'   && <ProductsTab />}
      {tab === 'prodmgmt'   && <ProductManagementTab stores={stores} />}
      {tab === 'copy'       && <CopyItemsTab stores={stores} />}
      {tab === 'messages'   && <MessagesTab />}
      {tab === 'allocation' && <StoreInventoryTab stores={stores} />}
      {tab === 'online'     && <OnlineCatalogTab stores={stores} reload={loadStores} />}
      {tab === 'create'     && <CreateProductTab />}
      {tab === 'banners'    && <BannersTab />}
      {tab === 'expenses'   && <ExpensesTab stores={stores} />}
      {tab === 'carts'      && <CartsTab />}
      {tab === 'margin'     && <MarginConfigTab stores={stores} />}
      {tab === 'inventory'  && <InventoryRequestsTab />}
    </div>
  );
}

// ══════════════════════════════════════════════
// DASHBOARD TAB — profit/loss finance summary + recent visitors
// Mirrors the FruitBasketAdmin/KoyambeduAdmin dashboard pattern: stat cards
// fed by the finance-dashboard endpoint (revenue, COGS, losses, other
// expenses, net profit) plus a recent-visitors list from the shared
// Analytics collection, filtered to Express's own API paths.
// ══════════════════════════════════════════════
function DashboardTab({ stores }) {
  const [finance, setFinance] = useState(null);
  const [visits, setVisits] = useState([]);
  const [storeId, setStoreId] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeId) params.set('storeId', storeId);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    Promise.all([
      api.get(`/express/admin/finance-dashboard?${params.toString()}`).then(r => setFinance(r.data.finance)).catch(() => setFinance(null)),
      api.get('/express/admin/visitors?limit=12').then(r => setVisits(r.data.visits || [])).catch(() => setVisits([])),
    ]).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [storeId, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const Stat = ({ label, value, positive, negative, icon: Icon }) => (
    <div className="bg-white border rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-400 font-semibold mb-1">
        {Icon && <Icon size={12} />} {label}
      </div>
      <p className={`text-xl font-black ${positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-bold text-gray-700">Finance Overview</h2>
        <div className="flex flex-wrap gap-2">
          <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs">
            <option value="">All stores</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="border rounded-lg px-2.5 py-1.5 text-xs" />
          <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="border rounded-lg px-2.5 py-1.5 text-xs" />
        </div>
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && finance && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <Stat label="Revenue" value={`₹${finance.revenue}`} icon={FiDollarSign} />
            <Stat label="Procurement + Logistics Cost" value={`₹${finance.cogs}`} icon={FiPackage} />
            <Stat label="Loss Value" value={`₹${finance.lossValue}`} icon={FiTrendingDown} negative={finance.lossValue > 0} />
            <Stat label="Other Expenses" value={`₹${finance.otherExpenses}`} icon={FiFileText} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Stat label="Online Revenue" value={`₹${finance.onlineRevenue}`} />
            <Stat label="POS Revenue" value={`₹${finance.posRevenue}`} />
            <Stat label="Orders + Bills" value={`${finance.onlineOrderCount} / ${finance.posBillCount}`} />
            <Stat label="Net Profit / Loss" value={`₹${finance.netProfit}`} icon={finance.netProfit >= 0 ? FiTrendingUp : FiTrendingDown}
              positive={finance.netProfit >= 0} negative={finance.netProfit < 0} />
          </div>
        </>
      )}

      <h3 className="font-bold text-gray-700 mb-2 text-sm flex items-center gap-1.5"><FiEye size={14} /> Recent Visitors</h3>
      <div className="bg-white border rounded-xl divide-y">
        {visits.map(v => (
          <div key={v._id} className="flex items-center justify-between px-3 py-2 text-xs">
            <div className="min-w-0">
              <p className="font-semibold text-gray-700 truncate">{v.page}</p>
              <p className="text-gray-400">{v.user ? v.user.name : 'Guest'} · {v.city || v.country || 'Unknown location'} · {v.device || ''}</p>
            </div>
            <span className="text-gray-400 shrink-0 ml-2">{new Date(v.timestamp).toLocaleString('en-IN')}</span>
          </div>
        ))}
        {visits.length === 0 && <p className="text-sm text-gray-400 px-3 py-3">No visits recorded yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// ORDERS TAB — admin-wide, cross-store view of every Express order.
// Separate from the Store Manager's own dashboard (which is correctly
// scoped to their one store) — this is the one place an admin can see,
// filter, advance the status of, and print a bill for ANY store's order,
// plus enter the per-bill transport/packing charge the P&L report below
// is built from.
// ══════════════════════════════════════════════
const ORDER_STATUS_LABELS = {
  placed: 'Placed', confirmed: 'Confirmed', preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery', delivered: 'Delivered', cancelled: 'Cancelled',
};
const ORDER_STATUS_COLORS = {
  placed: { bg: '#f3f4f6', fg: '#4b5563' }, confirmed: { bg: '#dbeafe', fg: '#1d4ed8' },
  preparing: { bg: '#fef3c7', fg: '#b45309' }, out_for_delivery: { bg: '#e0e7ff', fg: '#4338ca' },
  delivered: { bg: '#dcfce7', fg: '#16a34a' }, cancelled: { bg: '#fee2e2', fg: '#dc2626' },
};
// Forward-only next step for the "Advance" button — mirrors ADMIN_ORDER_STEPS
// in expressAdminController.js; cancelling is offered separately.
const NEXT_ORDER_STEP = { placed: 'confirmed', confirmed: 'preparing', preparing: 'out_for_delivery', out_for_delivery: 'delivered' };

function OrdersTab({ stores }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });
  const [search, setSearch] = useState('');
  const [chargeDrafts, setChargeDrafts] = useState({}); // orderId -> { transportCharge, packingCharge }
  const [savingCharges, setSavingCharges] = useState(null);
  const [advancing, setAdvancing] = useState(null);
  // Same shared Bluetooth connection as Store Inventory / Manager dashboard —
  // connecting here (or there) covers "Print Bill" below either way.
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  const [connectingPrinter, setConnectingPrinter] = useState(false);

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

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeId) params.set('storeId', storeId);
    if (status) params.set('status', status);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    if (search.trim()) params.set('search', search.trim());
    api.get(`/express/admin/orders?${params.toString()}`)
      .then(r => setOrders(r.data.orders || []))
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [storeId, status, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps
  // Search is debounced separately so every keystroke doesn't re-fetch.
  useEffect(() => { const t = setTimeout(load, 350); return () => clearTimeout(t); }, [search]); // eslint-disable-line react-hooks/exhaustive-deps

  const advanceStatus = async (order) => {
    const next = NEXT_ORDER_STEP[order.orderStatus];
    if (!next) return;
    setAdvancing(order._id);
    try {
      await api.patch(`/express/admin/orders/${order._id}/status`, { status: next });
      toast.success(`Order marked ${ORDER_STATUS_LABELS[next]}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    } finally {
      setAdvancing(null);
    }
  };

  // Manual fallback for an order stuck at paymentStatus !== 'paid' even
  // though Razorpay actually captured the money (customer's browser/app
  // never completed the callback, and the payment.captured webhook also
  // never reached us) — looks the payment up directly on Razorpay's side
  // before marking anything paid. See adminManualVerifyExpressPayment.
  const verifyStuckPayment = async (order) => {
    const paymentId = window.prompt(`Enter the Razorpay Payment ID for order ${order.orderId} to verify and confirm it:`);
    if (!paymentId?.trim()) return;
    setAdvancing(order._id);
    try {
      await api.post(`/express/admin/orders/${order._id}/manual-verify-payment`, { razorpayPaymentId: paymentId.trim() });
      toast.success('Payment verified — order confirmed');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to verify payment');
    } finally {
      setAdvancing(null);
    }
  };

  const cancelOrder = async (order) => {
    if (!window.confirm(`Cancel order ${order.orderId}? This cannot be undone.`)) return;
    setAdvancing(order._id);
    try {
      await api.patch(`/express/admin/orders/${order._id}/status`, { status: 'cancelled', note: 'Cancelled by admin' });
      toast.success('Order cancelled');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel order');
    } finally {
      setAdvancing(null);
    }
  };

  const draftFor = (id) => chargeDrafts[id] || {};
  const setChargeDraft = (id, patch) => setChargeDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));

  const saveCharges = async (order) => {
    const d = draftFor(order._id);
    if (d.transportCharge === undefined && d.packingCharge === undefined) return;
    setSavingCharges(order._id);
    try {
      await api.patch(`/express/admin/orders/${order._id}/charges`, {
        transportCharge: d.transportCharge, packingCharge: d.packingCharge,
      });
      toast.success('Bill charges saved');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save charges');
    } finally {
      setSavingCharges(null);
    }
  };

  const printBill = (order) => {
    printReceipt({
      billNo: order.orderId,
      dateStr: new Date(order.createdAt).toLocaleDateString('en-IN'),
      timeLabel: new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      storeName: order.store?.name || '',
      customerName: order.buyer?.name || order.deliveryAddress?.name || 'Customer',
      items: (order.items || []).map(it => ({ name: it.name, unit: it.unit, price: it.unitPrice, quantity: it.quantity })),
      subtotal: order.pricing?.subtotal || 0,
      discountPercent: 0,
      discountAmount: order.pricing?.couponDiscount || 0,
      total: order.pricing?.total || 0,
    }).catch(() => toast.error('Failed to print — is the printer connected?'));
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-bold text-gray-700">Orders — All Stores</h2>
        <div className="flex flex-wrap gap-2">
          <input placeholder="Search order ID…" value={search} onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-2.5 py-1.5 text-xs w-36" />
          <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs">
            <option value="">All stores</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs">
            <option value="">All statuses</option>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="border rounded-lg px-2.5 py-1.5 text-xs" />
          <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="border rounded-lg px-2.5 py-1.5 text-xs" />
          <button onClick={togglePrinterConnection} disabled={connectingPrinter}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50"
            style={printerConnected ? { background: '#dcfce7', color: '#16a34a' } : { background: '#f3f4f6', color: '#4b5563' }}>
            <FiBluetooth size={12} /> {connectingPrinter ? 'Connecting…' : printerConnected ? 'Printer Connected' : 'Connect Printer'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">No orders found.</p>
      ) : (
        <div className="space-y-2">
          {orders.map(order => {
            const d = draftFor(order._id);
            const color = ORDER_STATUS_COLORS[order.orderStatus] || ORDER_STATUS_COLORS.placed;
            const next = NEXT_ORDER_STEP[order.orderStatus];
            const isTerminal = order.orderStatus === 'cancelled' || order.orderStatus === 'delivered';
            return (
              <div key={order._id} className="bg-white border rounded-xl p-3">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="font-bold text-sm text-gray-800">{order.orderId} <span className="text-gray-400 font-normal">· {order.store?.name || '—'}</span></p>
                    <p className="text-xs text-gray-400">
                      {order.buyer?.name || order.deliveryAddress?.name || 'Customer'} · {order.buyer?.phone || order.deliveryAddress?.phone || ''} ·{' '}
                      {new Date(order.createdAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ background: color.bg, color: color.fg }}>
                      {ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}
                    </span>
                    {order.paymentStatus !== 'paid' && (
                      <span className="text-xs font-bold px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                        {order.paymentStatus === 'failed' ? 'Payment Failed' : 'Payment Pending'}
                      </span>
                    )}
                    <span className="font-black text-sm text-gray-800">₹{order.pricing?.total ?? 0}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button onClick={() => printBill(order)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200">
                    <FiPrinter size={12} /> Print Bill
                  </button>
                  {!isTerminal && next && (
                    <button onClick={() => advanceStatus(order)} disabled={advancing === order._id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50">
                      {advancing === order._id ? 'Updating…' : `Mark ${ORDER_STATUS_LABELS[next]}`}
                    </button>
                  )}
                  {!isTerminal && (
                    <button onClick={() => cancelOrder(order)} disabled={advancing === order._id}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50">
                      Cancel
                    </button>
                  )}
                  {order.paymentStatus !== 'paid' && order.razorpayOrderId && !order.isDemoOrder && (
                    <button onClick={() => verifyStuckPayment(order)} disabled={advancing === order._id}
                      title="Order shows unpaid but the customer may have actually paid — look it up directly on Razorpay"
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50">
                      Verify Payment
                    </button>
                  )}

                  <div className="flex items-center gap-1 ml-auto">
                    <label className="text-[10px] text-gray-400 font-semibold">Transport
                      <input type="number" placeholder="₹" value={d.transportCharge ?? (order.pricing?.transportCharge ?? '')}
                        onChange={e => setChargeDraft(order._id, { transportCharge: e.target.value })}
                        className="w-16 border border-gray-200 rounded-lg px-1.5 py-1 text-xs ml-1" />
                    </label>
                    <label className="text-[10px] text-gray-400 font-semibold">Packing
                      <input type="number" placeholder="₹" value={d.packingCharge ?? (order.pricing?.packingCharge ?? '')}
                        onChange={e => setChargeDraft(order._id, { packingCharge: e.target.value })}
                        className="w-16 border border-gray-200 rounded-lg px-1.5 py-1 text-xs ml-1" />
                    </label>
                    <button onClick={() => saveCharges(order)} disabled={savingCharges === order._id}
                      className="px-2 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50">
                      {savingCharges === order._id ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// P&L TAB — bill-wise + overall profit for Express online orders.
// Reads /express/admin/orders-pnl (see adminOrdersPnL in
// expressAdminController.js). Rows use the same transportCharge/
// packingCharge the Orders tab lets the admin enter per bill — this tab is
// read-only; to edit a bill's charges, use the Orders tab (changes show up
// here immediately on reload).
// ══════════════════════════════════════════════
function OrdersPnLTab({ stores }) {
  const [bills, setBills] = useState([]);
  const [totals, setTotals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState('');
  const [range, setRange] = useState({ from: '', to: '' });

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (storeId) params.set('storeId', storeId);
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    api.get(`/express/admin/orders-pnl?${params.toString()}`)
      .then(r => { setBills(r.data.bills || []); setTotals(r.data.totals || null); })
      .catch(() => toast.error('Failed to load P&L'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [storeId, range.from, range.to]); // eslint-disable-line react-hooks/exhaustive-deps

  const Stat = ({ label, value, positive, negative }) => (
    <div className="bg-white border rounded-xl p-4">
      <p className="text-xs text-gray-400 font-semibold mb-1">{label}</p>
      <p className={`text-xl font-black ${positive ? 'text-green-600' : negative ? 'text-red-600' : 'text-gray-800'}`}>{value}</p>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h2 className="font-bold text-gray-700">Orders P&L — Bill-wise + Overall</h2>
        <div className="flex flex-wrap gap-2">
          <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-2.5 py-1.5 text-xs">
            <option value="">All stores</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <input type="date" value={range.from} onChange={e => setRange(r => ({ ...r, from: e.target.value }))} className="border rounded-lg px-2.5 py-1.5 text-xs" />
          <input type="date" value={range.to} onChange={e => setRange(r => ({ ...r, to: e.target.value }))} className="border rounded-lg px-2.5 py-1.5 text-xs" />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : (
        <>
          {totals && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
              <Stat label="Revenue" value={`₹${totals.revenue}`} />
              <Stat label="Procurement Cost" value={`₹${totals.itemsProcurementCost}`} />
              <Stat label="Transport + Packing" value={`₹${Math.round((totals.transportCharge + totals.packingCharge) * 100) / 100}`} />
              <Stat label="Razorpay Fee" value={`₹${totals.razorpayFee}`} />
            </div>
          )}
          {totals && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
              <Stat label="Overall Profit" value={`₹${totals.profit}`} positive={totals.profit >= 0} negative={totals.profit < 0} />
              <Stat label="Bills" value={totals.billCount} />
              <Stat label="Bills Missing Transport/Packing" value={totals.pendingChargesCount} negative={totals.pendingChargesCount > 0} />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm bg-white border rounded-xl">
              <thead>
                <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                  <th className="px-3 py-2">Order</th>
                  <th className="px-3 py-2">Store</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                  <th className="px-3 py-2 text-right">Procurement</th>
                  <th className="px-3 py-2 text-right">Transport</th>
                  <th className="px-3 py-2 text-right">Packing</th>
                  <th className="px-3 py-2 text-right">Razorpay Fee</th>
                  <th className="px-3 py-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b._id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">
                      {b.orderId}
                      {!b.chargesEntered && <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 align-middle">Pending charges</span>}
                      <span className="block text-[10px] text-gray-400 font-normal">{new Date(b.createdAt).toLocaleDateString('en-IN')}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500">{b.store?.name || '—'}</td>
                    <td className="px-3 py-2 text-right">₹{b.revenue}</td>
                    <td className="px-3 py-2 text-right text-gray-500">₹{b.itemsProcurementCost}</td>
                    <td className="px-3 py-2 text-right text-gray-500">₹{b.transportCharge}</td>
                    <td className="px-3 py-2 text-right text-gray-500">₹{b.packingCharge}</td>
                    <td className="px-3 py-2 text-right text-gray-500">₹{b.razorpayFee}</td>
                    <td className={`px-3 py-2 text-right font-bold ${b.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>₹{b.profit}</td>
                  </tr>
                ))}
                {bills.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-gray-400 py-6">No paid orders in range</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// PRODUCT MANAGEMENT TAB — one place per store to switch items online/offline
// and add stock, with filters. Reads the same merged list as the Online
// Catalog tab (/online-catalog, now also carrying stockQty + productId) so
// both tabs always agree. Activate/deactivate saves immediately (no
// "Save All" step); add-stock uses the existing add-stock endpoint, so every
// addition lands in the Stock Report like any other.
// ══════════════════════════════════════════════
function ProductManagementTab({ stores }) {
  const [storeId, setStoreId] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [addQty, setAddQty] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [selected, setSelected] = useState(new Set());

  const rowId = (it) => String(it.koyambeduProductId || it.expressProductId);

  const load = () => {
    if (!storeId) { setItems([]); return; }
    setLoading(true);
    api.get(`/express/admin/stores/${storeId}/online-catalog`)
      .then(r => { setItems(r.data.items || []); setSelected(new Set()); })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const categories = [...new Set(items.map(it => it.category).filter(Boolean))].sort();
  const rows = items
    .filter(it => !search.trim() || it.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter(it => !catFilter || it.category === catFilter)
    .filter(it => !onlineFilter || (onlineFilter === 'on' ? it.isEnabled : !it.isEnabled))
    .filter(it => !stockFilter
      || (stockFilter === 'out' && it.stockQty <= 0)
      || (stockFilter === 'low' && it.stockQty > 0 && it.stockQty <= 5)
      || (stockFilter === 'in' && it.stockQty > 0));

  const setOnline = async (list, isEnabled) => {
    if (!list.length) return;
    setBusyId(list.length === 1 ? rowId(list[0]) : 'bulk');
    try {
      const payload = list.map(it => ({
        ...(it.source === 'native' ? { expressProductId: rowId(it) } : { koyambeduProductId: rowId(it) }),
        isEnabled,
        ...(it.price != null ? { price: it.price } : {}),
      }));
      await api.patch(`/express/admin/stores/${storeId}/online-catalog`, { items: payload });
      toast.success(`${list.length} item${list.length === 1 ? '' : 's'} ${isEnabled ? 'activated' : 'deactivated'}`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    } finally {
      setBusyId(null);
    }
  };

  const addStock = async (it) => {
    const qty = Number(addQty[rowId(it)]);
    if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a quantity greater than 0');
    setBusyId(rowId(it));
    try {
      await api.post(`/express/admin/stores/${storeId}/products/${it.productId}/add-stock`, { qty });
      toast.success(`Added ${qty} ${it.unit} of ${it.name}`);
      setAddQty(q => ({ ...q, [rowId(it)]: '' }));
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add stock');
    } finally {
      setBusyId(null);
    }
  };

  const toggleSel = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allVisibleSelected = rows.length > 0 && rows.every(r => selected.has(rowId(r)));
  const selectedRows = items.filter(it => selected.has(rowId(it)));

  return (
    <div className="bg-white rounded-2xl border p-4">
      <h3 className="font-bold text-gray-800 mb-1">Product Management</h3>
      <p className="text-xs text-gray-500 mb-4">
        Switch items online/offline for a store and add stock in one place. Activating an item that has never been
        stocked here creates it at this store with 0 stock — add stock right after. Prices, MRP and procurement cost
        are edited in the Online Catalog tab.
      </p>

      <div className="flex flex-wrap gap-2 mb-3">
        <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm sm:w-56">
          <option value="">Select a store…</option>
          {stores.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        {storeId && <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px]" />}
        {storeId && (
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {storeId && (
          <select value={onlineFilter} onChange={e => setOnlineFilter(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">Active + Inactive</option>
            <option value="on">Active only</option>
            <option value="off">Inactive only</option>
          </select>
        )}
        {storeId && (
          <select value={stockFilter} onChange={e => setStockFilter(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">All stock</option>
            <option value="in">In stock</option>
            <option value="low">Low (≤5)</option>
            <option value="out">Out of stock</option>
          </select>
        )}
      </div>

      {storeId && selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-indigo-50 text-sm">
          <span className="font-semibold text-indigo-800">{selected.size} selected</span>
          <button onClick={() => setOnline(selectedRows, true)} disabled={busyId === 'bulk'} className="px-3 py-1 rounded-lg bg-green-600 text-white text-xs font-bold disabled:opacity-50">Activate</button>
          <button onClick={() => setOnline(selectedRows, false)} disabled={busyId === 'bulk'} className="px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold disabled:opacity-50">Deactivate</button>
        </div>
      )}

      {!storeId ? (
        <p className="text-sm text-gray-400 py-6 text-center">Select a store to manage its products.</p>
      ) : loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2"><input type="checkbox" checked={allVisibleSelected}
                  onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(rows.map(rowId)))} className="accent-indigo-600" /></th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Price</th>
                <th className="px-3 py-2 text-right">Stock</th>
                <th className="px-3 py-2 text-center">Status</th>
                <th className="px-3 py-2 text-right">Add Stock</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(it => {
                const id = rowId(it);
                return (
                  <tr key={id} className="border-t border-gray-100">
                    <td className="px-3 py-2"><input type="checkbox" checked={selected.has(id)} onChange={() => toggleSel(id)} className="accent-indigo-600" /></td>
                    <td className="px-3 py-2 font-medium text-gray-700">
                      {it.name} <span className="text-gray-400 font-normal">· {it.unit}</span>
                      {it.category && <span className="block text-[10px] text-gray-400 font-normal">{it.category}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{it.price != null ? `₹${it.price}` : '—'}</td>
                    <td className={`px-3 py-2 text-right font-semibold ${it.stockQty <= 0 ? 'text-red-600' : it.stockQty <= 5 ? 'text-amber-600' : 'text-gray-700'}`}>{it.stockQty}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => setOnline([it], !it.isEnabled)} disabled={busyId === id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold disabled:opacity-50"
                        style={it.isEnabled ? { background: '#dcfce7', color: '#16a34a' } : { background: '#f3f4f6', color: '#6b7280' }}>
                        {it.isEnabled ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                        {it.isEnabled ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <input type="number" min="0" placeholder="+ qty" value={addQty[id] ?? ''} disabled={!it.productId}
                          title={it.productId ? '' : 'Activate this item first so it exists at the store'}
                          onChange={e => setAddQty(q => ({ ...q, [id]: e.target.value }))}
                          className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-right text-xs disabled:bg-gray-50" />
                        <button onClick={() => addStock(it)} disabled={!it.productId || busyId === id}
                          className="px-2 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white disabled:opacity-40">Add</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">No products match</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// COPY ITEMS TAB — super admin copies one store's catalogue to other stores.
// Copies listings (active/inactive, price, MRP) + inventory allocation
// (availability, price override). Stock is never copied: every target starts
// at 0. Existing items at a target are skipped unless "overwrite" is ticked.
// ══════════════════════════════════════════════
function CopyItemsTab({ stores }) {
  const [sourceId, setSourceId] = useState('');
  const [targets, setTargets] = useState(new Set());
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState('all'); // 'all' | 'selected'
  const [picked, setPicked] = useState(new Set());
  const [search, setSearch] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    setItems([]); setPicked(new Set()); setResult(null);
    if (!sourceId) return;
    api.get(`/express/admin/stores/${sourceId}/online-catalog`)
      .then(r => setItems((r.data.items || []).filter(it => it.productId && (it.isEnabled || it.price != null))))
      .catch(() => toast.error('Failed to load source store items'));
  }, [sourceId]);

  const toggle = (setter, id) => setter(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const shown = items.filter(it => !search.trim() || it.name.toLowerCase().includes(search.trim().toLowerCase()));
  const otherStores = stores.filter(s => s._id !== sourceId);

  const run = async () => {
    if (!sourceId) return toast.error('Choose a source store');
    if (!targets.size) return toast.error('Choose at least one target store');
    if (mode === 'selected' && !picked.size) return toast.error('Tick at least one item to copy');
    const names = otherStores.filter(s => targets.has(s._id)).map(s => s.name).join(', ');
    const what = mode === 'all' ? `ALL ${items.length} items` : `${picked.size} selected item(s)`;
    if (!window.confirm(`Copy ${what} from ${stores.find(s => s._id === sourceId)?.name} to: ${names}?${overwrite ? '\n\nExisting items at the targets WILL be overwritten (price/MRP/status).' : '\n\nItems the targets already have will be skipped.'}\nStock is not copied.`)) return;
    setBusy(true);
    try {
      const { data } = await api.post('/express/admin/stores/copy-items', {
        sourceStoreId: sourceId, targetStoreIds: [...targets], overwrite,
        productIds: mode === 'selected' ? items.filter(it => picked.has(String(it.productId))).map(it => it.productId) : undefined,
      });
      setResult(data.summary || []);
      toast.success('Items copied');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to copy items');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border p-4">
      <h3 className="font-bold text-gray-800 mb-1">Copy Items Between Stores</h3>
      <p className="text-xs text-gray-500 mb-4">
        Copies a store's online listings (active/inactive, selling price, MRP) and inventory setup to other stores so
        you don't re-enter them. Stock quantities are never copied — each target store starts at 0 and adds its own.
      </p>

      <select value={sourceId} onChange={e => { setSourceId(e.target.value); setTargets(new Set()); }} className="border rounded-lg px-3 py-2 text-sm w-full sm:w-72 mb-3">
        <option value="">Copy FROM (source store)…</option>
        {stores.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
      </select>

      {sourceId && (
        <>
          <p className="text-xs font-semibold text-gray-500 mb-1">Copy TO (target stores)</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {otherStores.map(s => (
              <label key={s._id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-sm cursor-pointer"
                style={targets.has(s._id) ? { background: '#eef2ff', borderColor: '#818cf8' } : {}}>
                <input type="checkbox" checked={targets.has(s._id)} onChange={() => toggle(setTargets, s._id)} className="accent-indigo-600" />
                {s.name}
              </label>
            ))}
            {otherStores.length === 0 && <p className="text-sm text-gray-400">No other stores exist yet.</p>}
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
            <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'all'} onChange={() => setMode('all')} className="accent-indigo-600" /> All items ({items.length})</label>
            <label className="flex items-center gap-1.5"><input type="radio" checked={mode === 'selected'} onChange={() => setMode('selected')} className="accent-indigo-600" /> Selected items only</label>
            <label className="flex items-center gap-1.5 ml-auto"><input type="checkbox" checked={overwrite} onChange={e => setOverwrite(e.target.checked)} className="accent-red-600" /> Overwrite items target already has</label>
          </div>

          {mode === 'selected' && (
            <div className="mb-3">
              <input placeholder="Search items…" value={search} onChange={e => setSearch(e.target.value)} className="border rounded-lg px-3 py-2 text-sm w-full mb-2" />
              <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                {shown.map(it => (
                  <label key={it.productId} className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={picked.has(String(it.productId))} onChange={() => toggle(setPicked, String(it.productId))} className="accent-indigo-600" />
                    <span className="flex-1">{it.name} <span className="text-gray-400">· {it.unit}</span></span>
                    <span className={`text-[10px] font-bold ${it.isEnabled ? 'text-green-600' : 'text-gray-400'}`}>{it.isEnabled ? 'Active' : 'Inactive'}</span>
                    <span className="text-xs text-gray-500 w-14 text-right">{it.price != null ? `₹${it.price}` : '—'}</span>
                  </label>
                ))}
                {shown.length === 0 && <p className="text-sm text-gray-400 px-3 py-4">No items</p>}
              </div>
            </div>
          )}

          <button onClick={run} disabled={busy} className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
            {busy ? 'Copying…' : 'Copy Items'}
          </button>
        </>
      )}

      {result && (
        <div className="mt-4 border rounded-xl divide-y">
          {result.map(r => (
            <div key={r.storeId} className="px-3 py-2 text-sm flex flex-wrap justify-between gap-2">
              <span className="font-semibold text-gray-700">{r.storeName}</span>
              <span className="text-gray-500">{r.copied} copied · {r.updated} updated · {r.skipped} skipped</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// MESSAGES TAB — customer WhatsApp messages with an AI-drafted reply.
// Nothing is ever sent automatically: the AI writes a draft addressed as
// "Dear Mr./Ms. <First name>", the admin can switch Mr./Ms., edit freely, and
// must press Confirm & Send, then confirm again on a preview, before it goes
// out. Uses the existing inbox endpoints (list/reply) — Meta only allows
// free-text replies within 24 hours of the customer's last message.
// ══════════════════════════════════════════════
function MessagesTab() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);       // selected inbound message
  const [drafting, setDrafting] = useState(false);
  const [draft, setDraft] = useState(null);         // { customerName, firstName, title }
  const [text, setText] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/koyambedu/admin/whatsapp/messages?limit=40')
      .then(r => setMessages(r.data.messages || []))
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const greeting = (title, d) => {
    const first = d?.firstName || d?.customerName || '';
    return title ? `Dear ${title} ${first},` : `Dear ${first || 'Customer'},`;
  };

  const pick = (m) => { setActive(m); setDraft(null); setText(''); setConfirming(false); };

  const makeDraft = async () => {
    setDrafting(true);
    try {
      const { data } = await api.post('/express/admin/messages/draft-reply', { messageId: active._id });
      setDraft({ customerName: data.customerName, firstName: data.firstName, title: data.title });
      setText((data.draft || '').replace(/Dear\s*\{\{SALUTATION\}\},?/i, greeting(data.title, data)));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not draft a reply');
    } finally {
      setDrafting(false);
    }
  };

  const setTitle = (title) => {
    setDraft(d => ({ ...d, title }));
    setText(t => /^Dear [^\n]*,/.test(t) ? t.replace(/^Dear [^\n]*,/, greeting(title, draft)) : t);
  };

  const send = async () => {
    setSending(true);
    try {
      await api.post(`/koyambedu/admin/whatsapp/messages/${active._id}/reply`, { text });
      toast.success('Reply sent');
      setActive(null); setDraft(null); setText(''); setConfirming(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const expired = active && (Date.now() - new Date(active.sentAt).getTime()) > 24 * 3600 * 1000;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="bg-white border rounded-2xl p-3">
        <h3 className="font-bold text-gray-800 mb-2">Customer Messages</h3>
        {loading ? <p className="text-sm text-gray-400">Loading…</p> : (
          <div className="divide-y max-h-[70vh] overflow-y-auto">
            {messages.map(m => (
              <button key={m._id} onClick={() => pick(m)}
                className={`w-full text-left px-2 py-2 hover:bg-gray-50 ${active?._id === m._id ? 'bg-indigo-50' : ''}`}>
                <div className="flex justify-between gap-2">
                  <span className="text-sm font-semibold text-gray-700 truncate">{m.profileName || m.from}</span>
                  <span className="text-[10px] text-gray-400 shrink-0">{new Date(m.sentAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-xs text-gray-500 truncate">{m.text || m.mediaCaption || `[${m.type}]`}</p>
                {m.repliedAt && <span className="text-[10px] text-green-600 font-bold">Replied</span>}
              </button>
            ))}
            {messages.length === 0 && <p className="text-sm text-gray-400 py-4">No messages yet.</p>}
          </div>
        )}
      </div>

      <div className="bg-white border rounded-2xl p-4">
        {!active ? <p className="text-sm text-gray-400">Select a message to reply.</p> : (
          <>
            <p className="text-xs text-gray-400">{active.profileName || ''} · {active.from}</p>
            <div className="mt-1 mb-3 p-3 rounded-xl bg-gray-50 text-sm text-gray-700 whitespace-pre-wrap">
              {active.text || active.mediaCaption || `[${active.type} message]`}
            </div>

            {expired && <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-3">This message is older than 24 hours, so WhatsApp only allows template messages — a free-text reply can't be sent.</p>}

            {!draft ? (
              <button onClick={makeDraft} disabled={drafting}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold disabled:opacity-50">
                {drafting ? 'Drafting…' : '✨ Draft reply with AI'}
              </button>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2 text-xs">
                  <span className="text-gray-500">Address as:</span>
                  {['Mr.', 'Ms.', ''].map(t => (
                    <button key={t || 'none'} onClick={() => setTitle(t)}
                      className="px-2.5 py-1 rounded-full font-bold border"
                      style={draft.title === t ? { background: '#4338ca', color: '#fff', borderColor: '#4338ca' } : { color: '#6b7280' }}>
                      {t || 'No title'}
                    </button>
                  ))}
                  {draft.customerName && <span className="text-gray-400 ml-auto truncate">{draft.customerName}</span>}
                </div>
                <textarea value={text} onChange={e => setText(e.target.value)} rows={9}
                  className="w-full border rounded-xl p-3 text-sm focus:outline-none focus:border-indigo-400" />
                {!confirming ? (
                  <div className="flex gap-2 mt-2">
                    <button onClick={makeDraft} disabled={drafting} className="px-3 py-2 rounded-lg border text-sm font-semibold disabled:opacity-50">{drafting ? 'Drafting…' : 'Regenerate'}</button>
                    <button onClick={() => setConfirming(true)} disabled={!text.trim() || expired}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-bold disabled:opacity-40">Confirm &amp; Send…</button>
                  </div>
                ) : (
                  <div className="mt-3 p-3 rounded-xl border-2 border-amber-300 bg-amber-50">
                    <p className="text-sm font-bold text-amber-800 mb-1">Send this message to {active.profileName || active.from}?</p>
                    <p className="text-xs text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-2 mb-2">{text}</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirming(false)} disabled={sending} className="px-3 py-1.5 rounded-lg border text-sm font-semibold">Back to edit</button>
                      <button onClick={send} disabled={sending} className="px-4 py-1.5 rounded-lg bg-green-600 text-white text-sm font-bold disabled:opacity-50">{sending ? 'Sending…' : 'Yes, send now'}</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// HOLD WAITLIST — who tried to check out while this store's checkout was
// on hold, so Admin can call them back once it reopens. Rendered inline
// under a store card when Admin clicks the "X customers waiting" chip.
// ══════════════════════════════════════════════
function HoldWaitlistPanel({ storeId, onChanged }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [callingId, setCallingId] = useState(null);

  const load = () => {
    setLoading(true);
    api.get(`/express/admin/stores/${storeId}/hold-waitlist`)
      .then(r => setEntries(r.data.entries || []))
      .catch(() => toast.error('Failed to load waitlist'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [storeId]);

  const toggleCalled = async (entry) => {
    setCallingId(entry._id);
    try {
      await api.patch(`/express/admin/hold-waitlist/${entry._id}/called-back`, { calledBack: !entry.calledBack });
      load();
      onChanged?.(); // refresh the parent's pending-count badge too
    } catch {
      toast.error('Failed to update');
    } finally {
      setCallingId(null);
    }
  };

  return (
    <div className="mt-2 border rounded-xl p-3 bg-gray-50">
      {loading ? (
        <p className="text-xs text-gray-400">Loading…</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-gray-400">No one has hit the checkout gate for this store yet.</p>
      ) : (
        <div className="grid gap-2">
          {entries.map(e => (
            <div key={e._id} className={`flex items-start justify-between gap-3 p-2.5 rounded-lg ${e.calledBack ? 'bg-white opacity-60' : 'bg-white shadow-sm'}`}>
              <div className="min-w-0">
                <p className="font-bold text-gray-800 text-sm flex items-center gap-1.5 flex-wrap">
                  {e.name || 'Unnamed customer'}
                  {e.attempts > 1 && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
                      tried {e.attempts}×
                    </span>
                  )}
                </p>
                {e.phone && (
                  <a href={`tel:${e.phone.replace(/\s+/g, '')}`} className="text-xs text-indigo-600 font-semibold underline decoration-dotted">
                    {e.phone}
                  </a>
                )}
                {e.cartSummary?.length > 0 && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">
                    {e.cartSummary.map(c => `${c.name} (${c.quantity}${c.unit === 'kg' ? 'kg' : ''})`).join(', ')}
                    {e.estimatedTotal > 0 ? ` · ~₹${e.estimatedTotal}` : ''}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-0.5">Last tried {new Date(e.lastAttemptAt).toLocaleString('en-IN')}</p>
              </div>
              <button onClick={() => toggleCalled(e)} disabled={callingId === e._id}
                className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold disabled:opacity-50
                  ${e.calledBack ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                <FiCheck size={12} /> {e.calledBack ? 'Called back' : 'Mark called'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Per-store delivery slot configuration — which same-day windows this store
// offers (independently of every other store), their hours/labels, and
// whether this store also offers next-day delivery. Falls back to a
// sensible default set of windows if the store hasn't got any configured
// yet (mirrors ExpressStore's own schema defaults).
const DEFAULT_SLOT_WINDOWS = [
  { startHour: 9,  endHour: 12, label: '9:00 AM - 12:00 PM', enabled: true },
  { startHour: 12, endHour: 15, label: '12:00 PM - 3:00 PM', enabled: true },
  { startHour: 15, endHour: 18, label: '3:00 PM - 6:00 PM', enabled: true },
  { startHour: 18, endHour: 21, label: '6:00 PM - 9:00 PM', enabled: true },
];

function DeliverySlotsPanel({ store, onChanged }) {
  const initial = store.deliverySlots?.windows?.length ? store.deliverySlots.windows : DEFAULT_SLOT_WINDOWS;
  const [windows, setWindows] = useState(initial.map(w => ({ ...w })));
  // Defaults to true when unset, matching ExpressStore's schema default —
  // so the toggle here reflects what the customer actually sees rather than
  // falsely showing OFF for a store that's never been saved.
  const [nextDayEnabled, setNextDayEnabled] = useState(store.deliverySlots?.nextDayEnabled ?? true);
  const [saving, setSaving] = useState(false);

  const toggleWindow = (idx) => {
    setWindows(ws => ws.map((w, i) => i === idx ? { ...w, enabled: !w.enabled } : w));
  };
  const updateWindow = (idx, field, value) => {
    setWindows(ws => ws.map((w, i) => i === idx ? { ...w, [field]: value } : w));
  };
  const addWindow = () => {
    setWindows(ws => [...ws, { startHour: 9, endHour: 12, label: 'New window', enabled: true }]);
  };
  const removeWindow = (idx) => {
    setWindows(ws => ws.filter((_, i) => i !== idx));
  };

  const save = async () => {
    const clean = windows.filter(w => w.label?.trim() && Number(w.endHour) > Number(w.startHour));
    if (!clean.length) return toast.error('At least one valid delivery window is required');
    setSaving(true);
    try {
      await api.patch(`/express/admin/stores/${store._id}/delivery-slots`, {
        windows: clean.map(w => ({ startHour: Number(w.startHour), endHour: Number(w.endHour), label: w.label.trim(), enabled: !!w.enabled })),
        nextDayEnabled,
      });
      toast.success('Delivery slots updated');
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update delivery slots');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t grid gap-2.5">
      <p className="text-xs text-gray-500">Turn individual time windows on/off for this store, and allow next-day scheduling if this store can take advance orders.</p>
      <div className="grid gap-1.5">
        {windows.map((w, idx) => (
          <div key={idx} className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-2">
            <button onClick={() => toggleWindow(idx)}
              className={`shrink-0 ${w.enabled ? 'text-green-600' : 'text-gray-300'}`}>
              {w.enabled ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
            </button>
            <input type="number" min={0} max={23} value={w.startHour}
              onChange={e => updateWindow(idx, 'startHour', e.target.value)}
              className="w-14 border rounded-lg px-2 py-1 text-xs" title="Start hour (24h)" />
            <span className="text-xs text-gray-400">to</span>
            <input type="number" min={1} max={24} value={w.endHour}
              onChange={e => updateWindow(idx, 'endHour', e.target.value)}
              className="w-14 border rounded-lg px-2 py-1 text-xs" title="End hour (24h)" />
            <input type="text" value={w.label}
              onChange={e => updateWindow(idx, 'label', e.target.value)}
              className="flex-1 min-w-0 border rounded-lg px-2 py-1 text-xs" placeholder="Label shown to customer" />
            <button onClick={() => removeWindow(idx)} className="shrink-0 text-gray-300 hover:text-red-500">
              <FiTrash2 size={14} />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addWindow} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 w-fit">
        <FiPlus size={12} /> Add window
      </button>

      <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mt-1">
        <button onClick={() => setNextDayEnabled(v => !v)} className={nextDayEnabled ? 'text-green-600' : 'text-gray-300'}>
          {nextDayEnabled ? <FiToggleRight size={20} /> : <FiToggleLeft size={20} />}
        </button>
        Offer next-day delivery at this store
      </label>

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 w-fit">
        {saving ? 'Saving…' : 'Save Delivery Slots'}
      </button>
    </div>
  );
}

// Per-store minimum-order delivery fee. Applies irrespective of distance —
// a customer right next to the store ordering below the minimum pays this
// exact fee just like a customer further away (see computeDeliveryFee in
// expressPricingService.js on the backend). Defaults mirror the schema's
// own defaults (₹199 / ₹29) for a store that hasn't been configured yet.
function DeliveryFeePanel({ store, onChanged }) {
  const [minOrder, setMinOrder] = useState(store.deliveryFeeConfig?.minOrderForFreeDelivery ?? 199);
  const [fee, setFee] = useState(store.deliveryFeeConfig?.deliveryFeeBelowMinimum ?? 29);
  // Hard delivery-range cutoff for THIS store — blank means "use the
  // platform default from Settings", not zero.
  const [maxKm, setMaxKm] = useState(store.deliveryFeeConfig?.maxDeliveryDistanceKm ?? '');
  // Distance surcharge tiering — e.g. first 5 km free, then +₹18 every 2 km
  // beyond that. chargePerStep left at 0 disables the surcharge entirely.
  const [freeKm, setFreeKm] = useState(store.deliveryFeeConfig?.freeDeliveryDistanceKm ?? 5);
  const [stepKm, setStepKm] = useState(store.deliveryFeeConfig?.distanceStepKm ?? 2);
  const [chargePerStep, setChargePerStep] = useState(store.deliveryFeeConfig?.distanceChargePerStep ?? 0);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const minOrderNum = Number(minOrder), feeNum = Number(fee);
    const maxKmNum = maxKm === '' ? null : Number(maxKm);
    const freeKmNum = Number(freeKm), stepKmNum = Number(stepKm), chargeNum = Number(chargePerStep);
    if (!Number.isFinite(minOrderNum) || minOrderNum < 0 || !Number.isFinite(feeNum) || feeNum < 0) {
      return toast.error('Enter valid non-negative numbers');
    }
    if (maxKmNum != null && (!Number.isFinite(maxKmNum) || maxKmNum < 0)) {
      return toast.error('Max delivery distance must be a non-negative number (or blank to use the platform default)');
    }
    if (!Number.isFinite(freeKmNum) || freeKmNum < 0 || !Number.isFinite(stepKmNum) || stepKmNum <= 0 || !Number.isFinite(chargeNum) || chargeNum < 0) {
      return toast.error('Enter valid numbers for the distance surcharge fields');
    }
    setSaving(true);
    try {
      await api.patch(`/express/admin/stores/${store._id}/delivery-fee`, {
        minOrderForFreeDelivery: minOrderNum, deliveryFeeBelowMinimum: feeNum,
        maxDeliveryDistanceKm: maxKmNum,
        freeDeliveryDistanceKm: freeKmNum, distanceStepKm: stepKmNum, distanceChargePerStep: chargeNum,
      });
      toast.success('Delivery fee rule updated');
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update delivery fee rule');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t grid gap-2.5">
      <p className="text-xs text-gray-500">
        Applies to every order at this store regardless of the customer&rsquo;s distance — orders below
        the minimum are charged the fee, orders at or above it get free delivery.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-xs font-semibold text-gray-500">Minimum Order for Free Delivery (₹)
          <input type="number" min={0} value={minOrder} onChange={e => setMinOrder(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
        <label className="text-xs font-semibold text-gray-500">Delivery Fee Below Minimum (₹)
          <input type="number" min={0} value={fee} onChange={e => setFee(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
      </div>

      <p className="text-xs text-gray-500 pt-2 border-t">
        Maximum delivery distance for this store — leave blank to use the platform-wide default set in Settings.
      </p>
      <label className="text-xs font-semibold text-gray-500">Max Delivery Distance (km)
        <input type="number" min={0} placeholder="Platform default" value={maxKm} onChange={e => setMaxKm(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm w-full mt-1 sm:w-48" />
      </label>

      <p className="text-xs text-gray-500 pt-2 border-t">
        Distance surcharge, added on top of the fee above — e.g. first 5 km free, then +₹18 for every
        additional 2 km. Leave &ldquo;Charge per Step&rdquo; at 0 to disable this surcharge.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs font-semibold text-gray-500">Free Distance (km)
          <input type="number" min={0} step="0.5" value={freeKm} onChange={e => setFreeKm(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
        <label className="text-xs font-semibold text-gray-500">Step Size (km)
          <input type="number" min={0.1} step="0.5" value={stepKm} onChange={e => setStepKm(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
        <label className="text-xs font-semibold text-gray-500">Charge per Step (₹)
          <input type="number" min={0} value={chargePerStep} onChange={e => setChargePerStep(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>
      </div>

      <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 w-fit">
        {saving ? 'Saving…' : 'Save Delivery Fee'}
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════
// STORES TAB
// ══════════════════════════════════════════════
function StoresTab({ stores, reload }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', address: '', city: 'Chennai', pincode: '', lat: '', lng: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code || !form.lat || !form.lng) return toast.error('Name, code, lat and lng are required');
    setSaving(true);
    try {
      await api.post('/express/admin/stores', form);
      toast.success('Store created');
      setForm({ name: '', code: '', address: '', city: 'Chennai', pincode: '', lat: '', lng: '', notes: '' });
      setShowForm(false);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create store');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (storeId) => {
    try {
      await api.patch(`/express/admin/stores/${storeId}/toggle`);
      reload();
    } catch {
      toast.error('Failed to toggle store status');
    }
  };

  const togglePause = async (s) => {
    let message = null;
    if (!s.isPaused) {
      message = window.prompt(
        "Reason to show customers while checkout is on hold (e.g. 'Store closed for stock count, back at 4 PM'). Browsing and adding to cart stay open regardless:",
        ""
      );
      if (message === null) return; // cancelled
    }
    try {
      await api.patch(`/express/admin/stores/${s._id}/toggle-pause`, { message });
      toast.success(s.isPaused
        ? 'Checkout reopened — taking orders again'
        : 'Checkout put on hold — customers can still browse & add to cart, and we\'re logging who tries to check out so you can call them back');
      reload();
    } catch {
      toast.error('Failed to update hold status');
    }
  };

  const [waitlistStoreId, setWaitlistStoreId] = useState(null); // which store's waitlist panel is open
  const [slotsStoreId, setSlotsStoreId] = useState(null); // which store's delivery-slots panel is open
  const [feeStoreId, setFeeStoreId] = useState(null); // which store's delivery-fee panel is open

  const openEdit = (s) => {
    setEditId(s._id);
    setEditForm({
      name: s.name || '', address: s.address || '', city: s.city || '', pincode: s.pincode || '',
      lat: s.location?.lat ?? '', lng: s.location?.lng ?? '', notes: s.notes || '',
    });
  };

  const saveEdit = async (storeId) => {
    if (!editForm.name || !editForm.lat || !editForm.lng) return toast.error('Name, lat and lng are required');
    setEditSaving(true);
    try {
      await api.put(`/express/admin/stores/${storeId}`, editForm);
      toast.success('Store updated');
      setEditId(null);
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update store');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">Store Locations</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={14} /> Add Store
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Store name (e.g. Valasaravakkam)" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Code (e.g. VALASARAVAKKAM)" value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Address" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
          <input placeholder="City" value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Pincode" value={form.pincode}
            onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Latitude" value={form.lat}
            onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Longitude" value={form.lng}
            onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Notes (optional)" value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Store'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {stores.map(s => (
          <div key={s._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-bold text-gray-800">{s.name} <span className="text-xs text-gray-400 font-normal">({s.code})</span>
                  {s.isPaused && <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold align-middle">ON HOLD</span>}
                </p>
                <p className="text-xs text-gray-500">{s.address}{s.city ? `, ${s.city}` : ''} {s.pincode}</p>
                <p className="text-xs text-gray-400">Manager: {s.storeManager?.name || 'Not assigned'}</p>
                <p className="text-xs text-gray-400">{s.location?.lat}, {s.location?.lng}</p>
                {s.isPaused && <p className="text-xs text-amber-600 mt-1 italic">&ldquo;{s.pauseMessage}&rdquo;</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(s)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiEdit2 size={12} /> Edit
                </button>
                {/* The main action for this feature — bigger, bolder, and
                    unambiguous about what it does: solid amber when live
                    (impossible to miss), outlined-but-clear when off. */}
                <button onClick={() => togglePause(s)}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black shadow-sm transition
                    ${s.isPaused ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-white border-2 border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                  {s.isPaused ? <FiPlayCircle size={18} /> : <FiPauseCircle size={18} />}
                  {s.isPaused ? 'Reopen Checkout' : 'Hold Checkout'}
                </button>
                <button onClick={() => setSlotsStoreId(id => id === s._id ? null : s._id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiClock size={13} /> Delivery Slots
                </button>
                <button onClick={() => setFeeStoreId(id => id === s._id ? null : s._id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiDollarSign size={13} /> Delivery Fee
                </button>
                <button onClick={() => toggleActive(s._id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {s.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {s.isActive ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>

            {slotsStoreId === s._id && <DeliverySlotsPanel store={s} onChanged={reload} />}
            {feeStoreId === s._id && <DeliveryFeePanel store={s} onChanged={reload} />}

            {/* Who's waiting to order — shown whenever anyone has hit the
                checkout gate for this store, whether it's paused right now
                or was earlier (the list survives a resume so nothing is
                lost before Admin gets a chance to call back). */}
            {s.pendingWaitlistCount > 0 && (
              <button onClick={() => setWaitlistStoreId(id => id === s._id ? null : s._id)}
                className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100">
                <FiUsers size={13} />
                {s.pendingWaitlistCount} {s.pendingWaitlistCount === 1 ? 'customer' : 'customers'} waiting to order — {waitlistStoreId === s._id ? 'hide list' : 'view & call back'}
              </button>
            )}
            {waitlistStoreId === s._id && <HoldWaitlistPanel storeId={s._id} onChanged={reload} />}

            {editId === s._id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input placeholder="Store name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="City" value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Address" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
                <input placeholder="Pincode" value={editForm.pincode} onChange={e => setEditForm(f => ({ ...f, pincode: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Notes" value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Latitude" value={editForm.lat} onChange={e => setEditForm(f => ({ ...f, lat: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Longitude" value={editForm.lng} onChange={e => setEditForm(f => ({ ...f, lng: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(s._id)} disabled={editSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {stores.length === 0 && <p className="text-sm text-gray-400">No stores yet — add your first one above.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MANAGERS TAB
// ══════════════════════════════════════════════
function ManagersTab({ stores }) {
  const [managers, setManagers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', password: '', storeId: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const load = () => api.get('/express/admin/managers').then(r => setManagers(r.data.managers || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.password || !form.storeId) return toast.error('All fields are required');
    setSaving(true);
    try {
      await api.post('/express/admin/managers', form);
      toast.success('Store manager created');
      setForm({ name: '', phone: '', password: '', storeId: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create manager');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (m) => {
    try {
      await api.put(`/express/admin/managers/${m._id}`, { isActive: !m.isActive });
      load();
    } catch { toast.error('Failed to update manager'); }
  };

  const openEdit = (m) => { setEditId(m._id); setEditForm({ name: m.name || '', phone: m.phone || '', password: '' }); };

  const saveEdit = async (managerId) => {
    if (!editForm.name || !editForm.phone) return toast.error('Name and phone are required');
    setEditSaving(true);
    try {
      const payload = { name: editForm.name, phone: editForm.phone };
      if (editForm.password) payload.password = editForm.password;
      await api.put(`/express/admin/managers/${managerId}`, payload);
      toast.success(editForm.password ? 'Manager updated and password reset' : 'Manager updated');
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update manager');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">Store Managers</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={14} /> Add Manager
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Phone (10 digits)" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Assign to store…</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Create Manager'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {managers.map(m => (
          <div key={m._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-bold text-gray-800">{m.name}</p>
                <p className="text-xs text-gray-500">{m.phone} · {m.store?.name || 'No store'}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(m)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => toggleActive(m)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${m.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {m.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {m.isActive ? 'Active' : 'Suspended'}
                </button>
              </div>
            </div>

            {editId === m._id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input placeholder="Full name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Phone" value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="New password (leave blank to keep current)" type="password" value={editForm.password}
                  onChange={e => setEditForm(f => ({ ...f, password: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(m._id)} disabled={editSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {managers.length === 0 && <p className="text-sm text-gray-400">No store managers yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// POS USERS TAB
// ══════════════════════════════════════════════
function POSUsersTab({ stores }) {
  const [posUsers, setPosUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', username: '', pin: '', storeId: '' });
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);

  const load = () => api.get('/express/admin/pos-users').then(r => setPosUsers(r.data.posUsers || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.username || !form.pin || !form.storeId) return toast.error('All fields are required');
    setSaving(true);
    try {
      await api.post('/express/admin/pos-users', form);
      toast.success('POS user created');
      setForm({ name: '', username: '', pin: '', storeId: '' });
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create POS user');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    try {
      await api.put(`/express/admin/pos-users/${p._id}`, { isActive: !p.isActive });
      load();
    } catch { toast.error('Failed to update POS user'); }
  };

  const openEdit = (p) => { setEditId(p._id); setEditForm({ name: p.name || '', pin: '' }); };

  const saveEdit = async (posUserId) => {
    if (!editForm.name) return toast.error('Name is required');
    setEditSaving(true);
    try {
      const payload = { name: editForm.name };
      if (editForm.pin) payload.pin = editForm.pin;
      await api.put(`/express/admin/pos-users/${posUserId}`, payload);
      toast.success(editForm.pin ? 'POS user updated and PIN reset' : 'POS user updated');
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update POS user');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">POS Users</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={14} /> Add POS User
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input placeholder="Full name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Username" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="PIN (min 4 digits)" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <select value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
            <option value="">Assign to store…</option>
            {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
          </select>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Create POS User'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {posUsers.map(p => (
          <div key={p._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="font-bold text-gray-800">{p.name}</p>
                <p className="text-xs text-gray-500">@{p.username} · {p.store?.name || 'No store'}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => toggleActive(p)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${p.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.isActive ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {p.isActive ? 'Active' : 'Suspended'}
                </button>
              </div>
            </div>

            {editId === p._id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input placeholder="Full name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="New PIN (leave blank to keep current)" value={editForm.pin}
                  onChange={e => setEditForm(f => ({ ...f, pin: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(p._id)} disabled={editSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {posUsers.length === 0 && <p className="text-sm text-gray-400">No POS users yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// PRODUCTS TAB
// ══════════════════════════════════════════════
function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null); // the chosen Koyambedu product
  const [form, setForm] = useState({ unit: 'kg', unitsPerKg: '', procurementBaseCost: '', customMarginPct: '', minOrderQty: '', maxOrderQty: '' });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState({}); // productId -> breakdown
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // click-to-confirm, no native dialog
  const [pluEditId, setPluEditId] = useState(null);
  const [pluDraft, setPluDraft] = useState('');
  const [pluSavingId, setPluSavingId] = useState(null);

  const load = () => api.get('/express/admin/products').then(r => setProducts(r.data.products || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  // PLU (Price Look-Up) quick-entry code shown/edited inline on each product
  // row — vegetables 100-199, fruits 200-299, auto-assigned on link but
  // overridable here. Lets POS staff key in a 3-digit code instead of
  // searching by name.
  const openPluEdit = (p) => { setPluEditId(p._id); setPluDraft(p.plu != null ? String(p.plu) : ''); };
  const savePlu = async (productId) => {
    setPluSavingId(productId);
    try {
      await api.patch(`/express/admin/products/${productId}/plu`, { plu: pluDraft === '' ? null : Number(pluDraft) });
      toast.success('PLU code updated');
      setPluEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update PLU code');
    } finally {
      setPluSavingId(null);
    }
  };

  const openEdit = (p) => {
    setEditId(p._id);
    setEditForm({
      unit: p.unit || 'kg',
      unitsPerKg: p.unitsPerKg ?? '',
      procurementBaseCost: p.procurementBaseCost ?? '',
      customMarginPct: p.customMarginPct ?? '',
      minOrderQty: p.minOrderQty ?? '',
      maxOrderQty: p.maxOrderQty ?? '',
      isActive: p.isActive !== false,
    });
  };

  const saveEdit = async (productId) => {
    setEditSaving(true);
    try {
      await api.put(`/express/admin/products/${productId}`, {
        unit: editForm.unit,
        unitsPerKg: editForm.unitsPerKg === '' ? null : editForm.unitsPerKg,
        procurementBaseCost: editForm.procurementBaseCost,
        customMarginPct: editForm.customMarginPct === '' ? null : editForm.customMarginPct,
        minOrderQty: editForm.minOrderQty === '' ? undefined : editForm.minOrderQty,
        maxOrderQty: editForm.maxOrderQty === '' ? '' : editForm.maxOrderQty,
        isActive: editForm.isActive,
      });
      toast.success('Product updated');
      setEditId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update product');
    } finally {
      setEditSaving(false);
    }
  };

  // Click-to-confirm instead of window.confirm() — native confirm() dialogs
  // can be silently suppressed in some embedded/webview contexts, which
  // made Delete appear to do nothing. First click arms it; a second click
  // on the now-red "Confirm Delete?" button actually deletes; it
  // auto-disarms after a few seconds or if you click elsewhere.
  const deleteProduct = async (p) => {
    if (confirmDeleteId !== p._id) { setConfirmDeleteId(p._id); return; }
    setConfirmDeleteId(null);
    setDeletingId(p._id);
    try {
      await api.delete(`/express/admin/products/${p._id}`);
      toast.success('Product deleted from Express');
      load();
    } catch (err) {
      console.error('[ExpressAdmin.deleteProduct]', err);
      toast.error(err?.response?.data?.message || 'Failed to delete product');
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  // Debounced search against Koyambedu Daily's catalogue — Express links to
  // an existing product rather than typing its own name/image/description.
  useEffect(() => {
    if (!showForm) return;
    const t = setTimeout(() => {
      setSearching(true);
      api.get(`/express/admin/koyambedu-catalog?search=${encodeURIComponent(search)}`)
        .then(r => setSearchResults(r.data.products || []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, showForm]);

  const pickProduct = (kb) => {
    setSelected(kb);
    setForm(f => ({ ...f, unit: kb.unit || 'kg' }));
    setSearchResults([]);
    setSearch(kb.name);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selected) return toast.error('Search and select a Koyambedu Daily product first');
    if (!form.unit || !form.procurementBaseCost) return toast.error('Unit and procurement cost are required');
    setSaving(true);
    try {
      await api.post('/express/admin/products', {
        koyambeduProductId: selected._id,
        unit: form.unit,
        unitsPerKg: form.unitsPerKg || null,
        procurementBaseCost: form.procurementBaseCost,
        customMarginPct: form.customMarginPct || null,
        minOrderQty: form.minOrderQty || null,
        maxOrderQty: form.maxOrderQty || null,
      });
      toast.success('Product linked to Express');
      setForm({ unit: 'kg', unitsPerKg: '', procurementBaseCost: '', customMarginPct: '', minOrderQty: '', maxOrderQty: '' });
      setSelected(null); setSearch(''); setShowForm(false);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  const loadPreview = async (productId) => {
    try {
      const { data } = await api.get(`/express/admin/products/${productId}/price-preview?quantity=1`);
      setPreview(p => ({ ...p, [productId]: data.breakdown }));
    } catch { toast.error('Failed to compute price preview'); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h2 className="font-bold text-gray-700">Product Catalogue</h2>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">
          <FiPlus size={14} /> Link Product
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-3">
        Product name, description and photo always come from Koyambedu Daily's catalogue — Express only manages its own procurement cost, unit and margin here.
      </p>

      {showForm && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2 relative">
            <input placeholder="Search Koyambedu Daily products…" value={search}
              onChange={e => { setSearch(e.target.value); setSelected(null); }}
              className="border rounded-lg px-3 py-2 text-sm w-full" />
            {searching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
            {searchResults.length > 0 && !selected && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {searchResults.map(kb => (
                  <button type="button" key={kb._id} onClick={() => pickProduct(kb)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm">
                    {kb.images?.[0]?.url && <img src={kb.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
                    <span>{kb.name} <span className="text-xs text-gray-400">({kb.unit})</span></span>
                    {kb.isActive === false && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Disabled in Koyambedu</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
          {selected && (
            <div className="sm:col-span-2 flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
              {selected.images?.[0]?.url && <img src={selected.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
              <span className="text-sm font-semibold text-indigo-900">{selected.name}</span>
              {selected.isActive === false && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-600">Disabled in Koyambedu</span>}
            </div>
          )}
          <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
            {['kg', 'gram', 'piece', 'bunch', 'litre', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input placeholder="Units per kg (only if bunch/piece, e.g. 10)" value={form.unitsPerKg}
            onChange={e => setForm(f => ({ ...f, unitsPerKg: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Procurement cost (₹/kg or ₹/unit)" value={form.procurementBaseCost}
            onChange={e => setForm(f => ({ ...f, procurementBaseCost: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Custom margin % (optional override)" value={form.customMarginPct}
            onChange={e => setForm(f => ({ ...f, customMarginPct: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <div>
            <input type="number" step="0.01" min="0.01" placeholder="Min order qty (e.g. 0.25 for 250 g)" value={form.minOrderQty}
              onChange={e => setForm(f => ({ ...f, minOrderQty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full" />
            <p className="text-[10px] text-gray-400 mt-1">Smallest amount a customer can order (defaults to 0.25 kg). Only matters for kg/weight-based units.</p>
          </div>
          <div>
            <input type="number" step="0.01" min="0.01" placeholder="Max order qty per order (optional)" value={form.maxOrderQty}
              onChange={e => setForm(f => ({ ...f, maxOrderQty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full" />
            <p className="text-[10px] text-gray-400 mt-1">Cap on how much of this item one customer can buy per order (leave blank for no cap). Separate from stock.</p>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {saving ? 'Saving…' : 'Link Product'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setSelected(null); setSearch(''); }} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      <div className="grid gap-3">
        {products.map(p => (
          <div key={p._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {(p.koyambeduProduct?.images?.[0]?.url || p.image) && <img src={p.koyambeduProduct?.images?.[0]?.url || p.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />}
                <div className="min-w-0">
                  <p className="font-bold text-gray-800 truncate flex items-center gap-1.5">
                    {p.koyambeduProduct?.name || p.name || '(unnamed product)'}
                    {!p.koyambeduProduct && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{p.isCombo ? 'Combo' : 'Native'}</span>}
                    {p.isActive === false && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Inactive</span>}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.plu != null ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                      PLU {p.plu != null ? p.plu : '—'}
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    ₹{p.procurementBaseCost}/{p.unit}{p.unitsPerKg ? ` · ${p.unitsPerKg} ${p.unit}s/kg` : ''}
                    {p.customMarginPct != null ? ` · Custom margin ${p.customMarginPct}%` : ''}
                    {p.unit === 'kg' ? ` · Min order ${p.minOrderQty != null ? p.minOrderQty : 0.25} kg` : ''}
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button onClick={() => loadPreview(p._id)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  Preview Price
                </button>
                <button onClick={() => copyExpressProductLink(p._id)}
                  title="Copy a shareable link — paste into a Hero Banner's 'Links to' field, or share directly"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50 text-indigo-600 border-indigo-200">
                  <FiLink2 size={12} /> Copy Link
                </button>
                <button onClick={() => openPluEdit(p)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  Set PLU
                </button>
                <button onClick={() => openEdit(p)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-gray-50">
                  <FiEdit2 size={12} /> Edit
                </button>
                <button onClick={() => deleteProduct(p)} disabled={deletingId === p._id}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${confirmDeleteId === p._id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>
                  <FiTrash2 size={12} /> {deletingId === p._id ? 'Deleting…' : confirmDeleteId === p._id ? 'Confirm Delete?' : 'Delete'}
                </button>
              </div>
            </div>

            {preview[p._id] && (
              <div className="mt-2 pt-2 border-t text-xs text-gray-600 grid grid-cols-2 sm:grid-cols-4 gap-2">
                <span>Procurement: ₹{preview[p._id].procurementCost}</span>
                <span>Logistics: ₹{preview[p._id].logisticsCostPerUnit}</span>
                <span>Platform ({preview[p._id].platformPct}%): ₹{preview[p._id].platformCharge}</span>
                <span>Salesman ({preview[p._id].salesmanPct}%): ₹{preview[p._id].salesmanCharge}</span>
                <span>Packing ({preview[p._id].packingPct}%): ₹{preview[p._id].packingCharge}</span>
                <span className="font-bold text-gray-800">Selling Price: ₹{preview[p._id].sellingPricePerUnit}</span>
              </div>
            )}

            {pluEditId === p._id && (
              <div className="mt-2 pt-2 border-t flex items-center gap-2">
                <input type="number" min="100" max="299" placeholder="e.g. 214" value={pluDraft}
                  onChange={e => setPluDraft(e.target.value)}
                  className="w-28 border rounded-lg px-2 py-1.5 text-sm" />
                <span className="text-xs text-gray-400">100-199 vegetables · 200-299 fruits · blank clears</span>
                <button onClick={() => savePlu(p._id)} disabled={pluSavingId === p._id}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50">
                  {pluSavingId === p._id ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setPluEditId(null)} className="px-3 py-1.5 rounded-lg border text-xs font-semibold">Cancel</button>
              </div>
            )}

            {editId === p._id && (
              <div className="mt-3 pt-3 border-t grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select value={editForm.unit} onChange={e => setEditForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                  {['kg', 'gram', 'piece', 'bunch', 'litre', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <input placeholder="Units per kg" value={editForm.unitsPerKg}
                  onChange={e => setEditForm(f => ({ ...f, unitsPerKg: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Procurement cost" value={editForm.procurementBaseCost}
                  onChange={e => setEditForm(f => ({ ...f, procurementBaseCost: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="Custom margin % (optional)" value={editForm.customMarginPct}
                  onChange={e => setEditForm(f => ({ ...f, customMarginPct: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="number" step="0.01" min="0.01" placeholder="Min order qty (e.g. 0.25)" value={editForm.minOrderQty}
                  onChange={e => setEditForm(f => ({ ...f, minOrderQty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="number" step="0.01" min="0.01" placeholder="Max order qty per order (optional)" value={editForm.maxOrderQty}
                  onChange={e => setEditForm(f => ({ ...f, maxOrderQty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
                <button onClick={() => setEditForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold justify-center sm:col-span-2 ${editForm.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {editForm.isActive ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {editForm.isActive ? 'Active' : 'Inactive'}
                </button>
                <div className="sm:col-span-2 flex gap-2">
                  <button onClick={() => saveEdit(p._id)} disabled={editSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
                    {editSaving ? 'Saving…' : 'Save Changes'}
                  </button>
                  <button onClick={() => setEditId(null)} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
                </div>
              </div>
            )}
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-gray-400">No products linked yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// STORE INVENTORY TAB — admin directly allocates stock to a store
// Complements (doesn't replace) the Store Manager request → Admin approve
// flow in Inventory Requests. "Add Stock" ADDS to whatever the store
// already has (each delivery accumulates onto existing stock, rather than
// overwriting it) — the toggle and remove actions are separate, immediate
// actions. A "Stock Report" section below shows every addition (by admin)
// and loss (reported by the Store Manager) for the selected store.
// ══════════════════════════════════════════════
// ── Online Catalog ──────────────────────────────────────────────────────
// Every active Koyambedu Daily product is a candidate for every store — no
// "link into Express" step needed first. Admin just picks which ones to
// show online for THIS store, at what price (Koyambedu's own price is shown
// alongside purely as a wholesale reference point). Deliberately separate
// from the Store Inventory tab above: toggling a product on here never
// touches stock, the manager dashboard, or the POS terminal — it only
// controls what the customer-facing Express shop displays and at what
// price. One "Save All" action for the whole screen, not a click per row.
function OnlineCatalogTab({ stores, reload }) {
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({}); // rowId (koyambeduProductId or expressProductId) -> { isEnabled, price }
  const [saving, setSaving] = useState(false);
  const [togglingShop, setTogglingShop] = useState(false);

  // Looked up from the shared `stores` list (kept in sync by the parent's
  // reload()) rather than its own state, so it always reflects the latest
  // toggle without a second round-trip.
  const selectedStore = stores.find(s => s._id === storeId);

  const toggleOnlineShop = async () => {
    if (!storeId) return;
    setTogglingShop(true);
    try {
      await api.patch(`/express/admin/stores/${storeId}/toggle-online-shop`);
      toast.success(selectedStore?.onlineShopEnabled ? 'Online shop turned OFF for this store' : 'Online shop turned ON for this store');
      reload?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update online shop status');
    } finally {
      setTogglingShop(false);
    }
  };

  const loadCatalog = () => {
    if (!storeId) { setItems([]); return; }
    setLoading(true);
    api.get(`/express/admin/stores/${storeId}/online-catalog`)
      .then(r => { setItems(r.data.items || []); setStoreName(r.data.store?.name || ''); setDrafts({}); })
      .catch(() => toast.error('Failed to load online catalog'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadCatalog(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Generic row id works for both a Koyambedu-linked row and a fully-native
  // Express product/combo row — exactly one of the two ids is ever present.
  const rowId = (it) => String(it.koyambeduProductId || it.expressProductId);

  const [catFilter, setCatFilter] = useState('');
  const [onlineFilter, setOnlineFilter] = useState(''); // '' | 'on' | 'off'
  const categories = [...new Set(items.map(it => it.category).filter(Boolean))].sort();

  const rows = items
    .filter(it => !search.trim() || it.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter(it => !catFilter || it.category === catFilter)
    .filter(it => {
      if (!onlineFilter) return true;
      const on = drafts[rowId(it)]?.isEnabled ?? it.isEnabled;
      return onlineFilter === 'on' ? on : !on;
    });

  const draftFor = (id) => drafts[id] || {};
  const setDraft = (id, patch) => setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));

  const saveAll = async () => {
    if (!storeId) return toast.error('Select a store first');
    const changed = Object.entries(drafts).filter(([, v]) =>
      v.isEnabled !== undefined || v.price !== undefined || v.mrp !== undefined || v.procurementBaseCost !== undefined);
    if (!changed.length) return toast('Nothing changed to save', { icon: 'ℹ️' });

    const payload = changed.map(([id, v]) => {
      const row = items.find(it => rowId(it) === id);
      const base = row?.source === 'native' ? { expressProductId: id } : { koyambeduProductId: id };
      return {
        ...base,
        isEnabled: v.isEnabled ?? row?.isEnabled ?? false,
        price: v.price !== undefined ? (v.price === '' ? null : Number(v.price)) : row?.price,
        mrp: v.mrp !== undefined ? (v.mrp === '' ? null : Number(v.mrp)) : row?.mrp,
        // Only sent when the admin actually typed something this round —
        // omitting it (vs sending it as null/0) leaves the product's
        // existing procurement cost untouched if they left it blank.
        ...(v.procurementBaseCost !== undefined && v.procurementBaseCost !== ''
          ? { procurementBaseCost: Number(v.procurementBaseCost) }
          : {}),
      };
    });

    setSaving(true);
    try {
      await api.patch(`/express/admin/stores/${storeId}/online-catalog`, { items: payload });
      toast.success(`Saved ${payload.length} item${payload.length === 1 ? '' : 's'}`);
      loadCatalog();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save online catalog');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border p-4">
      <h3 className="font-bold text-gray-800 mb-1">Online Catalog</h3>
      <p className="text-xs text-gray-500 mb-4">
        Every Koyambedu Daily product, plus every Express-native product/combo created in "Create Product/Combo",
        is listed here automatically. Tick "Online" to make it appear in the Express shop for this store — the
        wholesale/base cost shown is only a reference, it does not have to match. If you don't type a price, it
        defaults to cost + 15%; type your own number anytime to override it. Leaving a product unticked keeps it
        out of the online shop without affecting anything else.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm sm:w-64">
          <option value="">Select a store…</option>
          {stores.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        {storeId && (
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1" />
        )}
        {storeId && (
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">All categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        {storeId && (
          <select value={onlineFilter} onChange={e => setOnlineFilter(e.target.value)} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">Online + Offline</option>
            <option value="on">Online only</option>
            <option value="off">Offline only</option>
          </select>
        )}
        {storeId && (
          <button onClick={saveAll} disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-white text-sm font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shrink-0">
            {saving ? 'Saving…' : 'Save All'}
          </button>
        )}
      </div>

      {storeId && (
        <div className="flex items-center justify-between gap-3 mb-4 p-3 rounded-xl border bg-gray-50">
          <div>
            <p className="text-sm font-bold text-gray-700">Online Shop — {selectedStore?.name}</p>
            <p className="text-xs text-gray-500">
              Master switch for this store's customer-facing online shop — separate from the Store Active switch
              (Stores tab), which controls POS/in-person business. Turning this off hides the store from the Express
              app's store list entirely, even if individual products below are ticked online.
            </p>
          </div>
          <button onClick={toggleOnlineShop} disabled={togglingShop}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold shrink-0 disabled:opacity-50"
            style={selectedStore?.onlineShopEnabled
              ? { background: '#dcfce7', color: '#16a34a' }
              : { background: '#fee2e2', color: '#dc2626' }}>
            {selectedStore?.onlineShopEnabled ? <FiToggleRight size={18} /> : <FiToggleLeft size={18} />}
            {togglingShop ? 'Updating…' : selectedStore?.onlineShopEnabled ? 'Online Shop: ON' : 'Online Shop: OFF'}
          </button>
        </div>
      )}

      {!storeId ? (
        <p className="text-sm text-gray-400 py-6 text-center">Select a store to manage its online catalog.</p>
      ) : loading ? (
        <p className="text-sm text-gray-400 py-6 text-center">Loading…</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 text-right">Wholesale / Base Cost</th>
                <th className="px-3 py-2 text-right">Procurement Cost</th>
                <th className="px-3 py-2 text-center">Online</th>
                <th className="px-3 py-2 text-right">MRP</th>
                <th className="px-3 py-2 text-right">Online Price</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const id = rowId(row);
                const d = draftFor(id);
                const isEnabled = d.isEnabled ?? row.isEnabled;
                return (
                  <tr key={id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-700">
                      {row.name} <span className="text-gray-400 font-normal">· {row.unit}</span>
                      {row.source === 'native' && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 align-middle">
                          {row.isCombo ? 'Combo' : 'Native'}
                        </span>
                      )}
                      {row.category && <span className="block text-[10px] text-gray-400 font-normal">{row.category}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-500">₹{(row.wholesalePrice || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" placeholder="Cost"
                        value={d.procurementBaseCost ?? (row.procurementBaseCost || '')}
                        onChange={e => setDraft(id, { procurementBaseCost: e.target.value })}
                        title="Procurement cost for this item — enter it here while turning the item on, instead of the separate Products tab form."
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:border-indigo-400" />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox" checked={isEnabled}
                        onChange={e => {
                          const checked = e.target.checked;
                          const patch = { isEnabled: checked };
                          // Pre-fill a default +15% markup over wholesale the moment a
                          // product is switched online with no price set yet — admin
                          // can still type their own number before (or after) saving.
                          if (checked && d.price === undefined && row.price == null) {
                            patch.price = (Math.round(row.wholesalePrice * 1.15 * 100) / 100).toFixed(2);
                          }
                          setDraft(id, patch);
                        }}
                        className="w-4 h-4 accent-indigo-600" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" placeholder="MRP"
                        value={d.mrp ?? (row.mrp ?? '')}
                        onChange={e => setDraft(id, { mrp: e.target.value })}
                        title="Optional strike-through maximum price — shown to the customer as a discount when higher than the online price."
                        className="w-24 border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:border-indigo-400" />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" placeholder="Default: +15%"
                        value={d.price ?? (row.price ?? '')}
                        onChange={e => setDraft(id, { price: e.target.value })}
                        className="w-28 border border-gray-200 rounded-lg px-2 py-1 text-right focus:outline-none focus:border-indigo-400" />
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-6">No products found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// CREATE PRODUCT / COMBO TAB
// Lets the Express admin create a brand-new product (or a combo bundling
// several existing Express products) entirely within Express — this never
// touches Koyambedu Daily's catalogue, sellers, or categories in any way.
// Posts to Express's own native-product endpoint (POST
// /express/admin/products/native), creating a standalone ExpressProduct
// with koyambeduProduct left absent. The combo-contents picker searches
// Express's OWN catalogue (GET /express/admin/products/native/search,
// which covers both native and Koyambedu-linked Express products) — so a
// combo can bundle either kind, but the search itself never calls into
// Koyambedu Daily. Once created, the product/combo shows up automatically
// in the Online Catalog tab (source: 'native') to be switched on per store.
// Category here is a simple free-text field scoped to Express only — see
// EXPRESS_CATEGORIES below for the fixed list including "Combos".
// ══════════════════════════════════════════════
function CreateProductTab() {
  const blankForm = { name: '', category: '', unit: 'kg', procurementBaseCost: '', minOrderQty: '', maxOrderQty: '', description: '', isCombo: false };
  const [form, setForm] = useState(blankForm);
  const [comboContents, setComboContents] = useState([]); // [{ product, name, unit, qty }]
  const [comboSearch, setComboSearch] = useState('');
  const [comboResults, setComboResults] = useState([]);
  const [comboSearching, setComboSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [recentlyCreated, setRecentlyCreated] = useState([]);
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // AI-assisted description — POST /express/admin/products/generate-description
  // (Claude, same helper as the Fruit Basket admin's generator). Pure text
  // generator: fills the Description field only, nothing is saved yet.
  const generateDescription = async () => {
    if (!form.name) return toast.error('Enter a product name first');
    setGeneratingDesc(true);
    try {
      const { data } = await api.post('/express/admin/products/generate-description', {
        name: form.name,
        category: form.isCombo ? 'Combos' : form.category,
        unit: form.unit,
        isCombo: form.isCombo,
        comboContents: form.isCombo ? comboContents : undefined,
      });
      setForm(f => ({ ...f, description: data.description }));
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not generate description');
    } finally {
      setGeneratingDesc(false);
    }
  };

  // Debounced search against Express's OWN catalogue (native + Koyambedu-
  // linked Express products) — never Koyambedu Daily directly.
  useEffect(() => {
    if (!comboSearch || comboSearch.length < 2) { setComboResults([]); return; }
    setComboSearching(true);
    const t = setTimeout(() => {
      api.get('/express/admin/products/native/search', { params: { search: comboSearch } })
        .then(r => setComboResults((r.data.products || []).slice(0, 8)))
        .catch(() => setComboResults([]))
        .finally(() => setComboSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [comboSearch]);

  const addComboItem = (p) => {
    if (comboContents.some(c => c.product === p._id)) return;
    setComboContents(c => [...c, { product: p._id, name: p.name, unit: p.unit, qty: 1 }]);
    setComboSearch(''); setComboResults([]);
  };
  const updateComboQty = (productId, qty) => setComboContents(c => c.map(i => i.product === productId ? { ...i, qty } : i));
  const removeComboItem = (productId) => setComboContents(c => c.filter(i => i.product !== productId));

  const resetForm = () => { setForm({ ...blankForm, category: form.isCombo ? 'Combos' : '' }); setComboContents([]); setComboSearch(''); setComboResults([]); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name) return toast.error('Product name is required');
    if (!form.procurementBaseCost) return toast.error('Base/procurement cost is required — Express’s margin engine prices off this');
    if (form.isCombo && comboContents.length === 0) return toast.error('Add at least one item to the combo');

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        category: form.isCombo ? 'Combos' : (form.category || undefined),
        unit: form.unit,
        description: form.description,
        procurementBaseCost: Number(form.procurementBaseCost),
        minOrderQty: form.minOrderQty || undefined,
        maxOrderQty: form.maxOrderQty || undefined,
        isCombo: form.isCombo,
        comboContents: form.isCombo ? comboContents.map(c => ({ product: c.product, name: c.name, unit: c.unit, qty: Number(c.qty) || 0 })) : [],
      };
      const { data } = await api.post('/express/admin/products/native', payload);
      toast.success(`"${form.name}" created — go to Online Catalog to enable it for a store and set its price.`);
      setRecentlyCreated(c => [{ _id: data.product._id, name: data.product.name, isCombo: form.isCombo }, ...c].slice(0, 5));
      resetForm();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-4 max-w-2xl">
      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-800">
        Create a brand-new product, or a combo bundling several existing Express products, entirely within Express —
        this never touches Koyambedu Daily's catalogue. After creating it here, go to <strong>Online Catalog</strong> to
        switch it on for a store and set its Express price (new items default to a +15% markup over base cost, which
        you can override).
      </div>

      <form onSubmit={submit} className="bg-white border rounded-xl p-4 grid gap-3">
        <label className="text-xs font-semibold text-gray-500">Product name
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Sunday Veg Combo" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-500">Category {form.isCombo && <span className="font-normal text-gray-400">(auto: Combos)</span>}
            <select value={form.isCombo ? 'Combos' : form.category} disabled={form.isCombo}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1 disabled:bg-gray-100 disabled:text-gray-400">
              <option value="">Choose category…</option>
              {EXPRESS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-500">Unit
            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mt-1">
              {['kg', 'g', 'piece', 'bunch', 'dozen', 'litre'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </div>

        <label className="text-xs font-semibold text-gray-500">Base / procurement cost (₹)
          <input type="number" value={form.procurementBaseCost} onChange={e => setForm(f => ({ ...f, procurementBaseCost: e.target.value }))}
            placeholder="What it costs Express to procure/pack this" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>

        {form.unit === 'kg' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs font-semibold text-gray-500">Min order quantity (kg)
              <input type="number" step="0.01" min="0.01" value={form.minOrderQty} onChange={e => setForm(f => ({ ...f, minOrderQty: e.target.value }))}
                placeholder="e.g. 0.25 for 250 g minimum" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
              <span className="text-[10px] font-normal text-gray-400 block mt-0.5">Smallest amount a customer can order — defaults to 0.25 kg if left blank.</span>
            </label>
            <label className="text-xs font-semibold text-gray-500">Max order quantity per order (kg)
              <input type="number" step="0.01" min="0.01" value={form.maxOrderQty} onChange={e => setForm(f => ({ ...f, maxOrderQty: e.target.value }))}
                placeholder="Optional — no cap if blank" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
              <span className="text-[10px] font-normal text-gray-400 block mt-0.5">Caps how much one customer can order per order — separate from stock.</span>
            </label>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-500">Description (optional)</label>
            <button type="button" onClick={generateDescription} disabled={generatingDesc || !form.name}
              className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 disabled:hover:text-indigo-600">
              <FiZap size={11} /> {generatingDesc ? 'Generating…' : 'Generate with AI'}
            </button>
          </div>
          <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
            placeholder="Write your own, or click Generate with AI once you've entered a name"
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={form.isCombo}
            onChange={e => setForm(f => ({ ...f, isCombo: e.target.checked, category: e.target.checked ? 'Combos' : f.category }))}
            className="w-4 h-4 accent-indigo-600" />
          This is a combo (bundles several existing Express products)
        </label>

        {form.isCombo && (
          <div className="border rounded-xl p-3 bg-gray-50">
            <p className="text-xs font-bold text-gray-600 mb-2">Combo contents</p>
            <div className="relative mb-2">
              <input value={comboSearch} onChange={e => setComboSearch(e.target.value)} placeholder="Search an Express product to add…"
                className="border rounded-lg px-3 py-2 text-sm w-full" />
              {comboSearching && <span className="absolute right-3 top-2.5 text-xs text-gray-400">Searching…</span>}
              {comboResults.length > 0 && (
                <div className="absolute z-10 left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {comboResults.map(p => (
                    <button type="button" key={p._id} onClick={() => addComboItem(p)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b last:border-b-0">
                      {p.name} <span className="text-gray-400">· {p.unit}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid gap-2">
              {comboContents.map(item => (
                <div key={item.product} className="flex items-center gap-2 bg-white border rounded-lg px-2 py-1.5">
                  <span className="flex-1 text-sm text-gray-700 truncate">{item.name}</span>
                  <input type="number" value={item.qty} onChange={e => updateComboQty(item.product, e.target.value)}
                    className="w-20 border rounded px-2 py-1 text-xs text-right" />
                  <span className="text-xs text-gray-400 w-10">{item.unit}</span>
                  <button type="button" onClick={() => removeComboItem(item.product)} className="text-red-400 hover:text-red-600"><FiX size={14} /></button>
                </div>
              ))}
              {comboContents.length === 0 && <p className="text-xs text-gray-400">No items added yet.</p>}
            </div>
          </div>
        )}

        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50 w-fit">
          {saving ? 'Creating…' : form.isCombo ? 'Create Combo' : 'Create Product'}
        </button>
      </form>

      {recentlyCreated.length > 0 && (
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-bold text-gray-700 text-sm mb-2">Just created</h3>
          <ul className="text-sm text-gray-600 grid gap-1">
            {recentlyCreated.map(p => (
              <li key={p._id} className="flex items-center gap-1.5">
                <FiCheck className="text-green-600" size={13} /> {p.name} {p.isCombo && <span className="text-xs text-indigo-500 font-semibold">(combo)</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// HERO BANNERS TAB
// Create/schedule/toggle/delete promotional banners shown at the top of
// the Express storefront (flash sale with start/end timings, lowest-price
// promos, or any custom announcement). Scheduling is purely a display
// window — see ExpressBanner.js and the customer getActiveBanners
// endpoint, which auto-filters to isActive + within-window banners, so a
// flash-sale banner set up ahead of time appears/disappears on its own.
// ══════════════════════════════════════════════
const BANNER_TYPES = [
  { value: 'flash-sale',   label: 'Flash Sale' },
  { value: 'lowest-price', label: 'Lowest Price' },
  { value: 'custom',       label: 'Custom' },
];

// Datetime-local <input> needs 'YYYY-MM-DDTHH:mm' in LOCAL time, not the ISO
// string (which is UTC) the backend returns — without this conversion the
// edit form silently shows the wrong time to the admin.
const toDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

function BannersTab() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const blankForm = {
    title: '', subtitle: '', type: 'custom', gradientFrom: '#4338ca', gradientTo: '#7c3aed',
    linkTo: '/express/shop', ctaText: 'Shop Now', startAt: '', endAt: '', isActive: true,
  };
  const [form, setForm] = useState(blankForm);
  const [imageFile, setImageFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/express/admin/banners').then(r => setBanners(r.data.banners || [])).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const resetForm = () => { setForm(blankForm); setImageFile(null); setEditingId(null); };

  const startEdit = (b) => {
    setEditingId(b._id);
    setForm({
      title: b.title, subtitle: b.subtitle || '', type: b.type, gradientFrom: b.gradientFrom, gradientTo: b.gradientTo,
      linkTo: b.linkTo, ctaText: b.ctaText, startAt: toDatetimeLocal(b.startAt), endAt: toDatetimeLocal(b.endAt),
      isActive: b.isActive,
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        // datetime-local gives "YYYY-MM-DDTHH:mm" in the ADMIN'S OWN local
        // time with no timezone info. Sending that raw string let the
        // server (which may run in a different timezone, e.g. UTC) re-parse
        // it as ITS local time — silently shifting the scheduled time by
        // whatever the UTC offset is. Converting to a real Date here (parsed
        // correctly as the browser's local time) and sending .toISOString()
        // fixes that: the stored instant now matches what the admin actually
        // picked, regardless of what timezone the server runs in.
        if (k === 'startAt' || k === 'endAt') {
          fd.append(k, v ? new Date(v).toISOString() : '');
        } else {
          fd.append(k, v);
        }
      });
      if (imageFile) fd.append('image', imageFile);

      if (editingId) {
        await api.put(`/express/admin/banners/${editingId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Banner updated');
      } else {
        await api.post('/express/admin/banners', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Banner created');
      }
      resetForm();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save banner');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id) => {
    try {
      await api.patch(`/express/admin/banners/${id}/toggle`);
      load();
    } catch { toast.error('Failed to toggle banner'); }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const remove = async (id) => {
    try {
      await api.delete(`/express/admin/banners/${id}`);
      toast.success('Banner deleted');
      setConfirmDeleteId(null);
      load();
    } catch { toast.error('Failed to delete banner'); }
  };

  const isLive = (b) => {
    if (!b.isActive) return false;
    const now = Date.now();
    if (b.startAt && new Date(b.startAt).getTime() > now) return false;
    if (b.endAt && new Date(b.endAt).getTime() < now) return false;
    return true;
  };

  return (
    <div className="grid gap-4 max-w-3xl">
      <form onSubmit={submit} className="bg-white border rounded-xl p-4 grid gap-3">
        <h3 className="font-bold text-gray-800">{editingId ? 'Edit Banner' : 'Create a New Banner'}</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-500">Title
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Flash Sale — 30% Off Fruits" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Type
            <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm w-full mt-1">
              {BANNER_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <label className="text-xs font-semibold text-gray-500">Subtitle (optional)
          <input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))}
            placeholder="e.g. Today only, 6 PM – 9 PM" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500">Starts at (optional)</label>
              {form.startAt && (
                <button type="button" onClick={() => setForm(f => ({ ...f, startAt: '' }))}
                  className="text-[10px] font-bold text-red-500 hover:underline">Clear</button>
              )}
            </div>
            <input type="datetime-local" value={form.startAt} onChange={e => setForm(f => ({ ...f, startAt: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-500">Ends at (optional)</label>
              {form.endAt && (
                <button type="button" onClick={() => setForm(f => ({ ...f, endAt: '' }))}
                  className="text-[10px] font-bold text-red-500 hover:underline">Clear</button>
              )}
            </div>
            <input type="datetime-local" value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </div>
        </div>
        <p className="text-[11px] text-gray-400 -mt-1">
          Leave both blank for an always-on banner (still controlled by the Active toggle). Set either to schedule a
          flash sale ahead of time — it will appear and disappear automatically.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-500">Background gradient — from
            <input type="color" value={form.gradientFrom} onChange={e => setForm(f => ({ ...f, gradientFrom: e.target.value }))}
              className="border rounded-lg w-full h-9 mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Background gradient — to
            <input type="color" value={form.gradientTo} onChange={e => setForm(f => ({ ...f, gradientTo: e.target.value }))}
              className="border rounded-lg w-full h-9 mt-1" />
          </label>
        </div>
        <label className="text-xs font-semibold text-gray-500">Photo (optional — overrides the gradient when set)
          <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1 bg-white" />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-500">Button text
            <input value={form.ctaText} onChange={e => setForm(f => ({ ...f, ctaText: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Links to
            <input value={form.linkTo} onChange={e => setForm(f => ({ ...f, linkTo: e.target.value }))}
              placeholder="/express/shop" className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
          Active
        </label>

        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Banner'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-600">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-bold text-gray-800 mb-3">All Banners</h3>
        {loading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : banners.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">No banners created yet.</p>
        ) : (
          <div className="grid gap-2">
            {banners.map(b => (
              <div key={b._id} className="border rounded-xl p-3 flex items-center gap-3">
                <div className="w-16 h-10 rounded-lg shrink-0 overflow-hidden"
                  style={!b.image ? { background: `linear-gradient(135deg, ${b.gradientFrom}, ${b.gradientTo})` } : undefined}>
                  {b.image && <img src={b.image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-bold text-gray-800 text-sm truncate">{b.title}</p>
                    <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {BANNER_TYPES.find(t => t.value === b.type)?.label || b.type}
                    </span>
                    {isLive(b) ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Live</span>
                    ) : b.isActive ? (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Scheduled</span>
                    ) : (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Off</span>
                    )}
                  </div>
                  {(b.startAt || b.endAt) && (
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {b.startAt ? new Date(b.startAt).toLocaleString() : 'No start'} → {b.endAt ? new Date(b.endAt).toLocaleString() : 'No end'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleActive(b._id)} title={b.isActive ? 'Turn off' : 'Turn on'}
                    className="p-2 rounded-lg hover:bg-gray-50">
                    {b.isActive ? <FiToggleRight size={16} className="text-green-600" /> : <FiToggleLeft size={16} className="text-gray-400" />}
                  </button>
                  <button onClick={() => startEdit(b)} className="p-2 rounded-lg hover:bg-gray-50 text-gray-500"><FiEdit2 size={14} /></button>
                  {confirmDeleteId === b._id ? (
                    <button onClick={() => remove(b._id)} className="px-2 py-1 rounded-lg bg-red-600 text-white text-[11px] font-bold">Confirm?</button>
                  ) : (
                    <button onClick={() => setConfirmDeleteId(b._id)} className="p-2 rounded-lg hover:bg-red-50 text-red-400"><FiTrash2 size={14} /></button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StoreInventoryTab({ stores }) {
  const [storeId, setStoreId] = useState('');
  const [products, setProducts] = useState([]);       // master Express catalogue
  const [storeProducts, setStoreProducts] = useState([]); // this store's stock/availability rows
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [invFilter, setInvFilter] = useState({ stock: '', avail: '' });
  const [addDrafts, setAddDrafts] = useState({});       // productId -> { qty, note }
  const [addingId, setAddingId] = useState(null);
  const [priceDrafts, setPriceDrafts] = useState({});    // productId -> typed selling price
  const [savingPriceId, setSavingPriceId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null); // click-to-confirm, no native dialog
  const [logs, setLogs] = useState([]);
  const [logsOpen, setLogsOpen] = useState(false);

  // Bluetooth thermal printer — same shared connection/pairing used by
  // Koyambedu Daily's Printer tab (see utils/thermalPrinter.js). Connect
  // once here before a shift/session; the Store Manager and POS terminal
  // reuse the same paired printer to print receipts and this same PLU
  // code-reference sheet without reconnecting.
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [printingList, setPrintingList] = useState(false);

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

  const printCodeList = async () => {
    if (!storeId) return toast.error('Select a store first');
    setPrintingList(true);
    try {
      const { data } = await api.get(`/express/admin/stores/${storeId}/products/print-list`);
      const storeName = stores.find(s => s._id === storeId)?.name;
      await printPluList(data.products || [], storeName);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to print code list');
    } finally {
      setPrintingList(false);
    }
  };

  // Combined "pick a Koyambedu product → assign to this store with stock +
  // price" flow — one screen instead of Products-tab-link then
  // Inventory-tab-stock. If the product isn't linked into Express yet, this
  // links it too (auto-assigning its PLU code) in the same submit.
  const [showAssign, setShowAssign] = useState(false);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignResults, setAssignResults] = useState([]);
  const [assignSearching, setAssignSearching] = useState(false);
  const [assignSelected, setAssignSelected] = useState(null); // chosen Koyambedu product
  const [assignForm, setAssignForm] = useState({ unit: 'kg', procurementBaseCost: '', customMarginPct: '', minOrderQty: '', maxOrderQty: '', stockQty: '', priceOverride: '', note: '' });
  const [assignSaving, setAssignSaving] = useState(false);

  const assignAlreadyLinked = assignSelected && products.some(p => String(p.koyambeduProduct?._id) === String(assignSelected._id));

  useEffect(() => {
    if (!showAssign) return;
    const t = setTimeout(() => {
      setAssignSearching(true);
      api.get(`/express/admin/koyambedu-catalog?search=${encodeURIComponent(assignSearch)}`)
        .then(r => setAssignResults(r.data.products || []))
        .catch(() => setAssignResults([]))
        .finally(() => setAssignSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [assignSearch, showAssign]);

  const pickAssignProduct = (kb) => {
    setAssignSelected(kb);
    setAssignForm(f => ({ ...f, unit: kb.unit || 'kg' }));
    setAssignResults([]);
    setAssignSearch(kb.name);
  };

  const resetAssignForm = () => {
    setShowAssign(false); setAssignSelected(null); setAssignSearch('');
    setAssignForm({ unit: 'kg', procurementBaseCost: '', customMarginPct: '', minOrderQty: '', maxOrderQty: '', stockQty: '', priceOverride: '', note: '' });
  };

  const submitAssign = async (e) => {
    e.preventDefault();
    if (!storeId) return toast.error('Select a store first');
    if (!assignSelected) return toast.error('Search and select a Koyambedu Daily product first');
    if (!assignAlreadyLinked && !assignForm.procurementBaseCost) {
      return toast.error('Procurement cost is required to link this product into Express for the first time');
    }
    setAssignSaving(true);
    try {
      const payload = {
        storeId,
        koyambeduProductId: assignSelected._id,
        unit: assignForm.unit,
        procurementBaseCost: assignForm.procurementBaseCost || undefined,
        customMarginPct: assignForm.customMarginPct || null,
        minOrderQty: assignForm.minOrderQty || undefined,
        maxOrderQty: assignForm.maxOrderQty || undefined,
        stockQty: assignForm.stockQty || 0,
        note: assignForm.note || undefined,
      };
      if (assignForm.priceOverride !== '') payload.priceOverride = assignForm.priceOverride;
      const { data } = await api.post('/express/admin/products/assign-to-store', payload);
      toast.success(`${data.product.koyambeduProduct?.name || 'Product'} assigned to store`);
      resetAssignForm();
      api.get('/express/admin/products').then(r => setProducts(r.data.products || [])).catch(() => {});
      loadStoreProducts();
      if (logsOpen) loadLogs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to assign product to store');
    } finally {
      setAssignSaving(false);
    }
  };

  useEffect(() => {
    if (!confirmRemoveId) return;
    const t = setTimeout(() => setConfirmRemoveId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmRemoveId]);

  useEffect(() => {
    api.get('/express/admin/products').then(r => setProducts(r.data.products || [])).catch(() => {});
  }, []);

  const loadStoreProducts = () => {
    if (!storeId) { setStoreProducts([]); return; }
    setLoading(true);
    api.get(`/express/admin/stores/${storeId}/products`)
      .then(r => setStoreProducts(r.data.storeProducts || []))
      .catch(() => toast.error('Failed to load store inventory'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { loadStoreProducts(); }, [storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadLogs = () => {
    if (!storeId) { setLogs([]); return; }
    api.get(`/express/admin/stock-logs?storeId=${storeId}`).then(r => setLogs(r.data.logs || [])).catch(() => {});
  };
  useEffect(() => { if (logsOpen) loadLogs(); }, [logsOpen, storeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge the master catalogue with this store's existing stock rows, so
  // every linked product shows up even if the store has never stocked it yet.
  const rows = products
    .filter(p => !search.trim() || (p.koyambeduProduct?.name || '').toLowerCase().includes(search.trim().toLowerCase()))
    .map(p => {
      const existing = storeProducts.find(sp => String(sp.product?._id) === String(p._id));
      return {
        product: p,
        storeProductId: existing?._id || null,
        stockQty: existing?.stockQty ?? 0,
        isAvailable: existing?.isAvailable ?? false,
        priceOverride: existing?.priceOverride ?? null,
        autoPrice: existing?.autoPrice ?? null,
        addQty: addDrafts[p._id]?.qty ?? '',
      };
    })
    .filter(r => !invFilter.stock
      || (invFilter.stock === 'out' && r.stockQty <= 0)
      || (invFilter.stock === 'low' && r.stockQty > 0 && r.stockQty <= 5)
      || (invFilter.stock === 'in' && r.stockQty > 0))
    .filter(r => !invFilter.avail
      || (invFilter.avail === 'available' && r.isAvailable)
      || (invFilter.avail === 'hidden' && !r.isAvailable));

  // Manually set (or clear, with an empty value) the selling price for one
  // product at this store — rounds off whatever the margin engine computed.
  const savePrice = async (productId) => {
    const draft = priceDrafts[productId];
    if (draft === undefined) return; // nothing typed, nothing to save
    if (draft !== '' && (!Number.isFinite(Number(draft)) || Number(draft) < 0)) {
      return toast.error('Enter a valid selling price');
    }
    setSavingPriceId(productId);
    try {
      const { data } = await api.post(`/express/admin/stores/${storeId}/products`, {
        productId, priceOverride: draft === '' ? '' : Number(draft),
      });
      setStoreProducts(sp => {
        const others = sp.filter(x => String(x.product?._id) !== String(productId));
        const row = rows.find(r => r.product._id === productId);
        return [...others, { ...data.storeProduct, product: row?.product, autoPrice: row?.autoPrice }];
      });
      setPriceDrafts(d => { const n = { ...d }; delete n[productId]; return n; });
      toast.success(draft === '' ? 'Reverted to automatic pricing' : 'Selling price updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update selling price');
    } finally { setSavingPriceId(null); }
  };

  const setAddQty = (productId, qty) => setAddDrafts(d => ({ ...d, [productId]: { ...d[productId], qty } }));

  const addStock = async (productId) => {
    const row = rows.find(r => r.product._id === productId);
    const qty = Number(row?.addQty);
    if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a quantity greater than 0 to add');
    setAddingId(productId);
    try {
      const { data } = await api.post(`/express/admin/stores/${storeId}/products/${productId}/add-stock`, { qty });
      setStoreProducts(sp => {
        const others = sp.filter(x => String(x.product?._id) !== String(productId));
        return [...others, { ...data.storeProduct, product: row.product }];
      });
      setAddDrafts(d => ({ ...d, [productId]: { qty: '' } }));
      toast.success(`Added ${qty} ${row.product.unit} — new total ${data.storeProduct.stockQty}`);
      if (logsOpen) loadLogs();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add stock');
    } finally {
      setAddingId(null);
    }
  };

  const toggleAvailability = async (productId, current) => {
    setTogglingId(productId);
    try {
      const { data } = await api.post(`/express/admin/stores/${storeId}/products`, { productId, isAvailable: !current });
      setStoreProducts(sp => {
        const others = sp.filter(x => String(x.product?._id) !== String(productId));
        return [...others, data.storeProduct];
      });
    } catch {
      toast.error('Failed to update availability');
    } finally {
      setTogglingId(null);
    }
  };

  const remove = async (productId) => {
    const row = rows.find(r => r.product._id === productId);
    if (!row?.storeProductId) return;
    if (confirmRemoveId !== productId) { setConfirmRemoveId(productId); return; }
    setConfirmRemoveId(null);
    setRemovingId(productId);
    try {
      await api.delete(`/express/admin/stores/${storeId}/products/${productId}`);
      setStoreProducts(sp => sp.filter(x => String(x.product?._id) !== String(productId)));
      toast.success('Removed from store inventory');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove product');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div>
      <h2 className="font-bold text-gray-700 mb-1">Store Inventory Allocation</h2>
      <p className="text-xs text-gray-400 mb-3">
        "Add Stock" adds to whatever the store already has — each delivery accumulates onto the existing quantity.
        "Available/Hidden" toggles visibility to customers &amp; POS without touching stock. "Remove" deletes the
        store-product record entirely. "Save Price" lets you manually round off the selling price for this store —
        leave it blank and save to go back to the auto-computed price shown next to the stock count.
      </p>

      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <select value={storeId} onChange={e => setStoreId(e.target.value)} className="border rounded-lg px-3 py-2 text-sm sm:w-64">
          <option value="">Select a store…</option>
          {stores.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
        </select>
        {storeId && (
          <input placeholder="Search products…" value={search} onChange={e => setSearch(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm flex-1" />
        )}
        {storeId && (
          <select value={invFilter.stock} onChange={e => setInvFilter(f => ({ ...f, stock: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">All stock</option>
            <option value="in">In stock</option>
            <option value="low">Low (≤5)</option>
            <option value="out">Out of stock</option>
          </select>
        )}
        {storeId && (
          <select value={invFilter.avail} onChange={e => setInvFilter(f => ({ ...f, avail: e.target.value }))} className="border rounded-lg px-2 py-2 text-sm">
            <option value="">Available + Hidden</option>
            <option value="available">Available only</option>
            <option value="hidden">Hidden only</option>
          </select>
        )}
        {storeId && (
          <button onClick={() => setLogsOpen(o => !o)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold hover:bg-gray-50 shrink-0">
            <FiFileText size={14} /> {logsOpen ? 'Hide' : 'View'} Stock Report
          </button>
        )}
        {storeId && (
          <button onClick={() => setShowAssign(s => !s)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 shrink-0">
            <FiPlus size={14} /> Assign Koyambedu Product
          </button>
        )}
        <button onClick={togglePrinterConnection} disabled={connectingPrinter}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold shrink-0 disabled:opacity-50 ${printerConnected ? 'bg-green-50 text-green-700 border-green-200' : 'hover:bg-gray-50'}`}>
          <FiBluetooth size={14} /> {connectingPrinter ? 'Connecting…' : printerConnected ? 'Printer Connected' : 'Connect Printer'}
        </button>
        {storeId && (
          <button onClick={printCodeList} disabled={printingList} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-semibold hover:bg-gray-50 shrink-0 disabled:opacity-50">
            <FiPrinter size={14} /> {printingList ? 'Printing…' : 'Print Code List'}
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-3 -mt-2">
        Connect a Bluetooth thermal printer once before starting your shift, then print a code-reference sheet (PLU codes, names, prices) for the counter — the POS terminal can print its own copy too.
      </p>

      {storeId && showAssign && (
        <form onSubmit={submitAssign} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <p className="sm:col-span-2 text-xs text-gray-400 -mt-1">
            Pick a Koyambedu Daily product, set its stock and (optionally) a price just for this store — in one step.
            If it isn&#39;t linked into Express yet, it will be linked automatically with a PLU code.
          </p>
          <div className="sm:col-span-2 relative">
            <input placeholder="Search Koyambedu Daily products…" value={assignSearch}
              onChange={e => { setAssignSearch(e.target.value); setAssignSelected(null); }}
              className="border rounded-lg px-3 py-2 text-sm w-full" />
            {assignSearching && <p className="text-xs text-gray-400 mt-1">Searching…</p>}
            {assignResults.length > 0 && !assignSelected && (
              <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto">
                {assignResults.map(kb => (
                  <button type="button" key={kb._id} onClick={() => pickAssignProduct(kb)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm">
                    {kb.images?.[0]?.url && <img src={kb.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
                    <span>{kb.name} <span className="text-xs text-gray-400">({kb.unit})</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {assignSelected && (
            <div className="sm:col-span-2 flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2">
              {assignSelected.images?.[0]?.url && <img src={assignSelected.images[0].url} alt="" className="w-8 h-8 rounded object-cover" />}
              <span className="text-sm font-semibold text-indigo-900">{assignSelected.name}</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-200 text-indigo-800">
                {assignAlreadyLinked ? 'Already in Express' : 'Will be linked now'}
              </span>
            </div>
          )}
          {!assignAlreadyLinked && (
            <>
              <select value={assignForm.unit} onChange={e => setAssignForm(f => ({ ...f, unit: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
                {['kg', 'gram', 'piece', 'bunch', 'litre', 'dozen'].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <input placeholder="Procurement cost (₹/kg or ₹/unit)" value={assignForm.procurementBaseCost}
                onChange={e => setAssignForm(f => ({ ...f, procurementBaseCost: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input placeholder="Custom margin % (optional)" value={assignForm.customMarginPct}
                onChange={e => setAssignForm(f => ({ ...f, customMarginPct: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            </>
          )}
          {assignForm.unit === 'kg' && (
            <>
              <input type="number" step="0.01" min="0.01" placeholder="Min order qty, kg (e.g. 0.25 for 250 g)" value={assignForm.minOrderQty}
                onChange={e => setAssignForm(f => ({ ...f, minOrderQty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
              <input type="number" step="0.01" min="0.01" placeholder="Max order qty per order, kg (optional)" value={assignForm.maxOrderQty}
                onChange={e => setAssignForm(f => ({ ...f, maxOrderQty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
            </>
          )}
          <input type="number" min="0" placeholder="Stock to add at this store" value={assignForm.stockQty}
            onChange={e => setAssignForm(f => ({ ...f, stockQty: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input type="number" min="0" placeholder="Price override for this store (optional)" value={assignForm.priceOverride}
            onChange={e => setAssignForm(f => ({ ...f, priceOverride: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
          <input placeholder="Note (optional, e.g. delivery ref)" value={assignForm.note}
            onChange={e => setAssignForm(f => ({ ...f, note: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" disabled={assignSaving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
              {assignSaving ? 'Assigning…' : 'Assign to Store'}
            </button>
            <button type="button" onClick={resetAssignForm} className="px-4 py-2 rounded-lg border text-sm font-semibold">Cancel</button>
          </div>
        </form>
      )}

      {!storeId && <p className="text-sm text-gray-400">Choose a store above to view and set its stock levels.</p>}
      {storeId && loading && <p className="text-sm text-gray-400">Loading inventory…</p>}

      {storeId && logsOpen && (
        <div className="bg-white border rounded-xl divide-y mb-4 max-h-64 overflow-y-auto">
          {logs.map(l => (
            <div key={l._id} className="flex items-center justify-between px-3 py-2 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-gray-700 truncate">
                  {l.product?.koyambeduProduct?.name || l.product?.name || 'Product'} —{' '}
                  <span className={l.type === 'addition' ? 'text-green-600' : 'text-red-600'}>
                    {l.type === 'addition' ? '+' : '−'}{l.qty}
                  </span> ({l.previousQty} → {l.newQty})
                </p>
                <p className="text-gray-400">{l.actorType === 'admin' ? 'Admin' : 'Store Manager'}: {l.actorName}{l.reason ? ` — ${l.reason}` : ''}</p>
              </div>
              <span className="text-gray-400 shrink-0 ml-2">{new Date(l.createdAt).toLocaleString('en-IN')}</span>
            </div>
          ))}
          {logs.length === 0 && <p className="text-sm text-gray-400 px-3 py-3">No stock movements recorded yet for this store.</p>}
        </div>
      )}

      {storeId && !loading && (
        <div className="grid gap-2">
          {rows.map(row => (
            <div key={row.product._id} className="bg-white border rounded-xl p-3 flex flex-wrap items-center gap-3">
              {(row.product.koyambeduProduct?.images?.[0]?.url || row.product.image) && (
                <img src={row.product.koyambeduProduct?.images?.[0]?.url || row.product.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-gray-800 text-sm truncate flex items-center gap-1.5">
                  {row.product.koyambeduProduct?.name || row.product.name || '(unnamed product)'}
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${row.product.plu != null ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                    PLU {row.product.plu != null ? row.product.plu : '—'}
                  </span>
                </p>
                <p className="text-xs text-gray-400">
                  Current stock: <span className="font-bold text-gray-600">{row.stockQty}</span> {row.product.unit}
                  {row.autoPrice != null && <span className="ml-2">Auto price: ₹{row.autoPrice}</span>}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-400 shrink-0">₹</span>
                <input type="number" min="0" step="0.01"
                  placeholder={row.priceOverride != null ? String(row.priceOverride) : 'Selling price'}
                  value={priceDrafts[row.product._id] ?? (row.priceOverride != null ? String(row.priceOverride) : '')}
                  onChange={e => setPriceDrafts(d => ({ ...d, [row.product._id]: e.target.value }))}
                  className="w-24 border rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={() => savePrice(row.product._id)} disabled={savingPriceId === row.product._id}
                  className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold disabled:opacity-40">
                  {savingPriceId === row.product._id ? 'Saving…' : 'Save Price'}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <input type="number" min="0" placeholder="+ qty" value={row.addQty}
                  onChange={e => setAddQty(row.product._id, e.target.value)}
                  className="w-20 border rounded-lg px-2 py-1.5 text-sm" />
                <button onClick={() => addStock(row.product._id)} disabled={addingId === row.product._id}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-40">
                  <FiPlus size={12} /> {addingId === row.product._id ? 'Adding…' : 'Add Stock'}
                </button>
              </div>

              <button onClick={() => toggleAvailability(row.product._id, row.isAvailable)} disabled={togglingId === row.product._id}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 ${row.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {row.isAvailable ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />}
                {row.isAvailable ? 'Available' : 'Hidden'}
              </button>

              {row.storeProductId && (
                <button onClick={() => remove(row.product._id)} disabled={removingId === row.product._id}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 ${confirmRemoveId === row.product._id ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600'}`}>
                  <FiTrash2 size={12} /> {removingId === row.product._id ? 'Removing…' : confirmRemoveId === row.product._id ? 'Confirm?' : 'Remove'}
                </button>
              )}
            </div>
          ))}
          {rows.length === 0 && <p className="text-sm text-gray-400">No products match — link products in the Products tab first.</p>}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════
// EXPENSES TAB — admin-entered misc costs (rent, salary, utilities, etc.)
// ══════════════════════════════════════════════
function ExpensesTab({ stores }) {
  const [expenses, setExpenses] = useState([]);
  const [form, setForm] = useState({ storeId: '', category: 'other', amount: '', note: '', date: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const load = () => api.get('/express/admin/expenses').then(r => setExpenses(r.data.expenses || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.amount) return toast.error('Amount is required');
    setSaving(true);
    try {
      await api.post('/express/admin/expenses', form);
      toast.success('Expense recorded');
      setForm({ storeId: '', category: 'other', amount: '', note: '', date: new Date().toISOString().slice(0, 10) });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record expense');
    } finally {
      setSaving(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState(null); // click-to-confirm, no native dialog
  useEffect(() => {
    if (!confirmDeleteId) return;
    const t = setTimeout(() => setConfirmDeleteId(null), 4000);
    return () => clearTimeout(t);
  }, [confirmDeleteId]);

  const remove = async (id) => {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return; }
    setConfirmDeleteId(null);
    try {
      await api.delete(`/express/admin/expenses/${id}`);
      load();
    } catch { toast.error('Failed to delete expense'); }
  };

  const total = expenses.reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div>
      <h2 className="font-bold text-gray-700 mb-3">Other Expenses</h2>

      <form onSubmit={submit} className="bg-white border rounded-xl p-4 mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select value={form.storeId} onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Company-wide (no specific store)</option>
          {stores.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
        </select>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm">
          {['rent', 'salary', 'utilities', 'maintenance', 'packaging', 'fuel', 'marketing', 'other'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input type="number" min="0" placeholder="Amount (₹)" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm" />
        <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="border rounded-lg px-3 py-2 text-sm sm:col-span-2" />
        <button type="submit" disabled={saving} className="sm:col-span-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Record Expense'}
        </button>
      </form>

      <p className="text-xs text-gray-400 mb-2">Total recorded: <span className="font-bold text-gray-700">₹{total}</span></p>

      <div className="grid gap-2">
        {expenses.map(e => (
          <div key={e._id} className="bg-white border rounded-xl p-3 flex items-center justify-between">
            <div className="min-w-0">
              <p className="font-bold text-gray-800 text-sm">₹{e.amount} <span className="text-xs font-normal text-gray-400">· {e.category}{e.store ? ` · ${e.store.name}` : ' · company-wide'}</span></p>
              <p className="text-xs text-gray-400 truncate">{e.note || '—'} · {new Date(e.date).toLocaleDateString('en-IN')} · by {e.enteredByName}</p>
            </div>
            <button onClick={() => remove(e._id)}
              className={`shrink-0 rounded-lg ${confirmDeleteId === e._id ? 'px-2.5 py-1.5 bg-red-600 text-white text-xs font-semibold flex items-center gap-1' : 'p-1.5 hover:bg-red-50 text-red-500'}`}>
              <FiTrash2 size={14} /> {confirmDeleteId === e._id ? 'Confirm?' : ''}
            </button>
          </div>
        ))}
        {expenses.length === 0 && <p className="text-sm text-gray-400">No expenses recorded yet.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// CARTS TAB — customers currently holding items in their Express cart
// ══════════════════════════════════════════════
function CartsTab() {
  const [carts, setCarts] = useState([]);
  const [search, setSearch] = useState('');

  const load = (q) => api.get(`/express/admin/carts${q ? `?search=${encodeURIComponent(q)}` : ''}`).then(r => setCarts(r.data.carts || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  useEffect(() => {
    const t = setTimeout(() => load(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <h2 className="font-bold text-gray-700">Customer Carts</h2>
        <input placeholder="Search name, phone or email…" value={search} onChange={e => setSearch(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm w-56" />
      </div>
      <div className="grid gap-3">
        {carts.map(c => (
          <div key={c._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-gray-800">{c.customerName}</p>
                <p className="text-xs text-gray-500">{c.phone} · {c.email} · {c.store}</p>
              </div>
              <div className="text-right">
                <p className="font-black text-indigo-700">₹{c.cartValue}</p>
                <p className="text-xs text-gray-400">{c.itemCount} item(s)</p>
              </div>
            </div>
            <ul className="text-xs text-gray-600 list-disc pl-4">
              {c.items.map((it, i) => <li key={i}>{it.name} — {it.quantity} {it.unit} @ ₹{it.price}</li>)}
            </ul>
          </div>
        ))}
        {carts.length === 0 && <p className="text-sm text-gray-400">No customers currently have items in their Express cart.</p>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// MARGIN CONFIG TAB
// ══════════════════════════════════════════════
function MarginConfigTab({ stores }) {
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [logisticsForm, setLogisticsForm] = useState({ totalProcurementKg: '' });
  const [storeCosts, setStoreCosts] = useState({}); // storeId -> cost

  const load = () => api.get('/express/admin/margin-config').then(r => setConfig(r.data.config)).catch(() => {});
  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/express/admin/margin-config', {
        platformChargePct: config.platformChargePct,
        salesmanChargePct: config.salesmanChargePct,
        packingChargePct: config.packingChargePct,
        largeOrderThresholdKg: config.largeOrderThresholdKg,
        largeOrderAction: config.largeOrderAction,
        maxDeliveryDistanceKm: config.maxDeliveryDistanceKm,
        customOrderPhone: config.customOrderPhone,
        deliveryTimeTiers: config.deliveryTimeTiers,
        platformFeeAmount: config.platformFeeAmount,
      });
      toast.success('Margin config saved');
      load();
    } catch { toast.error('Failed to save margin config'); } finally { setSaving(false); }
  };

  const recompute = async () => {
    const costs = stores.map(s => ({ store: s._id, cost: Number(storeCosts[s._id]) || 0 }));
    if (!logisticsForm.totalProcurementKg) return toast.error('Enter total procurement weight (kg)');
    try {
      await api.post('/express/admin/margin-config/logistics', {
        storeCosts: costs,
        totalProcurementKg: Number(logisticsForm.totalProcurementKg),
      });
      toast.success('Logistics cost recalculated');
      load();
    } catch { toast.error('Failed to recompute logistics cost'); }
  };

  // Admin-configurable delivery TIME tiers by distance — fully dynamic, not
  // hardcoded (e.g. <=4km->30min, <=10km->45min, beyond->60min). Stored on
  // config.deliveryTimeTiers (ExpressMarginConfig), evaluated server-side
  // by expressPricingService.computeDeliveryEta for every quote/store list.
  const updateTier = (i, patch) => setConfig(c => ({
    ...c, deliveryTimeTiers: c.deliveryTimeTiers.map((t, idx) => idx === i ? { ...t, ...patch } : t),
  }));
  const addTier = () => setConfig(c => ({
    ...c, deliveryTimeTiers: [...(c.deliveryTimeTiers || []), { maxDistanceKm: '', etaMinutes: '' }],
  }));
  const removeTier = (i) => setConfig(c => ({
    ...c, deliveryTimeTiers: c.deliveryTimeTiers.filter((_, idx) => idx !== i),
  }));

  const toggleEnabled = async () => {
    try {
      const { data } = await api.patch('/express/admin/margin-config/toggle-enabled', {});
      setConfig(data.config);
      toast.success(data.config.isEnabled ? 'Eptomart Express is now LIVE for customers' : 'Eptomart Express turned OFF');
    } catch { toast.error('Failed to toggle Eptomart Express'); }
  };

  if (!config) return <p className="text-sm text-gray-400">Loading…</p>;

  return (
    <div className="grid gap-4">
      <div className={`border rounded-xl p-4 flex items-center justify-between ${config.isEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
        <div>
          <p className="font-bold text-gray-800">Eptomart Express — Master Switch</p>
          <p className="text-xs text-gray-500">
            {config.isEnabled ? 'Live — customers can access Express and place orders.' : 'Off — Express is hidden from customers.'}
          </p>
        </div>
        <button onClick={toggleEnabled}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold ${config.isEnabled ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
          {config.isEnabled ? <FiToggleRight size={16} /> : <FiToggleLeft size={16} />} {config.isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold text-gray-700 mb-1">Platform Fee</h2>
        <p className="text-xs text-gray-400 mb-3">
          A flat fee charged to the customer at checkout, alongside the delivery fee — one amount for every Express
          store. Set to 0 to disable it entirely.
        </p>
        <label className="text-xs font-semibold text-gray-500">Platform Fee (₹)
          <input type="number" min={0} value={config.platformFeeAmount ?? 75}
            onChange={e => setConfig(c => ({ ...c, platformFeeAmount: e.target.value }))}
            className="border rounded-lg px-3 py-2 text-sm w-full mt-1 sm:w-48" />
        </label>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold text-gray-700 mb-3">Default Margin Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-xs font-semibold text-gray-500">Platform Charge %
            <input type="number" value={config.platformChargePct} onChange={e => setConfig(c => ({ ...c, platformChargePct: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Salesman Charge %
            <input type="number" value={config.salesmanChargePct} onChange={e => setConfig(c => ({ ...c, salesmanChargePct: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Packing/Logistics Charge %
            <input type="number" value={config.packingChargePct} onChange={e => setConfig(c => ({ ...c, packingChargePct: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Large Order Threshold (kg)
            <input type="number" value={config.largeOrderThresholdKg} onChange={e => setConfig(c => ({ ...c, largeOrderThresholdKg: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
          <label className="text-xs font-semibold text-gray-500">Large Order Action
            <select value={config.largeOrderAction} onChange={e => setConfig(c => ({ ...c, largeOrderAction: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1">
              <option value="warn">Warn only</option>
              <option value="block">Block — redirect to Koyambedu Daily</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-gray-500">Max Delivery Distance (km)
            <input type="number" value={config.maxDeliveryDistanceKm} onChange={e => setConfig(c => ({ ...c, maxDeliveryDistanceKm: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
        </div>
        <button onClick={save} disabled={saving} className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Margin Config'}
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold text-gray-700 mb-1">Delivery Range</h2>
        <p className="text-xs text-gray-500 mb-3">
          Beyond Max Delivery Distance, customers are offered the &ldquo;call for custom order&rdquo; option
          instead of checkout. The minimum-order delivery fee itself is now set per store — see each
          store&rsquo;s &ldquo;Delivery Fee&rdquo; panel on the Stores tab, since it applies the same way
          regardless of how far the customer is.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="text-xs font-semibold text-gray-500 sm:col-span-2">Custom Order Phone (shown to customers beyond Max Delivery Distance)
            <input type="text" placeholder="e.g. +91 98765 43210" value={config.customOrderPhone || ''} onChange={e => setConfig(c => ({ ...c, customOrderPhone: e.target.value }))}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
        </div>
        <button onClick={save} disabled={saving} className="mt-3 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Delivery Rules'}
        </button>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold text-gray-700 mb-1">Delivery Time Estimates</h2>
        <p className="text-xs text-gray-500 mb-3">
          Quote the customer an estimated delivery time based on how far they are from the store. Tiers are
          evaluated in order — e.g. within 4 km → 30 min, within 10 km → 45 min, beyond that (up to Max Delivery
          Distance above) → 60 min. Add as many tiers as you like; a customer beyond the farthest tier still gets
          that tier's estimate rather than none at all.
        </p>
        <div className="grid gap-2 mb-3">
          {(config.deliveryTimeTiers || []).map((tier, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 shrink-0">Within</span>
              <input type="number" value={tier.maxDistanceKm} onChange={e => updateTier(i, { maxDistanceKm: e.target.value })}
                placeholder="km" className="w-20 border rounded-lg px-2 py-1.5 text-sm" />
              <span className="text-xs text-gray-500 shrink-0">km →</span>
              <input type="number" value={tier.etaMinutes} onChange={e => updateTier(i, { etaMinutes: e.target.value })}
                placeholder="min" className="w-20 border rounded-lg px-2 py-1.5 text-sm" />
              <span className="text-xs text-gray-500 shrink-0">min</span>
              <button type="button" onClick={() => removeTier(i)} className="ml-auto text-red-400 hover:text-red-600">
                <FiX size={14} />
              </button>
            </div>
          ))}
          {(!config.deliveryTimeTiers || config.deliveryTimeTiers.length === 0) && (
            <p className="text-xs text-gray-400">No tiers configured — customers won't see a delivery time estimate.</p>
          )}
        </div>
        <button type="button" onClick={addTier} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 mb-3">
          <FiPlus size={12} /> Add tier
        </button>
        <div>
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Delivery Time Tiers'}
          </button>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h2 className="font-bold text-gray-700 mb-1">Logistics Cost per kg</h2>
        <p className="text-xs text-gray-500 mb-3">Current: ₹{config.logisticsCostPerKg}/kg. Enter the latest shipment cost per store and total procurement weight to recalculate.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {stores.map(s => (
            <label key={s._id} className="text-xs font-semibold text-gray-500">{s.name} shipment cost (₹)
              <input type="number" value={storeCosts[s._id] || ''} onChange={e => setStoreCosts(c => ({ ...c, [s._id]: e.target.value }))}
                className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
            </label>
          ))}
          <label className="text-xs font-semibold text-gray-500">Total procurement weight (kg)
            <input type="number" value={logisticsForm.totalProcurementKg} onChange={e => setLogisticsForm({ totalProcurementKg: e.target.value })}
              className="border rounded-lg px-3 py-2 text-sm w-full mt-1" />
          </label>
        </div>
        <button onClick={recompute} className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-semibold">
          Recalculate Logistics Cost
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════
// INVENTORY REQUESTS TAB
// ══════════════════════════════════════════════
function InventoryRequestsTab() {
  const [requests, setRequests] = useState([]);

  const load = () => api.get('/express/admin/inventory-requests').then(r => setRequests(r.data.requests || [])).catch(() => {});
  useEffect(() => { load(); }, []);

  const approve = async (id) => {
    try {
      await api.patch(`/express/admin/inventory-requests/${id}/approve`, {});
      toast.success('Request approved and stock allocated');
      load();
    } catch { toast.error('Failed to approve request'); }
  };

  const reject = async (id) => {
    try {
      await api.patch(`/express/admin/inventory-requests/${id}/reject`, {});
      toast('Request rejected');
      load();
    } catch { toast.error('Failed to reject request'); }
  };

  return (
    <div>
      <h2 className="font-bold text-gray-700 mb-3">Inventory Requests</h2>
      <div className="grid gap-3">
        {requests.map(r => (
          <div key={r._id} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-gray-800">{r.store?.name || 'Unknown store'}</p>
                <p className="text-xs text-gray-500">Requested by {r.requestedByName} · {new Date(r.createdAt).toLocaleString('en-IN')}</p>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                r.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                r.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {r.status}
              </span>
            </div>
            <ul className="text-xs text-gray-600 mb-2 list-disc pl-4">
              {r.items?.map((it, i) => (
                <li key={i}>{it.product?.koyambeduProduct?.name || 'Product'} — requested {it.requestedQty} {it.product?.unit || ''}{it.allocatedQty != null ? ` (allocated ${it.allocatedQty})` : ''}</li>
              ))}
            </ul>
            {r.status === 'pending' && (
              <div className="flex gap-2">
                <button onClick={() => approve(r._id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-semibold">
                  <FiCheck size={12} /> Approve
                </button>
                <button onClick={() => reject(r._id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold">
                  <FiX size={12} /> Reject
                </button>
              </div>
            )}
          </div>
        ))}
        {requests.length === 0 && <p className="text-sm text-gray-400">No inventory requests yet — these are raised by Store Managers once the POS/store-manager phase is built.</p>}
      </div>
    </div>
  );
}
