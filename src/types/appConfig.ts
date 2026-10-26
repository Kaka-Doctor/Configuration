export type MenuActionType = 'website' | 'html-page' | 'share' | 'about' | 'contact' | 'submenu';

/** How an uploaded splash image is presented. */
export type SplashLayout =
  | 'logo-center'
  | 'image-center'
  | 'image-fullscreen'
  | 'image-bordered'
  | 'text-only';

export type AppThemeName = 'light' | 'dark' | 'midnight' | 'emerald';
export type AppFontFamily = 'system' | 'serif' | 'rounded' | 'mono';

/** A destination inside a submenu. Submenus group two or more places together. */
export interface SubmenuLink {
  id: string;
  label: string;
  description?: string;
  icon: string;
  actionType: 'website' | 'html-page' | 'share' | 'about' | 'contact' | 'submenu';
  targetUrl?: string;
  targetHtml?: string;
  badge?: string;
  customImageUrl?: string;
  /** When true the link opens in the device browser instead of inside the app. */
  openExternally?: boolean;
  /** Show this entry on the app home screen (default true). */
  showOnHome?: boolean;
  /** Use a rewarded ad before the destination opens. */
  rewardedAd?: boolean;
  /** Show a native-style sponsored block inside the destination. */
  nativeAd?: boolean;
  /** Nested destinations make multi-level menus possible. */
  children?: SubmenuLink[];
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  actionType: MenuActionType;
  targetUrl?: string;
  targetHtml?: string;
  badge?: string;
  isExternal?: boolean;
  /** When true the link opens in the device browser instead of inside the app. */
  openExternally?: boolean;
  /** Show this item on the app home screen (default true). */
  showOnHome?: boolean;
  rewardedAd?: boolean;
  nativeAd?: boolean;
  customImageUrl?: string;
  /** Used when actionType is 'submenu'. */
  children?: SubmenuLink[];
}

export interface LaunchpadIconItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  actionType: 'website' | 'html-page' | 'share' | 'about' | 'submenu';
  targetUrl?: string;
  htmlContent?: string;
  badge?: string;
  badgeColor?: string;
  color: string;
  customImageUrl?: string;
  /** When true the link opens in the device browser instead of inside the app. */
  openExternally?: boolean;
  /** Show this card on the app home screen (default true). */
  showOnHome?: boolean;
  rewardedAd?: boolean;
  nativeAd?: boolean;
  /** Used when actionType is 'submenu'. */
  children?: SubmenuLink[];
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
  isCustomUploaded: boolean;
  uploadedBase64?: string;
}

/** User-facing in-app settings panel (theme, font family, font size). */
export interface InAppSettingsConfig {
  enabled: boolean;
  showInTopBar: boolean;
  defaultTheme: AppThemeName;
  allowThemeChange: boolean;
  defaultFont: AppFontFamily;
  allowFontChange: boolean;
  defaultFontScale: number;
  allowFontScale: boolean;
}

/** Share sheet text + optional native bridge behaviour. */
export interface ShareConfig {
  title: string;
  message: string;
  /** Optional link appended to the message. Empty = current app link. */
  url: string;
  /** Ask for the message in a modal before sharing. */
  useTypedMessage: boolean;
}

export interface AppPagesConfig {
  about: {
    enabled: boolean;
    title: string;
    content: string;
  };
  rate: {
    enabled: boolean;
    title: string;
    message: string;
    /** Play Store / website URL opened when the user taps "Rate now". */
    url: string;
  };
  privacy: {
    enabled: boolean;
    title: string;
    content: string;
  };
}

/** Live content sync: the installed app reads JSON from the creator's repo. */
export interface DataSyncConfig {
  enabled: boolean;
  /** Raw URL (raw.githubusercontent.com / GitHub Pages / any CORS-enabled host). */
  configUrl: string;
  /** How often the running app re-checks the feed, in seconds. */
  refreshSeconds: number;
  /** Optional separate notification feed. Empty = notifications from configUrl payload. */
  notificationsUrl: string;
  /** Ask the OS for notification permission (web) when the app starts. */
  requestNotificationPermission: boolean;
}

