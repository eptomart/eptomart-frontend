// ============================================
// THERMAL PRINTER UTILITY — Koyambedu Daily admin "Printer" tab
// ============================================
// New, standalone module. Not imported anywhere except the new PrinterTab —
// touching nothing else in the app.
//
// Two independent ways to get a packing slip onto paper:
//   1. Direct Bluetooth (Web Bluetooth + hand-rolled ESC/POS bytes) — one
//      tap, no OS print dialog, but only works in Chrome/Edge on Android,
//      Windows, macOS, ChromeOS, Linux. NOT supported in Safari/iOS at all
//      (Apple has never implemented Web Bluetooth in WebKit) — that's a
//      platform limitation, not a bug here.
//   2. System print dialog fallback — formats the same content as a 58mm-
//      wide HTML slip and sends it through the browser's normal Print
//      dialog. Works everywhere (any device/browser), as long as the
//      thermal printer is set up as a system printer (its usual USB/
//      Bluetooth driver, one-time setup on that device).
//
// Whether the direct-Bluetooth path actually pairs with a given printer
// depends on the printer speaking Bluetooth LOW ENERGY (BLE/GATT) rather
// than classic Bluetooth SPP — Web Bluetooth can only talk to BLE devices.
// Cheap "mini portable" printers sold with their own phone app (like the
// Seznik line) sometimes use classic SPP, which no website can reach; if
// that's the case here, path 2 above always still works as a safety net.

// ── ESC/POS byte-level primitives ─────────────────────────────
const ESC = 0x1b, GS = 0x1d, LF = 0x0a;

const encoder = new TextEncoder(); // UTF-8 — most modern thermal-printer
// firmware (including generic Chinese ESC/POS clones) accepts UTF-8 fine for
// plain ASCII text; non-ASCII characters (e.g. ₹) are replaced before
// encoding since older firmware/codepages can mangle them (see asciiSafe()).

const asciiSafe = (s = '') => String(s).replace(/₹/g, 'Rs.').replace(/[^\x00-\x7F]/g, '');

const bytesInit        = () => new Uint8Array([ESC, 0x40]); // ESC @ — initialize printer
const bytesBoldOn       = () => new Uint8Array([ESC, 0x45, 1]);
const bytesBoldOff      = () => new Uint8Array([ESC, 0x45, 0]);
const bytesAlignLeft    = () => new Uint8Array([ESC, 0x61, 0]);
const bytesAlignCenter  = () => new Uint8Array([ESC, 0x61, 1]);
const bytesDoubleOn     = () => new Uint8Array([GS, 0x21, 0x11]);  // double width+height
const bytesDoubleOff    = () => new Uint8Array([GS, 0x21, 0x00]);
const bytesFeed         = (lines = 1) => new Uint8Array(Array(lines).fill(LF));
const bytesText         = (s) => encoder.encode(asciiSafe(s));

const concatBytes = (chunks) => {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) { out.set(c, offset); offset += c.length; }
  return out;
};

const LINE_WIDTH = 32; // characters per line on a 58mm printer (approx, Font A)

/**
 * Build one exactly-LINE_WIDTH-character item line: "1. Tomato ....... 3 kg".
 * The previous version measured the name/qty against LINE_WIDTH but then
 * printed it with a separate "1. " / "12. " prefix tacked on afterwards —
 * once the prefix was included the real line length went past the
 * printer's physical character width, so the terminal wrapped mid-line and
 * the unit (e.g. "kg") landed on its own line instead of staying aligned
 * next to the quantity. Folding the prefix into the same width budget here
 * fixes that for any item, including double-digit numbering (10., 11.…).
 */
const itemLine = (index, name, qtyUnit) => {
  const prefix = `${index + 1}. `;
  const maxNameLen = Math.max(3, LINE_WIDTH - prefix.length - qtyUnit.length - 1);
  const truncated = String(name).length > maxNameLen
    ? String(name).slice(0, maxNameLen - 1) + '.'
    : String(name);
  const dots = '.'.repeat(Math.max(1, LINE_WIDTH - prefix.length - truncated.length - qtyUnit.length));
  return `${prefix}${truncated}${dots}${qtyUnit}`;
};

// Per-item checklist row — plain ASCII brackets, not unicode checkbox
// glyphs, so it renders correctly on every printer regardless of codepage
// (unicode ☐ often prints as "?" on cheap ESC/POS firmware).
const ITEM_CHECKBOX_ROW = '   [ ] Packed   [ ] Delivered';

