// ============================================
// EPTOMART EXPRESS — Invoice (issued on behalf of the store)
// PROFORMA until delivery, then the numbered Tax Invoice / Bill of Supply.
// Seller = the store (GSTIN, FSSAI); the Eptomart platform fee is shown
// separately because it is not the store's supply.
// ============================================
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiPrinter, FiArrowLeft } from 'react-icons/fi';
import api from '../../utils/api';

const money = (n) => `₹${Number(n || 0).toFixed(2)}`;
const TITLE = { tax_invoice: 'TAX INVOICE', bill_of_supply: 'BILL OF SUPPLY' };

export default function ExpressInvoice() {
  const { orderId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/express/orders/${orderId}/invoice`)
      .then(({ data }) => setData(data))
      .catch((e) => setError(e?.response?.data?.message || 'Could not load the invoice'));
  }, [orderId]);

  if (error) return <div className="max-w-2xl mx-auto p-6 text-center text-sm text-gray-500">{error}<div className="mt-3"><Link to="/express/my-orders" className="text-indigo-600 font-bold underline">Back to orders</Link></div></div>;
  if (!data) return <p className="p-6 text-sm text-gray-400">Loading invoice…</p>;

  const { invoice: inv, buyer } = data;
  const s = inv.seller;
  const t = inv.totals;
  const taxCols = inv.type === 'tax_invoice';
  const date = new Date(inv.isFinal ? inv.issuedAt : (inv.placedAt || Date.now())).toLocaleDateString('en-IN');

  return (
    <div className="max-w-3xl mx-auto p-4 print:p-0">
      <div className="flex items-center justify-between mb-3 print:hidden">
        <Link to="/express/my-orders" className="flex items-center gap-1 text-sm text-gray-500"><FiArrowLeft size={14} /> Orders</Link>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-bold"><FiPrinter size={13} /> Print / Save PDF</button>
      </div>

      <div className="bg-white border rounded-xl p-5 text-xs text-gray-700">
        {!inv.isFinal && <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-bold text-center">{inv.label}</div>}

        <div className="flex justify-between gap-4">
          <div>
            <p className="text-base font-black text-gray-900">{s.name}</p>
            {s.brand && s.brand !== s.name && <p className="text-[11px] text-gray-500">Trading as {s.brand}</p>}
            <p className="mt-1 whitespace-pre-line">{s.address}{s.pincode ? ` - ${s.pincode}` : ''}</p>
            {s.gstin ? <p className="mt-1">GSTIN: <b>{s.gstin}</b></p> : <p className="mt-1 text-gray-500">Not registered under GST</p>}
            {s.pan && <p>PAN: {s.pan}</p>}
            {s.fssai && <p>FSSAI Lic. No.: {s.fssai}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-black text-indigo-900">{inv.isFinal ? TITLE[inv.type] : `PROFORMA ${TITLE[inv.type]}`}</p>
            {inv.number && <p className="mt-1">Invoice no: <b>{inv.number}</b></p>}
            <p>Date: {date}</p>
            <p>Order: {data.orderId}</p>
            <p>Place of supply: {inv.placeOfSupply}{inv.interState ? ' (inter-state)' : ''}</p>
          </div>
        </div>

        <div className="mt-4 p-2 bg-gray-50 rounded-lg">
          <p className="text-[10px] font-bold uppercase text-gray-400">Billed / delivered to</p>
          <p className="font-semibold text-gray-800">{buyer?.name}</p>
          <p>{[buyer?.addressLine, buyer?.city, buyer?.pincode].filter(Boolean).join(', ')}</p>
          {buyer?.phone && <p>{buyer.phone}</p>}
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b-2 text-left text-gray-500">
                <th className="py-1 pr-2">Item</th><th className="pr-2">HSN/SAC</th><th className="pr-2 text-right">Qty</th>
                {taxCols && <><th className="pr-2 text-right">Taxable</th><th className="pr-2 text-right">GST %</th>
                  {inv.interState ? <th className="pr-2 text-right">IGST</th> : <><th className="pr-2 text-right">CGST</th><th className="pr-2 text-right">SGST</th></>}</>}
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.lines.map((l, i) => (
                <tr key={i} className="border-b">
                  <td className="py-1 pr-2">{l.description}</td><td className="pr-2">{l.hsn}</td>
                  <td className="pr-2 text-right">{l.qty} {l.uqc}</td>
                  {taxCols && <><td className="pr-2 text-right">{money(l.taxable)}</td><td className="pr-2 text-right">{l.rate}%</td>
                    {inv.interState ? <td className="pr-2 text-right">{money(l.igst)}</td> : <><td className="pr-2 text-right">{money(l.cgst)}</td><td className="pr-2 text-right">{money(l.sgst)}</td></>}</>}
                  <td className="text-right font-semibold">{money(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 ml-auto w-full sm:w-72">
          {taxCols && <>
            <Row k="Taxable value" v={money(t.taxable)} />
            {inv.interState ? <Row k="IGST" v={money(t.igst)} /> : <><Row k="CGST" v={money(t.cgst)} /><Row k="SGST" v={money(t.sgst)} /></>}
          </>}
          {t.roundOff !== 0 && <Row k="Round off" v={money(t.roundOff)} />}
          <Row k="Invoice total (store)" v={money(t.grand)} bold />
          {inv.platform && <Row k="Eptomart platform fee*" v={money(inv.platform.amount)} />}
          <Row k="Total payable" v={money(inv.payable)} bold />
        </div>
        {inv.platform && <p className="mt-1 text-[10px] text-gray-400">*{inv.platform.description}</p>}
        {!taxCols && <p className="mt-2 text-[10px] text-gray-500">Bill of Supply — no GST is charged; the supplier is not registered or the goods supplied are exempt.</p>}

        {inv.declined?.length > 0 && (
          <div className="mt-4 p-2 rounded-lg bg-red-50 border border-red-100">
            <p className="font-bold text-red-700 mb-1">Items not supplied (removed from this invoice)</p>
            {inv.declined.map((d, i) => <p key={i}>{d.name} × {d.quantity} — refunded {money(d.refund)}{d.reason ? ` · ${d.reason}` : ''}</p>)}
          </div>
        )}

        <div className="mt-4 pt-3 border-t">
          <p className="font-bold text-gray-800 mb-1">Payment summary</p>
          <Row k="Order total paid" v={money(inv.payment.total)} />
          {inv.payment.walletPaid > 0 && <Row k="  of which from Express wallet" v={money(inv.payment.walletPaid)} />}
          {inv.payment.refunded > 0 && <Row k="Refunded" v={`− ${money(inv.payment.refunded)}`} />}
          <Row k="Net paid" v={money(inv.payment.netPaid)} bold />
          {inv.refunds?.map((r, i) => (
            <p key={i} className="text-[11px] text-gray-500 mt-1">Refund {money(r.amount)} → {r.mode === 'source' ? 'original payment' : 'Eptomart wallet'}{r.fallbackToWallet ? ' (bank refund failed — credited to wallet)' : ''}</p>
          ))}
        </div>

        <p className="mt-4 text-[10px] text-gray-400 text-center">Issued by {s.name} through Eptomart Express. All prices are inclusive of applicable taxes. This is a computer-generated invoice.</p>
      </div>
    </div>
  );
}

function Row({ k, v, bold }) {
  return <div className={`flex justify-between py-0.5 ${bold ? 'font-bold text-gray-900 border-t mt-1 pt-1' : ''}`}><span className="whitespace-pre">{k}</span><span>{v}</span></div>;
}
