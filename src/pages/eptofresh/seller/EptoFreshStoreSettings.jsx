// Proteins store settings — delivery rules + GST invoicing.
// Used by the seller (own store) and super admin (any store via `sellerId`).
import { useEffect, useState } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

const GST_RATES = [0, 0.25, 3, 5, 12, 18, 28];
const inp = 'w-full px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-gray-900 outline-none focus:border-orange-400';

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold text-gray-600">{label}</span>
      {children}
      {hint && <span className="block text-[10px] text-gray-400 mt-0.5">{hint}</span>}
    </label>
  );
}

export default function EptoFreshStoreSettings({ sellerId = null, initial = null, onSaved }) {
  const [seller, setSeller] = useState(initial);
  const [ds, setDs] = useState({});
  const [gst, setGst] = useState({});
  const [saving, setSaving] = useState(false);
  const [commission, setCommission] = useState('');
  const [savingComm, setSavingComm] = useState(false);

  const hydrate = (s) => {
    setSeller(s);
    setCommission(String(s.commissionRate ?? 10));
    setDs({ enabled: false, minOrderValue: 0, maxRadiusKm: 10, baseDeliveryCharge: 0, freeDeliveryAbove: 0, freeRadiusKm: 2, stepKm: 2, stepCharge: 0, ...(s.deliverySettings || {}) });
    setGst({ registered: false, gstin: '', legalName: '', gstRate: 0, hsnDefault: '0207', invoicePrefix: '', ...(s.gst || {}) });
  };

  useEffect(() => {
    if (initial) { hydrate(initial); return; }
    api.get('/eptofresh/seller/profile').then(r => r.data.success && hydrate(r.data.seller)).catch(() => {});
  }, [initial]);

  const saveCommission = async () => {
    setSavingComm(true);
    try {
      const { data } = await api.patch(`/eptofresh/admin/sellers/${sellerId}/commission`, { commissionRate: commission === '' ? NaN : Number(commission) });
      if (data.success) { toast.success(`Commission set to ${data.seller.commissionRate}%`); setSeller(s => ({ ...s, commissionRate: data.seller.commissionRate })); onSaved?.({ ...seller, commissionRate: data.seller.commissionRate }, true); }
    } catch (e) { toast.error(e.response?.data?.message || 'Only a super admin can change commission'); }
    finally { setSavingComm(false); }
  };

  const setD = (k, v) => setDs(d => ({ ...d, [k]: v }));
  const setG = (k, v) => setGst(d => ({ ...d, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const body = { deliverySettings: ds, gst };
      const { data } = sellerId
        ? await api.put(`/eptofresh/admin/sellers/${sellerId}/store-settings`, body)
        : await api.put('/eptofresh/seller/store-settings', body);
      if (data.success) { toast.success('Store settings saved'); hydrate(data.seller); onSaved?.(data.seller); }
    } catch (e) { toast.error(e.response?.data?.message || 'Could not save'); }
    finally { setSaving(false); }
  };

  if (!seller) return <div className="p-4 text-sm text-gray-400">Loading…</div>;

  const example = (() => {
    const amt = 300, dist = 5;
    const base = ds.freeDeliveryAbove > 0 && amt >= ds.freeDeliveryAbove ? 0 : Number(ds.baseDeliveryCharge) || 0;
    const steps = dist > ds.freeRadiusKm ? Math.ceil((dist - ds.freeRadiusKm) / (Number(ds.stepKm) || 2)) : 0;
    return Math.round(base + steps * (Number(ds.stepCharge) || 0));
  })();

  return (
    <div className="space-y-4 text-gray-900">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-2">
        <p className="font-bold text-sm">Eptomart commission</p>
        {sellerId ? (
          <>
            <p className="text-[11px] text-gray-500">% Eptomart keeps from this store's item sales (0 = no commission). 18% GST applies on the commission amount.</p>
            <div className="flex gap-2 items-center">
              <input type="number" min="0" max="100" step="0.5" className={inp + ' max-w-[110px]'} value={commission} onChange={e => setCommission(e.target.value)} />
              <span className="text-sm font-semibold">%</span>
              {[0, 5, 8, 10, 15].map(v => (
                <button key={v} type="button" onClick={() => setCommission(String(v))}
                  className="px-2 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-700">{v}%</button>
              ))}
              <button onClick={saveCommission} disabled={savingComm} className="ml-auto px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold disabled:opacity-50">
                {savingComm ? 'Saving…' : 'Set'}
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm">Eptomart commission on your sales: <b>{seller.commissionRate ?? 10}%</b> <span className="text-[11px] text-gray-400">(set by Eptomart)</span></p>
        )}
      </div>
      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Delivery rules</p>
            <p className="text-[11px] text-gray-500">Per-store charges, like Epto Express. Off = platform default tiers.</p>
          </div>
          <button onClick={() => setD('enabled', !ds.enabled)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${ds.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {ds.enabled ? 'Custom ON' : 'Custom OFF'}
          </button>
        </div>
        {ds.enabled && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Minimum order (₹)" hint="0 = no minimum"><input type="number" min="0" className={inp} value={ds.minOrderValue} onChange={e => setD('minOrderValue', e.target.value)} /></Field>
            <Field label="Max delivery radius (km)" hint="0 = unlimited"><input type="number" min="0" className={inp} value={ds.maxRadiusKm} onChange={e => setD('maxRadiusKm', e.target.value)} /></Field>
            <Field label="Delivery charge (₹)" hint="Base charge inside free radius"><input type="number" min="0" className={inp} value={ds.baseDeliveryCharge} onChange={e => setD('baseDeliveryCharge', e.target.value)} /></Field>
            <Field label="Free delivery above (₹)" hint="0 = never free"><input type="number" min="0" className={inp} value={ds.freeDeliveryAbove} onChange={e => setD('freeDeliveryAbove', e.target.value)} /></Field>
            <Field label="Free radius (km)" hint="No extra step charge within this"><input type="number" min="0" className={inp} value={ds.freeRadiusKm} onChange={e => setD('freeRadiusKm', e.target.value)} /></Field>
            <Field label="Step every (km)" hint="e.g. 2"><input type="number" min="0.5" step="0.5" className={inp} value={ds.stepKm} onChange={e => setD('stepKm', e.target.value)} /></Field>
            <Field label="Charge per step (₹)" hint="Added for each step beyond free radius"><input type="number" min="0" className={inp} value={ds.stepCharge} onChange={e => setD('stepCharge', e.target.value)} /></Field>
            <div className="rounded-xl bg-orange-50 border border-orange-100 p-2 text-[11px] text-orange-800 self-end">
              Example: ₹300 order, 5 km away → delivery <b>₹{example}</b>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">GST &amp; invoice details</p>
            <p className="text-[11px] text-gray-500">Invoices are issued in this seller's name.</p>
          </div>
          <button onClick={() => setG('registered', !gst.registered)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold ${gst.registered ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {gst.registered ? 'GST registered' : 'Not registered'}
          </button>
        </div>
        <Field label="Legal / trade name on invoice" hint="Defaults to the brand name"><input className={inp} value={gst.legalName || ''} onChange={e => setG('legalName', e.target.value)} /></Field>
        {gst.registered && (
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Field label="GSTIN" hint="15 characters"><input className={inp + ' uppercase'} maxLength={15} value={gst.gstin || ''} onChange={e => setG('gstin', e.target.value.toUpperCase())} /></Field></div>
            <Field label="Default GST % (delivery &amp; fallback)" hint="Each product has its own GST % in the product form">
              <select className={inp} value={gst.gstRate} onChange={e => setG('gstRate', Number(e.target.value))}>
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </Field>
            <Field label="Default HSN" hint="0207 poultry · 0201/0204 meat · 0302 fish"><input className={inp} value={gst.hsnDefault || ''} onChange={e => setG('hsnDefault', e.target.value)} /></Field>
          </div>
        )}
        <Field label="Invoice prefix" hint={`Next no: ${(gst.invoicePrefix || 'EPF')}/…/${String((seller.gst?.invoiceCounter || 0) + 1).padStart(5, '0')}`}>
          <input className={inp + ' uppercase'} maxLength={6} value={gst.invoicePrefix || ''} onChange={e => setG('invoicePrefix', e.target.value.toUpperCase())} />
        </Field>
        <p className="text-[10px] text-gray-400">Not registered, or 0% rate → a Bill of Supply is issued. Otherwise a GST Tax Invoice with CGST+SGST (same state) or IGST.</p>
      </div>

      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-orange-500 text-white font-bold text-sm disabled:opacity-50">
        {saving ? 'Saving…' : 'Save store settings'}
      </button>
    </div>
  );
}
