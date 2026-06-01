// ============================================
// KOYAMBEDU IMAGE UPLOADER
// Reusable image upload component for seller & seller-admin forms
// Props:
//   images       — array of { url, publicId, isPrimary }
//   onChange     — called with updated images array
//   maxImages    — default 5
// ============================================
import { useRef, useState } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';

export default function KoyambeduImageUploader({ images = [], onChange, maxImages = 5 }) {
  const inputRef   = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files) => {
    if (!files?.length) return;
    const remaining = maxImages - images.length;
    if (remaining <= 0) { toast.error(`Max ${maxImages} images allowed`); return; }

    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);

    const results = [];
    for (const file of toUpload) {
      try {
        const formData = new FormData();
        formData.append('image', file);
        const { data } = await api.post('/koyambedu/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        results.push({ url: data.url, publicId: data.publicId, isPrimary: false });
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    if (results.length) {
      const updated = [...images, ...results];
      // Auto-set first image as primary if none set
      if (!updated.some(i => i.isPrimary)) updated[0].isPrimary = true;
      onChange(updated);
      toast.success(`${results.length} image${results.length > 1 ? 's' : ''} uploaded`);
    }
    setUploading(false);
  };

  const setPrimary = (idx) => {
    onChange(images.map((img, i) => ({ ...img, isPrimary: i === idx })));
  };

  const remove = (idx) => {
    const updated = images.filter((_, i) => i !== idx);
    if (updated.length && !updated.some(i => i.isPrimary)) updated[0].isPrimary = true;
    onChange(updated);
  };

  return (
    <div>
      <label className="text-xs text-gray-500 font-medium">Product Images (max {maxImages})</label>

      {/* Image grid */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {images.map((img, idx) => (
            <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 group">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {/* Primary badge */}
              {img.isPrimary && (
                <span className="absolute top-1 left-1 bg-green-500 text-white text-[9px] font-bold px-1 rounded">Main</span>
              )}
              {/* Hover actions */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center gap-1 transition">
                {!img.isPrimary && (
                  <button type="button" onClick={() => setPrimary(idx)}
                    className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded font-bold">
                    Set Main
                  </button>
                )}
                <button type="button" onClick={() => remove(idx)}
                  className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded font-bold">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {images.length < maxImages && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-2 flex items-center gap-2 border-2 border-dashed border-green-300 rounded-xl px-4 py-3 text-sm text-green-700 font-semibold hover:bg-green-50 disabled:opacity-60 transition w-full justify-center"
        >
          {uploading
            ? <><span className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin" /> Uploading...</>
            : <><span className="text-lg">📷</span> {images.length === 0 ? 'Add Photos' : 'Add More Photos'}</>
          }
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {images.length > 0 && (
        <p className="text-[10px] text-gray-400 mt-1">Tap an image and click "Set Main" to set cover photo.</p>
      )}
    </div>
  );
}
