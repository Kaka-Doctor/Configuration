import type { AppConfig } from '../types/appConfig';
import { appSlug, createGitHubRepoZip } from './appGenerator';
import { cleanVersion } from './androidProject';

/**
 * One-click builds go through a small relay repository. The browser never
 * holds a GitHub token: the Netlify function (server side) receives the ZIP,
 * commits it to a throwaway branch, and dispatches the relay workflow. The
 * workflow publishes the APK/AAB to a normal GitHub Release and deletes the
 * branch, so the next build starts clean.
 */

export const DEPLOY_FUNCTION_PATH = '/.netlify/functions/deploy';
const ACCESS_CODE_KEY = 'appcraft_deploy_access_code_v1';

export type DeployState = 'queued' | 'building' | 'ready' | 'failed';

export interface DeployServiceStatus {
  configured: boolean;
  repo?: string;
  workflow?: string;
  reason?: string;
}

export interface DeployStartResult {
  deployId: string;
  branch: string;
  runUrl: string;
  releaseUrl: string;
}

export interface DeployPollResult {
  state: DeployState;
  deployId: string;
  runUrl?: string;
  logsUrl?: string;
  releaseUrl?: string;
  apkUrl?: string;
  aabUrl?: string;
  message?: string;
}

function endpoint(): string {
  if (typeof window === 'undefined') return DEPLOY_FUNCTION_PATH;
  return new URL(DEPLOY_FUNCTION_PATH, window.location.origin).toString();
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    return { error: text.slice(0, 300) };
  }
}

