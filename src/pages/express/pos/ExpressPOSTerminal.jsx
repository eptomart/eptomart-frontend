// ============================================
// EPTOMART EXPRESS — POS Billing Terminal
// Held-bills tray (max 4) + current bill editor + product search. Covers
// spec sections 6, 17, 18: create/hold/resume/complete bills, thermal
// receipt printing, every sale billed through the POS.
// ============================================
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiZap, FiLogOut, FiPlus, FiMinus, FiTrash2, FiPrinter, FiSearch, FiX } from 'react-icons/fi';
import expressPOSApi, { getPOSToken, clearPOSToken } from '../../../utils/expressPOSApi';
import { printReceipt } from '../../../utils/expressThermalPrinter';

export default function ExpressPOSTerminal() {
  const navigate = useNavigate();
  const [posUser, setPosUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState([]);
  const [activeBillId, setActiveBillId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');

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
    const nextQty = Math.max(0, (existing?.quantity || 0) + delta);
    try {
      const { data } = await expressPOSApi.post(`/bills/${activeBill._id}/item`, { productId, quantity: nextQty });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to update bill'); }
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
      });
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

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

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
        <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><FiLogOut size={16} /></button>
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
          <div className="relative mb-3">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
            {filteredProducts.map(p => (
              <button key={p._id} onClick={() => addItem(p._id, 1)} disabled={!activeBill || p.stockQty === 0}
                className="text-left bg-white border rounded-lg p-2 disabled:opacity-40">
                <p className="text-xs font-bold text-gray-800 truncate">{p.name}</p>
                <p className="text-xs text-gray-400">₹{p.price}/{p.unit} · Stock {p.stockQty}</p>
              </button>
            ))}
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
                {activeBill.items.map(it => (
                  <div key={String(it.product)} className="flex items-center justify-between py-1.5 border-b">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{it.name}</p>
                      <p className="text-xs text-gray-400">₹{it.price}/{it.unit}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => addItem(it.product, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><FiMinus size={12} /></button>
                      <span className="text-sm font-bold w-6 text-center">{it.quantity}</span>
                      <button onClick={() => addItem(it.product, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><FiPlus size={12} /></button>
                    </div>
                  </div>
                ))}
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
