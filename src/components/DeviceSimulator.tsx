import React, { useState, useEffect } from 'react';
import type { AppConfig, LaunchpadIconItem, MenuItem, SubmenuLink } from '../types/appConfig';
import { renderAppIcon } from '../utils/iconMap';
import {
  RotateCw,
  RefreshCw,
  Play,
  Share2,
  Menu as MenuIcon,
  X,
  Search,
  Wifi,
  Signal,
  Battery,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Copy,
  MessageCircle,
  Mail,
  Send,
  Sparkles,
  FolderTree,
  Bell,
  Settings,
  Star,
  Info,
  FileCode,
} from 'lucide-react';

function toYouTubeEmbed(raw: string): string {
  const match = raw.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{6,})/i
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : '';
}

const FRAME_BLOCKED_HOSTS =
  /(?:^|\.)(?:facebook\.com|instagram\.com|x\.com|twitter\.com|tiktok\.com|linkedin\.com|google\.com|youtube\.com|amazon\.[a-z.]+|whatsapp\.com|telegram\.(?:org|me)|github\.com|netflix\.com|spotify\.com|reddit\.com|pinterest\.com)$/i;

function isFrameBlocked(raw: string): boolean {
  try {
    return FRAME_BLOCKED_HOSTS.test(new URL(raw).hostname);
  } catch {
    return false;
  }
}

interface DeviceSimulatorProps {
  config: AppConfig;
}