/**
 * Build the raw ESC/POS byte stream for one order's packing slip.
 * @param {object} order - { orderId, placedAt, customerName, customerPhone, customerArea, customerAddress, deliverySlot, items }
 * @param {object} [opts] - { itemsOnly: array of item names to restrict to (pack label mode) }
 */
function buildEscPosSlip(order, opts = {}) {
  const items = opts.itemsOnly
    ? order.items.filter(it => opts.itemsOnly.includes(it.name))
    : order.items;
  const isLabel = !!opts.itemsOnly;

  const chunks = [bytesInit(), bytesAlignCenter(), bytesDoubleOn(), bytesBoldOn()];
  chunks.push(bytesText('EPTOMART\n'));
  chunks.push(bytesDoubleOff());
  chunks.push(bytesText(isLabel ? 'PACK LABEL\n' : 'PACKING SLIP\n'));
  chunks.push(bytesBoldOff(), bytesAlignLeft());
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  chunks.push(bytesText(`Order: ${order.orderId}\n`));
  // order.timeLabel is optional and only ever set by the Custom Print panel
  // (a manually-entered date/time isn't a full timestamp worth trusting for
  // display precision the way a real order's placedAt is) — real orders
  // never set it, so their printed slips are completely unchanged.
  chunks.push(bytesText(`Date: ${new Date(order.placedAt).toLocaleDateString('en-IN')}${order.timeLabel ? ' ' + order.timeLabel : ''}\n`));
  if (order.deliverySlot) chunks.push(bytesText(`Slot: ${order.deliverySlot}\n`));
  chunks.push(bytesBoldOn());
  chunks.push(bytesText(`Customer: ${order.customerName}\n`));
  chunks.push(bytesBoldOff());
  if (order.customerPhone) chunks.push(bytesText(`Phone: ${order.customerPhone}\n`));
  // Full slip (stays with the order): print the full delivery address.
  // Pack label (may be handled loosely, stuck on a single pack): print just
  // the area/locality, not the full private street address.
  if (!isLabel && order.customerAddress) {
    chunks.push(bytesText(`Address: ${order.customerAddress}\n`)); // printer auto-wraps long lines
  } else if (isLabel && order.customerArea) {
    chunks.push(bytesText(`Location: ${order.customerArea}\n`));
  }
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));

  if (isLabel) {
    chunks.push(bytesText(`Items in this pack (${items.length}):\n\n`));
  }

  items.forEach((it, i) => {
    const qtyUnit = `${it.qty}${it.unit ? ' ' + it.unit : ''}`;
    chunks.push(bytesText(`${itemLine(i, it.name, qtyUnit)}\n`));
    if (it.gradeName) chunks.push(bytesText(`   Grade: ${it.gradeName}\n`));
    // Packed/Delivered checkboxes per item (not just once at the end) — the
    // packer ticks each item off individually while packing, and again when
    // it's checked out for delivery, rather than one checkbox covering the
    // whole order. Pack labels (isLabel) skip these — they're stuck on a
    // pack for identification, not used as a packing checklist.
    if (!isLabel) chunks.push(bytesText(`${ITEM_CHECKBOX_ROW}\n`));
    chunks.push(bytesText('\n'));
  });

  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  chunks.push(bytesFeed(4)); // leave room to tear the paper by hand (no auto-cutter assumed)
  return concatBytes(chunks);
}

// ── Web Bluetooth connection ──────────────────────────────────
// Best-effort: cheap ESC/POS-over-BLE printers use several different vendor
// service/characteristic UUIDs depending on the internal Bluetooth module.
// We list the common ones as optionalServices and pick whichever writable
// characteristic the paired device actually exposes.
const CANDIDATE_SERVICE_UUIDS = [
  '000018f0-0000-1000-8000-00805f9b34fb', // common generic printer service
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip RN4870/BM70-based modules (common in clone printers)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10-style BLE serial module
  '0000ff00-0000-1000-8000-00805f9b34fb', // another common clone-printer service
];

let connectedDevice = null;
let writeCharacteristic = null;

function isBluetoothSupported() {
  return typeof navigator !== 'undefined' && !!navigator.bluetooth;
}

/**
 * Opens the browser's Bluetooth device picker and connects to whichever
 * writable GATT characteristic it can find. Throws if unsupported, if the
 * user cancels the picker, or if no writable characteristic is found (most
 * likely meaning the printer only speaks classic Bluetooth SPP, which Web
 * Bluetooth cannot reach — use the print-dialog fallback in that case).
 */
