// ============================================
// EPTOMART EXPRESS — POS Billing Terminal
// Held-bills tray (max 5) + current bill editor + product search. Covers
// spec sections 6, 17, 18: create/hold/resume/complete bills, thermal
// receipt printing, every sale billed through the POS.
// ============================================
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FiZap, FiLogOut, FiPlus, FiMinus, FiTrash2, FiPrinter, FiSearch, FiX, FiBluetooth, FiCamera, FiShare2, FiCheckCircle } from 'react-icons/fi';
import expressPOSApi, { getPOSToken, clearPOSToken } from '../../../utils/expressPOSApi';
import {
  printReceipt, printPluList,
  isBluetoothSupported, connectPrinter, disconnectPrinter, isPrinterConnected,
} from '../../../utils/expressThermalPrinter';

const MAX_HELD = 5;

// ── English / Tamil UI ────────────────────────────────────────────
const I18N = {
  en: {
    billing: '🧾 Billing', orders: '📦 Online Orders', activity: "📊 Today's Activity",
    newBill: 'New Bill', checkout: 'Checkout', startBill: 'Start a new bill to begin.', void: 'Void',
    offer: 'Offer %', apply: 'Apply', total: 'Total', noItems: 'No items yet — tap a product to add.',
    search: 'Search products…', code: 'Enter code (e.g. 214)', connectPrinter: 'Connect Printer', printerConnected: 'Printer Connected',
    codeList: 'Code List', scan: 'Scan item', addAnother: '+ Add another item', payMode: 'Payment mode', cash: '💵 Cash', upi: '📱 UPI', card: '💳 Card',
    received: 'Amount received from customer', returnTo: 'Return to customer', shortBy: 'Short by', confirm: 'Confirm Payment & Print', totalToPay: 'Total to pay',
    custName: 'Customer name (optional)', custPhone: 'Customer mobile (optional)', custNote: 'Optional — leave blank for a walk-in customer',
    saleDone: 'Sale completed', returnChange: 'Return change', shareWA: 'Share on WhatsApp', printAgain: 'Print again', done: 'Done',
    camTitle: 'Scan item on the scale', camHint: 'Place the item on the scale so the weight display is visible, then tap Scan.',
    camScan: 'Scan', camScanning: 'Recognising…', camPick: 'Looks similar — pick the right one', camNotFound: 'Could not recognise — search and pick manually',
    camWeight: 'Weight (kg)', camAdd: 'Add to bill', camAdded: 'Added', camClose: 'Close', camNoCamera: 'Camera not available — allow camera permission or use Take photo',
    camPhoto: 'Take photo', camWeightAsk: 'Weight not readable — enter weight', share: 'Share',
  },
  ta: {
    billing: '🧾 பில்லிங்', orders: '📦 ஆன்லைன் ஆர்டர்கள்', activity: '📊 இன்றைய செயல்பாடு',
    newBill: 'புதிய பில்', checkout: 'பணம் செலுத்து', startBill: 'தொடங்க புதிய பில் உருவாக்கவும்.', void: 'ரத்து',
    offer: 'தள்ளுபடி %', apply: 'சேர்', total: 'மொத்தம்', noItems: 'பொருட்கள் இல்லை — சேர்க்க தட்டவும்.',
    search: 'பொருட்களைத் தேடு…', code: 'குறியீடு (எ.கா. 214)', connectPrinter: 'பிரிண்டர் இணை', printerConnected: 'பிரிண்டர் இணைந்தது',
    codeList: 'குறியீட்டு பட்டியல்', scan: 'பொருளை ஸ்கேன்', addAnother: '+ மேலும் ஒரு பொருள் சேர்', payMode: 'பணம் செலுத்தும் முறை', cash: '💵 ரொக்கம்', upi: '📱 UPI', card: '💳 கார்டு',
    received: 'வாடிக்கையாளர் கொடுத்த தொகை', returnTo: 'திருப்பித் தர வேண்டிய தொகை', shortBy: 'குறைவு', confirm: 'பணம் உறுதி & அச்சிடு', totalToPay: 'செலுத்த வேண்டிய தொகை',
    custName: 'வாடிக்கையாளர் பெயர் (விருப்பம்)', custPhone: 'வாடிக்கையாளர் மொபைல் (விருப்பம்)', custNote: 'விருப்பம் — வேண்டாமெனில் காலியாக விடவும்',
    saleDone: 'விற்பனை முடிந்தது', returnChange: 'மீதி தொகை', shareWA: 'வாட்ஸ்அப்பில் பகிர்', printAgain: 'மீண்டும் அச்சிடு', done: 'முடிந்தது',
    camTitle: 'தராசில் உள்ள பொருளை ஸ்கேன் செய்', camHint: 'எடை காட்சி தெரியுமாறு பொருளை தராசில் வைத்து, ஸ்கேன் தட்டவும்.',
    camScan: 'ஸ்கேன்', camScanning: 'அடையாளம் காண்கிறது…', camPick: 'ஒரே மாதிரி தெரிகிறது — சரியானதைத் தேர்வு செய்க', camNotFound: 'அடையாளம் காண இயலவில்லை — தேடி தேர்வு செய்க',
    camWeight: 'எடை (கிலோ)', camAdd: 'பில்லில் சேர்', camAdded: 'சேர்க்கப்பட்டது', camClose: 'மூடு', camNoCamera: 'கேமரா இல்லை — அனுமதி வழங்கவும் அல்லது புகைப்படம் எடுக்கவும்',
    camPhoto: 'புகைப்படம் எடு', camWeightAsk: 'எடை தெளிவாக இல்லை — எடையை உள்ளிடவும்', share: 'பகிர்',
  },
};

// Parse what the cashier types into a quantity in the product's own unit.
//   kg items:   ".250" / "0.25" → 0.25 kg · "500g" / "500 gm" / "500" → 0.5 kg · "1kg" / "1.5" → kg
//   litre items: same idea with ml.   gram items: plain = grams.   piece/bunch/dozen: plain count.
// A bare whole number ≥ 50 is read as grams/ml (so "250" and "500" just work); smaller ones as kg/litres.
function parseQty(text, unit) {
  const m = String(text || '').trim().toLowerCase().replace(/,/g, '.').match(/^(\d*\.?\d+)\s*(kgs?|kilos?|gms?|grams?|g|ml|ltrs?|litres?|l|pcs?|nos?)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]); const suf = m[2] || '';
  if (!Number.isFinite(n) || n <= 0) return null;
  const isG = /^(g|gm|gms|gram|grams)$/.test(suf), isKg = /^(kg|kgs|kilo|kilos)$/.test(suf);
  const isMl = suf === 'ml', isL = /^(l|ltr|ltrs|litre|litres)$/.test(suf);
  const bareBig = !suf && Number.isInteger(n) && n >= 50;
  let q;
  if (unit === 'kg') q = isG || bareBig ? n / 1000 : n;
  else if (unit === 'litre') q = isMl || bareBig ? n / 1000 : n;
  else if (unit === 'gram') q = isKg ? n * 1000 : n;
  else q = n;
  return Math.round(q * 1000) / 1000;
}
const QTY_CHIPS = {
  kg: [['250 g', 0.25], ['500 g', 0.5], ['750 g', 0.75], ['1 kg', 1], ['1.5 kg', 1.5], ['2 kg', 2], ['5 kg', 5]],
  litre: [['250 ml', 0.25], ['500 ml', 0.5], ['1 L', 1], ['2 L', 2]],
  gram: [['100 g', 100], ['250 g', 250], ['500 g', 500]],
  other: [['1', 1], ['2', 2], ['3', 3], ['4', 4], ['5', 5], ['6', 6], ['12', 12]],
};
const qtyStepOf = (unit) => (unit === 'kg' || unit === 'litre' ? 0.25 : unit === 'gram' ? 50 : 1);
const fmtQty = (q, unit) => {
  const n = Number(q) || 0;
  if (unit === 'kg') return n < 1 ? `${Math.round(n * 1000)} g` : `${n} kg`;
  if (unit === 'litre') return n < 1 ? `${Math.round(n * 1000)} ml` : `${n} L`;
  return `${n} ${unit}`;
};

