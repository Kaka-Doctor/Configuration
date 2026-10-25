import React, { useState } from 'react';
import { AppConfig } from '../../types/appConfig';
import {
  generateAppHtml,
  generateManifestJson,
  generateServiceWorkerJs,
  generateCapacitorConfig,
  generateReadmeMd,
  generateBuildGradle,
  generateAndroidManifestXml,
  generateMainActivityKt,
  generateGitHubActionsWorkflow,
  createGitHubRepoZip,
} from '../../utils/appGenerator';
import {
  createKeystoreBlob,
  generateSigningGradleProperties,
} from '../../utils/keystoreGenerator';
import {
  X,
  Download,
  Copy,
  Check,
  FileCode,
  Github,
  Terminal,
  ExternalLink,
  BookOpen,
  FolderGit2,
  Smartphone,
  Eye,
  Key,
} from 'lucide-react';

interface GitHubExportModalProps {
  isOpen: boolean;
  config: AppConfig;
  onClose: () => void;
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

export const GitHubExportModal: React.FC<GitHubExportModalProps> = ({ isOpen, config, onClose }) => {
  const [activeTab, setActiveTab] = useState<FileTab>('README.md');
  const [copied, setCopied] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [showFullscreenApp, setShowFullscreenApp] = useState(false);

  if (!isOpen) return null;

  const filesMap: Record<FileTab, string> = {
    'README.md': generateReadmeMd(config),
    'app/build.gradle': generateBuildGradle(config),
    'AndroidManifest.xml': generateAndroidManifestXml(config),
    'MainActivity.kt': generateMainActivityKt(config),
    '.github/workflows/build-apk.yml': generateGitHubActionsWorkflow(config),
    'gradle.properties': generateSigningGradleProperties(config.keystore),
    'index.html': generateAppHtml(config),
    'manifest.webmanifest': JSON.stringify(generateManifestJson(config), null, 2),
    'sw.js': generateServiceWorkerJs(config),
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(filesMap[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadKeystore = () => {
    const blob = createKeystoreBlob(config.keystore);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = config.keystore?.fileName || 'release.keystore';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    try {
      setIsExportingZip(true);
      const zipBlob = await createGitHubRepoZip(config);
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.shortName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-github-repo.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('ZIP generation error:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-3xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
              <FolderGit2 size={22} className="text-indigo-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                GitHub Repository & Export Center
              </h3>
              <p className="text-xs text-slate-400">
                Download the complete codebase or copy files to host directly on your website or GitHub Pages.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadKeystore}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-semibold flex items-center gap-1.5 transition border border-purple-500/40"
              title="Download signed release keystore"
            >
              <Key size={14} className="text-purple-400" />
              <span>Download Keystore</span>
            </button>

            <button
              onClick={() => setShowFullscreenApp(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
            >
              <Eye size={14} />
              <span>Direct Test App</span>
            </button>

            <button
              onClick={handleDownloadZip}
              disabled={isExportingZip}
              className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-md disabled:opacity-50"
            >
              <Download size={14} />
              <span>{isExportingZip ? 'Creating ZIP...' : 'Download GitHub Repo (.ZIP)'}</span>
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

        {/* Quick Instructions banner */}
        <div className="mt-4 p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <Github size={18} className="text-indigo-400 shrink-0" />
            <span>
              <strong>Ready to push to GitHub:</strong> Includes signed <code className="text-purple-300">{config.keystore?.fileName || 'release.keystore'}</code>, <code className="text-indigo-300">app/build.gradle</code> (Target SDK {config.androidSdk?.targetSdk || 36}+), and GitHub Actions Cloud APK &amp; AAB builder.
            </span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-400 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
            <span>git push -u origin main</span>
          </div>
        </div>

        {/* File Tabs & Code Area */}
        <div className="flex-1 flex flex-col mt-4 min-h-0 border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
          {/* File Tab Bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 overflow-x-auto">
            <div className="flex items-center gap-1">
              {(
                [
                  'README.md',
                  'app/build.gradle',
                  'AndroidManifest.xml',
                  'MainActivity.kt',
                  '.github/workflows/build-apk.yml',
                  'gradle.properties',
                  'index.html',
                  'manifest.webmanifest',
                  'sw.js',
                ] as const
              ).map((tab) => (
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
              onClick={handleCopyCode}
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

          {/* Code Viewer */}
          <div className="flex-1 overflow-auto p-4 bg-slate-950 font-mono text-xs text-slate-300 leading-relaxed select-text">
            <pre className="whitespace-pre">{filesMap[activeTab]}</pre>
          </div>
        </div>

        {/* GitHub & Hosting Guide Footer */}
        <div className="pt-4 mt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-slate-300">
              <Terminal size={14} className="text-indigo-400" />
              <span>Zero build tools required: 100% vanilla web & Android compliant</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Direct Test App Modal */}
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
