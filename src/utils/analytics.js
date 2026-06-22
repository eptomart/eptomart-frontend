/**
 * Eptomart Analytics — Shared event tracker
 *
 * HOW TO ENABLE GA4:
 * 1. Get your Measurement ID from Google Analytics (format: G-XXXXXXXXXX)
 * 2. Add  VITE_GA4_ID=G-XXXXXXXXXX  to your .env file
 * 3. Add the gtag script to index.html (see comment block below)
 * 4. Remove the ENABLED check below to activate real tracking
 *
 * index.html GA4 snippet (paste in <head> when ready):
 * ──────────────────────────────────────────────────────
 * <!-- GA4: replace G-XXXXXXXXXX with your real Measurement ID -->
 * <!--
 * <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
 * <script>
 *   window.dataLayer = window.dataLayer || [];
 *   function gtag(){dataLayer.push(arguments);}
 *   gtag('js', new Date());
 *   gtag('config', 'G-XXXXXXXXXX', { anonymize_ip: true });
 * </script>
 * -->
 * ──────────────────────────────────────────────────────
 */

const GA4_ID  = import.meta.env.VITE_GA4_ID || null;
const ENABLED = Boolean(GA4_ID && typeof window !== 'undefined' && window.gtag);

// ── Core ─────────────────────────────────────────────────────────────────────

/** Send a custom event to GA4 */
export function trackEvent(eventName, params = {}) {
  if (!ENABLED) return; // GA4 not configured yet — silently skip
  try {
    window.gtag('event', eventName, params);
  } catch (err) {
    console.warn('[analytics] trackEvent failed:', err);
  }
}

/** Track a page view — call on route change */
export function trackPageView(path, title) {
  if (!ENABLED) return;
  try {
    window.gtag('config', GA4_ID, {
      page_path:  path  || window.location.pathname,
      page_title: title || document.title,
    });
  } catch (err) {
    console.warn('[analytics] trackPageView failed:', err);
  }
}

// ── E-Commerce Events ─────────────────────────────────────────────────────────

/** User viewed a product */
export function trackProductView({ id, name, price, category, subApp = 'main' }) {
  trackEvent('view_item', {
    currency: 'INR',
    value: price,
    sub_app: subApp,
    items: [{ item_id: id, item_name: name, price, item_category: category }],
  });
}

/** User added item to cart */
export function trackAddToCart({ id, name, price, quantity = 1, category, subApp = 'main' }) {
  trackEvent('add_to_cart', {
    currency: 'INR',
    value: price * quantity,
    sub_app: subApp,
    items: [{ item_id: id, item_name: name, price, quantity, item_category: category }],
  });
}

/** User started checkout */
export function trackBeginCheckout({ items = [], value = 0, subApp = 'main' }) {
  trackEvent('begin_checkout', { currency: 'INR', value, sub_app: subApp, items });
}

/** User completed purchase */
export function trackPurchase({ orderId, value, items = [], subApp = 'main' }) {
  trackEvent('purchase', {
    transaction_id: orderId,
    currency: 'INR',
    value,
    sub_app: subApp,
    items,
  });
}

/** User searched for a product */
export function trackSearch({ query, subApp = 'main' }) {
  trackEvent('search', { search_term: query, sub_app: subApp });
}

/** User viewed a sub-app landing page */
export function trackSubAppView(subApp) {
  trackEvent('sub_app_view', { sub_app: subApp });
}

/** User registered as a seller */
export function trackSellerRegistration(subApp = 'main') {
  trackEvent('seller_registration', { sub_app: subApp });
}

// ── Route-change auto-tracker (use in App.jsx if desired) ────────────────────
// import { useEffect } from 'react';
// import { useLocation } from 'react-router-dom';
// import { trackPageView } from './analytics';
//
// export function useAnalyticsPageView() {
//   const location = useLocation();
//   useEffect(() => { trackPageView(location.pathname); }, [location]);
// }
