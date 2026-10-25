import React, { useState, useEffect } from 'react';
import { AppConfig } from './types/appConfig';
import { DEFAULT_APP_CONFIG, PRESET_TEMPLATES } from './utils/presets';
import { DeviceSimulator } from './components/DeviceSimulator';
import { BrandingEditor } from './components/editor/BrandingEditor';
import { SplashEditor } from './components/editor/SplashEditor';
import { TopBarEditor } from './components/editor/TopBarEditor';
import { MenuEditor } from './components/editor/MenuEditor';
import { ContentModeEditor } from './components/editor/ContentModeEditor';
import { TemplatesModal } from './components/editor/TemplatesModal';
import { GitHubExportModal } from './components/editor/GitHubExportModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { AndroidSdkEditor } from './components/editor/AndroidSdkEditor';
import { AdMobEditor } from './components/editor/AdMobEditor';
import { KeystoreEditor } from './components/editor/KeystoreEditor';
import {
  Smartphone,
  Sparkles,
  LayoutTemplate,
  Layers,
  Menu as MenuIcon,
  Globe,
  Download,
  FolderGit2,
  RotateCcw,
  Palette,
  ExternalLink,
  CheckCircle,
  HelpCircle,
  Cpu,
  DollarSign,
  Key,
} from 'lucide-react';

type StudioTab =
  | 'branding'
  | 'splash'
  | 'topbar'
  | 'menu'
  | 'content'
  | 'sdk'
  | 'admob'
  | 'keystore';

export default function App() {
  const [config, setConfig] = useState<AppConfig>(() => {
    try {
      const saved = localStorage.getItem('appcraft_config_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        const targetSdk = parsed.androidSdk?.targetSdk === 35 ? 36 : (parsed.androidSdk?.targetSdk || 36);
        const compileSdk = parsed.androidSdk?.compileSdk === 35 ? 36 : (parsed.androidSdk?.compileSdk || 36);
        return {
          ...DEFAULT_APP_CONFIG,
          ...parsed,
          androidSdk: {
            ...DEFAULT_APP_CONFIG.androidSdk,
            ...parsed.androidSdk,
            targetSdk,
            compileSdk,
          },
        };
      }
    } catch {}
    return DEFAULT_APP_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<StudioTab>('branding');
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [saveBanner, setSaveBanner] = useState(false);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('appcraft_config_v1', JSON.stringify(config));
      setSaveBanner(true);
      const timer = setTimeout(() => setSaveBanner(false), 1500);
      return () => clearTimeout(timer);
    } catch {}
  }, [config]);

  const handleResetToDefault = () => {
    if (window.confirm('Reset app design to default Enterprise Portal template?')) {
      setConfig(DEFAULT_APP_CONFIG);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Studio Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white tracking-tight">AppCraft Studio</h1>
              <span className="hidden sm:inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Android & PWA Creator
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Visual builder for Android apps, splash screens, menus & GitHub repos
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5">
          {/* Templates Trigger */}
          <button
            onClick={() => setIsTemplatesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Sparkles size={14} className="text-amber-400" />
            <span className="hidden sm:inline">Templates & Designs</span>
            <span className="sm:hidden">Templates</span>
          </button>

          {/* GitHub & Export Center */}
          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
          >
            <FolderGit2 size={15} />
            <span>GitHub & Export</span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 gap-8 items-start">
        {/* Left Column: Visual Customizer Tabs & Controls */}
        <div id="studio-editor-section" className="w-full lg:w-7/12 flex flex-col space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-x-auto w-full">
            {[
              { id: 'branding', label: 'Identity & Logo', icon: Palette },
              { id: 'splash', label: 'Splash Screen', icon: Sparkles },
              { id: 'topbar', label: 'Top App Bar', icon: LayoutTemplate },
              { id: 'menu', label: 'Menu & Navigation', icon: MenuIcon },
              { id: 'content', label: 'Main Screen View', icon: Globe },
              { id: 'sdk', label: 'SDK & Versions', icon: Cpu },
              { id: 'admob', label: 'AdMob Ads', icon: DollarSign },
              { id: 'keystore', label: 'Keystore & Signing', icon: Key },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as StudioTab)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition flex-1 justify-center ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <IconComp size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Tab Content */}
          <div className="transition-all duration-200">
            {activeTab === 'branding' && (
              <BrandingEditor config={config} onChange={setConfig} />
            )}
            {activeTab === 'splash' && (
              <SplashEditor config={config} onChange={setConfig} />
            )}
            {activeTab === 'topbar' && (
              <TopBarEditor config={config} onChange={setConfig} />
            )}
            {activeTab === 'menu' && (
              <MenuEditor config={config} onChange={setConfig} />
            )}
            {activeTab === 'content' && (
              <ContentModeEditor config={config} onChange={setConfig} />
            )}
            {activeTab === 'sdk' && (
              <AndroidSdkEditor config={config} onChange={setConfig} />
            )}
            {activeTab === 'admob' && (
              <AdMobEditor config={config} onChange={setConfig} />
            )}
            {activeTab === 'keystore' && (
              <KeystoreEditor config={config} onChange={setConfig} />
            )}
          </div>

          {/* Quick Actions & Reset Bar */}
          <div className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800 rounded-2xl text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                {saveBanner ? 'Changes autosaved' : 'Live preview syncing automatically'}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleResetToDefault}
                className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition"
              >
                <RotateCcw size={13} />
                <span>Reset to Default</span>
              </button>

              <button
                onClick={() => setIsExportOpen(true)}
                className="text-indigo-400 font-semibold hover:text-indigo-300 transition"
              >
                View Generated Code →
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive Android Device Simulator */}
        <div id="simulator-preview-section" className="w-full lg:w-5/12 flex flex-col items-center sticky top-24">
          <DeviceSimulator config={config} />
        </div>
      </main>

      {/* Mobile Floating Quick Jump Button */}
      <div className="lg:hidden fixed bottom-5 right-5 z-40">
        <button
          onClick={() => {
            const simEl = document.getElementById('simulator-preview-section');
            if (simEl) {
              const rect = simEl.getBoundingClientRect();
              if (rect.top > 200) {
                simEl.scrollIntoView({ behavior: 'smooth' });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-indigo-600 text-white font-semibold text-xs shadow-xl shadow-indigo-600/40 border border-indigo-400 hover:bg-indigo-500 transition active:scale-95"
        >
          <Smartphone size={16} />
          <span>Toggle View / Phone</span>
        </button>
      </div>

      {/* Footer / Hosting Help */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-300">AppCraft Android PWA Studio</span>
            <span>—</span>
            <span>Ready for GitHub Pages, Google Play Store (TWA), and Capacitor APK</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setIsTemplatesOpen(true)}
              className="hover:text-slate-200 transition"
            >
              Browse 4 Preset Designs
            </button>
            <button
              onClick={() => setIsExportOpen(true)}
              className="hover:text-slate-200 transition"
            >
              GitHub Export Center
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <TemplatesModal
        isOpen={isTemplatesOpen}
        currentAppName={config.appName}
        onApplyTemplate={(newConfig) => setConfig(newConfig)}
        onClose={() => setIsTemplatesOpen(false)}
      />

      <GitHubExportModal
        isOpen={isExportOpen}
        config={config}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}
