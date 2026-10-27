import React, { useEffect, useState } from 'react';
import {
  Download,
  ExternalLink,
  Github,
  Package,
  Smartphone,
  Trash2,
} from 'lucide-react';
import {
  loadDeployHistory,
  removeDeployRecord,
  subscribeDeployHistory,
  type DeployRecord,
} from '../../utils/deployHistory';

const formatWhen = (value: number): string => {
  try {
    return new Date(value).toLocaleString(undefined, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

/**
 * Sits under the live simulator: the finished apps this browser built, each one
 * with a clickable APK / AAB download. The links point at the GitHub Release,
 * which never expires.
 */
export const MyDownloads: React.FC = () => {
  const [records, setRecords] = useState<DeployRecord[]>(() => loadDeployHistory());

  useEffect(() => {
    const refresh = () => setRecords(loadDeployHistory());
    refresh();
    return subscribeDeployHistory(refresh);
  }, []);

  if (records.length === 0) {
    return (
      <div className="w-full max-w-md px-3 mt-5 mb-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-semibold text-white flex items-center gap-2">
            <Download size={14} className="text-indigo-400" />
            Your downloads
          </p>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            No build yet. Open the <span className="text-slate-200 font-semibold">Deploy</span> tab
            and press <span className="text-slate-200 font-semibold">Deploy my app</span> — the
            finished APK and AAB links appear here permanently.
          </p>
        </div>
      </div>
    );
  }

  const [latest, ...previous] = records;

  return (
    <div className="w-full max-w-md px-3 mt-5 mb-2 space-y-3">
      <div className="rounded-2xl border border-emerald-800/60 bg-emerald-950/20 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wide text-emerald-300/80 font-bold">
              Latest build
            </p>
            <p className="text-sm font-semibold text-white truncate">{latest.appName}</p>
            <p className="text-[10px] text-slate-400 truncate">
              v{latest.version} · {latest.packageId || 'package pending'} ·{' '}
              {formatWhen(latest.createdAt)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => removeDeployRecord(latest.deployId)}
            title="Remove this link from the list"
            className="shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-rose-300 hover:bg-slate-800 transition"
          >
            <Trash2 size={13} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {latest.apkUrl ? (
            <a
              href={latest.apkUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold transition"
            >
              <Smartphone size={13} /> Download APK
            </a>
          ) : null}
          {latest.aabUrl ? (
            <a
              href={latest.aabUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold transition"
            >
              <Package size={13} /> Download AAB
            </a>
          ) : null}
          {latest.releaseUrl ? (
            <a
              href={latest.releaseUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold transition"
            >
              <Github size={13} /> Release page
            </a>
          ) : null}
        </div>
        <p className="text-[10px] text-emerald-300/70">
          Tap a link to install or save the app. These Release files stay online — nothing expires.
        </p>
      </div>

      {previous.length > 0 && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-[10px] uppercase tracking-wide text-slate-500 font-bold mb-2">
            Earlier builds
          </p>
          <ul className="space-y-2">
            {previous.map((record) => (
              <li key={record.deployId} className="flex items-center gap-2 text-[11px]">
                <div className="min-w-0 flex-1">
                  <p className="text-slate-200 font-semibold truncate">{record.appName}</p>
                  <p className="text-slate-500 truncate">
                    v{record.version} · {formatWhen(record.createdAt)}
                  </p>
                </div>
                {record.apkUrl && (
                  <a
                    href={record.apkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 font-semibold"
                  >
                    <Download size={11} /> APK
                  </a>
                )}
                {record.releaseUrl && (
                  <a
                    href={record.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open the Release page"
                    className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  >
                    <ExternalLink size={11} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => removeDeployRecord(record.deployId)}
                  title="Remove this link"
                  className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-rose-300 hover:bg-slate-800"
                >
                  <Trash2 size={11} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
