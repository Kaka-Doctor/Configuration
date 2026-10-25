import React, { useState, useEffect } from 'react';
import { AppConfig, LaunchpadIconItem, MenuItem } from '../types/appConfig';
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
  ExternalLink,
  Copy,
  MessageCircle,
  Mail,
  Send,
  Sparkles,
} from 'lucide-react';

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
  const [inAppBrowserUrl, setInAppBrowserUrl] = useState<string | null>(null);
  const [showShareSheet, setShowShareSheet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

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
    setInAppBrowserUrl(null);
    setTimeout(() => {
      setShowSplash(false);
    }, config.splashScreen.durationSeconds * 1000);
  };

  const handleShareTrigger = () => {
    setShowShareSheet(true);
  };

  const handleCopyShareLink = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleLaunchpadIconClick = (icon: LaunchpadIconItem) => {
    if (icon.actionType === 'website' && icon.targetUrl) {
      setInAppBrowserUrl(icon.targetUrl);
    } else if (icon.actionType === 'html-page' && icon.htmlContent) {
      setActiveModalContent({ title: icon.title, html: icon.htmlContent });
    }
  };

  const handleMenuItemClick = (item: MenuItem) => {
    setIsDrawerOpen(false);
    if (item.actionType === 'share') {
      handleShareTrigger();
    } else if (item.actionType === 'html-page' && item.targetHtml) {
      setActiveModalContent({ title: item.label, html: item.targetHtml });
    } else if (item.actionType === 'website' && item.targetUrl) {
      setInAppBrowserUrl(item.targetUrl);
    } else if (item.actionType === 'contact') {
      setActiveModalContent({
        title: item.label,
        html: `<h3>Support & Contact</h3><p>Need assistance with this application? Email our team at: <strong>${item.targetUrl || 'support@example.com'}</strong></p>`,
      });
    }
  };

  const frameBorderClass =
    frameColor === 'black'
      ? 'border-slate-800 bg-slate-950 shadow-2xl shadow-black/60'
      : frameColor === 'silver'
      ? 'border-slate-300 bg-slate-200 shadow-2xl shadow-slate-900/40'
      : 'border-emerald-900 bg-emerald-950 shadow-2xl shadow-emerald-950/50';

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
            style={{ backgroundColor: config.backgroundColor }}
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
                    {config.launchpadConfig.icons.map((item) => (
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

                        <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-100">
                          <span className="truncate">{item.category}</span>
                          <span className="text-indigo-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                            {item.actionType === 'website' ? 'Open URL →' : 'View File →'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {config.launchpadConfig.icons.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-300 rounded-xl">
                      No icons configured yet. Use the Launchpad editor tab to add app icons!
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Simulated AdMob Top Banner (if top position) */}
            {config.admob?.enabled && config.admob.showBannerInSimulator && config.admob.bannerPosition === 'top' && (
              <div className="shrink-0 h-11 w-full bg-slate-900 border-b border-amber-500/40 px-3 flex items-center justify-between text-white z-25 text-xs shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-amber-500 text-black">
                    Ad
                  </span>
                  <span className="text-[11px] font-medium text-slate-200 truncate">
                    {config.admob.isTestingMode ? 'AdMob Test Banner (320x50)' : 'Sponsored Ad'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">AdMob</span>
              </div>
            )}

            {/* Bottom Nav Bar (if configured as bottom-nav) */}
            {config.navigation.type === 'bottom-nav' && config.navigation.items.length > 0 && (
              <div className="shrink-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around px-1 z-30 shadow-lg">
                {config.navigation.items.slice(0, 5).map((item) => {
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
              <div className="shrink-0 h-11 w-full bg-slate-900 border-t border-amber-500/40 px-3 flex items-center justify-between text-white z-25 text-xs shadow-md">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-xs bg-amber-500 text-black">
                    Ad
                  </span>
                  <span className="text-[11px] font-medium text-slate-200 truncate">
                    {config.admob.isTestingMode ? 'AdMob Test Banner (320x50)' : 'Sponsored Ad'}
                  </span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono">AdMob</span>
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
                <iframe
                  src={inAppBrowserUrl}
                  title="In-App Browser"
                  className="w-full flex-1 border-none"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
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
                        <span className="text-slate-500">{renderAppIcon(item.icon, 18)}</span>
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          {item.badge}
                        </span>
                      )}
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

                  {/* Share Target Apps */}
                  <div className="grid grid-cols-4 gap-2 py-2 text-center text-[10px] text-slate-600">
                    <button
                      onClick={handleCopyShareLink}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                        <Copy size={18} />
                      </div>
                      <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                    </button>
                    <button
                      onClick={() => {
                        window.open(`https://wa.me/?text=Check out ${encodeURIComponent(config.appName)}!`);
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
                        window.open(`mailto:?subject=${encodeURIComponent(config.appName)}&body=Download this Android app!`);
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
                      onClick={() => {
                        window.open(`https://twitter.com/intent/tweet?text=Check out ${encodeURIComponent(config.appName)}!`);
                        setShowShareSheet(false);
                      }}
                      className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <div className="w-10 h-10 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                        <Send size={18} />
                      </div>
                      <span>Social</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Splash Screen Layer */}
            {showSplash && config.splashScreen.enabled && (
              <div
                className="absolute inset-0 z-70 flex flex-col items-center justify-center text-white p-6 transition-all duration-500 animate-in fade-in"
                style={{
                  background:
                    config.splashScreen.bgType === 'gradient'
                      ? `linear-gradient(135deg, ${config.splashScreen.gradientFrom}, ${config.splashScreen.gradientTo})`
                      : config.splashScreen.bgColor,
                }}
              >
                {config.splashScreen.customImageUrl ? (
                  <div className="w-24 h-24 rounded-2xl overflow-hidden mb-4 shadow-xl border border-white/20 bg-white/10 backdrop-blur-sm p-1">
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
                )}
                <h1 className="text-xl font-extrabold tracking-tight text-center">
                  {config.splashScreen.title}
                </h1>
                <p className="text-xs text-white/80 text-center mt-1">
                  {config.splashScreen.subtitle}
                </p>

                {config.splashScreen.showSpinner && (
                  <div className="mt-8 flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="text-[10px] text-white/70">Starting up...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
