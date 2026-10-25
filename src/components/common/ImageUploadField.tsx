import React, { useRef } from 'react';
import { Upload, X, Image as ImageIcon, Link as LinkIcon, Check } from 'lucide-react';

interface ImageUploadFieldProps {
  label: string;
  description?: string;
  value?: string;
  onChange: (dataUrl: string) => void;
  onClear: () => void;
  placeholderText?: string;
  previewHeight?: string;
  previewShape?: 'square' | 'rounded' | 'circle' | 'banner';
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  description,
  value,
  onChange,
  onClear,
  placeholderText = 'Upload image from your device',
  previewHeight = 'h-24',
  previewShape = 'rounded',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, WebP, SVG, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        onChange(event.target.result);
      }
    };
    reader.readAsDataURL(file);

    // Reset input so re-selecting same file triggers onChange
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
              <span>Custom Device Image Uploaded</span>
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              Preview active in live simulator, packaged APK, and exported source code.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-medium rounded-lg border border-slate-600 transition flex items-center gap-1.5"
              >
                <Upload size={12} />
                <span>Replace Image</span>
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
              {placeholderText}
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">
              PNG, JPG, WebP, or SVG from your phone/computer
            </p>
          </div>
        </div>
      )}

      {/* Hidden native file picker */}
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
