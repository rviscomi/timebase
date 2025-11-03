import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, 'node_modules', 'web-futures', 'data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

// Extract both browsers and features data
const moduleContent = `// Generated from web-futures package
export const browsers = ${JSON.stringify(data.browsers, null, 2)};
export const features = ${JSON.stringify(Object.fromEntries(Object.entries(data.features).map(([key, feature]) => {
  // Keep by_compat_key for BCD granular view
  delete feature.compat_features;
  delete feature.description;
  delete feature.group;
  delete feature.caniuse;
  delete feature.snapshot;
  return [key, feature];
})), null, 2)};
`;

writeFileSync('data.js', moduleContent);
console.log('Data extracted successfully!'); 
