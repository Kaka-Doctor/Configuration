import type { AppConfig } from '../types/appConfig';
import type JSZip from 'jszip';
import { createKeystoreBlob, safeKeystoreFileName } from './keystoreGenerator';
import {
  AGP_VERSION,
  GRADLE_VERSION,
  KOTLIN_VERSION,
  appSlug,
  generateActivityLayout,
  generateAndroidManifestXml,
  generateAppBuildGradle,
  generateAppBuildGradle as generateBuildGradle,
  generateColorsXml,
  generateGitHubActionsWorkflow,
  generateGitignore,
  generateGradleProperties,
  generateKeystoreReadme,
  generateLocalProperties,
  generateMainActivityKt,
  generateNetworkSecurityConfig,
  generateProguardRules,
  generateProjectReadme,
  generateProjectReadme as generateReadmeMd,
  generateRootBuildGradle,
  generateSettingsGradle,
  generateStringsXml,
  generateThemesV31Xml,
  generateThemesXml,
  generateWrapperProperties,
} from './androidProject';
import { buildAndroidIconAssets, buildPwaIconAssets } from './iconRenderer';

/** Keeps line endings correct when the project is pushed from Windows/macOS. */
const GITATTRIBUTES = `* text=auto
*.gradle text eol=lf
*.kt text eol=lf
*.xml text eol=lf
gradlew text eol=lf
*.bat text eol=crlf
*.jar binary
*.png binary
*.keystore binary
`;

export {
  AGP_VERSION,
  GRADLE_VERSION,
  KOTLIN_VERSION,
  appSlug,
  generateActivityLayout,
  generateAndroidManifestXml,
  generateAppBuildGradle,
  generateAppBuildGradle as generateBuildGradle,
  generateColorsXml,
  generateGitHubActionsWorkflow,
  generateGitignore,
  generateGradleProperties,
  generateKeystoreReadme,
  generateMainActivityKt,
  generateNetworkSecurityConfig,
  generateProguardRules,
  generateProjectReadme,
  generateProjectReadme as generateReadmeMd,
  generateRootBuildGradle,
  generateSettingsGradle,
  generateStringsXml,
  generateThemesV31Xml,
  generateThemesXml,
  generateWrapperProperties,
} from './androidProject';

/**
 * Generates the Web App Manifest object for PWA / Android installation.
 */