// Plain-text bill for WhatsApp (English + Tamil thank-you)
function buildBillText(b, storeName) {
  const lines = (b.items || []).map((it, i) => `${i + 1}. ${it.name} ${it.quantity}${it.unit ? ' ' + it.unit : ''} × ₹${it.price} = ₹${(it.price * it.quantity).toFixed(2)}`);
  const when = b.completedAt ? new Date(b.completedAt) : new Date();
  return [
    `*Eptomart Express*${storeName ? ' — ' + storeName : ''}`,
    `Bill: ${b.billNo}`,
    `${when.toLocaleDateString('en-IN')} ${when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    '',
    ...lines,
    '',
    b.discountAmount > 0 ? `Discount (${b.discountPercent}%): -₹${b.discountAmount.toFixed(2)}` : null,
    `*Total: ₹${b.total}*`,
    b.paymentMethod ? `Paid by: ${String(b.paymentMethod).toUpperCase()}` : null,
    '',
    'Thank you for shopping with us! / வாங்கியதற்கு நன்றி! 🙏',
  ].filter(l => l !== null).join('\n');
}
function shareBillWhatsApp(b, storeName) {
  const text = encodeURIComponent(buildBillText(b, storeName));
  const ph = String(b.customerPhone || '').replace(/\D/g, '').slice(-10);
  const url = ph.length === 10 ? `https://wa.me/91${ph}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, '_blank');
}

// Downscale a camera frame to keep the upload small (~100–200 KB JPEG)
function frameToJpeg(source, srcW, srcH, maxSide = 900) {
  const scale = Math.min(1, maxSide / Math.max(srcW, srcH));
  const c = document.createElement('canvas');
  c.width = Math.round(srcW * scale); c.height = Math.round(srcH * scale);
  c.getContext('2d').drawImage(source, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.72);
}
const round3 = (n) => Math.round((Number(n) || 0) * 1000) / 1000;
// Weight/volume units allow fractional quantities (1.35kg, 0.5 litre); the
// discrete units (piece/bunch/dozen) don't, so they keep the simple +/-
// stepper. Unit itself always comes from the linked Koyambedu Daily
// product (see expressAdminController — unit defaults to koyambeduProduct.unit
// or 'kg' when a product is first linked into Express), never hardcoded here.
const isDecimalUnit = (unit) => unit === 'kg' || unit === 'gram' || unit === 'litre';

// ── Audio feedback ──────────────────────────────────────────────
// A short beep on every successful add and a lower buzz on every error, the
// way a real POS/barcode-scanner terminal does — lets the cashier keep
// their eyes on the customer/produce instead of the screen while billing.
// Lazily creates one shared AudioContext (browsers require it to start
// inside a user gesture, which every call site here already is — a click
// or a form submit).
let audioCtx = null;
function getAudioCtx() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}
function beep(freq, duration, type = 'sine') {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration / 1000);
  } catch { /* audio is a nice-to-have; never let it break billing */ }
}
const beepSuccess = () => beep(880, 90);
const beepError = () => beep(220, 180, 'square');

