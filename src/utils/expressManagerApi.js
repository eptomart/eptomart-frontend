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

export const getManagerToken = () => localStorage.getItem(TOKEN_KEY);
export const setManagerToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearManagerToken = () => localStorage.removeItem(TOKEN_KEY);

const expressManagerApi = axios.create({
  baseURL: `${API_BASE_URL}/express/manager`,
  headers: { 'Content-Type': 'application/json' },
});

expressManagerApi.interceptors.request.use((config) => {
  const token = getManagerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

expressManagerApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status === 401) {
      clearManagerToken();
      if (window.location.pathname.startsWith('/express/manager') && !window.location.pathname.endsWith('/login')) {
        window.location.href = '/express/manager/login';
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    return Promise.reject({ ...error, message });
  }
);

export default expressManagerApi;
