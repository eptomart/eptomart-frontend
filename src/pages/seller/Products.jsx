import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiAlertCircle, FiCheckCircle, FiClock, FiXCircle, FiEye, FiCopy } from 'react-icons/fi';
import api from '../../utils/api';
import { formatINR } from '../../utils/currency';
import toast from 'react-hot-toast';

const STATUS_MAP = {
  approved:         { label: 'Live',      bg: 'bg-green-100 text-green-700',   icon: FiCheckCircle },
  pending:          { label: 'Pending',   bg: 'bg-yellow-100 text-yellow-700', icon: FiClock },
  rejected:         { label: 'Rejected',  bg: 'bg-red-100 text-red-700',       icon: FiXCircle },
  correction_needed:{ label: 'Fix Needed',bg: 'bg-orange-100 text-orange-700', icon: FiAlertCircle },
  draft:            { label: 'Draft',     bg: 'bg-gray-100 text-gray-600',     icon: FiEdit2 },
};

const TABS = ['all', 'approved', 'pending', 'draft', 'rejected', 'correction_needed'];

export default function SellerProducts() {
  const [products, setProducts] = useState([]);
  const [tab,      setTab]      = useState('all');
  const [loading,  setLoading]  = useState(true);

  const load = async (status) => {
    setLoading(true);
    try {
      const q    = status !== 'all' ? `?approvalStatus=${status}` : '';
      const { data } = await api.get(`/products/seller/mine${q}`);
      setProducts(data.products || []);
    } catch (_) {} finally { setLoading(false); }
  };

  useEffect(() => { load(tab); }, [tab]);

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/products/${id}`);
      setProducts(p => p.filter(x => x._id !== id));
      toast.success('Product deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const cloneProduct = async (id) => {
    try {
      const { data } = await api.post(`/products/${id}/clone`);
      toast.success('Product cloned as draft!');
      load(tab); // refresh list
    } catch { toast.error('Failed to clone product'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-800">My Products</h2>
        <Link to="/seller/products/add" className="btn-primary flex items-center gap-2 text-sm">
          <FiPlus size={15} /> Add Product
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all
              ${tab === t ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {t === 'all' ? 'All' : STATUS_MAP[t]?.label || t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-gray-400 mb-3">No products found</p>
          <Link to="/seller/products/add" className="btn-primary text-sm">Add Product</Link>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-4">Product</th>
                <th className="text-left p-4 hidden sm:table-cell">Price</th>
                <th className="text-left p-4 hidden md:table-cell">Stock</th>
                <th className="text-left p-4">Status</th>
                <th className="text-right p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => {
                const s = STATUS_MAP[p.approvalStatus] || STATUS_MAP.draft;
                const Icon = s.icon;
                return (
                  <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 flex items-center gap-3">
                      <img src={p.images?.[0]?.url} alt={p.name} className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate max-w-[180px]">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.category?.name}</p>
                      </div>
                    </td>
                    <td className="p-4 hidden sm:table-cell">
                      <p className="font-medium">{formatINR(p.discountPrice || p.price)}</p>
                      <p className="text-xs text-gray-400">GST {p.gstRate}%</p>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <span className={`text-sm font-medium ${p.stock === 0 ? 'text-red-500' : p.stock <= 5 ? 'text-orange-500' : 'text-gray-700'}`}>
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${s.bg}`}>
                        <Icon size={11} />
                        {s.label}
                      </span>
                      {p.approvalNote && (
                        <p className="text-xs text-red-500 mt-1 max-w-[160px] truncate" title={p.approvalNote}>
                          📌 {p.approvalNote}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link to={`/preview/${p._id}`} target="_blank" title="Preview" className="text-gray-400 hover:text-primary-600 p-1.5 rounded-lg hover:bg-orange-50">
                          <FiEye size={14} />
                        </Link>
                        <Link to={`/seller/products/${p._id}`} title="Edit" className="text-primary-500 hover:text-primary-600 p-1.5 rounded-lg hover:bg-orange-50">
                          <FiEdit2 size={14} />
                        </Link>
                        <button onClick={() => cloneProduct(p._id)} title="Clone" className="text-blue-400 hover:text-blue-600 p-1.5 rounded-lg hover:bg-blue-50">
                          <FiCopy size={14} />
                        </button>
                        <button onClick={() => deleteProduct(p._id)} title="Delete" className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50">
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