export default function ExpressPOSTerminal() {
  const navigate = useNavigate();
  const [posUser, setPosUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [bills, setBills] = useState([]);
  const [activeBillId, setActiveBillId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  // Quantity prompt (opens after a code/product pick) and new-bill customer prompt
  const [qtyPrompt, setQtyPrompt] = useState(null);       // product object
  const [qtyText, setQtyText] = useState('');
  const [stockPrompt, setStockPrompt] = useState(null);
  const [stockQty, setStockQty] = useState('');
  const [stockSaving, setStockSaving] = useState(false);
  const [newBillOpen, setNewBillOpen] = useState(false);
  const [nbName, setNbName] = useState('');
  const [nbPhone, setNbPhone] = useState('');
  const [lang, setLang] = useState(() => { try { return localStorage.getItem('pos_lang') || 'en'; } catch { return 'en'; } });
  const tr = (k) => I18N[lang][k] || I18N.en[k] || k;
  const switchLang = (l) => { setLang(l); try { localStorage.setItem('pos_lang', l); } catch { /* ignore */ } };
  // Name shown for a product: Tamil when the Tamil UI is on and a Tamil name exists
  const pName = (p) => (lang === 'ta' && p?.nameTamil ? p.nameTamil : p?.name);
  const nameById = (id, fallback) => { const p = products.find(x => String(x._id) === String(id)); return p ? pName(p) : fallback; };
  // Optional customer details + the "sale done" panel (WhatsApp share / reprint)
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [lastSale, setLastSale] = useState(null);
  // Camera scan
  const [camOpen, setCamOpen] = useState(false);
  const [camReady, setCamReady] = useState(false);
  const [camBusy, setCamBusy] = useState(false);
  const [camResult, setCamResult] = useState(null);   // { matches, ambiguous, weightKg, count }
  const [camWeight, setCamWeight] = useState('');
  const [camAddedMsg, setCamAddedMsg] = useState(null);
  const [camManual, setCamManual] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);

  // Top-level view: billing counter, the store's online orders, today's activity
  const [view, setView] = useState('billing');
  const [onlineOrders, setOnlineOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [activity, setActivity] = useState(null);
  // Checkout step (review/modify items, add last-minute items, payment mode,
  // cash received → change to return)
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [tendered, setTendered] = useState('');
  const [completing, setCompleting] = useState(false);
  const [coSearch, setCoSearch] = useState('');
  const [coCode, setCoCode] = useState('');
  const [codeInput, setCodeInput] = useState('');
  // Per-tile quantity typed before adding (e.g. "1.35" for 1.35kg of a
  // weight-based product) — defaults to "1" for every product until edited.
  const [qtyDrafts, setQtyDrafts] = useState({});
  // Quantity being edited inline on an already-added bill line — keyed by
  // productId, so typing "1.35" doesn't get clobbered by a bill refresh.
  const [lineQtyDrafts, setLineQtyDrafts] = useState({});
  // Offer/discount %, applied to the whole bill's subtotal — draft text kept
  // separate from the saved value so typing doesn't fire a request per
  // keystroke; only "Apply" commits it.
  const [discountDraft, setDiscountDraft] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  // Bluetooth thermal printer — same shared connection used by the Express
  // admin panel and Store Manager dashboard (and Koyambedu Daily's own
  // Printer tab, underneath). Connecting here before the shift starts means
  // "Complete Sale & Print" goes straight to the printer with no OS dialog,
  // and the POS operator can print their own code-reference sheet too.
  const [printerConnected, setPrinterConnected] = useState(isPrinterConnected());
  const [connectingPrinter, setConnectingPrinter] = useState(false);
  const [printingList, setPrintingList] = useState(false);
  const codeInputRef = useRef(null);
  const refocusCodeInput = () => { codeInputRef.current?.focus(); codeInputRef.current?.select?.(); };

  useEffect(() => {
    if (!getPOSToken()) { navigate('/express/pos/login'); return; }
    expressPOSApi.get('/me').then(({ data }) => setPosUser(data.posUser)).catch(() => {});
    expressPOSApi.get('/products').then(({ data }) => setProducts(data.products || [])).catch(() => {});
    loadBills();
  }, []);

  const loadOrders = () => {
    setOrdersLoading(true);
    expressPOSApi.get('/orders').then(({ data }) => setOnlineOrders(data.orders || [])).catch(() => {}).finally(() => setOrdersLoading(false));
  };
  const loadActivity = () => {
    expressPOSApi.get('/activity').then(({ data }) => setActivity(data)).catch(() => {});
  };
  // Load a tab's data when it's opened; keep the online-orders tab fresh
  useEffect(() => {
    if (view === 'orders') { loadOrders(); const t = setInterval(loadOrders, 30000); return () => clearInterval(t); }
    if (view === 'activity') loadActivity();
  }, [view]); // eslint-disable-line react-hooks/exhaustive-deps
  // Light poll so the Online Orders tab can show a "new" badge while billing
  useEffect(() => {
    const check = () => expressPOSApi.get('/orders').then(({ data }) => setOnlineOrders(data.orders || [])).catch(() => {});
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  const loadBills = () => {
    expressPOSApi.get('/bills').then(({ data }) => {
      const held = (data.bills || []).filter(b => b.status === 'held');
      setBills(held);
      if (!activeBillId && held.length > 0) setActiveBillId(held[0]._id);
    }).catch(() => {});
  };

  const activeBill = bills.find(b => b._id === activeBillId);

  // Keep the discount input in sync with whichever bill is active — e.g.
  // switching from a held bill with a 10% offer to a fresh one with none.
  useEffect(() => {
    setDiscountDraft(activeBill?.discountPercent ? String(activeBill.discountPercent) : '');
  }, [activeBillId]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyDiscount = async () => {
    if (!activeBill) return;
    const pct = discountDraft.trim() === '' ? 0 : Number(discountDraft);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast.error('Enter a discount between 0 and 100');
    setApplyingDiscount(true);
    try {
      const { data } = await expressPOSApi.patch(`/bills/${activeBill._id}/discount`, { discountPercent: pct });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
      toast.success(pct > 0 ? `${pct}% offer applied` : 'Discount cleared');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to apply discount');
    } finally { setApplyingDiscount(false); }
  };

  const newBill = () => {
    if (bills.length >= MAX_HELD) return toast.error(`You already have ${MAX_HELD} held bills — complete or void one first`);
    setNbName(''); setNbPhone('');
    setNewBillOpen(true);               // ask: with customer name/mobile, or walk-in
  };
  const startBill = async (withDetails) => {
    const phone = nbPhone.replace(/\D/g, '');
    if (withDetails && phone && phone.length !== 10) return toast.error('Mobile number must be 10 digits (or leave it blank)');
    try {
      const { data } = await expressPOSApi.post('/bills', withDetails ? { customerName: nbName.trim(), customerPhone: phone } : {});
      setBills(b => [data.bill, ...b]);
      setActiveBillId(data.bill._id);
      setNewBillOpen(false);
      setTimeout(refocusCodeInput, 50);
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to create bill'); }
  };

  const addItem = async (productId, delta = 1) => {
    if (!activeBill) return toast.error('Start a new bill first');
    const existing = activeBill.items.find(i => String(i.product) === String(productId));
    const nextQty = Math.max(0, round3((existing?.quantity || 0) + delta));
    try {
      const { data } = await expressPOSApi.post(`/bills/${activeBill._id}/item`, { productId, quantity: nextQty });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
      beepSuccess();
      refocusCodeInput();
    } catch (err) {
      beepError();
      toast.error(err?.response?.data?.message || 'Failed to update bill');
    }
  };

  // Removes a line item entirely regardless of its current quantity —
  // distinct from the +/- steppers (which only reach 0 one unit at a time)
  // and from clearing the decimal-quantity input (which doesn't submit on
  // its own). Backend already treats quantity<=0 as "remove this line".
  const removeItem = async (productId) => {
    if (!activeBill) return;
    try {
      const { data } = await expressPOSApi.post(`/bills/${activeBill._id}/item`, { productId, quantity: 0 });
      setBills(bs => bs.map(b => b._id === data.bill._id ? data.bill : b));
      setLineQtyDrafts(d => { const n = { ...d }; delete n[productId]; return n; });
      toast('Item removed', { icon: '🗑️' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove item');
    }
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
      beepSuccess();
    } catch (err) {
      beepError();
      toast.error(err?.response?.data?.message || 'Failed to update quantity');
    }
  };

  // ── Camera scan ─────────────────────────────────────────────────────
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null; setCamReady(false);
  };
  const openCamera = async () => {
    let billId = activeBillId;
    if (!activeBill) {                       // start a bill automatically
      if (bills.length >= MAX_HELD) return toast.error(`You already have ${MAX_HELD} held bills`);
      try {
        const { data } = await expressPOSApi.post('/bills', {});
        setBills(b => [data.bill, ...b]); setActiveBillId(data.bill._id); billId = data.bill._id;
      } catch (err) { return toast.error(err?.response?.data?.message || 'Failed to create bill'); }
    }
    setCamResult(null); setCamAddedMsg(null); setCamManual(''); setCamWeight('');
    setCamOpen(true);          // the <video> mounts on this render; the effect below starts the stream
    return billId;
  };
  const closeCamera = () => { stopCamera(); setCamOpen(false); setCamResult(null); };
  useEffect(() => {
    if (!camOpen) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
        setCamReady(true);
      } catch { setCamReady(false); }
    })();
    return () => { cancelled = true; stopCamera(); };
  }, [camOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendFrame = async (dataUrl) => {
    setCamBusy(true); setCamResult(null); setCamAddedMsg(null);
    try {
      const { data } = await expressPOSApi.post('/recognize', { image: dataUrl });
      handleRecognition(data);
    } catch (err) {
      beepError();
      toast.error(err?.response?.data?.message || 'Could not recognise the item');
      setCamResult({ matches: [], ambiguous: false, weightKg: null, count: null });
    } finally { setCamBusy(false); }
  };
  const scanNow = () => {
    const v = videoRef.current;
    if (!v || !v.videoWidth) return fileRef.current?.click();
    sendFrame(frameToJpeg(v, v.videoWidth, v.videoHeight));
  };
  const onPhotoPicked = (e) => {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    const img = new Image();
    img.onload = () => { sendFrame(frameToJpeg(img, img.naturalWidth, img.naturalHeight)); URL.revokeObjectURL(img.src); };
    img.src = URL.createObjectURL(f);
  };

  // Confident single match + readable weight → add automatically.
  // Lookalikes / low confidence → cashier chooses. Unreadable weight → asks for it.
  const handleRecognition = (r) => {
    setCamResult(r);
    setCamWeight(r.weightKg != null ? String(r.weightKg) : '');
    if (!r.ambiguous && r.matches.length === 1) {
      const m = r.matches[0];
      const needsWeight = isDecimalUnit(m.unit);
      if (!needsWeight || r.weightKg != null) addRecognized(m, r.weightKg, r.count);
    } else if (!r.ambiguous && r.matches.length > 1) {
      const m = r.matches[0];
      if (!isDecimalUnit(m.unit) || r.weightKg != null) addRecognized(m, r.weightKg, r.count);
    }
  };
  const addRecognized = async (m, weightKg, count) => {
    const qty = isDecimalUnit(m.unit) ? Number(weightKg) : (count || 1);
    if (!Number.isFinite(qty) || qty <= 0) { toast.error(tr('camWeightAsk')); return; }
    await addItem(m._id, qty);
    setCamAddedMsg(`${tr('camAdded')}: ${pName(m)} — ${qty} ${m.unit}`);
    setCamResult(null); setCamWeight('');
  };

  // ── Quantity prompt ─────────────────────────────────────────────────
  const openQty = (p) => { setQtyPrompt(p); setQtyText(''); };
  const qtyPreview = qtyPrompt ? parseQty(qtyText, qtyPrompt.unit) : null;
  const stepQty = (dir) => {
    if (!qtyPrompt) return;
    const cur = parseQty(qtyText, qtyPrompt.unit) || 0;
    const step = qtyStepOf(qtyPrompt.unit);
    const next = Math.max(0, Math.round((cur + dir * step) * 1000) / 1000);
    setQtyText(next > 0 ? String(next).replace(/^0\./, '.') : '');
  };
  const confirmQty = async (qtyOverride) => {
    const q = qtyOverride ?? qtyPreview;
    if (!qtyPrompt || !q || q <= 0) return toast.error('Enter a quantity');
    const p = qtyPrompt;
    setQtyPrompt(null); setQtyText('');
    await addItem(p._id, q);
  };

  const openCheckout = () => {
    if (!activeBill || activeBill.items.length === 0) return toast.error('Add at least one item');
    setTendered(''); setCoSearch(''); setCoCode('');
    setCustName(activeBill.customerName && activeBill.customerName !== 'Walk-in Customer' ? activeBill.customerName : '');
    setCustPhone(activeBill.customerPhone || '');
    setCheckoutOpen(true);
  };

  const completeSale = async () => {
    if (!activeBill || activeBill.items.length === 0) return toast.error('Add at least one item');
    const total = activeBill.total;
    let amountTendered;
    if (paymentMethod === 'cash') {
      amountTendered = Number(tendered);
      if (tendered === '' || !Number.isFinite(amountTendered)) return toast.error('Enter the amount received from the customer');
      if (amountTendered < total) return toast.error(`Amount received is less than the total (₹${total})`);
    }
    setCompleting(true);
    try {
      const { data } = await expressPOSApi.patch(`/bills/${activeBill._id}/complete`, { paymentMethod, amountTendered, customerName: custName, customerPhone: custPhone });
      const b = data.bill;
      toast.success(paymentMethod === 'cash' && b.changeReturned > 0 ? `Sale completed — return ₹${b.changeReturned}` : 'Sale completed');
      printReceipt({
        billNo: b.billNo,
        dateStr: new Date(b.completedAt).toLocaleDateString('en-IN'),
        timeLabel: new Date(b.completedAt).toLocaleTimeString('en-IN'),
        storeName: posUser?.store?.name,
        customerName: b.customerName,
        items: (b.items || []).map(it => ({ ...it, nameTamil: products.find(x => String(x._id) === String(it.product))?.nameTamil || '' })),
        customerPhone: b.customerPhone, cashier: posUser?.name,
        subtotal: b.subtotal,
        discountPercent: b.discountPercent,
        discountAmount: b.discountAmount,
        roundOff: b.roundOff,
        total: b.total,
        paymentMethod: b.paymentMethod,
        amountTendered: b.amountTendered,
        changeReturned: b.changeReturned,
      }).catch(() => toast.error('Sale completed, but the receipt failed to print'));
      setBills(bs => bs.filter(x => x._id !== b._id));
      setActiveBillId(null);
      setDiscountDraft('');
      setCheckoutOpen(false);
      setLastSale(b);
      setCustName(''); setCustPhone('');
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed to complete sale'); }
    finally { setCompleting(false); }
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

  // Suggestions: digits → codes starting with them; text → English/Tamil name match.
  // Only a handful are shown (no catalogue grid); in-stock items rank first.
  const suggestions = (() => {
    const q = codeInput.trim().toLowerCase();
    if (!q) return [];
    const isCode = /^\d+$/.test(q);
    const hits = products.filter(p => isCode
      ? String(p.plu ?? '').startsWith(q)
      : `${p.name} ${p.nameTamil || ''}`.toLowerCase().includes(q));
    hits.sort((a, b) => (b.stockQty > 0) - (a.stockQty > 0) || (a.plu ?? 9999) - (b.plu ?? 9999) || a.name.localeCompare(b.name));
    return hits.slice(0, 6);
  })();

  const pickSuggestion = (p) => {
    if (!activeBill) { toast.error(tr('startBill')); return; }
    openQty(p);
    setCodeInput('');
  };

  // Enter: exact code → that item; otherwise the only/first suggestion
  const addByCode = (e) => {
    e.preventDefault();
    const q = codeInput.trim();
    if (!q) return;
    if (!activeBill) { toast.error(tr('startBill')); return; }
    const exact = /^\d+$/.test(q) ? products.find(p => String(p.plu) === q) : null;
    const target = exact || suggestions[0];
    if (!target) { beepError(); toast.error(`No product matching "${q}"`); return; }
    if (!(target.stockQty > 0)) { beepError(); openStock(target); return; }
    pickSuggestion(target);
  };

  // ── Add stock from the counter ──────────────────────────────────────
  const openStock = (p) => { setStockPrompt(p); setStockQty(''); };
  const submitStock = async (qtyOverride) => {
    const p = stockPrompt;
    const q = qtyOverride ?? parseQty(stockQty, p.unit);
    if (!q || q <= 0) return toast.error('Enter the quantity received');
    setStockSaving(true);
    try {
      const { data } = await expressPOSApi.post(`/products/${p._id}/add-stock`, { qty: q });
      setProducts(ps => ps.map(x => x._id === p._id ? { ...x, stockQty: data.stockQty } : x));
      toast.success(`${p.name}: +${fmtQty(q, p.unit)} → stock ${data.stockQty}`);
      setStockPrompt(null); setStockQty('');
      // Continue straight into billing this item
      if (activeBill) setQtyPrompt({ ...p, stockQty: data.stockQty });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add stock');
    } finally { setStockSaving(false); }
  };

  // ── New bill: ask for customer details (or skip) ───────────────────
  const renderNewBill = () => (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-black text-gray-800">{tr('newBill')}</p>
          <button onClick={() => setNewBillOpen(false)} className="p-1 rounded-lg hover:bg-gray-100"><FiX size={18} /></button>
        </div>
        <p className="text-xs text-gray-500 mb-3">{lang === 'ta' ? 'வாடிக்கையாளர் பெயர் / மொபைல் பதிவு செய்யவா?' : 'Do you want to enter the customer\'s name / mobile number?'}</p>
        <input value={nbName} onChange={e => setNbName(e.target.value)} placeholder={tr('custName')} autoFocus
          className="w-full border rounded-lg px-3 py-2.5 text-sm mb-2" />
        <input value={nbPhone} onChange={e => setNbPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={tr('custPhone')} inputMode="numeric"
          onKeyDown={e => { if (e.key === 'Enter') startBill(true); }}
          className="w-full border rounded-lg px-3 py-2.5 text-sm mb-3" />
        <button onClick={() => startBill(true)} disabled={!nbName.trim() && !nbPhone}
          className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm mb-2 disabled:opacity-40">
          {lang === 'ta' ? 'விவரங்களுடன் தொடங்கு' : 'Start with these details'}
        </button>
        <button onClick={() => startBill(false)} className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm">
          {lang === 'ta' ? 'பெயர் / மொபைல் இல்லாமல் தொடங்கு' : 'Skip — start without name / mobile'}
        </button>
      </div>
    </div>
  );

  // ── Add stock modal ─────────────────────────────────────────────────
  const renderStock = () => {
    const p = stockPrompt;
    const chips = p.unit === 'kg' || p.unit === 'litre' ? [5, 10, 20, 50] : [10, 25, 50, 100];
    const q = parseQty(stockQty, p.unit);
    return (
      <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-xl">
                {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" /> : '🥬'}
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 truncate">{p.name}</p>
                {p.nameTamil && <p className="text-xs text-gray-500 truncate">{p.nameTamil}</p>}
                <p className="text-xs text-red-600 font-semibold">{lang === 'ta' ? 'தற்போதைய இருப்பு' : 'Current stock'}: {p.stockQty} {p.unit}</p>
              </div>
            </div>
            <button onClick={() => setStockPrompt(null)} className="p-1.5 rounded-lg hover:bg-gray-100"><FiX size={18} /></button>
          </div>
          <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">{lang === 'ta' ? 'வந்த அளவு சேர்' : `Quantity received (${p.unit})`}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {chips.map(c => (
              <button key={c} onClick={() => submitStock(c)} disabled={stockSaving}
                className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold disabled:opacity-50">+{c} {p.unit}</button>
            ))}
          </div>
          <input value={stockQty} onChange={e => setStockQty(e.target.value)} inputMode="decimal" autoFocus
            onKeyDown={e => { if (e.key === 'Enter') submitStock(); }}
            placeholder={p.unit === 'kg' ? 'e.g. 25  ·  500g' : 'Quantity'}
            className="w-full border-2 border-indigo-200 rounded-xl px-3 py-2.5 text-xl font-black text-center focus:border-indigo-500 focus:outline-none mb-1" />
          <p className="text-xs text-center text-gray-500 h-5 mb-2">{q ? `${lang === 'ta' ? 'புதிய இருப்பு' : 'New stock'} = ${Math.round((p.stockQty + q) * 1000) / 1000} ${p.unit}` : ''}</p>
          <button onClick={() => submitStock()} disabled={stockSaving || !q}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm disabled:opacity-40">{stockSaving ? '…' : (lang === 'ta' ? 'இருப்பு சேர்த்து தொடர்' : 'Add stock & continue')}</button>
        </div>
      </div>
    );
  };

  // ── Quantity prompt: quick weights, typed value, +/- stepper ───────
  const renderQty = () => {
    const p = qtyPrompt;
    const chips = QTY_CHIPS[p.unit] || QTY_CHIPS.other;
    const over = qtyPreview != null && p.stockQty != null && qtyPreview > p.stockQty;
    return (
      <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <p className="font-black text-gray-900 text-lg leading-tight">{p.plu != null && <span className="text-indigo-600 mr-1.5">#{p.plu}</span>}{p.name}</p>
              {p.nameTamil && <p className="text-sm text-gray-600">{p.nameTamil}</p>}
              <p className="text-xs text-gray-400 mt-0.5">₹{p.price}/{p.unit} · {lang === 'ta' ? 'இருப்பு' : 'Stock'} {p.stockQty}</p>
            </div>
            <button onClick={() => { setQtyPrompt(null); setQtyText(''); refocusCodeInput(); }} className="p-1.5 rounded-lg hover:bg-gray-100"><FiX size={18} /></button>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {chips.map(([label, q]) => (
              <button key={label} onClick={() => confirmQty(q)}
                className="px-3 py-2 rounded-xl bg-indigo-50 text-indigo-700 text-sm font-bold active:scale-95">{label}</button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => stepQty(-1)} className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center"><FiMinus size={18} /></button>
            <input value={qtyText} onChange={e => setQtyText(e.target.value)} autoFocus inputMode="decimal"
              onKeyDown={e => { if (e.key === 'Enter') confirmQty(); }}
              placeholder={p.unit === 'kg' ? '.250  ·  500g  ·  1kg' : p.unit === 'litre' ? '.5  ·  500ml  ·  1L' : (lang === 'ta' ? 'எண்ணிக்கை' : 'Quantity')}
              className="flex-1 min-w-0 border-2 border-indigo-200 rounded-xl px-3 py-2.5 text-xl font-black text-center focus:border-indigo-500 focus:outline-none" />
            <button onClick={() => stepQty(1)} className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center"><FiPlus size={18} /></button>
          </div>
          <p className={`text-xs text-center h-5 mb-2 ${over ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
            {qtyText && qtyPreview == null ? (lang === 'ta' ? 'சரியான அளவை உள்ளிடவும்' : 'Enter a valid quantity')
              : qtyPreview != null ? `= ${fmtQty(qtyPreview, p.unit)} · ₹${(qtyPreview * p.price).toFixed(2)}${over ? (lang === 'ta' ? ' · இருப்பை விட அதிகம்' : ' · more than stock') : ''}` : ''}
          </p>
          {over && (
            <button onClick={() => { setQtyPrompt(null); openStock(p); }}
              className="w-full mb-2 py-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">+ {lang === 'ta' ? 'இருப்பு சேர்' : 'Add stock'}</button>
          )}
          <button onClick={() => confirmQty()} disabled={!qtyPreview}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm disabled:opacity-40">{tr('camAdd')}</button>
        </div>
      </div>
    );
  };

  // ── Sale done: change to return, WhatsApp share, reprint ──────────
  const reprint = (b) => printReceipt({
    billNo: b.billNo,
    dateStr: new Date(b.completedAt || Date.now()).toLocaleDateString('en-IN'),
    timeLabel: new Date(b.completedAt || Date.now()).toLocaleTimeString('en-IN'),
    storeName: posUser?.store?.name, customerName: b.customerName, customerPhone: b.customerPhone, cashier: posUser?.name,
    items: (b.items || []).map(it => ({ ...it, nameTamil: products.find(x => String(x._id) === String(it.product))?.nameTamil || '' })),
    subtotal: b.subtotal, discountPercent: b.discountPercent, discountAmount: b.discountAmount, roundOff: b.roundOff, total: b.total,
    paymentMethod: b.paymentMethod, amountTendered: b.amountTendered, changeReturned: b.changeReturned,
  }).catch(() => toast.error('Printing failed'));
  const renderSaleDone = () => (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 text-center">
        <FiCheckCircle className="mx-auto text-green-500 mb-1" size={40} />
        <p className="font-black text-lg text-gray-800">{tr('saleDone')}</p>
        <p className="text-xs text-gray-400 mb-3">{lastSale.billNo} · ₹{lastSale.total} · {String(lastSale.paymentMethod).toUpperCase()}</p>
        {lastSale.paymentMethod === 'cash' && lastSale.changeReturned > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
            <p className="text-[11px] font-bold text-green-700 uppercase">{tr('returnChange')}</p>
            <p className="text-3xl font-black text-green-700">₹{lastSale.changeReturned}</p>
          </div>
        )}
        <div className="space-y-2">
          <button onClick={() => shareBillWhatsApp(lastSale, posUser?.store?.name)}
            className="w-full py-3 rounded-xl bg-[#25D366] text-white font-bold text-sm flex items-center justify-center gap-2">
            <FiShare2 size={16} /> {tr('shareWA')}{lastSale.customerPhone ? ` (${lastSale.customerPhone})` : ''}
          </button>
          <button onClick={() => reprint(lastSale)} className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm flex items-center justify-center gap-2"><FiPrinter size={15} /> {tr('printAgain')}</button>
          <button onClick={() => setLastSale(null)} className="w-full py-2.5 rounded-xl border font-bold text-sm text-gray-600">{tr('done')}</button>
        </div>
      </div>
    </div>
  );

  // ── Camera scan modal ─────────────────────────────────────────────
  const renderCamera = () => {
    const manualResults = camManual.trim() ? products.filter(p => `${p.name} ${p.nameTamil || ''}`.toLowerCase().includes(camManual.toLowerCase()) && p.stockQty > 0).slice(0, 5) : [];
    const pickable = camResult && (camResult.ambiguous || camResult.matches.length === 0 || (camResult.matches[0] && isDecimalUnit(camResult.matches[0].unit) && camResult.weightKg == null));
    return (
      <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[95vh] overflow-y-auto">
          <div className="flex items-center justify-between p-3 border-b">
            <p className="font-black text-gray-800 flex items-center gap-2"><FiCamera /> {tr('camTitle')}</p>
            <button onClick={closeCamera} className="p-1.5 rounded-lg hover:bg-gray-100"><FiX size={18} /></button>
          </div>
          <div className="p-3 space-y-3">
            <div className="relative bg-black rounded-xl overflow-hidden aspect-[4/3]">
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
              {!camReady && <div className="absolute inset-0 flex items-center justify-center text-center text-white/80 text-xs p-4">{tr('camNoCamera')}</div>}
              {camBusy && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white font-bold text-sm">{tr('camScanning')}</div>}
            </div>
            <p className="text-[11px] text-gray-500 text-center">{tr('camHint')}</p>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhotoPicked} />
            <div className="flex gap-2">
              <button onClick={scanNow} disabled={camBusy} className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm disabled:opacity-50">{camBusy ? tr('camScanning') : `📸 ${tr('camScan')}`}</button>
              <button onClick={() => fileRef.current?.click()} disabled={camBusy} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs disabled:opacity-50">{tr('camPhoto')}</button>
            </div>

            {camAddedMsg && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm font-bold text-green-700 flex items-center gap-2"><FiCheckCircle /> {camAddedMsg}</div>
            )}

            {camResult && pickable && (
              <div className="border rounded-xl p-3 space-y-2">
                <p className="text-xs font-bold text-amber-700">{camResult.matches.length ? tr('camPick') : tr('camNotFound')}</p>
                {camResult.matches.map(m => (
                  <button key={m._id} onClick={() => addRecognized(m, Number(camWeight) || null, camResult.count)}
                    className="w-full flex items-center justify-between bg-gray-50 hover:bg-indigo-50 border rounded-xl px-3 py-2.5 text-left">
                    <span>
                      <span className="block font-bold text-sm text-gray-800">{m.name}</span>
                      {m.nameTamil && <span className="block text-sm text-gray-600">{m.nameTamil}</span>}
                    </span>
                    <span className="text-xs text-gray-500 shrink-0">₹{m.price}/{m.unit}</span>
                  </button>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500 shrink-0">{tr('camWeight')}</span>
                  <input value={camWeight} onChange={e => setCamWeight(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder="0.000"
                    className="w-28 border-2 rounded-lg px-2 py-1.5 text-sm font-bold text-center" />
                </div>
                <input value={camManual} onChange={e => setCamManual(e.target.value)} placeholder={tr('search')} className="w-full border rounded-lg px-2.5 py-2 text-sm" />
                {manualResults.map(m => (
                  <button key={m._id} onClick={() => addRecognized(m, Number(camWeight) || null, null)}
                    className="w-full flex items-center justify-between bg-white border rounded-lg px-2.5 py-1.5 text-xs text-left">
                    <span className="font-semibold text-gray-800 truncate">{m.name}{m.nameTamil ? ` / ${m.nameTamil}` : ''}</span>
                    <span className="text-gray-500 shrink-0">₹{m.price}/{m.unit}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ── Online orders for this store ──────────────────────────────────
  const STATUS_STYLE = {
    confirmed: 'bg-blue-100 text-blue-700', placed: 'bg-blue-100 text-blue-700', preparing: 'bg-amber-100 text-amber-700',
    out_for_delivery: 'bg-purple-100 text-purple-700', delivered: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-700',
  };
  const renderOrders = () => (
    <div className="p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-700">Online orders for {posUser?.store?.name || 'your store'}</p>
        <button onClick={loadOrders} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">{ordersLoading ? 'Refreshing…' : '↻ Refresh'}</button>
      </div>
      {onlineOrders.length === 0 && <p className="text-sm text-gray-400">No online orders yet.</p>}
      <div className="space-y-3">
        {onlineOrders.map(o => (
          <div key={o._id} className="bg-white border rounded-xl p-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-bold text-sm text-gray-800">{o.orderId}</p>
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[o.orderStatus] || 'bg-gray-100 text-gray-600'}`}>{String(o.orderStatus || '').replace(/_/g, ' ')}</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(o.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              {' · '}{o.buyer?.name || o.deliveryAddress?.name || 'Customer'}
              {(o.deliveryAddress?.phone || o.buyer?.phone) ? ` · 📱 ${o.deliveryAddress?.phone || o.buyer?.phone}` : ''}
            </p>
            {o.deliveryAddress?.addressLine && <p className="text-[11px] text-gray-400 mt-0.5">📍 {o.deliveryAddress.addressLine}{o.deliveryAddress.city ? `, ${o.deliveryAddress.city}` : ''}</p>}
            <div className="mt-2 text-xs text-gray-700 space-y-0.5">
              {(o.items || []).map((it, i) => <div key={i} className="flex justify-between"><span>{it.name} × {it.quantity}{it.unit ? ` ${it.unit}` : ''}</span><span>₹{it.lineTotal ?? (it.unitPrice * it.quantity)}</span></div>)}
            </div>
            <div className="flex justify-between mt-2 pt-2 border-t text-sm font-bold text-gray-800"><span>Total</span><span>₹{o.pricing?.total}</span></div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Today's activity (all counters at this store) ─────────────────
  const renderActivity = () => (
    <div className="p-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-gray-700">Today at {posUser?.store?.name || 'your store'}</p>
        <button onClick={loadActivity} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600">↻ Refresh</button>
      </div>
      {!activity ? <p className="text-sm text-gray-400">Loading…</p> : (<>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          {[['Sales', `₹${activity.totals.sales}`], ['Bills', activity.totals.completed], ['Cash', `₹${activity.totals.cash}`], ['UPI', `₹${activity.totals.upi}`], ['Card', `₹${activity.totals.card}`], ['Held', activity.totals.held], ['Voided', activity.totals.voided]].map(([l, v]) => (
            <div key={l} className="bg-white border rounded-xl p-3 text-center"><p className="text-lg font-black text-gray-800">{v}</p><p className="text-[10px] text-gray-400 font-semibold uppercase">{l}</p></div>
          ))}
        </div>
        <div className="bg-white border rounded-xl divide-y">
          {activity.bills.length === 0 && <p className="p-3 text-sm text-gray-400">No bills yet today.</p>}
          {activity.bills.map(b => (
            <div key={b._id} className="p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800">{b.billNo} <span className={`ml-1 text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full ${b.status === 'completed' ? 'bg-green-100 text-green-700' : b.status === 'held' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{b.status}</span></p>
                <p className="text-[11px] text-gray-400">{new Date(b.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} · {b.posUserName || 'POS'} · {b.items?.length || 0} items{b.paymentMethod ? ` · ${b.paymentMethod.toUpperCase()}` : ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {b.status === 'completed' && <button onClick={() => shareBillWhatsApp(b, posUser?.store?.name)} title={tr('shareWA')} className="p-1.5 rounded-lg bg-green-50 text-green-600"><FiShare2 size={14} /></button>}
                <p className="text-sm font-black text-gray-800">₹{b.total}</p>
              </div>
            </div>
          ))}
        </div>
      </>)}
    </div>
  );

  // ── Checkout: review/modify items, add more, pay, change ──────────
  const renderCheckout = () => {
    const total = activeBill.total;
    const t = Number(tendered);
    const hasT = tendered !== '' && Number.isFinite(t);
    const change = hasT ? Math.round((t - total) * 100) / 100 : 0;
    const short = hasT && t < total;
    const results = coSearch.trim() ? products.filter(p => `${p.name} ${p.nameTamil || ''}`.toLowerCase().includes(coSearch.toLowerCase()) && p.stockQty > 0).slice(0, 6) : [];
    const addCoCode = (e) => {
      e.preventDefault();
      const code = Number(coCode.trim());
      if (!Number.isInteger(code)) return;
      const m = products.find(p => p.plu === code);
      if (!m) { beepError(); toast.error(`No product with code ${code}`); setCoCode(''); return; }
      if (m.stockQty === 0) { beepError(); toast.error(`${m.name} is out of stock`); setCoCode(''); return; }
      openQty(m); setCoCode('');
    };
    const quick = [50, 100, 200, 500, 2000];
    return (
      <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
        <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-black text-gray-800">{tr('checkout')} · {activeBill.billNo}</p>
            <button onClick={() => setCheckoutOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100"><FiX size={18} /></button>
          </div>

          {/* Items — modify quantities / remove */}
          <div className="mb-3">
            {activeBill.items.map(it => {
              const pid = String(it.product);
              const decimal = isDecimalUnit(it.unit);
              return (
                <div key={pid} className="flex items-center justify-between py-1.5 border-b">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{nameById(it.product, it.name)}</p>
                    <p className="text-[11px] text-gray-400">₹{it.price}/{it.unit} · <span className="font-bold text-gray-600">₹{(it.price * it.quantity).toFixed(2)}</span></p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {decimal ? (
                      <>
                        <input value={lineQtyDrafts[pid] ?? String(it.quantity)} inputMode="decimal"
                          onChange={e => setLineQtyDrafts(d => ({ ...d, [pid]: e.target.value.replace(/[^0-9.]/g, '') }))}
                          onBlur={() => {
                            const v = lineQtyDrafts[pid]; if (v === undefined) return;
                            const q = Number(v);
                            if (v === '' || !Number.isFinite(q) || q <= 0) { setLineQtyDrafts(d => { const n = { ...d }; delete n[pid]; return n; }); return; }
                            setExactQuantity(it.product, q);
                          }}
                          onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                          className="w-16 border rounded px-1.5 py-1 text-sm font-bold text-center" />
                        <span className="text-[10px] text-gray-400">{it.unit}</span>
                      </>
                    ) : (
                      <>
                        <button onClick={() => addItem(it.product, -1)} className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center"><FiMinus size={12} /></button>
                        <span className="text-sm font-bold w-6 text-center">{it.quantity}</span>
                        <button onClick={() => addItem(it.product, 1)} className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center"><FiPlus size={12} /></button>
                      </>
                    )}
                    <button onClick={() => removeItem(it.product)} title="Remove" className="w-7 h-7 rounded bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add one more item before paying */}
          <div className="bg-indigo-50/60 rounded-xl p-2.5 mb-3">
            <p className="text-[11px] font-bold text-indigo-700 mb-1.5">{tr('addAnother')}</p>
            <form onSubmit={addCoCode} className="flex gap-2 mb-1.5">
              <input value={coCode} onChange={e => setCoCode(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="Code" inputMode="numeric"
                className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center font-bold" />
              <input value={coSearch} onChange={e => setCoSearch(e.target.value)} placeholder={tr('search')} className="flex-1 border rounded-lg px-2 py-1.5 text-sm" />
              <button type="submit" className="px-3 rounded-lg bg-indigo-600 text-white text-xs font-bold">Add</button>
            </form>
            {results.map(p => (
              <button key={p._id} onClick={() => { openQty(p); setCoSearch(''); }}
                className="w-full flex items-center justify-between text-left bg-white border rounded-lg px-2.5 py-1.5 mb-1 text-xs">
                <span className="font-semibold text-gray-800 truncate">{pName(p)}{p.plu != null ? <span className="ml-1 text-indigo-600">#{p.plu}</span> : null}</span>
                <span className="text-gray-500 shrink-0">₹{p.price}/{p.unit}</span>
              </button>
            ))}
          </div>

          {/* Optional customer details */}
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2">
              <input value={custName} onChange={e => setCustName(e.target.value)} placeholder={tr('custName')} className="border rounded-lg px-2.5 py-2 text-sm" />
              <input value={custPhone} onChange={e => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={tr('custPhone')} inputMode="numeric" className="border rounded-lg px-2.5 py-2 text-sm" />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{tr('custNote')}</p>
          </div>

          {/* Totals */}
          <div className="border-t pt-2 mb-3 text-sm">
            {activeBill.discountAmount > 0 && <div className="flex justify-between text-xs text-green-600"><span>Discount ({activeBill.discountPercent}%)</span><span>−₹{activeBill.discountAmount.toFixed(2)}</span></div>}
            {activeBill.roundOff !== 0 && <div className="flex justify-between text-xs text-gray-500"><span>Round off</span><span>{activeBill.roundOff > 0 ? '+' : '−'}₹{Math.abs(activeBill.roundOff).toFixed(2)}</span></div>}
            <div className="flex justify-between font-black text-lg text-gray-900"><span>{tr('totalToPay')}</span><span>₹{total}</span></div>
          </div>

          {/* Payment mode */}
          <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">{tr('payMode')}</p>
          <div className="flex gap-2 mb-3">
            {[['cash', tr('cash')], ['upi', tr('upi')], ['card', tr('card')]].map(([m, label]) => (
              <button key={m} onClick={() => setPaymentMethod(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold ${paymentMethod === m ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>{label}</button>
            ))}
          </div>

          {/* Cash received → change */}
          {paymentMethod === 'cash' ? (
            <div className="mb-3">
              <p className="text-[11px] font-bold text-gray-500 uppercase mb-1">{tr('received')}</p>
              <input value={tendered} onChange={e => setTendered(e.target.value.replace(/[^0-9.]/g, ''))} inputMode="decimal" placeholder={`₹ ${total}`} autoFocus
                className="w-full border-2 border-indigo-200 rounded-xl px-3 py-2.5 text-xl font-black text-center focus:border-indigo-500 focus:outline-none" />
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <button onClick={() => setTendered(String(total))} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700">Exact ₹{total}</button>
                {quick.filter(q => q >= total).slice(0, 3).map(q => (
                  <button key={q} onClick={() => setTendered(String(q))} className="px-3 py-1.5 rounded-lg bg-gray-100 text-xs font-bold text-gray-700">₹{q}</button>
                ))}
              </div>
              {hasT && (
                <div className={`mt-3 rounded-xl p-3 text-center ${short ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  {short ? (
                    <p className="text-sm font-bold text-red-600">{tr('shortBy')} ₹{Math.round((total - t) * 100) / 100}</p>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold text-green-700 uppercase">{tr('returnTo')}</p>
                      <p className="text-3xl font-black text-green-700">₹{change}</p>
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-3">Collect ₹{total} by {paymentMethod.toUpperCase()}, then confirm.</p>
          )}

          <button onClick={completeSale} disabled={completing || (paymentMethod === 'cash' && (!hasT || short))}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40">
            <FiPrinter size={16} /> {completing ? '…' : tr('confirm')}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiZap className="text-amber-500" size={18} />
          <div>
            <p className="font-bold text-gray-800 text-sm">🏬 {posUser?.store?.name || 'Loading…'}</p>
            <p className="text-xs text-gray-400">{posUser?.name}{posUser?.phone ? ` · 📱 ${posUser.phone}` : ''}{posUser?.store?.city ? ` · ${posUser.store.city}` : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden border text-xs font-bold">
            <button onClick={() => switchLang('en')} className={`px-2 py-1.5 ${lang === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>EN</button>
            <button onClick={() => switchLang('ta')} className={`px-2 py-1.5 ${lang === 'ta' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500'}`}>தமிழ்</button>
          </div>
          <button onClick={togglePrinterConnection} disabled={connectingPrinter}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 ${printerConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <FiBluetooth size={14} /> {connectingPrinter ? '…' : printerConnected ? tr('printerConnected') : tr('connectPrinter')}
          </button>
          <button onClick={printCodeList} disabled={printingList} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold disabled:opacity-50">
            <FiPrinter size={14} /> {printingList ? '…' : tr('codeList')}
          </button>
          <button onClick={logout} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><FiLogOut size={16} /></button>
        </div>
      </header>

      {/* View tabs */}
      <div className="bg-white border-b px-4 flex gap-1">
        {[['billing'], ['orders'], ['activity']].map(([k]) => {
          const pending = k === 'orders' ? onlineOrders.filter(o => ['confirmed', 'placed', 'preparing'].includes(o.orderStatus)).length : 0;
          return (
            <button key={k} onClick={() => setView(k)}
              className={`px-3 py-2 text-xs font-bold border-b-2 ${view === k ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500'}`}>
              {tr(k)}{pending > 0 && <span className="ml-1.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pending}</span>}
            </button>
          );
        })}
      </div>

      {view === 'billing' && (<>
      {/* Held bills tray */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {bills.map(b => (
          <button key={b._id} onClick={() => setActiveBillId(b._id)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold ${activeBillId === b._id ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            {b.billNo} · ₹{b.total}
          </button>
        ))}
        <button onClick={newBill} disabled={bills.length >= MAX_HELD}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed text-xs font-bold text-indigo-600 disabled:opacity-40">
          <FiPlus size={12} /> {tr('newBill')} ({bills.length}/{MAX_HELD})
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 max-w-5xl mx-auto w-full">
        {/* Product search — suggestions only (no full catalogue grid) */}
        <div>
          <form onSubmit={addByCode} className="flex gap-2 mb-2">
            <div className="relative flex-1 min-w-0">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input ref={codeInputRef} value={codeInput} onChange={e => setCodeInput(e.target.value.slice(0, 40))}
                placeholder={lang === 'ta' ? 'குறியீடு அல்லது பெயர் (எ.கா. 214, தக்காளி)' : 'Type code or name (e.g. 214, tomato)'} autoFocus autoComplete="off"
                className="w-full border-2 border-indigo-200 rounded-lg pl-9 pr-3 py-2.5 text-sm font-bold focus:border-indigo-500 focus:outline-none" />
            </div>
            <button type="button" onClick={openCamera} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5 shrink-0"><FiCamera size={15} /> {tr('scan')}</button>
          </form>

          {!activeBill && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">{tr('startBill')}</p>}

          {suggestions.length === 0 ? (
            <p className="text-xs text-gray-400 px-1 py-6 text-center">
              {codeInput.trim()
                ? (lang === 'ta' ? 'பொருந்தும் பொருள் இல்லை' : 'No matching item')
                : (lang === 'ta' ? 'குறியீடு அல்லது பெயரை உள்ளிடவும் — பொருள் படத்துடன் தோன்றும்' : 'Start typing a code or name — matching items appear here with their picture')}
            </p>
          ) : (
            <div className="space-y-2">
              {suggestions.map(p => {
                const out = !(p.stockQty > 0);
                return (
                  <div key={p._id}
                    className={`flex items-center gap-3 bg-white border rounded-xl p-2 ${out ? 'border-red-200' : 'hover:border-indigo-400 active:scale-[0.99] cursor-pointer'}`}
                    onClick={() => { if (!out) pickSuggestion(p); }}>
                    <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center text-2xl">
                      {p.image ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" loading="lazy" /> : '🥬'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {p.plu != null && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 mr-1.5 align-middle">{p.plu}</span>}
                        {p.name}
                      </p>
                      {p.nameTamil && <p className="text-xs text-gray-500 truncate">{p.nameTamil}</p>}
                      <p className="text-xs mt-0.5">
                        <span className="font-bold text-gray-700">₹{p.price}/{p.unit}</span>
                        <span className={`ml-2 font-semibold ${out ? 'text-red-600' : p.stockQty <= 5 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {out ? (lang === 'ta' ? 'இருப்பு இல்லை' : 'Out of stock') : `${lang === 'ta' ? 'இருப்பு' : 'Stock'} ${p.stockQty}`}
                        </span>
                      </p>
                    </div>
                    {out ? (
                      <button onClick={(e) => { e.stopPropagation(); openStock(p); }}
                        className="shrink-0 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs font-bold border border-red-200">+ {lang === 'ta' ? 'இருப்பு சேர்' : 'Add stock'}</button>
                    ) : (
                      <FiPlus className="text-indigo-500 shrink-0" size={20} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Current bill */}
        <div className="bg-white border rounded-xl p-4 flex flex-col">
          {!activeBill ? (
            <p className="text-sm text-gray-400 m-auto">{tr('startBill')}</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="font-bold text-gray-800">{activeBill.billNo}</p>
                <button onClick={voidBill} className="text-red-500 text-xs font-semibold flex items-center gap-1"><FiTrash2 size={12} /> Void</button>
              </div>
              <div className="flex-1 overflow-y-auto mb-3">
                {activeBill.items.length === 0 && <p className="text-xs text-gray-400">{tr('noItems')}</p>}
                {activeBill.items.map(it => {
                  const pid = String(it.product);
                  const decimal = isDecimalUnit(it.unit);
                  return (
                    <div key={pid} className="flex items-center justify-between py-1.5 border-b">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{nameById(it.product, it.name)}</p>
                        <p className="text-xs text-gray-400">₹{it.price}/{it.unit} × {it.quantity} = <span className="font-bold text-gray-600">₹{(it.price * it.quantity).toFixed(2)}</span></p>
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
                          <button onClick={() => removeItem(it.product)} title="Remove item"
                            className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => addItem(it.product, -1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><FiMinus size={12} /></button>
                          <span className="text-sm font-bold w-6 text-center">{it.quantity}</span>
                          <button onClick={() => addItem(it.product, 1)} className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center"><FiPlus size={12} /></button>
                          <button onClick={() => removeItem(it.product)} title="Remove item"
                            className="w-6 h-6 rounded bg-red-50 text-red-500 flex items-center justify-center"><FiTrash2 size={12} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-gray-500 font-semibold shrink-0">{tr('offer')}</span>
                  <input value={discountDraft} inputMode="decimal" placeholder="0"
                    onChange={e => setDiscountDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-16 border rounded px-1.5 py-1 text-sm text-center" />
                  <button onClick={applyDiscount} disabled={applyingDiscount}
                    className="px-2.5 py-1 rounded bg-gray-100 text-gray-700 text-xs font-bold disabled:opacity-50">
                    {applyingDiscount ? 'Applying…' : 'Apply'}
                  </button>
                </div>
                {(activeBill.discountAmount > 0 || activeBill.roundOff !== 0) && (
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Subtotal</span><span>₹{activeBill.subtotal.toFixed(2)}</span>
                  </div>
                )}
                {activeBill.discountAmount > 0 && (
                  <div className="flex justify-between text-xs text-green-600 mb-1">
                    <span>Discount ({activeBill.discountPercent}%)</span><span>−₹{activeBill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {activeBill.roundOff !== 0 && (
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Round Off</span><span>{activeBill.roundOff > 0 ? '+' : '−'}₹{Math.abs(activeBill.roundOff).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Total</span><span>₹{activeBill.total}</span>
                </div>
              </div>
              <button onClick={openCheckout} className="w-full py-3 rounded-xl bg-green-600 text-white font-bold text-sm flex items-center justify-center gap-2">
                {tr('checkout')} · ₹{activeBill.total}
              </button>
            </>
          )}
        </div>
      </div>
      </>)}

      {view === 'orders' && renderOrders()}
      {view === 'activity' && renderActivity()}
      {checkoutOpen && activeBill && renderCheckout()}
      {lastSale && renderSaleDone()}
      {newBillOpen && renderNewBill()}
      {stockPrompt && renderStock()}
      {qtyPrompt && renderQty()}
      {camOpen && renderCamera()}
    </div>
  );
}
