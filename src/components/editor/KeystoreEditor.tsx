import React, { useState } from 'react';
import type { AppConfig, KeystoreConfig } from '../../types/appConfig';
import {
  getFingerprintCommand,
  getGitHubSecretsGuide,
  getKeytoolCommand,
  hasUsableKeystore,
} from '../../utils/keystoreGenerator';
import { downloadKeystore } from '../../utils/exportService';
import {
  Key,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  FileKey,
  AlertTriangle,
  Download,
  Terminal,
} from 'lucide-react';

interface KeystoreEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

export const KeystoreEditor: React.FC<KeystoreEditorProps> = ({ config, onChange }) => {
  const keystore = config.keystore;
  const [copied, setCopied] = useState<'keytool' | 'fingerprint' | 'secrets' | null>(null);
  const [uploadError, setUploadError] = useState('');

  const updateKeystore = (partial: Partial<KeystoreConfig>) => {
    onChange({ ...config, keystore: { ...keystore, ...partial } });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadError('');

    if (!/\.(jks|keystore)$/i.test(file.name)) {
      setUploadError('Choose a .jks or .keystore file.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setUploadError('Keystore files are small (a few KB). This file is too large to be valid.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.split(',')[1] || result;
      updateKeystore({
        mode: 'upload',
        isCustomUploaded: true,
        fileName: file.name,
        uploadedBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const copy = async (text: string, kind: 'keytool' | 'fingerprint' | 'secrets') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      /* clipboard may be blocked */
    }
  };

  const ready = hasUsableKeystore(keystore);
  const keytoolCommand = getKeytoolCommand(keystore);

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Key className="text-purple-400" size={18} />
              Keystore &amp; Signing
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Android requires a cryptographic signature. A browser cannot create one, so this tab either
              helps you generate a real keystore with <code>keytool</code> or accepts one you already have.
            </p>
          </div>

          <button
            type="button"
            onClick={() => downloadKeystore(config)}
            disabled={!ready}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-semibold text-xs shadow-md transition shrink-0 ${
              ready
                ? 'bg-purple-600 hover:bg-purple-500 text-white'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
            title={ready ? 'Download your uploaded keystore' : 'Upload a keystore first'}
          >
            <Download size={14} />
            <span>Download Keystore</span>
          </button>
        </div>

        <div
          className={`p-3 rounded-xl border text-[11px] flex items-start gap-2 ${
            ready
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          }`}
        >
          {ready ? <ShieldCheck size={15} className="shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="shrink-0 mt-0.5" />}
          <span>
            {ready
              ? `Keystore "${keystore.fileName}" is ready. It is bundled only in the Android Studio export (never in the GitHub export) and used for release signing there.`
              : 'No keystore loaded. Exports still build and install using the debug key — fine for testing, not for Play Store updates.'}
          </span>
        </div>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => updateKeystore({ mode: 'generate' })}
          className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
            keystore.mode === 'generate'
              ? 'border-purple-500 bg-purple-950/20 text-white shadow-md'
              : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Sparkles className="text-purple-400 shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold text-xs text-white">Create one with keytool</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Copy the command below into a terminal to generate a genuine key, then upload it here or use
              GitHub secrets.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => updateKeystore({ mode: 'upload' })}
          className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
            keystore.mode === 'upload'
              ? 'border-purple-500 bg-purple-950/20 text-white shadow-md'
              : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
          }`}
        >
          <Upload className="text-pink-400 shrink-0 mt-0.5" size={18} />
          <div>
            <div className="font-semibold text-xs text-white">Upload existing keystore</div>
            <p className="text-[11px] text-slate-400 mt-1">
              Use your current .jks/.keystore — required to ship updates for an app already on Google Play.
            </p>
          </div>
        </button>
      </div>

      {/* keytool instructions */}
      {keystore.mode === 'generate' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Terminal size={16} className="text-indigo-400" />
            Generate a real release keystore
          </h4>
          <p className="text-[11px] text-slate-400">
            Requires a JDK (Android Studio ships one). Run it in the folder where you want the file stored.
          </p>
          <div className="relative">
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 pr-20 text-[11px] text-emerald-300 font-mono whitespace-pre-wrap break-all">
              {keytoolCommand}
            </pre>
            <button
              type="button"
              onClick={() => copy(keytoolCommand, 'keytool')}
              className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1"
            >
              {copied === 'keytool' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copied === 'keytool' ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Keep the file and passwords safe. Upload the generated file below (or add it to GitHub secrets) to
            sign release builds.
          </p>
        </div>
      )}

      {/* Upload */}
      {keystore.mode === 'upload' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Upload size={16} className="text-pink-400" />
            Upload your keystore
          </h4>

          <div className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-6 text-center transition bg-slate-800/30">
            <FileKey className="mx-auto text-purple-400 mb-2" size={30} />
            <p className="text-xs text-white font-medium mb-1">
              {ready ? `Loaded: ${keystore.fileName}` : 'Select your .keystore or .jks file'}
            </p>
            <span className="text-[11px] text-slate-400 block mb-3">
              The file stays in your browser — it is never uploaded to a server.
            </span>
            <input
              type="file"
              accept=".keystore,.jks"
              onChange={handleFileUpload}
              className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
            />
          </div>

          {uploadError && <p className="text-[11px] text-rose-300">{uploadError}</p>}
        </div>
      )}

      {/* Credentials */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-white">Signing credentials</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Keystore file name</label>
            <input
              type="text"
              value={keystore.fileName}
              onChange={(event) => updateKeystore({ fileName: event.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Key alias</label>
            <input
              type="text"
              value={keystore.alias}
              onChange={(event) => updateKeystore({ alias: event.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Keystore password</label>
            <input
              type="password"
              value={keystore.storePassword}
              onChange={(event) => updateKeystore({ storePassword: event.target.value })}
              placeholder="stored locally only"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Key password</label>
            <input
              type="password"
              value={keystore.keyPassword}
              onChange={(event) => updateKeystore({ keyPassword: event.target.value })}
              placeholder="defaults to keystore password"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Developer / author name</label>
            <input
              type="text"
              value={keystore.developerName}
              onChange={(event) => updateKeystore({ developerName: event.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Organization</label>
            <input
              type="text"
              value={keystore.organization}
              onChange={(event) => updateKeystore({ organization: event.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Country code</label>
            <input
              type="text"
              maxLength={2}
              value={keystore.countryCode}
              onChange={(event) => updateKeystore({ countryCode: event.target.value.toUpperCase() })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Fingerprints */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" />
          SHA-1 / SHA-256 fingerprints
        </h4>
        <p className="text-[11px] text-slate-400">
          Fingerprints come from the certificate inside your keystore, so they must be read from the real file
          (needed for Firebase, Google Sign-In and Play Console). Run:
        </p>
        <div className="relative">
          <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 pr-20 text-[11px] text-indigo-300 font-mono whitespace-pre-wrap break-all">
            {getFingerprintCommand(keystore.fileName, keystore.alias)}
          </pre>
          <button
            type="button"
            onClick={() => copy(getFingerprintCommand(keystore.fileName, keystore.alias), 'fingerprint')}
            className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1"
          >
            {copied === 'fingerprint' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copied === 'fingerprint' ? 'Copied' : 'Copy'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          No fingerprints are shown here because inventing them would break Google/Firebase configuration.
        </p>
      </div>

      {/* CI guide */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <Key size={16} className="text-purple-400" />
          Use your keystore in GitHub Actions
        </h4>
        <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-[11px] text-slate-300 font-mono whitespace-pre-wrap">
          {getGitHubSecretsGuide(keystore)}
        </pre>
        <button
          type="button"
          onClick={() => copy(getGitHubSecretsGuide(keystore), 'secrets')}
          className="text-[11px] text-indigo-300 hover:text-indigo-200 flex items-center gap-1"
        >
          {copied === 'secrets' ? <Check size={12} /> : <Copy size={12} />}
          {copied === 'secrets' ? 'Copied' : 'Copy instructions'}
        </button>
      </div>
    </div>
  );
};
