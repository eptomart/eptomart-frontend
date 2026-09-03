// ============================================
// EPTOMART EXPRESS — POS Receipt Printing (dialog fallback)
// A standalone, Express-only module — does not touch or import from
// utils/thermalPrinter.js (the existing Koyambedu printer utility), so
// nothing here can affect that feature. Uses the browser's native print
// dialog against a 58mm-formatted HTML receipt; works on any device once
// the thermal printer is set up as a system printer (its usual one-time
// USB/Bluetooth driver setup).
// ============================================

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

function printReceipt(bill) {
  const html = buildReceiptHtml(bill);
  const win = window.open('', '_blank', 'width=380,height=600');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.print(); };
}

export { printReceipt };
