// ============================================
// AUTH CONTEXT — User Authentication State
// ============================================
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user on mount
  useEffect(() => {
    const token = localStorage.getItem('eptomart_token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      // Auto-refresh: server sends a new token when the current one is near expiry
      if (data.token) {
        localStorage.setItem('eptomart_token', data.token);
      }
    } catch {
      localStorage.removeItem('eptomart_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const sendOtp = async (contact, type = 'email') => {
    const { data } = await api.post('/auth/send-otp', { contact, type });
    return data;
  };

  const verifyOtp = async (contact, code, type = 'email', name = '') => {
    const { data } = await api.post('/auth/verify-otp', { contact, code, type, name });
    if (data.success) {
      localStorage.setItem('eptomart_token', data.token);
      setUser(data.user);
      toast.success(data.message);
    }
    return data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (_) {}
    localStorage.removeItem('eptomart_token');
    setUser(null);
    toast.success('Logged out');
  };

  const updateProfile = async (updates) => {
    const { data } = await api.put('/auth/update-profile', updates);
    if (data.success) {
      setUser(data.user);
      toast.success('Profile updated!');
    }
    return data;
  };

  const isSuperAdmin = user?.role === 'superAdmin';
  const isAdmin      = user?.role === 'admin' || isSuperAdmin;
  const isSeller     = user?.role === 'seller';
  const isLoggedIn = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, isLoggedIn, isAdmin, isSuperAdmin, isSeller, sendOtp, verifyOtp, logout, updateProfile, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
