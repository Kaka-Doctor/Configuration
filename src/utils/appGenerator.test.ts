import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateManifestJson,
  generateServiceWorkerJs,
  generateCapacitorConfig,
  generateReadmeMd,
  generateAppHtml,
  generateBuildGradle,
  generateAndroidManifestXml,
  generateMainActivityKt,
  generateGitHubActionsWorkflow,
  generateKeystoreReadme,
  generateRemoteConfigJson,
  buildAndroidProjectFiles,
  createGitHubRepoZip,
  appSlug,
} from './appGenerator.ts';
import {
  createKeystoreBlob,
  hasUsableKeystore,
  safeKeystoreFileName,
  getFingerprintCommand,
  DEFAULT_KEYSTORE_CONFIG,
} from './keystoreGenerator.ts';
import { apkFileName, apkReleaseUrl, parseRepoSlug } from './exportService.ts';
import { DEFAULT_IN_APP_SETTINGS, DEFAULT_NOTIFICATIONS, DEFAULT_APP_CONFIG } from './presets.ts';

test('generateManifestJson generates valid PWA manifest fields', () => {
  const manifest = generateManifestJson(DEFAULT_APP_CONFIG);
  assert.equal(manifest.name, DEFAULT_APP_CONFIG.appName);
  assert.ok(manifest.short_name.length <= 12, 'short_name must be 12 chars or fewer');
  assert.equal(manifest.start_url, './index.html');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.length >= 2, 'manifest has 192 and 512 icons');
});

test('generateServiceWorkerJs creates valid caching script', () => {
  const swCode = generateServiceWorkerJs(DEFAULT_APP_CONFIG);
  assert.ok(swCode.includes('CACHE_NAME'), 'SW defines cache name');
  assert.ok(swCode.includes("self.addEventListener('install'"), 'SW defines install hook');
  assert.ok(swCode.includes("self.addEventListener('fetch'"), 'SW defines fetch caching');
  assert.ok(swCode.includes('isLiveFeed'), 'SW keeps live JSON feeds fresh');
});

test('generateCapacitorConfig matches package id and app name', () => {
  const capJson = JSON.parse(generateCapacitorConfig(DEFAULT_APP_CONFIG));
  assert.equal(capJson.appName, DEFAULT_APP_CONFIG.appName);
  assert.equal(capJson.appId, DEFAULT_APP_CONFIG.appPackageId);
});

test('generateReadmeMd documents both real build paths', () => {
  const readme = generateReadmeMd(DEFAULT_APP_CONFIG);
  assert.ok(readme.includes('GitHub Pages'), 'Contains GitHub Pages guide');
  assert.ok(readme.includes('Target SDK'), 'Contains Target SDK');
  assert.ok(readme.includes('git push'), 'Contains git commands');
  assert.ok(readme.includes('.github/workflows/build-apk.yml'), 'Explains the GitHub Actions build');
  assert.ok(readme.includes('assembleDebug'), 'Shows how the APK is produced');
});

test('generateAppHtml contains splash screen and topbar if enabled', () => {
  const html = generateAppHtml(DEFAULT_APP_CONFIG);
  assert.ok(html.includes('id="splash-screen"'), 'Includes splash screen');
  assert.ok(html.includes('class="app-topbar"'), 'Includes top bar');
  assert.ok(html.includes('btn-share-app'), 'Includes native share button');
});

test('generated app renders submenus that group several destinations', () => {
  const config = {
    ...DEFAULT_APP_CONFIG,
    navigation: {
      ...DEFAULT_APP_CONFIG.navigation,
      items: [
        {
          id: 'menu-submenu',
          label: 'Tools',
          icon: 'FolderTree',
          actionType: 'submenu' as const,
          children: [
            {
              id: 'child-1',
              label: 'Offline Handbook',
              description: 'Read inside the app',
              icon: 'FileText',
              actionType: 'html-page' as const,
              targetHtml: '<h2>Handbook</h2>',
            },
            {
              id: 'child-2',
              label: 'Live Dashboard',
              icon: 'Globe',
              actionType: 'website' as const,
              targetUrl: 'https://example.com/dashboard',
            },
          ],
        },
      ],
    },
  };

  const html = generateAppHtml(config);
  assert.ok(html.includes('function openSubmenu'), 'defines the submenu opener');
  assert.ok(html.includes('function runDestination'), 'routes child destinations');
  assert.ok(html.includes('submenu-list'), 'styles the submenu list');
  assert.ok(html.includes('Offline Handbook'), 'serializes child labels');
  assert.ok(html.includes('"children"'), 'serializes child destinations');
  assert.ok(html.includes('&#8250;'), 'shows a chevron for each destination');
});

