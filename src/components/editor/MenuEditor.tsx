import React, { useState } from 'react';
import type { AppConfig, MenuItem, MenuActionType, SubmenuLink } from '../../types/appConfig';
import { renderAppIcon } from '../../utils/iconMap';
import { IconPickerModal } from '../IconPickerModal';
import { ImageUploadField } from '../common/ImageUploadField';
import { SubmenuLinksEditor } from './SubmenuLinksEditor';
import {
  Menu as MenuIcon,
  Plus,
  Trash2,
  ExternalLink,
  FileCode,
  Share2,
  Mail,
  ChevronDown,
  FolderTree,
  Bell,
  Star,
  Home,
  SquareArrowOutUpRight,
} from 'lucide-react';

function defaultSubmenuChildren(): SubmenuLink[] {
  return [
    {
      id: `sm-${Date.now()}-1`,
      label: 'Our Website',
      description: 'Open the live site',
      icon: 'Globe',
      actionType: 'website',
      targetUrl: 'https://example.com',
    },
    {
      id: `sm-${Date.now()}-2`,
      label: 'Help & Guide',
      description: 'Read this section offline inside the app',
      icon: 'FileText',
      actionType: 'html-page',
      targetHtml: '<h2>Help & Guide</h2><p>Add your own content for this section.</p>',
    },
  ];
}

function actionSummary(item: MenuItem): string {
  switch (item.actionType) {
    case 'website':
      return `🔗 ${item.targetUrl || 'Website URL'}`;
    case 'html-page':
      return '📄 Embedded HTML Document';
    case 'share':
      return '🚀 Native Share';
    case 'contact':
      return '✉️ Contact / Support';
    case 'about':
      return 'ℹ️ About page';
    case 'submenu':
      return `📂 ${item.children?.length || 0} nested destinations`;
    default:
      return '';
  }
}

const inputClass =
  'w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs';

const ToggleRow: React.FC<{
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
}> = ({ checked, onChange, label, hint, icon }) => (
  <label className="flex items-start justify-between gap-2 p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/70 cursor-pointer">
    <span className="flex items-start gap-2">
      {icon}
      <span>
        <span className="text-xs text-slate-200 block">{label}</span>
        {hint && <span className="text-[10px] text-slate-500 block mt-0.5">{hint}</span>}
      </span>
    </span>
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="accent-indigo-500 w-4 h-4 mt-0.5"
    />
  </label>
);

interface MenuItemListProps {
  items: MenuItem[];
  onChange: (items: MenuItem[]) => void;
  title: string;
  description: string;
  addLabel: string;
}

