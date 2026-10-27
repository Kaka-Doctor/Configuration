import React, { useEffect, useRef, useState } from 'react';
import type { AppConfig } from '../../types/appConfig';
import {
  checkDeployService,
  generateRelayWorkflow,
  loadDeployAccessCode,
  pollDeploy,
  saveDeployAccessCode,
  startDeploy,
  type DeployPollResult,
  type DeployServiceStatus,
} from '../../utils/deployRelay';
import { triggerDownload } from '../../utils/exportService';
import { saveDeployRecord, loadActiveDeploy, saveActiveDeploy, clearActiveDeploy } from '../../utils/deployHistory';
import { cleanVersion } from '../../utils/androidProject';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Download,
  ExternalLink,
  Github,
  Loader2,
  Rocket,
  Server,
  ShieldCheck,
} from 'lucide-react';

interface DeployEditorProps {
  config: AppConfig;
}

type Phase = 'idle' | 'preparing' | 'uploading' | 'building' | 'ready' | 'failed';

const inputClass =
  'w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-indigo-500';

const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <code className="block w-full overflow-x-auto rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 text-[10px] text-slate-300 whitespace-pre">
    {children}
  </code>
);

const Step: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({
  number,
  title,
  children,
}) => (
  <li className="flex gap-3">
    <span className="shrink-0 w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-bold flex items-center justify-center mt-0.5">
      {number}
    </span>
    <div className="space-y-1.5 min-w-0">
      <p className="text-xs font-semibold text-slate-200">{title}</p>
      <div className="text-[11px] text-slate-400 leading-relaxed space-y-1.5">{children}</div>
    </div>
  </li>
);

