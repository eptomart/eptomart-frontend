// ============================================
// CURRENCY UTILITIES — INR Formatting
// ============================================

/**
 * Format number as Indian Rupees
 * e.g. 1234567 → ₹12,34,567
 */
export const formatINR = (amount) => {
  if (!amount && amount !== 0) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format number with Indian comma system (no currency symbol)
 */
export const formatNumber = (num) => {
  if (!num && num !== 0) return '0';
  return new Intl.NumberFormat('en-IN').format(num);
};

/**
 * Calculate discount percentage
 */
export const getDiscountPercent = (original, discounted) => {
  if (!original || !discounted) return 0;
  return Math.round(((original - discounted) / original) * 100);
};

/**
 * Format date to Indian locale
 */
export const formatDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
};
