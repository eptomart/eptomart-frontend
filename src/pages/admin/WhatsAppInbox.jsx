// ============================================
// ADMIN — WhatsApp Inbox
// Super Admin only: view & reply to inbound
// WhatsApp messages from customers.
//
// SMART FEATURE: detects "Fresh Market Price List"
// messages, matches product names to Koyambedu
// Daily products, and lets admin bulk-update
// base prices with one click.
// ============================================
import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

// ── Variant price helpers (mirrors backend variantPricingService) ──────────
const fmt = (n) => `₹${Number(n || 0).toFixed(2)}`;

function previewVariants(variants, highestBasePrice, variantDiffPercent, chargePercents) {
  if (!variants || !variants.length) return [];
  const totalCharge = (chargePercents.procurement ?? 0) + (chargePercents.platform ?? 10) + (chargePercents.logistics ?? 10);
  const diff        = 1 + (Number(variantDiffPercent) || 0) / 100;
  const sorted      = [...variants].sort((a, b) => Number(b.fromQty) - Number(a.fromQty));
  let running       = Number(highestBasePrice) || 0;
  const result      = sorted.map(v => {
    const basePrice  = Math.round(running * 100) / 100;
    const finalPrice = Math.round(running * (1 + totalCharge / 100) * 100) / 100;
    running          = running * diff;
    return { ...v, basePrice, finalPrice };
  });
  return result.sort((a, b) => Number(a.fromQty) - Number(b.fromQty));
}

function fmtQty(qty, unit) {
  const n = Number(qty);
  if (unit === 'kg' && n < 1) return `${Math.round(n * 1000)} g`;
  if (unit === 'g'  && n >= 1000) return `${n / 1000} kg`;
  return `${n} ${unit}`;
}

function fmtRange(v, unit) {
  const from = fmtQty(v.fromQty, unit);
  if (!v.toQty) return `${from}+`;
  return from;
}

// ── Price List Parser ──────────────────────────────────────────────────────

/**
 * Parses a WhatsApp message that looks like:
 *   "🌿 Fresh Market Price List Date : 15/07/2026 Capsicum Green - ₹40/kg Cucumber - ₹33/kg"
 *
 * Works whether the message has newlines or is all on one line.
 * Returns { date: Date, items: [{ name, price, unit }] } or null.
 */

const HEADER_WORDS = ['price list', 'fresh market', 'market price'];

function parsePriceList(text) {
  if (!text) return null;

  // Must contain a date DD/MM/YYYY and at least one ₹ price
  const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (!dateMatch) return null;
  if (!(text.match(/₹\d+/g) || []).length) return null;

  const [, day, month, year] = dateMatch;
  const msgDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

  // Scan for "Name - ₹Price[/unit]" anywhere in the text.
  // Works whether the message has newlines or is a single line.
  // Name = starts with a letter, then up to 30 chars that are NOT
  //        a hyphen/dash, ₹ sign, or newline (lazy = stops at first "- ₹").
  const ITEM_RE = /([A-Za-z][^-₹\n]{1,30}?)\s*[-–]\s*₹(\d+(?:\.\d+)?)\s*(?:\/\s*([A-Za-z]+))?/g;

  const items = [];
  let m;
  while ((m = ITEM_RE.exec(text)) !== null) {
    const name  = m[1].trim();
    const price = parseFloat(m[2]);
    const unit  = m[3] || 'kg';
    if (name.length < 3 || price <= 0) continue;
    if (HEADER_WORDS.some(w => name.toLowerCase().includes(w))) continue;
    items.push({ name, price, unit });
  }

  return items.length ? { date: msgDate, items } : null;
}

function dateLabel(date) {
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isToday)     return { label: "Today's date ✓", ok: true };
  if (isYesterday) return { label: 'Yesterday — 1 day old', ok: 'warn' };
  const diffDays = Math.round((today - date) / 86400000);
  return { label: `${diffDays} days old`, ok: false };
}

const GRADE_KEYS = ['premium', 'mixed', 'economy'];

/**
 * Extracts an optional grade from item name.
 * Handles: "Pomegranate (Premium)", "Pomegranate (mixed grade)",
 *          "Pomegranate (economy grade)", "Pomegranate Premium"
 * Returns { cleanName, gradeKey } — gradeKey is null if none found.
 */
