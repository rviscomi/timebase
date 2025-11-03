import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, 'node_modules', 'web-futures', 'data.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

// Helper to parse YYYY-MM-DD as a local date
function parseLocalDate(dateString) {
  if (!dateString) return null;
  if (dateString instanceof Date) return new Date(dateString);
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Calculate date range: current month ±3 months
const now = new Date();
now.setHours(0, 0, 0, 0);
const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
startDate.setHours(0, 0, 0, 0);
const endDate = new Date(now.getFullYear(), now.getMonth() + 4, 0); // Last day of +3 month
endDate.setHours(23, 59, 59, 999);

console.log(`Filtering BCD keys between ${startDate.toISOString().split('T')[0]} and ${endDate.toISOString().split('T')[0]}`);

// Check if a BCD key has any relevant dates in range
function isInDateRange(status, browsers) {
  if (!status?.support) return false;
  
  // For baseline features, check baseline_low_date and baseline_high_date
  if (status.baseline !== false) {
    const baselineLowDate = parseLocalDate(status.baseline_low_date);
    if (baselineLowDate && baselineLowDate >= startDate && baselineLowDate <= endDate) {
      return true;
    }
    
    // Calculate baseline_high_date if not present
    let baselineHighDate = parseLocalDate(status.baseline_high_date);
    if (!baselineHighDate && baselineLowDate) {
      baselineHighDate = new Date(baselineLowDate);
      baselineHighDate.setMonth(baselineLowDate.getMonth() + 30);
    }
    if (baselineHighDate && baselineHighDate >= startDate && baselineHighDate <= endDate) {
      return true;
    }
  } else {
    // For limited availability (baseline: false), check the latest ship date
    const shipDates = [];
    for (const [browser, version] of Object.entries(status.support)) {
      if (typeof version !== 'string' || version === 'preview') continue;
      const cleanVersion = version.replace('≤', '');
      const browserData = browsers[browser];
      if (!browserData?.releases) continue;
      const release = browserData.releases.find(r => r.version === cleanVersion);
      if (!release?.date) continue;
      const releaseDate = parseLocalDate(release.date);
      if (releaseDate) {
        shipDates.push(releaseDate);
      }
    }
    
    if (shipDates.length > 0) {
      // Use the latest ship date for limited availability features
      const latestDate = new Date(Math.max(...shipDates));
      if (latestDate >= startDate && latestDate <= endDate) {
        return true;
      }
    }
  }
  
  return false;
}

// Extract BCD keys from features data
const bcdKeys = {};
let totalKeys = 0;
let filteredKeys = 0;

Object.entries(data.features).forEach(([featureId, feature]) => {
  // Skip non-feature kinds
  if (feature.kind && feature.kind !== 'feature') {
    return;
  }

  // If there's by_compat_key data, extract each BCD key
  if (feature.status?.by_compat_key) {
    Object.entries(feature.status.by_compat_key).forEach(([bcdKey, bcdStatus]) => {
      totalKeys++;
      // Only include if dates are in range
      if (isInDateRange(bcdStatus, data.browsers)) {
        bcdKeys[bcdKey] = {
          parent_feature: featureId,
          parent_feature_name: feature.name,
          status: bcdStatus,
          spec: feature.spec,
          discouraged: feature.discouraged
        };
        filteredKeys++;
      }
    });
  } else {
    // If no by_compat_key data, create a single entry from the feature
    totalKeys++;
    if (isInDateRange(feature.status, data.browsers)) {
      bcdKeys[featureId] = {
        name: feature.name || featureId,
        parent_feature: featureId,
        parent_feature_name: feature.name,
        status: feature.status,
        spec: feature.spec,
        discouraged: feature.discouraged
      };
      filteredKeys++;
    }
  }
});

// Create the module content
const moduleContent = `// Generated from web-futures package - BCD keys
export const browsers = ${JSON.stringify(data.browsers, null, 2)};
export const bcdKeys = ${JSON.stringify(bcdKeys, null, 2)};
`;

writeFileSync('bcd-data.js', moduleContent);
console.log(`Extracted ${filteredKeys} BCD keys (filtered from ${totalKeys} total) within date range!`);
