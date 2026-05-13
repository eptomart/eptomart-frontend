// ============================================================
// WhatsApp deep-link utility — Eptomart
//
// Priority:
//   1. Mobile (Android / iPhone) → whatsapp://send  (opens app)
//   2. App not installed / Desktop → https://wa.me/  (WhatsApp Web)
//
// Number rules:
//   • Strip leading +, spaces, hyphens, brackets
//   • Default country code = 91 (India) if not present
// ============================================================

/**
 * Normalise any phone number to E.164 without the leading '+'.
 * Examples:
 *   '+91 95145 19518' → '919514519518'
 *   '9514519518'      → '919514519518'
 *   '919514519518'    → '919514519518'
 */
export const normalisePhone = (raw = '') => {
  const digits = raw.replace(/\D/g, ''); // strip everything non-digit
  if (!digits) return '';
  // Already has country code 91 (11+ digits) → keep as-is
  if (digits.length >= 11 && digits.startsWith('91')) return digits;
  // 10-digit Indian number → prepend 91
  if (digits.length === 10) return `91${digits}`;
  // Anything else — return as-is and hope for the best
  return digits;
};

/**
 * Returns true when running on a mobile device (Android or iOS).
 */
const isMobile = () =>
  /android|iphone|ipad|ipod|windows phone/i.test(navigator.userAgent);

/**
 * Open a WhatsApp conversation.
 *
 * @param {string} phone    - Any format phone number (see normalisePhone)
 * @param {string} message  - Pre-filled message text (plain, NOT encoded yet)
 * @param {object} opts
 *   @param {Function} opts.onSuccess - called when link opens
 *   @param {Function} opts.onError   - called with error string when number is missing
 */
export const openWhatsApp = (phone, message = '', { onSuccess, onError } = {}) => {
  const number = normalisePhone(phone);

  if (!number) {
    const err = 'WhatsApp: phone number is missing or invalid.';
    console.error('[WhatsApp]', err, { raw: phone });
    if (onError) onError(err);
    return;
  }

  const encoded = encodeURIComponent(message);
  const webUrl  = `https://wa.me/${number}${encoded ? `?text=${encoded}` : ''}`;
  const appUrl  = `whatsapp://send?phone=${number}${encoded ? `&text=${encoded}` : ''}`;

  console.log('[WhatsApp] Opening →', { number, isMobile: isMobile(), webUrl });

  if (isMobile()) {
    // Attempt to open the native app.
    // If WhatsApp is not installed the browser ignores the URI silently,
    // so we schedule a fallback to WhatsApp Web after 1.5 s.
    const before = Date.now();
    window.location.href = appUrl;

    setTimeout(() => {
      // If the app handled it the page would have blurred; if we're still
      // here after 1.5 s the app was likely not installed — open web.
      if (document.hasFocus() || Date.now() - before < 1600) {
        console.warn('[WhatsApp] Native app not found — falling back to WhatsApp Web');
        window.open(webUrl, '_blank', 'noopener,noreferrer');
      }
    }, 1500);
  } else {
    // Desktop — open WhatsApp Web in a new tab
    window.open(webUrl, '_blank', 'noopener,noreferrer');
  }

  if (onSuccess) onSuccess({ number, webUrl });
};

/**
 * Convenience: open a support chat with Eptomart's support number.
 * Message is optional; defaults to a greeting.
 */
export const openSupportWhatsApp = (message = 'Hi Eptomart! I need help with my order.') => {
  const supportPhone = import.meta.env.VITE_SUPPORT_WHATSAPP || '919514519518';
  openWhatsApp(supportPhone, message);
};
