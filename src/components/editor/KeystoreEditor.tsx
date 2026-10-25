import React, { useState } from 'react';
import { AppConfig, KeystoreConfig } from '../../types/appConfig';
import {
  createKeystoreBlob,
  generateCertificateFingerprints,
} from '../../utils/keystoreGenerator';
import {
  Key,
  Download,
  Upload,
  Copy,
  Check,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  FileKey,
} from 'lucide-react';

interface KeystoreEditorProps {
  config: AppConfig;
  onChange: (updated: AppConfig) => void;
}

export const KeystoreEditor: React.FC<KeystoreEditorProps> = ({ config, onChange }) => {
  const keystore = config.keystore;
  const [copiedSha1, setCopiedSha1] = useState(false);
  const [copiedSha256, setCopiedSha256] = useState(false);

  const updateKeystore = (partial: Partial<KeystoreConfig>) => {
    const updated = { ...keystore, ...partial };
    // Recalculate fingerprints if alias or developer name changed
    if (partial.alias !== undefined || partial.developerName !== undefined) {
      const { sha1, sha256 } = generateCertificateFingerprints(
        updated.alias,
        updated.developerName
      );
      updated.sha1Fingerprint = sha1;
      updated.sha256Fingerprint = sha256;
    }
    onChange({ ...config, keystore: updated });
  };

  const handleDownloadKeystore = () => {
    const blob = createKeystoreBlob(keystore);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = keystore.fileName || 'release.keystore';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
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

  const handleCopy = (text: string, type: 'sha1' | 'sha256') => {
    navigator.clipboard?.writeText(text);
    if (type === 'sha1') {
      setCopiedSha1(true);
      setTimeout(() => setCopiedSha1(false), 2000);
    } else {
      setCopiedSha256(true);
      setTimeout(() => setCopiedSha256(false), 2000);
    }
  };

  return (
    <div className="space-y-6 text-sm text-slate-300">
      {/* Keystore Mode Header */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Key className="text-purple-400" size={18} />
              Android Keystore & APK/AAB Digital Signing
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Every Android app (.apk and .aab) requires a cryptographic signature before installing on devices or publishing to Google Play Store.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadKeystore}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md transition self-start sm:self-auto shrink-0"
          >
            <Download size={14} />
            <span>Download Keystore ({keystore.fileName})</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => updateKeystore({ mode: 'generate', isCustomUploaded: false })}
            className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
              keystore.mode === 'generate'
                ? 'border-purple-500 bg-purple-950/20 text-white shadow-md'
                : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
            }`}
          >
            <Sparkles className="text-purple-400 shrink-0 mt-0.5" size={18} />
            <div>
              <div className="font-semibold text-xs text-white">Generate Production Keystore (Auto)</div>
              <p className="text-[11px] text-slate-400 mt-1">
                The studio creates a secure production keystore for you with SHA fingerprints and automatic signing.
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
              <div className="font-semibold text-xs text-white">Upload Existing Keystore (.keystore / .jks)</div>
              <p className="text-[11px] text-slate-400 mt-1">
                Upload your own existing keystore to sign app updates for an already published Google Play app.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Upload Zone (if upload mode) */}
      {keystore.mode === 'upload' && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
            <Upload size={16} className="text-pink-400" />
            Upload Your Keystore File
          </h4>

          <div className="border-2 border-dashed border-slate-700 hover:border-purple-500 rounded-2xl p-6 text-center transition bg-slate-800/30">
            <FileKey className="mx-auto text-purple-400 mb-2" size={32} />
            <p className="text-xs text-white font-medium mb-1">
              {keystore.isCustomUploaded
                ? `Uploaded file: ${keystore.fileName}`
                : 'Click to select or drag & drop your .keystore or .jks file'}
            </p>
            <span className="text-[11px] text-slate-400 block mb-3">
              Standard Java / Android keystore format
            </span>
            <input
              type="file"
              accept=".keystore,.jks"
              onChange={handleFileUpload}
              className="text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Keystore Signing Credentials */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-white">Signing Credentials & Passwords</h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Keystore File Name
            </label>
            <input
              type="text"
              value={keystore.fileName}
              onChange={(e) => updateKeystore({ fileName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Key Alias
            </label>
            <input
              type="text"
              value={keystore.alias}
              onChange={(e) => updateKeystore({ alias: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Keystore Password
            </label>
            <input
              type="text"
              value={keystore.storePassword}
              onChange={(e) => updateKeystore({ storePassword: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Key Password
            </label>
            <input
              type="text"
              value={keystore.keyPassword}
              onChange={(e) => updateKeystore({ keyPassword: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs focus:outline-hidden focus:border-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Developer / Author Name
            </label>
            <input
              type="text"
              value={keystore.developerName}
              onChange={(e) => updateKeystore({ developerName: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Organization
            </label>
            <input
              type="text"
              value={keystore.organization}
              onChange={(e) => updateKeystore({ organization: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Country Code
            </label>
            <input
              type="text"
              maxLength={2}
              value={keystore.countryCode}
              onChange={(e) => updateKeystore({ countryCode: e.target.value.toUpperCase() })}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-mono text-xs"
            />
          </div>
        </div>
      </div>

      {/* Certificate Fingerprints (SHA-1 & SHA-256 for Google Play / Firebase) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <h4 className="text-sm font-semibold text-white flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-400" />
          Certificate Fingerprints (Required for Google Services & Play Console)
        </h4>

        {/* SHA-1 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">SHA-1 Certificate Fingerprint:</span>
            <button
              type="button"
              onClick={() => handleCopy(keystore.sha1Fingerprint, 'sha1')}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono text-[11px]"
            >
              {copiedSha1 ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedSha1 ? 'Copied' : 'Copy SHA-1'}</span>
            </button>
          </div>
          <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl font-mono text-xs text-indigo-300 select-all break-all">
            {keystore.sha1Fingerprint}
          </div>
        </div>

        {/* SHA-256 */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">SHA-256 Certificate Fingerprint:</span>
            <button
              type="button"
              onClick={() => handleCopy(keystore.sha256Fingerprint, 'sha256')}
              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono text-[11px]"
            >
              {copiedSha256 ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedSha256 ? 'Copied' : 'Copy SHA-256'}</span>
            </button>
          </div>
          <div className="p-2.5 bg-slate-800/80 border border-slate-700 rounded-xl font-mono text-xs text-indigo-300 select-all break-all">
            {keystore.sha256Fingerprint}
          </div>
        </div>
      </div>
    </div>
  );
};
