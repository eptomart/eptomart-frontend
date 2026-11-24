// Super admin: waive 0–100 % of Koyambedu delivery charge / platform fee.
// Customers see the real fee struck out next to the reduced one.
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const inp = 'w-20 border border-gray-200 rounded-xl px-3 py-2 text-base sm:text-sm focus:outline-none focus:border-emerald-500';
const clamp = (v) => (v === '' ? '' : Math.min(100, Math.max(0, Number(v))));

function Fields({ value, onChange, onSave, busy }) {
  const Row = ({ label, k }) => (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        <input type="number" inputMode="decimal" min="0" max="100" className={inp} value={value[k] ?? ''}
          onChange={e => onChange({ ...value, [k]: clamp(e.target.value) })} />
        <span className="text-sm text-gray-500">% off</span>
        <button type="button" onClick={() => onChange({ ...value, [k]: 100 })} className="text-[11px] font-bold text-emerald-700 ml-1">Free</button>
      </div>
    </div>
  );
  return (
    <div className="space-y-2">
      <Row label="Delivery charge" k="deliveryPercent" />
      <Row label="Platform fee" k="platformPercent" />
      <button disabled={busy} onClick={onSave} className="w-full bg-emerald-600 text-white font-bold text-xs py-2 rounded-xl disabled:opacity-50 active:scale-95">{busy ? 'Saving…' : 'Save'}</button>
    </div>
  );
}

/** Applies to every Koyambedu Daily customer. */
export function GlobalFeeWaiver() {
  const [v, setV] = useState({ deliveryPercent: 0, platformPercent: 0 });
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.get('/koyambedu/admin/dev-settings/fee-discount').then(({ data }) => { setV({ deliveryPercent: data.deliveryPercent, platformPercent: data.platformPercent }); setMeta(data); }).catch(() => {}); }, []);
  const save = async () => {
    setBusy(true);
    try {
      const { data } = await api.put('/koyambedu/admin/dev-settings/fee-discount', { deliveryPercent: Number(v.deliveryPercent) || 0, platformPercent: Number(v.platformPercent) || 0 });
      setV({ deliveryPercent: data.deliveryPercent, platformPercent: data.platformPercent }); setMeta(data);
      toast.success('Fee waiver saved');
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to save'); }
    setBusy(false);
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
      <div>
        <h3 className="font-bold text-gray-700 text-sm">🎁 Fee waiver — all customers</h3>
        <p className="text-[11px] text-gray-400">Up to 100% off delivery charge and/or platform fee. Customers see the real fee struck out. Applies to new orders only; set 0 to switch off.</p>
        {meta?.updatedByName && <p className="text-[11px] text-gray-400">Last changed by {meta.updatedByName}{meta.updatedAt ? ` · ${new Date(meta.updatedAt).toLocaleString('en-IN')}` : ''}</p>}
      </div>
      <Fields value={v} onChange={setV} onSave={save} busy={busy} />
    </div>
  );
}

/** One customer only (the higher of this and the global waiver applies). */
export function CustomerFeeWaiver({ userId, initial }) {
  const [v, setV] = useState({ deliveryPercent: initial?.deliveryPercent || 0, platformPercent: initial?.platformPercent || 0 });
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const active = (Number(v.deliveryPercent) || 0) > 0 || (Number(v.platformPercent) || 0) > 0;
  const save = async () => {
    setBusy(true);
    try {
      await api.put(`/koyambedu/admin/customers/${userId}/fee-discount`, { deliveryPercent: Number(v.deliveryPercent) || 0, platformPercent: Number(v.platformPercent) || 0 });
      toast.success('Customer fee waiver saved'); setOpen(false);
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to save'); }
    setBusy(false);
  };
  return (
    <div className="mt-3 border-t border-gray-100 pt-2">
      <button onClick={() => setOpen(o => !o)} className="text-xs font-bold text-emerald-700">
        🎁 Fee waiver{active ? ` · delivery ${v.deliveryPercent}% / platform ${v.platformPercent}%` : ''} {open ? '▲' : '▼'}
      </button>
      {open && <div className="mt-2"><Fields value={v} onChange={setV} onSave={save} busy={busy} /></div>}
    </div>
  );
}
