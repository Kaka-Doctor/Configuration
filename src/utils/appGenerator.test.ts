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
} from './appGenerator.ts';
import { generateCertificateFingerprints } from './keystoreGenerator.ts';
import { DEFAULT_APP_CONFIG } from './presets.ts';

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
  assert.ok(swCode.includes('self.addEventListener(\'install\''), 'SW defines install hook');
  assert.ok(swCode.includes('self.addEventListener(\'fetch\''), 'SW defines fetch caching');
});

test('generateCapacitorConfig matches package id and app name', () => {
  const capJson = JSON.parse(generateCapacitorConfig(DEFAULT_APP_CONFIG));
  assert.equal(capJson.appName, DEFAULT_APP_CONFIG.appName);
  assert.equal(capJson.appId, DEFAULT_APP_CONFIG.appPackageId);
});

test('generateReadmeMd includes GitHub pages and Bubblewrap instructions', () => {
  const readme = generateReadmeMd(DEFAULT_APP_CONFIG);
  assert.ok(readme.includes('GitHub Pages'), 'Contains GitHub Pages guide');
  assert.ok(readme.includes('Target SDK'), 'Contains Target SDK');
  assert.ok(readme.includes('git push'), 'Contains git commands');
});

test('generateAppHtml contains splash screen and topbar if enabled', () => {
  const html = generateAppHtml(DEFAULT_APP_CONFIG);
  assert.ok(html.includes('id="splash-screen"'), 'Includes splash screen');
  assert.ok(html.includes('class="app-topbar"'), 'Includes top bar');
  assert.ok(html.includes('btn-share-app'), 'Includes native share button');
});

test('generateBuildGradle contains targetSdk 36 and versionCode', () => {
  const gradle = generateBuildGradle(DEFAULT_APP_CONFIG);
  assert.ok(gradle.includes('compileSdk 36'), 'Defines compileSdk 36');
  assert.ok(gradle.includes('targetSdk 36'), 'Defines targetSdk 36');
  assert.ok(gradle.includes('versionCode 1'), 'Defines versionCode');
  assert.ok(gradle.includes('play-services-ads'), 'Includes AdMob dependency when enabled');

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

test('generateAndroidManifestXml contains permissions and AdMob App ID', () => {
  const manifestXml = generateAndroidManifestXml(DEFAULT_APP_CONFIG);
  assert.ok(manifestXml.includes('android.permission.INTERNET'), 'Includes INTERNET permission');
  assert.ok(manifestXml.includes('com.google.android.gms.ads.APPLICATION_ID'), 'Includes AdMob app ID');
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
});

test('generateCertificateFingerprints produces valid SHA-1 and SHA-256 formats', () => {
  const { sha1, sha256 } = generateCertificateFingerprints('test-alias', 'Developer');
  assert.ok(sha1.includes(':'), 'SHA-1 is colon-separated hex');
  assert.ok(sha256.includes(':'), 'SHA-256 is colon-separated hex');
  assert.equal(sha1.split(':').length, 20, 'SHA-1 has 20 bytes');
  assert.equal(sha256.split(':').length, 32, 'SHA-256 has 32 bytes');
});