const MenuItemList: React.FC<MenuItemListProps> = ({
  items,
  onChange,
  title,
  description,
  addLabel,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(items[0]?.id || null);
  const [iconPickerId, setIconPickerId] = useState<string | null>(null);

  const addItem = () => {
    const newItem: MenuItem = {
      id: `m-${Date.now()}`,
      label: 'New Menu Link',
      icon: 'Globe',
      actionType: 'website',
      targetUrl: 'https://example.com',
      showOnHome: true,
    };
    onChange([...items, newItem]);
    setExpandedId(newItem.id);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, partial: Partial<MenuItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...partial } : item)));
  };

  const activeItem = items.find((item) => item.id === iconPickerId);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-white">
            {title} ({items.length})
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition whitespace-nowrap"
        >
          <Plus size={15} />
          <span>{addLabel}</span>
        </button>
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-700 rounded-xl">
            No destinations yet. Use “{addLabel}” to create the first one.
          </div>
        )}

        {items.map((item, index) => {
          const isExpanded = expandedId === item.id;
          return (
            <div
              key={item.id}
              className="border border-slate-800 bg-slate-800/40 rounded-xl overflow-hidden transition"
            >
              {/* Collapsed bar */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
                className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer hover:bg-slate-800/80 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-indigo-400 shrink-0">
                    {renderAppIcon(item.icon, 16)}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-white text-sm">{item.label}</span>
                    <span className="text-[11px] text-slate-400 ml-2 break-all">
                      {actionSummary(item)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {item.showOnHome === false && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
                      hidden
                    </span>
                  )}
                  {item.rewardedAd && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 flex items-center gap-0.5">
                      <Star size={9} /> ad
                    </span>
                  )}
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
                    className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Expanded form */}
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
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Icon</label>
                      <button
                        type="button"
                        onClick={() => setIconPickerId(item.id)}
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
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <ImageUploadField
                    label="Custom Menu Image (optional)"
                    description="Replaces the icon for this row. PNG/JPG/WebP/SVG."
                    value={item.customImageUrl}
                    onChange={(dataUrl) => updateItem(item.id, { customImageUrl: dataUrl })}
                    onClear={() => updateItem(item.id, { customImageUrl: undefined })}
                    placeholderText="Upload an image for this menu row"
                    previewShape="square"
                    maxDimension={256}
                  />

                  {/* Where it appears */}
                  <div>
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Visibility & behaviour
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <ToggleRow
                        checked={item.showOnHome !== false}
                        onChange={(value) => updateItem(item.id, { showOnHome: value })}
                        label="Show on main screen"
                        hint="Bottom nav / launchpad home"
                        icon={<Home size={13} className="text-emerald-400 mt-0.5" />}
                      />
                      <ToggleRow
                        checked={Boolean(item.openExternally)}
                        onChange={(value) => updateItem(item.id, { openExternally: value })}
                        label="Open outside the app"
                        hint="Otherwise it opens in the in-app browser"
                        icon={<SquareArrowOutUpRight size={13} className="text-sky-400 mt-0.5" />}
                      />
                      <ToggleRow
                        checked={Boolean(item.rewardedAd)}
                        onChange={(value) => updateItem(item.id, { rewardedAd: value })}
                        label="Rewarded ad first"
                        hint="A short video plays before this section opens"
                        icon={<Star size={13} className="text-amber-400 mt-0.5" />}
                      />
                      <ToggleRow
                        checked={Boolean(item.nativeAd)}
                        onChange={(value) => updateItem(item.id, { nativeAd: value })}
                        label="Native ad inside content"
                        hint="Shows a sponsored block in this destination"
                        icon={<Bell size={13} className="text-rose-400 mt-0.5" />}
                      />
                    </div>
                  </div>

                  {/* Action type */}
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Click Action Destination
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                      {[
                        { id: 'website', label: 'Website', icon: ExternalLink },
                        { id: 'html-page', label: 'HTML Page', icon: FileCode },
                        { id: 'share', label: 'Share', icon: Share2 },
                        { id: 'contact', label: 'Contact', icon: Mail },
                        { id: 'about', label: 'About', icon: Star },
                        { id: 'submenu', label: 'Submenu', icon: FolderTree },
                      ].map((act) => {
                        const IconComp = act.icon;
                        return (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => {
                              const patch: Partial<MenuItem> = {
                                actionType: act.id as MenuActionType,
                              };
                              if (
                                act.id === 'submenu' &&
                                (!item.children || item.children.length < 2)
                              ) {
                                patch.children = defaultSubmenuChildren();
                              }
                              updateItem(item.id, patch);
                            }}
                            className={`flex items-center gap-1.5 p-2 rounded-lg text-xs font-medium transition ${
                              item.actionType === act.id
                                ? act.id === 'submenu'
                                  ? 'bg-violet-600 text-white font-semibold'
                                  : 'bg-indigo-600 text-white font-semibold'
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

                  {(item.actionType === 'website' || item.actionType === 'contact') && (
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">
                        {item.actionType === 'website'
                          ? 'Destination Website URL'
                          : 'Email Address / URL'}
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
                        className={`${inputClass} font-mono`}
                      />
                    </div>
                  )}

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
                        className={`${inputClass} font-mono p-2.5`}
                      />
                      <span className="text-[11px] text-slate-500">
                        Renders instantly inside the Android app without requiring internet
                        connection.
                      </span>
                    </div>
                  )}

                  {item.actionType === 'submenu' && (
                    <SubmenuLinksEditor
                      links={item.children || []}
                      onChange={(links) => updateItem(item.id, { children: links })}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeItem && (
        <IconPickerModal
          isOpen={true}
          currentIcon={activeItem.icon}
          onSelect={(icon) => updateItem(activeItem.id, { icon })}
          onClose={() => setIconPickerId(null)}
          title="Choose Menu Item Icon"
        />
      )}
    </div>
  );
};

interface MenuEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

export const MenuEditor: React.FC<MenuEditorProps> = ({ config, onChange }) => {
  const bottomNavItems = config.navigation.bottomNavItems || [];

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

  const showsDrawerHeader =
    config.navigation.type === 'drawer' || config.navigation.type === 'both';
  const showsItemList = config.navigation.type !== 'bottom-nav';
  const showsBottomBar =
    config.navigation.type === 'bottom-nav' || config.navigation.type === 'both';

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Menu Variety Selector */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <MenuIcon className="text-indigo-400" size={18} />
          Menu Architecture & Layout Variety
        </h3>
        <p className="text-xs text-slate-400">
          Choose which style of navigation menu your Android app presents to the user. “Drawer +
          Bottom Bar” shows both at once, each with its own destinations.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-1">
          {[
            {
              id: 'drawer' as const,
              name: 'Android Drawer',
              badge: 'Most Popular',
              desc: 'Slide-out side menu from the hamburger icon, with an editable header.',
            },
            {
              id: 'bottom-nav' as const,
              name: 'Bottom Navigation',
              badge: 'Modern App',
              desc: 'Fixed bottom bar with quick thumb access and active indicators.',
            },
            {
              id: 'both' as const,
              name: 'Drawer + Bottom Bar',
              badge: 'Both at once',
              desc: 'Hamburger drawer and bottom bar together, with different contents in each.',
            },
            {
              id: 'top-tabs' as const,
              name: 'Top Tabs Bar',
              badge: 'Editorial/Feed',
              desc: 'Horizontal tabs right underneath the top app header.',
            },
          ].map((type) => (
            <button
              key={type.id}
              type="button"
              onClick={() => updateNav({ type: type.id })}
              className={`p-4 rounded-xl border text-left transition flex flex-col justify-between ${
                config.navigation.type === type.id
                  ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-md'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-white">{type.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 border border-slate-700 whitespace-nowrap">
                    {type.badge}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">{type.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drawer Header Customization */}
      {showsDrawerHeader && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-white">Drawer Header Appearance</h4>
          <p className="text-[11px] text-slate-500">
            With “Drawer + Bottom Bar”, these items appear in the slide-out drawer only.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Drawer Header Title
              </label>
              <input
                type="text"
                value={config.navigation.drawerHeader.title}
                onChange={(e) => updateDrawerHeader({ title: e.target.value })}
                className={inputClass}
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
                className={inputClass}
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

            {config.navigation.drawerHeader.showUserAvatar && (
              <div className="pt-2 border-t border-slate-800">
                <ImageUploadField
                  label="Upload Drawer Profile / Avatar Image"
                  description="Custom profile photo or avatar from your device to show at the top of the navigation drawer."
                  value={config.navigation.drawerHeader.customAvatarUrl}
                  onChange={(dataUrl) => updateDrawerHeader({ customAvatarUrl: dataUrl })}
                  onClear={() => updateDrawerHeader({ customAvatarUrl: undefined })}
                  placeholderText="Upload drawer avatar image"
                  previewShape="circle"
                  maxDimension={256}
                />
              </div>
            )}

            <div className="pt-2 border-t border-slate-800">
              <ImageUploadField
                label="Upload Drawer Header Banner Background (Optional)"
                description="Custom backdrop header image (PNG, JPG, WebP) for the slide-out navigation menu."
                value={config.navigation.drawerHeader.customBannerUrl}
                onChange={(dataUrl) => updateDrawerHeader({ customBannerUrl: dataUrl })}
                onClear={() => updateDrawerHeader({ customBannerUrl: undefined })}
                placeholderText="Upload drawer header banner background"
                previewShape="banner"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main / drawer items */}
      {showsItemList && (
        <MenuItemList
          items={config.navigation.items}
          onChange={(items) => updateNav({ items })}
          title={
            config.navigation.type === 'top-tabs'
              ? 'Top Tab Items'
              : config.navigation.type === 'both'
                ? 'Drawer Menu Links & Items'
                : 'Menu Links & Items'
          }
          description="Each one can open a site, HTML page, submenu or the share sheet. Use the toggles to hide it from the home screen or add rewarded / native ads."
          addLabel="Add Menu Item"
        />
      )}

      {/* Bottom navigation items */}
      {showsBottomBar && (
        <MenuItemList
          items={bottomNavItems}
          onChange={(items) => updateNav({ bottomNavItems: items })}
          title={
            config.navigation.type === 'both'
              ? 'Bottom Bar Destinations (separate from the drawer)'
              : 'Bottom Navigation Items'
          }
          description="These entries appear in the bottom bar. With Drawer + Bottom Bar they are completely independent from the drawer list."
          addLabel="Add Bottom Item"
        />
      )}

      {config.navigation.type === 'top-tabs' && (
        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-950/20 text-xs text-amber-200">
          Top tabs use the menu items above as their source. Switch to “Drawer + Bottom Bar” to
          control a drawer and a bottom bar separately.
        </div>
      )}
    </div>
  );
};
