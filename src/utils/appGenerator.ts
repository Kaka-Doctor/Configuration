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

  // Live content never comes from the cache: the creator edits a JSON file and
  // expects the next poll to show the change.
  let isLiveFeed = false;
  try {
    const url = new URL(event.request.url);
    isLiveFeed = url.pathname.endsWith('.json');
  } catch (error) {
    isLiveFeed = false;
  }
  if (isLiveFeed) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' }).catch(() => caches.match(event.request))
    );
    return;
  }

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
 * The live content feed that ships next to the app.
 *
 * The running app can fetch this JSON at runtime, so the creator edits this
 * single file in the repo and every installed app shows the change on the
 * next refresh — no new APK needed.
 */
export function generateRemoteConfigJson(config: AppConfig): string {
  return JSON.stringify(
    {
      $comment:
        'Live content for the installed app. Edit this file, commit it, and the app updates itself. No rebuild required.',
      updatedAt: new Date().toISOString().slice(0, 10),
      appName: config.appName,
      shortName: config.shortName,
      packageId: config.appPackageId,
      versionCode: config.versionCode,
      versionName: config.versionName,
      targetSdk: config.androidSdk.targetSdk,
      compileSdk: config.androidSdk.compileSdk,
      contentMode: config.contentMode,
      topBar: { title: config.topBar.title },
      launchpadConfig: {
        heading: config.launchpadConfig.heading,
        subheading: config.launchpadConfig.subheading,
        columns: config.launchpadConfig.columns,
        icons: config.launchpadConfig.icons,
      },
      navigation: {
        type: config.navigation.type,
        items: config.navigation.items,
        bottomNavItems: config.navigation.bottomNavItems || [],
      },
      websiteConfig: {
        url: config.websiteConfig.url,
        title: config.websiteConfig.title,
      },
      pages: config.pages,
      share: config.share,
      inAppSettings: config.inAppSettings,
      dataSync: config.dataSync,
      notifications: config.notifications,
      downloads: config.downloads,
      admob: config.admob,
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
  // The splash shows its own uploaded image, or falls back to the app logo.
  const splashImage = config.splashScreen.customImageUrl || config.appLogo.customImageUrl || '';
  const drawerAvatar = config.navigation.drawerHeader.customAvatarUrl || '';
  const drawerBanner = config.navigation.drawerHeader.customBannerUrl || '';
  const splashLayout =
    config.splashScreen.layout || (splashImage ? 'image-center' : 'logo-center');
  const splashBorderColor = config.splashScreen.imageBorderColor || '#ffffff';
  const splashBorderWidth = Math.max(0, config.splashScreen.imageBorderWidth ?? 4);
  const splashRadius = Math.max(0, config.splashScreen.imageRadius ?? 24);
  const splashVisual =
    splashLayout === 'image-center' || splashLayout === 'image-bordered'
      ? splashImage
        ? `<div class="splash-image-box" style="width:160px;height:160px;border-radius:${splashRadius}px;border:${splashLayout === 'image-bordered' ? `${splashBorderWidth}px solid ${splashBorderColor}` : 'none'};margin-bottom:22px;"><img src="${escapeHtml(splashImage)}" alt="Splash" style="object-fit:contain;padding:8px;" /></div>`
        : `<div class="splash-logo"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="4" /></svg></div>`
      : splashLayout === 'text-only'
        ? ''
        : `<div class="splash-logo" style="${splashImage ? 'padding:6px;overflow:hidden;background:rgba(255,255,255,0.2);' : ''}">${
            splashImage
              ? `<img src="${escapeHtml(splashImage)}" alt="Splash Logo" style="width:100%;height:100%;object-fit:contain;border-radius:18px;" />`
              : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="4" /><path d="m9 9 6 6" /><path d="m15 9-6 6" /></svg>`
          }</div>`;
  const bannerSize = config.admob?.bannerSize || 'adaptive';
  const showPwaBanner = Boolean(config.admob?.enabled && config.admob.showBannerInSimulator && config.admob.isTestingMode);
  const adBanner = (position: 'top' | 'bottom') =>
    showPwaBanner && config.admob.bannerPosition === position
      ? `<div class="ad-strip position-${position} size-${bannerSize}">Ad · ${escapeHtml(
          bannerSize.replace('-', ' ')
        )} (test)</div>`
      : '';

  const runtimeData = jsonForScript({
    name: config.appName,
    version: config.versionName,
    packageId: config.appPackageId,
    contentMode: config.contentMode,
    websiteUrl: config.websiteConfig?.url || '',
    websiteTitle: config.websiteConfig?.title || '',
    splashDuration: Math.round(config.splashScreen.durationSeconds * 1000),
    launchpadIcons: config.launchpadConfig.icons || [],
    menuItems: config.navigation.items || [],
    bottomNavItems: config.navigation.bottomNavItems || [],
    navType: config.navigation.type,
    columns: config.launchpadConfig.columns || 2,
    heading: config.launchpadConfig.heading,
    subheading: config.launchpadConfig.subheading,
    share: config.share,
    settings: config.inAppSettings,
    pages: config.pages,
    dataSync: config.dataSync,
    notifications: config.notifications,
    downloads: config.downloads,
    admob: config.admob,
    topBarTitle: config.topBar.title,
  });

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
      padding-bottom: ${config.navigation.type === 'bottom-nav' || config.navigation.type === 'both' ? '68px' : '20px'};
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
    .bottom-nav-bar[hidden] { display: none; }
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

    /* ---------- User themes, fonts and in-app settings ---------- */
    :root {
      --card: #ffffff;
      --text: #1e293b;
      --muted: #64748b;
      --border: #e2e8f0;
      --app-font: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      --font-scale: 1;
    }
    body { font-family: var(--app-font); font-size: calc(15px * var(--font-scale)); }
    body { background: var(--bg); color: var(--text); }
    .icon-card, .drawer-panel, .bottom-nav-bar, .content-modal, .app-sheet, .sheet-card, .notif-item,
    .submenu-link, .modal-body, .modal-header { background: var(--card); color: var(--text); border-color: var(--border); }
    .card-title, .launchpad-heading, .modal-title, .drawer-item, .submenu-link-label { color: var(--text); }
    .card-desc, .launchpad-subheading, .drawer-subtitle, .submenu-link-desc { color: var(--muted); }
    .drawer-item:hover, .drawer-item:active { background: rgba(148, 163, 184, 0.16); }
    .bottom-nav-bar { border-top: 1px solid var(--border); }
    [data-theme='dark'] {
      --bg: #0b1220;
      --card: #16213a;
      --text: #e5edf7;
      --muted: #97a7bd;
      --border: #2a3a57;
      --topbar-bg: #111b2e;
      --topbar-text: #e5edf7;
    }
    [data-theme='midnight'] {
      --bg: #060913;
      --card: #101731;
      --text: #e8e7ff;
      --muted: #9a9bc4;
      --border: #29305a;
      --topbar-bg: #0b1026;
      --topbar-text: #e8e7ff;
      --primary: #8b5cf6;
      --accent: #a78bfa;
    }
    [data-theme='emerald'] {
      --bg: #052a20;
      --card: #0a3a2c;
      --text: #e6fff5;
      --muted: #93c9b5;
      --border: #175845;
      --topbar-bg: #06382a;
      --topbar-text: #e6fff5;
      --primary: #10b981;
      --accent: #34d399;
    }
    body[data-font='serif'] { --app-font: Georgia, 'Times New Roman', serif; }
    body[data-font='rounded'] { --app-font: 'Trebuchet MS', 'Segoe UI', system-ui, sans-serif; }
    body[data-font='mono'] { --app-font: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; }

    /* ---------- Bottom sheets (settings, share, inbox, browser) ---------- */
    .sheet-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.55);
      z-index: 3000;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.25s ease, visibility 0.25s ease;
    }
    .sheet-backdrop.active { opacity: 1; visibility: visible; }
    .sheet-card {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 3001;
      max-height: 88vh;
      border-radius: 22px 22px 0 0;
      display: flex;
      flex-direction: column;
      transform: translateY(102%);
      transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .sheet-card.active { transform: translateY(0); }
    .sheet-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
    }
    .sheet-title { font-size: 16px; font-weight: 700; }
    .sheet-body { padding: 16px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
    .sheet-close {
      background: none;
      border: none;
      color: var(--muted);
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
      padding: 4px 8px;
    }
    .sheet-back {
      background: none;
      border: none;
      color: var(--primary);
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      padding: 4px 0;
    }
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      border: none;
      border-radius: 14px;
      background: var(--primary);
      color: #ffffff;
      font-weight: 700;
      font-size: 15px;
      padding: 13px 16px;
      cursor: pointer;
    }
    .btn-ghost {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: transparent;
      color: var(--text);
      font-weight: 600;
      font-size: 14px;
      padding: 12px 16px;
      cursor: pointer;
    }
    .btn-primary:active, .btn-ghost:active { transform: scale(0.98); }
    .share-textarea {
      width: 100%;
      min-height: 110px;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: transparent;
      color: var(--text);
      font: inherit;
      padding: 12px;
      resize: vertical;
      margin-bottom: 12px;
    }
    .settings-group { margin-bottom: 22px; }
    .settings-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--muted);
      margin-bottom: 9px;
    }
    .theme-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
    .theme-swatch {
      border: 2px solid var(--border);
      border-radius: 14px;
      padding: 8px 4px;
      background: transparent;
      color: var(--text);
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }
    .theme-swatch.active { border-color: var(--primary); }
    .swatch-dot { width: 26px; height: 26px; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.12); }
    .font-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .pill {
      border: 1px solid var(--border);
      background: transparent;
      color: var(--text);
      border-radius: 999px;
      padding: 8px 13px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .pill.active { background: var(--primary); border-color: var(--primary); color: #fff; }
    .range-row { display: flex; align-items: center; gap: 12px; }
    .range-row input[type='range'] { flex: 1; accent-color: var(--primary); }
    .settings-value { font-size: 12px; font-weight: 700; color: var(--muted); min-width: 42px; text-align: right; }

    /* ---------- Notifications ---------- */
    .topbar-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 15px;
      height: 15px;
      border-radius: 999px;
      background: #ef4444;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
    }
    .topbar-btn { position: relative; }
    .notif-item {
      display: flex;
      gap: 10px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 14px;
      margin-bottom: 10px;
      cursor: pointer;
    }
    .notif-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); margin-top: 6px; flex: 0 0 8px; }
    .notif-name { font-size: 14px; font-weight: 700; margin-bottom: 3px; }
    .notif-body { font-size: 12px; color: var(--muted); line-height: 1.45; }
    .notif-time { font-size: 10px; color: var(--muted); margin-top: 4px; }

    /* ---------- In-app browser / downloads ---------- */
    .browser-frame {
      width: 100%;
      height: 58vh;
      border: 1px solid var(--border);
      border-radius: 14px;
      background: #fff;
    }
    .browser-hint { font-size: 11px; color: var(--muted); margin: 10px 0 8px; line-height: 1.5; }
    .browser-actions { display: flex; gap: 8px; }
    .browser-actions .btn-ghost { flex: 1; }
    .browser-fallback {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 18px 14px;
      text-align: center;
      background: rgba(99, 102, 241, 0.06);
    }
    .browser-fallback-title { font-size: 14px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
    .browser-fallback-body { font-size: 12px; color: var(--muted); line-height: 1.6; word-break: break-all; }
    .browser-fallback .btn-primary { margin-top: 12px; width: 100%; }
    .toast {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translate(-50%, 20px);
      background: #0f172a;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      padding: 10px 16px;
      border-radius: 999px;
      z-index: 9000;
      opacity: 0;
      transition: opacity 0.2s ease, transform 0.2s ease;
      pointer-events: none;
      max-width: 88vw;
      text-align: center;
    }
    .toast.active { opacity: 1; transform: translate(-50%, 0); }

    /* ---------- Ads ---------- */
    .ad-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      background: #eef2ff;
      color: #4338ca;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 1px dashed #a5b4fc;
      margin: 10px 16px;
      border-radius: 10px;
      text-align: center;
      padding: 6px;
    }
    .ad-strip.size-banner { height: 50px; }
    .ad-strip.size-large-banner { height: 90px; }
    .ad-strip.size-medium-rectangle { height: 250px; max-width: 300px; margin-left: auto; margin-right: auto; }
    .ad-strip.size-adaptive { height: 60px; }
    .ad-strip.position-top { margin-top: 0; }
    .ad-strip.position-bottom { margin-bottom: 76px; }
    .native-ad {
      border: 1px solid var(--border);
      border-radius: 14px;
      padding: 12px;
      margin-bottom: 16px;
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), transparent);
    }
    .native-ad-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
    .native-ad-title { font-size: 14px; font-weight: 700; margin: 4px 0 2px; }
    .native-ad-body { font-size: 12px; color: var(--muted); }
    .ad-overlay {
      position: fixed;
      inset: 0;
      z-index: 8000;
      background: rgba(2, 6, 23, 0.82);
      display: none;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .ad-overlay.active { display: flex; }
    .ad-overlay-card {
      background: #ffffff;
      color: #0f172a;
      border-radius: 20px;
      padding: 22px;
      width: 100%;
      max-width: 330px;
      text-align: center;
    }
    .ad-overlay-tag { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: #6366f1; }
    .ad-overlay-title { font-size: 17px; font-weight: 800; margin: 8px 0 4px; }
    .ad-overlay-body { font-size: 12px; color: #64748b; margin-bottom: 16px; }
    .ad-count { font-size: 26px; font-weight: 800; color: #6366f1; margin-bottom: 14px; }

    /* ---------- Splash layouts ---------- */
    #splash-screen.layout-image-fullscreen { padding: 0; }
    #splash-screen .splash-bg-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0; }
    #splash-screen .splash-scrim { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.35); z-index: 1; }
    #splash-screen .splash-content { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; width: 100%; }
    #splash-screen.layout-image-fullscreen .splash-content { position: absolute; bottom: 0; left: 0; right: 0; justify-content: flex-end; padding-bottom: 56px; }
    .splash-image-box { background: rgba(255, 255, 255, 0.14); overflow: hidden; }
    .splash-image-box img { width: 100%; height: 100%; display: block; }
  </style>
</head>
<body>

  <!-- Splash Screen -->
  ${config.splashScreen.enabled ? `
  <div id="splash-screen" class="layout-${splashLayout}">
    ${splashLayout === 'image-fullscreen' && splashImage
      ? `<img class="splash-bg-image" src="${escapeHtml(splashImage)}" alt="Splash" /><div class="splash-scrim"></div>`
      : ''}
    <div class="splash-content">
      ${splashLayout === 'image-fullscreen' ? '' : splashVisual}
      <div class="splash-title" style="${splashLayout === 'text-only' ? 'font-size:34px;margin-bottom:12px;' : ''}">${escapeHtml(config.splashScreen.title)}</div>
      <div class="splash-subtitle">${escapeHtml(config.splashScreen.subtitle)}</div>
      ${config.splashScreen.showSpinner ? '<div class="spinner"></div>' : ''}
    </div>
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
      ${config.topBar.showNotificationsButton !== false && (config.notifications?.enabled || config.dataSync?.enabled) ? `
      <button class="topbar-btn" id="btn-notifications" aria-label="Notifications">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        <span class="topbar-badge" id="notif-badge" style="display:none;">0</span>
      </button>
      ` : ''}
      ${config.inAppSettings?.enabled && config.topBar.showSettingsButton !== false ? `
      <button class="topbar-btn" id="btn-app-settings" aria-label="App settings">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.6 3.09V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      </button>
      ` : ''}
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
    ${adBanner('top')}
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
    ${adBanner('bottom')}
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

  <!-- Bottom Nav Bar (shown for bottom nav, or for drawer + bottom nav together) -->
  <nav class="bottom-nav-bar" id="bottom-nav"${config.navigation.type === 'bottom-nav' || config.navigation.type === 'both' ? '' : ' hidden'}></nav>

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

  <!-- Bottom sheet: settings, share, notifications, in-app browser -->
  <div class="sheet-backdrop" id="sheet-backdrop"></div>
  <div class="sheet-card" id="sheet-card" role="dialog" aria-modal="true">
    <div class="sheet-header">
      <button class="sheet-back" id="sheet-back" style="display:none;" type="button">&#8249; Back</button>
      <span class="sheet-title" id="sheet-title">Details</span>
      <button class="sheet-close" id="sheet-close" type="button" aria-label="Close">&times;</button>
    </div>
    <div class="sheet-body" id="sheet-body"></div>
  </div>

  <!-- Advertising overlay (rewarded / interstitial / app open) -->
  <div class="ad-overlay" id="ad-overlay">
    <div class="ad-overlay-card">
      <div class="ad-overlay-tag" id="ad-tag">Advertisement</div>
      <div class="ad-overlay-title" id="ad-title">Your content is almost ready</div>
      <div class="ad-overlay-body" id="ad-body">Please wait for the ad to finish.</div>
      <div class="ad-count" id="ad-count">3</div>
      <button class="btn-ghost" id="ad-skip" type="button" style="display:none;">Continue</button>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    const DATA = ${runtimeData};

    /* ---------------- Helpers ---------------- */
    function $(id) { return document.getElementById(id); }
    function escapeHtml(value) {
      if (value === undefined || value === null) return '';
      return String(value).replace(/[&<>"']/g, function (m) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
      });
    }
    function readStore(key, fallback) {
      try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
    }
    function writeStore(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
    var toastTimer = null;
    function showToast(message) {
      var el = $('toast');
      if (!el) return;
      el.textContent = message;
      el.classList.add('active');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(function () { el.classList.remove('active'); }, 2800);
    }

    /* ---------------- Splash ---------------- */
    var splash = $('splash-screen');
    if (splash) {
      setTimeout(function () { splash.classList.add('hidden'); }, DATA.splashDuration);
    }

    /* ---------------- User settings: 4 themes, font family, text size ---------------- */
    var SETTINGS_KEY = 'appcraft_user_settings_v1';
    var savedSettings = readStore(SETTINGS_KEY, {});
    var userSettings = {
      theme: savedSettings.theme || (DATA.settings && DATA.settings.defaultTheme) || 'light',
      font: savedSettings.font || (DATA.settings && DATA.settings.defaultFont) || 'system',
      scale: savedSettings.scale || (DATA.settings && DATA.settings.defaultFontScale) || 1
    };
    function applyUserSettings() {
      document.documentElement.setAttribute('data-theme', userSettings.theme);
      if (document.body) document.body.setAttribute('data-font', userSettings.font);
      document.documentElement.style.setProperty('--font-scale', String(userSettings.scale));
    }
    applyUserSettings();
    function saveUserSettings() { writeStore(SETTINGS_KEY, userSettings); applyUserSettings(); }

    /* ---------------- Bottom sheet ---------------- */
    var sheetBackdrop = $('sheet-backdrop');
    var sheetCard = $('sheet-card');
    var sheetBody = $('sheet-body');
    var sheetTitle = $('sheet-title');
    var sheetBack = $('sheet-back');
    var sheetClose = $('sheet-close');
    function openSheet(title, html, options) {
      options = options || {};
      if (!sheetBody) return;
      sheetTitle.textContent = title || '';
      sheetBody.innerHTML = html || '';
      sheetBody.scrollTop = 0;
      sheetBack.style.display = options.showBack ? 'inline-block' : 'none';
      sheetBackdrop.classList.add('active');
      sheetCard.classList.add('active');
    }
    function closeSheet() {
      if (!sheetCard) return;
      sheetBackdrop.classList.remove('active');
      sheetCard.classList.remove('active');
      sheetBody.innerHTML = '';
      submenuHistory = [];
      sheetBack.style.display = 'none';
    }
    if (sheetClose) sheetClose.addEventListener('click', closeSheet);
    if (sheetBackdrop) sheetBackdrop.addEventListener('click', closeSheet);

    /* ---------------- Content modal ---------------- */
    var modal = $('content-modal');
    var modalTitle = $('modal-title');
    var modalBody = $('modal-body');
    function nativeAdHtml() {
      return '<div class="native-ad"><div class="native-ad-tag">Sponsored</div>' +
        '<div class="native-ad-title">' + escapeHtml(DATA.name) + ' partner offer</div>' +
        '<div class="native-ad-body">Native-style ad placement. Connect your AdMob native unit in the studio.</div></div>';
    }
    function openContent(title, html, destination) {
      if (!modal) return;
      var ad = '';
      if (destination && destination.nativeAd && DATA.admob && DATA.admob.enabled && DATA.admob.enableNativeAds) {
        ad = nativeAdHtml();
      }
      modalTitle.textContent = title || 'Details';
      modalBody.innerHTML = ad + (html || '');
      modal.classList.add('active');
      modalBody.scrollTop = 0;
    }
    function closeContent() { if (modal) modal.classList.remove('active'); }
    var modalCloseBtn = $('modal-close-btn');
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeContent);

    /* ---------------- Drawer ---------------- */
    var drawerOverlay = $('drawer-overlay');
    var drawerPanel = $('drawer-panel');
    var openMenuBtn = $('btn-open-menu');
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

    /* ---------------- Ads: rewarded / interstitial / app open ---------------- */
    var clickCount = 0;
    var adTimer = null;
    function showAdOverlay(tag, title, body, seconds, done) {
      var overlay = $('ad-overlay');
      if (!overlay) { if (done) done(); return; }
      var left = Math.max(1, seconds || 3);
      $('ad-tag').textContent = tag;
      $('ad-title').textContent = title;
      $('ad-body').textContent = body;
      $('ad-count').textContent = String(left);
      $('ad-skip').style.display = 'none';
      overlay.classList.add('active');
      clearInterval(adTimer);
      adTimer = setInterval(function () {
        left -= 1;
        $('ad-count').textContent = String(Math.max(0, left));
        if (left <= 0) {
          clearInterval(adTimer);
          $('ad-skip').style.display = 'inline-flex';
          if (window.AndroidBridge && window.AndroidBridge.toast) {
            window.AndroidBridge.toast('Ad finished');
          }
        }
      }, 1000);
      $('ad-skip').onclick = function () {
        overlay.classList.remove('active');
        $('ad-skip').style.display = 'none';
        if (done) done();
      };
    }
    function withAds(destination, action) {
      var ads = DATA.admob || {};
      var bridge = window.AndroidBridge;
      if (!ads.enabled) { action(); return; }
      clickCount += 1;
      if (ads.enableRewardedAds && destination && destination.rewardedAd) {
        if (bridge && bridge.showRewarded) {
          var finished = false;
          var finish = function () {
            if (finished) return;
            finished = true;
            action();
          };
          window.__onRewarded = finish;
          window.__onRewardedFailed = finish;
          bridge.showRewarded();
          setTimeout(finish, 15000);
          return;
        }
        showAdOverlay('Rewarded ad', 'Watch to unlock this section', 'A short sponsored message plays before your content.', 3, action);
        return;
      }
      var every = Math.max(3, Math.min(20, ads.interstitialEveryClicks || 5));
      if (ads.interstitialUnitId && clickCount % every === 0) {
        if (bridge && bridge.maybeInterstitial) { bridge.maybeInterstitial(); action(); return; }
        showAdOverlay('Interstitial ad', 'Your content opens next', 'Interstitial ads appear every ' + every + ' taps.', 3, action);
        return;
      }
      action();
    }
    if (DATA.admob && DATA.admob.enabled && DATA.admob.appOpenUnitId) {
      if (window.AndroidBridge && window.AndroidBridge.maybeAppOpen) {
        window.AndroidBridge.maybeAppOpen();
      } else {
        var launches = (parseInt(localStorage.getItem('appcraft_launches') || '0', 10) || 0) + 1;
        localStorage.setItem('appcraft_launches', String(launches));
        var openEvery = Math.max(1, Math.min(10, DATA.admob.appOpenEveryLaunches || 5));
        if (launches % openEvery === 0) {
          setTimeout(function () {
            showAdOverlay('App open ad', 'Welcome back', 'This ad supports the app and closes automatically.', 3, null);
          }, 1400);
        }
      }
    }

    /* ---------------- Share (typed message + Android share sheet) ---------------- */
    function sharePayload(text) {
      var url = (DATA.share && DATA.share.url) || location.href;
      var title = (DATA.share && DATA.share.title) || DATA.name;
      var full = text + (url ? '\\n' + url : '');
      if (window.AndroidBridge && window.AndroidBridge.shareText) {
        window.AndroidBridge.shareText(full);
        return;
      }
      if (navigator.share) {
        navigator.share({ title: title, text: text, url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(full).then(function () {
          showToast('Message copied — paste it in any app');
        }).catch(function () {});
        return;
      }
      showToast('Sharing is not supported on this device');
    }
    function openShare(initialText) {
      var text = initialText || (DATA.share && DATA.share.message) || ('Check out ' + DATA.name);
      var html = '<p class="browser-hint">Type or edit your message. Tapping Share opens the Android share sheet with every app that accepts text.</p>' +
        '<textarea class="share-textarea" id="share-text" placeholder="Write a message...">' + escapeHtml(text) + '</textarea>' +
        '<button class="btn-primary" id="share-do" type="button">Share message</button>';
      openSheet('Share', html);
      var input = $('share-text');
      var doShare = $('share-do');
      if (doShare) doShare.onclick = function () {
        var value = input && input.value ? input.value.trim() : '';
        if (!value) { showToast('Type a message first'); return; }
        sharePayload(value);
        showToast('Opening share apps...');
        setTimeout(closeSheet, 500);
      };
    }

    /* ---------------- In-app settings sheet ---------------- */
    var THEMES = [
      { id: 'light', label: 'Light', color: '#f8fafc' },
      { id: 'dark', label: 'Dark', color: '#16213a' },
      { id: 'midnight', label: 'Midnight', color: '#101731' },
      { id: 'emerald', label: 'Emerald', color: '#0a3a2c' }
    ];
    var FONTS = [
      { id: 'system', label: 'System' },
      { id: 'serif', label: 'Serif' },
      { id: 'rounded', label: 'Rounded' },
      { id: 'mono', label: 'Mono' }
    ];
    function openSettings() {
      var cfg = DATA.settings || {};
      var themeButtons = '';
      if (cfg.allowThemeChange !== false) {
        themeButtons = '<div class="settings-group"><div class="settings-label">Theme</div><div class="theme-grid">' +
          THEMES.map(function (theme) {
            return '<button class="theme-swatch' + (userSettings.theme === theme.id ? ' active' : '') + '" data-theme-pick="' + theme.id + '" type="button">' +
              '<span class="swatch-dot" style="background:' + theme.color + '"></span>' + theme.label + '</button>';
          }).join('') + '</div></div>';
      }
      var fontButtons = '';
      if (cfg.allowFontChange !== false) {
        fontButtons = '<div class="settings-group"><div class="settings-label">Font</div><div class="font-row">' +
          FONTS.map(function (font) {
            return '<button class="pill' + (userSettings.font === font.id ? ' active' : '') + '" data-font-pick="' + font.id + '" type="button">' + font.label + '</button>';
          }).join('') + '</div></div>';
      }
      var sizeGroup = '';
      if (cfg.allowFontScale !== false) {
        sizeGroup = '<div class="settings-group"><div class="settings-label">Text size</div><div class="range-row">' +
          '<span style="font-size:12px;">A</span>' +
          '<input type="range" id="font-scale" min="0.85" max="1.35" step="0.05" value="' + userSettings.scale + '" />' +
          '<span style="font-size:18px;">A</span>' +
          '<span class="settings-value" id="font-scale-value">' + Math.round(userSettings.scale * 100) + '%</span></div></div>';
      }
      var pages = DATA.pages || {};
      var links = '';
      if (pages.about && pages.about.enabled) links += '<button class="btn-ghost" id="open-about" type="button" style="margin-bottom:8px;">About this app</button>';
      if (pages.rate && pages.rate.enabled) links += '<button class="btn-ghost" id="open-rate" type="button" style="margin-bottom:8px;">Rate this app</button>';
      if (pages.privacy && pages.privacy.enabled) links += '<button class="btn-ghost" id="open-privacy" type="button" style="margin-bottom:8px;">Privacy policy</button>';
      if (DATA.notifications && DATA.notifications.enabled) links += '<button class="btn-ghost" id="open-inbox" type="button" style="margin-bottom:8px;">Notifications</button>';
      if (DATA.notifications && DATA.notifications.enabled && DATA.notifications.useSystemNotifications) {
        links += '<button class="btn-ghost" id="enable-notifications" type="button" style="margin-bottom:8px;">Allow device notifications</button>';
      }
      var html = themeButtons + fontButtons + sizeGroup +
        (links ? '<div class="settings-group"><div class="settings-label">More</div>' + links + '</div>' : '') +
        '<p style="font-size:11px;color:var(--muted);text-align:center;margin-top:6px;">' +
        escapeHtml(DATA.name) + ' v' + escapeHtml(DATA.version) + '</p>';
      openSheet('App settings', html);

      Array.prototype.forEach.call(sheetBody.querySelectorAll('[data-theme-pick]'), function (btn) {
        btn.addEventListener('click', function () {
          userSettings.theme = btn.getAttribute('data-theme-pick');
          saveUserSettings();
          openSettings();
        });
      });
      Array.prototype.forEach.call(sheetBody.querySelectorAll('[data-font-pick]'), function (btn) {
        btn.addEventListener('click', function () {
          userSettings.font = btn.getAttribute('data-font-pick');
          saveUserSettings();
          openSettings();
        });
      });
      var scale = $('font-scale');
      if (scale) scale.addEventListener('input', function () {
        userSettings.scale = Number(scale.value) || 1;
        var label = $('font-scale-value');
        if (label) label.textContent = Math.round(userSettings.scale * 100) + '%';
        saveUserSettings();
      });
      var aboutBtn = $('open-about');
      if (aboutBtn) aboutBtn.onclick = openAbout;
      var rateBtn = $('open-rate');
      if (rateBtn) rateBtn.onclick = openRate;
      var privacyBtn = $('open-privacy');
      if (privacyBtn) privacyBtn.onclick = openPrivacy;
      var inboxBtn = $('open-inbox');
      if (inboxBtn) inboxBtn.onclick = openInbox;
      var enableBtn = $('enable-notifications');
      if (enableBtn) enableBtn.onclick = function () {
        if (!('Notification' in window)) { showToast('This browser has no notification support'); return; }
        Notification.requestPermission().then(function (permission) {
          showToast(permission === 'granted' ? 'Notifications enabled' : 'Notifications blocked in browser settings');
          if (permission === 'granted' && DATA.notifications) {
            maybeSystemNotify([{ title: DATA.notifications.title, body: DATA.notifications.message }]);
          }
        });
      };
    }

    /* ---------------- About / Rate / Privacy ---------------- */
    function openAbout() {
      var page = (DATA.pages && DATA.pages.about) || {};
      if (!page.enabled) return;
      openSheet(page.title || 'About', '<div class="about-text" style="font-size:14px;line-height:1.7;">' + (page.content || '') + '</div>' +
        '<p class="browser-hint" style="margin-top:14px;">' + escapeHtml(DATA.name) + ' v' + escapeHtml(DATA.version) + '</p>');
    }
    function openRate() {
      var page = (DATA.pages && DATA.pages.rate) || {};
      if (!page.enabled) return;
      var url = page.url || ('https://play.google.com/store/apps/details?id=' + encodeURIComponent(DATA.packageId));
      openSheet(page.title || 'Rate this app', '<p style="font-size:14px;line-height:1.6;margin-bottom:14px;">' + escapeHtml(page.message || '') + '</p>' +
        '<button class="btn-primary" id="rate-now" type="button">Rate now</button>');
      var btn = $('rate-now');
      if (btn) btn.onclick = function () { openExternal(url); };
    }
    function openPrivacy() {
      var page = (DATA.pages && DATA.pages.privacy) || {};
      if (!page.enabled) return;
      openSheet(page.title || 'Privacy policy', '<div class="about-text" style="font-size:14px;line-height:1.7;">' + (page.content || '') + '</div>');
    }

    /* ---------------- Links, in-app browser and downloads ---------------- */
    var DOWNLOAD_EXT = /\\.(pdf|zip|rar|7z|apk|aab|docx?|xlsx?|pptx?|csv|txt|mp3|mp4|m4a|wav|epub|exe|dmg|iso)(\\?|#|$)/i;
    function openExternal(url) {
      if (!url) return;
      if (window.AndroidBridge && window.AndroidBridge.openExternal) { window.AndroidBridge.openExternal(url); return; }
      window.open(url, '_blank', 'noopener');
    }
    function downloadFile(url, filename) {
      if (!url) return;
      if (window.AndroidBridge && window.AndroidBridge.downloadFile) {
        window.AndroidBridge.downloadFile(url, filename || '');
        showToast('Download started — check your notifications');
        return;
      }
      var link = document.createElement('a');
      link.href = url;
      if (filename) link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      showToast('Download started');
    }
    function openLink(url, external, destination) {
      if (!url) return;
      if (DOWNLOAD_EXT.test(url) && DATA.downloads && DATA.downloads.enabled) { downloadFile(url); return; }
      if (external) { openExternal(url); return; }
      if (DATA.downloads && DATA.downloads.inAppBrowser === false) { openExternal(url); return; }
      // The in-app browser sheet keeps the app's own UI (and its Back button)
      // intact, in the PWA and in the Android WebView alike.
      openBrowser(url);
    }
    function youtubeEmbedUrl(url) {
      var match = String(url).match(/(?:youtu\\.be\\/|youtube\\.com\\/(?:watch\\?v=|embed\\/|shorts\\/|live\\/))([A-Za-z0-9_-]{6,})/i);
      return match ? 'https://www.youtube.com/embed/' + match[1] : '';
    }
    var FRAME_BLOCKED = /(?:^|\\.)(?:facebook\\.com|instagram\\.com|x\\.com|twitter\\.com|tiktok\\.com|linkedin\\.com|google\\.com|youtube\\.com|amazon\\.[a-z.]+|whatsapp\\.com|telegram\\.(?:org|me)|github\\.com|netflix\\.com|spotify\\.com|reddit\\.com|pinterest\\.com)$/i;
    function openBrowser(url) {
      var embed = youtubeEmbedUrl(url);
      var host = '';
      try { host = new URL(url, location.href).hostname; } catch (e) {}
      var blocked = !embed && host && FRAME_BLOCKED.test(host);
      var body;
      if (embed) {
        body = '<iframe class="browser-frame" src="' + escapeHtml(embed) + '" title="Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen></iframe>' +
          '<p class="browser-hint">Playing inside the app. Use “Open outside app” for the full YouTube app.</p>';
      } else if (blocked) {
        body = '<div class="browser-fallback"><div class="browser-fallback-title">This site blocks in-app views</div>' +
          '<div class="browser-fallback-body">' + escapeHtml(url) + '</div>' +
          '<button class="btn-primary" id="browser-external-main" type="button">Open in browser / app</button></div>';
      } else {
        body = '<iframe class="browser-frame" src="' + escapeHtml(url) + '" title="In-app browser" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"></iframe>' +
          '<p class="browser-hint">This page opens inside the app. If it stays blank, open it externally.</p>';
      }
      body += '<div class="browser-actions"><button class="btn-ghost" id="browser-external" type="button">Open outside app</button>' +
        '<button class="btn-ghost" id="browser-download" type="button">Download / save</button></div>';
      openSheet(embed ? 'Video' : 'Web page', body);
      ['browser-external', 'browser-external-main'].forEach(function (id) {
        var btn = $(id);
        if (btn) btn.onclick = function () { openExternal(url); };
      });
      var dl = $('browser-download');
      if (dl) dl.onclick = function () { downloadFile(url); };
    }

    /* ---------------- Destinations and nested submenus ---------------- */
    var submenuHistory = [];
    function runDestination(destination, fallbackTitle) {
      if (!destination) return;
      var title = fallbackTitle || destination.label || destination.title || 'Details';
      withAds(destination, function () {
        var action = destination.actionType;
        if (action === 'share') { openShare(destination.targetUrl || ''); return; }
        if (action === 'about') { openAbout(); return; }
        if (action === 'contact') {
          if (destination.targetUrl) openLink(destination.targetUrl, destination.openExternally, destination);
          else openSheet(title, '<div class="submenu-empty">No contact address configured.</div>');
          return;
        }
        if (action === 'html-page') {
          openContent(title, destination.targetHtml || destination.htmlContent || '<p>No content available</p>', destination);
          return;
        }
        if (action === 'submenu') { openSubmenu(destination); return; }
        if (destination.targetUrl) { openLink(destination.targetUrl, destination.openExternally, destination); return; }
        openSheet(title, '<div class="submenu-empty">No destination configured for this section yet.</div>');
      });
    }
    function openSubmenu(source, isChild) {
      if (!source) return;
      if (!isChild) submenuHistory = [];
      var children = (source.children || []).filter(Boolean);
      var title = source.label || source.title || 'More';
      if (!children.length) {
        openSheet(title, '<div class="submenu-empty">No destinations configured yet.</div>');
        return;
      }
      var rows = children.map(function (child, index) {
        var label = child.label || 'Section ' + (index + 1);
        var nested = child.children && child.children.length;
        return '<button class="submenu-link" type="button" data-submenu-index="' + index + '">' +
          '<span class="submenu-link-icon">' + escapeHtml(label.charAt(0).toUpperCase()) + '</span>' +
          '<span class="submenu-link-text"><span class="submenu-link-label">' + escapeHtml(label) + '</span>' +
          (child.description ? '<span class="submenu-link-desc">' + escapeHtml(child.description) + '</span>' : '') +
          '</span>' +
          (nested ? '<span class="item-badge">' + child.children.length + ' more</span>' : '') +
          (child.badge ? '<span class="item-badge">' + escapeHtml(child.badge) + '</span>' : '') +
          '<span class="submenu-chevron">&#8250;</span></button>';
      }).join('');
      openSheet(title, '<p class="submenu-intro">Choose where to go next:</p><div class="submenu-list">' + rows + '</div>',
        { showBack: submenuHistory.length > 0 });
      Array.prototype.forEach.call(sheetBody.querySelectorAll('[data-submenu-index]'), function (btn) {
        btn.addEventListener('click', function () {
          var child = children[Number(btn.getAttribute('data-submenu-index'))];
          if (child.children && child.children.length) {
            submenuHistory.push(source);
            openSubmenu(child, true);
          } else {
            runDestination(child, title);
          }
        });
      });
    }
    if (sheetBack) sheetBack.addEventListener('click', function () {
      var parent = submenuHistory.pop();
      if (parent) openSubmenu(parent, true);
    });

    /* ---------------- Rendering ---------------- */
    function renderDrawer() {
      var drawerNav = $('drawer-items-list');
      if (!drawerNav) return;
      drawerNav.innerHTML = '';
      (DATA.menuItems || []).forEach(function (item) {
        var el = document.createElement('div');
        el.className = 'drawer-item';
        var childCount = item.children ? item.children.length : 0;
        var trailing = item.actionType === 'submenu'
          ? '<span class="item-badge" style="background:#ede9fe;color:#6d28d9;">' + childCount + ' places &#8250;</span>'
          : (item.badge ? '<span class="item-badge">' + escapeHtml(item.badge) + '</span>' : '');
        el.innerHTML = '<div class="drawer-item-left">' +
          (item.customImageUrl ? '<img class="drawer-item-image" src="' + escapeHtml(item.customImageUrl) + '" alt="" />' : '') +
          '<span>' + escapeHtml(item.label) + '</span></div>' + trailing;
        el.addEventListener('click', function () {
          closeDrawer();
          if (item.actionType === 'submenu') openSubmenu(item);
          else runDestination(item, item.label);
        });
        drawerNav.appendChild(el);
      });
    }
    function renderBottomNav() {
      var bottomNav = $('bottom-nav');
      if (!bottomNav) return;
      bottomNav.innerHTML = '';
      var source = (DATA.bottomNavItems && DATA.bottomNavItems.length)
        ? DATA.bottomNavItems
        : (DATA.menuItems || []).slice(0, 5);
      source.filter(function (item) { return item.showOnHome !== false; }).forEach(function (item, idx) {
        var el = document.createElement('div');
        el.className = 'bottom-nav-item' + (idx === 0 ? ' active' : '');
        el.innerHTML = '<span>' + escapeHtml(item.label) + '</span>';
        el.addEventListener('click', function () {
          Array.prototype.forEach.call(document.querySelectorAll('.bottom-nav-item'), function (b) { b.classList.remove('active'); });
          el.classList.add('active');
          if (item.actionType === 'submenu') openSubmenu(item);
          else runDestination(item, item.label);
        });
        bottomNav.appendChild(el);
      });
    }
    function renderLaunchpad() {
      var grid = $('launchpad-grid');
      if (!grid) return;
      grid.innerHTML = '';
      var heading = document.querySelector('.launchpad-heading');
      var subheading = document.querySelector('.launchpad-subheading');
      if (heading) heading.textContent = DATA.heading || '';
      if (subheading) subheading.textContent = DATA.subheading || '';
      (DATA.launchpadIcons || []).filter(function (iconItem) {
        return iconItem.showOnHome !== false;
      }).forEach(function (iconItem) {
        var card = document.createElement('div');
        card.className = 'icon-card';
        var submenuCount = iconItem.children ? iconItem.children.length : 0;
        var actionHint = iconItem.actionType === 'submenu'
          ? '<span class="card-submenu-count">' + submenuCount + ' places &#8250;</span>'
          : '';
        card.innerHTML =
          (iconItem.badge ? '<span class="card-badge" style="background:' + (iconItem.badgeColor || iconItem.color) + '">' + escapeHtml(iconItem.badge) + '</span>' : '') +
          (iconItem.customImageUrl
            ? '<div class="card-icon-wrap" style="background:transparent;overflow:hidden;"><img src="' + escapeHtml(iconItem.customImageUrl) + '" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" alt="" /></div>'
            : '<div class="card-icon-wrap" style="background:' + escapeHtml(iconItem.color || 'var(--primary)') + '"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="m9 12 2 2 4-4"></path></svg></div>') +
          '<div class="card-title">' + escapeHtml(iconItem.title) + '</div>' +
          '<div class="card-desc">' + escapeHtml(iconItem.description) + '</div>' +
          actionHint;
        card.addEventListener('click', function () {
          if (iconItem.actionType === 'submenu') openSubmenu(iconItem);
          else runDestination(iconItem, iconItem.title);
        });
        grid.appendChild(card);
      });
    }

    /* ---------------- Notifications inbox ---------------- */
    var NOTIF_KEY = 'appcraft_notifications_v1';
    var notifState = readStore(NOTIF_KEY, { items: [], read: [] });
    if (!notifState.items) notifState.items = [];
    if (!notifState.read) notifState.read = [];
    function notifFeedUrl() {
      if (DATA.notifications && DATA.notifications.feedUrl) return DATA.notifications.feedUrl;
      if (DATA.dataSync && DATA.dataSync.notificationsUrl) return DATA.dataSync.notificationsUrl;
      return '';
    }
    function updateNotifBadge() {
      var badge = $('notif-badge');
      if (!badge) return;
      var unread = notifState.items.filter(function (item) {
        return notifState.read.indexOf(String(item.id || item.title)) === -1;
      }).length;
      badge.textContent = String(unread);
      badge.style.display = unread > 0 ? 'flex' : 'none';
    }
    function maybeSystemNotify(items) {
      if (!DATA.notifications || !DATA.notifications.enabled) return;
      if (window.AndroidBridge && window.AndroidBridge.notify) {
        items.slice(0, 3).forEach(function (item) {
          try {
            window.AndroidBridge.notify(
              item.title || DATA.notifications.title,
              item.body || item.message || ''
            );
          } catch (e) {}
        });
        return;
      }
      if (!DATA.notifications.useSystemNotifications) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      items.slice(0, 3).forEach(function (item) {
        try {
          var note = new Notification(item.title || DATA.notifications.title, {
            body: item.body || item.message || '',
            icon: 'icons/icon-192.png'
          });
          note.onclick = function () { window.focus(); if (item.url) openLink(item.url, false); };
        } catch (e) {}
      });
    }
    function fetchNotifications() {
      var url = notifFeedUrl();
      if (!url) return;
      fetch(url, { cache: 'no-store' }).then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      }).then(function (payload) {
        var items = Array.isArray(payload) ? payload : (payload.notifications || payload.items || []);
        if (!Array.isArray(items)) return;
        var previous = notifState.items.map(function (i) { return String(i.id || i.title); });
        notifState.items = items;
        writeStore(NOTIF_KEY, notifState);
        updateNotifBadge();
        var fresh = items.filter(function (item) {
          var key = String(item.id || item.title);
          return previous.indexOf(key) === -1;
        });
        maybeSystemNotify(fresh);
      }).catch(function () {});
    }
    function openInbox() {
      var items = notifState.items.slice().reverse();
      var title = (DATA.notifications && DATA.notifications.title) || 'Notifications';
      if (!items.length) {
        openSheet(title, '<div class="submenu-empty">No announcements yet.<br/>Updates will appear here automatically.</div>');
        return;
      }
      var html = items.map(function (item, index) {
        var key = String(item.id || item.title);
        var unread = notifState.read.indexOf(key) === -1;
        return '<div class="notif-item" data-notif-index="' + index + '">' +
          (unread ? '<span class="notif-dot"></span>' : '') +
          '<div style="flex:1;"><div class="notif-name">' + escapeHtml(item.title || 'Update') + '</div>' +
          '<div class="notif-body">' + escapeHtml(item.body || item.message || '') + '</div>' +
          (item.date ? '<div class="notif-time">' + escapeHtml(item.date) + '</div>' : '') + '</div></div>';
      }).join('');
      openSheet(title, html);
      Array.prototype.forEach.call(sheetBody.querySelectorAll('[data-notif-index]'), function (row) {
        row.addEventListener('click', function () {
          var item = items[Number(row.getAttribute('data-notif-index'))];
          if (item.url) openLink(item.url, false);
        });
      });
      notifState.read = notifState.items.map(function (item) { return String(item.id || item.title); });
      writeStore(NOTIF_KEY, notifState);
      updateNotifBadge();
    }

    /* ---------------- Live sync from the creator's GitHub repo ---------------- */
    function applyRemoteConfig(payload) {
      if (!payload) return;
      var config = payload.config || payload;
      if (config.appName) {
        DATA.name = config.appName;
        document.title = config.appName;
        var titleEl = document.querySelector('.topbar-title');
        if (titleEl) titleEl.textContent = (config.topBar && config.topBar.title) || config.appName;
      }
      if (config.launchpadConfig) {
        if (Array.isArray(config.launchpadConfig.icons)) DATA.launchpadIcons = config.launchpadConfig.icons;
        if (config.launchpadConfig.heading) DATA.heading = config.launchpadConfig.heading;
        if (config.launchpadConfig.subheading) DATA.subheading = config.launchpadConfig.subheading;
        renderLaunchpad();
      }
      if (config.navigation) {
        if (Array.isArray(config.navigation.items)) DATA.menuItems = config.navigation.items;
        if (Array.isArray(config.navigation.bottomNavItems)) DATA.bottomNavItems = config.navigation.bottomNavItems;
        if (config.navigation.type) {
          DATA.navType = config.navigation.type;
          var bottomBar = $('bottom-nav');
          if (bottomBar) {
            bottomBar.hidden = !(config.navigation.type === 'bottom-nav' || config.navigation.type === 'both');
          }
        }
        renderDrawer();
        renderBottomNav();
      }
      if (config.pages) DATA.pages = config.pages;
      if (config.share) DATA.share = config.share;
      if (config.notifications) DATA.notifications = Object.assign(DATA.notifications || {}, config.notifications);
      if (config.admob) DATA.admob = Object.assign(DATA.admob || {}, config.admob);
      if (config.websiteConfig && config.websiteConfig.url) {
        var frame = document.querySelector('.webview-frame');
        if (frame) frame.src = config.websiteConfig.url;
      }
      showToast('App content updated');
    }
    function resolveLiveConfigUrl() {
      var configured = DATA.dataSync && DATA.dataSync.configUrl;
      if (configured && configured.indexOf('__APPCRAFT_') !== 0) return configured;
      if (!/^https?:$/.test(location.protocol)) return '';
      var parts = location.pathname.split('/').filter(Boolean);
      // GitHub Pages: derive the raw repository URL automatically.
      if (/\\.github\\.io$/i.test(location.hostname) && parts.length) {
        return 'https://raw.githubusercontent.com/' +
          location.hostname.replace(/\\.github\\.io$/i, '') + '/' + parts[0] + '/main/app-config.json';
      }
      // Netlify / Vercel / any static host: read app-config.json next to index.html.
      var base = location.pathname.replace(/[^/]*$/, '');
      return location.origin + base + 'app-config.json';
    }
    function syncRemoteConfig() {
      if (!DATA.dataSync || !DATA.dataSync.enabled) return;
      var url = resolveLiveConfigUrl();
      if (!url) return;
      fetch(url, { cache: 'no-store' }).then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      }).then(applyRemoteConfig).catch(function () {});
    }
    if (DATA.dataSync && DATA.dataSync.enabled) {
      syncRemoteConfig();
      setInterval(syncRemoteConfig, Math.max(30, DATA.dataSync.refreshSeconds || 120) * 1000);
    }

    /* ---------------- Top bar buttons ---------------- */
    var shareBtn = $('btn-share-app');
    if (shareBtn) shareBtn.addEventListener('click', function () { openShare(''); });
    var settingsBtn = $('btn-app-settings');
    if (settingsBtn) settingsBtn.addEventListener('click', openSettings);
    var notifBtn = $('btn-notifications');
    if (notifBtn) notifBtn.addEventListener('click', openInbox);
    var refreshBtn = $('btn-refresh-page');
    if (refreshBtn) refreshBtn.addEventListener('click', function () {
      syncRemoteConfig();
      fetchNotifications();
      setTimeout(function () { window.location.reload(); }, 350);
    });

    /* ---------------- Boot rendering ---------------- */
    renderDrawer();
    renderBottomNav();
    renderLaunchpad();
    if (DATA.notifications && DATA.notifications.enabled) {
      updateNotifBadge();
      fetchNotifications();
      setInterval(fetchNotifications, Math.max(30, DATA.notifications.pollSeconds || 120) * 1000);
    }

    /* ---------------- Service worker ---------------- */
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function (err) {
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
      content: generateRemoteConfigJson(config),
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
/**
 * Repository exports are hosted (GitHub Pages / Netlify / Vercel), so the live
 * feed is enabled automatically. The workflow fills the placeholder in with
 * this repository's raw URL; hosted PWAs can also auto-detect it at runtime.
 */
const LIVE_CONFIG_PLACEHOLDER = '__APPCRAFT_LIVE_CONFIG_URL__';

function withGitHubLiveSync(config: AppConfig): AppConfig {
  const explicitUrl = (config.dataSync?.configUrl || '').trim();
  return {
    ...config,
    dataSync: {
      enabled: true,
      configUrl: explicitUrl || LIVE_CONFIG_PLACEHOLDER,
      refreshSeconds: config.dataSync?.refreshSeconds || 120,
      notificationsUrl: config.dataSync?.notificationsUrl || '',
      requestNotificationPermission: config.dataSync?.requestNotificationPermission ?? false,
    },
  };
}

export async function createGitHubRepoZip(config: AppConfig): Promise<Blob> {
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();
  // A repository export is always meant to be hosted, so live sync is on by
  // default. The workflow replaces the placeholder with the real raw URL.
  const exportConfig = withGitHubLiveSync(config);
  await addProjectFiles(zip, await buildAndroidProjectFiles(exportConfig, { includeSigning: false }));

  zip.file('.github/workflows/build-apk.yml', generateGitHubActionsWorkflow(exportConfig));
  zip.file('.gitignore', generateGitignore());
  zip.file('README.md', generateProjectReadme(exportConfig));
  zip.file('SIGNING.txt', generateKeystoreReadme(config.keystore, false));

  // Hosted PWA version at the repository root.
  zip.file('index.html', generateAppHtml(exportConfig));
  zip.file('manifest.webmanifest', JSON.stringify(generateManifestJson(exportConfig), null, 2));
  zip.file('sw.js', generateServiceWorkerJs(exportConfig));
  zip.file('capacitor.config.json', generateCapacitorConfig(exportConfig));
  // The feed installed apps poll for live content updates.
  zip.file('app-config.json', generateRemoteConfigJson(exportConfig));
  const pwaIcons = await buildPwaIconAssets(exportConfig);
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
