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
