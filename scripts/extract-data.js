import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../node_modules', 'web-features', 'packages', 'web-features', 'data.json');
const OUTPUT_FILE = join(__dirname, '..', 'data', 'web-features.js');
export function extractData() {
  const data = JSON.parse(readFileSync(dataPath, 'utf8'));

  // Extract both browsers and features data
  const moduleContent = `// Generated from web-futures package
export const browsers = ${JSON.stringify(data.browsers, null, 2)};
export const features = ${JSON.stringify(Object.fromEntries(Object.entries(data.features).map(([key, feature]) => {
  // Remove unused fields
  delete feature.compat_features;
  delete feature.description;
  delete feature.group;
  delete feature.caniuse;
  delete feature.snapshot;
  delete feature.status?.by_compat_key;
  return [key, feature];
})), null, 2)};
`;

  writeFileSync(OUTPUT_FILE, moduleContent);
  console.log('Data extracted successfully!');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  extractData();
}
 
