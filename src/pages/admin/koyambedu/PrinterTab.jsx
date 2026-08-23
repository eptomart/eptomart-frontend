// ============================================
// KOYAMBEDU ADMIN — THERMAL PRINTER TAB
// ============================================
// New, standalone tab. Fetches from its own backend endpoint
// (GET /koyambedu/admin/orders/print-list) — completely separate from the
// existing Orders tab's data/endpoint, so nothing there is affected.
import { useState } from 'react';
import { FiPrinter, FiBluetooth, FiCheckSquare, FiSquare, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import api from '../../../utils/api';
import toast from 'react-hot-toast';
import {
  isBluetoothSupported, connectPrinter, disconnectPrinter, isPrinterConnected,
  printViaBluetooth, printViaDialog,
} from '../../../utils/thermalPrinter';

const todayStr = () => new Date().toISOString().slice(0, 10);

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'placed', label: 'Placed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'packing', label: 'Packing' },
  { value: 'dispatched', label: 'Dispatched' },
  { value: 'delivered', label: 'Delivered' },
];

function OrderRow({ order, onPrintFull, onPrintSelected }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());

  const toggleItem = (name) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(order.items.map(it => it.name)));
  const clearAll  = () => setSelected(new Set());

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>{order.orderId} — {order.customerName}</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            {new Date(order.placedAt).toLocaleString('en-IN')} · {order.items.length} item{order.items.length !== 1 ? 's' : ''} · {order.orderStatus}
          </div>
        </div>
        {open ? <FiChevronUp /> : <FiChevronDown />}
      </button>

      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={selectAll} style={{ fontSize: 11, fontWeight: 600, color: '#065f46', background: 'none', border: 'none', cursor: 'pointer' }}>Select all</button>
            <button onClick={clearAll} style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer' }}>Clear</button>
          </div>
          {order.items.map(it => (
            <button
              key={it.name}
              onClick={() => toggleItem(it.name)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
            >
              {selected.has(it.name) ? <FiCheckSquare size={16} style={{ color: '#065f46', flexShrink: 0 }} /> : <FiSquare size={16} style={{ color: '#9ca3af', flexShrink: 0 }} />}
              <span style={{ fontSize: 13, flex: 1 }}>{it.name}{it.gradeName ? ` (${it.gradeName})` : ''}</span>
              <span style={{ fontSize: 12, color: '#6b7280' }}>{it.qty}{it.unit ? ` ${it.unit}` : ''}</span>
            </button>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button
              onClick={() => onPrintFull(order)}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', background: '#065f46', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}
            >
              <FiPrinter size={14} /> Print Full Slip
            </button>
            <button
              onClick={() => selected.size > 0 && onPrintSelected(order, [...selected])}
              disabled={selected.size === 0}
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '9px 10px', background: selected.size ? '#f4941c' : '#f3f4f6', color: selected.size ? '#fff' : '#9ca3af', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 12.5, cursor: selected.size ? 'pointer' : 'not-allowed' }}
            >
              <FiPrinter size={14} /> Print Selected ({selected.size})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PrinterTab() {
  const [connected,  setConnected]  = useState(false);
  const [printerName, setPrinterName] = useState('');
  const [connecting, setConnecting] = useState(false);

  const [dateFrom, setDateFrom] = useState(todayStr());
  const [dateTo,   setDateTo]   = useState(todayStr());
  const [status,   setStatus]   = useState('');
  const [orders,   setOrders]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [loaded,   setLoaded]   = useState(false);

  const bluetoothSupported = isBluetoothSupported();

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { name } = await connectPrinter();
      setPrinterName(name);
      setConnected(true);
      toast.success(`Connected to ${name}`);
    } catch (err) {
      toast.error(err.message || 'Could not connect to printer');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnectPrinter();
    setConnected(false);
    setPrinterName('');
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ dateFrom, dateTo, limit: 100 });
      if (status) params.set('status', status);
      const { data } = await api.get(`/koyambedu/admin/orders/print-list?${params}`);
      setOrders(data.orders || []);
      setLoaded(true);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const printOne = async (order, itemsOnly) => {
    try {
      if (connected && isPrinterConnected()) {
        await printViaBluetooth(order, itemsOnly ? { itemsOnly } : {});
        toast.success('Sent to printer');
      } else {
        printViaDialog(order, itemsOnly ? { itemsOnly } : {});
      }
    } catch (err) {
      toast.error(err.message || 'Print failed');
    }
  };

  const printAllFull = async () => {
    if (!orders.length) return;
    for (const order of orders) {
      // eslint-disable-next-line no-await-in-loop
      await printOne(order);
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, 300)); // small gap between jobs
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      {/* Printer connection */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FiBluetooth size={16} style={{ color: connected ? '#065f46' : '#9ca3af' }} />
            {connected ? `Connected: ${printerName}` : 'Printer not connected'}
          </div>
          {!bluetoothSupported && (
            <div style={{ fontSize: 11.5, color: '#b45309', marginTop: 4, maxWidth: 380 }}>
              This browser doesn't support direct Bluetooth printing. Use "Print via System Dialog" on each order instead (works with the printer set up as a normal system printer).
            </div>
          )}
        </div>
        {bluetoothSupported && (
          connected
            ? <button onClick={handleDisconnect} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Disconnect</button>
            : <button onClick={handleConnect} disabled={connecting} style={{ padding: '8px 14px', borderRadius: 8, border: 'none', background: '#065f46', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                {connecting ? 'Connecting…' : 'Connect Printer'}
              </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value)} style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button onClick={loadOrders} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#f4941c', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            {loading ? 'Loading…' : 'Load Orders'}
          </button>
        </div>
      </div>

      {/* Results */}
      {loaded && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>{orders.length} order{orders.length !== 1 ? 's' : ''} found</span>
            {orders.length > 0 && (
              <button onClick={printAllFull} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, border: '1px solid #065f46', color: '#065f46', background: '#fff', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>
                <FiPrinter size={13} /> Print All (full slips)
              </button>
            )}
          </div>
          {orders.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px 0', color: '#9ca3af', fontSize: 13 }}>No orders match this filter.</div>
          )}
          {orders.map(order => (
            <OrderRow
              key={order._id}
              order={order}
              onPrintFull={printOne}
              onPrintSelected={(o, itemNames) => printOne(o, itemNames)}
            />
          ))}
        </>
      )}
    </div>
  );
}
