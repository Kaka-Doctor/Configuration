/**
 * Keeps the download links of the apps this browser already built, so the APK
 * is still one click away after a reload or when the Deploy tab is closed.
 * Only names and Release URLs are stored - never the project source.
 */

export interface DeployRecord {
  deployId: string;
  appName: string;
  packageId: string;
  version: string;
  createdAt: number;
  releaseUrl?: string;
  apkUrl?: string;
  aabUrl?: string;
}

const STORAGE_KEY = 'appcraft_deploy_history_v1';
const CHANGE_EVENT = 'appcraft:deploy-history';
const MAX_RECORDS = 12;

function isRecord(value: unknown): value is DeployRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<DeployRecord>;
  return typeof record.deployId === 'string' && record.deployId.length > 0;
}

export function loadDeployHistory(): DeployRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(isRecord)
      .map((record) => ({
        deployId: record.deployId,
        appName: String(record.appName || 'Android app'),
        packageId: String(record.packageId || ''),
        version: String(record.version || '1.0.0'),
        createdAt: Number(record.createdAt) || Date.now(),
        releaseUrl: record.releaseUrl,
        apkUrl: record.apkUrl,
        aabUrl: record.aabUrl,
      }))
      .slice(0, MAX_RECORDS);
  } catch {
    return [];
  }
}

function persist(records: DeployRecord[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(0, MAX_RECORDS)));
  } catch {
    /* private mode: links stay in memory for this session */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

export function saveDeployRecord(record: DeployRecord): void {
  const others = loadDeployHistory().filter((item) => item.deployId !== record.deployId);
  persist([record, ...others]);
}

export function removeDeployRecord(deployId: string): void {
  persist(loadDeployHistory().filter((item) => item.deployId !== deployId));
}

export function subscribeDeployHistory(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener('storage', listener);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener('storage', listener);
  };
}
