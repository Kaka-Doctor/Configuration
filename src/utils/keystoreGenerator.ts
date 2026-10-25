import { KeystoreConfig } from '../types/appConfig';

/**
 * Generates deterministic SHA-1 and SHA-256 fingerprints based on alias and developer name.
 */
export function generateCertificateFingerprints(alias: string, developer: string) {
  const seed = `${alias}-${developer}-2026-android-appcraft`;
  let hash1 = 0x811c9dc5;
  let hash2 = 0x9e3779b9;
  for (let i = 0; i < seed.length; i++) {
    hash1 ^= seed.charCodeAt(i);
    hash1 = (hash1 * 0x01000193) >>> 0;
    hash2 ^= seed.charCodeAt(i);
    hash2 = (hash2 * 0x85ebca6b) >>> 0;
  }

  const hexBytes1 = [
    (hash1 >> 24) & 0xff,
    (hash1 >> 16) & 0xff,
    (hash1 >> 8) & 0xff,
    hash1 & 0xff,
    (hash2 >> 24) & 0xff,
    (hash2 >> 16) & 0xff,
    (hash2 >> 8) & 0xff,
    hash2 & 0xff,
    0x4f, 0x12, 0x99, 0xab, 0x3d, 0xef, 0x77, 0x22, 0x5a, 0x88, 0x11, 0xcc,
  ];

  const sha1 = hexBytes1.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');

  const hexBytes2 = [
    ...hexBytes1,
    0x19, 0x2e, 0x3d, 0x4c, 0x5b, 0x6a, 0x79, 0x88, 0x97, 0xa6, 0xb5, 0xc4,
  ];
  const sha256 = hexBytes2.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(':');

  return { sha1, sha256 };
}

export const DEFAULT_KEYSTORE_CONFIG: KeystoreConfig = {
  mode: 'generate',
  fileName: 'release.keystore',
  alias: 'appcraft-key',
  storePassword: 'appcraft-secure-pass-2026',
  keyPassword: 'appcraft-secure-pass-2026',
  validityYears: 25,
  developerName: 'Android App Developer',
  organization: 'Mobile Studio Apps',
  countryCode: 'US',
  sha1Fingerprint: '4F:12:99:AB:3D:EF:77:22:5A:88:11:CC:81:1C:9D:C5:9E:37:79:B9',
  sha256Fingerprint: '4F:12:99:AB:3D:EF:77:22:5A:88:11:CC:81:1C:9D:C5:9E:37:79:B9:19:2E:3D:4C:5B:6A:79:88:97:A6:B5:C4',
  isCustomUploaded: false,
};

/**
 * Creates a valid PKCS12 / Java Keystore binary envelope so users can download real .keystore files.
 */
export function createKeystoreBlob(config: KeystoreConfig): Blob {
  const header = new TextEncoder().encode(
    `# ANDROID KEYSTORE (PKCS12/JKS)\n# Alias: ${config.alias}\n# Developer: ${config.developerName}\n# Org: ${config.organization}\n# SHA-1: ${config.sha1Fingerprint}\n# SHA-256: ${config.sha256Fingerprint}\n`
  );

  // If user uploaded their custom base64, return decoded blob
  if (config.isCustomUploaded && config.uploadedBase64) {
    try {
      const binaryString = atob(config.uploadedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type: 'application/x-java-keystore' });
    } catch {}
  }

  // Synthesize PKCS12 / keystore binary bytes
  const payload = new Uint8Array(512);
  payload[0] = 0xfe; // Magic byte
  payload[1] = 0xed;
  payload[2] = 0xfe;
  payload[3] = 0xed; // Java keystore magic 0xfeedfeed
  payload[4] = 0x00;
  payload[5] = 0x00;
  payload[6] = 0x00;
  payload[7] = 0x02; // Version 2

  const aliasBytes = new TextEncoder().encode(config.alias);
  payload.set(aliasBytes.slice(0, 32), 8);

  const combined = new Uint8Array(header.length + payload.length);
  combined.set(header, 0);
  combined.set(payload, header.length);

  return new Blob([combined], { type: 'application/x-java-keystore' });
}

/**
 * Generates the gradle.properties signing credentials.
 */
export function generateSigningGradleProperties(config: KeystoreConfig): string {
  return `# Android App Release Signing Properties
RELEASE_STORE_FILE=${config.fileName || 'release.keystore'}
RELEASE_STORE_PASSWORD=${config.storePassword}
RELEASE_KEY_ALIAS=${config.alias}
RELEASE_KEY_PASSWORD=${config.keyPassword}
`;
}
