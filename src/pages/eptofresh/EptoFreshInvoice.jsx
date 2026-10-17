// GST tax invoice / bill of supply — issued in the seller's name.
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const fmt = n => `₹${(Number(n) || 0).toFixed(2)}`;

export default function EptoFreshInvoice() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    api.get(`/eptofresh/orders/${orderId}/invoice`)
      .then(r => r.data.success ? setD(r.data) : setErr('Invoice unavailable'))
      .catch(e => setErr(e.response?.data?.message || 'Invoice unavailable'));
  }, [orderId]);

  if (err) return <div className="p-8 text-center text-sm text-gray-500">{err}<div><button className="mt-3 underline" onClick={() => navigate(-1)}>Back</button></div></div>;
  if (!d) return <div className="p-8 text-center text-sm text-gray-400">Loading invoice…</div>;

  const inv = d.invoice, s = inv.sellerSnapshot || {}, t = inv.totals || {};
  const tax = inv.type === 'tax_invoice';
  const a = s.address || {};
  const b = d.buyer?.address || {};

  return (
    <div className="min-h-screen bg-gray-100 p-3 print:p-0 print:bg-white">
      <div className="max-w-2xl mx-auto mb-3 flex gap-2 print:hidden">
        <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-xl bg-white text-sm font-semibold border">Back</button>
        <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-bold">Print / Save PDF</button>
      </div>
      <div className="max-w-2xl mx-auto bg-white p-5 text-[12px] text-gray-900 border print:border-0">
        <div className="text-center border-b pb-2">
          <p className="text-base font-extrabold uppercase">{tax ? 'Tax Invoice' : 'Bill of Supply'}</p>
          <p className="text-lg font-bold mt-1">{s.name}</p>
          {s.brand && s.brand !== s.name && <p className="text-[11px] text-gray-500">({s.brand})</p>}
          <p className="text-gray-600">{[a.addressLine1, a.addressLine2, a.city, a.state, a.pincode].filter(Boolean).join(', ')}</p>
          {s.gstin && <p className="font-semibold">GSTIN: {s.gstin}</p>}
          {s.fssai && <p>FSSAI: {s.fssai}</p>}
          {s.phone && <p>Ph: {s.phone}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3 py-2 border-b">
          <div>
            <p><b>Invoice No:</b> {inv.number}</p>
            <p><b>Date:</b> {new Date(inv.issuedAt).toLocaleDateString('en-IN')}</p>
            <p><b>Order:</b> #{d.orderId}</p>
            <p><b>Payment:</b> {String(d.paymentMethod || '').toUpperCase()}</p>
          </div>
          <div>
            <p className="font-bold">Bill to</p>
            <p>{d.buyer?.name}</p>
            <p className="text-gray-600">{[b.addressLine1, b.addressLine2, b.city, b.pincode].filter(Boolean).join(', ')}</p>
            {d.buyer?.phone && <p>Ph: {d.buyer.phone}</p>}
            <p className="text-gray-500">Place of supply: {s.placeOfSupply}</p>
          </div>
        </div>
        <table className="w-full mt-2">
          <thead>
            <tr className="border-b text-left text-[11px]">
              <th className="py-1">#</th><th>Item</th><th>HSN/SAC</th><th className="text-right">Qty</th>
              <th className="text-right">Taxable</th>{tax && <th className="text-right">GST%</th>}<th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {inv.lines.map((l, i) => (
              <tr key={i} className="border-b align-top">
                <td className="py-1">{i + 1}</td><td>{l.description}</td><td>{l.hsn}</td>
                <td className="text-right">{l.qty} {l.uqc}</td>
                <td className="text-right">{fmt(l.taxable)}</td>
                {tax && <td className="text-right">{l.rate}%</td>}
                <td className="text-right">{fmt(l.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 ml-auto w-64 space-y-0.5">
          <div className="flex justify-between"><span>Taxable value</span><span>{fmt(t.taxable)}</span></div>
          {tax && t.cgst > 0 && <><div className="flex justify-between"><span>CGST</span><span>{fmt(t.cgst)}</span></div><div className="flex justify-between"><span>SGST</span><span>{fmt(t.sgst)}</span></div></>}
          {tax && t.igst > 0 && <div className="flex justify-between"><span>IGST</span><span>{fmt(t.igst)}</span></div>}
          {t.roundOff !== 0 && <div className="flex justify-between"><span>Round off</span><span>{fmt(t.roundOff)}</span></div>}
          <div className="flex justify-between font-bold text-sm border-t pt-1"><span>Total</span><span>₹{t.grand}</span></div>
        </div>
        <p className="mt-4 text-[10px] text-gray-500">
          {tax ? 'Amounts are inclusive of GST.' : 'Bill of supply — no GST charged / composition or exempt supply.'} This is a computer-generated invoice issued by {s.name} via Eptomart.
        </p>
      </div>
    </div>
  );
}
