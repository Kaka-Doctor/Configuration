import React from 'react';
import { AppConfig } from '../../types/appConfig';
import { ImageUploadField } from '../common/ImageUploadField';
import { Share2, LayoutTemplate, Palette, Sparkles, Sliders } from 'lucide-react';

interface TopBarEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

export const TopBarEditor: React.FC<TopBarEditorProps> = ({ config, onChange }) => {
  const updateTopBar = (partial: Partial<AppConfig['topBar']>) => {
    onChange({
      ...config,
      topBar: { ...config.topBar, ...partial },
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Top Bar Status Toggle */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <LayoutTemplate className="text-indigo-400" size={18} />
            Android Top App Bar (Header)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Provides brand identity, navigation menu toggle, and instant action buttons like sharing.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={config.topBar.enabled}
            onChange={(e) => updateTopBar({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {config.topBar.enabled && (
        <>
          {/* Title and Branding */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Header Display</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Top Bar Title Text
                </label>
                <input
                  type="text"
                  value={config.topBar.title}
                  onChange={(e) => updateTopBar({ title: e.target.value })}
                  placeholder="e.g. Apex Portal"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  App Bar Style
                </label>
                <div className="flex items-center gap-2">
                  {(['flat', 'elevated', 'glass'] as const).map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => updateTopBar({ style })}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs capitalize font-medium transition ${
                        config.topBar.style === style
                          ? 'bg-indigo-600 text-white font-semibold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">
                  Show App Logo Icon in Top Bar
                </span>
                <span className="text-[11px] text-slate-400">
                  Renders your custom app logo icon next to the header title
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.topBar.showLogo}
                  onChange={(e) => updateTopBar({ showLogo: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Custom Header Logo Upload */}
            {config.topBar.showLogo && (
              <div className="pt-2 border-t border-slate-800">
                <ImageUploadField
                  label="Custom Header Logo Image from Device (Optional)"
                  description="Upload a custom header brand badge (PNG, JPG, SVG, WebP) to display directly in the top app header."
                  value={config.topBar.customLogoUrl}
                  onChange={(dataUrl) => updateTopBar({ customLogoUrl: dataUrl })}
                  onClear={() => updateTopBar({ customLogoUrl: undefined })}
                  placeholderText="Upload top bar brand logo from your device"
                  previewShape="rounded"
                />
              </div>
            )}
          </div>

          {/* Top Bar Action Buttons (Sharing, Refresh, Search, Menu) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders size={16} className="text-pink-400" />
              Action Buttons & Clickable Icons
            </h4>

            {/* Sharing Button Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-indigo-950/30 border border-indigo-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center">
                  <Share2 size={18} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white block flex items-center gap-1.5">
                    Share Button (Native Web Share API)
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Recommended
                    </span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Allows users to share this app directly to WhatsApp, Twitter, Messages, or clipboard.
                  </span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.topBar.showShareButton}
                  onChange={(e) => updateTopBar({ showShareButton: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Menu Toggle */}
            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">
                  Show Navigation Menu Toggle (Hamburger)
                </span>
                <span className="text-[11px] text-slate-400">
                  Opens the Android side drawer when tapped
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.topBar.showMenuToggle}
                  onChange={(e) => updateTopBar({ showMenuToggle: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">
                  Show Refresh Button
                </span>
                <span className="text-[11px] text-slate-400">
                  Reloads current website view or launchpad state
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.topBar.showRefreshButton}
                  onChange={(e) => updateTopBar({ showRefreshButton: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {/* Search Button */}
            <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">
                  Show Search Icon
                </span>
                <span className="text-[11px] text-slate-400">
                  Opens quick module search in the app
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.topBar.showSearchButton}
                  onChange={(e) => updateTopBar({ showSearchButton: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Top Bar Colors */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Palette size={16} className="text-emerald-400" />
              Header Colors
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.topBar.bgColor}
                    onChange={(e) => updateTopBar({ bgColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.topBar.bgColor}
                    onChange={(e) => updateTopBar({ bgColor: e.target.value })}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Text & Icon Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.topBar.textColor}
                    onChange={(e) => updateTopBar({ textColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.topBar.textColor}
                    onChange={(e) => updateTopBar({ textColor: e.target.value })}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
