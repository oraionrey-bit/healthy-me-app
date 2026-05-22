import { copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const dist = join(root, 'dist');
const indexHtml = join(dist, 'index.html');

if (!existsSync(dist)) {
  throw new Error('dist/ does not exist. Run `npm run build:web` first.');
}

if (!existsSync(indexHtml)) {
  throw new Error('dist/index.html does not exist. Expo web export may have failed.');
}

const cnameSource = join(root, 'CNAME');
if (existsSync(cnameSource)) {
  copyFileSync(cnameSource, join(dist, 'CNAME'));
}

writeFileSync(join(dist, '.nojekyll'), '');
copyFileSync(indexHtml, join(dist, '404.html'));

// GitHub Pages deploys the contents of dist/. This makes the static export safe for:
// - custom domain preservation via CNAME
// - Expo/Metro asset paths via .nojekyll
// - SPA refresh/deep-link fallback via 404.html
console.log('Prepared dist/ for GitHub Pages.');
