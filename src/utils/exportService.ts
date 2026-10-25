import type { AppConfig } from '../types/appConfig';
import {
  appSlug,
  createAndroidStudioProjectZip,
  createGitHubRepoZip,
} from './appGenerator';
import { cleanVersion } from './androidProject';
import { createKeystoreBlob, hasUsableKeystore, safeKeystoreFileName } from './keystoreGenerator';

/** Starts a browser download for an in-memory Blob. */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function projectVersion(config: AppConfig): string {
  return cleanVersion(config);
}

/** Name of the APK/AAB produced by the generated GitHub Actions workflow. */
export function apkFileName(config: AppConfig): string {
  return `${appSlug(config)}-v${projectVersion(config)}.apk`;
}

export function aabFileName(config: AppConfig): string {
  return `${appSlug(config)}-v${projectVersion(config)}.aab`;
}

/** Downloads the complete, compilable Android Studio project. */
export async function downloadAndroidStudioProject(config: AppConfig): Promise<void> {
  const blob = await createAndroidStudioProjectZip(config);
  triggerDownload(blob, `${appSlug(config)}-android-studio-project.zip`);
}

/** Downloads the GitHub-ready repository (source + CI workflow + PWA). */
export async function downloadGitHubRepoZip(config: AppConfig): Promise<void> {
  const blob = await createGitHubRepoZip(config);
  triggerDownload(blob, `${appSlug(config)}-github-repo.zip`);
}

/**
 * Downloads the uploaded keystore.
 * Returns false when the user has not uploaded a real one — we never generate
 * a placeholder keystore because Gradle/Play would reject it.
 */
export function downloadKeystore(config: AppConfig): boolean {
  const blob = createKeystoreBlob(config.keystore);
  if (!blob || !hasUsableKeystore(config.keystore)) return false;
  triggerDownload(blob, safeKeystoreFileName(config.keystore.fileName));
  return true;
}

/* ------------------------------ GitHub links ----------------------------- */

const REPO_STORAGE_KEY = 'appcraft_github_repo_v1';

/** Accepts "owner/repo", "https://github.com/owner/repo" or a .git clone URL. */
export function parseRepoSlug(input: string): string | null {
  const value = (input || '').trim();
  if (!value) return null;

  const fromUrl = value.match(/github\.com[/:]+([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/i);
  if (fromUrl) return `${fromUrl[1]}/${fromUrl[2]}`;

  const plain = value.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (plain) return `${plain[1]}/${plain[2]}`;

  return null;
}

export function loadSavedRepo(): string {
  try {
    return localStorage.getItem(REPO_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveRepo(repo: string): void {
  try {
    localStorage.setItem(REPO_STORAGE_KEY, repo);
  } catch {
    /* storage may be full or blocked — the link still works for this session */
  }
}

export function repoActionsUrl(repo: string): string {
  return `https://github.com/${repo}/actions/workflows/build-apk.yml`;
}

export function repoReleasesUrl(repo: string): string {
  return `https://github.com/${repo}/releases`;
}

/** Direct, permanent download link for the APK published by the workflow. */
export function apkReleaseUrl(repo: string, config: AppConfig): string {
  return `https://github.com/${repo}/releases/latest/download/${apkFileName(config)}`;
}

export function aabReleaseUrl(repo: string, config: AppConfig): string {
  return `https://github.com/${repo}/releases/latest/download/${aabFileName(config)}`;
}

export function workflowFileUrl(repo: string): string {
  return `https://raw.githubusercontent.com/${repo}/main/.github/workflows/build-apk.yml`;
}

/** Absolute URL of the currently hosted studio (works on Netlify, Pages, localhost). */
export function studioUrl(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href.split('#')[0];
}
