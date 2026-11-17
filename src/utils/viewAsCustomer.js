// Super Admin "View as customer" — keeps the chosen customer for this browser
// tab only (sessionStorage), so closing the tab or pressing Exit ends it.
const KEY = 'kbd_view_as';

export const getViewAs = () => {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
};
export const startViewAs = ({ id, name, phone }, to = '/koyambedu/cart') => {
  if (!id) return;
  try { sessionStorage.setItem(KEY, JSON.stringify({ id: String(id), name: name || 'Customer', phone: phone || '' })); } catch {}
  // full load so the cart context and every page start fresh as that customer
  window.location.assign(to);
};
export const stopViewAs = (to = '/admin/koyambedu') => {
  try { sessionStorage.removeItem(KEY); } catch {}
  window.location.assign(to);
};

// Customer endpoints that are served as the viewed customer (mirrors the backend).
export const isViewAsUrl = (url) => {
  const u = String(url || '');
  if (u.startsWith('/koyambedu/')) return !/^\/koyambedu\/(admin|seller|seller-admin)(\/|$)/.test(u);
  return u === '/auth/me' || u === '/auth/add-address' || u.startsWith('/auth/address/') || u.startsWith('/coupon/validate');
};
// The ONLY thing blocked while viewing: payment / placing an order.
export const isViewAsPaymentBlocked = (method, url) => {
  if (String(method || 'get').toLowerCase() === 'get') return false;
  const u = String(url || '').split('?')[0];
  return /^\/koyambedu\/orders\/?$/.test(u)
    || /^\/koyambedu\/orders\/(create-razorpay|verify-payment|test-payment)$/.test(u)
    || /^\/koyambedu\/orders\/[^/]+\/amend\/(checkout|verify)$/.test(u)
    || /^\/koyambedu\/orders\/[^/]+\/address\/(confirm|verify)$/.test(u);
};
