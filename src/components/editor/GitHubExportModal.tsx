import React, { useState } from 'react';
import type { AppConfig } from '../../types/appConfig';
import {
  generateAppHtml,
  generateManifestJson,
  generateServiceWorkerJs,
  generateReadmeMd,
  generateBuildGradle,
  generateAndroidManifestXml,
  generateMainActivityKt,
  generateGitHubActionsWorkflow,
  generateGradleProperties,
} from '../../utils/appGenerator';
import { hasUsableKeystore } from '../../utils/keystoreGenerator';
import {
  downloadAndroidStudioProject,
  downloadGitHubRepoZip,
  downloadKeystore,
} from '../../utils/exportService';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Terminal,
  BookOpen,
  FolderGit2,
  Smartphone,
  Eye,
  Key,
  Cpu,
  AlertTriangle,
} from 'lucide-react';

interface GitHubExportModalProps {
  isOpen: boolean;
  config: AppConfig;
  onClose: () => void;
  onOpenBuild: () => void;
}

type FileTab =
  | 'README.md'
  | 'app/build.gradle'
  | 'AndroidManifest.xml'
  | 'MainActivity.kt'
  | '.github/workflows/build-apk.yml'
  | 'gradle.properties'
  | 'index.html'
  | 'manifest.webmanifest'
  | 'sw.js';

export const GitHubExportModal: React.FC<GitHubExportModalProps> = ({
  isOpen,
  config,
  onClose,
  onOpenBuild,
}) => {
  const [activeTab, setActiveTab] = useState<FileTab>('README.md');
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<'github' | 'studio' | null>(null);
  const [showFullscreenApp, setShowFullscreenApp] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const filesMap: Record<FileTab, string> = {
    'README.md': generateReadmeMd(config),
    'app/build.gradle': generateBuildGradle(config),
    'AndroidManifest.xml': generateAndroidManifestXml(config),
    'MainActivity.kt': generateMainActivityKt(config),
    '.github/workflows/build-apk.yml': generateGitHubActionsWorkflow(config),
    'gradle.properties': generateGradleProperties(config, false),
    'index.html': generateAppHtml(config),
    'manifest.webmanifest': JSON.stringify(generateManifestJson(config), null, 2),
    'sw.js': generateServiceWorkerJs(config),
  };

  const handleCopy = () => {
    navigator.clipboard?.writeText(filesMap[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (kind: 'github' | 'studio') => {
    setError('');
    setBusy(kind);
    try {
      if (kind === 'github') await downloadGitHubRepoZip(config);
      else await downloadAndroidStudioProject(config);
    } catch (err) {
      console.error(err);
      setError('ZIP generation failed in this browser. Please retry in Chrome/Edge.');
    } finally {
      setBusy(null);
    }
  };

  const keystoreAvailable = hasUsableKeystore(config.keystore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
              <FolderGit2 size={22} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Export Source Code</h3>
              <p className="text-xs text-slate-400">
                Two real exports: a compilable Android Studio project, and a GitHub repo with a working APK
                build workflow.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {keystoreAvailable && (
              <button
                onClick={() => downloadKeystore(config)}
                className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition border border-purple-500/40"
                title="Download the keystore you uploaded"
              >
                <Key size={14} className="text-purple-400" />
                <span>Keystore</span>
              </button>
            )}

            <button
              onClick={() => setShowFullscreenApp(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              <Eye size={14} />
              <span>Preview App</span>
            </button>

            <button
              onClick={() => handleDownload('studio')}
              disabled={busy === 'studio'}
              className="px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Cpu size={14} />
              <span>{busy === 'studio' ? 'Packaging…' : 'Android Studio (.zip)'}</span>
            </button>

            <button
              onClick={() => handleDownload('github')}
              disabled={busy === 'github'}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md disabled:opacity-50"
            >
              <Download size={14} />
              <span>{busy === 'github' ? 'Packaging…' : 'GitHub Repo (.zip)'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Build APK callout */}
        <div className="mt-4 p-3 bg-emerald-950/25 border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <Smartphone size={18} className="text-emerald-400 shrink-0 mt-0.5" />
            <span>
              Need the installable <strong>.apk</strong>? Push the repository export to GitHub — its included
              Actions workflow builds a real, installable APK and publishes it to Releases.
            </span>
          </div>
          <button
            onClick={onOpenBuild}
            className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shrink-0 transition"
          >
            Build &amp; Test App →
          </button>
        </div>

        {/* File tabs + code viewer */}
        <div className="flex-1 flex flex-col mt-4 min-h-0 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 overflow-x-auto">
            <div className="flex items-center gap-1">
              {(Object.keys(filesMap) as FileTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition flex items-center gap-1.5 whitespace-nowrap ${
                    activeTab === tab
                      ? 'bg-slate-800 text-white font-semibold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <FileCode size={13} className="text-indigo-400" />
                  <span>{tab}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition border border-slate-700"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400" />
                  <span className="text-emerald-400 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy File</span>
                </>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed select-text">
            <pre className="whitespace-pre">{filesMap[activeTab]}</pre>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 mt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-300">
              <Terminal size={14} className="text-indigo-400" />
              <span>Gradle 8.11.1 · AGP 8.9.1 · Kotlin 2.1.20</span>
            </span>
            <span className="flex items-center gap-1">
              <BookOpen size={14} className="text-indigo-400" />
              <span>Both exports compile out of the box</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!keystoreAvailable && (
              <span className="flex items-center gap-1 text-[11px] text-amber-300">
                <AlertTriangle size={13} />
                No keystore uploaded — releases use the debug key
              </span>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen app preview */}
      {showFullscreenApp && (
        <div className="fixed inset-0 z-60 bg-black flex flex-col">
          <div className="h-10 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between text-xs text-white">
            <div className="flex items-center gap-2">
              <Smartphone size={16} className="text-indigo-400" />
              <span className="font-semibold">{config.appName} — Standalone Preview</span>
            </div>
            <button
              onClick={() => setShowFullscreenApp(false)}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Exit Standalone View
            </button>
          </div>
          <iframe
            srcDoc={filesMap['index.html']}
            title="Standalone PWA App"
            className="w-full flex-1 border-none bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      )}
    </div>
  );
};
