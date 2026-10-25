import React from 'react';
import { AppConfig } from '../../types/appConfig';
import { Cpu, ShieldCheck, Layers, Terminal, Sparkles, CheckSquare } from 'lucide-react';

interface AndroidSdkEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

export const AndroidSdkEditor: React.FC<AndroidSdkEditorProps> = ({ config, onChange }) => {
  const sdk = config.androidSdk;

  const updateSdk = (partial: Partial<AppConfig['androidSdk']>) => {
    onChange({
      ...config,
      androidSdk: { ...config.androidSdk, ...partial },
    });
  };

  const updatePermissions = (partial: Partial<AppConfig['androidSdk']['permissions']>) => {
    onChange({
      ...config,
      androidSdk: {
        ...config.androidSdk,
        permissions: { ...config.androidSdk.permissions, ...partial },
      },
    });
  };

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* App Versioning & Package */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Terminal className="text-indigo-400" size={18} />
          Version Code & Version Name (Google Play Standards)
        </h3>
        <p className="text-xs text-slate-400">
          Google Play Store requires an incremented integer Version Code and a human-readable Version Name for every release.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Version Code (Integer)
            </label>
            <input
              type="number"
              min={1}
              step={1}
              value={config.versionCode}
              onChange={(e) => onChange({ ...config, versionCode: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">e.g. 1, 2, 100</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Version Name / Number (SemVer)
            </label>
            <input
              type="text"
              value={config.versionName}
              onChange={(e) => onChange({ ...config, versionName: e.target.value })}
              placeholder="1.0.0"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-sm focus:outline-hidden focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">e.g. 1.0.0 or 2.1.4</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Android Package ID
            </label>
            <input
              type="text"
              value={config.appPackageId}
              onChange={(e) => onChange({ ...config, appPackageId: e.target.value })}
              placeholder="com.example.app"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-hidden focus:border-indigo-500"
            />
            <span className="text-[10px] text-slate-500 mt-1 block">Unique reverse-DNS ID</span>
          </div>
        </div>
      </div>

      {/* Target SDK & Compiler Engine (AppCreator24 Style) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Cpu className="text-emerald-400" size={18} />
            Android SDK Target & Build Engine
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Target SDK {sdk.targetSdk}+
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Configure the underlying Android SDK levels and JDK compiler versions. Default is set to modern <strong className="text-emerald-300">Android 16 (Target SDK 36+)</strong> for future-proof Google Play compliance.
        </p>

        {/* Target SDK 36+ Highlight Banner */}
        <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <Sparkles className="text-emerald-400 shrink-0" size={18} />
            <div>
              <span className="font-semibold text-emerald-300 block">
                Target SDK 36+ (Android 16 &amp; Future-Proof)
              </span>
              <span className="text-[11px] text-slate-300">
                API level {sdk.targetSdk} (Android {sdk.targetSdk >= 36 ? '16+ Baklava & Beyond' : '15'}) configured.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => updateSdk({ targetSdk: 36, compileSdk: 36 })}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-xl text-xs font-semibold transition border ${
                sdk.targetSdk === 36
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              SDK 36 (Android 16)
            </button>
            <button
              type="button"
              onClick={() => updateSdk({ targetSdk: 37, compileSdk: 37 })}
              className={`flex-1 sm:flex-initial px-3 py-1 rounded-xl text-xs font-semibold transition border ${
                sdk.targetSdk === 37
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                  : 'bg-slate-800 text-emerald-400 border-slate-700 hover:bg-slate-700'
              }`}
            >
              SDK 37+ (Preview)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          {/* Target SDK */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Target SDK Level
            </label>
            <select
              value={sdk.targetSdk}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                updateSdk({ targetSdk: val, compileSdk: Math.max(val, sdk.compileSdk) });
              }}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-emerald-500"
            >
              <option value={37}>API 37 (Android 17 / Future Preview)</option>
              <option value={36}>API 36 (Android 16) — Target SDK 36+ (Recommended)</option>
              <option value={35}>API 35 (Android 15)</option>
              <option value={34}>API 34 (Android 14)</option>
              <option value={33}>API 33 (Android 13)</option>
            </select>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-slate-500">Google Play 2026/2027</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-slate-400">Custom:</span>
                <input
                  type="number"
                  min={33}
                  max={45}
                  value={sdk.targetSdk}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 36;
                    updateSdk({ targetSdk: val, compileSdk: Math.max(val, sdk.compileSdk) });
                  }}
                  className="w-14 bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[11px] text-emerald-300 font-mono text-center focus:outline-hidden focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Minimum SDK */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Minimum SDK Level (Compatibility)
            </label>
            <select
              value={sdk.minSdk}
              onChange={(e) => updateSdk({ minSdk: parseInt(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-emerald-500"
            >
              <option value={24}>API 24 (Android 7.0) — 99.5% Device Reach</option>
              <option value={26}>API 26 (Android 8.0) — Modern Standard</option>
              <option value={28}>API 28 (Android 9.0)</option>
              <option value={30}>API 30 (Android 11)</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">Controls oldest supported Android phone</span>
          </div>

          {/* Compile SDK */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Compile SDK Level
            </label>
            <select
              value={sdk.compileSdk}
              onChange={(e) => updateSdk({ compileSdk: parseInt(e.target.value) })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-emerald-500"
            >
              <option value={37}>API 37 (Android 17 Preview)</option>
              <option value={36}>API 36 (Android 16 / Compile SDK 36+)</option>
              <option value={35}>API 35 (Android 15)</option>
              <option value={34}>API 34 (Android 14)</option>
            </select>
            <span className="text-[10px] text-slate-500 mt-1 block">Android Gradle Plugin compilation level</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          {/* JDK Version */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Java / JDK Compiler
            </label>
            <div className="flex items-center gap-2">
              {(['17', '21'] as const).map((jdk) => (
                <button
                  key={jdk}
                  type="button"
                  onClick={() => updateSdk({ jdkVersion: jdk })}
                  className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-medium transition ${
                    sdk.jdkVersion === jdk
                      ? 'bg-emerald-600 text-white font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  JDK {jdk} LTS
                </button>
              ))}
            </div>
          </div>

          {/* Output Format */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Build Output Format
            </label>
            <select
              value={sdk.outputType}
              onChange={(e) => updateSdk({ outputType: e.target.value as any })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-white text-xs font-mono focus:outline-hidden focus:border-emerald-500"
            >
              <option value="both">Both (.apk + .aab)</option>
              <option value="apk">Universal APK (.apk only)</option>
              <option value="aab">Google Play Bundle (.aab only)</option>
            </select>
          </div>

          {/* ProGuard */}
          <div className="flex items-center justify-between pt-4">
            <div>
              <span className="text-xs font-medium text-white block">ProGuard / R8 Obfuscation</span>
              <span className="text-[10px] text-slate-400">Shrinks code & protects IP</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sdk.enableProGuard}
                onChange={(e) => updateSdk({ enableProGuard: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-700 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Android Permissions Manager */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="text-sky-400" size={18} />
          Android Manifest Permissions
        </h3>
        <p className="text-xs text-slate-400">
          Check required permissions to include in <code className="text-sky-300">AndroidManifest.xml</code>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
          {[
            { key: 'internet', label: 'INTERNET', desc: 'Load websites & web APIs' },
            { key: 'networkState', label: 'ACCESS_NETWORK_STATE', desc: 'Detect Wi-Fi & offline status' },
            { key: 'notifications', label: 'POST_NOTIFICATIONS', desc: 'Push notifications (Android 13+)' },
            { key: 'camera', label: 'CAMERA', desc: 'Scan QR codes & capture media' },
            { key: 'storage', label: 'READ_EXTERNAL_STORAGE', desc: 'Save & read downloaded files' },
            { key: 'wakeLock', label: 'WAKE_LOCK', desc: 'Keep screen awake during playback' },
          ].map((item) => {
            const isChecked = sdk.permissions[item.key as keyof typeof sdk.permissions];
            return (
              <label
                key={item.key}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  isChecked
                    ? 'border-sky-500/50 bg-sky-950/20 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => updatePermissions({ [item.key]: e.target.checked })}
                  className="mt-0.5 rounded-sm accent-sky-500"
                />
                <div>
                  <span className="font-mono text-xs font-semibold block">{item.label}</span>
                  <span className="text-[11px] text-slate-400 leading-tight block mt-0.5">
                    {item.desc}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
