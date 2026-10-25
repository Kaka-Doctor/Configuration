import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import type { AppConfig } from '../../types/appConfig';
import {
  apkFileName,
  apkReleaseUrl,
  downloadAndroidStudioProject,
  downloadGitHubRepoZip,
  loadSavedRepo,
  parseRepoSlug,
  repoActionsUrl,
  repoReleasesUrl,
  saveRepo,
  studioUrl,
} from '../../utils/exportService';
import {
  X,
  Download,
  Smartphone,
  QrCode,
  Check,
  Copy,
  Github,
  Package,
  FolderGit2,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Terminal,
  Cpu,
  Layers,
  Link2,
} from 'lucide-react';

interface PhoneTestModalProps {
  isOpen: boolean;
  config: AppConfig;
  onClose: () => void;
}

type Tab = 'apk' | 'studio' | 'pwa';

export const PhoneTestModal: React.FC<PhoneTestModalProps> = ({ isOpen, config, onClose }) => {
  const [tab, setTab] = useState<Tab>('apk');
  const [repoInput, setRepoInput] = useState('');
  const [repo, setRepo] = useState('');
  const [repoError, setRepoError] = useState('');
  const [copied, setCopied] = useState<'git' | null>(null);
  const [busy, setBusy] = useState<'github' | 'studio' | null>(null);
  const [qr, setQr] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const saved = loadSavedRepo();
    setRepo(saved);
    setRepoInput(saved);
    const url = studioUrl();
    if (url) {
      QRCode.toDataURL(url, { width: 260, margin: 1.5, color: { dark: '#0f172a', light: '#ffffff' } })
        .then(setQr)
        .catch(() => setQr(''));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const gitCommands = repo
    ? [
        'git init',
        'git add .',
        'git commit -m "Initial commit"',
        'git branch -M main',
        `git remote add origin https://github.com/${repo}.git`,
        'git push -u origin main',
      ].join('\n')
    : [
        'git init',
        'git add .',
        'git commit -m "Initial commit"',
        'git branch -M main',
        'git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO>.git',
        'git push -u origin main',
      ].join('\n');

  const handleRepoChange = (value: string) => {
    setRepoInput(value);
    const parsed = parseRepoSlug(value);
    if (parsed) {
      setRepo(parsed);
      saveRepo(parsed);
      setRepoError('');
    } else {
      setRepoError(value.trim() ? 'Use the form owner/repository' : '');
    }
  };

  const handleDownload = async (kind: 'github' | 'studio') => {
    setError('');
    setBusy(kind);
    try {
      if (kind === 'github') {
        await downloadGitHubRepoZip(config);
      } else {
        await downloadAndroidStudioProject(config);
      }
    } catch (err) {
      console.error(err);
      setError('Could not create the ZIP in this browser. Try again in Chrome or Edge.');
    } finally {
      setBusy(null);
    }
  };

  const copyGit = async () => {
    try {
      await navigator.clipboard.writeText(gitCommands);
      setCopied('git');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Clipboard access was blocked by the browser.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
              <Smartphone size={26} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Build &amp; Test Your App</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Real, installable APK builds are produced by GitHub Actions — a browser cannot compile
                Android binaries. Everything here creates <strong>working</strong> output.
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

        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-6 pt-4">
          {(
            [
              { id: 'apk', label: '1. Real APK (GitHub)', icon: Package },
              { id: 'studio', label: '2. Android Studio', icon: Cpu },
              { id: 'pwa', label: '3. Instant phone test', icon: QrCode },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                  tab === item.id
                    ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* ------------------------------ APK tab ------------------------------ */}
          {tab === 'apk' && (
            <>
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <FolderGit2 size={16} className="text-indigo-400" />
                  Step 1 — Download the repository and push it
                </h4>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    value={repoInput}
                    onChange={(event) => handleRepoChange(event.target.value)}
                    placeholder="your-username/your-repo"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                  <a
                    href={repo ? repoActionsUrl(repo) : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                      repo
                        ? 'bg-slate-700 hover:bg-slate-600 text-white border-slate-600'
                        : 'bg-slate-800 text-slate-500 border-slate-800 pointer-events-none'
                    }`}
                  >
                    <ExternalLink size={13} />
                    <span>Open Actions</span>
                  </a>
                </div>
                {repoError && <p className="text-[11px] text-amber-300">{repoError}</p>}

                <button
                  onClick={() => handleDownload('github')}
                  disabled={busy === 'github'}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {busy === 'github' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Packaging repository…</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Download GitHub repository (.zip)</span>
                    </>
                  )}
                </button>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                      <Terminal size={12} /> Run inside the unzipped folder
                    </span>
                    <button
                      onClick={copyGit}
                      className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
                    >
                      {copied === 'git' ? <Check size={12} /> : <Copy size={12} />}
                      {copied === 'git' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="text-[11px] leading-relaxed text-emerald-300 font-mono whitespace-pre-wrap">
                    {gitCommands}
                  </pre>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" />
                  Step 2 — GitHub builds an installable APK for you
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The repository already contains{' '}
                  <code className="text-indigo-300">.github/workflows/build-apk.yml</code>. After you
                  push, GitHub installs JDK {config.androidSdk.jdkVersion || '17'} + the Android SDK and runs{' '}
                  <code className="text-indigo-300">assembleDebug</code> /{' '}
                  <code className="text-indigo-300">bundleRelease</code>, then publishes:
                </p>
                <ul className="text-xs text-slate-300 space-y-1.5 pl-4 list-disc">
                  <li>
                    <code className="text-emerald-300">{apkFileName(config)}</code> — install directly on
                    your phone
                  </li>
                  <li>
                    The matching <code className="text-indigo-300">.aab</code> for Google Play
                  </li>
                </ul>
                <p className="text-[11px] text-slate-400">
                  The APK is signed with the debug key (installable everywhere). Add the four signing
                  secrets to sign the AAB and release builds with your own upload key.
                </p>

                <a
                  href={repo ? apkReleaseUrl(repo, config) : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                    repo
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                      : 'bg-slate-800 text-slate-500 pointer-events-none'
                  }`}
                >
                  <Download size={17} />
                  <span>Download the built .APK</span>
                </a>
                {repo ? (
                  <p className="text-[11px] text-slate-400 text-center break-all">
                    {apkReleaseUrl(repo, config)}
                  </p>
                ) : (
                  <p className="text-[11px] text-amber-300 text-center">
                    Enter your GitHub repository above to enable the APK link.
                  </p>
                )}
                <p className="text-[11px] text-slate-500 text-center">
                  The first build takes ~3–5 minutes. The link starts working once the release exists.
                </p>
              </div>
            </>
          )}

          {/* ---------------------------- Studio tab ---------------------------- */}
          {tab === 'studio' && (
            <>
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu size={16} className="text-indigo-400" />
                  Complete Android Studio project
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Contains a real Gradle project: <code className="text-indigo-300">settings.gradle</code>,{' '}
                  AGP/Kotlin plugin versions, <code className="text-indigo-300">MainActivity.kt</code>, theme,
                  layout, network config, offline web assets and <strong>PNG launcher icons generated from
                  your uploaded logo</strong>.
                </p>

                <button
                  onClick={() => handleDownload('studio')}
                  disabled={busy === 'studio'}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {busy === 'studio' ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Rendering icons &amp; packaging…</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Download Android Studio project (.zip)</span>
                    </>
                  )}
                </button>

                <ol className="text-xs text-slate-300 space-y-2 pl-4 list-decimal">
                  <li>Unzip the archive.</li>
                  <li>Android Studio → <strong>File → Open…</strong> → choose the folder.</li>
                  <li>Wait for Gradle sync (it downloads Gradle 8.11.1 automatically).</li>
                  <li>Press <strong>Run ▶</strong> to install on your phone, or use <strong>Build → Generate Signed Bundle / APK</strong>.</li>
                </ol>

                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-200 flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>
                    A browser cannot create a valid signing key. If you did not upload a keystore, the project
                    builds with the debug key (installable), and <code>SIGNING.txt</code> shows the exact
                    keytool command + GitHub secrets for a Play-ready release.
                  </span>
                </div>
              </div>
            </>
          )}

          {/* ------------------------------ PWA tab ------------------------------ */}
          {tab === 'pwa' && (
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-start">
              <div className="bg-white p-3 rounded-2xl shadow-lg mx-auto">
                {qr ? (
                  <img src={qr} alt="QR code for this studio" className="w-48 h-48 rounded-lg" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-slate-500 text-xs">
                    Generating QR…
                  </div>
                )}
              </div>
              <div className="space-y-3 text-xs">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <QrCode size={16} className="text-emerald-400" />
                  Open the studio on your phone right now
                </h4>
                <p className="text-slate-300 leading-relaxed">
                  Scan with the Android camera. Because this studio ships a valid{' '}
                  <code className="text-indigo-300">manifest.webmanifest</code> and icons on Netlify, Chrome
                  offers <strong>Install app</strong> — no APK needed for quick testing.
                </p>
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 space-y-2">
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">1.</span>
                    <span>Scan the QR code and open the link in Chrome.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">2.</span>
                    <span>Chrome menu (⋮) → <strong>Add to Home screen</strong> / <strong>Install app</strong>.</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="font-bold text-emerald-400">3.</span>
                    <span>Your design opens full-screen, like a native app.</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <a
                    href={studioUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium flex items-center gap-1.5 transition"
                  >
                    <ExternalLink size={13} />
                    <span>Open in new tab</span>
                  </a>
                  <span className="text-[11px] text-slate-500 break-all">{studioUrl()}</span>
                </div>
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-[11px] text-indigo-200 flex items-start gap-2">
                  <Layers size={14} className="shrink-0 mt-0.5" />
                  <span>
                    This installs the <strong>studio</strong> as a PWA. To install the app you designed, export
                    the repo and host its root <code>index.html</code> (GitHub Pages / Netlify) — that folder is
                    included in the download.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck size={15} className="text-emerald-400" />
            <span>
              {config.appName} · v{config.versionName} · target SDK {config.androidSdk.targetSdk}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {repo && (
              <a
                href={repoReleasesUrl(repo)}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                <Github size={13} />
                Releases
              </a>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
            >
              Close
            </button>
            <a
              href={repo ? apkReleaseUrl(repo, config) : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                repo
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  : 'bg-slate-800 text-slate-500 pointer-events-none'
              }`}
            >
              <Link2 size={13} />
              <span>Get .APK</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
