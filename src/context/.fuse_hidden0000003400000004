// ============================================
// COMPARE CONTEXT — Product comparison (max 3)
// ============================================
import React, { createContext, useContext, useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const CompareContext = createContext(null);

export const CompareProvider = ({ children }) => {
  const [compareList, setCompareList] = useState([]); // array of product objects

  const addToCompare = useCallback((product) => {
    setCompareList(prev => {
      if (prev.find(p => p._id === product._id)) {
        toast('Already in comparison list', { icon: 'ℹ️' });
        return prev;
      }
      if (prev.length >= 3) {
        toast.error('Max 3 products can be compared. Remove one first.');
        return prev;
      }
      toast.success(`${product.name.slice(0, 20)}... added to compare`);
      return [...prev, product];
    });
  }, []);

  const removeFromCompare = useCallback((productId) => {
    setCompareList(prev => prev.filter(p => p._id !== productId));
  }, []);

  const clearCompare = useCallback(() => setCompareList([]), []);

  const isInCompare = useCallback((productId) =>
    compareList.some(p => p._id === productId), [compareList]);

  return (
    <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
      {children}
    </CompareContext.Provider>
  );
};

export const useCompare = () => {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
};
