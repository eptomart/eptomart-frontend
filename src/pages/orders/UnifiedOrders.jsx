// ============================================
// UNIFIED MY ORDERS — one page, every vertical.
// Tabs are config-driven from /api/v2/orders/verticals:
// future verticals appear automatically.
// ============================================
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiPackage } from 'react-icons/fi';
import Navbar from '../../components/common/Navbar';
import Footer from '../../components/common/Footer';
import Loader from '../../components/common/Loader';
import OrderCard from '../../components/orders/OrderCard';
import api from '../../utils/api';
import toast from 'react-hot-toast';

const ALL_TAB = { key: 'all', name: 'All Orders', emoji: '📦', color: '#374151' };

export default function UnifiedOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'all';

  const [tabs,    setTabs]    = useState([ALL_TAB]);
  const [orders,  setOrders]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Load vertical tabs once (registry-driven)
  useEffect(() => {
    api.get('/v2/orders/verticals')
      .then(r => setTabs([ALL_TAB, ...(r.data.verticals || [])]))
      .catch(() => {}); // fall back to All tab only
  }, []);

  const loadOrders = useCallback(async (tab, pageNum, append = false) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const { data } = await api.get('/v2/orders', {
        params: { vertical: tab === 'all' ? 'all' : tab, page: pageNum, limit: 20 },
      });
      setOrders(prev => append ? [...prev, ...(data.orders || [])] : (data.orders || []));
      setHasMore(!!data.hasMore);
      setPage(pageNum);
      if (data.failedVerticals?.length) {
        toast.error(`Some orders couldn't be loaded (${data.failedVerticals.join(', ')})`);
      }
    } catch {
      if (!append) setOrders([]);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadOrders(activeTab, 1, false); }, [activeTab, loadOrders]);

  const switchTab = (key) => {
    setSearchParams(key === 'all' ? {} : { tab: key }, { replace: true });
  };

  return (
    <>
      <Helmet><title>My Orders — Eptomart</title></Helmet>
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 py-8 min-h-screen">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">📦 My Orders</h1>

        {/* ── Vertical tabs (config-driven) ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-5">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => switchTab(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-bold transition-all ${
                activeTab === tab.key ? 'text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={activeTab === tab.key ? { background: tab.color } : {}}>
              {tab.emoji} {tab.shortName || tab.name}
            </button>
          ))}
        </div>

        {loading ? (
          <Loader fullPage={false} />
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <FiPackage size={64} className="mx-auto text-gray-200 mb-4" />
            <h3 className="text-lg font-semibold text-gray-500 mb-2">No orders yet</h3>
            <Link to="/" className="btn-primary text-sm">Start Shopping</Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {orders.map(order => (
                <OrderCard key={`${order.vertical}-${order.id}`} order={order} />
              ))}
            </div>
            {hasMore && (
              <div className="text-center mt-6">
                <button onClick={() => loadOrders(activeTab, page + 1, true)}
                  disabled={loadingMore}
                  className="px-6 py-2.5 rounded-2xl bg-white border border-gray-200 text-sm font-bold text-gray-600 hover:border-gray-400">
                  {loadingMore ? 'Loading…' : 'Load More'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}