test('default preset includes a working multi-destination submenu', () => {
  const submenu = DEFAULT_APP_CONFIG.launchpadConfig.icons.find(
    (icon) => icon.actionType === 'submenu'
  );
  assert.ok(submenu, 'demo config ships a submenu card');
  assert.ok((submenu.children?.length ?? 0) >= 2, 'submenu combines at least two sections');
  assert.ok(
    submenu.children?.every((child) => child.label && child.actionType),
    'every child has a label and an action'
  );
});

test('menu HTML content cannot break out of the generated script block', () => {
  const config = {
    ...DEFAULT_APP_CONFIG,
    navigation: {
      ...DEFAULT_APP_CONFIG.navigation,
      items: [
        {
          ...DEFAULT_APP_CONFIG.navigation.items[0],
          id: 'evil',
          label: 'Evil',
          targetHtml: '</script><script>alert(1)</script>',
        },
      ],
    },
  };
  const html = generateAppHtml(config);
  assert.ok(!html.includes('</script><script>alert(1)</script>'), 'script-terminating content is escaped');
  assert.ok(html.includes('\\u003c/script\\u003e'), 'embedded JSON uses unicode escapes');
});

test('generateBuildGradle contains targetSdk 36 and versionCode', () => {
  const gradle = generateBuildGradle(DEFAULT_APP_CONFIG);
  assert.ok(gradle.includes('compileSdk 36'), 'Defines compileSdk 36');
  assert.ok(gradle.includes('targetSdk 36'), 'Defines targetSdk 36');
  assert.ok(gradle.includes('versionCode 1'), 'Defines versionCode');
  assert.ok(gradle.includes('play-services-ads'), 'Includes AdMob dependency when enabled');
  assert.ok(gradle.includes("namespace '"), 'Declares the AGP 8 namespace');

  // Verify custom targetSdk 37
  const customConfig = {
    ...DEFAULT_APP_CONFIG,
    androidSdk: {
      ...DEFAULT_APP_CONFIG.androidSdk,
      targetSdk: 37,
      compileSdk: 37,
    },
  };
  const customGradle = generateBuildGradle(customConfig);
  assert.ok(customGradle.includes('targetSdk 37'), 'Supports custom targetSdk 37+');
  assert.ok(customGradle.includes('compileSdk 37'), 'Supports custom compileSdk 37+');
});

