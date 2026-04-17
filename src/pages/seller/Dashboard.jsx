import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPackage, FiShoppingBag, FiDollarSign, FiClock, FiPlus, FiAlertCircle, FiArrowRight } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [stats,    setStats]    = useState(null);
  const [profile,  setProfile]  = useState(null);
  const [products, setProducts] = useState([]);
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [sRes, pRes, profRes] = await Promise.all([
          api.get('/sellers/me/stats'),
          api.get('/products/seller/mine?limit=5&sort=-createdAt'),
          api.get('/sellers/me/profile'),
        ]);
        setStats(sRes.data.stats);
        setProducts(pRes.data.products || []);
        setProfile(profRes.data.seller);
      } catch (_) {}
      finally { setLoading(false); }
    };
    fetch();
  }, []);

  const STATUS_COLOR = {
    approved:         'bg-green-100 text-green-700',
    pending:          'bg-yellow-100 text-yellow-700',
    rejected:         'bg-red-100 text-red-700',
    correction_needed:'bg-orange-100 text-orange-700',
    draft:            'bg-gray-100 text-gray-600',
  };

  if (loading) return <div className="flex items-center justify-center h-48"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>;

  const businessName = profile?.businessName || user?.name || 'Seller';
  const isNewSeller  = (stats?.products?.approved || 0) === 0 && (stats?.orders?.totalOrders || 0) === 0;

  return (
    <div className="space-y-6">

      {/* Welcome Banner */}
      <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg, #0B1729 0%, #1a2f4a 100%)' }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-gray-400 mb-1">Welcome back 👋</p>
            <h2 className="text-xl font-bold text-white">{businessName}</h2>
            <p className="text-xs text-gray-400 mt-1">
              {isNewSeller
                ? 'Start by adding your first product to go live on Eptomart.'
                : `You have ${stats?.products?.approved || 0} live product(s) and ${stats?.orders?.totalOrders || 0} order(s).`}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link to="/seller/products" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10 text-white text-sm hover:bg-white/20 transition-colors">
              <FiPackage size={14} /> My Products <FiArrowRight size={12} />
            </Link>
            <Link to="/seller/products/add" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors" style={{ background: '#f4941c' }}>
              <FiPlus size={14} /> Add Product
            </Link>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold text-gray-700">Overview</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Live Products', value: stats?.products?.approved || 0,  icon: FiPackage,    color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending Review',value: stats?.products?.pending  || 0,  icon: FiClock,      color: 'text-yellow-600',bg: 'bg-yellow-50' },
          { label: 'Total Orders',  value: stats?.orders?.totalOrders || 0, icon: FiShoppingBag,color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: 'Revenue',       value: formatINR(stats?.orders?.totalRevenue || 0), icon: FiDollarSign, color: 'text-primary-600', bg: 'bg-orange-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-start gap-3">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
              <Icon size={20} className={color} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent products */}
      <div className="card">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Recent Products</h3>
          <Link to="/seller/products" className="text-sm text-primary-500 hover:underline">View all</Link>
        </div>
        {products.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-400 mb-3">No products yet</p>
            <Link to="/seller/products/add" className="btn-primary text-sm">Add your first product</Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {products.map(p => (
              <div key={p._id} className="p-4 flex items-center gap-3">
                <img src={p.images?.[0]?.url} alt={p.name} className="w-12 h-12 object-cover rounded-xl bg-gray-100" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500">{formatINR(p.discountPrice || p.price)} · GST {p.gstRate}%</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.approvalStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {p.approvalStatus?.replace('_', ' ')}
                </span>
                <Link to={`/seller/products/${p._id}`} className="text-xs text-primary-500 hover:underline ml-2">Edit</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      {(stats?.products?.correction_needed > 0 || stats?.products?.rejected > 0) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <FiAlertCircle size={18} className="text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-800">Action needed</p>
            <p className="text-sm text-orange-700 mt-0.5">
              Some products need your attention — check the Products tab for details.
            </p>
            <Link to="/seller/products" className="text-sm text-orange-600 hover:underline font-medium mt-1 inline-block">
              View products →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
