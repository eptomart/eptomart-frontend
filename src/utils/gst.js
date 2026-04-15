export const GST_SLABS = [0, 5, 12, 18, 28];

export const isIntraState = (s1, s2) =>
  s1?.trim().toLowerCase() === s2?.trim().toLowerCase();

export const extractBasePrice = (priceInclGst, gstRate) => {
  if (!gstRate) return priceInclGst;
  return priceInclGst / (1 + gstRate / 100);
};

export const calcLineGst = (unitPriceExGst, gstRate, quantity, sellerState, buyerState) => {
  const lineBase   = unitPriceExGst * quantity;
  const totalGst   = lineBase * gstRate / 100;
  const intra      = isIntraState(sellerState, buyerState);
  return {
    lineBase, totalGst,
    lineGrandTotal: lineBase + totalGst,
    gstType:    intra ? 'intra' : 'inter',
    cgstAmount: intra ? totalGst / 2 : 0,
    sgstAmount: intra ? totalGst / 2 : 0,
    igstAmount: intra ? 0 : totalGst,
  };
};

export const formatGstLabel = (gstType, rate) =>
  gstType === 'intra'
    ? `CGST ${rate / 2}% + SGST ${rate / 2}%`
    : `IGST ${rate}%`;

// Detect contact type
export const detectContactType = (contact) => {
  if (!contact) return null;
  const c = contact.trim();
  if (/^\S+@\S+\.\S+$/.test(c)) return 'email';
  if (/^[6-9]\d{9}$/.test(c))   return 'phone';
  return null;
};
