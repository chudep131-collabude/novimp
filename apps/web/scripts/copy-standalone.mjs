/**
 * Next.js `output: 'standalone'` does not copy `public/` or `.next/static`
 * into the standalone bundle. Without this, every asset under `/public`
 * (country flags, brand logos) and all hashed JS/CSS would 404 in production.
 *
 * Copies them next to the generated server.js so `node .next/standalone/...`
 * serves the full app.
 */
import { cp, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

/** Locate the directory containing server.js (layout varies with monorepos). */
async function findServerDir() {
  const candidates = [
    standalone,
    path.join(standalone, 'apps', 'web'),
    path.join(standalone, 'web'),
  ];
  for (const dir of candidates) {
    try {
      await access(path.join(dir, 'server.js'), constants.F_OK);
      return dir;
    } catch {
      // keep looking
    }
  }
  return null;
}

async function copyInto(src, dest, label) {
  try {
    await access(src, constants.F_OK);
  } catch {
    console.warn(`[copy-standalone] skip ${label}: ${src} not found`);
    return;
  }
  await cp(src, dest, { recursive: true });
  console.log(`[copy-standalone] copied ${label} -> ${path.relative(root, dest)}`);
}

const serverDir = await findServerDir();
if (!serverDir) {
  console.warn('[copy-standalone] server.js not found; skipping asset copy');
  process.exit(0);
}

await copyInto(path.join(root, 'public'), path.join(serverDir, 'public'), 'public');
await copyInto(
  path.join(root, '.next', 'static'),
  path.join(serverDir, '.next', 'static'),
  '.next/static',
);