function extractGrade(itemName) {
  const parenMatch = itemName.match(/\(([^)]+)\)/i);
  if (parenMatch) {
    const inner = parenMatch[1].toLowerCase().trim();
    // Match: exact ("premium"), starts-with ("premium grade"), ends-with ("grade premium")
    const gradeKey = GRADE_KEYS.find(g =>
      inner === g ||
      inner.startsWith(g + ' ') ||
      inner.endsWith(' ' + g) ||
      inner.includes(g)          // "mixed grade" contains "mixed"
    );
    if (gradeKey) {
      return { cleanName: itemName.replace(/\s*\([^)]+\)/, '').trim(), gradeKey };
    }
  }
  // Also support suffix without parens: "Pomegranate Premium" or "Pomegranate Mixed Grade"
  const lowerName = itemName.toLowerCase();
  for (const g of GRADE_KEYS) {
    // Check for " premium", " premium grade", " mixed grade", etc.
    const patterns = [' ' + g, ' ' + g + ' grade', ' ' + g + 'grade'];
    for (const pat of patterns) {
      if (lowerName.endsWith(pat)) {
        return { cleanName: itemName.slice(0, -pat.length).trim(), gradeKey: g };
      }
    }
  }
  return { cleanName: itemName.trim(), gradeKey: null };
}

/** Exact case-insensitive match only — no partial/contains fallback */
function matchItem(cleanName, products) {
  const needle = cleanName.toLowerCase().trim();
  return products.find(p => p.name.toLowerCase().trim() === needle) || null;
}

// ── Variant preview chips for a single match row ──────────────────────────
function MatchVariantPreview({ product, newPrice, gradeKey }) {
  const preview = useMemo(() => {
    if (!product || !(newPrice > 0)) return [];
    // If gradeKey is set and product has grade rows, use that grade's config
    if (gradeKey && product.gradesEnabled && product.gradeRows?.length) {
      const gradeRow = product.gradeRows.find(g => g.gradeKey === gradeKey);
      if (gradeRow) {
        return previewVariants(
          gradeRow.variants?.length ? gradeRow.variants : product.variants,
          newPrice,
          gradeRow.variantDiffPercent ?? product.variantDiffPercent ?? 2,
          {
            procurement: product.procurementChargePercent,
            platform:    product.platformChargePercent,
            logistics:   product.logisticsChargePercent,
          }
        );
      }
    }
    return previewVariants(
      product.variants,
      newPrice,
      product.variantDiffPercent || 2,
      {
        procurement: product.procurementChargePercent,
        platform:    product.platformChargePercent,
        logistics:   product.logisticsChargePercent,
      }
    );
  }, [product, newPrice, gradeKey]);

  if (!preview.length) return null;
  const unit = product.unit || 'kg';

  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {[...preview].reverse().map((v, i) => (
        <span key={i} className={`text-[10px] rounded-lg px-2 py-1 font-semibold ${
          i === 0
            ? 'bg-green-100 text-green-700 border border-green-200'
            : 'bg-gray-100 text-gray-500'
        }`}>
          {fmtRange(v, unit)} → <span className="font-black">{fmt(v.finalPrice)}</span>
          {i === 0 && <span className="ml-1 text-[9px] opacity-70">base {fmt(v.basePrice)}</span>}
        </span>
      ))}
      <span className="text-[9px] text-gray-400 self-center ml-1">sell prices</span>
    </div>
  );
}

// ── Price List Card ────────────────────────────────────────────────────────

