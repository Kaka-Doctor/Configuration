import type { KeystoreConfig } from '../types/appConfig';

/**
 * IMPORTANT: a real Android signing key cannot be generated in a browser.
 * Generating an RSA key pair + X.509 certificate requires a crypto/keystore
 * implementation (keytool, Android Studio, or the JVM). This module therefore
 * only handles a keystore that the user actually created and uploaded.
 *
 * Anything else (fake fingerprints, dummy binary blobs) was removed because it
 * produced files that Android Studio / Gradle / Play Console reject.
 */

export const DEFAULT_KEYSTORE_CONFIG: KeystoreConfig = {
  mode: 'generate',
  fileName: 'release.keystore',
  alias: 'appcraft',
  storePassword: '',
  keyPassword: '',
  validityYears: 25,
  developerName: 'Android App Developer',
  organization: 'Mobile Studio Apps',
  countryCode: 'US',
  isCustomUploaded: false,
};

/** Decodes the base64 payload of an uploaded keystore into raw bytes. */
export function keystoreBase64ToBytes(base64?: string): Uint8Array | null {
  if (!base64) return null;
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    // A PKCS12/JKS file is never empty and always starts with the JKS magic
    // 0xFEEDFEED or the ASN.1 SEQUENCE tag 0x30 used by PKCS12.
    if (bytes.length < 32) return null;
    if (!(bytes[0] === 0xfe || bytes[0] === 0x30)) return null;
    return bytes;
  } catch {
    return null;
  }
}

/** True when the user uploaded a keystore that looks structurally valid. */
export function hasUsableKeystore(config: KeystoreConfig): boolean {
  return config.isCustomUploaded && keystoreBase64ToBytes(config.uploadedBase64) !== null;
}

/**
 * Sanitises a keystore file name so it can only ever create a file inside the
 * exported `app/` folder (no `..` or absolute paths) and stays shell-safe.
 */
export function safeKeystoreFileName(name?: string): string {
  const base = String(name || '').split(/[\\/]/).pop() || '';
  const cleaned = base.replace(/[^A-Za-z0-9._-]/g, '_').replace(/^\.+/, '');
  if (!cleaned) return 'release.keystore';
  return /\.(keystore|jks)$/i.test(cleaned) ? cleaned : `${cleaned}.keystore`;
}

/** Quotes a value for the copy-paste keytool commands shown in the UI. */
function shellQuote(value: string): string {
  return `"${String(value).replace(/(["\\$`])/g, '\\$1')}"`;
}

/** Returns the uploaded keystore as a Blob, or null when there is nothing real to provide. */
export function createKeystoreBlob(config: KeystoreConfig): Blob | null {
  const bytes = keystoreBase64ToBytes(config.uploadedBase64);
  if (!config.isCustomUploaded || !bytes) return null;
  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  return new Blob([buffer], { type: 'application/x-java-keystore' });
}

/** Ready-to-run command that creates a genuine release keystore on the user's machine. */
export function getKeytoolCommand(config: KeystoreConfig): string {
  const alias = (config.alias || 'appcraft').replace(/[^A-Za-z0-9._-]/g, '');
  const fileName = safeKeystoreFileName(config.fileName);
  const developerName = String(config.developerName || 'Android App Developer').replace(/["\\\r\n]/g, ' ');
  const organization = String(config.organization || 'Mobile Studio Apps').replace(/["\\\r\n]/g, ' ');
  const country = (config.countryCode || 'US').replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || 'US';
  const dname = `CN=${developerName}, O=${organization}, C=${country}`;
  return [
    'keytool -genkeypair -v \\',
    `  -keystore ${shellQuote(fileName)} \\`,
    `  -alias ${shellQuote(alias)} \\`,
    '  -keyalg RSA -keysize 2048 \\',
    `  -validity ${Math.max(1, Math.round(config.validityYears || 25)) * 365} \\`,
    `  -dname "${dname}"`,
  ].join('\n');
}

/** Command that prints the real SHA-1 / SHA-256 fingerprints of a keystore. */
export function getFingerprintCommand(fileName: string, alias = 'appcraft'): string {
  const safeAlias = (alias || 'appcraft').replace(/[^A-Za-z0-9._-]/g, '') || 'appcraft';
  return `keytool -list -v -keystore ${shellQuote(safeKeystoreFileName(fileName))} -alias ${shellQuote(safeAlias)}`;
}

/** Generates the optional `.env`-free CI signing snippet used by the workflow. */
export function getGitHubSecretsGuide(config: KeystoreConfig): string {
  return `1. Create a real keystore (Android Studio > Build > Generate Signed Bundle, or keytool).
2. Base64-encode it:
   - macOS/Linux: base64 -w 0 release.keystore
   - Windows:     certutil -encode release.keystore keystore.b64  (then remove header/footer lines)
3. In your GitHub repo open Settings > Secrets and variables > Actions and add:
   KEYSTORE_BASE64   = the base64 text
   KEYSTORE_PASSWORD = your store password
   KEY_ALIAS         = ${config.alias || 'appcraft'}
   KEY_PASSWORD      = your key password
4. Push to main (or run the "Build Android APK & AAB" workflow manually).
   The workflow signs the release build with your key and publishes the APK to Releases.`;
}
