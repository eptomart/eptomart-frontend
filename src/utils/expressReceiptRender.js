// ============================================
// EPTOMART EXPRESS — Premium receipt & code-list renderer
// Draws the whole document on one canvas (58mm = 384 dots wide) and prints it
// as a picture (ESC/POS GS v 0). Drawing instead of using the printer's text
// mode is what gives us: the real ₹ sign, Tamil script, proper alignment,
// bold/inverted headings, and a consistent look on every printer.
// Also reused for the browser print-dialog fallback (image at 58mm).
// ============================================
const W = 384;           // dots (58mm)
const PAD = 8;
const FONT = '"Noto Sans Tamil","Latha","Tamil Sangam MN","Nirmala UI",Arial,Helvetica,sans-serif';
const RS = '₹';

const money = (n) => `${RS}${(Number(n) || 0).toFixed(2)}`;
const qtyStr = (q) => { const n = Number(q) || 0; return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000); };

// Word-wrap `text` to maxW using ctx's current font. Splits very long words.
function wrap(ctx, text, maxW) {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const lines = []; let cur = '';
  const push = () => { if (cur) lines.push(cur); cur = ''; };
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(t).width <= maxW) { cur = t; continue; }
    push();
    if (ctx.measureText(w).width <= maxW) { cur = w; continue; }
    let piece = '';                                     // single over-long word
    for (const ch of Array.from(w)) {
      if (ctx.measureText(piece + ch).width > maxW) { lines.push(piece); piece = ch; } else piece += ch;
    }
    cur = piece;
  }
  push();
  return lines.length ? lines : [''];
}

/** Tiny layout engine: a list of draw ops measured first, then painted on a canvas of exact height. */
class Doc {
  constructor() { this.ops = []; this.y = 6; this.m = document.createElement('canvas').getContext('2d'); }
  font(size, bold = true) { return `${bold ? 'bold ' : ''}${size}px ${FONT}`; }
  gap(h) { this.y += h; }
  text(str, { size = 22, bold = true, align = 'left', x = PAD, maxW = W - PAD * 2, lh = 1.25, color = '#000' } = {}) {
    this.m.font = this.font(size, bold);
    const lines = wrap(this.m, str, maxW);
    lines.forEach((ln) => {
      this.ops.push({ t: 'text', s: ln, size, bold, align, x, y: this.y, lh, color });
      this.y += Math.round(size * lh);
    });
  }
  row(left, right, { size = 22, bold = true, sizeR, boldR } = {}) {
    this.m.font = this.font(sizeR || size, boldR ?? bold);
    const rw = this.m.measureText(right).width;
    this.m.font = this.font(size, bold);
    const lines = wrap(this.m, left, W - PAD * 2 - rw - 10);
    lines.forEach((ln, i) => {
      this.ops.push({ t: 'text', s: ln, size, bold, align: 'left', x: PAD, y: this.y, lh: 1.25, color: '#000' });
      if (i === 0) this.ops.push({ t: 'text', s: right, size: sizeR || size, bold: boldR ?? bold, align: 'right', x: W - PAD, y: this.y, lh: 1.25, color: '#000' });
      this.y += Math.round(Math.max(size, i === 0 ? (sizeR || size) : 0) * 1.25);
    });
  }
  rule(style = 'solid') { this.y += 4; this.ops.push({ t: 'rule', style, y: this.y }); this.y += style === 'double' ? 8 : 5; }
  bar(str, { size = 22 } = {}) {              // inverted heading bar
    const h = Math.round(size * 1.55);
    this.ops.push({ t: 'bar', s: str, size, y: this.y, h });
    this.y += h + 4;
  }
  box(left, right, { size = 28 } = {}) {       // inverted total box
    const h = Math.round(size * 1.7);
    this.ops.push({ t: 'box', l: left, r: right, size, y: this.y, h });
    this.y += h + 6;
  }
  paint() {
    const H = this.y + 18;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'top';
    for (const o of this.ops) {
      if (o.t === 'text') {
        ctx.fillStyle = o.color; ctx.font = this.font(o.size, o.bold); ctx.textAlign = o.align;
        ctx.fillText(o.s, o.x, o.y);
      } else if (o.t === 'rule') {
        ctx.fillStyle = '#000';
        if (o.style === 'double') { ctx.fillRect(PAD, o.y, W - PAD * 2, 2); ctx.fillRect(PAD, o.y + 5, W - PAD * 2, 2); }
        else if (o.style === 'dotted') { for (let x = PAD; x < W - PAD; x += 6) ctx.fillRect(x, o.y, 3, 1.5); }
        else ctx.fillRect(PAD, o.y, W - PAD * 2, 2);
      } else if (o.t === 'bar') {
        ctx.fillStyle = '#000'; ctx.fillRect(PAD, o.y, W - PAD * 2, o.h);
        ctx.fillStyle = '#fff'; ctx.font = this.font(o.size, true); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(o.s, W / 2, o.y + o.h / 2 + 1); ctx.textBaseline = 'top';
      } else if (o.t === 'box') {
        ctx.fillStyle = '#000'; ctx.fillRect(PAD, o.y, W - PAD * 2, o.h);
        ctx.fillStyle = '#fff'; ctx.font = this.font(o.size, true); ctx.textBaseline = 'middle';
        ctx.textAlign = 'left';  ctx.fillText(o.l, PAD + 10, o.y + o.h / 2 + 1);
        ctx.textAlign = 'right'; ctx.fillText(o.r, W - PAD - 10, o.y + o.h / 2 + 1); ctx.textBaseline = 'top';
      }
    }
    return c;
  }
}