export const DeployEditor: React.FC<DeployEditorProps> = ({ config }) => {
  const [service, setService] = useState<DeployServiceStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [phase, setPhase] = useState<Phase>('idle');
  const [deployId, setDeployId] = useState('');
  const [result, setResult] = useState<DeployPollResult | null>(null);
  const [error, setError] = useState('');
  const [accessCode, setAccessCode] = useState(() => loadDeployAccessCode());
  const pollErrors = useRef(0);

  const refreshService = async () => {
    setChecking(true);
    const status = await checkDeployService();
    setService(status);
    setChecking(false);
  };

  useEffect(() => {
    void refreshService();
  }, []);

  // If the page was reloaded during a build, keep watching that build instead
  // of losing the download link.
  useEffect(() => {
    const active = loadActiveDeploy();
    if (!active) return;
    setDeployId(active.deployId);
    setPhase('building');
    setResult({
      state: 'queued',
      deployId: active.deployId,
      message: `Still building ${active.appName}. This page can be reloaded; the link is saved when it finishes.`,
    });
  }, []);

  useEffect(() => {
    if (!deployId || phase === 'ready' || phase === 'failed') return;
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await pollDeploy(deployId);
        if (cancelled) return;
        pollErrors.current = 0;
        setResult(next);
        setPhase(next.state === 'ready' ? 'ready' : next.state === 'failed' ? 'failed' : 'building');
        if (next.state === 'failed') {
          clearActiveDeploy();
          if (next.message) setError(next.message);
        }
      } catch (pollError) {
        pollErrors.current += 1;
        if (pollErrors.current >= 5) {
          setError(
            pollError instanceof Error
              ? pollError.message
              : 'Lost contact with the deploy service. Open the GitHub Actions page to check the build.'
          );
          setPhase('failed');
        }
      }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), 6000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [deployId, phase]);

  const runDeploy = async () => {
    setError('');
    setResult(null);
    setDeployId('');
    setPhase('preparing');
    try {
      const started = await startDeploy(config, accessCode, () => setPhase('uploading'));
      setDeployId(started.deployId);
      saveActiveDeploy({
        deployId: started.deployId,
        appName: config.appName || 'Android app',
        packageId: config.appPackageId || '',
        version: cleanVersion(config),
        startedAt: Date.now(),
      });
      setResult({
        state: 'queued',
        deployId: started.deployId,
        runUrl: started.runUrl,
        releaseUrl: started.releaseUrl,
        message: 'Build submitted. GitHub is preparing the runner…',
      });
      setPhase('building');
    } catch (deployError) {
      setPhase('failed');
      setError(
        deployError instanceof Error ? deployError.message : 'The deploy could not be started.'
      );
    }
  };

  const busy = phase === 'preparing' || phase === 'uploading' || phase === 'building';
  const configured = Boolean(service?.configured);

  // Remember the finished build so its download link also appears below the
  // simulator and survives a page reload.
  useEffect(() => {
    if (phase !== 'ready' || (!result?.apkUrl && !result?.releaseUrl)) return;
    if (!deployId) return;
    saveDeployRecord({
      deployId,
      appName: config.appName || 'Android app',
      packageId: config.appPackageId || '',
      version: cleanVersion(config),
      createdAt: Date.now(),
      releaseUrl: result?.releaseUrl,
      apkUrl: result?.apkUrl,
      aabUrl: result?.aabUrl,
    });
    clearActiveDeploy();
  }, [
    phase,
    deployId,
    result?.apkUrl,
    result?.aabUrl,
    result?.releaseUrl,
    config.appName,
    config.appPackageId,
    config.versionName,
  ]);

  const workflowDownload = () =>
    triggerDownload(
      new Blob([generateRelayWorkflow()], { type: 'text/yaml;charset=utf-8' }),
      'deploy-relay.yml'
    );

  return (
    <div className="space-y-6 text-sm text-slate-300">
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <Rocket className="text-indigo-400" size={18} />
          One-click deploy
        </h3>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Sends this complete app to a shared build relay, starts GitHub Actions, and returns a
          permanent APK + AAB download link. No GitHub account, token or Android SDK is needed on
          the phone.
        </p>
      </div>

      {/* Service state */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Server size={16} className="text-sky-400" />
              Build relay
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              {checking
                ? 'Checking the deploy function…'
                : configured
                  ? `Connected to ${service?.repo}`
                  : service?.reason || 'The server-side relay is not configured yet.'}
            </p>
          </div>
          <span
            className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              checking
                ? 'border-slate-700 text-slate-400'
                : configured
                  ? 'border-emerald-700 text-emerald-300 bg-emerald-950/40'
                  : 'border-amber-700 text-amber-300 bg-amber-950/40'
            }`}
          >
            {checking ? 'CHECKING' : configured ? 'READY' : 'SETUP NEEDED'}
          </span>
        </div>

        {!checking && !configured && (
          <div className="rounded-xl border border-amber-800/60 bg-amber-950/20 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-200 flex items-center gap-2">
              <AlertCircle size={14} /> Activate the shared builder once
            </p>
            <ol className="space-y-3">
              <Step number={1} title="Create a relay repository">
                <p>
                  Make a <strong>public</strong> GitHub repository, for example{' '}
                  <code>your-name/appcraft-build-relay</code>. Public repositories get free GitHub
                  Actions minutes; private ones stop instantly once the monthly minutes are used
                  up. It is only a build inbox, not your app repository.
                </p>
                <p>
                  The uploaded project sits on a throwaway branch for the length of the build and is
                  deleted by the workflow, so nothing is left behind.
                </p>
              </Step>
              <Step number={2} title="Add the build workflow">
                <p>
                  Put this file at{' '}
                  <code>.github/workflows/deploy-relay.yml</code> in the relay repository:
                </p>
                <button
                  type="button"
                  onClick={workflowDownload}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold transition"
                >
                  <Download size={13} /> Download deploy-relay.yml
                </button>
              </Step>
              <Step number={3} title="Create a fine-grained token">
                <p>
                  GitHub → Settings → Developer settings → Fine-grained tokens. Limit it to the
                  relay repository only, with:
                </p>
                <Code>{`Contents: Read and write
Actions: Read and write
Metadata: Read`}</Code>
              </Step>
              <Step number={4} title="Set Netlify environment variables">
                <p>Site configuration → Environment variables, then redeploy this site:</p>
                <Code>{`GITHUB_RELAY_REPO=your-name/appcraft-build-relay
GITHUB_RELAY_TOKEN=github_pat_...
GITHUB_RELAY_BRANCH=main
GITHUB_RELAY_WORKFLOW=deploy-relay.yml
DEPLOY_ACCESS_CODE=optional-shared-code`}</Code>
                <p>
                  The token never reaches the browser. It is used only by this Netlify function.
                </p>
              </Step>
            </ol>
            <button
              type="button"
              onClick={() => void refreshService()}
              className="text-[11px] font-semibold text-amber-200 underline underline-offset-2"
            >
              I added the variables — check again
            </button>
          </div>
        )}

        {configured && (
          <>
            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <p className="text-slate-500">App</p>
                <p className="text-slate-200 font-semibold truncate">{config.appName}</p>
              </div>
              <div className="rounded-xl bg-slate-950/60 border border-slate-800 p-3">
                <p className="text-slate-500">Package</p>
                <p className="text-slate-200 font-semibold truncate">{config.appPackageId}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Access code (only if the relay sets DEPLOY_ACCESS_CODE)
              </label>
              <input
                className={inputClass}
                type="password"
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value);
                  saveDeployAccessCode(event.target.value);
                }}
                placeholder="Optional shared code"
              />
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => void runDeploy()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold transition shadow-lg shadow-indigo-950/40"
            >
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Rocket size={16} />}
              {phase === 'preparing'
                ? 'Packing the app…'
                : phase === 'building'
                  ? 'Building on GitHub…'
                  : 'Deploy my app'}
            </button>

            <p className="text-[11px] text-slate-500 flex items-start gap-2">
              <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-400" />
              The browser uploads the generated project (no keystore, no GitHub token). The relay
              deletes its build branch after every run; the APK/AAB Release is kept so the download
              does not expire. Finished builds stay listed under the phone preview.
            </p>
          </>
        )}
      </div>

      {/* Progress */}
      {(deployId || phase !== 'idle') && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            {phase === 'ready' ? (
              <CheckCircle2 size={16} className="text-emerald-400" />
            ) : phase === 'failed' ? (
              <AlertCircle size={16} className="text-rose-400" />
            ) : (
              <Loader2 size={16} className="text-indigo-400 animate-spin" />
            )}
            Build progress
          </h3>

          <div className="space-y-2.5">
            {[
              {
                key: 'pack',
                label: 'Project packed',
                done: phase !== 'preparing' && phase !== 'idle',
                active: phase === 'preparing',
              },
              {
                key: 'upload',
                label: 'Uploaded to the relay',
                done: ['building', 'ready', 'failed'].includes(phase),
                active: phase === 'uploading',
              },
              {
                key: 'build',
                label: 'GitHub Actions builds APK + AAB',
                done: phase === 'ready',
                active: phase === 'building',
              },
              {
                key: 'release',
                label: 'Release published',
                done: phase === 'ready',
                active: false,
              },
            ].map((step) => (
              <div key={step.key} className="flex items-center gap-2.5 text-xs">
                {step.done ? (
                  <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                ) : step.active ? (
                  <Loader2 size={14} className="text-indigo-400 animate-spin shrink-0" />
                ) : (
                  <Circle size={14} className="text-slate-600 shrink-0" />
                )}
                <span className={step.done || step.active ? 'text-slate-200' : 'text-slate-500'}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {result?.message && <p className="text-[11px] text-slate-400">{result.message}</p>}
          {error && <p className="text-[11px] text-rose-300">{error}</p>}

          {phase === 'ready' && result && (
            <div className="rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4 space-y-3">
              <p className="text-xs font-semibold text-emerald-200">
                Build finished — permanent download links
              </p>
              <div className="flex flex-wrap gap-2">
                {result.apkUrl && (
                  <a
                    href={result.apkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                  >
                    <Download size={13} /> Download APK
                  </a>
                )}
                {result.aabUrl && (
                  <a
                    href={result.aabUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold"
                  >
                    <Download size={13} /> Download AAB
                  </a>
                )}
                {result.releaseUrl && (
                  <a
                    href={result.releaseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-bold"
                  >
                    <Github size={13} /> Release page
                  </a>
                )}
              </div>
              <p className="text-[10px] text-emerald-300/80">
                This release stays available. The relay branch with the uploaded source was deleted.
              </p>
            </div>
          )}

          {(result?.runUrl || result?.logsUrl) && (
            <a
              href={result.runUrl || result.logsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200"
            >
              <ExternalLink size={12} /> Open the GitHub Actions log
            </a>
          )}

          {phase === 'failed' && (
            <button
              type="button"
              onClick={() => void runDeploy()}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-semibold"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
};
