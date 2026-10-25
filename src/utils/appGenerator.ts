import { AppConfig } from '../types/appConfig';
import JSZip from 'jszip';
import { createKeystoreBlob, generateSigningGradleProperties } from './keystoreGenerator';

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
 * Generates app/build.gradle with targetSdk, minSdk, compileSdk, versionCode, versionName, and AdMob dependencies.
 */
export function generateBuildGradle(config: AppConfig): string {
  const sdk = config.androidSdk || {
    compileSdk: 36,
    targetSdk: 36,
    minSdk: 24,
    jdkVersion: '17',
    gradleVersion: '8.7',
    enableProGuard: true,
  };
  return `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

android {
    namespace '${config.appPackageId}'
    compileSdk ${sdk.compileSdk}

    defaultConfig {
        applicationId "${config.appPackageId}"
        minSdk ${sdk.minSdk}
        targetSdk ${sdk.targetSdk}
        versionCode ${config.versionCode || 1}
        versionName "${config.versionName || '1.0.0'}"

        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary true
        }
    }

    buildTypes {
        release {
            minifyEnabled ${sdk.enableProGuard}
            shrinkResources ${sdk.enableProGuard}
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.debug
        }
    }

    compileOptions {
        sourceCompatibility JavaVersion.VERSION_${sdk.jdkVersion || '17'}
        targetCompatibility JavaVersion.VERSION_${sdk.jdkVersion || '17'}
    }

    kotlinOptions {
        jvmTarget = '${sdk.jdkVersion || '17'}'
    }

    buildFeatures {
        viewBinding true
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.15.0'
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'com.google.android.material:material:1.12.0'
    implementation 'androidx.webkit:webkit:1.12.1'
    implementation 'androidx.swiperefreshlayout:swiperefreshlayout:1.1.0'

    ${config.admob?.enabled ? `// Google Mobile Ads SDK (AdMob)\n    implementation 'com.google.android.gms:play-services-ads:23.6.0'` : '// AdMob disabled'}
}
`;
}

/**
 * Generates AndroidManifest.xml with permissions and AdMob meta-data.
 */
export function generateAndroidManifestXml(config: AppConfig): string {
  const p = config.androidSdk?.permissions || {
    internet: true,
    networkState: true,
    camera: false,
    storage: false,
    notifications: true,
    wakeLock: false,
  };
  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${config.appPackageId}">

    ${p.internet ? '<uses-permission android:name="android.permission.INTERNET" />' : ''}
    ${p.networkState ? '<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />' : ''}
    ${p.camera ? '<uses-permission android:name="android.permission.CAMERA" />' : ''}
    ${p.storage ? '<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />' : ''}
    ${p.notifications ? '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />' : ''}
    ${p.wakeLock ? '<uses-permission android:name="android.permission.WAKE_LOCK" />' : ''}

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.appName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.App.NoActionBar"
        android:usesCleartextTraffic="true">

        ${config.admob?.enabled ? `<!-- Google AdMob App ID -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${config.admob.appId || 'ca-app-pub-3940256099942544~3347511713'}" />` : ''}

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|keyboardHidden"
            android:screenOrientation="${config.pwaSettings.orientation === 'portrait' ? 'portrait' : config.pwaSettings.orientation === 'landscape' ? 'landscape' : 'unspecified'}">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;
}

/**
 * Generates MainActivity.kt with WebView integration and AdMob Banner + Interstitial logic.
 */
