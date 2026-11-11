// ============================================
// KOYAMBEDU DAILY — customer activity beacon
// Quietly tells the server which Koyambedu page / product a LOGGED-IN
// customer opened and what they searched for, so Super Admin's
// "User Activity" tab can show the full journey. Cart changes, orders and
// wallet movements are recorded by the server itself.
// • Never blocks or breaks the page (all errors swallowed).
// • Uses plain axios, NOT the shared api client, so a stale token here can
//   never trigger the app-wide "session expired → logout" handling.
// • Skips admins / staff browsing as customers, and seller portal screens.
// ============================================
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const API = import.meta.env.VITE_API_URL || '/api';

function send(body) {
  const token = localStorage.getItem('eptomart_token');
  if (!token) return;
  axios.post(`${API}/koyambedu/activity`, body, { headers: { Authorization: `Bearer ${token}` }, timeout: 8000 }).catch(() => {});
}

export default function KoyambeduActivityTracker() {
  const { pathname, search } = useLocation();
  const { user } = useAuth();
  const lastPath = useRef('');
  const lastSearch = useRef('');

  const eligible = !!user && !['admin', 'superAdmin'].includes(user.role)
    && pathname.startsWith('/koyambedu') && !pathname.startsWith('/koyambedu/seller');

  // Page / product / checkout views
  useEffect(() => {
    if (!eligible || lastPath.current === pathname) return;
    lastPath.current = pathname;
    const m = pathname.match(/^\/koyambedu\/product\/([a-f\d]{24})/i);
    if (m) send({ type: 'product_view', productId: m[1], page: pathname });
    else if (pathname === '/koyambedu/checkout') send({ type: 'checkout_view', page: pathname });
    else send({ type: 'page_view', page: pathname });
  }, [eligible, pathname]);

  // Searches in the shop — wait until the customer stops typing
  useEffect(() => {
    if (!eligible || pathname !== '/koyambedu/shop') return;
    const q = (new URLSearchParams(search).get('search') || '').trim();
    if (q.length < 2 || q === lastSearch.current) return;
    const t = setTimeout(() => { lastSearch.current = q; send({ type: 'search', query: q, page: pathname }); }, 1500);
    return () => clearTimeout(t);
  }, [eligible, pathname, search]);

  return null;
}