export interface NotificationSettings {
  enabled: boolean;
  title: string;
  /** Default message used by the in-app test notification. */
  message: string;
  /** Raw URL returning { notifications: [...] } or an array. */
  feedUrl: string;
  pollSeconds: number;
  showBellInTopBar: boolean;
  /** Use the Web Notifications API in addition to the in-app inbox. */
  useSystemNotifications: boolean;
}

/**
 * Optional Firebase Cloud Messaging for the installed Android app.
 * The Google services file is stored in the design (not in exported public
 * repos) and is only compiled into the APK when it is valid for the app's
 * package id.
 */
export interface FcmConfig {
  enabled: boolean;
  /** Full contents of google-services.json from the Firebase console. */
  googleServicesJson: string;
  /** Topic every install subscribes to (defaults to `all`). */
  topic: string;
  /** Show the device's FCM token in the in-app settings sheet (useful for tests). */
  showTokenInSettings: boolean;
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
    customImageUrl?: string;
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
    customImageUrl?: string;
    imageFit?: 'contain' | 'cover';
    /** New presentation modes, including a full-screen image. */
    layout?: SplashLayout;
    imageBorderColor?: string;
    imageBorderWidth?: number;
    imageRadius?: number;
    showSpinner: boolean;
    spinnerType: 'circle' | 'dots' | 'pulse';
  };
  topBar: {
    enabled: boolean;
    title: string;
    showLogo: boolean;
    customLogoUrl?: string;
    showShareButton: boolean;
    showSearchButton: boolean;
    showRefreshButton: boolean;
    showThemeToggle: boolean;
    showMenuToggle: boolean;
    showNotificationsButton?: boolean;
    showSettingsButton?: boolean;
    style: 'flat' | 'elevated' | 'glass';
    bgColor: string;
    textColor: string;
  };
  navigation: {
    /** `both` shows the drawer and the bottom navigation together. */
    type: 'drawer' | 'bottom-nav' | 'top-tabs' | 'floating' | 'none' | 'both';
    items: MenuItem[];
    /** Extra destination list for the bottom bar when type is `both`. */
    bottomNavItems?: MenuItem[];
    drawerHeader: {
      showUserAvatar: boolean;
      customAvatarUrl?: string;
      customBannerUrl?: string;
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
    openLinksExternally?: boolean;
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
    bannerSize?: 'banner' | 'large-banner' | 'medium-rectangle' | 'adaptive';
    showBannerInSimulator: boolean;
    interstitialFrequencySeconds: number;
    /** Interstitial shows after this many item clicks (3-20, default 5). */
    interstitialEveryClicks?: number;
    /** App-open ad shows after this many app launches (1-10, default 5). */
    appOpenEveryLaunches?: number;
    /** Offer rewarded ads on destinations that enable them. */
    enableRewardedAds?: boolean;
    /** Offer native-style sponsored blocks inside content. */
    enableNativeAds?: boolean;
  };
  keystore: KeystoreConfig;
  pwaSettings: {
    orientation: 'any' | 'portrait' | 'landscape';
    display: 'standalone' | 'fullscreen';
    offlineSupport: boolean;
    version: string;
  };
  /** New: share sheet, settings panel, pages, remote sync, notifications. */
  share?: ShareConfig;
  inAppSettings?: InAppSettingsConfig;
  pages?: AppPagesConfig;
  dataSync?: DataSyncConfig;
  notifications?: NotificationSettings;
  /** Optional Firebase Cloud Messaging (closed-app push) for Android. */
  fcm?: FcmConfig;
  /** When true, downloaded files are saved by the app instead of opening a browser. */
  downloads?: {
    enabled: boolean;
    inAppBrowser: boolean;
  };
}