export function generateMainActivityKt(config: AppConfig): string {
  const packagePath = config.appPackageId || 'com.example.app';
  return `package ${packagePath}

import android.os.Bundle
import android.view.View
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
${config.admob?.enabled ? `import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback` : ''}

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    ${config.admob?.enabled ? `private var mInterstitialAd: InterstitialAd? = null
    private lateinit var adView: AdView` : ''}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        webView = findViewById(R.id.webView)
        setupWebView()

        ${config.admob?.enabled ? `// Initialize Google Mobile Ads SDK (AdMob)
        MobileAds.initialize(this) {}

        // Load Banner Ad
        setupAdMobBanner()

        // Preload Interstitial Ad
        loadInterstitialAd()` : ''}
    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                view?.loadUrl(url ?: return false)
                return true
            }
        }

        webView.webChromeClient = WebChromeClient()

        // Load configured entry point
        ${config.contentMode === 'website' ? `webView.loadUrl("${config.websiteConfig.url}")` : `webView.loadUrl("file:///android_asset/index.html")`}
    }

    ${config.admob?.enabled ? `private fun setupAdMobBanner() {
        adView = findViewById(R.id.adView)
        val adRequest = AdRequest.Builder().build()
        adView.loadAd(adRequest)
    }

    private fun loadInterstitialAd() {
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(
            this,
            "${config.admob.interstitialUnitId || 'ca-app-pub-3940256099942544/1033173712'}",
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(interstitialAd: InterstitialAd) {
                    mInterstitialAd = interstitialAd
                }
            }
        )
    }` : ''}

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
`;
}

/**
 * Generates automated GitHub Actions workflow to build APK and AAB in the cloud for free.
 */
export function generateGitHubActionsWorkflow(config: AppConfig): string {
  return `name: Build Android APK and AAB

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout Repository
      uses: actions/checkout@v4

    - name: Set up JDK ${config.androidSdk?.jdkVersion || '17'}
      uses: actions/setup-java@v4
      with:
        java-version: '${config.androidSdk?.jdkVersion || '17'}'
        distribution: 'temurin'

    - name: Setup Android SDK
      uses: android-actions/setup-android@v3

    - name: Grant Execute Permission for Gradlew
      run: chmod +x gradlew || echo "Using system gradle"

    - name: Build Universal Debug APK
      run: ./gradlew assembleDebug || gradle assembleDebug

    - name: Build Android App Bundle (.AAB for Google Play)
      run: ./gradlew bundleRelease || gradle bundleRelease

    - name: Upload APK Artifact
      uses: actions/upload-artifact@v4
      with:
        name: ${config.shortName}-app-debug.apk
        path: app/build/outputs/apk/debug/*.apk

    - name: Upload AAB Bundle Artifact
      uses: actions/upload-artifact@v4
      with:
        name: ${config.shortName}-release.aab
        path: app/build/outputs/bundle/release/*.aab
`;
}

/**
 * Generates README.md explaining how to push to GitHub, host on GitHub Pages, compile APK/AAB, and AdMob setup.
 */
export function generateReadmeMd(config: AppConfig): string {
  return `# ${config.appName} (Android & PWA)

This repository contains the complete, production-ready source code for **${config.appName}**, designed as a Progressive Web App (PWA) with native Android installation support.

## 📱 Android Build & Version Specifications
- **Package ID**: \`${config.appPackageId}\`
- **Version Code**: \`${config.versionCode || 1}\`
- **Version Name**: \`${config.versionName || '1.0.0'}\`
- **Target SDK**: \`${config.androidSdk?.targetSdk || 36}\` (Android ${(config.androidSdk?.targetSdk || 36) >= 36 ? '16+ / Next-Gen Standard' : '15'})
- **Compile SDK**: \`${config.androidSdk?.compileSdk || 36}\`
- **Minimum SDK**: \`${config.androidSdk?.minSdk || 24}\` (Android 7.0 - 99.5%+ global device reach)
- **JDK Target**: Java ${config.androidSdk?.jdkVersion || '17'} LTS
- **ProGuard / R8 Optimization**: ${config.androidSdk?.enableProGuard ? 'Enabled' : 'Disabled'}

${config.admob?.enabled ? `## 💰 Google AdMob Monetization Configured
- **App ID**: \`${config.admob.appId}\`
- **Banner Ad Unit**: \`${config.admob.bannerUnitId}\`
- **Interstitial Ad Unit**: \`${config.admob.interstitialUnitId}\`
- **App Open Ad Unit**: \`${config.admob.appOpenUnitId}\`
- **Rewarded Ad Unit**: \`${config.admob.rewardedUnitId}\`
- **Native Ad Unit**: \`${config.admob.nativeUnitId}\`
- **Test Ads Mode**: ${config.admob.isTestingMode ? 'ENABLED (Safe for testing)' : 'PRODUCTION'}` : ''}

