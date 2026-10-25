import React, { useState } from 'react';
import { POPULAR_ICONS, renderAppIcon } from '../utils/iconMap';
import { Search, X } from 'lucide-react';

interface IconPickerModalProps {
  isOpen: boolean;
  currentIcon: string;
  onSelect: (iconName: string) => void;
  onClose: () => void;
  title?: string;
}

export const IconPickerModal: React.FC<IconPickerModalProps> = ({
  isOpen,
  currentIcon,
  onSelect,
  onClose,
  title = 'Choose an Icon',
}) => {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const filteredIcons = POPULAR_ICONS.filter((name) =>
    name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl p-6 shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Close icon picker"
          >
            <X size={20} />
          </button>
        </div>

        <div className="relative my-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search icons (e.g. Home, Share, Store, Globe)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
          />
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-6 gap-3 overflow-y-auto p-1 flex-1">
          {filteredIcons.map((iconName) => {
            const isSelected = currentIcon === iconName;
            return (
              <button
                key={iconName}
                onClick={() => {
                  onSelect(iconName);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition group ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                    : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800 hover:text-white'
                }`}
                title={iconName}
              >
                <div className="group-hover:scale-110 transition-transform">
                  {renderAppIcon(iconName, 24)}
                </div>
                <span className="text-[10px] mt-1.5 truncate max-w-full text-slate-400 group-hover:text-slate-200">
                  {iconName}
                </span>
              </button>
            );
          })}
          {filteredIcons.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400 text-sm">
              No icons matching &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