// ── Premium bill ─────────────────────────────────────────────
export function renderReceiptCanvas(bill) {
  const d = new Doc();
  d.text('EPTOMART EXPRESS', { size: 30, align: 'center', x: W / 2 });
  d.text('Fresh · Fast · Fair', { size: 17, bold: false, align: 'center', x: W / 2 });
  if (bill.storeName) { d.gap(2); d.text(bill.storeName, { size: 21, align: 'center', x: W / 2 }); }
  d.rule('double');

  if (bill.duplicate) { d.text('*** DUPLICATE COPY ***', { size: 19, align: 'center', x: W / 2 }); d.gap(2); }
  d.row('Bill No', bill.billNo, { size: 20, bold: false, boldR: true });
  d.row('Date', `${bill.dateStr}${bill.timeLabel ? '  ' + bill.timeLabel.replace(/:\d\d(\s|$)/, '$1') : ''}`, { size: 20, bold: false, boldR: true });
  const named = bill.customerName && bill.customerName !== 'Walk-in Customer';
  if (named) d.row('Customer', bill.customerName, { size: 20, bold: false, boldR: true });
  if (bill.customerPhone) d.row('Mobile', bill.customerPhone, { size: 20, bold: false, boldR: true });
  if (bill.cashier) d.row('Served by', bill.cashier, { size: 20, bold: false, boldR: true });
  d.rule('solid');

  d.row('ITEM · QTY × RATE', 'AMOUNT', { size: 16, bold: true });
  d.rule('solid');

  let totalQty = 0;
  (bill.items || []).forEach((it, i) => {
    d.text(`${i + 1}. ${it.name}`, { size: 22, maxW: W - PAD * 2 });
    if (it.nameTamil) d.text(it.nameTamil, { size: 18, bold: false, x: PAD + 18, maxW: W - PAD * 2 - 18 });
    const amt = it.price * it.quantity;
    d.row(`${qtyStr(it.quantity)} ${it.unit || ''} × ${RS}${Number(it.price).toFixed(2)}`, money(amt), { size: 19, bold: false, sizeR: 22, boldR: true });
    totalQty += 1;
    d.rule('dotted');
  });

  d.gap(2);
  const showSub = (bill.discountAmount || 0) > 0 || (bill.roundOff || 0) !== 0;
  if (showSub) d.row('Subtotal', money(bill.subtotal), { size: 21, bold: false, boldR: true });
  if ((bill.discountAmount || 0) > 0) d.row(`Discount (${bill.discountPercent}%)`, `-${money(bill.discountAmount)}`, { size: 21, bold: false, boldR: true });
  if ((bill.roundOff || 0) !== 0) d.row('Round off', `${bill.roundOff > 0 ? '+' : '-'}${money(Math.abs(bill.roundOff))}`, { size: 21, bold: false, boldR: true });
  d.row(`${totalQty} item${totalQty === 1 ? '' : 's'}`, '', { size: 18, bold: false });
  d.box('TOTAL', `${RS}${Number(bill.total).toFixed(2)}`, { size: 30 });

  if (bill.paymentMethod) {
    d.row('Paid by', String(bill.paymentMethod).toUpperCase(), { size: 21, bold: false, boldR: true });
    if (bill.paymentMethod === 'cash' && bill.amountTendered != null) {
      d.row('Cash received', money(bill.amountTendered), { size: 21, bold: false, boldR: true });
      d.row('Change returned', money(bill.changeReturned || 0), { size: 23, bold: true });
    }
  }
  d.rule('double');
  d.text('Thank you for shopping with us!', { size: 21, align: 'center', x: W / 2 });
  d.text('வாங்கியதற்கு நன்றி! மீண்டும் வருக', { size: 20, align: 'center', x: W / 2 });
  d.gap(4);
  d.text('Eptomart Express', { size: 15, bold: false, align: 'center', x: W / 2 });
  return d.paint();
}

