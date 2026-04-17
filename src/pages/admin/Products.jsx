// ============================================
// ADMIN — PRODUCT MANAGEMENT
// ============================================
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiPlus, FiEdit2, FiTrash2, FiImage, FiSearch, FiInfo } from 'react-icons/fi';
import Loader from '../../components/common/Loader';
import { formatINR } from '../../utils/currency';
import { extractBasePrice, GST_SLABS } from '../../utils/gst';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function AdminProducts() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [form, setForm] = useState({
    name: '', description: '', shortDescription: '', price: '',
    discountPrice: '', stock: '', category: '', brand: '', tags: '',
    isFeatured: false,
    gstRate: 18, priceIncludesGst: true, hsnCode: '', costPrice: '',
    codAvailable: true,
    instagramLink: '',   // admin-only field
    variants: [],
    platformMargin: '', sellerMargin: '',
  });
  const [imageFiles, setImageFiles] = useState([]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/products?page=${page}&limit=15&${search ? `search=${search}` : ''}`);
      setProducts(data.products || []);
      setTotalPages(data.totalPages || 1);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, search]);

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data.categories || []));
  }, []);

  const openAdd = () => {
    setEditProduct(null);
    setForm({ name: '', description: '', shortDescription: '', price: '', discountPrice: '', stock: '', category: '', brand: '', tags: '', isFeatured: false, codAvailable: true, gstRate: 18, priceIncludesGst: true, hsnCode: '', costPrice: '', instagramLink: '', variants: [], platformMargin: '', sellerMargin: '' });
    setImageFiles([]);
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    setForm({
      name: product.name || '',
      description: product.description || '',
      shortDescription: product.shortDescription || '',
      price: product.price || '',
      discountPrice: product.discountPrice || '',
      stock: product.stock || '',
      category: product.category?._id || '',
      brand: product.brand || '',
      tags: product.tags?.join(', ') || '',
      isFeatured: product.isFeatured || false,
      codAvailable: product.codAvailable !== false,
      gstRate: product.gstRate || 18,
      priceIncludesGst: product.priceIncludesGst !== false,
      hsnCode: product.hsnCode || '',
      costPrice: product.costPrice || '',
    });
    setImageFiles([]);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      // Admin products are auto-approved and visible immediately
      const payload = { ...form, approvalStatus: 'approved', priceIncludesGst: form.priceIncludesGst };
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== '' && v !== undefined) formData.append(k, v);
      });
      imageFiles.forEach(file => formData.append('images', file));

      if (editProduct) {
        await api.put(`/products/${editProduct._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product updated!');
      } else {
        await api.post('/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        toast.success('Product created!');
      }

      setShowModal(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${id}`);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  return (
    <>
      <Helmet><title>Products — Eptomart Admin</title></Helmet>

      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">Products ({products.length})</h1>
          <button onClick={openAdd} className="btn-primary btn-sm flex items-center gap-2">
            <FiPlus /> Add Product
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>

        {/* Table */}
        {loading ? <Loader fullPage={false} /> : (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3 text-left">Product</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Stock</th>
                    <th className="px-4 py-3 text-center">Featured</th>
                    <th className="px-4 py-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map(product => (
                    <tr key={product._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.images?.[0]?.url ? (
                            <img src={product.images[0].url} alt={product.name} className="w-10 h-10 object-cover rounded-lg" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              <FiImage className="text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-800 line-clamp-1">{product.name}</p>
                            {product.brand && <p className="text-xs text-gray-400">{product.brand}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{product.category?.name || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div>
                          <p className="font-bold">{formatINR(product.discountPrice || product.price)}</p>
                          {product.discountPrice && (
                            <p className="text-xs text-gray-400 line-through">{formatINR(product.price)}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`badge ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {product.isFeatured ? '⭐' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEdit(product)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500">
                            <FiEdit2 size={15} />
                          </button>
                          <button onClick={() => handleDelete(product._id, product.name)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500">
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 p-4 border-t">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium ${page === p ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white">
              <h2 className="text-lg font-bold">{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Product Name *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="input-field" required placeholder="e.g. Samsung Galaxy S24" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Description *</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    className="input-field" required rows={3} placeholder="Detailed product description" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Short Description</label>
                  <input type="text" value={form.shortDescription} onChange={e => setForm(f => ({ ...f, shortDescription: e.target.value }))}
                    className="input-field" placeholder="Brief product summary (shown on cards)" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Price (₹) *</label>
                  <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="input-field" required min="0" placeholder="1999" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Discount Price (₹)</label>
                  <input type="number" value={form.discountPrice} onChange={e => setForm(f => ({ ...f, discountPrice: e.target.value }))}
                    className="input-field" min="0" placeholder="1499 (optional)" />
                </div>

                {/* GST Section */}
                <div>
                  <label className="block text-sm font-medium mb-1">GST Rate *</label>
                  <select value={form.gstRate} onChange={e => setForm(f => ({ ...f, gstRate: Number(e.target.value) }))}
                    className="input-field">
                    {GST_SLABS.map(s => <option key={s} value={s}>{s}% GST</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">HSN Code</label>
                  <input type="text" value={form.hsnCode} onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))}
                    className="input-field" placeholder="e.g. 8528" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Cost Price (₹) <span className="text-gray-400 font-normal">— for margin calc</span></label>
                  <input type="number" value={form.costPrice} onChange={e => setForm(f => ({ ...f, costPrice: e.target.value }))}
                    className="input-field" min="0" placeholder="Your purchase cost (optional)" />
                </div>

                {/* Live GST + Margin preview */}
                {form.price > 0 && (
                  <div className="sm:col-span-2">
                    {(() => {
                      const sellPrice  = Number(form.price) || 0;
                      const gstRate    = Number(form.gstRate) || 0;
                      const basePrice  = form.priceIncludesGst ? extractBasePrice(sellPrice, gstRate) : sellPrice;
                      const gstAmt     = basePrice * gstRate / 100;
                      const finalPrice = basePrice + gstAmt;
                      const costP      = Number(form.costPrice) || 0;
                      const margin     = costP > 0 ? ((basePrice - costP) / costP * 100).toFixed(1) : null;
                      return (
                        <div className="bg-orange-50 rounded-xl p-3 text-xs space-y-1">
                          <p className="font-semibold text-gray-700 flex items-center gap-1"><FiInfo size={12}/> Price Breakdown</p>
                          <p className="text-gray-600">Base price (excl. GST): <strong>{formatINR(basePrice)}</strong></p>
                          <p className="text-gray-600">GST @ {gstRate}%: <strong>{formatINR(gstAmt)}</strong></p>
                          <p className="text-primary-600 font-semibold">Customer pays: {formatINR(finalPrice)}</p>
                          {margin !== null && (
                            <p className={`font-semibold ${Number(margin) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              Margin: {margin}% {Number(margin) > 0 ? '📈' : '📉'}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="priceInclGst" checked={form.priceIncludesGst}
                    onChange={e => setForm(f => ({ ...f, priceIncludesGst: e.target.checked }))}
                    className="accent-primary-500 w-4 h-4" />
                  <label htmlFor="priceInclGst" className="text-sm">Price entered includes GST</label>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Stock Quantity *</label>
                  <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: e.target.value }))}
                    className="input-field" required min="0" placeholder="100" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="input-field" required>
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Brand</label>
                  <input type="text" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}
                    className="input-field" placeholder="e.g. Samsung" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Tags</label>
                  <input type="text" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                    className="input-field" placeholder="smartphone, android, 5g" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Product Images (max 5)</label>
                  <input type="file" accept="image/*" multiple
                    onChange={e => setImageFiles(Array.from(e.target.files).slice(0, 5))}
                    className="input-field" />
                  {imageFiles.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{imageFiles.length} file(s) selected</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input type="checkbox" id="featured" checked={form.isFeatured}
                    onChange={e => setForm(f => ({ ...f, isFeatured: e.target.checked }))}
                    className="accent-primary-500 w-4 h-4" />
                  <label htmlFor="featured" className="text-sm font-medium">Feature this product</label>
                </div>

                <div className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-colors ${form.codAvailable ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <input type="checkbox" id="codAvailable" checked={form.codAvailable}
                    onChange={e => setForm(f => ({ ...f, codAvailable: e.target.checked }))}
                    className="accent-green-600 w-4 h-4 mt-0.5" />
                  <div>
                    <label htmlFor="codAvailable" className="text-sm font-semibold cursor-pointer">
                      💵 Cash on Delivery available
                    </label>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {form.codAvailable
                        ? 'COD is enabled — customers can pay on delivery'
                        : 'COD is disabled — customers must pay online for this product'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Instagram Link — Admin only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  📸 Instagram Link <span className="text-xs text-gray-400 font-normal">(Admin only)</span>
                </label>
                <input
                  type="url"
                  value={form.instagramLink}
                  onChange={e => setForm(f => ({ ...f, instagramLink: e.target.value }))}
                  placeholder="https://www.instagram.com/p/..."
                  className="input-field"
                />
              </div>

              {/* Margin fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform Margin (%)</label>
                  <input type="number" value={form.platformMargin} onChange={e => setForm(f => ({ ...f, platformMargin: e.target.value }))} placeholder="10" min="0" max="100" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Seller Margin (%)</label>
                  <input type="number" value={form.sellerMargin} onChange={e => setForm(f => ({ ...f, sellerMargin: e.target.value }))} placeholder="20" min="0" max="100" className="input-field" />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-outline flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving...' : editProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
