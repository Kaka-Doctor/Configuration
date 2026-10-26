import type { AppConfig, KeystoreConfig } from '../types/appConfig';
import { hasUsableKeystore, safeKeystoreFileName } from './keystoreGenerator';

/**
 * Native Android project generators.
 *
 * The output of these functions is a project that Gradle/Android Studio can
 * actually compile:
 *  - `namespace` only (AGP 8+ rejects `package="..."` in the manifest)
 *  - every referenced resource exists (layout, theme, strings, mipmap icons)
 *  - a real signing configuration (debug by default, release only when the user
 *    supplied a genuine keystore)
 *  - a GitHub Actions workflow that builds with `gradle` (no wrapper jar needed)
 */

export const AGP_VERSION = '8.9.1';
export const GRADLE_VERSION = '8.11.1';
export const KOTLIN_VERSION = '2.1.20';

export function escapeXml(value: string): string {
  return String(value ?? '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      default:
        return '&quot;';
    }
  });
}

/** Escapes a value for use inside a single-quoted Groovy string. */
function gradleString(value: string): string {
  return String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/** Escapes a value for use inside a Kotlin string literal. */
function kotlinString(value: string): string {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$');
}

export function appSlug(config: AppConfig): string {
  return (config.shortName || config.appName || 'app')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'app';
}

/** Version string safe for file names, git tags and release URLs. */
export function cleanVersion(config: AppConfig): string {
  return (config.versionName || '1.0.0').replace(/[^0-9A-Za-z._-]/g, '') || '1.0.0';
}

/* ------------------------------- Gradle ---------------------------------- */

export function generateSettingsGradle(config: AppConfig): string {
  return `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${gradleString(config.shortName || config.appName)}"
include ':app'
`;
}

export function generateRootBuildGradle(): string {
  return `// Top-level build file — plugin versions are declared here and reused by :app
plugins {
    id 'com.android.application' version '${AGP_VERSION}' apply false
    id 'org.jetbrains.kotlin.android' version '${KOTLIN_VERSION}' apply false
}

tasks.register('clean', Delete) {
    delete rootProject.layout.buildDirectory
}
`;
}

export function generateAppBuildGradle(config: AppConfig): string {
  const sdk = config.androidSdk;
  const proguard = Boolean(sdk.enableProGuard);
  const namespace = gradleString(config.appPackageId);

  return `plugins {
    id 'com.android.application'
    id 'org.jetbrains.kotlin.android'
}

// Signing is only used when all release values are present AND the keystore
// file really exists. Otherwise the release build uses the debug key, so the
// project always compiles.
def releaseStoreFile = project.findProperty('RELEASE_STORE_FILE')
def releaseSigningReady =
    releaseStoreFile != null &&
    !releaseStoreFile.toString().trim().isEmpty() &&
    project.findProperty('RELEASE_STORE_PASSWORD') &&
    project.findProperty('RELEASE_KEY_ALIAS') &&
    project.findProperty('RELEASE_KEY_PASSWORD') &&
    file(releaseStoreFile).exists()

android {
    namespace '${namespace}'
    compileSdk ${sdk.compileSdk}

    defaultConfig {
        applicationId "${namespace}"
        minSdk ${sdk.minSdk}
        targetSdk ${sdk.targetSdk}
        versionCode ${Math.max(1, Math.floor(Number(config.versionCode) || 1))}
        versionName "${gradleString(config.versionName || '1.0.0')}"
    }

    signingConfigs {
        release {
            if (releaseSigningReady) {
                storeFile file(releaseStoreFile)
                storePassword project.property('RELEASE_STORE_PASSWORD')
                keyAlias project.property('RELEASE_KEY_ALIAS')
                keyPassword project.property('RELEASE_KEY_PASSWORD')
            }
        }
    }

    buildTypes {
        debug {
            minifyEnabled false
        }
        release {
            minifyEnabled ${proguard}
            shrinkResources ${proguard}
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig releaseSigningReady ? signingConfigs.release : signingConfigs.debug
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
        buildConfig false
        viewBinding false
    }
}

dependencies {
    implementation 'androidx.core:core-ktx:1.15.0'
    implementation 'androidx.appcompat:appcompat:1.7.0'
    implementation 'com.google.android.material:material:1.12.0'
${config.admob?.enabled ? "    implementation 'com.google.android.gms:play-services-ads:23.6.0'" : "    // AdMob disabled — no ads dependency needed"}
}
`;
}

export function generateGradleProperties(config: AppConfig, includeSigning = true): string {
  const lines = [
    '# Project-wide Gradle settings',
    'org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8',
    'android.useAndroidX=true',
    'android.nonTransitiveRClass=true',
    'kotlin.code.style=official',
    `# Allow the selected compileSdk (${config.androidSdk.compileSdk}) before Android Studio ships a matching AGP.`,
    `android.suppressUnsupportedCompileSdk=${config.androidSdk.compileSdk}`,
  ];
  if (includeSigning && config.keystore && hasUsableKeystore(config.keystore)) {
    // `gradle.properties` treats backslashes as escapes and cannot hold line
    // breaks, so credentials are normalised before they are written.
    const prop = (value: string) => String(value ?? '').replace(/\\/g, '\\\\').replace(/[\r\n]/g, '');
    const alias = (config.keystore.alias || 'appcraft').replace(/[^A-Za-z0-9._-]/g, '') || 'appcraft';
    lines.push(
      '',
      '# Release signing (from the keystore you uploaded).',
      '# This file is for your machine only — never commit real passwords.',
      `RELEASE_STORE_FILE=${safeKeystoreFileName(config.keystore.fileName)}`,
      `RELEASE_STORE_PASSWORD=${prop(config.keystore.storePassword)}`,
      `RELEASE_KEY_ALIAS=${alias}`,
      `RELEASE_KEY_PASSWORD=${prop(config.keystore.keyPassword || config.keystore.storePassword)}`
    );
  }
  return lines.join('\n') + '\n';
}

export function generateWrapperProperties(): string {
  return `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;
}

/* ------------------------------ Manifest --------------------------------- */

export function generateAndroidManifestXml(config: AppConfig): string {
  const p = config.androidSdk.permissions;
  const permissions: string[] = [];
  permissions.push('<uses-permission android:name="android.permission.INTERNET" />');
  if (p.networkState) permissions.push('<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />');
  if (p.camera) permissions.push('<uses-permission android:name="android.permission.CAMERA" />');
  if (p.storage) {
    permissions.push('<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />');
  }
  if (config.downloads?.enabled !== false) {
    // Only needed on Android 9 and older; DownloadManager writes to the public
    // Downloads folder without it on Android 10+.
    permissions.push('<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />');
  }
  if (p.notifications || config.notifications?.enabled) {
    permissions.push('<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />');
  }
  if (p.wakeLock) permissions.push('<uses-permission android:name="android.permission.WAKE_LOCK" />');

  const orientation =
    config.pwaSettings.orientation === 'portrait'
      ? '\n            android:screenOrientation="portrait"'
      : config.pwaSettings.orientation === 'landscape'
        ? '\n            android:screenOrientation="landscape"'
        : '';

  const admobMeta = config.admob?.enabled
    ? `
        <!-- Google AdMob application ID -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${escapeXml(config.admob.appId || 'ca-app-pub-3940256099942544~3347511713')}" />
`
    : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

${permissions.map((line) => `    ${line}`).join('\n')}

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:label="@string/app_name"
        android:supportsRtl="true"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config"
        android:theme="@style/Theme.AppCraft">
${admobMeta}
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:windowSoftInputMode="adjustResize"
            android:configChanges="orientation|screenSize|keyboardHidden|screenLayout|uiMode"${orientation}>
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`;
}

/* --------------------------- Kotlin MainActivity -------------------------- */

export function generateMainActivityKt(config: AppConfig): string {
  const packageName = config.appPackageId || 'com.example.app';
  const isWebsite = config.contentMode === 'website';
  const websiteUrl = (config.websiteConfig?.url || '').trim();
  const appUrl =
    isWebsite && /^https?:\/\//i.test(websiteUrl) ? websiteUrl : 'file:///android_asset/index.html';
  const adsEnabled = Boolean(config.admob?.enabled);
  const notificationsEnabled = Boolean(
    config.notifications?.enabled || config.androidSdk.permissions.notifications
  );
  const downloadsEnabled = config.downloads?.enabled !== false;

  const interstitialEvery = Math.min(20, Math.max(3, config.admob?.interstitialEveryClicks ?? 5));
  const appOpenEvery = Math.min(10, Math.max(1, config.admob?.appOpenEveryLaunches ?? 5));

  const adImports = adsEnabled
    ? `import com.google.android.gms.ads.AdError
import com.google.android.gms.ads.AdRequest
import com.google.android.gms.ads.AdSize
import com.google.android.gms.ads.AdView
import com.google.android.gms.ads.FullScreenContentCallback
import com.google.android.gms.ads.LoadAdError
import com.google.android.gms.ads.MobileAds
import com.google.android.gms.ads.appopen.AppOpenAd
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
`
    : '';

  const adFields = adsEnabled
    ? `    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null
    private var rewardEarned = false
    private lateinit var adView: AdView
`
    : '';

  const adInit = adsEnabled
    ? `
        // Google Mobile Ads — banner, interstitial, rewarded and app-open formats.
        MobileAds.initialize(this) {}
        setupAdMobBanner()
        loadInterstitialAd()
        loadRewardedAd()
        maybeShowAppOpenAd()
`
    : '';

  const adMethods = adsEnabled
    ? `
    private fun setupAdMobBanner() {
        adView = findViewById(R.id.adView)
        if (BANNER_SIZE == "adaptive") {
            val metrics = resources.displayMetrics
            val widthDp = (metrics.widthPixels / metrics.density).toInt()
            adView.setAdSize(AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(this, widthDp))
        }
        adView.loadAd(AdRequest.Builder().build())
    }

    private fun loadInterstitialAd() {
        InterstitialAd.load(
            this,
            "${kotlinString(config.admob.interstitialUnitId || 'ca-app-pub-3940256099942544/1033173712')}",
            AdRequest.Builder().build(),
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialAd = null
                }
            }
        )
    }

    private fun registerClickAndMaybeShowInterstitial() {
        val prefs = getSharedPreferences("appcraft_ads", MODE_PRIVATE)
        val clicks = prefs.getInt("clicks", 0) + 1
        prefs.edit().putInt("clicks", clicks).apply()
        if (clicks % INTERSTITIAL_EVERY == 0) showInterstitialIfAvailable()
    }

    private fun showInterstitialIfAvailable() {
        val ad = interstitialAd ?: run {
            loadInterstitialAd()
            return
        }
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                interstitialAd = null
                loadInterstitialAd()
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                interstitialAd = null
                loadInterstitialAd()
            }
        }
        ad.show(this)
    }

    private fun loadRewardedAd() {
        RewardedAd.load(
            this,
            "${kotlinString(config.admob.rewardedUnitId || 'ca-app-pub-3940256099942544/5224354917')}",
            AdRequest.Builder().build(),
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewardedAd = ad
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    rewardedAd = null
                }
            }
        )
    }

    /** Called from JavaScript before opening a section that uses a rewarded ad. */
    private fun showRewardedAd() {
        val ad = rewardedAd
        if (ad == null) {
            loadRewardedAd()
            runJs("window.__onRewardedFailed && window.__onRewardedFailed()")
            return
        }
        rewardEarned = false
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                rewardedAd = null
                loadRewardedAd()
                if (rewardEarned) {
                    runJs("window.__onRewarded && window.__onRewarded()")
                } else {
                    runJs("window.__onRewardedFailed && window.__onRewardedFailed()")
                }
            }

            override fun onAdFailedToShowFullScreenContent(error: AdError) {
                rewardedAd = null
                loadRewardedAd()
                runJs("window.__onRewardedFailed && window.__onRewardedFailed()")
            }
        }
        ad.show(this) { rewardEarned = true }
    }

    /** App-open ads respect the 1-10 launch interval chosen in the studio. */
    private fun maybeShowAppOpenAd() {
        val prefs = getSharedPreferences("appcraft_ads", MODE_PRIVATE)
        val launches = prefs.getInt("launches", 0) + 1
        prefs.edit().putInt("launches", launches).apply()
        if (launches % APP_OPEN_EVERY != 0) return

        AppOpenAd.load(
            this,
            "${kotlinString(config.admob.appOpenUnitId || 'ca-app-pub-3940256099942544/3419832817')}",
            AdRequest.Builder().build(),
            object : AppOpenAd.AppOpenAdLoadCallback() {
                override fun onAdLoaded(ad: AppOpenAd) {
                    ad.fullScreenContentCallback = object : FullScreenContentCallback() {
                        override fun onAdDismissedFullScreenContent() {}
                        override fun onAdFailedToShowFullScreenContent(error: AdError) {}
                    }
                    ad.show(this@MainActivity)
                }

                override fun onAdFailedToLoad(error: LoadAdError) {}
            }
        )
    }
`
    : '';

  const bridgeAdMethods = adsEnabled
    ? `
        @JavascriptInterface
        fun maybeInterstitial() {
            runOnUiThread { registerClickAndMaybeShowInterstitial() }
        }

        @JavascriptInterface
        fun showRewarded() {
            runOnUiThread { showRewardedAd() }
        }

        @JavascriptInterface
        fun maybeAppOpen() {
            runOnUiThread { maybeShowAppOpenAd() }
        }
`
    : '';

  const notificationPermission = notificationsEnabled
    ? '        requestNotificationPermissionIfNeeded()\n'
    : '';

  const destroyAds = adsEnabled
    ? '        if (::adView.isInitialized) adView.destroy()\n'
    : '';

  return `package ${packageName}

import android.Manifest
import android.annotation.SuppressLint
import android.app.DownloadManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.view.View
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.URLUtil
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
${adImports}
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
${adFields}
    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        webView = findViewById(R.id.webView)
        createNotificationChannel()
        setupWebView()
        setupBackNavigation()
${notificationPermission}${adInit}    }

    private fun setupWebView() {
        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.javaScriptCanOpenWindowsAutomatically = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        CookieManager.getInstance().setAcceptCookie(true)

        // Native bridge used by share sheets, downloads, notifications and ads.
        webView.addJavascriptInterface(WebAppInterface(), "AndroidBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url ?: return false
                // http(s), file, data and blob stay inside the app. Everything else
                // (tel:, mailto:, intent:, market:, ...) goes to the device.
                return openExternally(url)
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                val bar = findViewById<View>(R.id.progressBar)
                if (bar != null) bar.visibility = View.GONE
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onProgressChanged(view: WebView?, newProgress: Int) {
                val bar = findViewById<View>(R.id.progressBar)
                if (bar != null) bar.visibility = if (newProgress >= 85) View.GONE else View.VISIBLE
            }
        }

        // Any file the WebView cannot render is saved by DownloadManager instead
        // of opening another browser.
        webView.setDownloadListener { url, userAgent, contentDisposition, mimeType, _ ->
            if (DOWNLOADS_ENABLED) {
                startDownload(url, URLUtil.guessFileName(url, contentDisposition, mimeType), userAgent)
            } else {
                startExternalIntent(Uri.parse(url))
            }
        }

        webView.loadUrl(APP_URL)
    }

    /** Keeps http(s) inside the WebView; sends custom schemes to the device. */
    private fun openExternally(uri: Uri): Boolean {
        val scheme = uri.scheme?.lowercase() ?: return false
        if (scheme == "file" || scheme == "http" || scheme == "https" || scheme == "about" ||
            scheme == "data" || scheme == "blob" || scheme == "javascript"
        ) return false
        return startExternalIntent(uri)
    }

    private fun startExternalIntent(uri: Uri): Boolean {
        return try {
            startActivity(Intent(Intent.ACTION_VIEW, uri))
            true
        } catch (error: Exception) {
            Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show()
            false
        }
    }

    private fun startDownload(url: String, suggestedName: String, userAgent: String? = null) {
        try {
            if (url.startsWith("blob:") || url.startsWith("data:")) {
                Toast.makeText(
                    this,
                    "This file is created inside the page. Use the app's Download button.",
                    Toast.LENGTH_LONG
                ).show()
                return
            }
            val fileName = (suggestedName.ifBlank { "download" }).replace("/", "_")
            val request = DownloadManager.Request(Uri.parse(url))
            request.setTitle(fileName)
            request.setDescription("Downloading to your Downloads folder")
            request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName)
            if (!userAgent.isNullOrBlank()) request.addRequestHeader("User-Agent", userAgent)
            val cookie = CookieManager.getInstance().getCookie(url)
            if (!cookie.isNullOrBlank()) request.addRequestHeader("Cookie", cookie)
            val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
            manager.enqueue(request)
            Toast.makeText(this, "Downloading " + fileName, Toast.LENGTH_SHORT).show()
        } catch (error: Exception) {
            // If the file manager rejects the request, hand it to the device.
            startExternalIntent(Uri.parse(url))
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "App updates",
                NotificationManager.IMPORTANCE_DEFAULT
            )
            channel.description = "Messages and announcements sent by the app creator"
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
        }
    }

    private fun postNotification(title: String, body: String) {
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pending = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title.ifBlank { getString(R.string.app_name) })
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .build()
        NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
    }

    private fun runJs(script: String) {
        runOnUiThread { webView.evaluateJavascript(script, null) }
    }

    private fun setupBackNavigation() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                }
            }
        })
    }
${adMethods}
    override fun onDestroy() {
${destroyAds}        webView.destroy()
        super.onDestroy()
    }

    /** Methods exposed to the generated web app as window.AndroidBridge. */
    inner class WebAppInterface {
        @JavascriptInterface
        fun shareText(text: String) {
            runOnUiThread {
                val send = Intent(Intent.ACTION_SEND).apply {
                    type = "text/plain"
                    putExtra(Intent.EXTRA_TEXT, text)
                }
                startActivity(Intent.createChooser(send, "Share via"))
            }
        }

        @JavascriptInterface
        fun openExternal(url: String) {
            runOnUiThread {
                if (url.isNotBlank()) startExternalIntent(Uri.parse(url))
            }
        }

        /** Keeps the page inside the app (the system Back button returns to it). */
        @JavascriptInterface
        fun openInApp(url: String) {
            runOnUiThread {
                if (url.isNotBlank()) webView.loadUrl(url)
            }
        }

        @JavascriptInterface
        fun downloadFile(url: String, fileName: String) {
            runOnUiThread {
                if (url.isNotBlank()) {
                    startDownload(url, fileName.ifBlank { URLUtil.guessFileName(url, null, null) })
                }
            }
        }

        @JavascriptInterface
        fun toast(message: String) {
            runOnUiThread { Toast.makeText(this@MainActivity, message, Toast.LENGTH_SHORT).show() }
        }

        @JavascriptInterface
        fun notify(title: String, body: String) {
            runOnUiThread { postNotification(title, body) }
        }
${bridgeAdMethods}    }

    companion object {
        private const val APP_URL = "${kotlinString(appUrl)}"
        private const val CHANNEL_ID = "appcraft_updates"
        private const val BANNER_SIZE = "${kotlinString(config.admob?.bannerSize || 'adaptive')}"
        private const val INTERSTITIAL_EVERY = ${interstitialEvery}
        private const val APP_OPEN_EVERY = ${appOpenEvery}
        private const val DOWNLOADS_ENABLED = ${downloadsEnabled}
    }
}
`;

}
/* ------------------------------- Resources -------------------------------- */

export function generateActivityLayout(config: AppConfig): string {
  const adsEnabled = Boolean(config.admob?.enabled);
  const bannerPosition = config.admob?.bannerPosition === 'top' ? 'top' : 'bottom';
  const bannerSize = config.admob?.bannerSize || 'adaptive';
  const adSize =
    bannerSize === 'large-banner'
      ? 'LARGE_BANNER'
      : bannerSize === 'medium-rectangle'
        ? 'MEDIUM_RECTANGLE'
        : 'BANNER';
  const adsView = adsEnabled
    ? `
        <com.google.android.gms.ads.AdView
            android:id="@+id/adView"
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:layout_gravity="center_horizontal"
            ads:adSize="${adSize}"
            ads:adUnitId="${escapeXml(config.admob.bannerUnitId || 'ca-app-pub-3940256099942544/6300978111')}" />`
    : `
        <!-- AdMob disabled: no ad view in this layout -->`;

  const adsNamespace = adsEnabled ? '\n    xmlns:ads="http://schemas.android.com/apk/res-auto"' : '';

  return `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"${adsNamespace}
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@color/backgroundColor">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical">

        <ProgressBar
            android:id="@+id/progressBar"
            style="?android:attr/progressBarStyleHorizontal"
            android:layout_width="match_parent"
            android:layout_height="3dp"
            android:indeterminate="true"
            android:visibility="gone" />
${bannerPosition === 'top' ? adsView : ''}
        <WebView
            android:id="@+id/webView"
            android:layout_width="match_parent"
            android:layout_height="0dp"
            android:layout_weight="1" />
${bannerPosition === 'bottom' ? adsView : ''}
    </LinearLayout>
</FrameLayout>
`;
}

export function generateStringsXml(config: AppConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${escapeXml(config.appName)}</string>
    <string name="app_short_name">${escapeXml(config.shortName)}</string>
    <string name="version_name">${escapeXml(config.versionName)}</string>
</resources>
`;
}

export function generateColorsXml(config: AppConfig): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="colorPrimary">${escapeXml(config.themeColor)}</color>
    <color name="colorAccent">${escapeXml(config.accentColor)}</color>
    <color name="backgroundColor">${escapeXml(config.backgroundColor)}</color>
    <color name="topBarColor">${escapeXml(config.topBar.bgColor)}</color>
    <color name="splashBackground">${escapeXml(
      config.splashScreen.bgType === 'gradient' ? config.splashScreen.gradientFrom : config.splashScreen.bgColor
    )}</color>
</resources>
`;
}

export function generateThemesXml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.AppCraft" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorSecondary">@color/colorAccent</item>
        <item name="android:statusBarColor">@color/topBarColor</item>
        <item name="android:windowBackground">@color/backgroundColor</item>
    </style>
</resources>
`;
}

export function generateThemesV31Xml(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Android 12+ system splash screen uses the launcher icon and brand colour -->
    <style name="Theme.AppCraft" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">@color/colorPrimary</item>
        <item name="colorSecondary">@color/colorAccent</item>
        <item name="android:statusBarColor">@color/topBarColor</item>
        <item name="android:windowBackground">@color/backgroundColor</item>
        <item name="android:windowSplashScreenBackground">@color/splashBackground</item>
        <item name="android:windowSplashScreenAnimatedIcon">@mipmap/ic_launcher</item>
    </style>
</resources>
`;
}