async function connectPrinter() {
  if (!isBluetoothSupported()) {
    throw new Error('Web Bluetooth is not supported in this browser. Use the "Print via System Dialog" option instead.');
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: CANDIDATE_SERVICE_UUIDS,
  });

  const server = await device.gatt.connect();
  let found = null;
  for (const uuid of CANDIDATE_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(uuid);
      const characteristics = await service.getCharacteristics();
      found = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse) || null;
      if (found) break;
    } catch { /* this service isn't present on this device — try the next one */ }
  }

  if (!found) {
    device.gatt.disconnect();
    throw new Error('Connected, but no printable Bluetooth service was found on this device. It may use classic Bluetooth (not supported by browsers) — use "Print via System Dialog" instead.');
  }

  connectedDevice = device;
  writeCharacteristic = found;
  device.addEventListener('gattserverdisconnected', () => {
    connectedDevice = null;
    writeCharacteristic = null;
  });

  return { name: device.name || 'Thermal Printer' };
}

function disconnectPrinter() {
  if (connectedDevice?.gatt?.connected) connectedDevice.gatt.disconnect();
  connectedDevice = null;
  writeCharacteristic = null;
}

function isPrinterConnected() {
  return !!(connectedDevice?.gatt?.connected && writeCharacteristic);
}

/** Writes bytes in small chunks — most BLE printers reject large single writes. */
async function writeBytesChunked(bytes, chunkSize = 100) {
  if (!isPrinterConnected()) throw new Error('Printer not connected');
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    if (writeCharacteristic.properties.writeWithoutResponse) {
      await writeCharacteristic.writeValueWithoutResponse(chunk);
    } else {
      await writeCharacteristic.writeValue(chunk);
    }
    await new Promise(r => setTimeout(r, 20)); // let the printer's small buffer drain
  }
}

/** Print a full order slip or (if itemsOnly is given) a pack label over Bluetooth. */
async function printViaBluetooth(order, opts = {}) {
  const bytes = buildEscPosSlip(order, opts);
  await writeBytesChunked(bytes);
}

