import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const buildDir = join(process.cwd(), 'build');
const htmlPath = join(buildDir, 'index.html');

let html = readFileSync(htmlPath, 'utf-8');

// Inline CSS
const cssDir = join(buildDir, 'static', 'css');
for (const file of readdirSync(cssDir).filter(f => f.endsWith('.css'))) {
  const css = readFileSync(join(cssDir, file), 'utf-8');
  html = html.replace(
    new RegExp(`<link[^>]*href="[^"]*${file}"[^>]*/?>`, 'g'),
    `<style>${css}</style>`
  );
}

// Inline JS
const jsDir = join(buildDir, 'static', 'js');
for (const file of readdirSync(jsDir).filter(f => f.endsWith('.js'))) {
  const js = readFileSync(join(jsDir, file), 'utf-8');
  html = html.replace(
    new RegExp(`<script[^>]*src="[^"]*${file}"[^>]*></script>`, 'g'),
    `<script>${js}</script>`
  );
}

const outPath = join(buildDir, 'single.html');
writeFileSync(outPath, html, 'utf-8');

const sizeKB = (Buffer.byteLength(html, 'utf-8') / 1024).toFixed(1);
console.log(`\n✅ Single HTML file created: build/single.html (${sizeKB} KB)\n`);
