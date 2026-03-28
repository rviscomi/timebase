import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, '../node_modules', 'web-features', 'packages', 'web-features', 'data.json');
const OUTPUT_FILE = join(__dirname, '..', 'data', 'bcd.js');
export function extractBCDData() {
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
        if (typeof version !== 'string') continue;
        const cleanVersion = version.replace('≤', '');
        const browserData = browsers[browser];
        if (!browserData?.releases) continue;
        const release = browserData.releases.find(r => r.version === cleanVersion);
        if (!release?.date) continue;
        if (release.date === 'null') {
          // Null release dates will be handled as EOM, so they will always be in range.
          return true;
        }
        const releaseDate = parseLocalDate(release.date);
        if (releaseDate) {
          shipDates.push(releaseDate);
        } else {
          throw new Error(`Invalid release date for ${browser} ${version}: ${release.date}`);
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

    // Skip if there's no by_compat_key data
    if (!feature.status?.by_compat_key) {
      return;
    }

    // Extract each BCD key
    Object.entries(feature.status.by_compat_key).forEach(([bcdKey, bcdStatus]) => {
      totalKeys++;
      // Only include if dates are in range
      if (isInDateRange(bcdStatus, data.browsers)) {
        bcdKeys[bcdKey] = {
          parent_feature: featureId,
          parent_feature_name: feature.name,
          parent_feature_baseline: feature.status?.baseline,
          status: bcdStatus,
          spec: feature.spec,
          discouraged: feature.discouraged
        };
        filteredKeys++;
      }
    });
  });

  // Create the module content
  const moduleContent = `// Generated from web-features package - BCD keys
export const browsers = ${JSON.stringify(data.browsers, null, 2)};
export const bcdKeys = ${JSON.stringify(bcdKeys, null, 2)};
`;

  writeFileSync(OUTPUT_FILE, moduleContent);
  console.log(`Extracted ${filteredKeys} BCD keys (filtered from ${totalKeys} total) within date range!`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  extractBCDData();
}

