// ============================================
// EPTOMART EXPRESS — POS Receipt + PLU List Printing
// Two paths, same as Koyambedu Daily's Printer tab:
//   1. Direct Bluetooth (Web Bluetooth + ESC/POS bytes) — one tap, no OS
//      print dialog. Reuses the SAME shared connection/pairing logic from
//      utils/thermalPrinter.js (one Bluetooth printer pairing per browser
//      session, shared across the whole app) rather than re-implementing
//      GATT/characteristic discovery here. Only the low-level byte
//      primitives and the connect/disconnect/status functions are reused —
//      nothing Koyambedu-specific (order slips, pack labels) is imported,
//      so this stays a standalone Express feature that can't be broken by
//      changes to Koyambedu's own printing flows, and vice versa.
//   2. System print dialog fallback — a 58mm-formatted HTML doc through the
//      browser's normal Print dialog. Works on any device/browser as long
//      as the thermal printer is set up as a system printer.
// printReceipt()/printPluList() automatically use Bluetooth when a printer
// is already connected (see connectPrinter export below) and fall back to
// the dialog otherwise — callers don't need to branch on this themselves.
// ============================================
import {
  isBluetoothSupported, connectPrinter, disconnectPrinter, isPrinterConnected,
  printRawBytes, bytesInit, bytesBoldOn, bytesBoldOff, bytesAlignLeft,
  bytesAlignCenter, bytesDoubleOn, bytesDoubleOff, bytesFeed, bytesText,
  concatBytes, LINE_WIDTH,
} from './thermalPrinter';

const fmtRs = (n) => `Rs.${(Number(n) || 0).toFixed(2)}`;

/**
 * @param {object} bill - { billNo, dateStr, timeLabel, storeName, customerName, items: [{name, unit, price, quantity}], total }
 */