// ── System print-dialog fallback (works on any device/browser) ─
function buildPrintHtml(order, opts = {}) {
  const items = opts.itemsOnly
    ? order.items.filter(it => opts.itemsOnly.includes(it.name))
    : order.items;
  const isLabel = !!opts.itemsOnly;

  // flex-shrink:0 + white-space:nowrap on the qty column keeps quantity+unit
  // on the same line as the name (never wraps to its own line); the name
  // column truncates with an ellipsis instead of wrapping and pushing the
  // qty/unit out of alignment on the narrow receipt width.
  const rows = items.map((it, i) => `
    <div style="padding:2px 0;border-bottom:1px dashed #ccc">
      <div style="display:flex;justify-content:space-between;font-size:12px">
        <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:6px">${i + 1}. ${it.name}${it.gradeName ? ` (${it.gradeName})` : ''}</span>
        <span style="flex-shrink:0;white-space:nowrap">${it.qty}${it.unit ? ' ' + it.unit : ''}</span>
      </div>
      ${!isLabel ? '<div style="font-size:11px;margin:3px 0 1px 8px">[&nbsp;&nbsp;] Packed&nbsp;&nbsp;&nbsp;[&nbsp;&nbsp;] Delivered</div>' : ''}
    </div>`).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: 58mm auto; margin: 2mm; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 54mm; margin: 0; }
  .center { text-align: center; }
  hr { border: none; border-top: 1px dashed #000; }
</style></head><body>
  <div class="center"><strong style="font-size:16px">EPTOMART</strong><br>${isLabel ? 'PACK LABEL' : 'PACKING SLIP'}</div>
  <hr>
  <div>Order: ${order.orderId}</div>
  <div>Date: ${new Date(order.placedAt).toLocaleDateString('en-IN')}${order.timeLabel ? ' ' + order.timeLabel : ''}</div>
  ${order.deliverySlot ? `<div>Slot: ${order.deliverySlot}</div>` : ''}
  <div><strong>Customer: ${order.customerName}</strong></div>
  ${order.customerPhone ? `<div>Phone: ${order.customerPhone}</div>` : ''}
  ${!isLabel && order.customerAddress ? `<div>Address: ${order.customerAddress}</div>` : ''}
  ${isLabel && order.customerArea ? `<div>Location: ${order.customerArea}</div>` : ''}
  <hr>
  ${isLabel ? `<div>Items in this pack (${items.length}):</div><br>` : ''}
  ${rows}
  <hr>
</body></html>`;
}

/**
 * Sends HTML through the browser's normal Print dialog using a hidden
 * iframe (never navigates away from the admin page). Shared by the regular
 * order slip printing and the Custom Print bill below.
 */
function printHtmlViaDialog(html) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);
  iframe.contentDocument.open();
  iframe.contentDocument.write(html);
  iframe.contentDocument.close();
  iframe.onload = () => {
    iframe.contentWindow.focus();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
}

/**
 * Prints via the browser's normal Print dialog. Works on any device/browser
 * as long as the thermal printer is available as a system printer.
 */
function printViaDialog(order, opts = {}) {
  printHtmlViaDialog(buildPrintHtml(order, opts));
}

// ══════════════════════════════════════════════════════════════
// CUSTOM PRINT BILL — separate, standalone print format used only by the
// Custom Print panel (a walk-in/manual sale that isn't a real order). Shows
// price + quantity + line total + grand total + a thank-you note —
// deliberately doesn't say "custom" anywhere on the printed bill, so it
// reads like a normal receipt. Completely separate from
// buildEscPosSlip/buildPrintHtml above — printing a real order's packing
// slip or pack label is entirely untouched by any of this.
// (No rotating quote — dropped per feedback; every item's unit price and
// line total are printed directly under its name/qty, and the grand total
// sits right after, all on the same single-page receipt.)
// ══════════════════════════════════════════════════════════════

const fmtRs = (n) => `Rs.${(Math.round(Number(n) * 100) / 100).toFixed(2)}`;

/**
 * Word-wraps a long item name across as many lines as needed (never
 * truncates/cuts a word with "…") and puts the qty on the same line as the
 * last name-line if it fits, otherwise on its own right-aligned line. Used
 * only by the Custom Print bill — real order slips keep using itemLine()
 * (fixed single-line-with-truncation), which is untouched.
 */
const wrapItemLines = (index, name, qtyUnit) => {
  const prefix = `${index + 1}. `;
  const indent = ' '.repeat(prefix.length);
  const words = String(name).split(/\s+/).filter(Boolean);

  const lines = [];
  let current = prefix;
  for (const word of words) {
    const isFirstWordOnLine = current === prefix || current === indent;
    let candidate = isFirstWordOnLine ? current + word : `${current} ${word}`;
    if (candidate.length > LINE_WIDTH && word.length > LINE_WIDTH - indent.length) {
      // Single word longer than the whole line width — hard-break by chars.
      if (!isFirstWordOnLine) lines.push(current);
      let rest = word;
      while (rest.length > LINE_WIDTH - indent.length) {
        lines.push(indent + rest.slice(0, LINE_WIDTH - indent.length));
        rest = rest.slice(LINE_WIDTH - indent.length);
      }
      current = indent + rest;
      continue;
    }
    if (candidate.length > LINE_WIDTH) {
      lines.push(current);
      current = indent + word;
    } else {
      current = candidate;
    }
  }
  lines.push(current);

  const lastLine = lines[lines.length - 1];
  if (lastLine.length + 1 + qtyUnit.length <= LINE_WIDTH) {
    lines[lines.length - 1] = lastLine + ' '.repeat(LINE_WIDTH - lastLine.length - qtyUnit.length) + qtyUnit;
  } else {
    lines.push(' '.repeat(Math.max(0, LINE_WIDTH - qtyUnit.length)) + qtyUnit);
  }
  return lines;
};

/**
 * Word-wraps a plain "Label: value" line so a long value (e.g. a full
 * address like "Valasaravakkam, Chennai") never gets cut mid-word by the
 * printer's own hardware auto-wrap — continuation lines are indented under
 * the value so the label still reads cleanly.
 */
const wrapLabeled = (label, value, width = LINE_WIDTH) => {
  const prefix = label ? `${label}: ` : '';
  const indent = ' '.repeat(prefix.length);
  const words = String(value).split(/\s+/).filter(Boolean);

  const lines = [];
  let current = prefix;
  for (const word of words) {
    const isEmpty = current === prefix || current === indent;
    let candidate = isEmpty ? current + word : `${current} ${word}`;
    if (candidate.length > width) {
      if (!isEmpty) lines.push(current);
      let rest = word;
      while (rest.length > width - indent.length) {
        lines.push(indent + rest.slice(0, width - indent.length));
        rest = rest.slice(width - indent.length);
      }
      current = indent + rest;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
};

/**
 * @param {object} bill - { billNo, dateStr, timeLabel, customerName, customerArea, items: [{name, unit, qty, price}] }
 */
function buildCustomBillEscPos(bill) {
  const grandTotal = bill.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  const chunks = [bytesInit(), bytesAlignCenter(), bytesDoubleOn(), bytesBoldOn()];
  chunks.push(bytesText('EPTOMART\n'));
  chunks.push(bytesDoubleOff(), bytesBoldOff());
  chunks.push(bytesText('Koyambedu Daily\n'));
  chunks.push(bytesAlignLeft());
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  for (const line of wrapLabeled('Bill No', bill.billNo)) chunks.push(bytesText(`${line}\n`));
  for (const line of wrapLabeled('Date', `${bill.dateStr}${bill.timeLabel ? ' ' + bill.timeLabel : ''}`)) chunks.push(bytesText(`${line}\n`));
  chunks.push(bytesBoldOn());
  for (const line of wrapLabeled('Customer', bill.customerName)) chunks.push(bytesText(`${line}\n`));
  chunks.push(bytesBoldOff());
  // Address/area text is free-form and can easily run past one line — wrap
  // on word boundaries instead of letting the printer hardware auto-wrap
  // mid-word (that's what was cutting "Chennai" into "Chenna"/"i").
  if (bill.customerArea) {
    for (const line of wrapLabeled('Location', bill.customerArea)) chunks.push(bytesText(`${line}\n`));
  }
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));

  bill.items.forEach((it, i) => {
    const qtyUnit = `${it.qty}${it.unit ? ' ' + it.unit : ''}`;
    for (const line of wrapItemLines(i, it.name, qtyUnit)) {
      chunks.push(bytesText(`${line}\n`));
    }
    const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
    chunks.push(bytesText(`   Rate: ${fmtRs(it.price)}   Amt: ${fmtRs(lineTotal)}\n`));
  });

  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  // Bold only (no double-width) for the total — double-width halves the
  // usable characters per physical line, which was silently wrapping
  // "TOTAL: Rs.1869.00" mid-number into "...1869.0" / "0" on this printer.
  chunks.push(bytesBoldOn());
  chunks.push(bytesText(`TOTAL: ${fmtRs(grandTotal)}\n`));
  chunks.push(bytesBoldOff());
  chunks.push(bytesText('-'.repeat(LINE_WIDTH) + '\n'));
  chunks.push(bytesAlignCenter());
  chunks.push(bytesText('Thank you for your purchase!\n'));
  chunks.push(bytesAlignLeft());

  chunks.push(bytesFeed(4));
  return concatBytes(chunks);
}

function buildCustomBillHtml(bill) {
  const grandTotal = bill.items.reduce((sum, it) => sum + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

  const rows = bill.items.map((it, i) => {
    const lineTotal = (Number(it.qty) || 0) * (Number(it.price) || 0);
    return `
    <div style="padding:3px 0;border-bottom:1px dashed #ccc">
      <div style="display:flex;justify-content:space-between;gap:6px;font-size:12px">
        <span style="flex:1;min-width:0;word-break:break-word;overflow-wrap:break-word">${i + 1}. ${it.name}</span>
        <span style="flex-shrink:0;white-space:nowrap">${it.qty}${it.unit ? ' ' + it.unit : ''}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:11px;color:#444">
        <span>Rate: ${fmtRs(it.price)}</span>
        <span>Amt: ${fmtRs(lineTotal)}</span>
      </div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  @page { size: 58mm auto; margin: 2mm; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 54mm; margin: 0; }
  .center { text-align: center; }
  hr { border: none; border-top: 1px dashed #000; }
</style></head><body>
  <div class="center"><strong style="font-size:16px">EPTOMART</strong><br>Koyambedu Daily</div>
  <hr>
  <div>Bill No: ${bill.billNo}</div>
  <div>Date: ${bill.dateStr}${bill.timeLabel ? ' ' + bill.timeLabel : ''}</div>
  <div><strong>Customer: ${bill.customerName}</strong></div>
  ${bill.customerArea ? `<div>Location: ${bill.customerArea}</div>` : ''}
  <hr>
  ${rows}
  <hr>
  <div style="display:flex;justify-content:space-between;font-weight:bold;font-size:14px;margin:4px 0">
    <span>TOTAL</span><span>${fmtRs(grandTotal)}</span>
  </div>
  <hr>
  <div class="center" style="margin-top:8px">Thank you for your purchase!</div>
</body></html>`;
}

async function printCustomBillViaBluetooth(bill) {
  await writeBytesChunked(buildCustomBillEscPos(bill));
}

function printCustomBillViaDialog(bill) {
  printHtmlViaDialog(buildCustomBillHtml(bill));
}

export {
  isBluetoothSupported,
  connectPrinter,
  disconnectPrinter,
  isPrinterConnected,
  printViaBluetooth,
  printViaDialog,
  printCustomBillViaBluetooth,
  printCustomBillViaDialog,
};
