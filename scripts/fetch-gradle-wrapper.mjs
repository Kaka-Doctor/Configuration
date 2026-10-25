// Regenerates src/utils/gradleWrapperData.ts from the official Gradle repository.
//
// The studio embeds the Gradle wrapper (jar + gradlew scripts) so every exported
// Android project opens in Android Studio without a missing-wrapper error.
//
// Usage: npm run wrapper
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(here, '..');

const version =
  readFileSync(resolve(projectRoot, 'src/utils/androidProject.ts'), 'utf8').match(
    /export const GRADLE_VERSION = '([^']+)'/
  )?.[1] || '8.11.1';

const files = ['gradle-wrapper.jar', 'gradlew', 'gradlew.bat'];
const workDir = mkdtempSync(join(tmpdir(), 'gradle-wrapper-'));

async function download(name) {
  const url = `https://raw.githubusercontent.com/gradle/gradle/v${version}/${name}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} -> HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 100) throw new Error(`${name} looks empty`);
  writeFileSync(join(workDir, name), bytes);
  return bytes;
}

const encoded = {};
for (const name of files) {
  encoded[name] = (await download(name)).toString('base64');
  console.log(`downloaded ${name} (Gradle ${version})`);
}

const output = `/**
 * Official Gradle ${version} wrapper files (Apache-2.0), embedded as base64 so the
 * exported project opens and runs in Android Studio without any missing-file
 * errors. Source: https://github.com/gradle/gradle/tree/v${version}
 *
 * Generated file — do not edit by hand. Regenerate with \`npm run wrapper\`
 * after bumping the Gradle version in androidProject.ts.
 */

export const GRADLE_WRAPPER_JAR_BASE64 =
  '${encoded['gradle-wrapper.jar']}';

export const GRADLEW_SH_BASE64 =
  '${encoded['gradlew']}';

export const GRADLEW_BAT_BASE64 =
  '${encoded['gradlew.bat']}';

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function base64ToText(base64: string): string {
  return new TextDecoder().decode(base64ToBytes(base64));
}
`;

writeFileSync(resolve(projectRoot, 'src/utils/gradleWrapperData.ts'), output);
console.log(`wrote src/utils/gradleWrapperData.ts (${output.length} chars)`);