function buildReceiptHtml(bill) {
  const rows = bill.items.map((it, i) => `
    <div style="padding:3px 0;border-bottom:1px dashed #ccc;font-size:12px;line-height:1.4;word-break:break-word">
      <span>${i + 1}. ${it.name} — ${it.quantity}${it.unit ? ' ' + it.unit : ''} @${fmtRs(it.price)} = ${fmtRs(it.price * it.quantity)}</span>
    </div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: 58mm auto; margin: 2mm; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 54mm; margin: 0; }
  .center { text-align: center; }
  hr { border: none; border-top: 1px dashed #000; }
</style></head><body>
  <div class="center"><strong style="font-size:16px">EPTOMART EXPRESS</strong><br>${bill.storeName || ''}</div>
  <hr>
  <div>Bill No: ${bill.billNo}</div>
  <div>Date: ${bill.dateStr}${bill.timeLabel ? ' ' + bill.timeLabel : ''}</div>
  <div><strong>Customer: ${bill.customerName}</strong></div>
  <hr>
  ${rows}
  <hr>
  <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin:4px 0">
    <span>TOTAL</span><span>${fmtRs(bill.total)}</span>
  </div>
  <hr>
  <div class="center" style="margin-top:8px">Thank you for shopping with us!</div>
</body></html>`;
}

/** Raw ESC/POS bytes for the same receipt content, for the Bluetooth path. */
function buildReceiptEscPos(bill) {
  const chunks = [bytesInit(), bytesAlignCenter(), bytesDoubleOn(), bytesBoldOn()];
  chunks.push(bytesText('EPTOMART EXPRESS\n'));
  chunks.push(bytesDoubleOff(), bytesBoldOff());
  if (bill.storeName) chunks.push(bytesText(`${bill.storeName}\n`));
  chunks.push(bytesAlignLeft());
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  chunks.push(bytesText(`Bill No: ${bill.billNo}\n`));
  chunks.push(bytesText(`Date: ${bill.dateStr}${bill.timeLabel ? ' ' + bill.timeLabel : ''}\n`));
  chunks.push(bytesBoldOn());
  chunks.push(bytesText(`Customer: ${bill.customerName}\n`));
  chunks.push(bytesBoldOff());
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  bill.items.forEach((it, i) => {
    chunks.push(bytesText(`${i + 1}. ${it.name} - ${it.quantity}${it.unit ? ' ' + it.unit : ''} @${fmtRs(it.price)} = ${fmtRs(it.price * it.quantity)}\n`));
  });
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  chunks.push(bytesBoldOn());
  chunks.push(bytesText(`TOTAL: ${fmtRs(bill.total)}\n`));
  chunks.push(bytesBoldOff());
  chunks.push(bytesAlignCenter());
  chunks.push(bytesText('Thank you for shopping with us!\n'));
  chunks.push(bytesAlignLeft());
  chunks.push(bytesFeed(4));
  return concatBytes(chunks);
}

function printReceiptViaDialog(bill) {
  const html = buildReceiptHtml(bill);
  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}

/** Prints via Bluetooth if a printer is already connected, else the system print dialog. */
async function printReceipt(bill) {
  if (isPrinterConnected()) {
    await printRawBytes(buildReceiptEscPos(bill));
  } else {
    printReceiptViaDialog(bill);
  }
}

// ══════════════════════════════════════════════════════════════
// PLU REFERENCE LIST — a printable "cheat sheet" of every product assigned
// to a store, grouped by code series (100s vegetables / 200s fruits /
// uncoded), so the POS operator can glance at a paper copy while typing
// codes into the billing screen instead of having to search on-screen.
// Admin (any store) and Store Manager (their own store) can both print
// this — see the "Connect Printer" + "Print PLU List" controls added to
// ExpressAdmin.jsx's Store Inventory tab and the Manager dashboard.
// @param {Array} products - [{ name, unit, plu, price }]
// ══════════════════════════════════════════════════════════════
const SERIES_LABEL = (plu) => {
  if (plu == null) return 'Other';
  if (plu >= 100 && plu <= 199) return 'Vegetables (100s)';
  if (plu >= 200 && plu <= 299) return 'Fruits (200s)';
  return 'Other';
};

function groupForPluList(products) {
  const groups = { 'Vegetables (100s)': [], 'Fruits (200s)': [], Other: [] };
  [...products]
    .sort((a, b) => (a.plu ?? 9999) - (b.plu ?? 9999) || a.name.localeCompare(b.name))
    .forEach(p => groups[SERIES_LABEL(p.plu)].push(p));
  return groups;
}

function buildPluListEscPos(products, storeName) {
  const groups = groupForPluList(products);
  const chunks = [bytesInit(), bytesAlignCenter(), bytesDoubleOn(), bytesBoldOn()];
  chunks.push(bytesText('EPTOMART EXPRESS\n'));
  chunks.push(bytesDoubleOff());
  chunks.push(bytesText('POS CODE REFERENCE\n'));
  chunks.push(bytesBoldOff());
  if (storeName) chunks.push(bytesText(`${storeName}\n`));
  chunks.push(bytesText(`${new Date().toLocaleDateString('en-IN')}\n`));
  chunks.push(bytesAlignLeft());
  Object.entries(groups).forEach(([label, items]) => {
    if (items.length === 0) return;
    chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
    chunks.push(bytesBoldOn());
    chunks.push(bytesText(`${label}\n`));
    chunks.push(bytesBoldOff());
    items.forEach(p => {
      const code = p.plu != null ? String(p.plu) : '---';
      chunks.push(bytesText(`${code}  ${p.name} - ${fmtRs(p.price)}/${p.unit}\n`));
    });
  });
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  chunks.push(bytesFeed(4));
  return concatBytes(chunks);
}

function buildPluListHtml(products, storeName) {
  const groups = groupForPluList(products);
  const sections = Object.entries(groups).filter(([, items]) => items.length > 0).map(([label, items]) => `
    <div style="margin-top:6px;font-weight:bold;border-top:1px dashed #000;padding-top:4px">${label}</div>
    ${items.map(p => `
      <div style="display:flex;justify-content:space-between;font-size:12px;padding:1px 0">
        <span><b>${p.plu != null ? p.plu : '---'}</b> ${p.name}</span>
        <span>${fmtRs(p.price)}/${p.unit}</span>
      </div>`).join('')}
  `).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: 58mm auto; margin: 2mm; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 54mm; margin: 0; }
  .center { text-align: center; }
</style></head><body>
  <div class="center"><strong style="font-size:15px">EPTOMART EXPRESS</strong><br>POS CODE REFERENCE<br>${storeName || ''}<br>${new Date().toLocaleDateString('en-IN')}</div>
  ${sections}
</body></html>`;
}

/** Prints the PLU reference list via Bluetooth if connected, else the system print dialog. */
async function printPluList(products, storeName) {
  if (isPrinterConnected()) {
    await printRawBytes(buildPluListEscPos(products, storeName));
    return;
  }
  const html = buildPluListHtml(products, storeName);
  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}

export {
  printReceipt,
  printPluList,
  // Re-exported connection management so Express admin/manager screens can
  // offer "Connect Printer" without importing two different util modules.
  isBluetoothSupported, connectPrinter, disconnectPrinter, isPrinterConnected,
};
