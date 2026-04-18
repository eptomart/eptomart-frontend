// ============================================
// AXIOS INSTANCE — API Client
// ============================================
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach JWT
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('eptomart_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;

    // Attach session ID for analytics
    let sessionId = sessionStorage.getItem('eptomart_session');
    if (!sessionId) {
      sessionId = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
      sessionStorage.setItem('eptomart_session', sessionId);
    }
    config.headers['x-session-id'] = sessionId;

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong';

    if (error.response?.status === 401) {
      localStorage.removeItem('eptomart_token');
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    } else if (error.response?.status === 429) {
      toast.error('Too many requests. Please wait a moment.');
    } else if (error.response?.status >= 500 && error.config?.responseType !== 'blob') {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject({ ...error, message });
  }
);

export default api;
