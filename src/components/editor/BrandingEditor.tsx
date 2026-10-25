import React, { useState } from 'react';
import { AppConfig } from '../../types/appConfig';
import { renderAppIcon } from '../../utils/iconMap';
import { IconPickerModal } from '../IconPickerModal';
import { ImageUploadField } from '../common/ImageUploadField';
import { Palette, Sparkles, Image as ImageIcon } from 'lucide-react';

interface BrandingEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

const THEME_PALETTES = [
  { name: 'Indigo Night', theme: '#1e1b4b', bg: '#f8fafc', accent: '#6366f1' },
  { name: 'Deep Corporate', theme: '#1e3a8a', bg: '#f8fafc', accent: '#3b82f6' },
  { name: 'Emerald Forest', theme: '#064e3b', bg: '#f0fdf4', accent: '#10b981' },
  { name: 'Crimson Slate', theme: '#881337', bg: '#fff1f2', accent: '#f43f5e' },
  { name: 'Cyber Dark', theme: '#09090b', bg: '#18181b', accent: '#f97316' },
  { name: 'Royal Purple', theme: '#581c87', bg: '#faf5ff', accent: '#a855f7' },
];

export const BrandingEditor: React.FC<BrandingEditorProps> = ({ config, onChange }) => {
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);

  const update = (partial: Partial<AppConfig>) => {
    onChange({ ...config, ...partial });
  };

  const updateLogo = (partial: Partial<AppConfig['appLogo']>) => {
    onChange({
      ...config,
      appLogo: { ...config.appLogo, ...partial },
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Basic App Details */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={18} />
          App Identity & Package
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Full App Name
            </label>
            <input
              type="text"
              value={config.appName}
              onChange={(e) => update({ appName: e.target.value })}
              placeholder="e.g. Apex Portal App"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Short Name (≤ 12 chars for Android Home Screen)
            </label>
            <input
              type="text"
              maxLength={12}
              value={config.shortName}
              onChange={(e) => update({ shortName: e.target.value })}
              placeholder="e.g. ApexPortal"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Android Package ID (Reverse Domain)
            </label>
            <input
              type="text"
              value={config.appPackageId}
              onChange={(e) => update({ appPackageId: e.target.value })}
              placeholder="e.g. com.mycompany.myapp"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              App Description
            </label>
            <input
              type="text"
              value={config.description}
              onChange={(e) => update({ description: e.target.value })}
              placeholder="Brief description for PWA and App stores"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* App Logo & Home Screen Icon */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ImageIcon className="text-pink-400" size={18} />
          App Logo & Launcher Icon
        </h3>

        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-slate-800/40 rounded-xl border border-slate-800">
          {/* Logo Preview */}
          <div className="flex flex-col items-center">
            <div
              className={`w-20 h-20 flex items-center justify-center transition-all shadow-lg overflow-hidden ${
                config.appLogo.shape === 'circle'
                  ? 'rounded-full'
                  : config.appLogo.shape === 'squircle'
                  ? 'rounded-[26px]'
                  : config.appLogo.shape === 'rounded-square'
                  ? 'rounded-xl'
                  : 'rounded-2xl rotate-3'
              }`}
              style={{
                backgroundColor: config.appLogo.bgColor,
                color: config.appLogo.iconColor,
              }}
            >
              {config.appLogo.customImageUrl ? (
                <img
                  src={config.appLogo.customImageUrl}
                  alt="App Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                renderAppIcon(config.appLogo.icon, 38)
              )}
            </div>
            <span className="text-[11px] text-slate-400 mt-2">Launcher Icon</span>
          </div>

          {/* Logo Controls */}
          <div className="flex-1 space-y-3 w-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsIconModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 transition"
              >
                <span>Change Icon ({config.appLogo.icon})</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Shape:</span>
                {(['squircle', 'circle', 'rounded-square', 'badge'] as const).map((shape) => (
                  <button
                    key={shape}
                    type="button"
                    onClick={() => updateLogo({ shape })}
                    className={`px-2.5 py-1 rounded-lg text-xs capitalize transition ${
                      config.appLogo.shape === shape
                        ? 'bg-slate-700 text-white font-semibold border border-indigo-400'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Logo Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.appLogo.bgColor}
                    onChange={(e) => updateLogo({ bgColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.appLogo.bgColor}
                    onChange={(e) => updateLogo({ bgColor: e.target.value })}
                    className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Icon Graphic Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.appLogo.iconColor}
                    onChange={(e) => updateLogo({ iconColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.appLogo.iconColor}
                    onChange={(e) => updateLogo({ iconColor: e.target.value })}
                    className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Upload Custom Logo from Device */}
        <div className="pt-2 border-t border-slate-800">
          <ImageUploadField
            label="Upload Custom App Logo / Icon from Device"
            description="Select an image (PNG, JPG, SVG, WebP) from your phone or PC. Overrides the vector icon with your custom graphic or photo."
            value={config.appLogo.customImageUrl}
            onChange={(dataUrl) => updateLogo({ customImageUrl: dataUrl })}
            onClear={() => updateLogo({ customImageUrl: undefined })}
            placeholderText="Upload app logo / icon from your device"
            previewShape="square"
          />
        </div>
      </div>

      {/* Color Palettes */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Palette className="text-emerald-400" size={18} />
          Theme Color & System Palettes
        </h3>

        {/* Quick presets */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Curated Android Palettes
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {THEME_PALETTES.map((pal) => (
              <button
                key={pal.name}
                type="button"
                onClick={() =>
                  update({
                    themeColor: pal.theme,
                    backgroundColor: pal.bg,
                    accentColor: pal.accent,
                    topBar: { ...config.topBar, bgColor: pal.theme },
                    navigation: {
                      ...config.navigation,
                      drawerHeader: {
                        ...config.navigation.drawerHeader,
                        bannerColor: pal.theme,
                      },
                    },
                  })
                }
                className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-800/80 border border-slate-700 hover:border-slate-500 transition text-left group"
              >
                <div className="flex -space-x-1">
                  <span
                    className="w-4 h-4 rounded-full border border-slate-900"
                    style={{ backgroundColor: pal.theme }}
                  />
                  <span
                    className="w-4 h-4 rounded-full border border-slate-900"
                    style={{ backgroundColor: pal.accent }}
                  />
                </div>
                <span className="text-xs text-slate-300 font-medium group-hover:text-white truncate">
                  {pal.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Manual color inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Primary Theme Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.themeColor}
                onChange={(e) => update({ themeColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={config.themeColor}
                onChange={(e) => update({ themeColor: e.target.value })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              App Background Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={config.backgroundColor}
                onChange={(e) => update({ backgroundColor: e.target.value })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.accentColor}
                onChange={(e) => update({ accentColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
              />
              <input
                type="text"
                value={config.accentColor}
                onChange={(e) => update({ accentColor: e.target.value })}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      <IconPickerModal
        isOpen={isIconModalOpen}
        currentIcon={config.appLogo.icon}
        onSelect={(icon) => updateLogo({ icon })}
        onClose={() => setIsIconModalOpen(false)}
        title="Choose App Logo Icon"
      />
    </div>
  );
};
