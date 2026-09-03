// ============================================
// EPTOMART EXPRESS — POS API Client
// Own axios instance + token namespace, same reasoning as
// expressManagerApi.js — a POS session can never be confused with a
// manager, customer, or main-app session.
// ============================================
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'express_pos_token';

export const getPOSToken = () => localStorage.getItem(TOKEN_KEY);
export const setPOSToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearPOSToken = () => localStorage.removeItem(TOKEN_KEY);

const expressPOSApi = axios.create({
  baseURL: `${API_BASE_URL}/express/pos`,
  headers: { 'Content-Type': 'application/json' },
});

expressPOSApi.interceptors.request.use((config) => {
  const token = getPOSToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

expressPOSApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';
    if (error.response?.status === 401) {
      clearPOSToken();
      if (window.location.pathname.startsWith('/express/pos') && !window.location.pathname.endsWith('/login')) {
        window.location.href = '/express/pos/login';
      }
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }
    return Promise.reject({ ...error, message });
  }
);

export default expressPOSApi;
