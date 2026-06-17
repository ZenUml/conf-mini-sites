// Build the Forge Custom UI resources (CONTEXT.md: faithful "Bold Editorial" design, self-hosted, no CDN).
// For each resource dir (static/publisher = the modal, static/view = the inline launcher):
//   1. copy the 3 self-hosted variable fonts into assets/fonts/
//   2. write the compiled Tailwind CSS (+ the design's custom.css) into assets/app.css
//   3. bundle the resource's JS (ui-src/<name>.js → main.js) with esbuild (inlines @forge/bridge)
import { mkdirSync, copyFileSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

const FONTS = {
  'fraunces.woff2': 'fraunces-latin-full-normal.woff2', // FULL = opsz + wght (design drives opsz)
  'inter.woff2': 'inter-latin-wght-normal.woff2',
  'jetbrains-mono.woff2': 'jetbrains-mono-latin-wght-normal.woff2',
};
const RESOURCES = ['publisher', 'view'];

function findFont(name) {
  const p = execSync(`find node_modules/.pnpm -name '${name}' | head -1`).toString().trim();
  if (!p) throw new Error(`font not found: ${name}`);
  return p;
}

// 1. Compile Tailwind once, append the design's custom CSS.
console.log('compiling tailwind…');
execSync('npx tailwindcss -c tailwind.config.js -i ui-src/input.css -o ui-src/.app.compiled.css --minify', { stdio: 'inherit' });
const css = readFileSync('ui-src/.app.compiled.css', 'utf8') + '\n' + readFileSync('ui-src/custom.css', 'utf8');

for (const res of RESOURCES) {
  const dir = `static/${res}`;
  if (!existsSync(dir)) { console.log(`skip ${res} (no ${dir})`); continue; }
  mkdirSync(join(dir, 'assets/fonts'), { recursive: true });
  // 2. fonts + css
  for (const [dest, src] of Object.entries(FONTS)) copyFileSync(findFont(src), join(dir, 'assets/fonts', dest));
  writeFileSync(join(dir, 'assets/app.css'), css);
  // 3. JS bundle (if a source exists for this resource)
  const jsSrc = `ui-src/${res}.js`;
  if (existsSync(jsSrc)) {
    execSync(`npx esbuild ${jsSrc} --bundle --outfile=${dir}/main.js --format=iife --minify`, { stdio: 'inherit' });
  }
  console.log(`built ${res}`);
}
console.log('done');
