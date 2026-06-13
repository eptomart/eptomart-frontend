// ============================================
// PINCODE AUTOFILL HOOK
// Uses India Post free API — covers all 6-digit PIN codes
// including remote towns, villages, and rural areas
// ============================================
import { useState, useCallback } from 'react';

/**
 * usePincodeAutofill
 * @param {Function} onFill  - called with { city, state } when pincode resolves
 * @returns {{ lookupPincode, pincodeLoading, pincodeError }}
 *
 * Usage:
 *   const { lookupPincode, pincodeLoading } = usePincodeAutofill(({ city, state }) => {
 *     setForm(f => ({ ...f, city, state }));
 *   });
 *
 *   <input onChange={e => { handleChange(e); lookupPincode(e.target.value); }} />
 */
export function usePincodeAutofill(onFill) {
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError,   setPincodeError]   = useState('');

  const lookupPincode = useCallback(async (pincode) => {
    const clean = pincode.replace(/\D/g, '');
    if (clean.length !== 6) return;            // wait for full 6 digits
    setPincodeLoading(true);
    setPincodeError('');
    try {
      const res  = await fetch(`https://api.postalpincode.in/pincode/${clean}`);
      const data = await res.json();
      if (data[0]?.Status === 'Success' && data[0]?.PostOffice?.length > 0) {
        const po = data[0].PostOffice[0];
        onFill({
          city:  po.District || po.Division || po.Block || '',
          state: po.State || '',
        });
        setPincodeError('');
      } else {
        setPincodeError('Pincode not found');
      }
    } catch {
      setPincodeError('Could not fetch pincode details');
    } finally {
      setPincodeLoading(false);
    }
  }, [onFill]);

  return { lookupPincode, pincodeLoading, pincodeError };
}
