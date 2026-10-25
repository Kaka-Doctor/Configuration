export type MenuActionType = 'website' | 'html-page' | 'share' | 'about' | 'contact';

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  actionType: MenuActionType;
  targetUrl?: string;
  targetHtml?: string;
  badge?: string;
  isExternal?: boolean;
}

export interface LaunchpadIconItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  actionType: 'website' | 'html-page';
  targetUrl?: string;
  htmlContent?: string;
  badge?: string;
  badgeColor?: string;
  color: string;
}

export interface KeystoreConfig {
  mode: 'generate' | 'upload';
  fileName: string;
  alias: string;
  storePassword: string;
  keyPassword: string;
  validityYears: number;
  developerName: string;
  organization: string;
  countryCode: string;
  sha1Fingerprint: string;
  sha256Fingerprint: string;
  isCustomUploaded: boolean;
  uploadedBase64?: string;
}

export interface AppConfig {
  appName: string;
  shortName: string;
  appPackageId: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  accentColor: string;
  appLogo: {
    icon: string;
    customUrl?: string;
    shape: 'rounded-square' | 'circle' | 'squircle' | 'badge';
    bgColor: string;
    iconColor: string;
  };
  splashScreen: {
    enabled: boolean;
    title: string;
    subtitle: string;
    durationSeconds: number;
    bgType: 'color' | 'gradient';
    bgColor: string;
    gradientFrom: string;
    gradientTo: string;
    logoIcon: string;
    showSpinner: boolean;
    spinnerType: 'circle' | 'dots' | 'pulse';
  };
  topBar: {
    enabled: boolean;
    title: string;
    showLogo: boolean;
    showShareButton: boolean;
    showSearchButton: boolean;
    showRefreshButton: boolean;
    showThemeToggle: boolean;
    showMenuToggle: boolean;
    style: 'flat' | 'elevated' | 'glass';
    bgColor: string;
    textColor: string;
  };
  navigation: {
    type: 'drawer' | 'bottom-nav' | 'top-tabs' | 'floating' | 'none';
    items: MenuItem[];
    drawerHeader: {
      showUserAvatar: boolean;
      title: string;
      subtitle: string;
      bannerColor: string;
    };
  };
  contentMode: 'website' | 'launchpad';
  websiteConfig: {
    url: string;
    title: string;
    fallbackTitle: string;
    showAddressBar: boolean;
  };
  launchpadConfig: {
    heading: string;
    subheading: string;
    columns: 2 | 3 | 4;
    cardStyle: 'modern-glass' | 'material-elevation' | 'minimal-flat';
    icons: LaunchpadIconItem[];
  };
  versionCode: number;
  versionName: string;
  androidSdk: {
    compileSdk: number;
    targetSdk: number;
    minSdk: number;
    jdkVersion: '17' | '21';
    gradleVersion: string;
    enableProGuard: boolean;
    outputType: 'both' | 'apk' | 'aab';
    permissions: {
      internet: boolean;
      networkState: boolean;
      camera: boolean;
      storage: boolean;
      notifications: boolean;
      wakeLock: boolean;
    };
  };
  admob: {
    enabled: boolean;
    isTestingMode: boolean;
    appId: string;
    bannerUnitId: string;
    interstitialUnitId: string;
    appOpenUnitId: string;
    rewardedUnitId: string;
    nativeUnitId: string;
    bannerPosition: 'top' | 'bottom';
    showBannerInSimulator: boolean;
    interstitialFrequencySeconds: number;
  };
  keystore: KeystoreConfig;
  pwaSettings: {
    orientation: 'any' | 'portrait' | 'landscape';
    display: 'standalone' | 'fullscreen';
    offlineSupport: boolean;
    version: string;
  };
}

