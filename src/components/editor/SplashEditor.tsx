import React, { useState } from 'react';
import { AppConfig } from '../../types/appConfig';
import { renderAppIcon } from '../../utils/iconMap';
import { IconPickerModal } from '../IconPickerModal';
import { ImageUploadField } from '../common/ImageUploadField';
import { Play, Sparkles, Clock, Palette } from 'lucide-react';

interface SplashEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
  onTriggerTest?: () => void;
}

export const SplashEditor: React.FC<SplashEditorProps> = ({ config, onChange, onTriggerTest }) => {
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);

  const updateSplash = (partial: Partial<AppConfig['splashScreen']>) => {
    onChange({
      ...config,
      splashScreen: { ...config.splashScreen, ...partial },
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Enable & Test Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="text-amber-400" size={18} />
            Android Splash Screen
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Displayed upon cold launch while application assets and cache initialize.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.splashScreen.enabled}
              onChange={(e) => updateSplash({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>

      {config.splashScreen.enabled && (
        <>
          {/* Content & Texts */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Splash Screen Content</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Launch Title
                </label>
                <input
                  type="text"
                  value={config.splashScreen.title}
                  onChange={(e) => updateSplash({ title: e.target.value })}
                  placeholder="e.g. Apex Portal"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Slogan / Subtitle
                </label>
                <input
                  type="text"
                  value={config.splashScreen.subtitle}
                  onChange={(e) => updateSplash({ subtitle: e.target.value })}
                  placeholder="e.g. Connecting you securely"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Splash Logo Picker */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Center Splash Icon
              </label>
              <div className="flex items-center gap-4 p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-white shadow-md">
                  {renderAppIcon(config.splashScreen.logoIcon, 28)}
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => setIsIconModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition"
                  >
                    Select Icon ({config.splashScreen.logoIcon})
                  </button>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Rendered with pulsing entry animation on device launch.
                  </p>
                </div>
              </div>
            </div>

            {/* Custom Splash Image Upload */}
            <div className="pt-2 border-t border-slate-800">
              <ImageUploadField
                label="Or Upload Custom Splash Image / Graphic from Device"
                description="Upload your high-res splash logo or brand graphic (PNG, JPG, WebP, SVG). Overrides the vector icon on the cold launch screen."
                value={config.splashScreen.customImageUrl}
                onChange={(dataUrl) => updateSplash({ customImageUrl: dataUrl })}
                onClear={() => updateSplash({ customImageUrl: undefined })}
                placeholderText="Upload splash graphic / logo from your device"
                previewShape="rounded"
              />
            </div>
          </div>

          {/* Background & Colors */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Palette size={16} className="text-indigo-400" />
              Background Styling
            </h4>

            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400">Background Style:</span>
              <button
                type="button"
                onClick={() => updateSplash({ bgType: 'color' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  config.splashScreen.bgType === 'color'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Solid Color
              </button>
              <button
                type="button"
                onClick={() => updateSplash({ bgType: 'gradient' })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  config.splashScreen.bgType === 'gradient'
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Linear Gradient
              </button>
            </div>

            {config.splashScreen.bgType === 'color' ? (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  Splash Background Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={config.splashScreen.bgColor}
                    onChange={(e) => updateSplash({ bgColor: e.target.value })}
                    className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                  />
                  <input
                    type="text"
                    value={config.splashScreen.bgColor}
                    onChange={(e) => updateSplash({ bgColor: e.target.value })}
                    className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Gradient Start
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.splashScreen.gradientFrom}
                      onChange={(e) => updateSplash({ gradientFrom: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.splashScreen.gradientFrom}
                      onChange={(e) => updateSplash({ gradientFrom: e.target.value })}
                      className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Gradient End
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={config.splashScreen.gradientTo}
                      onChange={(e) => updateSplash({ gradientTo: e.target.value })}
                      className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                    />
                    <input
                      type="text"
                      value={config.splashScreen.gradientTo}
                      onChange={(e) => updateSplash({ gradientTo: e.target.value })}
                      className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Timing & Loader */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white flex items-center gap-2">
              <Clock size={16} className="text-sky-400" />
              Duration & Loading Indicator
            </h4>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400">Display Duration:</span>
                <span className="font-semibold text-white font-mono">
                  {config.splashScreen.durationSeconds} seconds
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="4.0"
                step="0.1"
                value={config.splashScreen.durationSeconds}
                onChange={(e) => updateSplash({ durationSeconds: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>0.5s (Fast)</span>
                <span>2.0s (Standard)</span>
                <span>4.0s (Extended)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <div>
                <span className="text-xs font-medium text-white block">
                  Show Loading Spinner
                </span>
                <span className="text-[11px] text-slate-400">
                  Indicates asset warmup to the user
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.splashScreen.showSpinner}
                  onChange={(e) => updateSplash({ showSpinner: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </>
      )}

      <IconPickerModal
        isOpen={isIconModalOpen}
        currentIcon={config.splashScreen.logoIcon}
        onSelect={(icon) => updateSplash({ logoIcon: icon })}
        onClose={() => setIsIconModalOpen(false)}
        title="Choose Splash Screen Logo"
      />
    </div>
  );
};
