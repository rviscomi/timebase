import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Create images directory if it doesn't exist
const imagesDir = join(__dirname, 'images');
try {
  mkdirSync(imagesDir, { recursive: true });
} catch (err) {
  if (err.code !== 'EEXIST') throw err;
}

// Map of browser logos to copy
const logos = {
  chrome: '@browser-logos/chrome/chrome.svg',
  edge: '@browser-logos/edge/edge.svg',
  firefox: '@browser-logos/firefox/firefox.svg',
  safari: '@browser-logos/safari/safari.svg'
};

// Copy each logo
for (const [browser, path] of Object.entries(logos)) {
  const sourcePath = join(__dirname, 'node_modules', path);
  const destPath = join(imagesDir, `${browser}.svg`);
  
  try {
    const logo = readFileSync(sourcePath);
    writeFileSync(destPath, logo);
    console.log(`Copied ${browser} logo to ${destPath}`);
  } catch (err) {
    console.error(`Error copying ${browser} logo:`, err);
  }
} 
