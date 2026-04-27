// ============================================
// PRODUCT PREVIEW — Seller/Admin preview any product
// Works for draft, pending, approved products
// ============================================
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiArrowLeft, FiEdit2, FiAlertCircle } from 'react-icons/fi';
import Navbar from '../components/common/Navbar';
import api from '../utils/api';
import { formatINR } from '../utils/currency';
import { useAuth } from '../context/AuthContext';

const STATUS_COLORS = {
  draft:            'bg-gray-100 text-gray-600',
  pending:          'bg-yellow-100 text-yellow-700',
  approved:         'bg-green-100 text-green-700',
  rejected:         'bg-red-100 text-red-700',
  correction_needed:'bg-orange-100 text-orange-700',
};

export default function ProductPreview() {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx,  setImgIdx]  = useState(0);
  const [error,   setError]   = useState('');

  useEffect(() => {
    api.get(`/products/${id}/preview`)
      .then(r => setProduct(r.data.product))
      .catch(err => setError(err.response?.data?.message || 'Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !product) return (
    <>
      <Navbar />
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <FiAlertCircle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Product Not Found</h2>
        <p className="text-gray-500 mb-6">{error || 'This product could not be loaded.'}</p>
        <Link to="/seller/products" className="btn-primary">← Back to Products</Link>
      </div>
    </>
  );

  const imgs  = product.images || [];
  const price = product.discountPrice || product.price;
  const exGst = product.price;
  const gst   = product.gstRate || 18;
  const isSeller = user?.role === 'seller';
  const editUrl  = isSeller ? `/seller/products/${id}` : `/admin/products`;

  return (
    <>
      <Helmet><title>{product.name} — Preview | Eptomart</title></Helmet>
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Preview Banner */}
        <div className="mb-6 rounded-xl p-4 flex items-center justify-between gap-4"
          style={{ background: '#FFF7ED', border: '2px dashed #F97316' }}>
          <div className="flex items-center gap-3">
            <span className="text-orange-500 text-xl">👁️</span>
            <div>
              <p className="font-bold text-gray-800">Preview Mode</p>
              <p className="text-xs text-gray-500">This is how your product will appear to customers. Status:
                <span className={`ml-2 inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[product.approvalStatus] || 'bg-gray-100 text-gray-600'}`}>
                  {product.approvalStatus}
                </span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to={editUrl} className="flex items-center gap-1.5 text-sm btn-outline py-1.5 px-3">
              <FiEdit2 size={13} /> Edit
            </Link>
            <Link to={isSeller ? '/seller/products' : '/admin/products'} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
              <FiArrowLeft size={13} /> Back
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Images */}
          <div>
            <div className="rounded-2xl overflow-hidden bg-gray-100 aspect-square mb-3">
              {imgs.length > 0 ? (
                <img src={imgs[imgIdx]?.url} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <span className="text-5xl">🖼️</span>
                </div>
              )}
            </div>
            {imgs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {imgs.map((img, idx) => (
                  <button key={idx} onClick={() => setImgIdx(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all
                      ${imgIdx === idx ? 'border-primary-500' : 'border-gray-200 hover:border-gray-300'}`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-4">
            {product.category?.name && (
              <p className="text-xs font-semibold text-primary-500 uppercase tracking-widest">{product.category.name}</p>
            )}
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{product.name}</h1>

            {product.shortDescription && (
              <p className="text-gray-600">{product.shortDescription}</p>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold text-primary-600">{formatINR(price)}</span>
              {product.discountPrice && (
                <span className="text-lg text-gray-400 line-through">{formatINR(product.price)}</span>
              )}
            </div>

            {/* GST note */}
            <p className="text-xs text-gray-500">
              Incl. {product.gstRate}% GST · HSN: {product.hsnCode || 'N/A'}
            </p>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${product.stock > 0 ? 'bg-green-500' : 'bg-red-400'}`} />
              <span className="text-sm text-gray-600">
                {product.stock > 0 ? `In Stock (${product.stock} units)` : 'Out of Stock'}
              </span>
            </div>

            {/* Variants */}
            {product.variants?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Available Options</p>
                <div className="flex flex-wrap gap-2">
                  {product.variants.map((v, i) => (
                    <span key={i} className="px-3 py-1 text-sm border border-gray-300 rounded-full text-gray-700">
                      {v.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="pt-2 border-t">
                <p className="text-sm font-semibold text-gray-700 mb-1">Description</p>
                <p className="text-sm text-gray-600 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Seller info */}
            {product.seller?.businessName && (
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-500">Sold by: <span className="font-semibold text-gray-700">{product.seller.businessName}</span></p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
