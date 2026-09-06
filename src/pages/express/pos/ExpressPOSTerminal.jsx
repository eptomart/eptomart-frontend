// ============================================
// EPTOMART EXPRESS — POS Billing Terminal
// Held-bills tray (max 4) + current bill editor + product search. Covers
// spec sections 6, 17, 18: create/hold/resume/complete bills, thermal
// receipt printing, every sale billed through the POS.
// ============================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiZap, FiLogOut, FiPlus, FiMinus, FiTrash2, FiPrinter, FiSearch, FiX, FiBluetooth } from 'react-icons/fi';
import expressPOSApi, { getPOSToken, clearPOSToken } from '../../../utils/expressPOSApi';
import {
  printReceipt, printPluList,
  isBluetoothSupported, connectPrinter, disconnectPrinter, isPrinterConnected,
} from '../../../utils/expressThermalPrinter';

const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
// Weight/volume units allow fractional quantities (1.35kg, 0.5 litre); the
// discrete units (piece/bunch/dozen) don't, so they keep the simple +/-
// stepper. Unit itself always comes from the linked Koyambedu Daily
// product (see expressAdminController — unit defaults to koyambeduProduct.unit
// or 'kg' when a product is first linked into Express), never hardcoded here.
const isDecimalUnit = (unit) => unit === 'kg' || unit === 'gram' || unit === 'litre';