export function generateManifestJson(config: AppConfig) {
  const shortName = config.shortName.length > 12 ? config.shortName.slice(0, 12) : config.shortName;
  return {
    id: '/',
    name: config.appName,
    short_name: shortName,
    description: config.description || `${config.appName} Android PWA Application`,
    start_url: './index.html',
    scope: './',
    display: config.pwaSettings.display,
    orientation: config.pwaSettings.orientation,
    background_color: config.backgroundColor,
    theme_color: config.themeColor,
    icons: [
      {
        src: 'icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: 'icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

/**
 * Generates the offline Service Worker code (sw.js).
 */
export function generateServiceWorkerJs(config: AppConfig): string {
  return `/* Service Worker for ${config.appName} */
const CACHE_NAME = '${config.shortName.toLowerCase().replace(/[^a-z0-9]/g, '')}-v${config.pwaSettings.version || '1'}';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './sw.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Pre-cache partial notice:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached and refresh in background
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback for offline navigation
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
`;
}

/**
 * Generates capacitor.config.json for building native Android APK.
 */
export function generateCapacitorConfig(config: AppConfig): string {
  return JSON.stringify(
    {
      appId: config.appPackageId || 'com.example.app',
      appName: config.appName,
      webDir: 'dist',
      bundledWebRuntime: false,
      server: {
        androidScheme: 'https',
      },
      plugins: {
        SplashScreen: {
          launchShowDuration: Math.round(config.splashScreen.durationSeconds * 1000),
          backgroundColor: config.splashScreen.bgColor,
          showSpinner: config.splashScreen.showSpinner,
        },
      },
    },
    null,
    2
  );
}


/**
 * Generates the standalone index.html for the created Android PWA.
 */
export function generateAppHtml(config: AppConfig): string {
  const manifestJsonString = JSON.stringify(generateManifestJson(config), null, 2);

  // Serialize icon data for the standalone app
  const iconsData = jsonForScript(config.launchpadConfig.icons || []);
  const menuItemsData = jsonForScript(config.navigation.items || []);
  // The splash shows its own uploaded image, or falls back to the app logo.
  const splashImage = config.splashScreen.customImageUrl || config.appLogo.customImageUrl || '';
  const drawerAvatar = config.navigation.drawerHeader.customAvatarUrl || '';
  const drawerBanner = config.navigation.drawerHeader.customBannerUrl || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>${escapeHtml(config.appName)}</title>
  <meta name="description" content="${escapeHtml(config.description || config.appName)}">
  <meta name="theme-color" content="${config.themeColor}">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="${escapeHtml(config.shortName)}">
  <link rel="manifest" href="manifest.webmanifest">
  <style>
    :root {
      --primary: ${config.themeColor};
      --accent: ${config.accentColor};
      --bg: ${config.backgroundColor};
      --topbar-bg: ${config.topBar.bgColor};
      --topbar-text: ${config.topBar.textColor};
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-tap-highlight-color: transparent;
    }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: #1e293b;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      user-select: none;
    }
    /* Splash Screen */
    #splash-screen {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: ${config.splashScreen.bgType === 'gradient' ? `linear-gradient(135deg, ${config.splashScreen.gradientFrom}, ${config.splashScreen.gradientTo})` : config.splashScreen.bgColor};
      color: #ffffff;
      transition: opacity 0.5s ease, visibility 0.5s ease;
    }
    #splash-screen.hidden {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }
    .splash-logo {
      width: 88px;
      height: 88px;
      border-radius: 22px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
      margin-bottom: 24px;
      animation: pulse-logo 1.8s infinite ease-in-out;
    }
    @keyframes pulse-logo {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.06); }
    }
    .splash-title {
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 8px;
    }
    .splash-subtitle {
      font-size: 14px;
      opacity: 0.85;
      margin-bottom: 32px;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.25);
      border-top-color: #ffffff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Top Bar */
    header.app-topbar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--topbar-bg);
      color: var(--topbar-text);
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 56px;
      padding: 0 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .topbar-btn {
      background: none;
      border: none;
      color: inherit;
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }
    .topbar-title {
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.3px;
    }
    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Main Container */
    main.app-viewport {
      flex: 1;
      display: flex;
      flex-direction: column;
      position: relative;
      padding-bottom: ${config.navigation.type === 'bottom-nav' ? '68px' : '20px'};
    }

    /* Launchpad Grid */
    .launchpad-container {
      padding: 20px 16px;
      max-width: 600px;
      margin: 0 auto;
      width: 100%;
    }
    .launchpad-header {
      margin-bottom: 20px;
    }
    .launchpad-heading {
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
    }
    .launchpad-subheading {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }
    .icon-grid {
      display: grid;
      grid-template-columns: repeat(${config.launchpadConfig.columns || 2}, 1fr);
      gap: 14px;
    }
    .icon-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      text-align: left;
      cursor: pointer;
      position: relative;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      box-shadow: 0 2px 6px rgba(0,0,0,0.04);
    }
    .icon-card:active {
      transform: scale(0.97);
    }
    .card-badge {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
      color: white;
    }
    .card-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      margin-bottom: 12px;
    }
    .card-title {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin-bottom: 4px;
    }
    .card-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.4;
    }

    /* Webview Container */
    .webview-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      width: 100%;
      height: calc(100vh - 56px);
      background: #ffffff;
    }
    .webview-frame {
      width: 100%;
      flex: 1;
      border: none;
    }

    /* Drawer Menu */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }
    .drawer-overlay.active {
      opacity: 1;
      visibility: visible;
    }
    .drawer-panel {
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      width: 290px;
      max-width: 80vw;
      background: #ffffff;
      z-index: 1001;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      box-shadow: 4px 0 24px rgba(0,0,0,0.15);
    }
    .drawer-panel.active {
      transform: translateX(0);
    }
    .drawer-header {
      background: ${config.navigation.drawerHeader.bannerColor || config.themeColor};
      color: #ffffff;
      padding: 32px 20px 20px;
    }
    .drawer-user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 20px;
      margin-bottom: 12px;
    }
    .drawer-user-avatar-img {
      object-fit: cover;
      padding: 0;
      background: rgba(255,255,255,0.35);
    }
    .drawer-item-image {
      width: 22px;
      height: 22px;
      border-radius: 6px;
      object-fit: cover;
      display: block;
    }
    .drawer-title {
      font-size: 18px;
      font-weight: 700;
    }
    .drawer-subtitle {
      font-size: 13px;
      opacity: 0.85;
      margin-top: 2px;
    }
    .drawer-nav {
      flex: 1;
      overflow-y: auto;
      padding: 12px 8px;
    }
    .drawer-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 14px;
      border-radius: 10px;
      color: #334155;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 4px;
    }
    .drawer-item:hover, .drawer-item:active {
      background: #f1f5f9;
    }
    .drawer-item-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .item-badge {
      background: var(--accent);
      color: white;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
    }

    /* Bottom Navigation */
    .bottom-nav-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 58px;
      background: #ffffff;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-around;
      align-items: center;
      z-index: 90;
      box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
    }
    .bottom-nav-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      flex: 1;
      color: #64748b;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      height: 100%;
    }
    .bottom-nav-item.active {
      color: var(--primary);
      font-weight: 700;
    }

    /* Modal / HTML Viewer */
    .content-modal {
      position: fixed;
      inset: 0;
      background: #ffffff;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .content-modal.active {
      transform: translateY(0);
    }
    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
    }
    .modal-title {
      font-size: 16px;
      font-weight: 600;
    }
    .modal-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px 20px;
      line-height: 1.6;
    }
    /* Submenu: one icon reveals several destinations */
    .submenu-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .submenu-intro {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 4px;
    }
    .submenu-link {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 14px;
      background: #ffffff;
      text-align: left;
      font: inherit;
      color: inherit;
      cursor: pointer;
      transition: border-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
    }
    .submenu-link:active {
      transform: scale(0.985);
      border-color: var(--primary);
      box-shadow: 0 2px 10px rgba(0,0,0,0.08);
    }
    .submenu-link-icon {
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      border-radius: 12px;
      background: var(--primary);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 15px;
      font-weight: 700;
    }
    .submenu-link-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      flex: 1;
      min-width: 0;
    }
    .submenu-link-label {
      font-size: 14px;
      font-weight: 600;
      color: #0f172a;
    }
    .submenu-link-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.35;
    }
    .submenu-chevron {
      color: #94a3b8;
      font-size: 20px;
      line-height: 1;
      padding-left: 2px;
    }
    .submenu-empty {
      padding: 28px 16px;
      text-align: center;
      color: #64748b;
      font-size: 13px;
      border: 1px dashed #cbd5e1;
      border-radius: 14px;
    }
    .card-submenu-count {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.12);
      color: var(--primary);
      font-weight: 700;
    }
  </style>
