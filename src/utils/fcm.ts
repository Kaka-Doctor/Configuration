import type { AppConfig, FcmConfig } from '../types/appConfig';
import { DEFAULT_FCM } from './presets';

export interface FcmDetails {
  projectId: string;
  projectNumber: string;
  packageName: string;
  appId: string;
  senderId: string;
  packages: string[];
}

export type FcmParseResult =
  | { ok: true; details: FcmDetails }
  | { ok: false; error: string };

/** Topic names may only contain letters, digits, `-`, `_`, `.` and `~`. */
export function sanitizeFcmTopic(topic: string): string {
  return (topic || '')
    .trim()
    .replace(/[^A-Za-z0-9_.~-]/g, '')
    .slice(0, 100);
}

/**
 * Reads a google-services.json file without trusting it. This validates the
 * parts the Google Services Gradle plugin needs, so the studio can refuse to
 * switch FCM on for a package id that would fail the build.
 */
export function parseGoogleServicesJson(raw: string, expectedPackage?: string): FcmParseResult {
  const text = (raw || '').trim();
  if (!text) return { ok: false, error: 'Add your google-services.json file first.' };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'This is not valid JSON. Copy the whole google-services.json file.' };
  }

  if (!data || typeof data !== 'object') {
    return { ok: false, error: 'google-services.json must contain a JSON object.' };
  }
  const root = data as Record<string, unknown>;
  if ('private_key' in root || 'client_email' in root) {
    return {
      ok: false,
      error:
        'That looks like a Firebase service-account key, not google-services.json. Download google-services.json from Project settings → Your apps → Android.',
    };
  }

  const projectInfo = (root.project_info || {}) as Record<string, unknown>;
  const projectId = String(projectInfo.project_id || '').trim();
  const projectNumber = String(projectInfo.project_number || '').trim();
  if (!projectId) {
    return { ok: false, error: 'project_info.project_id is missing.' };
  }

  const clients = Array.isArray(root.client) ? (root.client as Array<Record<string, unknown>>) : [];
  if (clients.length === 0) {
    return { ok: false, error: 'No Android app is registered in this file (client is empty).' };
  }

  const apps = clients
    .map((client) => {
      const clientInfo = (client.client_info || {}) as Record<string, unknown>;
      const android = (clientInfo.android_client_info || {}) as Record<string, unknown>;
      const apiKey = (client.api_key || {}) as Array<Record<string, unknown>>;
      return {
        packageName: String(android.package_name || '').trim(),
        appId: String(clientInfo.mobilesdk_app_id || '').trim(),
        senderId: projectNumber,
        apiKey: String(Array.isArray(apiKey) && apiKey[0] ? apiKey[0].current_key || '' : ''),
      };
    })
    .filter((app) => Boolean(app.packageName));

  if (apps.length === 0) {
    return {
      ok: false,
      error: 'No Android package is registered in this file. Add an Android app in Firebase first.',
    };
  }

  const packages = apps.map((app) => app.packageName);
  const wanted = (expectedPackage || '').trim();
  const match = wanted ? apps.find((app) => app.packageName === wanted) : apps[0];
  if (!match) {
    return {
      ok: false,
      error: `This file is for ${packages.join(', ')}, but your app package is ${wanted}. Add that package in Firebase or change your Android package id.`,
    };
  }

  if (!match.appId) {
    return { ok: false, error: 'The Android app entry is missing mobilesdk_app_id.' };
  }
  if (!match.apiKey) {
    return { ok: false, error: 'The Android app entry is missing its API key.' };
  }

  return {
    ok: true,
    details: {
      projectId,
      projectNumber,
      packageName: match.packageName,
      appId: match.appId,
      senderId: projectNumber,
      packages,
    },
  };
}

/** Merges saved/default FCM settings so old designs stay valid. */
export function resolvedFcm(config: AppConfig): FcmConfig {
  return { ...DEFAULT_FCM, ...(config.fcm || {}) };
}

/**
 * FCM is only compiled in when it is enabled, the file is valid and its
 * package matches the application id. Anything else would make Gradle fail.
 */
export function fcmDetailsFor(config: AppConfig): FcmDetails | null {
  const fcm = resolvedFcm(config);
  if (!fcm.enabled) return null;
  const parsed = parseGoogleServicesJson(fcm.googleServicesJson, config.appPackageId);
  return parsed.ok ? parsed.details : null;
}

export function isFcmReady(config: AppConfig): boolean {
  return fcmDetailsFor(config) !== null;
}
