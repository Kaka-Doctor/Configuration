import React from 'react';
import type { AppConfig } from '../../types/appConfig';
import { DollarSign, ShieldAlert, Sparkles, CheckCircle2, Copy } from 'lucide-react';

interface AdMobEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

const GOOGLE_TEST_ADMOB = {
  appId: 'ca-app-pub-3940256099942544~3347511713',
  bannerUnitId: 'ca-app-pub-3940256099942544/6300978111',
  interstitialUnitId: 'ca-app-pub-3940256099942544/1033173712',
  appOpenUnitId: 'ca-app-pub-3940256099942544/3419832817',
  rewardedUnitId: 'ca-app-pub-3940256099942544/5224354917',
  nativeUnitId: 'ca-app-pub-3940256099942544/2247696110',
};

export const AdMobEditor: React.FC<AdMobEditorProps> = ({ config, onChange }) => {
  const admob = config.admob;

  const updateAdMob = (partial: Partial<AppConfig['admob']>) => {
    onChange({
      ...config,
      admob: { ...config.admob, ...partial },
    });
  };

  const handleApplyGoogleTestUnits = () => {
    updateAdMob({
      isTestingMode: true,
      ...GOOGLE_TEST_ADMOB,
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Enable Monetization Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <DollarSign className="text-amber-400" size={18} />
            Google AdMob Monetization Suite
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Monetize your Android app with Google AdMob banners, interstitials, app open ads, and native ads.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={admob.enabled}
            onChange={(e) => updateAdMob({ enabled: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
        </label>
      </div>

      {admob.enabled && (
        <>
          {/* Test Mode & Presets Banner */}
          <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="text-amber-400 shrink-0 mt-0.5" size={18} />
              <div>
                <span className="font-semibold text-white block">
                  Google AdMob Testing Safety Mode
                </span>
                <span className="text-slate-400 text-[11px]">
                  Always use sample ad unit IDs while developing and testing to prevent your real AdMob account from being suspended for invalid clicks.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleApplyGoogleTestUnits}
              className="px-3 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/40 text-xs font-semibold whitespace-nowrap transition"
            >
              Fill Sample Test Ad Units
            </button>
          </div>

          {/* AdMob App ID */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Google AdMob App ID</h4>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                AdMob Application ID (with tilde ~)
              </label>
              <input
                type="text"
                value={admob.appId}
                onChange={(e) => updateAdMob({ appId: e.target.value })}
                placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Found in your Google AdMob Console &gt; Apps &gt; App Settings. Included in <code className="text-amber-400">AndroidManifest.xml</code>.
              </span>
            </div>
          </div>

          {/* Ad Units Configuration */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Ad Units (Copy & Paste Your Units)</h4>

            <div className="space-y-3">
              {/* Banner Unit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Banner Ad Unit ID
                  </label>
                  <span className="text-[10px] text-amber-400 font-mono">Standard 320x50 Banner</span>
                </div>
                <input
                  type="text"
                  value={admob.bannerUnitId}
                  onChange={(e) => updateAdMob({ bannerUnitId: e.target.value })}
                  placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/bbbbbbbbbb"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Interstitial Unit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Interstitial Ad Unit ID (Full Screen)
                  </label>
                  <span className="text-[10px] text-indigo-400 font-mono">Shown between screen views</span>
                </div>
                <input
                  type="text"
                  value={admob.interstitialUnitId}
                  onChange={(e) => updateAdMob({ interstitialUnitId: e.target.value })}
                  placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/iiiiiiiiii"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* App Open Unit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    App Open Ad Unit ID
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">Shown during cold launch splash</span>
                </div>
                <input
                  type="text"
                  value={admob.appOpenUnitId}
                  onChange={(e) => updateAdMob({ appOpenUnitId: e.target.value })}
                  placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/oooooooooo"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Native Advanced Unit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Native Advanced Ad Unit ID
                  </label>
                  <span className="text-[10px] text-pink-400 font-mono">Blended into launchpad grid</span>
                </div>
                <input
                  type="text"
                  value={admob.nativeUnitId}
                  onChange={(e) => updateAdMob({ nativeUnitId: e.target.value })}
                  placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/nnnnnnnnnn"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Rewarded Video Unit */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">
                    Rewarded Video Ad Unit ID
                  </label>
                  <span className="text-[10px] text-purple-400 font-mono">For unlocking premium features</span>
                </div>
                <input
                  type="text"
                  value={admob.rewardedUnitId}
                  onChange={(e) => updateAdMob({ rewardedUnitId: e.target.value })}
                  placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/rrrrrrrrrr"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Banner Layout & Simulator Settings */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h4 className="text-sm font-semibold text-white">Banner Ad Display & Simulation</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Banner Placement
                </label>
                <div className="flex items-center gap-2">
                  {(['bottom', 'top'] as const).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => updateAdMob({ bannerPosition: pos })}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs capitalize font-medium transition ${
                        admob.bannerPosition === pos
                          ? 'bg-amber-600 text-white font-semibold'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {pos === 'bottom' ? 'Bottom of Screen' : 'Top of Screen'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <div>
                  <span className="text-xs font-medium text-white block">
                    Show Live Simulated Banner in Phone
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Visualizes AdMob banner layout inside simulator
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={admob.showBannerInSimulator}
                    onChange={(e) => updateAdMob({ showBannerInSimulator: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Banner Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(
                  [
                    { id: 'banner', label: 'Small (320×50)' },
                    { id: 'large-banner', label: 'Large (320×100)' },
                    { id: 'medium-rectangle', label: 'Rectangle (300×250)' },
                    { id: 'adaptive', label: 'Adaptive' },
                  ] as const
                ).map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    onClick={() => updateAdMob({ bannerSize: size.id })}
                    className={`py-2 px-2 rounded-xl text-[11px] font-medium transition ${
                      (admob.bannerSize || 'adaptive') === size.id
                        ? 'bg-amber-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {size.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Ad formats and display frequency */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
            <h4 className="text-sm font-semibold text-white">Ad Formats & Frequency</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700 cursor-pointer">
                <span className="text-xs text-slate-300">
                  Rewarded video ads
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Available per menu item / card
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={admob.enableRewardedAds !== false}
                  onChange={(e) => updateAdMob({ enableRewardedAds: e.target.checked })}
                  className="accent-amber-500 w-4 h-4"
                />
              </label>
              <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700 cursor-pointer">
                <span className="text-xs text-slate-300">
                  Native ads
                  <span className="block text-[10px] text-slate-500 mt-0.5">
                    Sponsored block inside content
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={admob.enableNativeAds !== false}
                  onChange={(e) => updateAdMob({ enableNativeAds: e.target.checked })}
                  className="accent-amber-500 w-4 h-4"
                />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  Interstitial after every N clicks
                </label>
                <span className="text-xs font-bold text-amber-300">
                  {admob.interstitialEveryClicks ?? 5}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                step={1}
                value={admob.interstitialEveryClicks ?? 5}
                onChange={(e) => updateAdMob({ interstitialEveryClicks: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>3 clicks</span>
                <span>Default 5</span>
                <span>20 clicks</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-slate-300">
                  App-open ad after every N launches
                </label>
                <span className="text-xs font-bold text-amber-300">
                  {admob.appOpenEveryLaunches ?? 5}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={admob.appOpenEveryLaunches ?? 5}
                onChange={(e) => updateAdMob({ appOpenEveryLaunches: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                <span>Every launch</span>
                <span>Default 5</span>
                <span>10 launches</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500">
              The frequency is enforced in both the PWA runtime and the native Android activity, so
              the APK does not double-count clicks.
            </p>
          </div>
        </>
      )}
    </div>
  );
};