export function generateNetworkSecurityConfig(): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
        </trust-anchors>
    </base-config>
</network-security-config>
`;
}

export function generateProguardRules(config: AppConfig): string {
  return `# ProGuard / R8 rules for ${config.appName}
-keepattributes JavascriptInterface
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.google.android.gms.ads.** { *; }
-dontwarn com.google.android.gms.ads.**
`;
}

/* -------------------------- GitHub Actions build -------------------------- */

export function generateGitHubActionsWorkflow(config: AppConfig): string {
  const slug = appSlug(config);
  const version = cleanVersion(config);
  const targetSdk = config.androidSdk.targetSdk;

  return `name: Build Android APK & AAB

# This workflow builds a real, installable .apk (and a Play-ready .aab) on
# GitHub's servers — no Android SDK needed on your computer.
on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

permissions:
  contents: write

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      APP_SLUG: "${slug}"
      APP_VERSION: "${version}"
      APP_NAME: "${config.appName.replace(/"/g, '\\"')}"
      TARGET_SDK: "${targetSdk}"
      COMPILE_SDK: "${config.androidSdk.compileSdk}"
      JDK_VERSION: "${config.androidSdk.jdkVersion || '17'}"
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      # The installed APK and the hosted PWA read app-config.json at runtime.
      # This step points them at this exact repository so editing that file
      # updates the app without rebuilding.
      - name: Point the app at this repository's live content
        run: |
          python3 - <<'PY'
          import os
          import pathlib
          repo = "\${{ github.repository }}"
          branch = os.environ.get("GITHUB_REF_NAME", "main")
          url = f"https://raw.githubusercontent.com/{repo}/{branch}/app-config.json"
          for name in ("index.html", "app-config.json", "app/src/main/assets/index.html", "app/src/main/assets/app-config.json"):
              path = pathlib.Path(name)
              if path.exists():
                  path.write_text(
                      path.read_text(encoding="utf-8").replace(
                          "__APPCRAFT_LIVE_CONFIG_URL__", url
                      ),
                      encoding="utf-8",
                  )
          print("Live config:", url)
          PY

      - name: Set up JDK \${{ env.JDK_VERSION }}
        uses: actions/setup-java@v4
        with:
          java-version: \${{ env.JDK_VERSION }}
          distribution: 'temurin'

      - name: Set up Android SDK
        uses: android-actions/setup-android@v4

      - name: Install Android platform
        run: |
          yes | sdkmanager --licenses > /dev/null || true
          sdkmanager "platform-tools" "platforms;android-$TARGET_SDK" "platforms;android-$COMPILE_SDK" > /dev/null

      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '${GRADLE_VERSION}'

      - name: Configure release signing (optional)
        env:
          KEYSTORE_BASE64: \${{ secrets.KEYSTORE_BASE64 }}
          KEYSTORE_PASSWORD: \${{ secrets.KEYSTORE_PASSWORD }}
          KEY_ALIAS: \${{ secrets.KEY_ALIAS }}
          KEY_PASSWORD: \${{ secrets.KEY_PASSWORD }}
        run: |
          if [ -n "$KEYSTORE_BASE64" ] && [ -n "$KEYSTORE_PASSWORD" ] && [ -n "$KEY_ALIAS" ] && [ -n "$KEY_PASSWORD" ]; then
            echo "$KEYSTORE_BASE64" | base64 -d > app/release.keystore
            printf '\\nRELEASE_STORE_FILE=release.keystore\\nRELEASE_STORE_PASSWORD=%s\\nRELEASE_KEY_ALIAS=%s\\nRELEASE_KEY_PASSWORD=%s\\n' \\
              "$KEYSTORE_PASSWORD" "$KEY_ALIAS" "$KEY_PASSWORD" >> gradle.properties
            echo "Release signing configured from repository secrets."
          else
            echo "No complete signing secret set: the release build will use the debug key."
            echo "Add all four secrets (KEYSTORE_BASE64, KEYSTORE_PASSWORD, KEY_ALIAS, KEY_PASSWORD) to sign with your own key."
          fi

      - name: Build debug APK (install directly on any phone)
        run: gradle :app:assembleDebug --no-daemon --stacktrace

      - name: Build release AAB (Google Play)
        run: gradle :app:bundleRelease --no-daemon --stacktrace

      - name: Prepare downloadable files
        run: |
          cp app/build/outputs/apk/debug/app-debug.apk "$APP_SLUG-v$APP_VERSION.apk"
          cp app/build/outputs/bundle/release/app-release.aab "$APP_SLUG-v$APP_VERSION.aab"
          ls -lh *.apk *.aab

      - name: Upload APK artifact
        uses: actions/upload-artifact@v4
        with:
          name: \${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}-apk
          path: \${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.apk
          retention-days: 30

      - name: Upload AAB artifact
        uses: actions/upload-artifact@v4
        with:
          name: \${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}-aab
          path: \${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.aab
          retention-days: 30

      # Makes a stable, public download link:
      # https://github.com/<owner>/<repo>/releases/latest/download/${slug}-v${version}.apk
      - name: Publish APK to GitHub Releases
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v\${{ env.APP_VERSION }}
          name: \${{ env.APP_NAME }} v\${{ env.APP_VERSION }}
          body: |
            Automated Android build for \${{ env.APP_NAME }}.

            - \`\${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.apk\` — install directly on your phone
            - \`\${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.aab\` — upload to Google Play Console
          files: |
            \${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.apk
            \${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.aab
          fail_on_unmatched_files: true
`;
}

/* -------------------------------- README --------------------------------- */

export function generateProjectReadme(config: AppConfig, options: { githubRepo?: string } = {}): string {
  const slug = appSlug(config);
  const version = cleanVersion(config);
  const repo = options.githubRepo || '<YOUR-GITHUB-USERNAME>/' + slug;
  const sdk = config.androidSdk;
  const adsSection = config.admob?.enabled
    ? `## AdMob
- App ID: \`${config.admob.appId}\`
- Banner unit: \`${config.admob.bannerUnitId}\`
- Interstitial unit: \`${config.admob.interstitialUnitId}\`
- Test mode: ${config.admob.isTestingMode ? 'enabled (safe test ads)' : 'production ads'}

Replace these with your own units before publishing, and only use production IDs
after the app is verified.`
    : `## AdMob
AdMob is disabled for this app.`;

  return `# ${config.appName} — Android + PWA

Complete, buildable source for **${config.appName}**, generated with AppCraft Studio.

- **Application ID:** \`${config.appPackageId}\`
- **Version:** \`${version}\` (versionCode ${config.versionCode})
- **Target SDK:** ${sdk.targetSdk} · **Compile SDK:** ${sdk.compileSdk} · **Min SDK:** ${sdk.minSdk}
- **Language:** Kotlin · **Gradle ${GRADLE_VERSION} · AGP ${AGP_VERSION}**
- **Signing:** debug key by default; your release keystore when supplied

---

## Option 1 — Build a real APK in the cloud (easiest, no Android SDK)

This repository already contains \`.github/workflows/build-apk.yml\`.

1. Create an empty repository on GitHub and push this folder:
   \`\`\`bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/${repo}.git
   git push -u origin main
   \`\`\`
2. Open the **Actions** tab → **Build Android APK & AAB** → wait ~3–5 minutes.
3. Download the APK:
   - From **Releases** (stable link):
     \`https://github.com/${repo}/releases/latest/download/${slug}-v${version}.apk\`
   - Or from the workflow run's **Artifacts** section.

The APK is signed and ready to install. Enable "Install unknown apps" for your
browser/file manager on the phone, then open the downloaded file.

### Optional: sign the release build with your own keystore

Create a real keystore (never commit it):

\`\`\`bash
keytool -genkeypair -v -keystore release.keystore -alias ${config.keystore.alias || 'appcraft'} \\
  -keyalg RSA -keysize 2048 -validity 9125
\`\`\`

Add these repository secrets (Settings → Secrets and variables → Actions):

| Secret | Value |
| --- | --- |
| \`KEYSTORE_BASE64\` | base64 of \`release.keystore\` |
| \`KEYSTORE_PASSWORD\` | store password |
| \`KEY_ALIAS\` | \`${config.keystore.alias || 'appcraft'}\` |
| \`KEY_PASSWORD\` | key password |

---

## Option 2 — Android Studio

1. Unzip this project and open the folder in Android Studio (Ladybug or newer).
2. Let Gradle sync (Android Studio downloads Gradle ${GRADLE_VERSION} automatically).
3. Press **Run ▶** to install on a connected phone or emulator.
4. To create a signed build: **Build → Generate Signed Bundle / APK**.
   Choose **APK** for direct installation or **AAB** for Google Play.

### Command line

The official Gradle ${GRADLE_VERSION} wrapper is included (\`gradlew\`, \`gradlew.bat\`,
\`gradle/wrapper/gradle-wrapper.jar\`), so no global Gradle install is needed:

\`\`\`bash
# macOS / Linux
chmod +x gradlew
./gradlew :app:assembleDebug        # app/build/outputs/apk/debug/app-debug.apk
./gradlew :app:bundleRelease        # app/build/outputs/bundle/release/app-release.aab
\`\`\`

\`\`\`bat
REM Windows
gradlew.bat :app:assembleDebug
gradlew.bat :app:bundleRelease
\`\`\`

---

## Option 3 — Host the PWA (no APK required)

\`index.html\`, \`manifest.webmanifest\`, \`sw.js\` and \`app-config.json\` are ready for
GitHub Pages:

1. Push the repository (commands above).
2. **Settings → Pages → Deploy from a branch → main / root**.
3. Open \`https://<YOUR-GITHUB-USERNAME>.github.io/${slug}/\` on Android Chrome and
   choose **Add to Home screen / Install app**.

---

## Live content updates (no rebuild)

\`app-config.json\` is the live feed. The installed app and the hosted PWA fetch
it at runtime, so editing it updates every copy of the app:

1. Edit \`app-config.json\` in the repository (menu items, cards, pages, share
   text, notifications feed, ad settings).
2. Commit and push.
3. The app refreshes on its next launch / poll interval (default every 120 s).
   The hosted PWA can also be reloaded to see the change immediately.

**This repository is wired up automatically.** The included GitHub Actions
workflow replaces the live-feed placeholder with this repository's raw URL in
both \`index.html\` and the APK asset before building, so the published APK
already points at:

\`\`\`
https://raw.githubusercontent.com/\${{ github.repository }}/main/app-config.json
\`\`\`

For a manual Android Studio build (or if you host the same repository on
Netlify/Vercel), paste the absolute URL into
**App Features → Live content sync**:

\`\`\`
https://raw.githubusercontent.com/${repo}/main/app-config.json
\`\`\`

GitHub serves this with \`Access-Control-Allow-Origin: *\`, so it works from the
APK and from the PWA. A hosted PWA can also read \`/app-config.json\` from its own
origin; the runtime detects GitHub Pages, Netlify and Vercel automatically.

### Notifications

The app polls the notification feed URL (a JSON array or
\`{ "notifications": [...] }\`) and shows an in-app badge + inbox. On Android the
generated \`AndroidBridge.notify()\` also posts a real system notification. The
app must be open (or running in the background) to receive them — a browser /
WebView cannot receive push messages while fully closed without a push service
(Firebase Cloud Messaging). Add FCM later if you need closed-app push.

---

## Project structure

\`\`\`
app/src/main/AndroidManifest.xml    # permissions, AdMob ID, launcher activity
app/src/main/java/.../MainActivity.kt
app/src/main/res/layout/activity_main.xml
app/src/main/res/mipmap-*/          # real PNG launcher icons generated from your logo
app/src/main/res/values/            # strings, colors, themes
app/src/main/assets/index.html      # the complete offline app UI
app/src/main/assets/app-config.json # live feed shipped with the APK
.github/workflows/build-apk.yml     # cloud APK/AAB builder
gradlew, gradlew.bat                # included Gradle wrapper (no install needed)
gradle/wrapper/                     # wrapper jar + properties
index.html                          # PWA version (GitHub Pages)
manifest.webmanifest
sw.js
app-config.json                     # live content feed for installed apps
\`\`\`

${adsSection}

## Notes

- Change the app icon or splash image in AppCraft Studio and re-export rather than
  editing the mipmap PNGs by hand.
- \`local.properties\` (your SDK path) is machine-specific and should not be committed.
- Keep \`release.keystore\` and its passwords private — losing them means you cannot
  publish updates to the same Play listing.
`;
}

/* ------------------------------ misc files ------------------------------- */

export function generateGitignore(): string {
  return `# Android / Gradle
.gradle/
build/
app/build/
local.properties
*.iml
.idea/
captures/
.externalNativeBuild/
.cxx/
*.jks
*.keystore

# Node / tooling
node_modules/
dist/
.DS_Store
`;
}

export function generateLocalProperties(): string {
  return `# Machine-specific Android SDK location.
# Android Studio writes this automatically when you open the project.
# Windows: sdk.dir=C\\:\\\\Users\\\\YOUR_USER\\\\AppData\\\\Local\\\\Android\\\\Sdk
# macOS:   sdk.dir=/Users/YOUR_USER/Library/Android/sdk
# Linux:   sdk.dir=/home/YOUR_USER/Android/Sdk
`;
}

export function generateKeystoreReadme(config: KeystoreConfig, included = true): string {
  if (!hasUsableKeystore(config)) {
    return `This project was exported WITHOUT a release keystore.

Why? A browser cannot generate a cryptographically valid Android signing key.
Create a real one on your computer (or via Android Studio's signing wizard):

  ${'keytool -genkeypair -v -keystore release.keystore -alias ' + (config.alias || 'appcraft')} \\
    -keyalg RSA -keysize 2048 -validity 9125

Then either:
  - upload it in AppCraft Studio's "Keystore & Signing" tab and re-export, or
  - add the GitHub Actions secrets described in README.md.
`;
  }

  if (!included) {
    return `You uploaded a keystore in AppCraft Studio, but it is deliberately NOT
written into this repository — a signing key must never be committed to Git.

To sign the release build on GitHub, add these repository secrets
(Settings → Secrets and variables → Actions):

  KEYSTORE_BASE64     base64 of your keystore file
  KEYSTORE_PASSWORD   store password
  KEY_ALIAS           ${config.alias || 'appcraft'}
  KEY_PASSWORD        key password

The workflow writes the decoded keystore to app/release.keystore for the build
only. Without the secrets the release build is signed with the debug key.
`;
  }

  return `Your uploaded keystore is included as ${safeKeystoreFileName(config.fileName)}.

Keep this file and its passwords private. It is required to publish updates
to the same Google Play listing.
`;
}
