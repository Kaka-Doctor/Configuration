import React, { useRef, useState } from 'react';
import { Upload, X, Image as ImageIcon, Check, AlertTriangle } from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  description?: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  onClear: () => void;
  placeholderText?: string;
  previewHeight?: string;
  previewShape?: 'square' | 'rounded' | 'circle' | 'banner';
  /** Longest edge after downscaling. Keeps localStorage/export sizes sane. */
  maxDimension?: number;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not decode the image'));
    img.src = src;
  });
}

function approximateKb(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] || '';
  return Math.round((base64.length * 3) / 4 / 1024);
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  description,
  value,
  onChange,
  onClear,
  placeholderText = 'Upload image from your device',
  previewShape = 'rounded',
  maxDimension = 1024,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    setError('');
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, WebP, SVG).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError('That image is larger than 15 MB — please choose a smaller one.');
      return;
    }

    setProcessing(true);
    try {
      const dataUrl = await readAsDataUrl(file);

      // Keep SVG vector data and animated GIFs untouched (canvas would flatten them).
      if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        if (file.size > 2 * 1024 * 1024) {
          setError('Animated/SVG images must be under 2 MB. Please use a smaller PNG or JPG.');
          return;
        }
        onChange(dataUrl);
        return;
      }

      const image = await loadImage(dataUrl);
      const longest = Math.max(image.width, image.height);
      const scale = Math.min(1, maxDimension / longest);

      // Small, already-sized images can be stored as-is.
      if (scale === 1 && file.size <= 450 * 1024) {
        onChange(dataUrl);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        onChange(dataUrl);
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const keepAlpha = file.type === 'image/png' || file.type === 'image/webp';
      const output = keepAlpha
        ? canvas.toDataURL('image/png')
        : canvas.toDataURL('image/jpeg', 0.88);
      onChange(output);
    } catch (err) {
      console.error(err);
      setError('This image could not be processed. Try a PNG or JPG file.');
    } finally {
      setProcessing(false);
    }
  };

  const getShapeClasses = () => {
    switch (previewShape) {
      case 'circle':
        return 'rounded-full aspect-square w-20 h-20 object-cover';
      case 'square':
        return 'rounded-xl aspect-square w-20 h-20 object-cover';
      case 'banner':
        return 'rounded-xl w-full h-24 object-cover';
      case 'rounded':
      default:
        return 'rounded-xl max-h-28 object-contain';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
          <ImageIcon size={14} className="text-indigo-400" />
          <span>{label}</span>
        </label>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
          >
            <X size={12} />
            <span>Remove</span>
          </button>
        )}
      </div>

      {description && <p className="text-[11px] text-slate-400">{description}</p>}

      {value ? (
        <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700 flex items-center gap-4">
          <div className="relative group shrink-0">
            <img
              src={value}
              alt={label}
              className={`bg-slate-900 border border-slate-700/80 shadow-md ${getShapeClasses()}`}
            />
          </div>

          <div className="flex-1 space-y-1.5 text-xs min-w-0">
            <div className="text-emerald-400 font-semibold flex items-center gap-1">
              <Check size={14} />
              <span>Custom image uploaded</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Used in the live simulator, the exported app and the generated launcher icons.
            </p>
            <p className="text-[10px] text-slate-500 font-mono">≈ {approximateKb(value)} KB</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={processing}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium rounded-lg border border-slate-600 transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Upload size={12} />
                <span>{processing ? 'Processing…' : 'Replace Image'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-750 hover:border-indigo-500/80 bg-slate-800/30 hover:bg-slate-800/60 rounded-xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 group"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-800 group-hover:bg-indigo-600/30 text-slate-400 group-hover:text-indigo-400 border border-slate-700 flex items-center justify-center transition">
            <Upload size={18} />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition">
              {processing ? 'Processing image…' : placeholderText}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              PNG, JPG, WebP or SVG — automatically resized to {maxDimension}px
            </p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-rose-300 flex items-center gap-1.5">
          <AlertTriangle size={12} />
          {error}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/svg+xml, image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};