---

## ⚡ Automated Cloud APK & AAB Generation (GitHub Actions)
This repository includes a pre-configured GitHub Actions workflow in \`.github/workflows/build-apk.yml\`.
Whenever you push your code to GitHub:
1. GitHub automatically boots an Ubuntu runner with JDK ${config.androidSdk?.jdkVersion || '17'} and Android SDK.
2. It compiles the **universal debug APK** (\`.apk\`) for direct phone installation.
3. It compiles the **Android App Bundle** (\`.aab\`) ready for Google Play Store upload.
4. You can download the completed files directly from the **Actions** tab in your GitHub repository!

---

## 🚀 How to Host on GitHub Pages (Instant Free Web Hosting)

1. Go to [https://github.com/new](https://github.com/new) and create a repository named: \`${config.shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}\`.
2. Push your code:
\`\`\`bash
git init
git add .
git commit -m "Initial commit for ${config.appName} Android PWA"
git branch -M main
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/${config.shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.git
git push -u origin main
\`\`\`
3. Go to **Settings > Pages**, choose **Deploy from a branch (main / root)**, and click **Save**.
4. Live URL: \`https://<YOUR-GITHUB-USERNAME>.github.io/${config.shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}/\`

---

## 📂 File Structure
\`\`\`
├── .github/workflows/build-apk.yml # Automated Cloud APK/AAB Builder
├── app/build.gradle                 # Android SDK, compileSdk 35, targetSdk 35
├── app/src/main/AndroidManifest.xml # Permissions, AdMob App ID, Activities
├── app/src/main/java/...            # Native Kotlin MainActivity with AdMob
├── index.html                       # Standalone application with full UI
├── manifest.webmanifest             # PWA manifest & Android metadata
├── sw.js                            # Offline service worker caching
├── capacitor.config.json            # Android Capacitor wrapper configuration
└── README.md                        # Documentation & setup guide
\`\`\`

Created with **AppCraft Android Studio**.
`;
}

/**
 * Generates the standalone index.html for the created Android PWA.
 */