function PriceListCard({ parsed, onClose }) {
  const [products,   setProducts]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [matches,    setMatches]    = useState([]);   // [{ item, product, accepted, newPrice }]
  const [applying,   setApplying]   = useState(false);
  const [applied,    setApplied]    = useState(false);

  useEffect(() => {
    api.get('/koyambedu/admin/daily-price')
      .then(({ data }) => {
        const prods = data.products || [];
        setProducts(prods);
        setMatches(parsed.items.map(item => {
          const { cleanName, gradeKey: parsedGrade } = extractGrade(item.name);
          const product = matchItem(cleanName, prods);
          // Only use gradeKey if the matched product actually has grades
          const gradeKey = product?.gradesEnabled && product.gradeRows?.length && parsedGrade
            ? parsedGrade
            : null;
          return { item, product, accepted: !!product, newPrice: item.price, gradeKey, cleanName };
        }));
      })
      .catch(() => toast.error('Could not load products'))
      .finally(() => setLoading(false));
  }, [parsed]);

  const { label: dateText, ok: dateOk } = dateLabel(parsed.date);

  const toggleAccept = (idx) => setMatches(m => m.map((x, i) =>
    i === idx ? { ...x, accepted: !x.accepted } : x
  ));

  const setPrice = (idx, val) => setMatches(m => m.map((x, i) =>
    i === idx ? { ...x, newPrice: parseFloat(val) || x.newPrice } : x
  ));

  const applyPrices = async () => {
    const updates = matches
      .filter(m => m.accepted && m.product && m.newPrice > 0)
      .map(m => ({
        productId:        m.product._id,
        highestBasePrice: m.newPrice,
        ...(m.gradeKey ? { gradeKey: m.gradeKey } : {}),
      }));

    if (!updates.length) { toast.error('No items selected'); return; }

    setApplying(true);
    try {
      await api.post('/koyambedu/admin/daily-price/bulk', { updates });
      toast.success(`✅ Updated ${updates.length} product${updates.length > 1 ? 's' : ''}`);
      setApplied(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Update failed');
    } finally {
      setApplying(false);
    }
  };

  const acceptedCount = matches.filter(m => m.accepted && m.product).length;

  return (
    <div className="mt-3 bg-green-50 border border-green-200 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-green-600 text-white px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🌿</span>
          <div>
            <p className="font-black text-sm">Market Price List Detected</p>
            <p className={`text-xs font-semibold mt-0.5 ${
              dateOk === true ? 'text-green-200' : dateOk === 'warn' ? 'text-yellow-200' : 'text-red-200'
            }`}>
              {dateText}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/70 hover:text-white text-xl font-bold leading-none">✕</button>
      </div>

      {/* Date warning */}
      {dateOk === false && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-700 font-semibold">
          ⚠️ This price list is outdated. Date does not match today. You can still apply if needed.
        </div>
      )}
      {dateOk === 'warn' && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-700 font-semibold">
          ⚠️ This price list is from yesterday. Verify before applying.
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-6">
          <div className="w-7 h-7 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Match table */}
      {!loading && (
        <div className="p-4 space-y-2">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
            {matches.filter(m => m.product).length} of {matches.length} items matched to Koyambedu Daily products
          </p>

          {matches.map((m, idx) => (
            <div key={idx} className={`rounded-xl border px-4 py-3 transition ${
              !m.product ? 'bg-gray-50 border-gray-200 opacity-60' :
              m.accepted ? 'bg-white border-green-300 shadow-sm' : 'bg-white border-gray-200'
            }`}>
              <div className="flex items-center gap-3">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={!!m.accepted && !!m.product}
                  disabled={!m.product}
                  onChange={() => toggleAccept(idx)}
                  className="w-4 h-4 accent-green-600 cursor-pointer shrink-0"
                />

                {/* Item name */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-800">{m.cleanName || m.item.name}</p>
                    {m.gradeKey && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black shrink-0 ${
                        m.gradeKey === 'premium' ? 'bg-purple-100 text-purple-700' :
                        m.gradeKey === 'mixed'   ? 'bg-blue-100 text-blue-700'   :
                                                   'bg-gray-100 text-gray-600'
                      }`}>
                        {m.gradeKey.charAt(0).toUpperCase() + m.gradeKey.slice(1)}
                      </span>
                    )}
                  </div>
                  {m.product ? (
                    <p className="text-xs text-green-600 font-semibold truncate">
                      → {m.product.name}
                      {m.gradeKey && ` · ${m.gradeKey} grade only`}
                    </p>
                  ) : (
                    <p className="text-xs text-red-400 font-semibold">No exact match in Koyambedu Daily</p>
                  )}
                </div>

                {/* Price input */}
                {m.product ? (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-gray-500">₹</span>
                    <input
                      type="number"
                      value={m.newPrice}
                      min={1}
                      onChange={e => setPrice(idx, e.target.value)}
                      disabled={!m.accepted}
                      className="w-20 text-sm font-black border-2 border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-green-400 disabled:opacity-40"
                    />
                    <span className="text-xs text-gray-400">/{m.item.unit}</span>
                  </div>
                ) : (
                  <span className="text-sm font-bold text-gray-400 shrink-0">₹{m.item.price}/{m.item.unit}</span>
                )}
              </div>

              {/* Variant price preview — shown when accepted & price > 0 */}
              {m.accepted && m.product && m.newPrice > 0 && (
                <MatchVariantPreview product={m.product} newPrice={m.newPrice} gradeKey={m.gradeKey} />
              )}
            </div>
          ))}

          {/* Unmatched note */}
          {matches.some(m => !m.product) && (
            <p className="text-xs text-gray-400 pt-1">
              Unmatched items were not found in Koyambedu Daily — add them as products first.
            </p>
          )}

          {/* Apply button */}
          {!applied ? (
            <div className="mt-4 space-y-2">
              {acceptedCount > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  This will update base prices + auto-recalculate all variants for{' '}
                  <span className="font-bold text-green-700">{acceptedCount} product{acceptedCount !== 1 ? 's' : ''}</span>
                </p>
              )}
              <button
                onClick={applyPrices}
                disabled={applying || acceptedCount === 0}
                className={`w-full py-3 font-black rounded-xl transition text-sm flex items-center justify-center gap-2 ${
                  acceptedCount > 0
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {applying ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Updating prices…
                  </>
                ) : acceptedCount > 0 ? (
                  `✅ Update Base Price + Variants for ${acceptedCount} Product${acceptedCount !== 1 ? 's' : ''}`
                ) : (
                  'Select at least one product to update'
                )}
              </button>
            </div>
          ) : (
            <div className="mt-3 bg-green-600 text-white font-black rounded-xl py-3 text-center text-sm">
              ✅ Prices + variants updated in Koyambedu Daily!
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Inbox ─────────────────────────────────────────────────────────────

export default function WhatsAppInbox() {
  const [msgs,       setMsgs]       = useState([]);
  const [unread,     setUnread]     = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [replyModal, setReplyModal] = useState(null);
  const [replyText,  setReplyText]  = useState('');
  const [replying,   setReplying]   = useState(false);
  // track which messages have the price panel open
  const [pricePanel, setPricePanel] = useState({});   // { [msgId]: boolean }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/koyambedu/admin/whatsapp/messages?limit=100');
      setMsgs(data.messages || []);
      setUnread(data.unreadCount || 0);
    } catch {
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (msg) => {
    try {
      await api.patch(`/koyambedu/admin/whatsapp/messages/${msg._id}/read`);
      setMsgs(m => m.map(x => x._id === msg._id ? { ...x, isRead: true } : x));
      setUnread(u => Math.max(0, u - 1));
    } catch { toast.error('Failed'); }
  };

  const markAllRead = async () => {
    try {
      await api.patch('/koyambedu/admin/whatsapp/messages/read-all');
      setMsgs(m => m.map(x => ({ ...x, isRead: true })));
      setUnread(0);
      toast.success('All marked as read');
    } catch { toast.error('Failed'); }
  };

  const sendReply = async () => {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await api.post(`/koyambedu/admin/whatsapp/messages/${replyModal._id}/reply`, {
        text: replyText.trim(),
      });
      toast.success('Reply sent!');
      setMsgs(m => m.map(x => x._id === replyModal._id
        ? { ...x, isRead: true, repliedAt: new Date(), replyText: replyText.trim() }
        : x
      ));
      if (!replyModal.isRead) setUnread(u => Math.max(0, u - 1));
      setReplyModal(null);
      setReplyText('');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const msgContent = (msg) => {
    if (msg.type === 'text' || msg.type === 'button') return msg.text || '—';
    if (msg.type === 'image')    return `📷 Image${msg.mediaCaption ? ` — ${msg.mediaCaption}` : ''}`;
    if (msg.type === 'audio')    return '🎵 Audio message';
    if (msg.type === 'video')    return `🎥 Video${msg.mediaCaption ? ` — ${msg.mediaCaption}` : ''}`;
    if (msg.type === 'document') return `📄 Document${msg.text ? `: ${msg.text}` : ''}`;
    if (msg.type === 'sticker')  return '🙂 Sticker';
    if (msg.type === 'location') return `📍 Location${msg.locationName ? `: ${msg.locationName}` : ''}`;
    return `[${msg.type}]`;
  };

  const hoursSince = (date) => (Date.now() - new Date(date).getTime()) / 3_600_000;

  const displayed = unreadOnly ? msgs.filter(m => !m.isRead) : msgs;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-black text-gray-900 flex items-center gap-2">
            💬 WhatsApp Inbox
            {unread > 0 && (
              <span className="bg-green-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                {unread} unread
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Inbound messages from customers on your business WhatsApp number
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={markAllRead}
            className="text-sm font-bold px-4 py-2 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition">
            Mark all read
          </button>
          <button onClick={load}
            className="text-sm font-bold px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-700 transition">
            ↻ Refresh
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['All messages', 'Unread only'].map((label, i) => (
          <button key={label}
            onClick={() => setUnreadOnly(i === 1)}
            className={`text-sm font-bold px-4 py-2 rounded-xl transition ${
              (i === 1) === unreadOnly ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!loading && msgs.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center space-y-3">
          <p className="text-4xl">📲</p>
          <p className="font-bold text-gray-700">No messages yet</p>
          <p className="text-sm text-gray-400 leading-relaxed">
            Subscribe the <span className="font-mono font-bold">messages</span> field in Meta Developer Dashboard
            → WhatsApp → Configuration → Webhook Fields.
          </p>
        </div>
      )}

      {!loading && displayed.length === 0 && msgs.length > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">No unread messages</div>
      )}

      {/* Message list */}
      <div className="space-y-3">
        {displayed.map(msg => {
          const text       = (msg.type === 'text' || msg.type === 'button') ? (msg.text || '') : '';
          const parsed     = parsePriceList(text);
          const panelOpen  = !!pricePanel[msg._id];

          return (
            <div key={msg._id}
              className={`bg-white rounded-2xl border p-5 transition ${
                msg.isRead ? 'border-gray-100' : 'border-green-300 shadow-sm'
              }`}>

              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0 text-lg">
                    👤
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{msg.profileName || msg.from}</p>
                    <p className="text-xs text-gray-400">{msg.from}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!msg.isRead && <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />}
                  <span className="text-xs text-gray-400">
                    {new Date(msg.sentAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>

              {/* Message content */}
              <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">
                {msgContent(msg)}
              </div>

              {/* Price list detected badge */}
              {parsed && (
                <div className="mb-3">
                  <button
                    onClick={() => setPricePanel(p => ({ ...p, [msg._id]: !p[msg._id] }))}
                    className="flex items-center gap-2 text-sm font-black text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-xl hover:bg-green-100 transition"
                  >
                    🌿 Price list detected — {panelOpen ? 'Hide' : 'Review & Update Prices'}
                  </button>

                  {panelOpen && (
                    <PriceListCard
                      parsed={parsed}
                      onClose={() => setPricePanel(p => ({ ...p, [msg._id]: false }))}
                    />
                  )}
                </div>
              )}

              {/* Replied */}
              {msg.repliedAt && (
                <p className="text-xs text-green-600 font-semibold mb-2">
                  ✓ Replied: {msg.replyText}
                </p>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {!msg.isRead && (
                  <button onClick={() => markRead(msg)}
                    className="text-sm px-4 py-1.5 rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition font-bold">
                    Mark read
                  </button>
                )}
                <button onClick={() => { setReplyModal(msg); setReplyText(''); }}
                  className="text-sm px-4 py-1.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition">
                  💬 Reply
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-green-700 text-lg">💬 Reply via WhatsApp</h3>
                <p className="text-sm text-gray-400">
                  To: {replyModal.profileName || replyModal.from} ({replyModal.from})
                </p>
              </div>
              <button onClick={() => setReplyModal(null)}
                className="text-gray-400 text-2xl font-bold leading-none hover:text-gray-600">✕</button>
            </div>

            <div className="bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-600">
              <p className="text-xs font-bold text-gray-400 mb-1">Customer said:</p>
              <span className="whitespace-pre-wrap">{msgContent(replyModal)}</span>
            </div>

            {hoursSince(replyModal.sentAt) > 20 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-2 text-sm text-orange-700">
                ⚠️ This message is over 20 hours old. Replies only work within Meta's 24-hour window.
              </div>
            )}

            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Type your reply…"
              rows={4}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-green-400 resize-none"
            />

            <div className="flex gap-3">
              <button onClick={() => setReplyModal(null)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                disabled={replying || !replyText.trim()}
                onClick={sendReply}
                className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 disabled:opacity-40 transition">
                {replying ? 'Sending…' : '📤 Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
