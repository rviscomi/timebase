import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, 'node_modules', 'web-futures', 'data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

// Extract BCD keys from features data
const bcdKeys = {};

Object.entries(data.features).forEach(([featureId, feature]) => {
  // Skip non-feature kinds
  if (feature.kind && feature.kind !== 'feature') {
    return;
  }

  // If there's by_compat_key data, extract each BCD key
  if (feature.status?.by_compat_key) {
    Object.entries(feature.status.by_compat_key).forEach(([bcdKey, bcdStatus]) => {
      bcdKeys[bcdKey] = {
        parent_feature: featureId,
        parent_feature_name: feature.name,
        status: bcdStatus,
        spec: feature.spec,
        discouraged: feature.discouraged
      };
    });
  } else {
    // If no by_compat_key data, create a single entry from the feature
    bcdKeys[featureId] = {
      name: feature.name || featureId,
      parent_feature: featureId,
      parent_feature_name: feature.name,
      status: feature.status,
      spec: feature.spec,
      discouraged: feature.discouraged
    };
  }
});

// Create the module content
const moduleContent = `// Generated from web-futures package - BCD keys
export const browsers = ${JSON.stringify(data.browsers, null, 2)};
export const bcdKeys = ${JSON.stringify(bcdKeys, null, 2)};
`;

writeFileSync('bcd-data.js', moduleContent);
console.log(`Extracted ${Object.keys(bcdKeys).length} BCD keys successfully!`);
