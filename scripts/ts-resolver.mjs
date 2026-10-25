// Lets `node --test` load the app's TypeScript modules directly.
//
// Vite resolves extensionless imports ("./presets"), but Node's ESM loader
// requires a file extension. This synchronous hook fills that small gap so the
// unit tests can import the exact same source files the app ships.
// Usage: node --import ./scripts/ts-resolver.mjs --test src/utils/appGenerator.test.ts
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const EXTENSIONS = ['.ts', '.tsx', '.mts', '/index.ts', '/index.tsx'];

registerHooks({
  resolve(specifier, context, nextResolve) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    const hasExtension = /\.(?:[cm]?[jt]sx?|json|css)$/i.test(specifier);

    if (isRelative && !hasExtension && context.parentURL) {
      const parentPath = fileURLToPath(context.parentURL);
      const base = resolvePath(dirname(parentPath), specifier);
      for (const extension of EXTENSIONS) {
        const candidate = base + extension;
        if (existsSync(candidate)) {
          return { url: pathToFileURL(candidate).href, shortCircuit: true };
        }
      }
    }

    return nextResolve(specifier, context);
  },
});
