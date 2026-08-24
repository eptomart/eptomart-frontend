// ============================================
// KOYAMBEDU ADMIN — CUSTOM PRINT PANEL (Printer tab)
// ============================================
// New, standalone panel inside the Printer tab. Lets the admin print a slip
// for a customer/products list that doesn't come from an existing order —
// e.g. a walk-in sale or a manual entry. Builds a synthetic order-shaped
// object and hands it to the SAME doPrint()/printViaBluetooth/printViaDialog
// pipeline already used for real orders (see thermalPrinter.js) — nothing
// about the existing order-based printing flow is touched.
import { useState, useRef } from 'react';
import { FiPlus, FiX, FiPrinter, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import { isPrinterConnected, printCustomBillViaBluetooth, printCustomBillViaDialog } from '../../../utils/thermalPrinter';

const todayStr = () => new Date().toISOString().slice(0, 10);
const nowTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Bill number that never mentions "custom" — same visual family as real
// order IDs (EPT prefix) so the printed receipt reads like a normal sale.
const genBillNo = () => `EPT${Date.now().toString(36).toUpperCase()}`;

export default function CustomPrintPanel({ connected }) {
  const [open, setOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(todayStr());
  const [time, setTime] = useState(nowTimeStr());

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounce = useRef(null);
  const [items, setItems] = useState([]); // { name, unit, qty, gradeName, price }

  const searchProducts = (q) => {
    setQuery(q);
    clearTimeout(debounce.current);
    if (!q.trim() || q.trim().length < 2) { setResults([]); return; }
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get(`/koyambedu/admin/products?search=${encodeURIComponent(q.trim())}`);
        setResults((data.products || []).slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const addProduct = (p) => {
    if (items.some(it => it.name === p.name)) {
      toast.error(`${p.name} is already in the list`);
      return;
    }
    // Pre-fill price from the product's current price if available, so the
    // admin usually only needs to adjust quantity — price stays editable.
    const defaultPrice = p.currentPrice ?? p.price ?? '';
    setItems(prev => [...prev, { name: p.name, unit: p.unit || '', qty: 1, gradeName: null, price: defaultPrice }]);
    setQuery('');
    setResults([]);
  };

  const removeItem = (name) => setItems(prev => prev.filter(it => it.name !== name));
  const updateQty = (name, qty) => setItems(prev => prev.map(it => it.name === name ? { ...it, qty } : it));
  const updatePrice = (name, price) => setItems(prev => prev.map(it => it.name === name ? { ...it, price } : it));

  const grandTotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  const reset = () => {
    setCustomerName('');
    setLocation('');
    setDate(todayStr());
    setTime(nowTimeStr());
    setItems([]);
    setQuery('');
    setResults([]);
  };

  const handlePrint = async () => {
    if (!customerName.trim()) { toast.error('Enter a customer name'); return; }
    if (!items.length) { toast.error('Add at least one product'); return; }
    if (items.some(it => !it.price && it.price !== 0)) { toast.error('Enter a price for every item'); return; }

    const timeLabel = (() => {
      const [h, m] = time.split(':').map(Number);
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = ((h + 11) % 12) + 1;
      return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
    })();

    const dateStr = new Date(`${date}T00:00:00`).toLocaleDateString('en-IN');

    // Uses the dedicated custom-bill print pipeline (buildCustomBillEscPos/
    // buildCustomBillHtml in thermalPrinter.js) — separate from the real
    // order-slip pipeline, includes pricing/total/thank-you/quote, and the
    // bill number never contains the word "custom" (EPT-prefixed, same
    // family as real order IDs) per the requirement that this reads like a
    // normal receipt.
    const bill = {
      billNo: genBillNo(),
      dateStr,
      timeLabel,
      customerName: customerName.trim(),
      customerArea: location.trim(),
      items: items.map(it => ({ name: it.name, unit: it.unit, qty: it.qty, price: it.price })),
    };

    try {
      if (connected && isPrinterConnected()) {
        await printCustomBillViaBluetooth(bill);
      } else {
        printCustomBillViaDialog(bill);
      }
      toast.success('Sent to printer');
    } catch (err) {
      toast.error(err.message || 'Print failed');
    }
  };

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 16 }}>
      {/* No overflow:hidden on the outer card — it was clipping the
          absolutely-positioned, scrollable product search dropdown below,
          making the results list unscrollable/uninteractable. The header
          button gets its own top corner radius instead, so the card still
          looks correctly rounded without clipping the dropdown. */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'none', border: 'none', borderRadius: '12px 12px 0 0', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>+ Custom Print</span>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ fontSize: 11.5, color: '#6b7280', marginBottom: 10 }}>
            Print a slip for a customer/products list that isn't tied to an existing order — e.g. a walk-in sale.
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Customer Name</label>
              <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="e.g. Ramesh Kumar"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Location</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Anna Nagar"
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Time</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }} />
            </div>
          </div>

          <div style={{ position: 'relative', marginBottom: 8 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Add Product (Koyambedu Daily)</label>
            <input
              value={query}
              onChange={e => searchProducts(e.target.value)}
              placeholder="Search product name…"
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13, boxSizing: 'border-box' }}
            />
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
                {!searching && results.length === 0 && (
                  <div style={{ padding: 10, fontSize: 12, color: '#9ca3af' }}>No products found</div>
                )}
              </div>
            )}
          </div>

          {items.length > 0 && (
            <div style={{ border: '1px solid #f3f4f6', borderRadius: 8, marginBottom: 10 }}>
              {items.map(it => {
                const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
                return (
                  <div key={it.name} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 13, flex: 1 }}>{it.name}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={it.qty}
                      onChange={e => updateQty(it.name, Number(e.target.value))}
                      title="Quantity"
                      style={{ width: 55, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, color: '#6b7280', width: 28 }}>{it.unit}</span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={it.price}
                      onChange={e => updatePrice(it.name, e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Price"
                      title="Price per unit"
                      style={{ width: 65, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: 12, textAlign: 'right' }}
                    />
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#111', width: 65, textAlign: 'right' }}>
                      {'₹'}{lineTotal.toFixed(2)}
                    </span>
                    <button onClick={() => removeItem(it.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', padding: 2 }}>
                      <FiX size={15} />
                    </button>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 10px', fontSize: 13, fontWeight: 700, color: '#065f46' }}>
                Total: {'₹'}{grandTotal.toFixed(2)}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handlePrint}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
            >
              <FiPrinter size={14} /> Print
            </button>
            <button
              onClick={reset}
              style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 12.5, cursor: 'pointer' }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
