import { parseLocalDate } from './utils.js';

/**
 * Processes raw feature data into a flat array of features with calculated dates and display types.
 * @param {Object} features - Raw features object.
 * @param {Object} browsers - Browsers data object.
 * @param {Object} metadata - Optional metadata (developerSignals, interop, mdn).
 * @returns {Array} Processed features array.
 */
export function processFeatures(features, browsers, metadata = {}) {
  const processedFeatures = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  Object.entries(features).forEach(([id, data]) => {
    // Skip non-feature kinds (moved or split)
    if (data.kind && data.kind !== 'feature') {
      return;
    }

    // Get all ship dates from browsers
    const shipDates = Object.entries(data.status?.support || {}).map(([browser, version]) => {
      // Skip if version is not a string (some might be objects with more complex support info)
      if (typeof version !== 'string') {
        return null;
      }
      // Handle preview versions specially
      if (version === 'preview') {
        // For preview versions, we create an entry with null date
        return {
          date: lastDay,
          browser,
          version: 'preview',
          isPreview: true
        };
      }
      // Clean up the version number
      const cleanVersion = version.replace('≤', '');
      // Find the release date from browsers data
      const browserData = browsers[browser];
      if (!browserData?.releases) {
        return null;
      }
      // Find the matching release
      const release = browserData.releases.find(r => r.version === cleanVersion);
      if (!release) {
        return null;
      }
      return {
        date: release.date ? parseLocalDate(release.date) : null,
        browser,
        version: cleanVersion,
        isPreview: false
      };
    }).filter(item => item !== null);

    if (!shipDates.length) return;
    shipDates.sort((a, b) => {
      return a.date - b.date;
    });

    // Create the base feature object
    const baseFeature = {
      id,
      name: data.name || id,
      description: data.description,
      description_html: data.description_html || data.description,
      discouraged: data.discouraged,
      spec: data.spec,
      status: data.status,
      shipDates: shipDates,
      developerSignal: metadata.developerSignals?.[id],
      interop: metadata.interop?.[id],
      mdn: metadata.mdn?.[id]
    };

    baseFeature.status.baseline_low_date = parseLocalDate(data.status.baseline_low_date);

    if (data.status.baseline === false) {
      processedFeatures.push({
        ...baseFeature,
        date: shipDates.at(-1).date,
        prediction: shipDates.at(-1).date > now,
        displayType: 'limited-availability',
        displayName: 'Limited availability'
      });
      return;
    }

    if (data.status.baseline === 'high') {
      baseFeature.status.baseline_high_date = parseLocalDate(data.status.baseline_high_date);
    } else {
      baseFeature.status.baseline_high_date = parseLocalDate(data.status.baseline_low_date);
      baseFeature.status.baseline_high_date.setMonth(baseFeature.status.baseline_low_date.getMonth() + 30);
    }
    
    processedFeatures.push({
      ...baseFeature,
      date: baseFeature.status.baseline_low_date,
      prediction: baseFeature.status.baseline_low_date > now,
      displayType: 'newly-available',
      displayName: 'Newly available'
    });

    processedFeatures.push({
      ...baseFeature,
      date: baseFeature.status.baseline_high_date,
      prediction: data.status.baseline === 'low',
      displayType: 'widely-available',
      displayName: 'Widely available'
    });
  });

  return processedFeatures
    .filter(feature => {
      if (!feature) {
        return false;
      }
      if (!feature.date) {
        return false;
      }
      if (isNaN(feature.date)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.date - a.date);
}

/**
 * Processes raw BCD keys into a flat array of features.
 * @param {Object} bcdKeys - Raw BCD keys object.
 * @param {Object} browsers - Browsers data object.
 * @param {Object} metadata - Optional metadata.
 * @returns {Array} Processed BCD features array.
 */
export function processBcdKeys(bcdKeys, browsers, metadata = {}) {
  const processedKeys = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  Object.entries(bcdKeys).forEach(([id, data]) => {
    const shipDates = Object.entries(data.status?.support || {}).map(([browser, version]) => {
      if (typeof version !== 'string') {
        return null;
      }
      if (version === 'preview') {
        return {
          date: lastDay,
          browser,
          version: 'preview',
          isPreview: true
        };
      }
      const cleanVersion = version.replace('≤', '');
      const browserData = browsers[browser];
      if (!browserData?.releases) {
        return null;
      }
      const release = browserData.releases.find(r => r.version === cleanVersion);
      if (!release) {
        return null;
      }
      return {
        date: release.date ? parseLocalDate(release.date) : null,
        browser,
        version: cleanVersion,
        isPreview: false
      };
    }).filter(item => item !== null);

    if (!shipDates.length) return;
    shipDates.sort((a, b) => a.date - b.date);

    const baseBcdKey = {
      id,
      name: data.name || id,
      parent_feature: data.parent_feature,
      parent_feature_name: data.parent_feature_name,
      description: data.description,
      description_html: data.description_html || data.description,
      discouraged: data.discouraged,
      spec: data.spec,
      status: data.status,
      shipDates: shipDates,
      developerSignal: metadata.developerSignals?.[data.parent_feature],
      interop: metadata.interop?.[data.parent_feature],
      mdn: metadata.mdn?.[data.parent_feature]
    };

    baseBcdKey.status.baseline_low_date = parseLocalDate(data.status.baseline_low_date);

    if (data.status.baseline === false) {
      processedKeys.push({
        ...baseBcdKey,
        date: shipDates.at(-1).date,
        prediction: shipDates.at(-1).date > now,
        displayType: 'limited-availability',
        displayName: 'Limited availability'
      });
      return;
    }

    if (data.status.baseline === 'high') {
      baseBcdKey.status.baseline_high_date = parseLocalDate(data.status.baseline_high_date);
    } else {
      baseBcdKey.status.baseline_high_date = parseLocalDate(data.status.baseline_low_date);
      baseBcdKey.status.baseline_high_date.setMonth(baseBcdKey.status.baseline_low_date.getMonth() + 30);
    }

    processedKeys.push({
      ...baseBcdKey,
      date: baseBcdKey.status.baseline_low_date,
      prediction: baseBcdKey.status.baseline_low_date > now,
      displayType: 'newly-available',
      displayName: 'Newly available'
    });

    processedKeys.push({
      ...baseBcdKey,
      date: baseBcdKey.status.baseline_high_date,
      prediction: data.status.baseline === 'low',
      displayType: 'widely-available',
      displayName: 'Widely available'
    });
  });

  // Filter to only include entries within the date range
  // Note: The original build-bcd.js had a specific date range filter (3 months ago to 4 months future)
  // We should probably preserve that if it's important, or make it configurable.
  // For now, I'll include it as an optional filter or just keep it here if it's specific to BCD.
  // The original code in build-bcd.js had this filter:
  const currentDate = new Date();
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 0);
  endDate.setHours(23, 59, 59, 999);

  return processedKeys
    .filter(key => {
      if (!key || !key.date || isNaN(key.date)) {
        return false;
      }
      // Only include entries with dates in the target range
      return key.date >= startDate && key.date <= endDate;
    })
    .sort((a, b) => b.date - a.date);
}
