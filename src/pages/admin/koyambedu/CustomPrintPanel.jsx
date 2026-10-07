// ============================================
// KOYAMBEDU ADMIN — CUSTOM PRINT PANEL (Printer tab)
// ============================================
// Walk-in / manual bills that aren't tied to a real order. Items can be a
// Koyambedu product (searched) OR anything the admin types in (own name,
// unit, qty, price). Every printed/saved bill is stored (KoyambeduCustomBill)
// so it can be found again under "Saved bills": edit it (add/remove/change
// items), reprint it, or delete it. No native popups — delete uses a
// two-tap confirmation (native confirm() is blocked in the app webview).
// Real orders are never touched by anything in here.
import { useState, useRef, useEffect, useCallback } from 'react';
import { FiPlus, FiX, FiPrinter, FiChevronDown, FiChevronUp, FiSave, FiEdit2, FiTrash2, FiSearch } from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { isPrinterConnected, printCustomBillViaBluetooth, printCustomBillViaDialog } from '../../../utils/thermalPrinter';

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const to12h = (time) => {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
const fmtDate = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('en-IN');
const lineTotal = (it) => (Number(it.qty) || 0) * (Number(it.price) || 0);

const inputStyle = { width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' };
const labelStyle = { fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 };
const smallInput = { padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, textAlign: 'right' };

// Offline fallback used if the AI reader is unavailable. Handles the common
// shapes: "Tomato 2 kg @46", "1. Tomato nattu 2kg x 46 = 92", "Onion - 1kg - 50",
// plus "Customer:/Name:" and "Location:/Area:" header lines. Never guesses a price.
const UNIT_RX = '(kg|kgs|g|gm|gms|gram|grams|pcs|pc|piece|pieces|bunch|bunches|dozen|ltr|l|litre|liter|pack|box)';
function localParseBill(text) {
  const out = { customerName: '', location: '', items: [] };
  for (let raw of String(text).split(/\r?\n/)) {
    let line = raw.trim();
    if (!line) continue;
    let m;
    if ((m = line.match(/^(?:customer|name|cust)\s*[:\-]\s*(.+)$/i))) { out.customerName = m[1].trim(); continue; }
    if ((m = line.match(/^(?:location|area|place)\s*[:\-]\s*(.+)$/i))) { out.location = m[1].trim(); continue; }
    if (/^(bill\s*no|date|total|sub\s*total|thank|items?\s*:|-{3,}|={3,}|eptomart|koyambedu)/i.test(line)) continue;
    line = line.replace(/^\s*\d+\s*[.)]\s+/, '').replace(/[₹]|rs\.?/gi, '');   // numbering, currency symbols
    const q = line.match(new RegExp('(\\d+(?:\\.\\d+)?)\\s*' + UNIT_RX + '\\b', 'i'));
    if (!q) continue;
    let qty = Number(q[1]); let unit = q[2].toLowerCase();
    if (/^(g|gm|gms|gram|grams)$/.test(unit)) { qty = qty / 1000; unit = 'kg'; }
    else if (/^kgs?$/.test(unit)) unit = 'kg';
    else if (/^(pc|pcs|piece|pieces)$/.test(unit)) unit = 'pcs';
    else if (/^(l|litre|liter|ltr)$/.test(unit)) unit = 'ltr';
    else if (/^bunch/.test(unit)) unit = 'bunch';
    const name = line.slice(0, q.index).replace(/[-:–—@x×=]+\s*$/i, '').replace(/^[-:–—\s]+/, '').trim();
    if (!name) continue;
    const rest = line.slice(q.index + q[0].length);
    const nums = (rest.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    let price = null;
    const at = rest.match(/(?:@|x|×|at)\s*(\d+(?:\.\d+)?)/i);
    if (at) price = Number(at[1]);
    else if (nums.length >= 2) price = nums[0];           // "2 kg 46 92" -> rate 46
    else if (nums.length === 1) price = nums[0];          // "2 kg 46"
    out.items.push({ name, unit, qty: Math.round(qty * 1000) / 1000, price });
  }
  return out;
}

export default function CustomPrintPanel({ connected }) {
  const [open, setOpen] = useState(false);

  // ── Bill form ───────────────────────────────────────────
  const [editingId, setEditingId] = useState(null);   // saved bill being edited
  const [billNo, setBillNo] = useState('');           // kept stable when editing/reprinting
  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTimeStr());
  const [items, setItems] = useState([]);             // { name, unit, qty, price }
  const [busy, setBusy] = useState(false);

  // Koyambedu product search
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);

  // Paste-to-bill
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [reading, setReading] = useState(false);
  const pasteRef = useRef(null);

  // Own (free-text) item
  const [own, setOwn] = useState({ name: '', unit: 'kg', qty: '', price: '' });

  // ── Saved bills ─────────────────────────────────────────
  const [bills, setBills] = useState([]);
  const [billsLoading, setBillsLoading] = useState(false);
  const [billSearch, setBillSearch] = useState('');
  const [deleteArmed, setDeleteArmed] = useState(null); // bill _id awaiting 2nd tap
  const [showSaved, setShowSaved] = useState(true);
  const formRef = useRef(null);

  const loadBills = useCallback(async (q = '') => {
    setBillsLoading(true);
    try {
      const { data } = await api.get('/koyambedu/custom-bills', { params: { search: q || undefined, limit: 50 } });
      setBills(data.bills || []);
    } catch {
      toast.error('Could not load saved bills');
    } finally {
      setBillsLoading(false);
    }
  }, []);

  useEffect(() => { if (open) loadBills(billSearch); /* eslint-disable-next-line */ }, [open]);

  // ── Items ───────────────────────────────────────────────
  const searchProducts = (q) => {
    setQuery(q);
    clearTimeout(debounce.current);
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/koyambedu/admin/products?search=${encodeURIComponent(q.trim())}`);
        setResults((data.products || []).slice(0, 8));
      } catch { setResults([]); } finally { setSearching(false); }
    }, 250);
  };

  const addProduct = (p) => {
    const defaultPrice = p.currentPrice ?? p.price ?? '';
    setItems(prev => [...prev, { name: p.name, unit: p.unit || '', qty: 1, price: defaultPrice }]);
    setQuery(''); setResults([]);
  };

  const addOwnItem = () => {
    const name = own.name.trim();
    if (!name) { toast.error('Enter the item name'); return; }
    if (!(Number(own.qty) > 0)) { toast.error('Enter a quantity'); return; }
    if (own.price === '' || !(Number(own.price) >= 0)) { toast.error('Enter a price'); return; }
    setItems(prev => [...prev, { name, unit: own.unit.trim(), qty: Number(own.qty), price: Number(own.price) }]);
    setOwn(o => ({ ...o, name: '', qty: '', price: '' }));
  };

  const patchItem = (idx, patch) => setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it));
  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));
  const grandTotal = items.reduce((s, it) => s + lineTotal(it), 0);

  // Read pasted text into the form (customer, location, items). Replaces nothing
  // silently: items are APPENDED to whatever is already on the bill, and
  // header fields only fill in if currently empty. Admin reviews, then prints.
  // One-tap paste. Some app webviews don't show the long-press "Paste" menu in
  // text boxes, so read the clipboard directly (iOS shows a small "Paste"
  // confirmation bubble the first time). If the webview refuses, fall back to
  // focusing the box so the normal long-press / keyboard paste can be used.
  const pasteFromClipboard = async () => {
    try {
      const txt = await navigator.clipboard.readText();
      if (!txt || !txt.trim()) { toast.error('Clipboard is empty — copy the text first'); return; }
      setPasteText(prev => (prev.trim() ? prev.replace(/\s+$/, '') + '\n' : '') + txt);
    } catch {
      pasteRef.current?.focus();
      toast('Tap and hold inside the box, then choose Paste', { icon: '📋' });
    }
  };

  const readPastedText = async () => {
    if (!pasteText.trim()) { toast.error('Paste some text first'); return; }
    setReading(true);
    let parsed = null, usedFallback = false;
    try {
      const { data } = await api.post('/koyambedu/custom-bills/parse', { text: pasteText });
      parsed = data;
    } catch {
      parsed = localParseBill(pasteText);
      usedFallback = true;
    } finally {
      setReading(false);
    }
    if (!parsed.items?.length) { toast.error('Could not find any items in that text'); return; }
    if (parsed.customerName && !customerName.trim()) setCustomerName(parsed.customerName);
    if (parsed.location && !location.trim()) setLocation(parsed.location);
    setItems(prev => [...prev, ...parsed.items.map(it => ({ name: it.name, unit: it.unit || '', qty: it.qty, price: it.price ?? '' }))]);
    setPasteText(''); setPasteOpen(false);
    const missing = parsed.items.filter(it => it.price == null).length;
    toast.success(`${parsed.items.length} item${parsed.items.length !== 1 ? 's' : ''} added${usedFallback ? ' (basic reader)' : ''}${missing ? ` — enter price for ${missing}` : ''}`);
  };

  const resetForm = () => {
    setEditingId(null); setBillNo('');
    setCustomerName(''); setLocation('');
    setDate(todayStr()); setTime(nowTimeStr());
    setItems([]); setQuery(''); setResults([]);
    setOwn({ name: '', unit: 'kg', qty: '', price: '' });
  };

  // ── Validate + save (create or update) ─────────────────
  const validate = () => {
    if (!customerName.trim()) { toast.error('Enter a customer name'); return false; }
    if (!items.length) { toast.error('Add at least one item'); return false; }
    if (items.some(it => !String(it.name).trim())) { toast.error('Every item needs a name'); return false; }
    if (items.some(it => it.price === '' || it.price == null)) { toast.error('Enter a price for every item'); return false; }
    return true;
  };

  const payload = () => ({
    customerName: customerName.trim(),
    location: location.trim(),
    billDate: date,
    billTime: time,
    items: items.map(it => ({ name: String(it.name).trim(), unit: it.unit || '', qty: Number(it.qty) || 0, price: Number(it.price) || 0 })),
  });

  const saveBill = async () => {
    if (editingId) {
      const { data } = await api.put(`/koyambedu/custom-bills/${editingId}`, payload());
      return data.bill;
    }
    const { data } = await api.post('/koyambedu/custom-bills', payload());
    return data.bill;
  };

  const toPrintable = (b) => ({
    billNo: b.billNo,
    dateStr: fmtDate(b.billDate),
    timeLabel: to12h(b.billTime),
    customerName: b.customerName,
    customerArea: b.location || '',
    items: b.items.map(it => ({ name: it.name, unit: it.unit, qty: it.qty, price: it.price })),
  });

  const doPrint = async (bill) => {
    if (connected && isPrinterConnected()) await printCustomBillViaBluetooth(toPrintable(bill));
    else printCustomBillViaDialog(toPrintable(bill));
  };

  const handleSave = async (alsoPrint) => {
    if (!validate()) return;
    setBusy(true);
    try {
      const bill = await saveBill();
      setEditingId(bill._id); setBillNo(bill.billNo);
      if (alsoPrint) { await doPrint(bill); toast.success('Saved & sent to printer'); }
      else toast.success('Bill saved');
      loadBills(billSearch);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Could not save the bill');
    } finally {
      setBusy(false);
    }
  };

  // ── Saved-bill actions ─────────────────────────────────
  const editBill = (b) => {
    setEditingId(b._id); setBillNo(b.billNo);
    setCustomerName(b.customerName); setLocation(b.location || '');
    setDate(b.billDate); setTime(b.billTime || nowTimeStr());
    setItems(b.items.map(it => ({ ...it })));
    setQuery(''); setResults([]);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const reprintBill = async (b) => {
    try { await doPrint(b); toast.success('Sent to printer'); }
    catch (err) { toast.error(err.message || 'Print failed'); }
  };

  const deleteBill = async (b) => {
    if (deleteArmed !== b._id) { setDeleteArmed(b._id); setTimeout(() => setDeleteArmed(a => a === b._id ? null : a), 4000); return; }
    try {
      await api.delete(`/koyambedu/custom-bills/${b._id}`);
      setBills(prev => prev.filter(x => x._id !== b._id));
      if (editingId === b._id) resetForm();
      setDeleteArmed(null);
      toast.success('Bill deleted');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed');
    }
  };

  const btn = (bg, color, extra = {}) => ({ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', background: bg, color, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: 'pointer', ...extra });

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'none', border: 'none', borderRadius: '12px 12px 0 0', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>+ Custom Bill (create · saved bills)</span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px' }} ref={formRef}>
          <div style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>
            Bill a walk-in or manual sale. Add Koyambedu products <b>or your own items</b> with any name. Bills are saved so you can find, edit, reprint or delete them later.
          </div>

          {editingId && (
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 10px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#1e40af', fontWeight: 600 }}>Editing bill {billNo} — add or change items, then Save &amp; Print.</span>
              <button onClick={resetForm} style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>New bill</button>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={labelStyle}>Customer Name</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Ramesh Kumar" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Anna Nagar" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} style={inputStyle} />
            </div>
          </div>

          {/* Paste text → bill */}
          <div style={{ marginBottom: 10 }}>
            <button onClick={() => setPasteOpen(o => !o)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 8, border: '1px dashed #f4941c', background: '#fff7ed', color: '#c2410c', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <span>📋 Paste text to make a bill</span>{pasteOpen ? <FiChevronUp /> : <FiChevronDown />}
            </button>
            {pasteOpen && (
              <div style={{ marginTop: 8 }}>
                <button onClick={pasteFromClipboard}
                  style={{ ...btn('#fff', '#c2410c', { border: '1px solid #f4941c', width: '100%', marginBottom: 6 }) }}>
                  📋 Paste from clipboard
                </button>
                <textarea ref={pasteRef} value={pasteText} onChange={e => setPasteText(e.target.value)} onPaste={e => { /* allow native paste; nothing blocked */ }} rows={7}
                  autoCapitalize="off" autoCorrect="off" spellCheck={false} inputMode="text"
                  placeholder={'Paste anything, e.g. a WhatsApp order:\n\nName: Ramesh\nArea: Anna Nagar\nTomato 2 kg @46\nOnion 1kg 50\nCoriander 2 bunch 10'}
                  style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }} />
                <div style={{ fontSize: 11, color: '#6b7280', margin: '4px 0 8px' }}>
                  Items are added to the bill below for you to check. Prices missing in the text are left blank — nothing is guessed.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={readPastedText} disabled={reading} style={btn('#f4941c', '#fff', { flex: 1, opacity: reading ? 0.6 : 1 })}>{reading ? 'Reading…' : 'Read into bill'}</button>
                  <button onClick={() => { setPasteText(''); setPasteOpen(false); }} style={btn('#fff', '#111', { border: '1px solid #e5e7eb', fontWeight: 600 })}>Cancel</button>
                </div>
              </div>
            )}
          </div>

          {/* Koyambedu product search */}
          <div style={{ position: 'relative', marginBottom: 8 }}>
            <label style={labelStyle}>Add Koyambedu product</label>
            <input value={query} onChange={e => searchProducts(e.target.value)} placeholder="Search product name…" style={inputStyle} />
            {(searching || results.length > 0) && query.trim().length >= 2 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, marginTop: 4, zIndex: 10, maxHeight: 220, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                {searching && <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>Searching…</div>}
                {!searching && results.map(p => (
                  <button key={p._id} onClick={() => addProduct(p)}
                    style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 13 }}>{p.name}</span>
                    <FiPlus size={14} style={{ color: '#065f46' }} />
                  </button>
                ))}
                {!searching && results.length === 0 && <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>No products found — add it as your own item below.</div>}
              </div>
            )}
          </div>

          {/* Own item (any name) */}
          <div style={{ background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 8, padding: 10, marginBottom: 10 }}>
            <label style={labelStyle}>Item name (type any name)</label>
            <input value={own.name} onChange={e => setOwn(o => ({ ...o, name: e.target.value }))} placeholder="e.g. Banana leaf bundle" style={{ ...inputStyle, marginBottom: 6 }} />
            <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr auto', gap: 6, alignItems: 'end' }}>
              <div><label style={labelStyle}>Unit</label>
                <input list="kcp-units" value={own.unit} onChange={e => setOwn(o => ({ ...o, unit: e.target.value }))} placeholder="kg" style={{ ...inputStyle, padding: '6px 8px' }} /></div>
              <div><label style={labelStyle}>Quantity</label>
                <input type="number" min="0" step="any" value={own.qty} onChange={e => setOwn(o => ({ ...o, qty: e.target.value }))} placeholder="e.g. 2" style={{ ...inputStyle, padding: '6px 8px' }} /></div>
              <div><label style={labelStyle}>Rate per unit (₹)</label>
                <input type="number" min="0" step="any" value={own.price} onChange={e => setOwn(o => ({ ...o, price: e.target.value }))} placeholder="₹ e.g. 46" style={{ ...inputStyle, padding: '6px 8px' }} /></div>
              <button onClick={addOwnItem} style={btn('#065f46', '#fff', { padding: '8px 12px' })}><FiPlus size={14} /> Add</button>
            </div>
            <datalist id="kcp-units">{['kg', 'g', 'pcs', 'bunch', 'dozen', 'ltr', 'pack', 'box'].map(u => <option key={u} value={u} />)}</datalist>
          </div>

          {items.length > 0 && (
            <div style={{ border: '1px solid #f3f4f6', borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', fontSize: 10.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                <span style={{ flex: '1 1 130px', minWidth: 110 }}>Item name</span>
                <span style={{ width: 55, textAlign: 'right' }}>Qty</span>
                <span style={{ width: 46 }}>Unit</span>
                <span style={{ width: 62, textAlign: 'right' }}>Rate ₹</span>
                <span style={{ width: 62, textAlign: 'right' }}>Amount ₹</span>
                <span style={{ width: 19 }} />
              </div>
              {items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 10px', borderBottom: '1px solid #f3f4f6', flexWrap: 'wrap' }}>
                  <input value={it.name} onChange={e => patchItem(idx, { name: e.target.value })} title="Item name"
                    style={{ flex: '1 1 130px', minWidth: 110, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 13 }} />
                  <input type="number" min="0" step="any" value={it.qty} onChange={e => patchItem(idx, { qty: e.target.value === '' ? '' : Number(e.target.value) })} title="Quantity" placeholder="Qty" style={{ ...smallInput, width: 55 }} />
                  <input list="kcp-units" value={it.unit} onChange={e => patchItem(idx, { unit: e.target.value })} title="Unit" style={{ ...smallInput, width: 46, textAlign: 'left' }} />
                  <input type="number" min="0" step="any" value={it.price} onChange={e => patchItem(idx, { price: e.target.value === '' ? '' : Number(e.target.value) })} placeholder="₹" title="Rate per unit (₹)" style={{ ...smallInput, width: 62 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#111', width: 62, textAlign: 'right' }}>{'₹'}{lineTotal(it).toFixed(2)}</span>
                  <button onClick={() => removeItem(idx)} title="Remove item" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}><FiX size={15} /></button>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                <span>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                <span>Total: ₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => handleSave(true)} disabled={busy} style={btn('#065f46', '#fff', { flex: '1 1 140px', opacity: busy ? 0.6 : 1 })}>
              <FiPrinter size={14} /> {editingId ? 'Update & Print' : 'Save & Print'}
            </button>
            <button onClick={() => handleSave(false)} disabled={busy} style={btn('#fff', '#065f46', { border: '1px solid #065f46', opacity: busy ? 0.6 : 1 })}>
              <FiSave size={14} /> {editingId ? 'Update' : 'Save'}
            </button>
            <button onClick={resetForm} style={btn('#fff', '#111', { border: '1px solid #e5e7eb', fontWeight: 600 })}>Clear</button>
          </div>

          {/* ── Saved bills ───────────────────────────────── */}
          <div style={{ marginTop: 18, borderTop: '1px solid #f3f4f6', paddingTop: 12 }}>
            <button onClick={() => setShowSaved(s => !s)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 8 }}>
              <span style={{ fontWeight: 700, fontSize: 13.5, color: '#111' }}>Saved bills ({bills.length})</span>
              {showSaved ? <FiChevronUp /> : <FiChevronDown />}
            </button>

            {showSaved && (
              <>
                <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <FiSearch size={13} style={{ position: 'absolute', left: 9, top: 10, color: '#9ca3af' }} />
                    <input value={billSearch} onChange={e => setBillSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadBills(billSearch)}
                      placeholder="Search customer, bill no, item…" style={{ ...inputStyle, paddingLeft: 28 }} />
                  </div>
                  <button onClick={() => loadBills(billSearch)} style={btn('#f4941c', '#fff', { padding: '7px 14px' })}>{billsLoading ? '…' : 'Search'}</button>
                </div>

                {!billsLoading && bills.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#9ca3af', fontSize: 12.5 }}>No saved bills yet — bills you save or print will appear here.</div>
                )}

                {bills.map(b => (
                  <div key={b._id} style={{ border: editingId === b._id ? '1px solid #93c5fd' : '1px solid #e5e7eb', borderRadius: 10, padding: '9px 11px', marginBottom: 8, background: editingId === b._id ? '#f0f7ff' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#111' }}>{b.customerName}{b.location ? <span style={{ fontWeight: 500, color: '#6b7280' }}> ({b.location})</span> : null}</div>
                        <div style={{ fontSize: 11.5, color: '#6b7280', marginTop: 1 }}>{b.billNo} · {fmtDate(b.billDate)} {to12h(b.billTime)} · {b.items.length} item{b.items.length !== 1 ? 's' : ''}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#065f46', whiteSpace: 'nowrap' }}>{'₹'}{Number(b.total).toFixed(2)}</div>
                    </div>
                    <div style={{ fontSize: 11.5, color: '#6b7280', margin: '5px 0 8px' }}>
                      {b.items.slice(0, 4).map(it => it.name).join(', ')}{b.items.length > 4 ? ` +${b.items.length - 4} more` : ''}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => editBill(b)} style={btn('#eff6ff', '#1d4ed8', { flex: 1, padding: '7px 8px' })}><FiEdit2 size={13} /> Edit / Add items</button>
                      <button onClick={() => reprintBill(b)} style={btn('#065f46', '#fff', { flex: 1, padding: '7px 8px' })}><FiPrinter size={13} /> Reprint</button>
                      <button onClick={() => deleteBill(b)} style={btn(deleteArmed === b._id ? '#dc2626' : '#fef2f2', deleteArmed === b._id ? '#fff' : '#dc2626', { padding: '7px 10px' })}>
                        <FiTrash2 size={13} /> {deleteArmed === b._id ? 'Tap again to delete' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
