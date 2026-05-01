import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiAlertCircle, FiCheckCircle, FiClock, FiXCircle, FiEye, FiCopy, FiUpload, FiX, FiRefreshCw, FiChevronDown, FiChevronUp } from 'react-icons/fi';
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
  const [csvModal, setCsvModal] = useState(false);
  const [csvLoading, setCsvLoading] = useState(false);

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

  const resubmitProduct = async (id) => {
    try {
      await api.post(`/approvals/${id}/resubmit`);
      toast.success('Product resubmitted for review!');
      load(tab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Resubmit failed');
    }
  };

  const handleCsvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCsvLoading(true);
    try {
      const text = await file.text();
      const lines = text.trim().split('\n').filter(l => l.trim());

      if (lines.length < 2) {
        toast.error('CSV must have header row and at least one data row');
        setCsvLoading(false);
        return;
      }

      // Parse CSV
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const skuIdx = headers.indexOf('sku');
      const stockIdx = headers.indexOf('stock');

      if (skuIdx < 0 || stockIdx < 0) {
        toast.error('CSV must have "sku" and "stock" columns');
        setCsvLoading(false);
        return;
      }

      const updates = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim());
        if (cols[skuIdx] && cols[stockIdx]) {
          updates.push({
            sku: cols[skuIdx],
            stock: Number(cols[stockIdx]),
          });
        }
      }

      if (updates.length === 0) {
        toast.error('No valid rows found in CSV');
        setCsvLoading(false);
        return;
      }

      const { data } = await api.post('/products/bulk-stock', { updates });
      toast.success(`${data.updated} products updated, ${data.skipped} skipped`);
      if (data.errors.length > 0) {
        toast.error(`Errors: ${data.errors.slice(0, 3).join('; ')}`);
      }
      setCsvModal(false);
      load(tab);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to process CSV');
    } finally {
      setCsvLoading(false);
    }
  };

  return (
    <div>
      {/* CSV Modal */}
      {csvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-bold text-gray-800">Update Stock via CSV</h3>
              <button onClick={() => setCsvModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={20} />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p className="font-semibold mb-2">CSV Format:</p>
                <code className="block bg-white p-2 rounded border border-blue-100 text-xs overflow-x-auto">
sku,stock
ABC123,50
DEF456,25
GHI789,100
                </code>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-3">
                  Download your product list, update the stock column, and upload the file here.
                </p>
                <label className="block">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors">
                    <FiUpload size={24} className="mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">Click to upload CSV</p>
                    <p className="text-xs text-gray-400 mt-1">or drag and drop</p>
                  </div>
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleCsvUpload}
                    disabled={csvLoading}
                    className="hidden"
                  />
                </label>
              </div>

              {csvLoading && (
                <div className="flex items-center justify-center gap-2 py-3">
                  <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-gray-600">Processing...</span>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setCsvModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border rounded-lg">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-xl font-bold text-gray-800">My Products</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setCsvModal(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <FiUpload size={15} /> Update Stock via CSV
          </button>
          <Link to="/seller/products/add" className="btn-primary flex items-center gap-2 text-sm">
            <FiPlus size={15} /> Add Product
          </Link>
        </div>
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
                const needsAction = ['correction_needed', 'rejected'].includes(p.approvalStatus);
                return (
                  <React.Fragment key={p._id}>
                    <tr className={`hover:bg-gray-50 transition-colors ${needsAction ? 'bg-orange-50/40' : ''}`}>
                      <td className="p-4 flex items-center gap-3">
                        <img src={p.images?.[0]?.url} alt={p.name} className="w-10 h-10 object-cover rounded-lg bg-gray-100 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate max-w-[180px]">{p.name}</p>
                          {p.productCode && (
                            <p className="text-xs font-mono font-semibold text-primary-600">{p.productCode}</p>
                          )}
                          <p className="text-xs text-gray-400">
                            {p.category?.name}
                            {p.subCategory?.name && (
                              <span className="text-orange-500"> › {p.subCategory.name}</span>
                            )}
                          </p>
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
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 flex-wrap">
                          {/* Resubmit — shown for correction_needed or rejected */}
                          {needsAction && (
                            <button
                              onClick={() => resubmitProduct(p._id)}
                              title="Resubmit for review"
                              className="flex items-center gap-1 text-xs bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded-lg font-medium transition-all"
                            >
                              <FiRefreshCw size={11} /> Resubmit
                            </button>
                          )}
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
                    {/* Approval feedback banner — shown inline under the row */}
                    {needsAction && p.approvalNote && (
                      <tr className="bg-orange-50 border-b border-orange-100">
                        <td colSpan={5} className="px-4 pb-3 pt-0">
                          <div className="flex items-start gap-2 bg-white border border-orange-200 rounded-lg px-3 py-2.5 text-sm">
                            <FiAlertCircle size={14} className="text-orange-500 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold text-orange-800 text-xs mb-0.5">
                                {p.approvalStatus === 'correction_needed' ? 'Correction Required' : 'Product Rejected'}
                              </p>
                              <p className="text-orange-700 text-xs">{p.approvalNote}</p>
                              <p className="text-orange-500 text-xs mt-1">
                                Fix the issues above then click <strong>Edit</strong> to update, or <strong>Resubmit</strong> if already corrected.
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
