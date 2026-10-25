import React, { useState } from 'react';
import { AppConfig, MenuItem, MenuActionType } from '../../types/appConfig';
import { renderAppIcon } from '../../utils/iconMap';
import { IconPickerModal } from '../IconPickerModal';
import {
  Menu as MenuIcon,
  Plus,
  Trash2,
  ExternalLink,
  FileCode,
  Share2,
  Mail,
  Sliders,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface MenuEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

export const MenuEditor: React.FC<MenuEditorProps> = ({ config, onChange }) => {
  const [activeIconPickerItemIndex, setActiveIconPickerItemIndex] = useState<number | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(
    config.navigation.items[0]?.id || null
  );

  const updateNav = (partial: Partial<AppConfig['navigation']>) => {
    onChange({
      ...config,
      navigation: { ...config.navigation, ...partial },
    });
  };

  const updateDrawerHeader = (partial: Partial<AppConfig['navigation']['drawerHeader']>) => {
    onChange({
      ...config,
      navigation: {
        ...config.navigation,
        drawerHeader: { ...config.navigation.drawerHeader, ...partial },
      },
    });
  };

  const addItem = () => {
    const newItem: MenuItem = {
      id: `m-${Date.now()}`,
      label: 'New Menu Link',
      icon: 'Globe',
      actionType: 'website',
      targetUrl: 'https://example.com',
    };
    updateNav({ items: [...config.navigation.items, newItem] });
    setExpandedItemId(newItem.id);
  };

  const removeItem = (id: string) => {
    updateNav({
      items: config.navigation.items.filter((item) => item.id !== id),
    });
  };

  const updateItem = (id: string, partial: Partial<MenuItem>) => {
    updateNav({
      items: config.navigation.items.map((item) => (item.id === id ? { ...item, ...partial } : item)),
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Menu Variety Selector */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <MenuIcon className="text-indigo-400" size={18} />
          Menu Architecture & Layout Variety
        </h3>
        <p className="text-xs text-slate-400">
          Choose which style of navigation menu your Android app presents to the user.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {[
            {
              id: 'drawer',
              name: 'Android Drawer',
              badge: 'Most Popular',
              desc: 'Slide-out side menu from hamburger icon in top bar with header profile.',
            },
            {
              id: 'bottom-nav',
              name: 'Bottom Navigation',
              badge: 'Modern App',
              desc: 'Fixed bottom bar with quick thumb access icons and active indicators.',
            },
            {
              id: 'top-tabs',
              name: 'Top Tabs Bar',
              badge: 'Editorial/Feed',
              desc: 'Horizontal swipeable tabs right underneath the top app header.',
            },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => updateNav({ type: type.id as any })}
              className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                config.navigation.type === type.id
                  ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-white">{type.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700">
                    {type.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{type.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drawer Header Customization (if drawer mode) */}
      {config.navigation.type === 'drawer' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-white">Drawer Header Appearance</h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Drawer Header Title
              </label>
              <input
                type="text"
                value={config.navigation.drawerHeader.title}
                onChange={(e) => updateDrawerHeader({ title: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Drawer Subtitle / Welcome Text
              </label>
              <input
                type="text"
                value={config.navigation.drawerHeader.subtitle}
                onChange={(e) => updateDrawerHeader({ subtitle: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-sm focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">
                Header Banner Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.navigation.drawerHeader.bannerColor}
                  onChange={(e) => updateDrawerHeader({ bannerColor: e.target.value })}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
                <input
                  type="text"
                  value={config.navigation.drawerHeader.bannerColor}
                  onChange={(e) => updateDrawerHeader({ bannerColor: e.target.value })}
                  className="w-32 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-white block">Show User Avatar Circle</span>
                <span className="text-[11px] text-slate-400">
                  Displays initial icon avatar at top of drawer
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.navigation.drawerHeader.showUserAvatar}
                  onChange={(e) => updateDrawerHeader({ showUserAvatar: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items List */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-semibold text-white">
              Menu Links & Items ({config.navigation.items.length})
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure icons, text words, website links, or custom HTML pages for each menu row.
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Plus size={15} />
            <span>Add Menu Item</span>
          </button>
        </div>

        <div className="space-y-3">
          {config.navigation.items.map((item, index) => {
            const isExpanded = expandedItemId === item.id;
            return (
              <div
                key={item.id}
                className="border border-slate-800 bg-slate-800/40 rounded-xl overflow-hidden transition"
              >
                {/* Collapsed Bar */}
                <div
                  onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                  className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-indigo-400">
                      {renderAppIcon(item.icon, 16)}
                    </div>
                    <div>
                      <span className="font-semibold text-white text-sm">{item.label}</span>
                      <span className="text-[11px] text-slate-400 ml-2">
                        {item.actionType === 'website'
                          ? `🔗 ${item.targetUrl || 'Website URL'}`
                          : item.actionType === 'html-page'
                          ? '📄 Embedded HTML Document'
                          : item.actionType === 'share'
                          ? '🚀 Native Share'
                          : '✉️ Contact / Support'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                        {item.badge}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(item.id);
                      }}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      aria-label="Delete item"
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

                {/* Expanded Item Form */}
                {isExpanded && (
                  <div className="p-4 border-t border-slate-800 bg-slate-900/40 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Item Label / Words
                        </label>
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateItem(item.id, { label: e.target.value })}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Icon
                        </label>
                        <button
                          type="button"
                          onClick={() => setActiveIconPickerItemIndex(index)}
                          className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs hover:border-indigo-400 transition"
                        >
                          <span className="flex items-center gap-2">
                            {renderAppIcon(item.icon, 16)}
                            <span>{item.icon}</span>
                          </span>
                          <span className="text-slate-400 text-[10px]">Change</span>
                        </button>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Optional Badge
                        </label>
                        <input
                          type="text"
                          value={item.badge || ''}
                          onChange={(e) => updateItem(item.id, { badge: e.target.value })}
                          placeholder="e.g. New, Hot"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs"
                        />
                      </div>
                    </div>

                    {/* Action Type */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1.5">
                        Click Action Destination
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { id: 'website', label: 'External Website', icon: ExternalLink },
                          { id: 'html-page', label: 'HTML Document', icon: FileCode },
                          { id: 'share', label: 'Native Share', icon: Share2 },
                          { id: 'contact', label: 'Support / Email', icon: Mail },
                        ].map((act) => {
                          const IconComp = act.icon;
                          return (
                            <button
                              key={act.id}
                              type="button"
                              onClick={() => updateItem(item.id, { actionType: act.id as MenuActionType })}
                              className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium transition ${
                                item.actionType === act.id
                                  ? 'bg-indigo-600 text-white font-semibold'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <IconComp size={14} />
                              <span className="truncate">{act.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Website URL Input */}
                    {(item.actionType === 'website' || item.actionType === 'contact') && (
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          {item.actionType === 'website' ? 'Destination Website URL' : 'Email Address / URL'}
                        </label>
                        <input
                          type="text"
                          value={item.targetUrl || ''}
                          onChange={(e) => updateItem(item.id, { targetUrl: e.target.value })}
                          placeholder={
                            item.actionType === 'website'
                              ? 'https://example.com/portal'
                              : 'mailto:support@example.com'
                          }
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs font-mono"
                        />
                      </div>
                    )}

                    {/* HTML Content Editor */}
                    {item.actionType === 'html-page' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">
                          Embedded HTML File Content
                        </label>
                        <textarea
                          rows={4}
                          value={item.targetHtml || ''}
                          onChange={(e) => updateItem(item.id, { targetHtml: e.target.value })}
                          placeholder="<h2>Handbook</h2><p>Your custom content here...</p>"
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white font-mono text-xs focus:outline-hidden"
                        />
                        <span className="text-[11px] text-slate-500">
                          Renders instantly inside the Android app without requiring internet connection.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Icon Picker Modal */}
      {activeIconPickerItemIndex !== null && (
        <IconPickerModal
          isOpen={true}
          currentIcon={config.navigation.items[activeIconPickerItemIndex]?.icon || 'Globe'}
          onSelect={(icon) => {
            const currentItem = config.navigation.items[activeIconPickerItemIndex];
            if (currentItem) {
              updateItem(currentItem.id, { icon });
            }
          }}
          onClose={() => setActiveIconPickerItemIndex(null)}
          title="Choose Menu Item Icon"
        />
      )}
    </div>
  );
};
