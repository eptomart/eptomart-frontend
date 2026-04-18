import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { FiPrinter, FiDownload, FiArrowLeft } from 'react-icons/fi';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import EptomartLogo from '../../components/common/EptomartLogo';
import { formatINR } from '../../utils/currency';
import { BUSINESS } from '../../utils/businessInfo';

export default function InvoiceView() {
  const { id }              = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const printRef              = useRef();

  useEffect(() => {
    api.get(`/invoices/${id}`)
      .then(r => setInvoice(r.data.invoice))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    // COD orders only available after delivery
    const order = invoice.order;
    if (order?.paymentMethod === 'cod' && order?.orderStatus !== 'delivered') {
      toast('Invoice will be available after your order is delivered and payment collected.', { icon: '📦' });
      return;
    }

    // Always stream via backend — window.open(pdfUrl) is blocked by popup blockers
    // and never triggers a download dialog. The /download endpoint sets
    // Content-Disposition: attachment so the browser saves it as a file.
    setDownloading(true);
    try {
      const res = await api.get(`/invoices/${id}/download`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `invoice-${invoice.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Invoice downloaded!');
    } catch (err) {
      // Backend may return JSON error wrapped in a Blob (responseType:'blob' path)
      const data = err?.response?.data;
      if (data instanceof Blob) {
        const text = await data.text().catch(() => '{}');
        try {
          const json = JSON.parse(text);
          if (json.codPending) {
            toast('Invoice available after delivery.', { icon: '📦' });
            return;
          }
          toast.error(json.message || 'Failed to download invoice');
        } catch {
          toast.error('Failed to download invoice');
        }
        return;
      }
      toast.error(err?.message || 'Failed to download invoice');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"/></div>;
  if (!invoice) return <div className="text-center py-20 text-gray-400">Invoice not found</div>;

  const { billingAddress: ba, shippingAddress: sa, business } = invoice;
  const bus = business || BUSINESS;

  return (
    <>
      <Helmet><title>Invoice {invoice.invoiceNumber} — Eptomart</title></Helmet>

      {/* Action bar — hidden when printing */}
      <div className="no-print bg-white border-b sticky top-0 z-10 px-4 py-3 flex items-center gap-3">
        <Link to="/orders" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <FiArrowLeft size={16} /> Back to Orders
        </Link>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="flex items-center gap-2 btn-outline text-sm"
          >
            <FiDownload size={14} />
            {downloading ? 'Downloading…' : 'Download PDF'}
          </button>
          <button onClick={handlePrint} className="flex items-center gap-2 btn-primary text-sm">
            <FiPrinter size={14} /> Print
          </button>
        </div>
      </div>

      {/* Invoice body */}
      <div ref={printRef} className="max-w-3xl mx-auto p-8 print:p-4 print:max-w-none">

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="mb-2">
              <EptomartLogo height={40} />
            </div>
            <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">{bus.address}</p>
            <p className="text-xs text-gray-500">📞 {bus.phone}</p>
            <p className="text-xs text-gray-500">🌐 {bus.website}</p>
            {bus.gstNo && <p className="text-xs text-gray-500">GSTIN: {bus.gstNo}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-800 mb-1">TAX INVOICE</p>
            <p className="text-sm text-gray-600">Invoice No: <span className="font-mono font-bold text-primary-600">{invoice.invoiceNumber}</span></p>
            <p className="text-sm text-gray-600">Date: {new Date(invoice.generatedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
            <p className="text-sm text-gray-600">Order: <span className="font-mono">#{invoice.order?.orderId}</span></p>
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-6 mb-8 p-4 bg-gray-50 rounded-xl">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Bill To</p>
            <p className="font-semibold text-gray-800">{ba?.name}</p>
            <p className="text-sm text-gray-600">{ba?.phone}</p>
            <p className="text-sm text-gray-600">{[ba?.addressLine1, ba?.city, ba?.state, ba?.pincode].filter(Boolean).join(', ')}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ship To</p>
            <p className="font-semibold text-gray-800">{sa?.name}</p>
            <p className="text-sm text-gray-600">{sa?.phone}</p>
            <p className="text-sm text-gray-600">{[sa?.addressLine1, sa?.city, sa?.state, sa?.pincode].filter(Boolean).join(', ')}</p>
          </div>
        </div>

        {/* Items table */}
        <table className="w-full text-sm mb-6 border-collapse">
          <thead>
            <tr className="bg-primary-500 text-white">
              <th className="text-left p-3 rounded-tl-lg">Item</th>
              <th className="text-left p-3 hidden sm:table-cell">Seller</th>
              <th className="text-center p-3">Qty</th>
              <th className="text-right p-3">Unit Price</th>
              <th className="text-right p-3">GST</th>
              <th className="text-right p-3 rounded-tr-lg">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-orange-50' : 'bg-white'}>
                <td className="p-3 font-medium text-gray-800">{item.productName}</td>
                <td className="p-3 text-gray-500 hidden sm:table-cell">{item.sellerName || 'Eptomart'}</td>
                <td className="p-3 text-center text-gray-700">{item.quantity}</td>
                <td className="p-3 text-right text-gray-700">{formatINR(item.unitPriceExGst)}</td>
                <td className="p-3 text-right text-gray-600">
                  <p>{item.gstRate}%</p>
                  <p className="text-xs">{formatINR(item.gstAmount)}</p>
                </td>
                <td className="p-3 text-right font-semibold text-gray-800">{formatINR(item.lineGrandTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-8">
          <div className="w-64 space-y-2 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal (excl. GST)</span>
              <span>{formatINR(invoice.subtotal)}</span>
            </div>
            {invoice.gstType === 'intra' ? (
              <>
                <div className="flex justify-between text-gray-600"><span>CGST</span><span>{formatINR(invoice.cgstTotal)}</span></div>
                <div className="flex justify-between text-gray-600"><span>SGST</span><span>{formatINR(invoice.sgstTotal)}</span></div>
              </>
            ) : (
              <div className="flex justify-between text-gray-600"><span>IGST</span><span>{formatINR(invoice.igstTotal)}</span></div>
            )}
            {invoice.shipping > 0 && (
              <div className="flex justify-between text-gray-600"><span>Shipping</span><span>{formatINR(invoice.shipping)}</span></div>
            )}
            <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t border-gray-300">
              <span>Grand Total</span>
              <span className="text-primary-600">{formatINR(invoice.grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Payment info */}
        <div className="p-4 bg-green-50 rounded-xl mb-6 text-sm">
          <p className="font-semibold text-green-800 mb-1">Payment Details</p>
          <p className="text-green-700">
            Method: {invoice.order?.paymentMethod?.toUpperCase() || '—'} ·
            Status: <span className="font-semibold">
              {invoice.order?.paymentMethod === 'cod'
                ? invoice.order?.orderStatus === 'delivered' ? 'PAID (COD)' : 'PENDING — Pay on Delivery'
                : invoice.order?.paymentStatus === 'paid' ? 'PAID' : invoice.order?.paymentStatus?.toUpperCase() || 'PAID'}
            </span>
            {invoice.order?.paymentDetails?.transactionId && ` · Txn: ${invoice.order.paymentDetails.transactionId}`}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 text-center text-xs text-gray-400">
          <p>This is a computer-generated invoice and does not require a physical signature.</p>
          <p className="mt-1">{bus.name} · {bus.address} · {bus.phone}</p>
        </div>
      </div>

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </>
  );
}
