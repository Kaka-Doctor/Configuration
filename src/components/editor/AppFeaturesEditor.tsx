import React from 'react';
import type { AppConfig } from '../../types/appConfig';
import {
  DEFAULT_DATA_SYNC,
  DEFAULT_DOWNLOADS,
  DEFAULT_IN_APP_SETTINGS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PAGES,
  DEFAULT_SHARE_CONFIG,
} from '../../utils/presets';
import {
  Bell,
  CloudDownload,
  FileText,
  Share2,
  SlidersHorizontal,
  Star,
  Info,
  RefreshCw,
  Github,
} from 'lucide-react';
import { loadSavedRepo } from '../../utils/exportService';

interface AppFeaturesEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

const THEMES: { id: NonNullable<AppConfig['inAppSettings']>['defaultTheme']; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'emerald', label: 'Emerald' },
];

const FONTS: { id: NonNullable<AppConfig['inAppSettings']>['defaultFont']; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'serif', label: 'Serif' },
  { id: 'rounded', label: 'Rounded' },
  { id: 'mono', label: 'Mono' },
];

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500';
const labelClass = 'block text-xs font-medium text-slate-400 mb-1.5';

const Card: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; children: React.ReactNode }> = ({
  icon,
  title,
  subtitle,
  children,
}) => (
  <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
        {icon}
        {title}
      </h3>
      {subtitle && <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (value: boolean) => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <label className="flex items-center justify-between gap-3 cursor-pointer">
    <span className="text-xs text-slate-300">{label}</span>
    <span className="relative inline-flex items-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only peer"
      />
      <span className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-indigo-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-5" />
    </span>
  </label>
);

export const AppFeaturesEditor: React.FC<AppFeaturesEditorProps> = ({ config, onChange }) => {
  const share = { ...DEFAULT_SHARE_CONFIG, ...(config.share || {}) };
  const settings = { ...DEFAULT_IN_APP_SETTINGS, ...(config.inAppSettings || {}) };
  const pages = {
    about: { ...DEFAULT_PAGES.about, ...(config.pages?.about || {}) },
    rate: { ...DEFAULT_PAGES.rate, ...(config.pages?.rate || {}) },
    privacy: { ...DEFAULT_PAGES.privacy, ...(config.pages?.privacy || {}) },
  };
  const sync = { ...DEFAULT_DATA_SYNC, ...(config.dataSync || {}) };
  const notifications = { ...DEFAULT_NOTIFICATIONS, ...(config.notifications || {}) };
  const downloads = { ...DEFAULT_DOWNLOADS, ...(config.downloads || {}) };
  const savedRepo = loadSavedRepo();

  const updateShare = (partial: Partial<typeof share>) =>
    onChange({ ...config, share: { ...share, ...partial } });
  const updateSettings = (partial: Partial<typeof settings>) =>
    onChange({ ...config, inAppSettings: { ...settings, ...partial } });
  const updatePages = (partial: Partial<typeof pages>) =>
    onChange({ ...config, pages: { ...pages, ...partial } });
  const updateSync = (partial: Partial<typeof sync>) =>
    onChange({ ...config, dataSync: { ...sync, ...partial } });
  const updateNotifications = (partial: Partial<typeof notifications>) =>
    onChange({ ...config, notifications: { ...notifications, ...partial } });
  const updateDownloads = (partial: Partial<typeof downloads>) =>
    onChange({ ...config, downloads: { ...downloads, ...partial } });

  return (
    <div className="space-y-6 text-sm text-slate-300">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <SlidersHorizontal className="text-indigo-400" size={18} />
          App Features
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Native share sheet, in-app themes and fonts, About / Rate / Privacy pages, notification
          inbox, downloads and live content sync. Every section is included in the exported PWA and
          Android project.
        </p>
      </div>

      {/* Share */}
      <Card
        icon={<Share2 size={16} className="text-sky-400" />}
        title="Share button & native share sheet"
        subtitle="The user can type a message. On Android it opens the system share sheet with every app that accepts text; in a browser it uses the Web Share API or copies the message."
      >
        <Toggle
          checked={share.useTypedMessage}
          onChange={(value) => updateShare({ useTypedMessage: value })}
          label="Ask the user to type / edit the message before sharing"
        />
        <div>
          <label className={labelClass}>Share title</label>
          <input
            className={inputClass}
            value={share.title}
            onChange={(event) => updateShare({ title: event.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Default message</label>
          <textarea
            className={`${inputClass} min-h-[80px]`}
            value={share.message}
            onChange={(event) => updateShare({ message: event.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Link to include (leave empty to use the app link)</label>
          <input
            className={inputClass}
            placeholder="https://your-site.com"
            value={share.url}
            onChange={(event) => updateShare({ url: event.target.value })}
          />
        </div>
      </Card>

      {/* Settings */}
      <Card
        icon={<SlidersHorizontal size={16} className="text-violet-400" />}
        title="In-app settings (themes, font family, font size)"
        subtitle="Adds a settings button to the top bar. Users can switch between 4 themes and change the font family and text size; the choice is remembered on their device."
      >
        <Toggle
          checked={settings.enabled}
          onChange={(value) => updateSettings({ enabled: value })}
          label="Enable the in-app settings panel"
        />
        <Toggle
          checked={settings.showInTopBar}
          onChange={(value) => updateSettings({ showInTopBar: value })}
          label="Show the settings button in the top bar"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Default theme</label>
            <select
              className={inputClass}
              value={settings.defaultTheme}
              onChange={(event) => updateSettings({ defaultTheme: event.target.value as typeof settings.defaultTheme })}
            >
              {THEMES.map((theme) => (
                <option key={theme.id} value={theme.id}>
                  {theme.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Default font</label>
            <select
              className={inputClass}
              value={settings.defaultFont}
              onChange={(event) => updateSettings({ defaultFont: event.target.value as typeof settings.defaultFont })}
            >
              {FONTS.map((font) => (
                <option key={font.id} value={font.id}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Toggle
          checked={settings.allowThemeChange}
          onChange={(value) => updateSettings({ allowThemeChange: value })}
          label="Let users change the theme"
        />
        <Toggle
          checked={settings.allowFontChange}
          onChange={(value) => updateSettings({ allowFontChange: value })}
          label="Let users change the font family"
        />
        <div>
          <label className={labelClass}>
            Default text size: {Math.round(settings.defaultFontScale * 100)}%
          </label>
          <input
            type="range"
            min={0.85}
            max={1.35}
            step={0.05}
            value={settings.defaultFontScale}
            onChange={(event) => updateSettings({ defaultFontScale: Number(event.target.value) })}
            className="w-full accent-indigo-500"
          />
        </div>
        <Toggle
          checked={settings.allowFontScale}
          onChange={(value) => updateSettings({ allowFontScale: value })}
          label="Let users change the text size"
        />
      </Card>

      {/* Pages */}
      <Card
        icon={<FileText size={16} className="text-emerald-400" />}
        title="About, Rate this app & Privacy Policy"
        subtitle="Turn each page on or off and write its content. Enabled pages appear in the app settings sheet."
      >
        <div className="space-y-3 rounded-xl border border-slate-800 p-3">
          <Toggle
            checked={pages.about.enabled}
            onChange={(value) => updatePages({ about: { ...pages.about, enabled: value } })}
            label="About this app"
          />
          <input
            className={inputClass}
            placeholder="Page title"
            value={pages.about.title}
            onChange={(event) => updatePages({ about: { ...pages.about, title: event.target.value } })}
          />
          <textarea
            className={`${inputClass} min-h-[70px]`}
            placeholder="About content"
            value={pages.about.content}
            onChange={(event) => updatePages({ about: { ...pages.about, content: event.target.value } })}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 p-3">
          <Toggle
            checked={pages.rate.enabled}
            onChange={(value) => updatePages({ rate: { ...pages.rate, enabled: value } })}
            label="Rate this app"
          />
          <input
            className={inputClass}
            placeholder="Page title"
            value={pages.rate.title}
            onChange={(event) => updatePages({ rate: { ...pages.rate, title: event.target.value } })}
          />
          <textarea
            className={`${inputClass} min-h-[60px]`}
            placeholder="Message shown above the Rate button"
            value={pages.rate.message}
            onChange={(event) => updatePages({ rate: { ...pages.rate, message: event.target.value } })}
          />
          <input
            className={inputClass}
            placeholder="Play Store URL (empty = generated from package name)"
            value={pages.rate.url}
            onChange={(event) => updatePages({ rate: { ...pages.rate, url: event.target.value } })}
          />
        </div>

        <div className="space-y-3 rounded-xl border border-slate-800 p-3">
          <Toggle
            checked={pages.privacy.enabled}
            onChange={(value) => updatePages({ privacy: { ...pages.privacy, enabled: value } })}
            label="Privacy Policy"
          />
          <input
            className={inputClass}
            placeholder="Page title"
            value={pages.privacy.title}
            onChange={(event) => updatePages({ privacy: { ...pages.privacy, title: event.target.value } })}
          />
          <textarea
            className={`${inputClass} min-h-[80px]`}
            placeholder="Privacy policy content"
            value={pages.privacy.content}
            onChange={(event) => updatePages({ privacy: { ...pages.privacy, content: event.target.value } })}
          />
        </div>

        <p className="text-[11px] text-slate-500 flex items-start gap-2">
          <Star size={13} className="mt-0.5 shrink-0" />
          The Rate button opens your Play Store listing, or the URL you provide when it is not empty.
        </p>
      </Card>

      {/* Notifications */}
      <Card
        icon={<Bell size={16} className="text-amber-400" />}
        title="Notifications"
        subtitle="Adds a bell button + inbox. The app polls the feed URL and shows new announcements; on Android it can also post a real system notification."
      >
        <Toggle
          checked={notifications.enabled}
          onChange={(value) => updateNotifications({ enabled: value })}
          label="Enable the notification inbox"
        />
        <Toggle
          checked={notifications.showBellInTopBar}
          onChange={(value) => updateNotifications({ showBellInTopBar: value })}
          label="Show the bell in the top bar"
        />
        <Toggle
          checked={notifications.useSystemNotifications}
          onChange={(value) => updateNotifications({ useSystemNotifications: value })}
          label="Post real system notifications (Android + browser)"
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Inbox title</label>
            <input
              className={inputClass}
              value={notifications.title}
              onChange={(event) => updateNotifications({ title: event.target.value })}
            />
          </div>
          <div>
            <label className={labelClass}>Poll every (seconds)</label>
            <input
              type="number"
              min={30}
              className={inputClass}
              value={notifications.pollSeconds}
              onChange={(event) => updateNotifications({ pollSeconds: Math.max(30, Number(event.target.value) || 120) })}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Default / test message</label>
          <input
            className={inputClass}
            value={notifications.message}
            onChange={(event) => updateNotifications({ message: event.target.value })}
          />
        </div>
        <div>
          <label className={labelClass}>Notification feed URL (JSON)</label>
          <input
            className={inputClass}
            placeholder="https://raw.githubusercontent.com/USER/REPO/main/notifications.json"
            value={notifications.feedUrl}
            onChange={(event) => updateNotifications({ feedUrl: event.target.value })}
          />
        </div>
        <p className="text-[11px] text-slate-500">
          Feed format: <code>{'[{ "id": "1", "title": "Hello", "body": "New update", "url": "https://..." }]'}</code>{' '}
          or <code>{'{ "notifications": [ ... ] }'}</code>.
        </p>
      </Card>

      {/* Live sync */}
      <Card
        icon={<RefreshCw size={16} className="text-cyan-400" />}
        title="Live content sync from your GitHub repo"
        subtitle="GitHub repo exports switch this on automatically and point at app-config.json in the repository. Editing that file updates the installed app and the hosted PWA without rebuilding."
      >
        <Toggle
          checked={sync.enabled}
          onChange={(value) => updateSync({ enabled: value })}
          label="Fetch live content from a JSON feed"
        />
        <div>
          <label className={labelClass}>Raw config URL (absolute)</label>
          <input
            className={inputClass}
            placeholder="https://raw.githubusercontent.com/USER/REPO/main/app-config.json"
            value={sync.configUrl}
            onChange={(event) => updateSync({ configUrl: event.target.value })}
          />
        </div>
        {savedRepo && (
          <button
            type="button"
            onClick={() =>
              updateSync({
                enabled: true,
                configUrl: `https://raw.githubusercontent.com/${savedRepo}/main/app-config.json`,
              })
            }
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold transition"
          >
            <Github size={13} />
            Use my saved repo: {savedRepo}
          </button>
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Refresh every (seconds)</label>
            <input
              type="number"
              min={30}
              className={inputClass}
              value={sync.refreshSeconds}
              onChange={(event) => updateSync({ refreshSeconds: Math.max(30, Number(event.target.value) || 120) })}
            />
          </div>
          <div>
            <label className={labelClass}>Separate notifications URL (optional)</label>
            <input
              className={inputClass}
              placeholder="notifications.json"
              value={sync.notificationsUrl}
              onChange={(event) => updateSync({ notificationsUrl: event.target.value })}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500 flex items-start gap-2">
          <Info size={13} className="mt-0.5 shrink-0" />
          The APK loads its UI from <code>file://</code>, so this must be a full URL (raw GitHub,
          GitHub Pages, Netlify or Vercel). The exported README includes the exact link.
        </p>
      </Card>

      {/* Downloads */}
      <Card
        icon={<CloudDownload size={16} className="text-rose-400" />}
        title="Downloads and in-app browsing"
        subtitle="Files are saved by the app itself (Android DownloadManager) instead of opening another browser. Each menu item can still be marked “open outside app”."
      >
        <Toggle
          checked={downloads.enabled}
          onChange={(value) => updateDownloads({ enabled: value })}
          label="Download files inside the app"
        />
        <Toggle
          checked={downloads.inAppBrowser}
          onChange={(value) => updateDownloads({ inAppBrowser: value })}
          label="Prefer the in-app browser for web links"
        />
      </Card>
    </div>
  );
};
