import React, { useState } from 'react';
import { AppConfig, LaunchpadIconItem } from '../../types/appConfig';
import { renderAppIcon } from '../../utils/iconMap';
import { IconPickerModal } from '../IconPickerModal';
import {
  Globe,
  LayoutGrid,
  Plus,
  Trash2,
  ExternalLink,
  FileCode,
  Sparkles,
  ChevronDown,
} from 'lucide-react';

interface ContentModeEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

const PRESET_WEBSITES = [
  { label: 'Wikipedia Android', url: 'https://en.wikipedia.org/wiki/Android_(operating_system)' },
  { label: 'PWA Guide', url: 'https://en.wikipedia.org/wiki/Progressive_web_app' },
  { label: 'Hacker News', url: 'https://news.ycombinator.com' },
  { label: 'Demo E-Commerce', url: 'https://dummyjson.com/products' },
];

export const ContentModeEditor: React.FC<ContentModeEditorProps> = ({ config, onChange }) => {
  const [activeIconModalItemIndex, setActiveIconModalItemIndex] = useState<number | null>(null);
  const [expandedCardId, setExpandedCardId] = useState<string | null>(
    config.launchpadConfig.icons[0]?.id || null
  );

  const setContentMode = (mode: 'website' | 'launchpad') => {
    onChange({ ...config, contentMode: mode });
  };

  const updateWebsite = (partial: Partial<AppConfig['websiteConfig']>) => {
    onChange({
      ...config,
      websiteConfig: { ...config.websiteConfig, ...partial },
    });
  };

  const updateLaunchpad = (partial: Partial<AppConfig['launchpadConfig']>) => {
    onChange({
      ...config,
      launchpadConfig: { ...config.launchpadConfig, ...partial },
    });
  };

  const addLaunchpadIcon = () => {
    const newIcon: LaunchpadIconItem = {
      id: `lp-${Date.now()}`,
      title: 'New App Feature',
      description: 'Tap to view document or open link',
      icon: 'Sparkles',
      category: 'General',
      actionType: 'website',
      targetUrl: 'https://example.com',
      color: '#3b82f6',
    };
    updateLaunchpad({
      icons: [...config.launchpadConfig.icons, newIcon],
    });
    setExpandedCardId(newIcon.id);
  };

  const removeLaunchpadIcon = (id: string) => {
    updateLaunchpad({
      icons: config.launchpadConfig.icons.filter((i) => i.id !== id),
    });
  };

  const updateIconItem = (id: string, partial: Partial<LaunchpadIconItem>) => {
    updateLaunchpad({
      icons: config.launchpadConfig.icons.map((i) => (i.id === id ? { ...i, ...partial } : i)),
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Mode Selector */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Sparkles className="text-indigo-400" size={18} />
          Main Screen Layout Mode
        </h3>
        <p className="text-xs text-slate-400">
          Decide whether your Android app renders a direct website in the center or an interactive grid of launchpad icons.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Mode 1: Website */}
          <button
            type="button"
            onClick={() => setContentMode('website')}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              config.contentMode === 'website'
                ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
                <Globe size={18} className="text-indigo-400" />
                <span>Website / WebView Mode</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Wraps an existing website so it displays directly in the center of the Android app with optional address bar and controls.
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-indigo-400">
              {config.contentMode === 'website' ? '✓ Currently Active' : 'Select Mode'}
            </div>
          </button>

          {/* Mode 2: Launchpad */}
          <button
            type="button"
            onClick={() => setContentMode('launchpad')}
            className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
              config.contentMode === 'launchpad'
                ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 font-semibold text-white mb-1.5">
                <LayoutGrid size={18} className="text-pink-400" />
                <span>Launchpad / Icons Grid Mode</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Puts interactive icons on the screen. Clicking takes the user to specified websites or embedded offline HTML files!
              </p>
            </div>
            <div className="mt-4 text-[11px] font-semibold text-pink-400">
              {config.contentMode === 'launchpad' ? '✓ Currently Active' : 'Select Mode'}
            </div>
          </button>
        </div>
      </div>

      {/* Mode A: Website Configuration */}
      {config.contentMode === 'website' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Globe size={16} className="text-indigo-400" />
            Website WebView Settings
          </h4>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Target Website URL
            </label>
            <input
              type="url"
              value={config.websiteConfig.url}
              onChange={(e) => updateWebsite({ url: e.target.value })}
              placeholder="https://yourwebsite.com"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          {/* Quick preset URLs */}
          <div>
            <span className="text-[11px] text-slate-400 block mb-1.5">
              Quick Test Websites:
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESET_WEBSITES.map((site) => (
                <button
                  key={site.url}
                  type="button"
                  onClick={() => updateWebsite({ url: site.url })}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                >
                  {site.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <div>
              <span className="text-xs font-medium text-white block">
                Show Simulated Address Bar
              </span>
              <span className="text-[11px] text-slate-400">
                Displays the URL security badge and domain at the top of the viewport
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.websiteConfig.showAddressBar}
                onChange={(e) => updateWebsite({ showAddressBar: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
            </label>
          </div>
        </div>
      )}

      {/* Mode B: Launchpad / Icons Grid Configuration */}
      {config.contentMode === 'launchpad' && (
        <>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Grid Header & Layout</h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Section Heading
                </label>
                <input
                  type="text"
                  value={config.launchpadConfig.heading}
                  onChange={(e) => updateLaunchpad({ heading: e.target.value })}
                  placeholder="e.g. Quick Access Hub"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Subheading
                </label>
                <input
                  type="text"
                  value={config.launchpadConfig.subheading}
                  onChange={(e) => updateLaunchpad({ subheading: e.target.value })}
                  placeholder="e.g. Tap any module to launch"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Columns Layout
                </label>
                <div className="flex items-center gap-2">
                  {[2, 3, 4].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => updateLaunchpad({ columns: cols as any })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold transition ${
                        config.launchpadConfig.columns === cols
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cols} Cols
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Screen Icons List */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">
                  Interactive App Icons ({config.launchpadConfig.icons.length})
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure clickable cards that open external websites or embedded HTML files.
                </p>
              </div>

              <button
                type="button"
                onClick={addLaunchpadIcon}
                className="px-3 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus size={15} />
                <span>Add App Icon</span>
              </button>
            </div>

            <div className="space-y-3">
              {config.launchpadConfig.icons.map((iconItem, index) => {
                const isExpanded = expandedCardId === iconItem.id;
                return (
                  <div
                    key={iconItem.id}
                    className="border border-slate-800 bg-slate-800/40 rounded-xl overflow-hidden transition"
                  >
                    {/* Header */}
                    <div
                      onClick={() => setExpandedCardId(isExpanded ? null : iconItem.id)}
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/80 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                          style={{ backgroundColor: iconItem.color }}
                        >
                          {renderAppIcon(iconItem.icon, 16)}
                        </div>
                        <div>
                          <span className="font-semibold text-white text-sm">
                            {iconItem.title}
                          </span>
                          <span className="text-[11px] text-slate-400 ml-2">
                            {iconItem.actionType === 'website'
                              ? `🔗 ${iconItem.targetUrl || 'Website'}`
                              : '📄 HTML Document'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {iconItem.badge && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full text-white font-semibold"
                            style={{ backgroundColor: iconItem.badgeColor || iconItem.color }}
                          >
                            {iconItem.badge}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLaunchpadIcon(iconItem.id);
                          }}
                          className="p-1 text-slate-500 hover:text-rose-400 transition"
                          aria-label="Delete card"
                        >
                          <Trash2 size={16} />
                        </button>
                        <ChevronDown
                          size={16}
                          className={`text-slate-400 transition-transform ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {/* Body */}
                    {isExpanded && (
                      <div className="p-4 border-t border-slate-800 bg-slate-900/40 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Icon Title
                            </label>
                            <input
                              type="text"
                              value={iconItem.title}
                              onChange={(e) => updateIconItem(iconItem.id, { title: e.target.value })}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Category / Tag
                            </label>
                            <input
                              type="text"
                              value={iconItem.category}
                              onChange={(e) => updateIconItem(iconItem.id, { category: e.target.value })}
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Icon Graphic
                            </label>
                            <button
                              type="button"
                              onClick={() => setActiveIconModalItemIndex(index)}
                              className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs hover:border-pink-400 transition"
                            >
                              <span className="flex items-center gap-2">
                                {renderAppIcon(iconItem.icon, 16)}
                                <span>{iconItem.icon}</span>
                              </span>
                              <span className="text-slate-400 text-[10px]">Change</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-400 mb-1">
                            Description Text
                          </label>
                          <input
                            type="text"
                            value={iconItem.description}
                            onChange={(e) =>
                              updateIconItem(iconItem.id, { description: e.target.value })
                            }
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                          />
                        </div>

                        {/* Color & Badge */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Card Accent Color
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={iconItem.color}
                                onChange={(e) => updateIconItem(iconItem.id, { color: e.target.value })}
                                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                              />
                              <input
                                type="text"
                                value={iconItem.color}
                                onChange={(e) => updateIconItem(iconItem.id, { color: e.target.value })}
                                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Badge Label (e.g. New)
                            </label>
                            <input
                              type="text"
                              value={iconItem.badge || ''}
                              onChange={(e) => updateIconItem(iconItem.id, { badge: e.target.value })}
                              placeholder="Optional"
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Action Type
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateIconItem(iconItem.id, { actionType: 'website' })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                                  iconItem.actionType === 'website'
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                Website URL
                              </button>
                              <button
                                type="button"
                                onClick={() => updateIconItem(iconItem.id, { actionType: 'html-page' })}
                                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium transition ${
                                  iconItem.actionType === 'html-page'
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                HTML Document
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Action Target: Website URL */}
                        {iconItem.actionType === 'website' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Target Website URL
                            </label>
                            <input
                              type="url"
                              value={iconItem.targetUrl || ''}
                              onChange={(e) => updateIconItem(iconItem.id, { targetUrl: e.target.value })}
                              placeholder="https://example.com"
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs font-mono"
                            />
                          </div>
                        )}

                        {/* Action Target: HTML Content */}
                        {iconItem.actionType === 'html-page' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">
                              Embedded HTML Content (Offline File)
                            </label>
                            <textarea
                              rows={4}
                              value={iconItem.htmlContent || ''}
                              onChange={(e) => updateIconItem(iconItem.id, { htmlContent: e.target.value })}
                              placeholder="<h2>Feature Guide</h2><p>Custom content rendered inside Android app...</p>"
                              className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-hidden"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Icon Picker Modal */}
      {activeIconModalItemIndex !== null && (
        <IconPickerModal
          isOpen={true}
          currentIcon={config.launchpadConfig.icons[activeIconModalItemIndex]?.icon || 'Sparkles'}
          onSelect={(icon) => {
            const currentItem = config.launchpadConfig.icons[activeIconModalItemIndex];
            if (currentItem) {
              updateIconItem(currentItem.id, { icon });
            }
          }}
          onClose={() => setActiveIconModalItemIndex(null)}
          title="Choose Launchpad Icon"
        />
      )}
    </div>
  );
};