test('generateAndroidManifestXml is AGP 8 compatible and declares AdMob', () => {
  const manifestXml = generateAndroidManifestXml(DEFAULT_APP_CONFIG);
  assert.ok(manifestXml.includes('android.permission.INTERNET'), 'Includes INTERNET permission');
  assert.ok(manifestXml.includes('com.google.android.gms.ads.APPLICATION_ID'), 'Includes AdMob app ID');
  assert.ok(!/\spackage="/.test(manifestXml), 'No package attribute (AGP 8 uses namespace)');
  assert.ok(manifestXml.includes('@mipmap/ic_launcher'), 'References the generated launcher icon');
});

test('generateMainActivityKt contains WebView setup and AdMob initialization', () => {
  const kt = generateMainActivityKt(DEFAULT_APP_CONFIG);
  assert.ok(kt.includes('class MainActivity : AppCompatActivity()'), 'Defines MainActivity');
  assert.ok(kt.includes('MobileAds.initialize'), 'Initializes AdMob');
  assert.ok(kt.includes('setupWebView'), 'Configures WebView');
});

test('generateGitHubActionsWorkflow builds APK and AAB', () => {
  const yml = generateGitHubActionsWorkflow(DEFAULT_APP_CONFIG);
  assert.ok(yml.includes('assembleDebug'), 'Runs assembleDebug for universal APK');
  assert.ok(yml.includes('bundleRelease'), 'Runs bundleRelease for Google Play AAB');
  assert.ok(yml.includes('softprops/action-gh-release'), 'Publishes a stable download link');
  assert.ok(!yml.includes('./gradlew'), 'Does not depend on a missing wrapper jar');
  assert.ok(yml.includes('env.APP_SLUG'), 'Uses workflow expressions for action inputs');
  assert.ok(yml.includes('GITHUB_REF_NAME'), 'Live feed follows the branch that was built');
});

test('generated project contains every resource the manifest references', async () => {
  const files = await buildAndroidProjectFiles(DEFAULT_APP_CONFIG);
  const paths = new Set(files.map((file) => file.path));

  for (const required of [
    'settings.gradle',
    'build.gradle',
    'gradle.properties',
    'gradlew',
    'gradlew.bat',
    'gradle/wrapper/gradle-wrapper.properties',
    'gradle/wrapper/gradle-wrapper.jar',
    'app/build.gradle',
    'app/src/main/AndroidManifest.xml',
    'app/src/main/res/layout/activity_main.xml',
    'app/src/main/res/values/strings.xml',
    'app/src/main/res/values/colors.xml',
    'app/src/main/res/values/themes.xml',
    'app/src/main/res/values-v31/themes.xml',
    'app/src/main/res/xml/network_security_config.xml',
    'app/src/main/assets/index.html',
  ]) {
    assert.ok(paths.has(required), `missing ${required}`);
  }

  for (const density of ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']) {
    assert.ok(paths.has(`app/src/main/res/mipmap-${density}/ic_launcher.png`), `missing ${density} icon`);
    assert.ok(
      paths.has(`app/src/main/res/mipmap-${density}/ic_launcher_round.png`),
      `missing ${density} round icon`
    );
  }

  // Icon assets must be real PNG files, not empty placeholders.
  const icon = files.find((file) => file.path.endsWith('mipmap-xxxhdpi/ic_launcher.png'));
  assert.ok(icon && icon.content instanceof Blob, 'launcher icon is a Blob');
  const bytes = new Uint8Array(await (icon.content as Blob).arrayBuffer());
  assert.deepEqual(
    Array.from(bytes.slice(0, 8)),
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    'icon starts with the PNG signature'
  );
  assert.ok(bytes.length > 500, 'icon contains real pixel data');

  // The Gradle wrapper must be a genuine JAR (PK zip header), not a text stub.
  const wrapper = files.find((file) => file.path === 'gradle/wrapper/gradle-wrapper.jar');
  assert.ok(wrapper, 'includes the Gradle wrapper jar');
  const wrapperBytes = wrapper.content as Uint8Array;
  assert.deepEqual(
    Array.from(wrapperBytes.slice(0, 4)),
    [0x50, 0x4b, 0x03, 0x04],
    'wrapper jar starts with the ZIP header'
  );
  assert.ok(wrapperBytes.length > 10_000, 'wrapper jar contains the real Gradle wrapper classes');
});

test('no keystore is invented when the user did not upload one', async () => {
  assert.equal(hasUsableKeystore(DEFAULT_KEYSTORE_CONFIG), false);
  assert.equal(createKeystoreBlob(DEFAULT_KEYSTORE_CONFIG), null);

  const files = await buildAndroidProjectFiles(DEFAULT_APP_CONFIG);
  assert.equal(
    files.some((file) => file.path.endsWith('.keystore') || file.path.endsWith('.jks')),
    false,
    'no fake keystore in the export'
  );
});

test('uploaded signing material stays out of the GitHub export', async () => {
  const fakeKeystoreBytes = new Uint8Array(64);
  fakeKeystoreBytes[0] = 0x30; // ASN.1 SEQUENCE — passes the structural check
  const config = {
    ...DEFAULT_APP_CONFIG,
    keystore: {
      ...DEFAULT_KEYSTORE_CONFIG,
      mode: 'upload' as const,
      isCustomUploaded: true,
      fileName: '../../release.keystore',
      storePassword: 'store-secret',
      keyPassword: 'key-secret',
      uploadedBase64: Buffer.from(fakeKeystoreBytes).toString('base64'),
    },
  };

  const studioFiles = await buildAndroidProjectFiles(config, { includeSigning: true });
  const studioProps = studioFiles.find((file) => file.path === 'gradle.properties')?.content as string;
  assert.ok(
    studioFiles.some((file) => file.path === 'app/release.keystore'),
    'Android Studio export bundles the uploaded keystore'
  );
  assert.ok(studioProps.includes('RELEASE_STORE_PASSWORD=store-secret'), 'local signing is configured');
  assert.ok(
    studioProps.includes('RELEASE_STORE_FILE=release.keystore'),
    'signing path cannot escape app/ and matches the bundled file'
  );

  const githubFiles = await buildAndroidProjectFiles(config, { includeSigning: false });
  const githubProps = githubFiles.find((file) => file.path === 'gradle.properties')?.content as string;
  assert.equal(
    githubFiles.some((file) => /\.(keystore|jks)$/i.test(file.path)),
    false,
    'no keystore is committed to GitHub'
  );
  assert.ok(!githubProps.includes('store-secret'), 'no signing passwords in the GitHub export');
});

test('keystore names stay inside the project and commands are quoted', () => {
  assert.equal(safeKeystoreFileName('../../evil.keystore'), 'evil.keystore');
  assert.equal(safeKeystoreFileName('my key.jks'), 'my_key.jks');
  assert.equal(safeKeystoreFileName('android'), 'android.keystore');
  assert.equal(safeKeystoreFileName(''), 'release.keystore');
  assert.equal(safeKeystoreFileName(undefined), 'release.keystore');

  const command = getFingerprintCommand('release.keystore', 'app craft');
  assert.ok(command.includes('-keystore "release.keystore"'), 'file name is quoted');
  assert.ok(command.includes('-alias "appcraft"'), 'alias is sanitised');
});

test('CI signs only when all four secrets are present', () => {
  const yml = generateGitHubActionsWorkflow(DEFAULT_APP_CONFIG);
  assert.ok(yml.includes('[ -n "$KEYSTORE_BASE64" ]'), 'checks the keystore secret');
  assert.ok(yml.includes('[ -n "$KEY_ALIAS" ]'), 'checks the alias secret');
  assert.ok(yml.includes('will use the debug key'), 'explains the fallback');

  const gradle = generateBuildGradle(DEFAULT_APP_CONFIG);
  assert.ok(gradle.includes('!releaseStoreFile.toString().trim().isEmpty()'), 'blank paths are rejected');
  assert.ok(
    gradle.includes("project.findProperty('RELEASE_KEY_ALIAS') &&"),
    'blank aliases do not enable signing'
  );
});

test('GitHub signing notes never claim the keystore is included', () => {
  const config = {
    ...DEFAULT_KEYSTORE_CONFIG,
    isCustomUploaded: true,
    fileName: 'release.keystore',
    storePassword: 'store-secret',
    keyPassword: 'key-secret',
    uploadedBase64: Buffer.from([0x30, ...new Array(63).fill(0)]).toString('base64'),
  };
  const note = generateKeystoreReadme(config, false);
  assert.ok(note.includes('NOT'), 'explicitly says the keystore is not committed');
  assert.ok(!note.includes('included as'), 'does not pretend the keystore was bundled');
  assert.ok(note.includes('KEYSTORE_BASE64'), 'points at the CI secrets');
});

test('workflow file names use the same sanitized version as the APK link', () => {
  const config = { ...DEFAULT_APP_CONFIG, versionName: '2.0 beta/RC' };
  const yml = generateGitHubActionsWorkflow(config);
  assert.ok(yml.includes('APP_VERSION: "2.0betaRC"'), 'version is sanitized for git tags and paths');
  assert.equal(apkFileName(config), `${appSlug(config)}-v2.0betaRC.apk`);
  assert.ok(
    yml.includes('cp app/build/outputs/apk/debug/app-debug.apk "$APP_SLUG-v$APP_VERSION.apk"'),
    'workflow output matches the link filename'
  );
});

test('APK release URL and filename match the workflow output', () => {
  const slug = appSlug(DEFAULT_APP_CONFIG);
  assert.equal(apkFileName(DEFAULT_APP_CONFIG), `${slug}-v1.0.0.apk`);
  assert.equal(
    apkReleaseUrl('owner/repo', DEFAULT_APP_CONFIG),
    `https://github.com/owner/repo/releases/latest/download/${slug}-v1.0.0.apk`
  );
});

test('parseRepoSlug accepts plain slugs and GitHub URLs', () => {
  assert.equal(parseRepoSlug('owner/repo'), 'owner/repo');
  assert.equal(parseRepoSlug('https://github.com/owner/repo'), 'owner/repo');
  assert.equal(parseRepoSlug('https://github.com/owner/repo.git'), 'owner/repo');
  assert.equal(parseRepoSlug('git@github.com:owner/repo.git'), 'owner/repo');
  assert.equal(parseRepoSlug('not a repo'), null);
  assert.equal(parseRepoSlug(''), null);
});

test('remote config carries every live-editable feature', () => {
  const config = {
    ...DEFAULT_APP_CONFIG,
    navigation: {
      ...DEFAULT_APP_CONFIG.navigation,
      type: 'both' as const,
      bottomNavItems: [
        {
          id: 'bottom-1',
          label: 'Home',
          icon: 'Home',
          actionType: 'website' as const,
          targetUrl: 'https://example.com',
        },
      ],
    },
    notifications: { ...DEFAULT_NOTIFICATIONS, enabled: true },
  };

  const feed = JSON.parse(generateRemoteConfigJson(config));
  assert.equal(feed.appName, config.appName);
  assert.equal(feed.navigation.type, 'both');
  assert.equal(feed.navigation.bottomNavItems.length, 1);
  assert.ok(feed.share && feed.inAppSettings && feed.pages, 'editor content is in the feed');
  assert.equal(feed.notifications.enabled, true);
  assert.equal(feed.downloads.enabled, true);
  assert.equal(feed.admob.interstitialEveryClicks, 5);
  assert.equal(feed.admob.appOpenEveryLaunches, 5);
});

test('splash layouts render the selected presentation', () => {
  const image = 'data:image/png;base64,iVBORw0KGgo=';
  const base = DEFAULT_APP_CONFIG.splashScreen;

  const full = generateAppHtml({
    ...DEFAULT_APP_CONFIG,
    splashScreen: {
      ...base,
      enabled: true,
      layout: 'image-fullscreen',
      customImageUrl: image,
    },
  });
  assert.ok(full.includes('layout-image-fullscreen'), 'full-screen layout class');
  assert.ok(full.includes('<img class="splash-bg-image"'), 'full-screen image covers the splash');
  assert.ok(full.includes('splash-scrim'), 'scrim keeps the title readable');

  const bordered = generateAppHtml({
    ...DEFAULT_APP_CONFIG,
    splashScreen: {
      ...base,
      enabled: true,
      layout: 'image-bordered',
      customImageUrl: image,
      imageBorderColor: '#ff0000',
      imageBorderWidth: 6,
      imageRadius: 30,
    },
  });
  assert.ok(bordered.includes('<div class="splash-image-box"'), 'bordered image box is present');
  assert.ok(
    bordered.includes('width:160px;height:160px;border-radius:30px;border:6px solid #ff0000'),
    'border colour, width and radius come from the editor'
  );

  const textOnly = generateAppHtml({
    ...DEFAULT_APP_CONFIG,
    splashScreen: {
      ...base,
      enabled: true,
      layout: 'text-only',
      customImageUrl: image,
    },
  });
  assert.ok(textOnly.includes('layout-text-only'), 'text-only layout class');
  assert.ok(!textOnly.includes('<div class="splash-image-box"'), 'text-only hides the image');
  assert.ok(!textOnly.includes('<img class="splash-bg-image"'), 'text-only hides the background image');
  assert.ok(textOnly.includes('splash-title'), 'the title is still rendered');
});

test('generated app includes the share sheet, settings and notification inbox', () => {
  const config = {
    ...DEFAULT_APP_CONFIG,
    topBar: {
      ...DEFAULT_APP_CONFIG.topBar,
      showShareButton: true,
      showSettingsButton: true,
      showNotificationsButton: true,
    },
    inAppSettings: {
      ...DEFAULT_IN_APP_SETTINGS,
      enabled: true,
      showInTopBar: true,
    },
    notifications: {
      ...DEFAULT_NOTIFICATIONS,
      enabled: true,
      showBellInTopBar: true,
    },
  };

  const html = generateAppHtml(config);
  assert.ok(html.includes('id="share-text"'), 'user can type the share message');
  assert.ok(html.includes('id="share-do"'), 'typed message can be sent to native apps');
  assert.ok(html.includes('id="btn-app-settings"'), 'settings button is in the top bar');
  assert.ok(html.includes('id="btn-notifications"'), 'notification bell is in the top bar');
  assert.ok(html.includes('id="notif-badge"'), 'unread badge is rendered');
  assert.ok(html.includes('AndroidBridge'), 'native bridge is used where available');
});

test('YouTube links play in an embed and frame-blocked sites get a fallback', () => {
  const html = generateAppHtml(DEFAULT_APP_CONFIG);
  assert.ok(html.includes('function youtubeEmbedUrl'), 'YouTube URLs are converted to embeds');
  assert.ok(
    html.includes("https://www.youtube.com/embed/' + match[1]"),
    'the embed URL keeps the video id'
  );
  assert.ok(html.includes('youtube.com/embed/'), 'the video id is used in the player');
  assert.ok(html.includes('class="browser-fallback"'), 'blocked sites show a fallback card');
  assert.ok(html.includes('Open in browser / app'), 'the fallback offers the real browser');
  assert.ok(html.includes('function openLink(url, external'), 'links honour the per-item external flag');
  assert.ok(html.includes('destination.openExternally'), 'destinations pass the external flag');
  assert.ok(
    html.includes('DATA.downloads.inAppBrowser === false'),
    'the in-app browser preference is honoured'
  );
  assert.ok(html.includes('FRAME_BLOCKED'), 'known embed-blocking hosts are detected');
});

test('drawer and bottom navigation can be shown together and updated live', () => {
  const html = generateAppHtml({
    ...DEFAULT_APP_CONFIG,
    navigation: { ...DEFAULT_APP_CONFIG.navigation, type: 'both' },
  });
  assert.ok(html.includes('<nav class="bottom-nav-bar" id="bottom-nav"></nav>'), 'bottom bar is visible');
  assert.ok(!html.includes('id="bottom-nav" hidden'), 'not hidden when both are enabled');

  const drawerOnly = generateAppHtml({
    ...DEFAULT_APP_CONFIG,
    navigation: { ...DEFAULT_APP_CONFIG.navigation, type: 'drawer' },
  });
  assert.ok(drawerOnly.includes('id="bottom-nav" hidden'), 'drawer-only hides the bottom bar');
  assert.ok(drawerOnly.includes('.bottom-nav-bar[hidden]'), 'hidden bottom bar is not painted');
  assert.ok(drawerOnly.includes("bottomBar.hidden = !("), 'live sync toggles the bottom bar');
});

test('the generated inline script and service worker parse as JavaScript', () => {
  const html = generateAppHtml(DEFAULT_APP_CONFIG);
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
  assert.ok(scripts.length >= 1, 'the app ships an inline runtime');
  for (const script of scripts) {
    assert.doesNotThrow(() => new Function(script), 'runtime must not have a syntax error');
  }
  assert.doesNotThrow(
    () => new Function(generateServiceWorkerJs(DEFAULT_APP_CONFIG)),
    'service worker must not have a syntax error'
  );
});

test('live config URL is resolved for GitHub Pages, Netlify and installed apps', () => {
  const html = generateAppHtml(DEFAULT_APP_CONFIG);
  assert.ok(html.includes('function resolveLiveConfigUrl'), 'runtime resolves the feed URL');
  assert.ok(html.includes('github\\.io'), 'GitHub Pages is detected');
  assert.ok(html.includes('raw.githubusercontent.com'), 'GitHub Pages maps to the raw feed');
  assert.ok(html.includes("app-config.json'"), 'static hosts read app-config.json next to index.html');
});

test('Android project bridges share, downloads, notifications and ad frequency', async () => {
  const config = {
    ...DEFAULT_APP_CONFIG,
    admob: {
      ...DEFAULT_APP_CONFIG.admob,
      bannerPosition: 'top' as const,
      bannerSize: 'large-banner' as const,
      interstitialEveryClicks: 7,
      appOpenEveryLaunches: 3,
    },
  };

  const files = await buildAndroidProjectFiles(config, { includeSigning: false });
  const byPath = new Map(files.map((file) => [file.path, file.content]));
  const activity = String(
    byPath.get('app/src/main/java/com/apex/portal/MainActivity.kt') || ''
  );
  assert.ok(activity.includes('fun shareText(text: String)'), 'native share intent');
  assert.ok(
    activity.includes('fun downloadFile(url: String, fileName: String)'),
    'downloads stay inside the app'
  );
  assert.ok(
    activity.includes('fun notify(title: String, body: String)'),
    'creator notifications become system notifications'
  );
  assert.ok(activity.includes('INTERSTITIAL_EVERY = 7'), 'interstitial frequency is wired');
  assert.ok(activity.includes('APP_OPEN_EVERY = 3'), 'app-open frequency is wired');
  assert.ok(
    activity.includes('request.addRequestHeader("User-Agent", userAgent)'),
    'downloads carry the page user agent without an unsupported setter'
  );
  assert.ok(activity.includes('adView.setAdSize('), 'adaptive banner size uses the SDK setter');

  const layout = String(byPath.get('app/src/main/res/layout/activity_main.xml') || '');
  assert.ok(layout.includes('ads:adSize="LARGE_BANNER"'), 'large banner size is used');
  const adIndex = layout.indexOf('@+id/adView');
  const webIndex = layout.indexOf('@+id/webView');
  assert.ok(adIndex > 0 && adIndex < webIndex, 'top banner appears above the WebView');
});

test('bottom banner is placed below the WebView', async () => {
  const files = await buildAndroidProjectFiles(
    {
      ...DEFAULT_APP_CONFIG,
      admob: { ...DEFAULT_APP_CONFIG.admob, bannerPosition: 'bottom' as const },
    },
    { includeSigning: false }
  );
  const layout = String(
    files.find((file) => file.path === 'app/src/main/res/layout/activity_main.xml')?.content || ''
  );
  const adIndex = layout.indexOf('@+id/adView');
  const webIndex = layout.indexOf('@+id/webView');
  assert.ok(adIndex > webIndex, 'bottom banner appears after the WebView');
});

test('GitHub export ships the live config feed and explains live sync', async () => {
  const blob = await createGitHubRepoZip(DEFAULT_APP_CONFIG);
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());

  assert.ok(zip.file('app-config.json'), 'root-level feed for installed apps');
  assert.ok(zip.file('.github/workflows/build-apk.yml'), 'cloud APK builder');
  assert.ok(zip.file('index.html'), 'hosted PWA entry point');

  const feed = JSON.parse(await zip.file('app-config.json')!.async('string'));
  assert.equal(feed.appName, DEFAULT_APP_CONFIG.appName);
  assert.ok(feed.pages && feed.share && feed.downloads, 'features are in the feed');
  assert.equal(feed.dataSync.enabled, true, 'repository exports sync live content');

  const rootHtml = await zip.file('index.html')!.async('string');
  assert.ok(
    rootHtml.includes('__APPCRAFT_LIVE_CONFIG_URL__'),
    'the workflow knows where to inject the repository URL'
  );
  assert.ok(rootHtml.includes('resolveLiveConfigUrl'), 'runtime can auto-detect the feed');

  const workflow = await zip.file('.github/workflows/build-apk.yml')!.async('string');
  assert.ok(workflow.includes('__APPCRAFT_LIVE_CONFIG_URL__'), 'CI fills the live feed URL');
  assert.ok(workflow.includes('raw.githubusercontent.com'), 'CI uses the raw GitHub URL');

  const readme = await zip.file('README.md')!.async('string');
  assert.ok(readme.includes('Live content updates (no rebuild)'), 'documents live updates');
  assert.ok(readme.includes('raw.githubusercontent.com'), 'shows the absolute feed URL to use');
});
