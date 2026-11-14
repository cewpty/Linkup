// Copies the app (public/) into pages/dist for the Pages deploy.
import { cpSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('..', import.meta.url);
const dist = fileURLToPath(new URL('pages/dist', root));
rmSync(dist, { recursive: true, force: true });
cpSync(fileURLToPath(new URL('public', root)), dist, { recursive: true });
console.log('Copied public/ to pages/dist');