export async function checkDeployService(): Promise<DeployServiceStatus> {
  try {
    const response = await fetch(endpoint(), {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    const data = await readJson(response);
    if (!response.ok) {
      return {
        configured: false,
        reason: String(data.error || `Deploy service returned HTTP ${response.status}`),
      };
    }
    return {
      configured: Boolean(data.configured),
      repo: typeof data.repo === 'string' ? data.repo : undefined,
      workflow: typeof data.workflow === 'string' ? data.workflow : undefined,
      reason: typeof data.reason === 'string' ? data.reason : undefined,
    };
  } catch {
    return {
      configured: false,
      reason:
        'Deploy service is not reachable. On Netlify it must be deployed as a function; local static previews do not run it.',
    };
  }
}

export function loadDeployAccessCode(): string {
  try {
    return localStorage.getItem(ACCESS_CODE_KEY) || '';
  } catch {
    return '';
  }
}

export function saveDeployAccessCode(code: string): void {
  try {
    if (code) localStorage.setItem(ACCESS_CODE_KEY, code);
    else localStorage.removeItem(ACCESS_CODE_KEY);
  } catch {
    /* private mode: the code still works for this session */
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function startDeploy(
  config: AppConfig,
  accessCode: string,
  onPacked?: () => void
): Promise<DeployStartResult> {
  const blob = await createGitHubRepoZip(config);
  if (blob.size > 4_000_000) {
    throw new Error(
      'This project is larger than the 4 MB deploy limit. Remove large uploaded images or use the GitHub export instead.'
    );
  }
  const bytes = new Uint8Array(await blob.arrayBuffer());
  onPacked?.();
  const response = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      zip: bytesToBase64(bytes),
      slug: appSlug(config),
      version: cleanVersion(config),
      appName: config.appName,
      accessCode,
    }),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(String(data.error || `Deploy failed with HTTP ${response.status}`));
  }
  if (!data.deployId) throw new Error('Deploy service did not return a build id.');
  return {
    deployId: String(data.deployId),
    branch: String(data.branch || ''),
    runUrl: String(data.runUrl || ''),
    releaseUrl: String(data.releaseUrl || ''),
  };
}

export async function pollDeploy(deployId: string): Promise<DeployPollResult> {
  const url = new URL(endpoint());
  url.searchParams.set('deploy', deployId);
  const response = await fetch(url.toString(), {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(String(data.error || `Deploy status failed with HTTP ${response.status}`));
  }
  const state = String(data.state || 'queued') as DeployState;
  return {
    state: ['queued', 'building', 'ready', 'failed'].includes(state) ? state : 'queued',
    deployId,
    runUrl: typeof data.runUrl === 'string' ? data.runUrl : undefined,
    logsUrl: typeof data.logsUrl === 'string' ? data.logsUrl : undefined,
    releaseUrl: typeof data.releaseUrl === 'string' ? data.releaseUrl : undefined,
    apkUrl: typeof data.apkUrl === 'string' ? data.apkUrl : undefined,
    aabUrl: typeof data.aabUrl === 'string' ? data.aabUrl : undefined,
    message: typeof data.message === 'string' ? data.message : undefined,
  };
}

/**
 * Workflow for the shared relay repository. It builds the submitted ZIP,
 * publishes a permanent Release, then deletes the branch so no app data stays
 * in the repository.
 */
export function generateRelayWorkflow(): string {
  return `name: AppCraft one-click build

# Deployed by the AppCraft Studio Deploy button.
# Input: a ZIP of the generated project committed to a throwaway branch.
on:
  workflow_dispatch:
    inputs:
      deploy_id:
        description: Unique build id
        required: true
      slug:
        description: App slug for file names
        required: true
      version:
        description: Version name
        required: true
      app_name:
        description: Display name
        required: false

run-name: AppCraft build \${{ inputs.deploy_id }}

permissions:
  contents: write

concurrency:
  group: appcraft-\${{ inputs.deploy_id }}
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      DEPLOY_ID: \${{ inputs.deploy_id }}
      APP_SLUG: \${{ inputs.slug }}
      APP_VERSION: \${{ inputs.version }}
      APP_NAME: \${{ inputs.app_name }}

    steps:
      - name: Checkout submitted branch
        uses: actions/checkout@v4

      - name: Unpack submitted project
        run: |
          test -f inbox/app.zip
          mkdir -p workspace
          unzip -q inbox/app.zip -d workspace
          test -f workspace/app/build.gradle

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Set up Android SDK
        uses: android-actions/setup-android@v4

      - name: Install Android platform
        run: |
          yes | sdkmanager --licenses > /dev/null || true
          sdkmanager "platform-tools" "platforms;android-36" > /dev/null

      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@v4
        with:
          gradle-version: '8.11.1'

      - name: Build APK and AAB
        working-directory: workspace
        run: gradle :app:assembleDebug :app:bundleRelease --no-daemon --stacktrace

      - name: Prepare download files
        run: |
          APK="$(find workspace/app/build/outputs/apk -name '*.apk' | head -n 1)"
          AAB="$(find workspace/app/build/outputs/bundle -name '*.aab' | head -n 1)"
          test -n "$APK" && test -n "$AAB"
          cp "$APK" "$APP_SLUG-v$APP_VERSION.apk"
          cp "$AAB" "$APP_SLUG-v$APP_VERSION.aab"
          ls -lh "$APP_SLUG-v$APP_VERSION.apk" "$APP_SLUG-v$APP_VERSION.aab"

      - name: Publish permanent download
        uses: softprops/action-gh-release@v2
        with:
          tag_name: appcraft-\${{ env.DEPLOY_ID }}
          name: "\${{ env.APP_NAME }} v\${{ env.APP_VERSION }}"
          body: |
            One-click build from AppCraft Studio.

            - \`\${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.apk\` — install on Android
            - \`\${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.aab\` — Google Play bundle

            Release assets do not expire. The uploaded source branch is deleted
            after this build.
          files: |
            \${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.apk
            \${{ env.APP_SLUG }}-v\${{ env.APP_VERSION }}.aab
          fail_on_unmatched_files: true
          make_latest: false

      # The ZIP is never kept: the throwaway branch disappears even when the
      # build fails, so the next submission starts from an empty inbox.
      - name: Delete throwaway branch
        if: always()
        run: git push origin --delete "\${{ github.ref_name }}" || true
`;
}
