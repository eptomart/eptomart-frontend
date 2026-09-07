// ============================================
// KOYAMBEDU ADMIN — BULK-BUYER PRICE QUOTATION PDF
// Self-contained tab (own data fetching, no dependency on the parent
// KoyambeduAdmin.jsx tab-switch/loader) — same pattern as BulkHarvestTab /
// NewsTab. Lets admin generate a PDF price list for bulk buyers: scoped to
// all products, one or more categories, or hand-picked items; priced by
// either the lowest (bulk-quantity) or highest (small-quantity) variant
// rate per product; grouped by category with each item's minimum order
// quantity and a generated-on date/time stamp — all computed server-side
// (see adminGenerateQuotationPDF in koyambeduController.js) so the PDF
// always matches live pricing.
// ============================================
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { FiFileText, FiDownload, FiSearch, FiCheck } from 'react-icons/fi';
import api from '../../../utils/api';

const SCOPES = [
  { key: 'all',      label: 'All Products' },
  { key: 'category', label: 'By Category' },
  { key: 'items',    label: 'By Item' },
];

const STATUS_FILTERS = [
  { key: 'active',   label: 'Active Only' },
  { key: 'disabled', label: 'Disabled Only' },
  { key: 'all',      label: "Don't Filter (All)" },
];

export default function QuotationTab() {
  const [cats, setCats] = useState([]);
  const [products, setProducts] = useState([]);
  const [scope, setScope] = useState('all');
  const [priceMode, setPriceMode] = useState('lowest');
  const [statusFilter, setStatusFilter] = useState('active');
  const [selectedCatIds, setSelectedCatIds] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [search, setSearch] = useState('');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    api.get('/koyambedu/admin/categories?status=approved').then(({ data }) => setCats(data.categories || [])).catch(() => {});
    api.get('/koyambedu/admin/products').then(({ data }) => setProducts(data.products || [])).catch(() => {});
  }, []);

  const toggleCat = (id) => setSelectedCatIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);
  const toggleProduct = (id) => setSelectedProductIds(ids => ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const q = search.trim().toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const generate = async () => {
    if (scope === 'category' && selectedCatIds.length === 0) return toast.error('Select at least one category');
    if (scope === 'items' && selectedProductIds.length === 0) return toast.error('Select at least one product');
    setGenerating(true);
    try {
      const params = new URLSearchParams({ scope, priceMode, statusFilter });
      if (scope === 'category') params.set('categoryIds', selectedCatIds.join(','));
      if (scope === 'items') params.set('productIds', selectedProductIds.join(','));
      const { data } = await api.get(`/koyambedu/admin/quotation/pdf?${params}`, { responseType: 'blob' });
      const blob = new Blob([data], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Koyambedu-Quotation-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      toast.success('Quotation PDF downloaded');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to generate quotation');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <h2 className="font-bold text-gray-800 mb-1">Bulk-Buyer Price Quotation</h2>
      <p className="text-xs text-gray-500 mb-4">
        Generate a PDF price list to send to bulk buyers — grouped by category, stamped with the date and time it was generated,
        showing each product's minimum order quantity and the price you choose below.
      </p>

      {/* Scope */}
      <p className="text-xs font-bold text-gray-500 mb-1.5">Scope</p>
      <div className="flex gap-2 mb-4">
        {SCOPES.map(s => (
          <button key={s.key} onClick={() => setScope(s.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${scope === s.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {scope === 'category' && (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-500 mb-1.5">Select categories ({selectedCatIds.length} selected)</p>
          <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 border rounded-xl bg-gray-50">
            {cats.map(c => {
              const on = selectedCatIds.includes(c._id);
              return (
                <button key={c._id} onClick={() => toggleCat(c._id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${on ? 'bg-green-100 text-green-700 border-green-300' : 'bg-white text-gray-600 border-gray-200'}`}>
                  {on && <FiCheck size={12} />} {c.icon || ''} {c.name}
                </button>
              );
            })}
            {cats.length === 0 && <p className="text-xs text-gray-400 px-1 py-1">No categories found.</p>}
          </div>
        </div>
      )}

      {scope === 'items' && (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-500 mb-1.5">Select items ({selectedProductIds.length} selected)</p>
          <div className="relative mb-2">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-xl divide-y bg-white">
            {filteredProducts.map(p => {
              const on = selectedProductIds.includes(p._id);
              return (
                <button key={p._id} onClick={() => toggleProduct(p._id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50">
                  <span className="text-sm text-gray-800 truncate">{p.name} <span className="text-xs text-gray-400">({p.category?.name || 'Uncategorised'})</span></span>
                  <span className={`w-5 h-5 rounded flex items-center justify-center border shrink-0 ${on ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300'}`}>
                    {on && <FiCheck size={12} />}
                  </span>
                </button>
              );
            })}
            {filteredProducts.length === 0 && <p className="text-xs text-gray-400 px-3 py-3">No products match.</p>}
          </div>
        </div>
      )}

      {/* Price mode */}
      <p className="text-xs font-bold text-gray-500 mb-1.5">Price to quote</p>
      <div className="flex gap-2 mb-5">
        <button onClick={() => setPriceMode('lowest')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border text-left transition ${priceMode === 'lowest' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          Lowest Price
          <span className={`block font-normal mt-0.5 ${priceMode === 'lowest' ? 'text-green-100' : 'text-gray-400'}`}>Best bulk-quantity rate</span>
        </button>
        <button onClick={() => setPriceMode('highest')}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold border text-left transition ${priceMode === 'highest' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
          Highest Price
          <span className={`block font-normal mt-0.5 ${priceMode === 'highest' ? 'text-green-100' : 'text-gray-400'}`}>Small-quantity / retail rate</span>
        </button>
      </div>

      {/* Item status — internal filtering only, never printed on the PDF itself */}
      <p className="text-xs font-bold text-gray-500 mb-1.5">Item status to include</p>
      <div className="flex gap-2 mb-1">
        {STATUS_FILTERS.map(s => (
          <button key={s.key} onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${statusFilter === s.key ? 'bg-green-600 text-white border-green-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {s.label}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-gray-400 mb-5">Internal filter only — the PDF never shows an active/disabled label for any item.</p>

      <button onClick={generate} disabled={generating}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-bold hover:bg-green-700 disabled:opacity-50">
        {generating ? <FiFileText size={16} /> : <FiDownload size={16} />}
        {generating ? 'Generating…' : 'Generate PDF'}
      </button>
    </div>
  );
}