export default function ExpressPOSTerminal() {
  const navigate = useNavigate();
  const [posUser, setPosUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState([]);
  const [activeBillId, setActiveBillId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [codeInput, setCodeInput] = useState('');
  // Per-tile quantity typed before adding (e.g. "1.35" for 1.35kg of a
  // weight-based product) — defaults to "1" for every product until edited.
  const [qtyDrafts, setQtyDrafts] = useState({});
  // Quantity being edited inline on an already-added bill line — keyed by
  // productId, so typing "1.35" doesn't get clobbered by a bill refresh.
  const [lineQtyDrafts, setLineQtyDrafts] = useState({});
  // Bluetooth thermal printer — same shared connection used by the Express
  // admin panel and Store Manager dashboard (and Koyambedu Daily's own
  // Printer tab, underneath). Connecting here before the shift starts means
  // "Complete Sale & Print" goes straight to the printer with no OS dialog,
  // and the POS operator can print their own code-reference sheet too.
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [printingList, setPrintingList] = useState(false);

  useEffect(() => {
    if (!getPOSToken()) { navigate('/express/pos/login'); return; }
    expressPOSApi.get('/me').then(({ data }) => setPosUser(data.posUser)).catch(() => {});
    expressPOSApi.get('/products').then(({ data }) => setProducts(data.products || [])).catch(() => {});
    loadBills();
  }, []);

  const loadBills = () => {
    expressPOSApi.get('/bills').then(({ data }) => {
      const held = (data.bills || []).filter(b => b.status === 'held');
      setBills(held);
      if (!activeBillId && held.length > 0) setActiveBillId(held[0]._id);
    }).catch(() => {});
  };

  const activeBill = bills.find(b => b._id === activeBillId);

  const newBill = async () => {
    if (bills.length >= 4) return toast.error('You already have 4 held bills — complete or void one first');
    try {
      const { data } = await expressPOSApi.post('/bills', {});
      setBills(b => [data.bill, ...b]);
      setActiveBillId(data.bill._id);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to create bill'); }
  };

  const addItem = async (productId, delta = 1) => {
    if (!activeBill) return toast.error('Start a new bill first');
    const existing = activeBill.items.find(i => String(i.product) === String(productId));
    const nextQty = Math.max(0, round3((existing?.quantity || 0) + delta));
    try {
      const { data } = await expressPOSApi.post(`/bills/${activeBill._id}/item`, { productId, quantity: nextQty });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update bill'); }
  };

  // Sets a line's quantity to an exact typed value (e.g. 1.35kg) instead of
  // stepping by whole units — used both when first adding a weight-based
  // product and when correcting its quantity on the bill afterwards.
  const setExactQuantity = async (productId, qty) => {
    if (!activeBill) return toast.error('Start a new bill first');
    if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a quantity greater than 0');
    try {
      const { data } = await expressPOSApi.post(`/bills/${activeBill._id}/item`, { productId, quantity: round3(qty) });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
      setLineQtyDrafts(d => { const n = { ...d }; delete n[productId]; return n; });
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update quantity'); }
  };

  const completeSale = async () => {
    if (!activeBill || activeBill.items.length === 0) return toast.error('Add at least one item');
    try {
      const { data } = await expressPOSApi.patch(`/bills/${activeBill._id}/complete`, { paymentMethod });
      toast.success('Sale completed');
      printReceipt({
        billNo: data.bill.billNo,
        dateStr: new Date(data.bill.completedAt).toLocaleDateString('en-IN'),
        timeLabel: new Date(data.bill.completedAt).toLocaleTimeString('en-IN'),
        storeName: posUser?.store?.name,
        customerName: data.bill.customerName,
        items: data.bill.items,
        total: data.bill.total,
      }).catch(() => toast.error('Sale completed, but the receipt failed to print'));
      setBills(bs => bs.filter(b => b._id !== data.bill._id));
      setActiveBillId(null);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to complete sale'); }
  };

  const voidBill = async () => {
    if (!activeBill) return;
    try {
      await expressPOSApi.patch(`/bills/${activeBill._id}/void`);
      toast('Bill voided');
      setBills(bs => bs.filter(b => b._id !== activeBill._id));
      setActiveBillId(null);
    } catch { toast.error('Failed to void bill'); }
  };

  const logout = () => { clearPOSToken(); navigate('/express/pos/login'); };

  const togglePrinterConnection = async () => {
    if (printerConnected) { disconnectPrinter(); setPrinterConnected(false); return; }
    if (!isBluetoothSupported()) return toast.error('Web Bluetooth is not supported in this browser — use Chrome/Edge on Android, Windows, macOS or ChromeOS.');
    setConnectingPrinter(true);
    try {
      const { name } = await connectPrinter();
      setPrinterConnected(true);
      toast.success(`Connected to ${name}`);
    } catch (err) {
      toast.error(err?.message || 'Failed to connect to printer');
    } finally {
      setConnectingPrinter(false);
    }
  };

  // Uses the products already loaded for the billing grid — no separate
  // endpoint needed, since it's exactly the name/unit/plu/price shape the
  // POS screen itself shows.
  const printCodeList = async () => {
    setPrintingList(true);
    try {
      await printPluList(products, posUser?.store?.name);
    } catch (err) {
      toast.error(err?.message || 'Failed to print code list');
    } finally {
      setPrintingList(false);
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  // Quick-entry by PLU code — vegetables 100-199, fruits 200-299 — so a POS
  // user can just type the 3-digit code instead of hunting through the grid.
  const addByCode = (e) => {
    e.preventDefault();
    const code = Number(codeInput.trim());
    if (!codeInput.trim() || !Number.isInteger(code)) return;
    if (!activeBill) { toast.error('Start a new bill first'); return; }
    const match = products.find(p => p.plu === code);
    if (!match) { toast.error(`No product with code ${code}`); setCodeInput(''); return; }
    if (match.stockQty === 0) { toast.error(`${match.name} is out of stock`); setCodeInput(''); return; }
    addItem(match._id, 1);
    setCodeInput('');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiZap className="text-amber-500" size={18} />
          <div>
            <p className="font-bold text-gray-800 text-sm">{posUser?.store?.name || 'Loading…'}</p>
            <p className="text-xs text-gray-400">{posUser?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={togglePrinterConnection} disabled={connectingPrinter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 ${printerConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <FiBluetooth size={14} /> {connectingPrinter ? 'Connecting…' : printerConnected ? 'Printer Connected' : 'Connect Printer'}
          </button>
          <button onClick={printCodeList} disabled={printingList} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold disabled:opacity-50">
            <FiPrinter size={14} /> {printingList ? 'Printing…' : 'Code List'}
          </button>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><FiLogOut size={16} /></button>
        </div>
      </header>

      {/* Held bills tray */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {bills.map(b => (
          <button key={b._id} onClick={() => setActiveBillId(b._id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${activeBillId === b._id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {b.billNo} · ₹{b.total}
          </button>
        ))}
        <button onClick={newBill} disabled={bills.length >= 4}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed text-xs font-bold text-indigo-600 disabled:opacity-40">
          <FiPlus size={12} /> New Bill ({bills.length}/4)
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-5xl mx-auto w-full">
        {/* Product search */}
        <div>
          <form onSubmit={addByCode} className="flex gap-2 mb-2">
            <input value={codeInput} onChange={e => setCodeInput(e.target.value.replace(/\D/g, '').slice(0, 3))}
              placeholder="Enter code (e.g. 214)" inputMode="numeric"
              className="w-40 border-2 border-indigo-200 rounded-lg px-3 py-2 text-sm font-bold text-center focus:border-indigo-500 focus:outline-none" />
            <button type="submit" className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold">Add</button>
          </form>
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {filteredProducts.map(p => {
              const decimal = isDecimalUnit(p.unit);
              const draft = qtyDrafts[p._id] ?? '1';
              return (
                <div key={p._id} className={`bg-white border rounded-lg p-2 ${(!activeBill || p.stockQty === 0) ? 'opacity-40' : ''}`}>
                  <p className="text-xs font-bold text-gray-800 truncate flex items-center gap-1">
                    {p.name}
                    {p.plu != null && <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 shrink-0">{p.plu}</span>}
                  </p>
                  <p className="text-xs text-gray-400 mb-1.5">₹{p.price}/{p.unit} · Stock {p.stockQty}</p>
                  {decimal ? (
                    <div className="flex items-center gap-1">
                      <input value={draft} inputMode="decimal" placeholder="1"
                        onChange={e => {
                          const v = e.target.value.replace(/[^0-9.]/g, '');
                          setQtyDrafts(d => ({ ...d, [p._id]: v }));
                        }}
                        disabled={!activeBill || p.stockQty === 0}
                        className="w-16 border rounded px-1.5 py-1 text-xs text-center disabled:bg-gray-50" />
                      <span className="text-[10px] text-gray-400">{p.unit}</span>
                      <button
                        onClick={() => {
                          const qty = Number(draft);
                          if (!Number.isFinite(qty) || qty <= 0) return toast.error('Enter a quantity greater than 0');
                          addItem(p._id, qty);
                        }}
                        disabled={!activeBill || p.stockQty === 0}
                        className="ml-auto px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-40">
                        Add
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => addItem(p._id, 1)} disabled={!activeBill || p.stockQty === 0}
                      className="w-full px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-bold disabled:opacity-40">
                      Add 1 {p.unit}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current bill */}
        <div className="bg-white border rounded-xl p-4 flex flex-col">
          {!activeBill ? (
            <p className="text-sm text-gray-400 m-auto">Start a new bill to begin.</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-800">{activeBill.billNo}</p>
                <button onClick={voidBill} className="text-red-500 text-xs font-semibold flex items-center gap-1"><FiTrash2 size={12} /> Void</button>
              </div>
              <div className="flex-1 overflow-y-auto mb-3">
                {activeBill.items.length === 0 && <p className="text-xs text-gray-400">No items yet — tap a product to add.</p>}
                {activeBill.items.map(it => {
                  const pid = String(it.product);
                  const decimal = isDecimalUnit(it.unit);
                  return (
                    <div key={pid} className="flex items-center justify-between py-1.5 border-b">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{it.name}</p>
                        <p className="text-xs text-gray-400">₹{it.price}/{it.unit}</p>
                      </div>
                      {decimal ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <input
                            value={lineQtyDrafts[pid] ?? String(it.quantity)}
                            inputMode="decimal"
                            onChange={e => {
                              const v = e.target.value.replace(/[^0-9.]/g, '');
                              setLineQtyDrafts(d => ({ ...d, [pid]: v }));
                            }}
                            onBlur={() => {
                              const v = lineQtyDrafts[pid];
                              if (v === undefined) return;
                              const qty = Number(v);
                              if (v === '' || !Number.isFinite(qty) || qty <= 0) {
                                setLineQtyDrafts(d => { const n = { ...d }; delete n[pid]; return n; });
                                return;
                              }
                              setExactQuantity(it.product, qty);
                            }}
                            onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                            className="w-16 border rounded px-1.5 py-1 text-sm font-bold text-center" />
                          <span className="text-[10px] text-gray-400">{it.unit}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => addItem(it.product, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><FiMinus size={12} /></button>
                          <span className="text-sm font-bold w-6 text-center">{it.quantity}</span>
                          <button onClick={() => addItem(it.product, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><FiPlus size={12} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between font-bold text-gray-800 mb-3 pt-2 border-t">
                <span>Total</span><span>₹{activeBill.total}</span>
              </div>
              <div className="flex gap-2 mb-3">
                {['cash', 'upi', 'card'].map(m => (
                  <button key={m} onClick={() => setPaymentMethod(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold capitalize ${paymentMethod === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {m}
                  </button>
                ))}
              </div>
              <button onClick={completeSale} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                <FiPrinter size={16} /> Complete Sale & Print
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
