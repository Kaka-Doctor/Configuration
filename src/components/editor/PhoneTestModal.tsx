import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { AppConfig } from '../../types/appConfig';
import { downloadApk, downloadAab } from '../../utils/apkBuilder';
import {
  X,
  Smartphone,
  Download,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Package,
  Layers,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Radio,
  FileCode,
} from 'lucide-react';

interface PhoneTestModalProps {
  isOpen: boolean;
  config: AppConfig;
  onClose: () => void;
}

export const PhoneTestModal: React.FC<PhoneTestModalProps> = ({ isOpen, config, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isDownloadingApk, setIsDownloadingApk] = useState(false);
  const [isDownloadingAab, setIsDownloadingAab] = useState(false);
  const [apkDownloaded, setApkDownloaded] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'apk' | 'qr' | 'playstore'>('apk');
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate QR code for mobile testing
  useEffect(() => {
    if (!isOpen) return;

    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://localhost:3000';
    QRCode.toDataURL(currentUrl, {
      width: 280,
      margin: 1.5,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation failed:', err));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDownloadApk = async () => {
    try {
      setIsDownloadingApk(true);
      await downloadApk(config);
      setApkDownloaded(true);
      setTimeout(() => setApkDownloaded(false), 4000);
    } catch (err) {
      console.error('Failed to build APK:', err);
      alert('Error building APK. Please try again.');
    } finally {
      setIsDownloadingApk(false);
    }
  };

  const handleDownloadAab = async () => {
    try {
      setIsDownloadingAab(true);
      await downloadAab(config);
    } catch (err) {
      console.error('Failed to build AAB:', err);
      alert('Error building AAB. Please try again.');
    } finally {
      setIsDownloadingAab(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard?.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const cleanFileName = config.shortName.toLowerCase().replace(/[^a-z0-9]/g, '-');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/20">
              <Smartphone size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white tracking-tight">Test on Real Android Phone</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Target SDK {config.androidSdk.targetSdk} (Android 16)
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Download your signed <span className="text-emerald-400 font-semibold">.apk</span> or scan the QR code to install directly onto your physical phone.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Main Download Callouts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Primary APK Download Card */}
            <div className="bg-gradient-to-b from-slate-800 to-slate-850 border-2 border-emerald-500/40 hover:border-emerald-500/70 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all">
              <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider rounded-bl-xl shadow-md">
                Direct Phone Install (.APK)
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="text-emerald-400" size={20} />
                  <h4 className="font-bold text-white text-base">Android Application Package (.apk)</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Pre-compiled, signed binary with your custom keystore, target SDK {config.androidSdk.targetSdk}, custom splash screen, icons, and AdMob integration. Ready to side-load directly.
                </p>

                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60 mb-4 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>File Name:</span>
                    <span className="font-mono text-emerald-300 font-medium truncate max-w-[180px]">
                      {cleanFileName}-v{config.versionName}.apk
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Package ID:</span>
                    <span className="font-mono text-slate-200">{config.appPackageId}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Signing Status:</span>
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <ShieldCheck size={12} /> Signed ({config.keystore.keyAlias})
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadApk}
                disabled={isDownloadingApk}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
              >
                {isDownloadingApk ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Compiling & Packaging APK...</span>
                  </>
                ) : apkDownloaded ? (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Downloaded! Check Downloads Folder</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download .APK Now</span>
                  </>
                )}
              </button>
            </div>

            {/* 2. Google Play Bundle (.AAB) Card */}
            <div className="bg-slate-800/80 border border-slate-700 hover:border-slate-600 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Layers className="text-indigo-400" size={20} />
                  <h4 className="font-bold text-white text-base">Android App Bundle (.aab)</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-3">
                  Official Google Play publishing format. Required when submitting your app to Google Play Store Console for Target SDK {config.androidSdk.targetSdk} compliance.
                </p>

                <div className="bg-slate-900/80 rounded-xl p-3 border border-slate-700/60 mb-4 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>File Name:</span>
                    <span className="font-mono text-indigo-300 font-medium truncate max-w-[180px]">
                      {cleanFileName}-v{config.versionName}-release.aab
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Version Code:</span>
                    <span className="text-slate-200 font-medium">{config.versionCode}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Target SDK:</span>
                    <span className="text-indigo-300 font-semibold">{config.androidSdk.targetSdk} (Android 16+)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDownloadAab}
                disabled={isDownloadingAab}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-semibold text-sm flex items-center justify-center gap-2 border border-slate-600 transition disabled:opacity-50"
              >
                {isDownloadingAab ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Packaging AAB...</span>
                  </>
                ) : (
                  <>
                    <Download size={18} />
                    <span>Download .AAB Bundle</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Testing Guide Tabs */}
          <div className="bg-slate-850 rounded-2xl border border-slate-800 p-5">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-800 text-xs font-semibold">
              <span className="text-slate-400">Testing Methods:</span>
              <button
                onClick={() => setActiveGuideTab('apk')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeGuideTab === 'apk'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Side-load APK on Phone
              </button>
              <button
                onClick={() => setActiveGuideTab('qr')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeGuideTab === 'qr'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Instant QR Scan (WebAPK)
              </button>
              <button
                onClick={() => setActiveGuideTab('playstore')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  activeGuideTab === 'playstore'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Google Play Publish
              </button>
            </div>

            {/* Tab 1: Direct Side-load Instructions */}
            {activeGuideTab === 'apk' && (
              <div className="pt-4 space-y-4">
                <h5 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  How to install the downloaded .APK on your Android Phone:
                </h5>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-2">
                      1
                    </div>
                    <div className="font-semibold text-slate-200 mb-1">Download APK</div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Click "Download .APK Now" on your phone or send the file via USB, Drive, or WhatsApp.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-2">
                      2
                    </div>
                    <div className="font-semibold text-slate-200 mb-1">Open Downloaded File</div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Tap the file in your notification bar or open your phone's <strong>Files</strong> / <strong>Downloads</strong> app.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-2">
                      3
                    </div>
                    <div className="font-semibold text-slate-200 mb-1">Allow Unknown Apps</div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      If prompted: Tap <strong>Settings</strong> &rarr; Toggle <strong>"Allow from this source"</strong> for Chrome or Files.
                    </p>
                  </div>

                  <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-2">
                      4
                    </div>
                    <div className="font-semibold text-slate-200 mb-1">Tap Install</div>
                    <p className="text-slate-400 leading-relaxed text-[11px]">
                      Tap <strong>Install</strong>. Your customized app with splash screen & topbar will launch right on your phone!
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-2">
                    <AlertTriangle size={15} className="text-amber-400 shrink-0" />
                    Tip: Android 14, 15, and 16 require explicit permission for APK side-loading. This takes 5 seconds!
                  </span>
                  <button
                    onClick={handleDownloadApk}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shrink-0 transition"
                  >
                    Download APK
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: QR Code Scan (WebAPK Instant Test) */}
            {activeGuideTab === 'qr' && (
              <div className="pt-4 flex flex-col md:flex-row items-center gap-6">
                <div className="bg-white p-3 rounded-2xl shadow-lg shrink-0">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Scan QR Code to open on mobile" className="w-48 h-48 rounded-lg" />
                  ) : (
                    <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
                      Loading QR...
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-1 text-xs">
                  <div className="flex items-center gap-2">
                    <QrCode className="text-emerald-400" size={18} />
                    <h5 className="font-bold text-white text-sm">Scan with your Phone Camera</h5>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Open your Android phone's Camera or Google Lens and point it at the QR code. You will immediately open your created app on your physical device.
                  </p>

                  <div className="space-y-2 bg-slate-900 p-3 rounded-xl border border-slate-800 text-[11px]">
                    <div className="flex items-start gap-2 text-slate-300">
                      <span className="font-bold text-emerald-400">1.</span>
                      <span>Scan QR code with Android phone camera and tap the opened link in Google Chrome.</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-300">
                      <span className="font-bold text-emerald-400">2.</span>
                      <span>Tap Chrome's 3-dot menu (&vellip;) and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.</span>
                    </div>
                    <div className="flex items-start gap-2 text-slate-300">
                      <span className="font-bold text-emerald-400">3.</span>
                      <span>Android generates a native WebAPK icon on your home screen with your custom splash screen!</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleCopyLink}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 transition"
                    >
                      {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      <span>{copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}</span>
                    </button>
                    <a
                      href={typeof window !== 'undefined' ? window.location.href : '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 transition"
                    >
                      <ExternalLink size={14} />
                      <span>Open Preview in New Tab</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 3: Google Play Store Guide */}
            {activeGuideTab === 'playstore' && (
              <div className="pt-4 space-y-3 text-xs">
                <h5 className="font-bold text-white text-sm">Publishing to Google Play Console:</h5>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Google Play requires apps targeting API level 36+ to be uploaded in the <strong>.AAB (Android App Bundle)</strong> format and signed with your release keystore.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-indigo-400">1. Download .AAB</div>
                    <p className="text-slate-400 text-[11px]">
                      Click "Download .AAB Bundle" above to get your release bundle.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-indigo-400">2. Download Keystore</div>
                    <p className="text-slate-400 text-[11px]">
                      Keep your <code className="text-purple-300 font-mono">{config.keystore.fileName}</code> safe for future updates.
                    </p>
                  </div>
                  <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-1">
                    <div className="font-bold text-indigo-400">3. Upload to Console</div>
                    <p className="text-slate-400 text-[11px]">
                      Go to play.google.com/console &rarr; Create Release &rarr; Drop your .aab file.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>
              Target SDK <strong>{config.androidSdk.targetSdk}</strong> &bull; Package: <code className="text-slate-300">{config.appPackageId}</code> &bull; v{config.versionName}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Close
            </button>
            <button
              onClick={handleDownloadApk}
              disabled={isDownloadingApk}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition disabled:opacity-50"
            >
              <Download size={14} />
              <span>Download .APK ({cleanFileName}.apk)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