export const DeviceSimulator: React.FC<DeviceSimulatorProps> = ({ config }) => {
  const [isLandscape, setIsLandscape] = useState(false);
  const [frameColor, setFrameColor] = useState<'black' | 'silver' | 'emerald'>('black');
  const [scale, setScale] = useState<number>(0.85);
  const [showSplash, setShowSplash] = useState(config.splashScreen.enabled);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeBottomNavId, setActiveBottomNavId] = useState<string>('');
  const [activeTopTabId, setActiveTopTabId] = useState<string>('');
  const [activeModalContent, setActiveModalContent] = useState<{ title: string; html: string } | null>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<{ title: string; links: SubmenuLink[] } | null>(null);
  const [submenuHistory, setSubmenuHistory] = useState<{ title: string; links: SubmenuLink[] }[]>([]);
  const [inAppBrowserUrl, setInAppBrowserUrl] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [shareMessage, setShareMessage] = useState(config.share?.message || '');
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [showNotificationsSheet, setShowNotificationsSheet] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<string>(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const [copiedLink, setCopiedLink] = useState(false);
  const [simTheme, setSimTheme] = useState<'light' | 'dark' | 'midnight' | 'emerald'>(
    config.inAppSettings?.defaultTheme || 'light'
  );
  const [simFont, setSimFont] = useState<'system' | 'serif' | 'rounded' | 'mono'>(
    config.inAppSettings?.defaultFont || 'system'
  );
  const [simFontScale, setSimFontScale] = useState<number>(
    config.inAppSettings?.defaultFontScale || 1
  );

  // Set default active tab / nav
  useEffect(() => {
    if (config.navigation.items.length > 0) {
      setActiveBottomNavId(config.navigation.items[0].id);
      setActiveTopTabId(config.navigation.items[0].id);
    }
  }, [config.navigation.items]);

  // Handle Splash Screen auto-dismiss
  useEffect(() => {
    if (config.splashScreen.enabled) {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, config.splashScreen.durationSeconds * 1000);
      return () => clearTimeout(timer);
    } else {
      setShowSplash(false);
    }
  }, [config.splashScreen.enabled, config.splashScreen.durationSeconds]);

  const handleReplaySplash = () => {
    setShowSplash(true);
    setIsDrawerOpen(false);
    setActiveModalContent(null);
    setActiveSubmenu(null);
    setInAppBrowserUrl(null);
    setTimeout(() => {
      setShowSplash(false);
    }, config.splashScreen.durationSeconds * 1000);
  };

  const handleShareTrigger = () => {
    setShareMessage(config.share?.message || `Check out ${config.appName}!`);
    setShowShareSheet(true);
  };

  const shareFullText = () => {
    const url = config.share?.url || window.location.href;
    return `${shareMessage}${url ? '\n' + url : ''}`;
  };

  const handleNativeShare = async () => {
    const full = shareFullText();
    const url = config.share?.url || window.location.href;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: config.share?.title || config.appName,
          text: shareMessage,
          url,
        });
        setShowShareSheet(false);
        return;
      } catch {
        // User cancelled or the browser refused — fall back to copying.
      }
    }
    try {
      await navigator.clipboard?.writeText(full);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  };

  const handleCopyShareLink = () => {
    navigator.clipboard?.writeText(shareFullText());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const openSubmenu = (title: string, links: SubmenuLink[]) => {
    setSubmenuHistory([]);
    setActiveSubmenu({ title, links });
  };

  const openSite = (url: string, external?: boolean) => {
    if (!url) return;
    if (external || config.downloads?.inAppBrowser === false) {
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    setInAppBrowserUrl(url);
  };

  const handleLaunchpadIconClick = (icon: LaunchpadIconItem) => {
    if (icon.actionType === 'submenu') {
      openSubmenu(icon.title, icon.children || []);
    } else if (icon.actionType === 'website' && icon.targetUrl) {
      openSite(icon.targetUrl, icon.openExternally);
    } else if (icon.actionType === 'html-page' && icon.htmlContent) {
      setActiveModalContent({ title: icon.title, html: icon.htmlContent });
    } else if (icon.actionType === 'share') {
      handleShareTrigger();
    } else if (icon.actionType === 'about') {
      setActiveModalContent({
        title: config.pages?.about?.title || 'About',
        html: config.pages?.about?.content || '<p>About page is disabled.</p>',
      });
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    setIsDrawerOpen(false);
    if (item.actionType === 'submenu') {
      openSubmenu(item.label, item.children || []);
    } else if (item.actionType === 'share') {
      handleShareTrigger();
    } else if (item.actionType === 'about') {
      setActiveModalContent({
        title: config.pages?.about?.title || 'About',
        html: config.pages?.about?.content || '<p>About page is disabled.</p>',
      });
    } else if (item.actionType === 'html-page' && item.targetHtml) {
      setActiveModalContent({ title: item.label, html: item.targetHtml });
    } else if (item.actionType === 'website' && item.targetUrl) {
      openSite(item.targetUrl, item.openExternally);
    } else if (item.actionType === 'contact') {
      setActiveModalContent({
        title: item.label,
        html: `<h3>Support & Contact</h3><p>Need assistance with this application? Email our team at: <strong>${item.targetUrl || 'support@example.com'}</strong></p>`,
      });
    }
  };

  const handleSubmenuLinkClick = (link: SubmenuLink) => {
    if (link.actionType === 'submenu' || (link.children && link.children.length > 0)) {
      setSubmenuHistory((history) => (activeSubmenu ? [...history, activeSubmenu] : history));
      setActiveSubmenu({ title: link.label, links: link.children || [] });
      return;
    }
    setActiveSubmenu(null);
    if (link.actionType === 'share') {
      handleShareTrigger();
    } else if (link.actionType === 'about') {
      setActiveModalContent({
        title: config.pages?.about?.title || 'About',
        html: config.pages?.about?.content || '<p>About page is disabled.</p>',
      });
    } else if (link.actionType === 'contact') {
      setActiveModalContent({
        title: link.label,
        html: `<h3>${link.label}</h3><p>Get in touch with our team at: <strong>${
          link.targetUrl || 'support@example.com'
        }</strong></p>`,
      });
    } else if (link.actionType === 'html-page') {
      setActiveModalContent({
        title: link.label,
        html: link.targetHtml || '<p>No content available</p>',
      });
    } else if (link.actionType === 'website' && link.targetUrl) {
      openSite(link.targetUrl, link.openExternally);
    }
  };

  const frameBorderClass =
    frameColor === 'black'
      ? 'border-slate-800 bg-slate-950 shadow-2xl shadow-black/60'
      : frameColor === 'silver'
      ? 'border-slate-300 bg-slate-200 shadow-2xl shadow-slate-900/40'
      : 'border-emerald-900 bg-emerald-950 shadow-2xl shadow-emerald-950/50';

  const visibleLaunchpadIcons = config.launchpadConfig.icons.filter(
    (item) => item.showOnHome !== false
  );
  const bottomNavSource = (
    config.navigation.bottomNavItems && config.navigation.bottomNavItems.length > 0
      ? config.navigation.bottomNavItems
      : config.navigation.items
  )
    .filter((item) => item.showOnHome !== false)
    .slice(0, 5);
  const bannerSize = config.admob?.bannerSize || 'adaptive';
  const bannerHeightClass =
    bannerSize === 'large-banner'
      ? 'h-20'
      : bannerSize === 'medium-rectangle'
        ? 'h-48'
        : bannerSize === 'banner'
          ? 'h-11'
          : 'h-14';
  const bannerLabel =
    bannerSize === 'large-banner'
      ? 'Large banner (320×100)'
      : bannerSize === 'medium-rectangle'
        ? 'Medium rectangle (300×250)'
        : bannerSize === 'banner'
          ? 'Small banner (320×50)'
          : 'Adaptive banner';
  const splashLayout = config.splashScreen.layout || 'logo-center';
  const browserEmbedUrl = inAppBrowserUrl ? toYouTubeEmbed(inAppBrowserUrl) : '';
  const browserIsBlocked = Boolean(
    inAppBrowserUrl && !browserEmbedUrl && isFrameBlocked(inAppBrowserUrl)
  );
  const simulatorFontFamily =
    simFont === 'serif'
      ? 'Georgia, "Times New Roman", serif'
      : simFont === 'mono'
        ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
        : simFont === 'rounded'
          ? '"Trebuchet MS", "Segoe UI", system-ui, sans-serif'
          : 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const simulatorBackground =
    simTheme === 'dark'
      ? '#0f172a'
      : simTheme === 'midnight'
        ? '#020617'
        : simTheme === 'emerald'
          ? '#052e2b'
          : config.backgroundColor;
  const rateUrl =
    config.pages?.rate?.url ||
    `https://play.google.com/store/apps/details?id=${config.appPackageId}`;

  return (
    <div className="flex flex-col items-center w-full">
      {/* Device Toolbar */}
      <div className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl mb-4 text-xs text-slate-300">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-white flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Android Simulator
          </span>
          <span className="text-slate-500 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline">
            {isLandscape ? 'Landscape (844 x 390)' : 'Portrait (390 x 844)'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Replay Splash */}
          <button
            onClick={handleReplaySplash}
            title="Replay Splash Screen Animation"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 transition"
          >
            <Play size={13} />
            <span>Replay Splash</span>
          </button>

          {/* Test Share */}
          <button
            onClick={handleShareTrigger}
            title="Test Native Share Action"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Share2 size={13} />
            <span>Test Share</span>
          </button>

          {/* Frame Rotate */}
          <button
            onClick={() => setIsLandscape(!isLandscape)}
            title="Rotate Device"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <RotateCw size={14} />
          </button>

          {/* Frame Theme */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700">
            <button
              onClick={() => setFrameColor('black')}
              className={`w-4 h-4 rounded-full bg-slate-900 border ${
                frameColor === 'black' ? 'border-indigo-400 scale-110' : 'border-slate-700'
              }`}
              title="Midnight Obsidian"
            />
            <button
              onClick={() => setFrameColor('silver')}
              className={`w-4 h-4 rounded-full bg-slate-300 border ${
                frameColor === 'silver' ? 'border-indigo-400 scale-110' : 'border-slate-400'
              }`}
              title="Titanium Silver"
            />
            <button
              onClick={() => setFrameColor('emerald')}
              className={`w-4 h-4 rounded-full bg-emerald-800 border ${
                frameColor === 'emerald' ? 'border-indigo-400 scale-110' : 'border-emerald-700'
              }`}
              title="Forest Emerald"
            />
          </div>

          {/* Zoom */}
          <select
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-slate-300 text-xs focus:outline-hidden"
          >
            <option value={0.75}>75%</option>
            <option value={0.85}>85%</option>
            <option value={0.95}>95%</option>
            <option value={1}>100%</option>
          </select>
        </div>
      </div>

      {/* Device Frame Viewport Container */}
      <div
        className="flex items-center justify-center transition-all duration-300"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top center',
        }}
      >
        <div
          className={`relative rounded-[48px] p-3 border-4 transition-all duration-300 select-none ${frameBorderClass}`}
          style={{
            width: isLandscape ? '844px' : '390px',
            height: isLandscape ? '440px' : '800px',
          }}
        >
          {/* Hardware buttons */}
          <div className="absolute -left-[7px] top-28 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
          <div className="absolute -left-[7px] top-44 w-[3px] h-12 bg-slate-700 rounded-l-sm" />
          <div className="absolute -right-[7px] top-32 w-[3px] h-16 bg-slate-700 rounded-r-sm" />

          {/* Screen Glass */}
          <div
            className="relative w-full h-full rounded-[40px] overflow-hidden flex flex-col shadow-inner"
            style={{ backgroundColor: simulatorBackground, fontFamily: simulatorFontFamily }}
          >
            {/* Android Status Bar */}
            <div className="h-7 w-full bg-black/80 backdrop-blur-xs text-white text-[11px] font-medium px-6 flex items-center justify-between shrink-0 z-40">
              <span>9:41</span>
              {/* Camera punch hole */}
              <div className="w-3.5 h-3.5 rounded-full bg-black border border-slate-800 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              </div>
              <div className="flex items-center gap-1.5">
                <Signal size={12} />
                <Wifi size={12} />
                <Battery size={13} className="text-white fill-white" />
              </div>
            </div>

            {/* Top Bar (if enabled) */}
            {config.topBar.enabled && (
              <header
                className="shrink-0 flex items-center justify-between px-3 h-14 z-30 transition-colors shadow-sm"
                style={{
                  backgroundColor: config.topBar.bgColor,
                  color: config.topBar.textColor,
                }}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  {config.topBar.showMenuToggle && (
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition"
                      aria-label="Open Navigation Drawer"
                    >
                      <MenuIcon size={20} />
                    </button>
                  )}

                  {config.topBar.showLogo && (
                    config.topBar.customLogoUrl || config.appLogo.customImageUrl ? (
                      <img
                        src={config.topBar.customLogoUrl || config.appLogo.customImageUrl}
                        alt="Logo"
                        className="w-7 h-7 rounded-lg object-cover shrink-0 shadow-xs"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 shadow-xs"
                        style={{
                          backgroundColor: config.appLogo.bgColor,
                          color: config.appLogo.iconColor,
                        }}
                      >
                        {renderAppIcon(config.appLogo.icon, 16)}
                      </div>
                    )
                  )}

                  <span className="font-semibold text-base truncate tracking-tight">
                    {config.topBar.title}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {config.topBar.showSearchButton && (
                    <button
                      onClick={() =>
                        setActiveModalContent({
                          title: 'Search',
                          html: '<p>Search through all app modules, links, and documents.</p><input type="text" placeholder="Type here..." style="width:100%;padding:10px;border:1px solid #cbd5e1;border-radius:8px;margin-top:12px;" />',
                        })
                      }
                      className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition"
                      aria-label="Search"
                    >
                      <Search size={18} />
                    </button>
                  )}

                  {config.topBar.showShareButton && (
                    <button
                      onClick={handleShareTrigger}
                      className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition"
                      aria-label="Share App"
                    >
                      <Share2 size={18} />
                    </button>
                  )}

                  {config.topBar.showNotificationsButton !== false &&
              (config.notifications?.enabled || config.dataSync?.enabled) && (
                    <button
                      onClick={() => setShowNotificationsSheet(true)}
                      className="relative p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition"
                      aria-label="Notifications"
                    >
                      <Bell size={18} />
                      <span className="absolute top-0.5 right-0.5 w-2 h-2 rounded-full bg-rose-500" />
                    </button>
                  )}

                  {config.inAppSettings?.enabled && config.topBar.showSettingsButton !== false && (
                    <button
                      onClick={() => setShowSettingsSheet(true)}
                      className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition"
                      aria-label="App settings"
                    >
                      <Settings size={18} />
                    </button>
                  )}

                  {config.topBar.showRefreshButton && (
                    <button
                      onClick={() => {
                        setInAppBrowserUrl(null);
                        setActiveModalContent(null);
                      }}
                      className="p-1.5 rounded-full hover:bg-white/10 active:bg-white/20 transition"
                      aria-label="Refresh View"
                    >
                      <RefreshCw size={17} />
                    </button>
                  )}
                </div>
              </header>
            )}

            {/* Top Tabs (if configured as top-tabs) */}
            {config.navigation.type === 'top-tabs' && config.navigation.items.length > 0 && (
              <div
                className="flex items-center border-b border-slate-200/50 bg-white/90 backdrop-blur-xs px-2 shrink-0 z-20 overflow-x-auto"
                style={{ backgroundColor: config.topBar.bgColor, color: config.topBar.textColor }}
              >
                {config.navigation.items.map((tab) => {
                  const isActive = activeTopTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTopTabId(tab.id);
                        handleMenuItemClick(tab);
                      }}
                      className={`flex items-center gap-1.5 py-2.5 px-3 border-b-2 text-xs font-medium whitespace-nowrap transition ${
                        isActive
                          ? 'border-white text-white font-bold'
                          : 'border-transparent text-white/70 hover:text-white'
                      }`}
                    >
                      {renderAppIcon(tab.icon, 14)}
                      <span>{tab.label}</span>
                      {tab.badge && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-white/30 text-white font-semibold">
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Phone Screen Main Body */}
            <div className="relative flex-1 overflow-y-auto w-full">
              {config.contentMode === 'website' ? (
                /* Website / Webview Mode */
                <div className="w-full h-full flex flex-col bg-white">
                  {config.websiteConfig.showAddressBar && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-xs text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="truncate flex-1 font-mono text-[11px]">
                        {config.websiteConfig.url}
                      </span>
                      <a
                        href={config.websiteConfig.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-slate-400 hover:text-slate-700"
                        title="Open external link"
                      >
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  )}
                  <iframe
                    src={config.websiteConfig.url}
                    title="Website View"
                    className="w-full flex-1 border-none bg-slate-50"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  />
                </div>
              ) : (
                /* Launchpad / Icons Grid Mode */
                <div className="p-4 space-y-4">
                  {/* Greeting / Launchpad Header */}
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                      {config.launchpadConfig.heading}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {config.launchpadConfig.subheading}
                    </p>
                  </div>

                  {/* Grid of Icons */}
                  <div
                    className={`grid gap-3 ${
                      config.launchpadConfig.columns === 3
                        ? 'grid-cols-3'
                        : config.launchpadConfig.columns === 4
                        ? 'grid-cols-4'
                        : 'grid-cols-2'
                    }`}
                  >
                    {visibleLaunchpadIcons.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleLaunchpadIconClick(item)}
                        className={`group relative p-3 rounded-2xl cursor-pointer transition-all duration-200 bg-white border border-slate-200 hover:border-indigo-400 active:scale-95 shadow-xs hover:shadow-md flex flex-col justify-between`}
                      >
                        {item.badge && (
                          <span
                            className="absolute top-2 right-2 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white shadow-xs"
                            style={{ backgroundColor: item.badgeColor || item.color }}
                          >
                            {item.badge}
                          </span>
                        )}

                        {item.customImageUrl ? (
                          <div className="w-10 h-10 rounded-xl overflow-hidden mb-2 shadow-sm border border-slate-100">
                            <img src={item.customImageUrl} alt={item.title} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white mb-2 shadow-sm transition-transform group-hover:scale-105"
                            style={{ backgroundColor: item.color }}
                          >
                            {renderAppIcon(item.icon, 20)}
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-bold text-slate-800 line-clamp-1">
                            {item.title}
                          </div>
                          <div className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                            {item.description}
                          </div>
                        </div>

                        <div className="mt-2.5 flex items-center justify-between gap-1 text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                          <span className="truncate">{item.category}</span>
                          <span
                            className={`font-semibold group-hover:translate-x-0.5 transition-transform whitespace-nowrap ${
                              item.actionType === 'submenu' ? 'text-violet-600' : 'text-indigo-600'
                            }`}
                          >
                            {item.actionType === 'website'
                              ? 'Open URL →'
                              : item.actionType === 'submenu'
                              ? `${item.children?.length || 0} places →`
                              : 'View File →'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {visibleLaunchpadIcons.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
                      No cards are shown on the main screen. Add icons in the Launchpad editor or
                      switch “Show on main screen” on for the ones you want.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Simulated AdMob Top Banner (if top position) */}
            {config.admob?.enabled && config.admob.showBannerInSimulator && config.admob.bannerPosition === 'top' && (
              <div className={`shrink-0 ${bannerHeightClass} w-full bg-slate-900 border-b border-amber-500/40 px-3 flex items-center justify-between text-white z-25 text-xs shadow-md`}>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-amber-500 text-black">
                    Ad
                  </span>
                  <span className="text-[11px] font-medium text-slate-200 truncate">
                    {config.admob.isTestingMode ? `AdMob Test · ${bannerLabel}` : 'Sponsored Ad'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">Top</span>
              </div>
            )}

            {/* Bottom Nav Bar (bottom-nav or drawer + bottom bar) */}
            {(config.navigation.type === 'bottom-nav' || config.navigation.type === 'both') &&
              bottomNavSource.length > 0 && (
              <div className="shrink-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around px-1 z-30 shadow-lg">
                {bottomNavSource.map((item) => {
                  const isActive = activeBottomNavId === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveBottomNavId(item.id);
                        handleMenuItemClick(item);
                      }}
                      className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition ${
                        isActive
                          ? 'text-indigo-600 font-bold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <div className="relative">
                        {renderAppIcon(item.icon, 18)}
                        {item.badge && (
                          <span className="absolute -top-1 -right-2 text-[9px] font-bold px-1 rounded-full bg-pink-500 text-white">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] tracking-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Simulated AdMob Bottom Banner (if bottom position) */}
            {config.admob?.enabled && config.admob.showBannerInSimulator && config.admob.bannerPosition === 'bottom' && (
              <div className={`shrink-0 ${bannerHeightClass} w-full bg-slate-900 border-t border-amber-500/40 px-3 flex items-center justify-between text-white z-25 text-xs shadow-md`}>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-amber-500 text-black">
                    Ad
                  </span>
                  <span className="text-[11px] font-medium text-slate-200 truncate">
                    {config.admob.isTestingMode ? `AdMob Test · ${bannerLabel}` : 'Sponsored Ad'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">Bottom</span>
              </div>
            )}

            {/* Android Navigation Gesture Pill */}
            <div className="h-4 w-full bg-slate-100 flex items-center justify-center shrink-0 z-40">
              <div className="w-28 h-1 bg-slate-400 rounded-full" />
            </div>

            {/* Simulated In-App Browser View */}
            {inAppBrowserUrl && (
              <div className="absolute inset-0 z-40 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-6 duration-200">
                <div className="h-7 bg-black text-white text-[11px] px-6 flex items-center justify-between">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <Wifi size={11} />
                    <Battery size={12} />
                  </div>
                </div>
                <div className="flex items-center justify-between px-3 py-2 bg-slate-100 border-b border-slate-200">
                  <button
                    onClick={() => setInAppBrowserUrl(null)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-600 p-1"
                  >
                    <ChevronLeft size={16} />
                    <span>Back</span>
                  </button>
                  <span className="text-xs font-mono text-slate-700 truncate max-w-[200px]">
                    {inAppBrowserUrl}
                  </span>
                  <button
                    onClick={() => setInAppBrowserUrl(null)}
                    className="p-1 rounded-full hover:bg-slate-200 text-slate-500"
                    aria-label="Close in-app browser"
                  >
                    <X size={16} />
                  </button>
                </div>
                {browserEmbedUrl ? (
                  <div className="flex-1 bg-black flex flex-col">
                    <iframe
                      src={browserEmbedUrl}
                      title="Video player"
                      className="w-full flex-1 border-none"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                    <p className="text-[10px] text-slate-300 px-3 py-2 text-center">
                      Playing inside the app. Use “Open outside” for the full YouTube app.
                    </p>
                  </div>
                ) : browserIsBlocked ? (
                  <div className="flex-1 flex items-center justify-center p-6">
                    <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
                      <p className="text-sm font-bold text-slate-800">
                        This site blocks in-app views
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 break-all">
                        {inAppBrowserUrl}
                      </p>
                      <button
                        onClick={() => {
                          window.open(inAppBrowserUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="mt-3 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
                      >
                        Open in browser / app
                      </button>
                    </div>
                  </div>
                ) : (
                  <iframe
                    src={inAppBrowserUrl}
                    title="In-App Browser"
                    className="w-full flex-1 border-none"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
                  />
                )}
                <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
                  <button
                    onClick={() => {
                      window.open(inAppBrowserUrl, '_blank', 'noopener,noreferrer');
                    }}
                    className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Open outside app
                  </button>
                  <button
                    onClick={() => {
                      const anchor = document.createElement('a');
                      anchor.href = inAppBrowserUrl;
                      anchor.download = '';
                      anchor.rel = 'noopener';
                      anchor.target = '_blank';
                      document.body.appendChild(anchor);
                      anchor.click();
                      document.body.removeChild(anchor);
                    }}
                    className="flex-1 py-2 rounded-lg bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Download / save
                  </button>
                </div>
              </div>
            )}

            {/* Simulated In-App HTML File Viewer Modal */}
            {activeModalContent && (
              <div className="absolute inset-0 z-45 bg-white flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-200">
                <div className="h-7 bg-black text-white text-[11px] px-6 flex items-center justify-between">
                  <span>9:41</span>
                  <div className="flex items-center gap-1">
                    <Wifi size={11} />
                    <Battery size={12} />
                  </div>
                </div>
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveModalContent(null)}
                      className="p-1 -ml-1 text-slate-700 hover:text-black"
                      aria-label="Back"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold text-sm text-slate-800">
                      {activeModalContent.title}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveModalContent(null)}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                    aria-label="Close viewer"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div
                  className="flex-1 overflow-y-auto p-4 text-xs text-slate-700 leading-relaxed space-y-3 prose prose-slate"
                  dangerouslySetInnerHTML={{ __html: activeModalContent.html }}
                />
              </div>
            )}

            {/* Submenu Sheet — one icon reveals several destinations */}
            {activeSubmenu && (
              <div
                className="absolute inset-0 z-[46] flex flex-col justify-end bg-black/50 animate-in fade-in duration-200"
                onClick={() => {
                  setActiveSubmenu(null);
                  setSubmenuHistory([]);
                }}
              >
                <div
                  className="bg-white rounded-t-3xl max-h-[78%] flex flex-col shadow-2xl animate-in slide-in-from-bottom-6 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-4 pt-3 pb-2.5 border-b border-slate-100">
                    <div className="min-w-0">
                      {submenuHistory.length > 0 && (
                        <button
                          onClick={() => {
                            const previous = submenuHistory[submenuHistory.length - 1];
                            setSubmenuHistory((history) => history.slice(0, -1));
                            setActiveSubmenu(previous);
                          }}
                          className="text-[10px] font-bold text-indigo-600 mb-0.5"
                        >
                          ‹ Back
                        </button>
                      )}
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-violet-600 font-bold">
                        <FolderTree size={11} />
                        <span>Submenu</span>
                      </div>
                      <div className="font-bold text-sm text-slate-800 truncate">
                        {activeSubmenu.title}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setActiveSubmenu(null);
                        setSubmenuHistory([]);
                      }}
                      className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      aria-label="Close submenu"
                    >
                      <X size={17} />
                    </button>
                  </div>

                  <div className="overflow-y-auto p-3 space-y-2">
                    {activeSubmenu.links.length === 0 && (
                      <div className="p-5 text-center text-[11px] text-slate-500 border border-dashed border-slate-300 rounded-xl">
                        No destinations in this submenu yet. Add two or more in the editor.
                      </div>
                    )}
                    {activeSubmenu.links.map((link) => (
                      <button
                        key={link.id}
                        onClick={() => handleSubmenuLinkClick(link)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white active:scale-[0.99] hover:border-violet-300 text-left transition"
                      >
                        {link.customImageUrl ? (
                          <img
                            src={link.customImageUrl}
                            alt=""
                            className="w-9 h-9 rounded-xl object-cover shrink-0"
                          />
                        ) : (
                          <span className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                            {renderAppIcon(link.icon, 17)}
                          </span>
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-slate-800 truncate">
                            {link.label}
                          </span>
                          {link.description && (
                            <span className="block text-[11px] text-slate-500 line-clamp-2 leading-snug">
                              {link.description}
                            </span>
                          )}
                        </span>
                        {link.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 shrink-0">
                            {link.badge}
                          </span>
                        )}
                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>

                  <div className="px-4 py-2 text-center text-[10px] text-slate-400 border-t border-slate-100">
                    One icon · {activeSubmenu.links.length} places to go
                  </div>
                </div>
              </div>
            )}

            {/* Drawer Navigation Panel */}
            <div
              className={`absolute inset-0 z-50 bg-black/50 transition-opacity duration-300 ${
                isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
              }`}
              onClick={() => setIsDrawerOpen(false)}
            >
              <div
                className={`absolute top-0 bottom-0 left-0 w-64 bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
                  isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drawer Header */}
                <div
                  className="p-5 text-white flex flex-col justify-end relative overflow-hidden"
                  style={{
                    backgroundColor: config.navigation.drawerHeader.bannerColor,
                    backgroundImage: config.navigation.drawerHeader.customBannerUrl ? `url(${config.navigation.drawerHeader.customBannerUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  {config.navigation.drawerHeader.customBannerUrl && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
                  )}
                  <div className="relative z-10">
                    {config.navigation.drawerHeader.showUserAvatar && (
                      config.navigation.drawerHeader.customAvatarUrl ? (
                        <img
                          src={config.navigation.drawerHeader.customAvatarUrl}
                          alt="User Avatar"
                          className="w-12 h-12 rounded-full object-cover border-2 border-white/60 mb-2 shadow-sm"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-lg mb-2">
                          {config.shortName.slice(0, 1)}
                        </div>
                      )
                    )}
                    <h3 className="font-bold text-base leading-tight">
                      {config.navigation.drawerHeader.title}
                    </h3>
                    <p className="text-xs text-white/80 mt-0.5">
                      {config.navigation.drawerHeader.subtitle}
                    </p>
                  </div>
                </div>

                {/* Drawer Items */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {config.navigation.items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleMenuItemClick(item)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-medium text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition"
                    >
                      <div className="flex items-center gap-3">
                        {item.customImageUrl ? (
                          <img
                            src={item.customImageUrl}
                            alt=""
                            className="w-[18px] h-[18px] rounded-md object-cover"
                          />
                        ) : (
                          <span className="text-slate-500">{renderAppIcon(item.icon, 18)}</span>
                        )}
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                            {item.badge}
                          </span>
                        )}
                        {item.actionType === 'submenu' && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700">
                            <FolderTree size={10} />
                            {item.children?.length || 0}
                          </span>
                        )}
                        <ChevronRight size={14} className="text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>

                <div className="p-3 border-t border-slate-200 text-[11px] text-slate-400 text-center">
                  {config.appName} v{config.pwaSettings.version}
                </div>
              </div>
            </div>

            {/* Android Share Sheet Modal Simulation */}
            {showShareSheet && (
              <div
                className="absolute inset-0 z-60 bg-black/60 flex items-end animate-in fade-in duration-200"
                onClick={() => setShowShareSheet(false)}
              >
                <div
                  className="w-full bg-white rounded-t-3xl p-4 shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-8 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Share Application</h4>
                      <p className="text-[11px] text-slate-500">{config.appName}</p>
                    </div>
                    <button
                      onClick={() => setShowShareSheet(false)}
                      className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                      aria-label="Close share sheet"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* The message the user types is what gets shared. */}
                  <textarea
                    value={shareMessage}
                    onChange={(e) => setShareMessage(e.target.value)}
                    rows={3}
                    placeholder="Type a message to share…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-400"
                  />
                  <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                    <span className="truncate">
                      {config.share?.url || 'The app link is added automatically'}
                    </span>
                    <span className="shrink-0 font-mono">{shareMessage.length} chars</span>
                  </div>

                  <button
                    onClick={handleNativeShare}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-bold transition"
                  >
                    <Share2 size={15} />
                    Share message with apps
                  </button>

                  {/* Direct share targets, using the typed text */}
                  <div className="grid grid-cols-4 gap-2 py-1 text-center text-[10px] text-slate-600">
                    <button
                      onClick={handleCopyShareLink}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Copy size={18} />
                      </div>
                      <span>{copiedLink ? 'Copied!' : 'Copy text'}</span>
                    </button>
                    <button
                      onClick={() => {
                        window.open(`https://wa.me/?text=${encodeURIComponent(shareFullText())}`);
                        setShowShareSheet(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <MessageCircle size={18} />
                      </div>
                      <span>WhatsApp</span>
                    </button>
                    <button
                      onClick={() => {
                        window.open(
                          `mailto:?subject=${encodeURIComponent(
                            config.share?.title || config.appName
                          )}&body=${encodeURIComponent(shareFullText())}`
                        );
                        setShowShareSheet(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Mail size={18} />
                      </div>
                      <span>Email</span>
                    </button>
                    <button
                      onClick={handleNativeShare}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                        <Send size={18} />
                      </div>
                      <span>More</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center -mt-1">
                    On Android this opens the system share sheet with every app that accepts text.
                  </p>
                </div>
              </div>
            )}

            {/* In-app settings sheet (themes, font family, font size, pages) */}
            {showSettingsSheet && (
              <div
                className="absolute inset-0 z-[65] bg-black/60 flex items-end animate-in fade-in duration-200"
                onClick={() => setShowSettingsSheet(false)}
              >
                <div
                  className="w-full max-h-[88%] overflow-y-auto bg-white rounded-t-3xl p-4 shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-8 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <Settings size={15} className="text-indigo-600" />
                        App settings
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Saved on this device · applied in the exported app
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSettingsSheet(false)}
                      className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                      aria-label="Close settings"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  {/* Theme */}
                  {config.inAppSettings?.allowThemeChange !== false && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Theme
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'light' as const, label: 'Light', color: '#f8fafc' },
                          { id: 'dark' as const, label: 'Dark', color: '#0f172a' },
                          { id: 'midnight' as const, label: 'Midnight', color: '#020617' },
                          { id: 'emerald' as const, label: 'Emerald', color: '#052e2b' },
                        ].map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => setSimTheme(theme.id)}
                            className={`p-2 rounded-xl border text-[10px] font-semibold transition ${
                              simTheme === theme.id
                                ? 'border-indigo-500 ring-2 ring-indigo-200 text-slate-900'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            <span
                              className="block w-full h-7 rounded-lg mb-1 border border-slate-200"
                              style={{ backgroundColor: theme.color }}
                            />
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Font family */}
                  {config.inAppSettings?.allowFontChange !== false && (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Font family
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { id: 'system' as const, label: 'System', css: 'system-ui, sans-serif' },
                          { id: 'serif' as const, label: 'Serif', css: 'Georgia, serif' },
                          { id: 'rounded' as const, label: 'Rounded', css: '"Trebuchet MS", sans-serif' },
                          { id: 'mono' as const, label: 'Mono', css: 'ui-monospace, monospace' },
                        ].map((font) => (
                          <button
                            key={font.id}
                            onClick={() => setSimFont(font.id)}
                            style={{ fontFamily: font.css }}
                            className={`py-2 rounded-xl border text-[11px] font-semibold transition ${
                              simFont === font.id
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {font.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Font size */}
                  {config.inAppSettings?.allowFontScale !== false && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Text size
                        </p>
                        <span className="text-[11px] font-bold text-indigo-600">
                          {Math.round(simFontScale * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.85}
                        max={1.35}
                        step={0.05}
                        value={simFontScale}
                        onChange={(e) => setSimFontScale(Number(e.target.value))}
                        className="w-full accent-indigo-600"
                      />
                      <p
                        className="mt-1 text-slate-700 leading-snug"
                        style={{ fontSize: `${12 * simFontScale}px` }}
                      >
                        Preview: this is how body text will look in your app.
                      </p>
                    </div>
                  )}

                  {/* Pages */}
                  <div className="pt-2 border-t border-slate-100 space-y-1.5">
                    {config.pages?.about?.enabled && (
                      <button
                        onClick={() => {
                          setShowSettingsSheet(false);
                          setActiveModalContent({
                            title: config.pages?.about?.title || 'About',
                            html: config.pages?.about?.content || '<p>About this app.</p>',
                          });
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <Info size={14} className="text-sky-500" /> About this app
                        </span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    )}
                    {config.pages?.rate?.enabled && (
                      <button
                        onClick={() => {
                          setShowSettingsSheet(false);
                          window.open(rateUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <Star size={14} className="text-amber-500" /> Rate this app
                        </span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    )}
                    {config.pages?.privacy?.enabled && (
                      <button
                        onClick={() => {
                          setShowSettingsSheet(false);
                          setActiveModalContent({
                            title: config.pages?.privacy?.title || 'Privacy Policy',
                            html:
                              config.pages?.privacy?.content ||
                              '<p>Your privacy policy goes here.</p>',
                          });
                        }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <FileCode size={14} className="text-emerald-500" /> Privacy Policy
                        </span>
                        <ChevronRight size={14} className="text-slate-400" />
                      </button>
                    )}
                    {!config.pages?.about?.enabled &&
                      !config.pages?.rate?.enabled &&
                      !config.pages?.privacy?.enabled && (
                        <p className="text-[11px] text-slate-400 text-center py-1">
                          No info pages are enabled. Turn them on in App Features → Pages.
                        </p>
                      )}
                  </div>
                </div>
              </div>
            )}

            {/* Notification inbox sheet */}
            {showNotificationsSheet && (
              <div
                className="absolute inset-0 z-[65] bg-black/60 flex items-end animate-in fade-in duration-200"
                onClick={() => setShowNotificationsSheet(false)}
              >
                <div
                  className="w-full max-h-[80%] overflow-y-auto bg-white rounded-t-3xl p-4 shadow-2xl flex flex-col gap-3 animate-in slide-in-from-bottom-8 duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto" />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                        <Bell size={15} className="text-rose-500" />
                        {config.notifications?.title || 'Notifications'}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Messages sent by the app creator
                      </p>
                    </div>
                    <button
                      onClick={() => setShowNotificationsSheet(false)}
                      className="p-1 rounded-full text-slate-400 hover:bg-slate-100"
                      aria-label="Close notifications"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">Welcome</span>
                        <span className="text-[9px] text-slate-400">now</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        {config.notifications?.message ||
                          'You are all caught up. New announcements from the creator appear here.'}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-800">App update</span>
                        <span className="text-[9px] text-slate-400">1h</span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-snug">
                        Content is refreshed automatically from your creator&apos;s server.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (typeof Notification === 'undefined') return;
                      const result = await Notification.requestPermission();
                      setNotificationPermission(result);
                    }}
                    disabled={
                      notificationPermission === 'granted' ||
                      notificationPermission === 'unsupported'
                    }
                    className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold transition"
                  >
                    {notificationPermission === 'granted'
                      ? 'Notifications allowed'
                      : notificationPermission === 'denied'
                        ? 'Blocked in browser settings'
                        : notificationPermission === 'unsupported'
                          ? 'System notifications need Android / Chrome'
                          : 'Allow notifications'}
                  </button>
                  {config.notifications?.feedUrl && (
                    <p className="text-[10px] text-slate-400 break-all">
                      Feed: {config.notifications.feedUrl}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Splash Screen Layer */}
            {showSplash && config.splashScreen.enabled && (
              <div
                className="absolute inset-0 z-70 overflow-hidden text-white transition-all duration-500 animate-in fade-in"
                style={{
                  background:
                    config.splashScreen.bgType === 'gradient'
                      ? `linear-gradient(135deg, ${config.splashScreen.gradientFrom}, ${config.splashScreen.gradientTo})`
                      : config.splashScreen.bgColor,
                }}
              >
                {splashLayout === 'image-fullscreen' && config.splashScreen.customImageUrl && (
                  <>
                    <img
                      src={config.splashScreen.customImageUrl}
                      alt="Splash"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/20" />
                  </>
                )}

                <div
                  className={`relative z-10 h-full w-full flex flex-col p-6 ${
                    splashLayout === 'image-fullscreen' && config.splashScreen.customImageUrl
                      ? 'justify-end items-start text-left'
                      : 'items-center justify-center text-center'
                  }`}
                >
                  {splashLayout !== 'text-only' &&
                    !(
                      splashLayout === 'image-fullscreen' &&
                      config.splashScreen.customImageUrl
                    ) &&
                    (config.splashScreen.customImageUrl ? (
                      <div
                        className="overflow-hidden mb-4 shadow-xl bg-white/10 backdrop-blur-sm shrink-0"
                        style={{
                          width: splashLayout === 'image-center' ? 132 : 112,
                          height: splashLayout === 'image-center' ? 132 : 112,
                          borderRadius:
                            splashLayout === 'image-bordered'
                              ? config.splashScreen.imageRadius ?? 24
                              : 18,
                          border:
                            splashLayout === 'image-bordered'
                              ? `${config.splashScreen.imageBorderWidth ?? 4}px solid ${
                                  config.splashScreen.imageBorderColor || '#ffffff'
                                }`
                              : '1px solid rgba(255,255,255,0.25)',
                          padding: 4,
                        }}
                      >
                        <img
                          src={config.splashScreen.customImageUrl}
                          alt="Splash"
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl mb-4 animate-bounce">
                        {renderAppIcon(config.splashScreen.logoIcon, 40, 'text-white')}
                      </div>
                    ))}

                  <h1
                    className={`font-extrabold tracking-tight ${
                      splashLayout === 'image-fullscreen' && config.splashScreen.customImageUrl
                        ? 'text-2xl drop-shadow-lg'
                        : 'text-xl'
                    }`}
                  >
                    {config.splashScreen.title}
                  </h1>
                  <p className="text-xs text-white/80 mt-1 max-w-[85%]">
                    {config.splashScreen.subtitle}
                  </p>

                  {config.splashScreen.showSpinner && (
                    <div className="mt-8 flex items-center gap-2">
                      {config.splashScreen.spinnerType === 'dots' ? (
                        <div className="flex items-center gap-1">
                          {[0, 1, 2].map((index) => (
                            <span
                              key={index}
                              className="w-1.5 h-1.5 rounded-full bg-white animate-bounce"
                              style={{ animationDelay: `${index * 120}ms` }}
                            />
                          ))}
                        </div>
                      ) : config.splashScreen.spinnerType === 'pulse' ? (
                        <div className="w-10 h-1.5 rounded-full bg-white/30 overflow-hidden">
                          <div className="h-full w-1/2 bg-white rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      )}
                      <span className="text-[10px] text-white/70">Starting up...</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
