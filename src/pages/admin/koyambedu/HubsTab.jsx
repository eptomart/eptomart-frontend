// Koyambedu Daily — Delivery Hubs (Super Admin)
// Delivery distance/charge is measured from the NEAREST active hub. Hubs can be
// mapped from Express stores (coordinates follow the store) or added as custom pins.
import { useEffect, useState } from 'react';
import api from '../../../utils/api';
import toast from 'react-hot-toast';

export default function HubsTab() {
  const [hubs, setHubs] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState({ name: '', lat: '', lng: '' });

  useEffect(() => {
    api.get('/koyambedu/admin/hubs')
      .then(({ data }) => { setHubs(data.hubs || []); setStores(data.expressStores || []); })
      .catch(() => toast.error('Failed to load hubs'))
      .finally(() => setLoading(false));
  }, []);

  const hubForStore = (id) => hubs.find(h => String(h.expressStore) === String(id));
  const addStoreHub = (s) => setHubs(h => [...h, { name: '', lat: s.lat, lng: s.lng, expressStore: s._id, isActive: true }]);
  const storeName = (h) => stores.find(s => String(s._id) === String(h.expressStore))?.name || '';
  const needsName = (h) => !h.name.trim() && !h.expressStore; // Express-mapped hubs fall back to the shop name
  const rename = (i, name) => setHubs(h => h.map((x, k) => k === i ? { ...x, name } : x));
  const remove = (i) => setHubs(h => h.filter((_, k) => k !== i));
  const toggle = (i) => {
    if (!hubs[i].isActive && needsName(hubs[i])) return toast.error('Give this hub a name before turning it on');
    setHubs(h => h.map((x, k) => k === i ? { ...x, isActive: !x.isActive } : x));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Location not available');
    navigator.geolocation.getCurrentPosition(
      p => setCustom(c => ({ ...c, lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) })),
      () => toast.error('Could not get location'), { enableHighAccuracy: true, timeout: 10000 });
  };
  // Accepts "13.07, 80.21" or a Google Maps link containing @lat,lng or q=lat,lng
  const parseCoords = (txt) => {
    const m = txt.match(/(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/);
    if (m) setCustom(c => ({ ...c, lat: m[1], lng: m[2] }));
  };
  const addCustom = () => {
    const lat = Number(custom.lat), lng = Number(custom.lng);
    if (!custom.name.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return toast.error('Enter a name, latitude and longitude');
    setHubs(h => [...h, { name: custom.name.trim(), lat, lng, expressStore: null, isActive: true }]);
    setCustom({ name: '', lat: '', lng: '' });
  };

  const save = async () => {
    const bad = hubs.find(h => h.isActive && needsName(h));
    if (bad) return toast.error('Custom hubs need a name — customers see it at checkout');
    setSaving(true);
    try {
      const { data } = await api.put('/koyambedu/admin/hubs', { hubs });
      setHubs(data.hubs.map(h => ({ _id: h._id, name: h.name, lat: h.lat, lng: h.lng, expressStore: h.expressStore, isActive: h.isActive })));
      toast.success('Hubs saved — new orders measure distance from the nearest active hub');
    } catch (e) { toast.error(e?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>;
  const activeCount = hubs.filter(h => h.isActive).length;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h2 className="text-lg font-black text-gray-900">📍 Delivery Hubs</h2>
        <p className="text-sm text-gray-500">Delivery distance and charge are measured from the <b>nearest active hub</b>. The name you give each hub is shown to customers ("Delivery charges from nearest hub: <i>name</i>").
          {activeCount === 0 && ' No active hub yet — distance is currently measured from Koyambedu market.'}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white divide-y">
        {hubs.length === 0 && <p className="p-4 text-sm text-gray-400">No hubs added.</p>}
        {hubs.map((h, i) => (
          <div key={i} className="p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <input value={h.name} onChange={e => rename(i, e.target.value)} placeholder={h.expressStore ? `Shop name: ${storeName(h)} (leave blank to use)` : 'Hub name shown to customers'}
                  className={`flex-1 min-w-0 border rounded-lg px-2 py-1 text-sm font-bold ${needsName(h) ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                <span className={`shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded-full ${h.expressStore ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'}`}>{h.expressStore ? 'Express store' : 'Custom'}</span>
              </div>
              <p className="text-[11px] text-gray-400">{Number(h.lat).toFixed(5)}, {Number(h.lng).toFixed(5)}</p>
            </div>
            <button onClick={() => toggle(i)} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${h.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{h.isActive ? 'Active' : 'Off'}</button>
            <button onClick={() => remove(i)} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600">Remove</button>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-3">
        <p className="text-sm font-black text-indigo-900 mb-2">Map from an Express store <span className="font-normal text-indigo-700">(add a name above, or leave blank to use the shop name)</span></p>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {stores.map(s => (
            <div key={s._id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2">
              <p className="flex-1 min-w-0 text-sm font-bold text-gray-800 truncate">{s.name}{s.city ? <span className="text-gray-400 font-normal"> · {s.city}</span> : null}</p>
              {hubForStore(s._id)
                ? <span className="text-xs font-bold text-green-600">✓ Hub</span>
                : <button onClick={() => addStoreHub(s)} className="text-xs font-bold px-3 py-1 rounded-lg bg-indigo-600 text-white">Add as hub</button>}
            </div>
          ))}
          {stores.length === 0 && <p className="text-sm text-gray-400">No Express stores found.</p>}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-3 space-y-2">
        <p className="text-sm font-black text-gray-900">Or add a custom hub</p>
        <input value={custom.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))} placeholder="Hub name (e.g. Tambaram warehouse)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <input onChange={e => parseCoords(e.target.value)} placeholder="Paste coordinates or a Google Maps link (optional)" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        <div className="flex gap-2">
          <input value={custom.lat} onChange={e => setCustom(c => ({ ...c, lat: e.target.value }))} placeholder="Latitude" className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
          <input value={custom.lng} onChange={e => setCustom(c => ({ ...c, lng: e.target.value }))} placeholder="Longitude" className="flex-1 min-w-0 border border-gray-300 rounded-lg px-3 py-2 text-sm" />
        </div>
        <div className="flex gap-2">
          <button onClick={useMyLocation} className="text-xs font-bold px-3 py-2 rounded-lg border border-gray-300 text-gray-600">📍 Use my current location</button>
          <button onClick={addCustom} className="text-xs font-bold px-3 py-2 rounded-lg bg-gray-900 text-white">Add hub</button>
        </div>
      </div>

      <button onClick={save} disabled={saving} className="w-full sm:w-auto text-sm font-black px-6 py-3 rounded-xl bg-green-600 text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save hubs'}</button>
    </div>
  );
}
