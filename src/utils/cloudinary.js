// ============================================
// CLOUDINARY — Responsive image URL helpers
// ============================================

/**
 * Transform a Cloudinary URL to resize/optimise on the fly.
 * Returns the original URL unchanged if it's not a Cloudinary URL.
 */
export const cloudinaryUrl = (url, { width, height, quality = 'auto', format = 'auto', crop = 'fill' } = {}) => {
  if (!url || !url.includes('res.cloudinary.com')) return url;

  const transforms = [];
  if (width)   transforms.push(`w_${width}`);
  if (height)  transforms.push(`h_${height}`);
  if (crop)    transforms.push(`c_${crop}`);
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);

  // Insert transforms after /upload/ in the Cloudinary URL
  return url.replace('/upload/', `/upload/${transforms.join(',')}/`);
};

/**
 * Preset sizes for common UI contexts
 */
export const imgCard      = (url) => cloudinaryUrl(url, { width: 400,  height: 400  });
export const imgThumb     = (url) => cloudinaryUrl(url, { width: 120,  height: 120  });
export const imgHero      = (url) => cloudinaryUrl(url, { width: 800,  height: 800  });
export const imgFull      = (url) => cloudinaryUrl(url, { width: 1200, height: 1200 });
export const imgCart      = (url) => cloudinaryUrl(url, { width: 80,   height: 80   });
export const imgInvoice   = (url) => cloudinaryUrl(url, { width: 60,   height: 60   });
