// ============================================
// EPTOMART EXPRESS — Store OWNER Dashboard (/express/owner)
// The owner's own home: today's numbers, what needs attention, and every
// tool for running the store (orders, catalogue, stock, accounts, delivery,
// team, POS users, GST). Managers and accountants keep the narrower
// /express/manager screen. Everything is scoped to the owner's store by the
// backend.
// ============================================
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FiZap, FiLogOut, FiHome, FiPackage, FiGrid, FiClipboard, FiPlus, FiFileText,
  FiTruck, FiBell, FiUsers, FiToggleLeft, FiToggleRight, FiAlertTriangle, FiChevronRight,
} from 'react-icons/fi';
import expressManagerApi, { getManagerToken, clearManagerToken, isMainLogin, getActAsStore, clearActAsStore } from '../../../utils/expressManagerApi';
import { OwnerOverview, OwnerCatalogTab, OwnerPOSTab, OwnerAccountsTab, OwnerTeamTab, OwnerDeliveryTab, OwnerGstTab } from './ExpressOwnerTabs';
import { OrdersTab, ProductsTab, InventoryTab } from './ExpressManagerDashboard';

const TABS = [
  { key: 'home',      label: 'Home',          Icon: FiHome },
  { key: 'orders',    label: 'Orders',        Icon: FiPackage },
  { key: 'catalog',   label: 'My Catalogue',  Icon: FiPlus },
  { key: 'stock',     label: 'Stock',         Icon: FiGrid },
  { key: 'accounts',  label: 'Accounts',      Icon: FiFileText },
  { key: 'delivery',  label: 'Delivery',      Icon: FiTruck },
  { key: 'team',      label: 'Team & Alerts', Icon: FiBell },
  { key: 'staff',     label: 'POS Users',     Icon: FiUsers },
  { key: 'gst',       label: 'GST & Invoice', Icon: FiClipboard },
];