export function generateAppHtml(config: AppConfig): string {
  const manifestJsonString = JSON.stringify(generateManifestJson(config), null, 2);

  // Serialize icon data for the standalone app
  const iconsData = JSON.stringify(config.launchpadConfig.icons || []);
  const menuItemsData = JSON.stringify(config.navigation.items || []);

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
  </style>
</head>
<body>

  <!-- Splash Screen -->
  ${config.splashScreen.enabled ? `
  <div id="splash-screen">
    <div class="splash-logo">
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="4" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </svg>
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
      <iframe class="webview-frame" src="${escapeHtml(config.websiteConfig.url)}" title="Web Content" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>
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
    <div class="drawer-header">
      ${config.navigation.drawerHeader.showUserAvatar ? `<div class="drawer-user-avatar">A</div>` : ''}
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
      name: ${JSON.stringify(config.appName)},
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

    // Render Drawer Items
    const drawerNav = document.getElementById('drawer-items-list');
    if (drawerNav && APP_CONFIG.menuItems) {
      APP_CONFIG.menuItems.forEach(item => {
        const el = document.createElement('div');
        el.className = 'drawer-item';
        el.innerHTML = \`
          <div class="drawer-item-left">
            <span>\${escapeHtml(item.label)}</span>
          </div>
          \${item.badge ? \`<span class="item-badge">\${escapeHtml(item.badge)}</span>\` : ''}
        \`;
        el.addEventListener('click', () => {
          closeDrawer();
          if (item.actionType === 'share') {
            handleShare();
          } else if (item.actionType === 'html-page') {
            openModal(item.label, item.targetHtml || '<p>No content available</p>');
          } else if (item.actionType === 'website' && item.targetUrl) {
            window.open(item.targetUrl, '_blank');
          } else if (item.actionType === 'contact' && item.targetUrl) {
            window.location.href = item.targetUrl;
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
          if (item.actionType === 'share') {
            handleShare();
          } else if (item.actionType === 'html-page') {
            openModal(item.label, item.targetHtml || '<p>No content available</p>');
          } else if (item.actionType === 'website' && item.targetUrl) {
            window.open(item.targetUrl, '_blank');
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
        card.innerHTML = \`
          \${iconItem.badge ? \`<span class="card-badge" style="background:\${iconItem.badgeColor || iconItem.color}">\${escapeHtml(iconItem.badge)}</span>\` : ''}
          <div class="card-icon-wrap" style="background:\${iconItem.color}">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect width="18" height="18" x="3" y="3" rx="2"></rect>
              <path d="m9 12 2 2 4-4"></path>
            </svg>
          </div>
          <div class="card-title">\${escapeHtml(iconItem.title)}</div>
          <div class="card-desc">\${escapeHtml(iconItem.description)}</div>
        \`;
        card.addEventListener('click', () => {
          if (iconItem.actionType === 'website' && iconItem.targetUrl) {
            window.open(iconItem.targetUrl, '_blank');
          } else if (iconItem.actionType === 'html-page' && iconItem.htmlContent) {
            openModal(iconItem.title, iconItem.htmlContent);
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

    // Register Service Worker
    if ('serviceWorker' in navigator) {
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
 * Creates an exportable ZIP containing all GitHub repository files, keystore, and native Android code.
 */
export async function createGitHubRepoZip(config: AppConfig): Promise<Blob> {
  const zip = new JSZip();

  // 1. Web & PWA Standalone files
  zip.file('index.html', generateAppHtml(config));
  zip.file('manifest.webmanifest', JSON.stringify(generateManifestJson(config), null, 2));
  zip.file('sw.js', generateServiceWorkerJs(config));
  zip.file('capacitor.config.json', generateCapacitorConfig(config));
  zip.file('README.md', generateReadmeMd(config));

  // 2. Native Android Project Structure (AppCreator24 compliant)
  zip.file('settings.gradle', `rootProject.name = "${config.shortName}"\ninclude ':app'\n`);
  zip.file(
    'build.gradle',
    `buildscript {\n    repositories {\n        google()\n        mavenCentral()\n    }\n    dependencies {\n        classpath 'com.android.tools.build:gradle:8.7.0'\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:1.9.24'\n    }\n}\n\nallprojects {\n    repositories {\n        google()\n        mavenCentral()\n    }\n}\n`
  );
  zip.file('gradle.properties', generateSigningGradleProperties(config.keystore));
  zip.file('app/build.gradle', generateBuildGradle(config));
  zip.file('app/src/main/AndroidManifest.xml', generateAndroidManifestXml(config));

  // Kotlin MainActivity in package directory
  const packagePath = (config.appPackageId || 'com.example.app').replace(/\./g, '/');
  zip.file(`app/src/main/java/${packagePath}/MainActivity.kt`, generateMainActivityKt(config));

  // Automated GitHub Actions CI/CD to build APK & AAB
  zip.file('.github/workflows/build-apk.yml', generateGitHubActionsWorkflow(config));

  // 3. Android Signing Keystore File (.keystore)
  const keystoreBlob = createKeystoreBlob(config.keystore);
  zip.file(config.keystore.fileName || 'release.keystore', keystoreBlob);

  // 4. Icons directory with SVG placeholder
  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="100" fill="${config.themeColor}" />
    <circle cx="256" cy="256" r="160" fill="${config.accentColor}" opacity="0.3" />
    <text x="256" y="280" font-family="system-ui, sans-serif" font-size="120" font-weight="bold" fill="#ffffff" text-anchor="middle" dominant-baseline="middle">
      ${config.shortName.slice(0, 2).toUpperCase()}
    </text>
  </svg>`;

  zip.file('icons/icon.svg', iconSvg);
  zip.file('icons/README.txt', 'Replace icon-192.png and icon-512.png with your branded icons.');

  return await zip.generateAsync({ type: 'blob' });
}
