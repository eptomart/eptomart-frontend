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

// Only these customer endpoints are served as the customer.
export const VIEW_AS_URLS = ['/koyambedu/cart', '/koyambedu/wallet', '/koyambedu/my-orders'];
// While viewing, the only writes allowed are cart edits.
export const isViewAsWriteBlocked = (method, url) =>
  String(method || 'get').toLowerCase() !== 'get' && !String(url || '').startsWith('/koyambedu/cart');
