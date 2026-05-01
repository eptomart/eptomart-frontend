// ============================================
// ADMIN — BULK PRODUCT IMPORT
// ============================================
import React, { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { FiUpload, FiDownload, FiCheckCircle, FiXCircle, FiFileText } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function BulkImport() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef();

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) return toast.error('Please select a CSV file');

    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('csv', file);

      const { data } = await api.post('/bulk/import-products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(data.results);
      toast.success(data.message);
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const response = await api.get('/bulk/csv-template', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'product-import-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download template');
    }
  };

  const exportProducts = async () => {
    try {
      const response = await api.get('/bulk/export-products', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'eptomart-products.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Products exported!');
    } catch (err) {
      toast.error('Export failed');
    }
  };

  return (
    <>
      <Helmet><title>Bulk Import — Eptomart Admin</title></Helmet>

      <div className="max-w-3xl space-y-6">
        <h1 className="text-xl font-bold">📥 Bulk Product Import</h1>

        {/* Instructions */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-3">How to Import</h2>
          <ol className="space-y-2 text-sm text-gray-600 list-decimal list-inside">
            <li>Download the CSV template below</li>
            <li>Fill in your product data (one product per row)</li>
            <li>Make sure category names match exactly what's in your admin panel</li>
            <li>Upload the filled CSV file and click "Import Products"</li>
          </ol>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <button onClick={downloadTemplate} className="btn-outline flex items-center justify-center gap-2">
              <FiDownload /> Download Template
            </button>
            <button onClick={exportProducts} className="btn-outline flex items-center justify-center gap-2 text-gray-600">
              <FiDownload /> Export Current Products
            </button>
          </div>
        </div>

        {/* Bulk Stock Update section */}
        <div className="card p-6 border-l-4 border-orange-400">
          <h2 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
            📦 Bulk Stock Update (CSV)
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Update stock levels (and optionally prices) for multiple products at once. Use either <code className="bg-gray-100 px-1 rounded">product_code</code> or <code className="bg-gray-100 px-1 rounded">sku</code> to identify each product.
          </p>

          <div className="overflow-x-auto mb-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 pr-4 text-gray-500 font-medium">Column</th>
                  <th className="pb-2 pr-4 text-gray-500 font-medium">Required</th>
                  <th className="pb-2 text-gray-500 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {[
                  ['product_code', 'Either/or', 'Eptomart product code (e.g. EPT-001)'],
                  ['sku',          'Either/or', 'Seller SKU — use product_code OR sku, not required to have both'],
                  ['product_name', 'Optional',  'For your reference only — not used in lookup'],
                  ['current_stock','Optional',  'For your reference only'],
                  ['new_stock',    '✅ Required', 'Stock quantity to set (0 = out of stock)'],
                  ['price',        'Optional',  'Admin only — leave blank to keep current price'],
                  ['discount_price','Optional', 'Admin only — leave blank to keep current discount'],
                ].map(([col, req, note]) => (
                  <tr key={col}>
                    <td className="py-2 pr-4 font-mono text-orange-600">{col}</td>
                    <td className="py-2 pr-4">{req}</td>
                    <td className="py-2 text-gray-500">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-xs font-semibold text-gray-600 mb-1.5">Sample CSV:</p>
            <code className="block text-[11px] whitespace-pre text-gray-700 overflow-x-auto">{`product_code,sku,product_name,current_stock,new_stock,price,discount_price
EPT-001,SAM-S24-BLK,Samsung Galaxy S24,12,50,79999,69999
EPT-002,TSHIRT-M-BLU,Cotton T-Shirt Blue M,200,150,,
EPT-003,,Basmati Rice 5kg,100,200,,
,SKU-WATCH-01,Smart Watch Series 5,8,25,,`}</code>
          </div>

          <button
            onClick={async () => {
              try {
                const res = await api.get('/bulk/stock-update-template', { responseType: 'blob' });
                const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
                const a = document.createElement('a'); a.href = url;
                a.download = 'stock-update-template-admin.csv'; a.click();
                URL.revokeObjectURL(url);
                toast.success('Template downloaded!');
              } catch { toast.error('Download failed'); }
            }}
            className="flex items-center gap-2 text-sm font-medium bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 px-4 py-2.5 rounded-xl transition-colors"
          >
            <FiDownload size={14} /> Download Stock Update Template (Admin)
          </button>

          <p className="text-xs text-gray-400 mt-3">
            To upload a stock update CSV, use the <strong>Upload CSV File</strong> section above — the same uploader handles both product imports and stock updates.
          </p>
        </div>

        {/* CSV Format Reference */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-3">CSV Column Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 pr-4 text-gray-500 font-medium">Column</th>
                  <th className="pb-2 pr-4 text-gray-500 font-medium">Required</th>
                  <th className="pb-2 text-gray-500 font-medium">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  ['name', '✅ Yes', 'Samsung Galaxy S24'],
                  ['description', '✅ Yes', 'Flagship phone with AI features'],
                  ['price', '✅ Yes', '79999'],
                  ['discountPrice', 'Optional', '69999'],
                  ['stock', '✅ Yes', '50'],
                  ['category', '✅ Yes', 'Electronics (must exist in admin)'],
                  ['brand', 'Optional', 'Samsung'],
                  ['tags', 'Optional', 'smartphone|android|5g (use | to separate)'],
                  ['sku', 'Optional', 'SAM-S24-BLK'],
                  ['image', 'Optional', 'https://example.com/image.jpg'],
                ].map(([col, req, ex]) => (
                  <tr key={col}>
                    <td className="py-2 pr-4 font-mono text-primary-600 text-xs">{col}</td>
                    <td className="py-2 pr-4 text-xs">{req}</td>
                    <td className="py-2 text-xs text-gray-500">{ex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upload Form */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-800 mb-4">Upload CSV File</h2>
          <form onSubmit={handleImport}>
            {/* Drop Zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors mb-4
                ${file ? 'border-primary-400 bg-orange-50' : 'border-gray-200 hover:border-primary-300 hover:bg-orange-50'}`}
            >
              <FiFileText size={32} className={`mx-auto mb-2 ${file ? 'text-primary-500' : 'text-gray-300'}`} />
              {file ? (
                <div>
                  <p className="font-semibold text-primary-600">{file.name}</p>
                  <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500 font-medium">Click to select CSV file</p>
                  <p className="text-xs text-gray-400 mt-1">Max 5MB, .csv files only</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => setFile(e.target.files[0])}
                className="hidden"
              />
            </div>

            <div className="flex gap-3">
              {file && (
                <button type="button" onClick={() => setFile(null)} className="btn-outline">
                  Clear
                </button>
              )}
              <button type="submit" disabled={!file || loading} className="btn-primary flex-1 flex items-center justify-center gap-2">
                <FiUpload /> {loading ? 'Importing...' : 'Import Products'}
              </button>
            </div>
          </form>
        </div>

        {/* Results */}
        {result && (
          <div className="card p-6">
            <h2 className="font-bold text-gray-800 mb-4">Import Results</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex items-center gap-3 p-4 bg-green-50 rounded-xl">
                <FiCheckCircle size={24} className="text-green-500" />
                <div>
                  <p className="text-2xl font-bold text-green-700">{result.success}</p>
                  <p className="text-sm text-green-600">Products imported</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-xl">
                <FiXCircle size={24} className="text-red-400" />
                <div>
                  <p className="text-2xl font-bold text-red-500">{result.failed}</p>
                  <p className="text-sm text-red-400">Failed</p>
                </div>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">Errors:</p>
                <div className="bg-red-50 rounded-xl p-3 max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-600">• {err}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