export default function ExpressOwnerDashboard() {
  const navigate = useNavigate();
  const actAs = getActAsStore();
  const [tab, setTab] = useState('home');
  const [manager, setManager] = useState(null);
  const [store, setStore] = useState(null);
  const [stats, setStats] = useState(null);
  const [ov, setOv] = useState(null);
  const [gstDone, setGstDone] = useState(true);

  const loadHome = () => {
    expressManagerApi.get('/dashboard').then(({ data }) => setStats(data.stats)).catch(() => {});
    expressManagerApi.get('/owner/overview').then(({ data }) => setOv(data.overview)).catch(() => {});
  };

  useEffect(() => {
    if (!getManagerToken()) { navigate('/login'); return; }
    expressManagerApi.get('/me').then(({ data }) => {
      setManager(data.manager);
      // Only owners belong here — manager / accountant use the narrower screen
      if ((data.manager?.role || 'owner') !== 'owner') navigate('/express/manager', { replace: true });
    }).catch(() => {});
    expressManagerApi.get('/store').then(({ data }) => setStore(data.store)).catch(() => {});
    expressManagerApi.get('/owner/gst').then(({ data }) => setGstDone(!!data.complete)).catch(() => {});
    loadHome();
  }, []);

  const toggleStore = async () => {
    try {
      const { data } = await expressManagerApi.patch('/store/toggle');
      setStore(data.store);
      toast.success(data.store.isActive ? 'Store turned ON' : 'Store turned OFF');
    } catch { toast.error('Failed to update store status'); }
  };

  const leave = () => {
    if (actAs) { clearActAsStore(); navigate('/admin/express'); return; }
    if (isMainLogin()) { navigate('/profile'); return; }
    clearManagerToken(); navigate('/express/manager/login');
  };

  const go = (k) => { setTab(k); window.scrollTo({ top: 0 }); };
  const attention = [
    stats?.pendingOrders > 0 && { label: `${stats.pendingOrders} order${stats.pendingOrders > 1 ? 's' : ''} waiting`, sub: 'Confirm, prepare and deliver', tab: 'orders', tone: 'indigo' },
    ov?.pendingApproval > 0 && { label: `${ov.pendingApproval} item${ov.pendingApproval > 1 ? 's' : ''} awaiting Eptomart approval`, sub: 'Not visible online until approved (counter sales work)', tab: 'catalog', tone: 'amber' },
    ov?.rejectedApproval > 0 && { label: `${ov.rejectedApproval} item${ov.rejectedApproval > 1 ? 's' : ''} rejected`, sub: 'Open My Catalogue to see the reason', tab: 'catalog', tone: 'red' },
    ov?.outOfStock > 0 && { label: `${ov.outOfStock} item${ov.outOfStock > 1 ? 's' : ''} out of stock`, sub: 'Add stock so customers can order', tab: 'stock', tone: 'red' },
    stats?.lowStockCount > 0 && { label: `${stats.lowStockCount} low on stock`, sub: 'Running short', tab: 'stock', tone: 'amber' },
    !gstDone && { label: 'Set up your GST & invoice details', sub: 'Needed so customers get a proper invoice in your store\'s name', tab: 'gst', tone: 'amber' },
  ].filter(Boolean);
  const tone = { indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900', amber: 'bg-amber-50 border-amber-200 text-amber-900', red: 'bg-red-50 border-red-200 text-red-800' };

  return (
    <div className="min-h-screen bg-gray-50">
      {actAs && (
        <div className="bg-amber-100 border-b border-amber-300 px-4 py-2 text-xs text-amber-900 flex items-center justify-between gap-2">
          <span>👁 Admin view — you are seeing and managing <b>{actAs.name}</b> exactly as its owner does.</span>
          <button onClick={() => { clearActAsStore(); navigate('/admin/express'); }} className="px-3 py-1 rounded-lg bg-amber-600 text-white font-bold shrink-0">Exit</button>
        </div>
      )}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0"><FiZap className="text-amber-300" size={18} /></span>
          <div className="min-w-0">
            <p className="font-black text-gray-800 text-sm truncate">{store?.name || 'Your store'}</p>
            <p className="text-[11px] text-gray-400 truncate">Owner · {manager?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {store && (
            <button onClick={toggleStore}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${store.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {store.isActive ? <FiToggleRight size={14} /> : <FiToggleLeft size={14} />} {store.isActive ? 'Store ON' : 'Store OFF'}
            </button>
          )}
          <button onClick={leave} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" title="Leave"><FiLogOut size={16} /></button>
        </div>
      </header>

      <div className="p-4 max-w-3xl mx-auto">
        <div className="flex gap-1 overflow-x-auto rounded-xl p-1 mb-4 bg-indigo-50 no-scrollbar">
          {TABS.map(t => (
            <button key={t.key} onClick={() => go(t.key)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap shrink-0"
              style={tab === t.key ? { background: '#fff', color: '#3730a3' } : { color: '#6b7280' }}>
              <t.Icon size={14} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'home' && (
          <div>
            <OwnerOverview />
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {[['Pending orders', stats.pendingOrders, 'orders'], ["Today's orders", stats.todayOrders, 'orders'], ['Delivered today', stats.deliveredToday, 'orders'], ['Low stock', stats.lowStockCount, 'stock']].map(([l, v, k]) => (
                  <button key={l} onClick={() => go(k)} className="bg-white border rounded-xl p-3 text-left hover:border-indigo-300">
                    <p className="text-xs text-gray-400">{l}</p>
                    <p className="text-xl font-black text-indigo-900">{v}</p>
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs font-black uppercase tracking-wide text-gray-400 mb-2">Needs your attention</p>
            {attention.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800 mb-4">All clear — nothing needs attention right now.</div>
            ) : (
              <div className="grid gap-2 mb-4">
                {attention.map((a, i) => (
                  <button key={i} onClick={() => go(a.tab)} className={`flex items-center gap-3 border rounded-xl p-3 text-left ${tone[a.tone]}`}>
                    <FiAlertTriangle size={16} className="shrink-0" />
                    <span className="flex-1"><span className="block text-sm font-bold">{a.label}</span><span className="block text-[11px] opacity-80">{a.sub}</span></span>
                    <FiChevronRight size={16} />
                  </button>
                ))}
              </div>
            )}

            <p className="text-xs font-black uppercase tracking-wide text-gray-400 mb-2">Quick actions</p>
            <div className="grid grid-cols-2 gap-2">
              {[['catalog', 'Add products', 'From Koyambedu Daily or your own', FiPlus], ['stock', 'Add stock', 'Update what is on your shelf', FiGrid],
                ['accounts', 'Accounts & profit', 'Sales, expenses, profit', FiFileText], ['delivery', 'Delivery settings', 'Slots, fees, range, hold', FiTruck]].map(([k, l, s, Icon]) => (
                <button key={k} onClick={() => go(k)} className="bg-white border rounded-xl p-3 text-left hover:border-indigo-300">
                  <Icon size={18} className="text-indigo-600 mb-1" />
                  <p className="text-sm font-bold text-gray-800">{l}</p><p className="text-[11px] text-gray-400">{s}</p>
                </button>
              ))}
            </div>
            <p className="text-center mt-5"><Link to="/express/manager?classic=1" className="text-[11px] text-gray-400 underline">Counter tools (printer, code list)</Link></p>
          </div>
        )}

        {tab === 'orders'   && <OrdersTab />}
        {tab === 'catalog'  && <OwnerCatalogTab />}
        {tab === 'stock'    && <div className="grid gap-6"><ProductsTab /><InventoryTab /></div>}
        {tab === 'accounts' && <OwnerAccountsTab />}
        {tab === 'delivery' && <OwnerDeliveryTab />}
        {tab === 'team'     && <OwnerTeamTab />}
        {tab === 'staff'    && <OwnerPOSTab />}
        {tab === 'gst'      && <OwnerGstTab />}
      </div>
    </div>
  );
}
