// ============================================
// EPTOMART EXPRESS — Store Manager API Client
// A separate axios instance from the main app's `api.js`. Store Manager
// sessions use their own token (in localStorage under a different key) so
// they can never be confused with — or accidentally sent as — a customer,
// seller, or admin session. This file does not modify api.js.
// ============================================
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'express_manager_token';

const MAIN_TOKEN_KEY = 'eptomart_token';
// A store owner can use their NORMAL Eptomart login (Profile → Manage Store);
// legacy manager-password sessions keep working too.
export const isMainLogin = () => !!localStorage.getItem(MAIN_TOKEN_KEY);
// Super admin "view as owner": remembers which store's dashboard is open (per tab).
export const getActAsStore = () => { try { return JSON.parse(sessionStorage.getItem('express_act_as_store') || 'null'); } catch { return null; } };
export const setActAsStore = (store) => sessionStorage.setItem('express_act_as_store', JSON.stringify({ _id: store._id, name: store.name }));
export const clearActAsStore = () => sessionStorage.removeItem('express_act_as_store');
export const getManagerToken = () => localStorage.getItem(MAIN_TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
export const setManagerToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearManagerToken = () => localStorage.removeItem(TOKEN_KEY);

const expressManagerApi = axios.create({
  baseURL: `${API_BASE_URL}/express/manager`,
  headers: { 'Content-Type': 'application/json' },
});

expressManagerApi.interceptors.request.use((config) => {
  const token = getManagerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const actAs = getActAsStore();
  if (actAs?._id && localStorage.getItem(MAIN_TOKEN_KEY)) config.headers['x-express-store-id'] = actAs._id;
  return config;
});

expressManagerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status === 401 || (error.response?.status === 403 && /not a store owner/i.test(message))) {
      clearManagerToken();
      if (window.location.pathname.startsWith('/express/manager') && !window.location.pathname.endsWith('/login')) {
        window.location.href = isMainLogin() ? '/profile' : '/express/manager/login';
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    return Promise.reject({ ...error, message });
  }
);

export default expressManagerApi;