</head>
<body>

  <!-- Splash Screen -->
  ${config.splashScreen.enabled ? `
  <div id="splash-screen">
    <div class="splash-logo" style="${splashImage ? 'padding:6px;overflow:hidden;background:rgba(255,255,255,0.2);' : ''}">
      ${splashImage ? `
      <img src="${escapeHtml(splashImage)}" alt="Splash Logo" style="width:100%;height:100%;object-fit:contain;border-radius:18px;" />
      ` : `
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="4" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </svg>
      `}
    </div>
    <div class="splash-title">${escapeHtml(config.splashScreen.title)}</div>
    <div class="splash-subtitle">${escapeHtml(config.splashScreen.subtitle)}</div>
    ${config.splashScreen.showSpinner ? '<div class="spinner"></div>' : ''}
  </div>
  ` : ''}

  <!-- App Top Bar -->
  ${config.topBar.enabled ? `
  <header class="app-topbar">
    <div class="topbar-left">
      ${config.topBar.showMenuToggle ? `
      <button class="topbar-btn" id="btn-open-menu" aria-label="Open Navigation Menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="4" x2="20" y1="12" y2="12"></line>
          <line x1="4" x2="20" y1="6" y2="6"></line>
          <line x1="4" x2="20" y1="18" y2="18"></line>
        </svg>
      </button>
      ` : ''}
      ${(config.topBar.customLogoUrl || (config.appLogo.customImageUrl && config.topBar.showLogo)) ? `
      <img src="${config.topBar.customLogoUrl || config.appLogo.customImageUrl}" alt="Logo" style="width:28px;height:28px;border-radius:6px;object-fit:cover;margin-right:2px;" />
      ` : ''}
      <div class="topbar-title">${escapeHtml(config.topBar.title)}</div>
    </div>
    <div class="topbar-actions">
      ${config.topBar.showShareButton ? `
      <button class="topbar-btn" id="btn-share-app" aria-label="Share Application">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="18" cy="5" r="3"></circle>
          <circle cx="6" cy="12" r="3"></circle>
          <circle cx="18" cy="19" r="3"></circle>
          <line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line>
          <line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line>
        </svg>
      </button>
      ` : ''}
      ${config.topBar.showRefreshButton ? `
      <button class="topbar-btn" id="btn-refresh-page" aria-label="Refresh">
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path>
          <path d="M21 3v5h-5"></path>
        </svg>
      </button>
      ` : ''}
    </div>
  </header>
  ` : ''}

  <!-- Viewport Content -->
  <main class="app-viewport">
    ${config.contentMode === 'website' ? `
    <div class="webview-wrapper">
      <iframe class="webview-frame" src="${escapeHtml((config.websiteConfig?.url || '').trim() || 'about:blank')}" title="Web Content" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
    </div>
    ` : `
    <div class="launchpad-container">
      <div class="launchpad-header">
        <h1 class="launchpad-heading">${escapeHtml(config.launchpadConfig.heading)}</h1>
        <p class="launchpad-subheading">${escapeHtml(config.launchpadConfig.subheading)}</p>
      </div>
      <div class="icon-grid" id="launchpad-grid">
        <!-- Rendered via JS -->
      </div>
    </div>
    `}
  </main>

  <!-- Navigation Drawer (if drawer navigation is selected) -->
  <div class="drawer-overlay" id="drawer-overlay"></div>
  <aside class="drawer-panel" id="drawer-panel">
    <div class="drawer-header"${
      drawerBanner
        ? ` style="background-image:linear-gradient(rgba(0,0,0,0.35),rgba(0,0,0,0.35)),url(&quot;${escapeHtml(drawerBanner)}&quot;);background-size:cover;background-position:center;"`
        : ''
    }>
      ${
        config.navigation.drawerHeader.showUserAvatar
          ? drawerAvatar
            ? `<img class="drawer-user-avatar drawer-user-avatar-img" src="${escapeHtml(drawerAvatar)}" alt="Profile" />`
            : `<div class="drawer-user-avatar">A</div>`
          : ''
      }
      <div class="drawer-title">${escapeHtml(config.navigation.drawerHeader.title)}</div>
      <div class="drawer-subtitle">${escapeHtml(config.navigation.drawerHeader.subtitle)}</div>
    </div>
    <nav class="drawer-nav" id="drawer-items-list"></nav>
  </aside>

  <!-- Bottom Nav Bar (if bottom nav is selected) -->
  ${config.navigation.type === 'bottom-nav' ? `
  <nav class="bottom-nav-bar" id="bottom-nav"></nav>
  ` : ''}

  <!-- Modal for Embedded HTML Pages / Viewer -->
  <div class="content-modal" id="content-modal">
    <div class="modal-header">
      <span class="modal-title" id="modal-title">Details</span>
      <button class="topbar-btn" id="modal-close-btn" style="color:#0f172a;" aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
    </div>
    <div class="modal-body" id="modal-body"></div>
  </div>

  <script>
    const APP_CONFIG = {
      name: ${jsonForScript(config.appName)},
      splashDuration: ${Math.round(config.splashScreen.durationSeconds * 1000)},
      launchpadIcons: ${iconsData},
      menuItems: ${menuItemsData}
    };

    // Splash Screen dismiss
    const splash = document.getElementById('splash-screen');
    if (splash) {
      setTimeout(() => {
        splash.classList.add('hidden');
      }, APP_CONFIG.splashDuration);
    }

    // Share Handler (Web Share API)
    function handleShare() {
      if (navigator.share) {
        navigator.share({
          title: APP_CONFIG.name,
          text: 'Check out ' + APP_CONFIG.name + ' on your Android device!',
          url: window.location.href
        }).catch(() => {});
      } else {
        navigator.clipboard?.writeText(window.location.href);
        alert('App link copied to clipboard: ' + window.location.href);
      }
    }

    const shareBtn = document.getElementById('btn-share-app');
    if (shareBtn) shareBtn.addEventListener('click', handleShare);

    const refreshBtn = document.getElementById('btn-refresh-page');
    if (refreshBtn) refreshBtn.addEventListener('click', () => window.location.reload());

    // Drawer Menu Logic
    const drawerOverlay = document.getElementById('drawer-overlay');
    const drawerPanel = document.getElementById('drawer-panel');
    const openMenuBtn = document.getElementById('btn-open-menu');

    function openDrawer() {
      if (drawerOverlay && drawerPanel) {
        drawerOverlay.classList.add('active');
        drawerPanel.classList.add('active');
      }
    }
    function closeDrawer() {
      if (drawerOverlay && drawerPanel) {
        drawerOverlay.classList.remove('active');
        drawerPanel.classList.remove('active');
      }
    }
    if (openMenuBtn) openMenuBtn.addEventListener('click', openDrawer);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

    // Modal Logic
    const modal = document.getElementById('content-modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    function openModal(title, html) {
      if (modal && modalTitle && modalBody) {
        modalTitle.textContent = title;
        modalBody.innerHTML = html;
        modal.classList.add('active');
      }
    }
    if (modalCloseBtn) {
      modalCloseBtn.addEventListener('click', () => modal.classList.remove('active'));
    }

    // Runs any destination: used by menu items, cards and submenu children.
    function runDestination(destination, fallbackTitle) {
      if (!destination) return;
      const title = fallbackTitle || destination.label || destination.title || 'Details';
      if (destination.actionType === 'share') {
        handleShare();
      } else if (destination.actionType === 'contact') {
        if (destination.targetUrl) {
          window.location.href = destination.targetUrl;
        } else {
          openModal(title, '<div class="submenu-empty">No contact address configured.</div>');
        }
      } else if (destination.actionType === 'html-page') {
        openModal(
          title,
          destination.targetHtml || destination.htmlContent || '<p>No content available</p>'
        );
      } else if (destination.targetUrl) {
        window.open(destination.targetUrl, '_blank');
      } else {
        openModal(
          title,
          '<div class="submenu-empty">No destination configured for this section yet.</div>'
        );
      }
    }

    // A submenu groups two or more destinations behind a single icon.
    function openSubmenu(source) {
      if (!source) return;
      const children = (source.children || []).filter(Boolean);
      const title = source.label || source.title || 'More';
      if (!children.length) {
        openModal(title, '<div class="submenu-empty">No destinations configured yet.</div>');
        return;
      }
      const rows = children
        .map(function (child, index) {
          const label = child.label || 'Section ' + (index + 1);
          return (
            '<button class="submenu-link" type="button" data-submenu-index="' + index + '">' +
              '<span class="submenu-link-icon">' + escapeHtml(label.charAt(0).toUpperCase()) + '</span>' +
              '<span class="submenu-link-text">' +
                '<span class="submenu-link-label">' + escapeHtml(label) + '</span>' +
                (child.description
                  ? '<span class="submenu-link-desc">' + escapeHtml(child.description) + '</span>'
                  : '') +
              '</span>' +
              (child.badge ? '<span class="item-badge">' + escapeHtml(child.badge) + '</span>' : '') +
              '<span class="submenu-chevron">&#8250;</span>' +
            '</button>'
          );
        })
        .join('');
      openModal(
        title + ' \\u00b7 ' + children.length + ' destinations',
        '<p class="submenu-intro">Choose where to go next:</p><div class="submenu-list">' + rows + '</div>'
      );
      if (modalBody) {
        Array.prototype.forEach.call(
          modalBody.querySelectorAll('[data-submenu-index]'),
          function (btn) {
            btn.addEventListener('click', function () {
              const child = children[Number(btn.getAttribute('data-submenu-index'))];
              runDestination(child, title);
            });
          }
        );
      }
    }

    // Render Drawer Items
    const drawerNav = document.getElementById('drawer-items-list');
    if (drawerNav && APP_CONFIG.menuItems) {
      APP_CONFIG.menuItems.forEach(item => {
        const el = document.createElement('div');
        el.className = 'drawer-item';
        const childCount = item.children ? item.children.length : 0;
        const trailing = item.actionType === 'submenu'
          ? '<span class="item-badge" style="background:#ede9fe;color:#6d28d9;">' +
            childCount + ' places &#8250;</span>'
          : (item.badge ? '<span class="item-badge">' + escapeHtml(item.badge) + '</span>' : '');
        el.innerHTML = \`
          <div class="drawer-item-left">
            \${item.customImageUrl ? \`<img class="drawer-item-image" src="\${escapeHtml(item.customImageUrl)}" alt="" />\` : ''}
            <span>\${escapeHtml(item.label)}</span>
          </div>
          \${trailing}
        \`;
        el.addEventListener('click', () => {
          closeDrawer();
          if (item.actionType === 'submenu') {
            openSubmenu(item);
          } else {
            runDestination(item, item.label);
          }
        });
        drawerNav.appendChild(el);
      });
    }

    // Render Bottom Nav Items
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav && APP_CONFIG.menuItems) {
      APP_CONFIG.menuItems.slice(0, 4).forEach((item, idx) => {
        const el = document.createElement('div');
        el.className = 'bottom-nav-item' + (idx === 0 ? ' active' : '');
        el.innerHTML = \`<span>\${escapeHtml(item.label)}</span>\`;
        el.addEventListener('click', () => {
          document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
          el.classList.add('active');
          if (item.actionType === 'submenu') {
            openSubmenu(item);
          } else {
            runDestination(item, item.label);
          }
        });
        bottomNav.appendChild(el);
      });
    }

    // Render Launchpad Grid
    const grid = document.getElementById('launchpad-grid');
    if (grid && APP_CONFIG.launchpadIcons) {
      APP_CONFIG.launchpadIcons.forEach(iconItem => {
        const card = document.createElement('div');
        card.className = 'icon-card';
        const submenuCount = iconItem.children ? iconItem.children.length : 0;
        const actionHint = iconItem.actionType === 'submenu'
          ? '<span class="card-submenu-count">' + submenuCount + ' places &#8250;</span>'
          : '';
        card.innerHTML = \`
          \${iconItem.badge ? \`<span class="card-badge" style="background:\${iconItem.badgeColor || iconItem.color}">\${escapeHtml(iconItem.badge)}</span>\` : ''}
          \${iconItem.customImageUrl ? \`
            <div class="card-icon-wrap" style="background:transparent;overflow:hidden;">
              <img src="\${iconItem.customImageUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt="\${escapeHtml(iconItem.title)}" />
            </div>
          \` : \`
            <div class="card-icon-wrap" style="background:\${iconItem.color}">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="18" height="18" x="3" y="3" rx="2"></rect>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
            </div>
          \`}
          <div class="card-title">\${escapeHtml(iconItem.title)}</div>
          <div class="card-desc">\${escapeHtml(iconItem.description)}</div>
          \${actionHint}
        \`;
        card.addEventListener('click', () => {
          if (iconItem.actionType === 'submenu') {
            openSubmenu(iconItem);
          } else {
            runDestination(iconItem, iconItem.title);
          }
        });
        grid.appendChild(card);
      });
    }

    // Helper HTML Escaper
    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/[&<>"']/g, function(m) {
        return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m];
      });
    }

    // Register Service Worker (only over http/https — file:// in a WebView
    // cannot register one, and this page also ships inside the APK).
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => {
          console.log('SW registration note:', err);
        });
      });
    }
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, (m) => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return map[m] || m;
  });
}

/**
 * JSON that is safe to embed inside a <script> block.
 * Prevents user HTML content (e.g. a `</script>` in a menu page) from breaking
 * out of the script tag.
 */
function jsonForScript(value: unknown): string {
  return JSON.stringify(value ?? null)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export interface ProjectFile {
  path: string;
  content: string | Blob | Uint8Array;
}

export interface ProjectBuildOptions {
  /**
   * Android Studio exports are private, local projects, so they may embed the
   * user's keystore and signing properties. GitHub exports must not, because
   * that repository is pushed to a remote.
   */
  includeSigning?: boolean;
}

/**
 * Builds the complete, compilable native Android project.
 * Both the GitHub export and the Android Studio export use this exact file set,
 * so the two can never drift apart again.
 */
export async function buildAndroidProjectFiles(
  config: AppConfig,
  options: ProjectBuildOptions = {}
): Promise<ProjectFile[]> {
  const includeSigning = options.includeSigning !== false;
  const packagePath = (config.appPackageId || 'com.example.app').replace(/\./g, '/');

  // Loaded on demand so the studio's initial bundle stays small.
  const {
    GRADLE_WRAPPER_JAR_BASE64,
    GRADLEW_BAT_BASE64,
    GRADLEW_SH_BASE64,
    base64ToBytes,
    base64ToText,
  } = await import('./gradleWrapperData');

  const files: ProjectFile[] = [
    { path: 'settings.gradle', content: generateSettingsGradle(config) },
    { path: 'build.gradle', content: generateRootBuildGradle() },
    { path: 'gradle.properties', content: generateGradleProperties(config, includeSigning) },
    { path: 'gradlew', content: base64ToText(GRADLEW_SH_BASE64) },
    { path: 'gradlew.bat', content: base64ToText(GRADLEW_BAT_BASE64) },
    { path: 'gradle/wrapper/gradle-wrapper.properties', content: generateWrapperProperties() },
    { path: 'gradle/wrapper/gradle-wrapper.jar', content: base64ToBytes(GRADLE_WRAPPER_JAR_BASE64) },
    { path: '.gitattributes', content: GITATTRIBUTES },
    { path: 'local.properties', content: generateLocalProperties() },
    { path: 'app/build.gradle', content: generateAppBuildGradle(config) },
    { path: 'app/proguard-rules.pro', content: generateProguardRules(config) },
    { path: 'app/src/main/AndroidManifest.xml', content: generateAndroidManifestXml(config) },
    { path: `app/src/main/java/${packagePath}/MainActivity.kt`, content: generateMainActivityKt(config) },
    { path: 'app/src/main/res/layout/activity_main.xml', content: generateActivityLayout(config) },
    { path: 'app/src/main/res/values/strings.xml', content: generateStringsXml(config) },
    { path: 'app/src/main/res/values/colors.xml', content: generateColorsXml(config) },
    { path: 'app/src/main/res/values/themes.xml', content: generateThemesXml() },
    { path: 'app/src/main/res/values-v31/themes.xml', content: generateThemesV31Xml() },
    { path: 'app/src/main/res/xml/network_security_config.xml', content: generateNetworkSecurityConfig() },
    { path: 'app/src/main/assets/index.html', content: generateAppHtml(config) },
    {
      path: 'app/src/main/assets/manifest.webmanifest',
      content: JSON.stringify(generateManifestJson(config), null, 2),
    },
    { path: 'app/src/main/assets/sw.js', content: generateServiceWorkerJs(config) },
    {
      path: 'app/src/main/assets/app-config.json',
      content: JSON.stringify(
        {
          appName: config.appName,
          shortName: config.shortName,
          packageId: config.appPackageId,
          versionCode: config.versionCode,
          versionName: config.versionName,
          targetSdk: config.androidSdk.targetSdk,
          compileSdk: config.androidSdk.compileSdk,
          contentMode: config.contentMode,
          adMobEnabled: Boolean(config.admob?.enabled),
        },
        null,
        2
      ),
    },
  ];

  // Real PNG launcher icons rendered from the uploaded logo / brand colours.
  const iconAssets = await buildAndroidIconAssets(config);
  files.push(...iconAssets.map((asset) => ({ path: asset.path, content: asset.blob })));

  // Only include a keystore that the user actually supplied (never a fake one),
  // and only in the private Android Studio export.
  const keystoreBlob = includeSigning ? createKeystoreBlob(config.keystore) : null;
  if (keystoreBlob) {
    files.push({ path: `app/${safeKeystoreFileName(config.keystore.fileName)}`, content: keystoreBlob });
  }

  return files;
}

async function addProjectFiles(zip: JSZip, files: ProjectFile[]): Promise<void> {
  for (const file of files) {
    zip.file(file.path, file.content);
  }
}

const ZIP_OPTIONS = {
  type: 'blob' as const,
  compression: 'DEFLATE' as const,
  compressionOptions: { level: 6 },
};

/**
 * Export for Android Studio: a standalone, compilable Gradle project.
 */
export async function createAndroidStudioProjectZip(config: AppConfig): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  await addProjectFiles(zip, await buildAndroidProjectFiles(config, { includeSigning: true }));

  zip.file('README.md', generateProjectReadme(config));
  zip.file('SIGNING.txt', generateKeystoreReadme(config.keystore));
  zip.file(
    'OPEN-IN-ANDROID-STUDIO.txt',
    `1. Unzip this folder.
2. Android Studio -> File -> Open... -> select this folder.
3. Wait for "Gradle sync" to finish (the included wrapper downloads Gradle ${GRADLE_VERSION} automatically).
4. Press Run to install on your phone/emulator, or
   Build -> Generate Signed Bundle / APK... to create a release APK/AAB.

Command line (optional) — the Gradle wrapper is included:
  macOS/Linux: chmod +x gradlew && ./gradlew :app:assembleDebug
  Windows:     gradlew.bat :app:assembleDebug
  Google Play: ./gradlew :app:bundleRelease
`
  );

  return zip.generateAsync(ZIP_OPTIONS);
}

/**
 * Export for GitHub: the same compilable Android project, plus:
 *  - a working GitHub Actions workflow that builds a real APK + AAB,
 *  - the hosted PWA files at the repo root (GitHub Pages),
 *  - real PNG icons,
 *  - a .gitignore that keeps keystores and build output out of git.
 */
export async function createGitHubRepoZip(config: AppConfig): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  await addProjectFiles(zip, await buildAndroidProjectFiles(config, { includeSigning: false }));

  zip.file('.github/workflows/build-apk.yml', generateGitHubActionsWorkflow(config));
  zip.file('.gitignore', generateGitignore());
  zip.file('README.md', generateProjectReadme(config));
  zip.file('SIGNING.txt', generateKeystoreReadme(config.keystore, false));

  // Hosted PWA version at the repository root.
  zip.file('index.html', generateAppHtml(config));
  zip.file('manifest.webmanifest', JSON.stringify(generateManifestJson(config), null, 2));
  zip.file('sw.js', generateServiceWorkerJs(config));
  zip.file('capacitor.config.json', generateCapacitorConfig(config));
  const pwaIcons = await buildPwaIconAssets(config);
  await addProjectFiles(
    zip,
    pwaIcons.map((asset) => ({ path: asset.path, content: asset.blob }))
  );

  return zip.generateAsync(ZIP_OPTIONS);
}

/** File list shown in the export UI (paths only). */
export async function listProjectFiles(config: AppConfig): Promise<string[]> {
  const files = await buildAndroidProjectFiles(config);
  return files.map((file) => file.path).sort();
}