// ── Code list (all items, English + Tamil) ───────────────────
const SERIES = (plu) => (plu == null ? 'other' : plu >= 100 && plu <= 199 ? 'veg' : plu >= 200 && plu <= 299 ? 'fruit' : 'other');
const SERIES_TITLE = { veg: 'VEGETABLES · காய்கறிகள்', fruit: 'FRUITS · பழங்கள்', other: 'OTHERS · மற்றவை' };

export function renderPluListCanvas(products, storeName) {
  const d = new Doc();
  d.text('EPTOMART EXPRESS', { size: 28, align: 'center', x: W / 2 });
  d.text('POS CODE LIST · குறியீட்டு பட்டியல்', { size: 18, align: 'center', x: W / 2 });
  if (storeName) d.text(storeName, { size: 20, align: 'center', x: W / 2 });
  d.text(new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }), { size: 16, bold: false, align: 'center', x: W / 2 });
  d.rule('double');

  const sorted = [...products].sort((a, b) => (a.plu ?? 9999) - (b.plu ?? 9999) || String(a.name).localeCompare(String(b.name)));
  const groups = { veg: [], fruit: [], other: [] };
  sorted.forEach(p => groups[SERIES(p.plu)].push(p));

  ['veg', 'fruit', 'other'].forEach(k => {
    const items = groups[k];
    if (!items.length) return;
    d.gap(2);
    d.bar(`${SERIES_TITLE[k]}  (${items.length})`, { size: 18 });
    items.forEach(p => {
      const code = p.plu != null ? String(p.plu) : '—';
      const price = `${RS}${Number(p.price).toFixed(0)}/${p.unit}`;
      // code | name (EN) ........ price
      d.m.font = d.font(26, true);
      const codeW = Math.max(d.m.measureText('000').width, d.m.measureText(code).width) + 10;
      d.ops.push({ t: 'text', s: code, size: 26, bold: true, align: 'left', x: PAD, y: d.y, lh: 1.25, color: '#000' });
      d.ops.push({ t: 'text', s: price, size: 20, bold: true, align: 'right', x: W - PAD, y: d.y + 3, lh: 1.25, color: '#000' });
      d.m.font = d.font(20, true);
      const priceW = d.m.measureText(price).width;
      const nameX = PAD + codeW;
      d.text(p.name, { size: 21, x: nameX, maxW: W - nameX - PAD - priceW - 8, lh: 1.2 });
      if (p.nameTamil) d.text(p.nameTamil, { size: 19, bold: false, x: nameX, maxW: W - nameX - PAD, lh: 1.2 });
      d.gap(2);
      d.rule('dotted');
    });
  });
  d.gap(2);
  d.text(`${sorted.length} items · type the code on the billing screen`, { size: 15, bold: false, align: 'center', x: W / 2 });
  return d.paint();
}

// ── Canvas → ESC/POS raster bytes (strips of ≤ 160 rows, safest for cheap printers) ──
export function canvasToEscPos(canvas, { feed = 4, cut = false } = {}) {
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const bpr = width / 8;
  const parts = [new Uint8Array([0x1b, 0x40, 0x1b, 0x61, 0x01])];   // init + center
  const STRIP = 160;
  for (let y0 = 0; y0 < height; y0 += STRIP) {
    const h = Math.min(STRIP, height - y0);
    const out = new Uint8Array(8 + bpr * h);
    out.set([0x1d, 0x76, 0x30, 0x00, bpr & 0xff, bpr >> 8, h & 0xff, h >> 8], 0);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < width; x++) {
        const i = ((y0 + y) * width + x) * 4;
        const lum = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        if (lum < 150) out[8 + y * bpr + (x >> 3)] |= 0x80 >> (x & 7);
      }
    }
    parts.push(out);
  }
  parts.push(new Uint8Array([0x1b, 0x64, feed]));                   // feed lines
  if (cut) parts.push(new Uint8Array([0x1d, 0x56, 0x42, 0x00]));
  const total = parts.reduce((n, p) => n + p.length, 0);
  const all = new Uint8Array(total); let o = 0;
  parts.forEach(p => { all.set(p, o); o += p.length; });
  return all;
}

// Browser print-dialog fallback: the same picture at 58mm
export function printCanvasViaDialog(canvas) {
  const url = canvas.toDataURL('image/png');
  const win = window.open('', '_blank', 'width=380,height=700');
  if (!win) return;
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    @page { size: 58mm auto; margin: 0; } html,body{margin:0;padding:0;background:#fff}
    img{display:block;width:58mm;image-rendering:crisp-edges}
  </style></head><body><img src="${url}" onload="setTimeout(function(){window.print()},150)"></body></html>`);
  win.document.close();
}
