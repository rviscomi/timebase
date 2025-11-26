import { parseLocalDate, getToday } from '../utils/utils.js';

/**
 * Helper to process ship dates from browser support data.
 * @param {Object} support - Support data object.
 * @param {Object} browsers - Browsers data object.
 * @returns {Array} Sorted array of ship dates.
 */
function getShipDates(support, browsers) {
  const now = getToday();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  const shipDates = Object.entries(support || {}).map(([browser, version]) => {
    if (typeof version !== 'string') return null;

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
    if (!browserData?.releases) return null;

    const release = browserData.releases.find(r => r.version === cleanVersion);
    if (!release) return null;

    if (!release.date || release.date === 'null') {
      return {
        date: lastDay,
        browser,
        version: cleanVersion,
        isPreview: true
      };
    }

    return {
      date: release.date ? parseLocalDate(release.date) : null,
      browser,
      version: cleanVersion,
      isPreview: false
    };
  }).filter(item => item !== null);

  shipDates.sort((a, b) => a.date - b.date);
  return shipDates;
}

/**
 * Helper to create timeline entries for a feature.
 * @param {Object} baseItem - Base feature/key object.
 * @param {Array} shipDates - Processed ship dates.
 * @returns {Array} Array of timeline entries.
 */
function createTimelineEntries(baseItem, shipDates) {
  const entries = [];
  const now = getToday();

  baseItem.status.baseline_low_date = parseLocalDate(baseItem.status.baseline_low_date);

  if (baseItem.status.baseline === false) {
    if (shipDates.length > 0) {
      entries.push({
        ...baseItem,
        date: shipDates.at(-1).date,
        prediction: shipDates.at(-1).date > now,
        displayType: 'limited-availability',
        displayName: 'Limited availability'
      });
    }
    return entries;
  }

  if (baseItem.status.baseline === 'high') {
    baseItem.status.baseline_high_date = parseLocalDate(baseItem.status.baseline_high_date);
  } else {
    baseItem.status.baseline_high_date = parseLocalDate(baseItem.status.baseline_low_date);
    // Default to 30 months for baseline high if not present (low baseline)
    if (baseItem.status.baseline_high_date) {
      baseItem.status.baseline_high_date.setMonth(baseItem.status.baseline_low_date.getMonth() + 30);
    }
  }

  if (baseItem.status.baseline_low_date) {
    entries.push({
      ...baseItem,
      date: baseItem.status.baseline_low_date,
      prediction: baseItem.status.baseline_low_date > now,
      displayType: 'newly-available',
      displayName: 'Newly available'
    });
  }

  if (baseItem.status.baseline_high_date) {
    entries.push({
      ...baseItem,
      date: baseItem.status.baseline_high_date,
      prediction: baseItem.status.baseline === 'low',
      displayType: 'widely-available',
      displayName: 'Widely available'
    });
  }

  return entries;
}

/**
 * Processes raw feature data into a flat array of features with calculated dates and display types.
 * @param {Object} features - Raw features object.
 * @param {Object} browsers - Browsers data object.
 * @param {Object} metadata - Optional metadata (developerSignals, interop, mdn).
 * @returns {Array} Processed features array.
 */
export function processFeatures(features, browsers, metadata = {}) {
  const processedFeatures = [];

  Object.entries(features).forEach(([id, data]) => {
    if (data.kind && data.kind !== 'feature') return;

    const shipDates = getShipDates(data.status?.support, browsers);
    if (!shipDates.length) return;

    const baseFeature = {
      id,
      name: data.name || id,
      description: data.description,
      description_html: data.description_html || data.description,
      discouraged: data.discouraged,
      spec: data.spec,
      status: { ...data.status }, // Clone status to avoid mutation issues if reused
      shipDates: shipDates,
      developerSignal: metadata.developerSignals?.[id],
      interop: metadata.interop?.[id],
      mdn: metadata.mdn?.[id]
    };

    processedFeatures.push(...createTimelineEntries(baseFeature, shipDates));
  });

  return processedFeatures
    .filter(feature => feature && feature.date && !isNaN(feature.date))
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

  Object.entries(bcdKeys).forEach(([id, data]) => {
    const shipDates = getShipDates(data.status?.support, browsers);
    if (!shipDates.length) return;

    const baseBcdKey = {
      id,
      name: data.name || id,
      parent_feature: data.parent_feature,
      parent_feature_name: data.parent_feature_name,
      description: data.description,
      description_html: data.description_html || data.description,
      discouraged: data.discouraged,
      spec: data.spec,
      status: { ...data.status },
      shipDates: shipDates,
      developerSignal: metadata.developerSignals?.[data.parent_feature],
      interop: metadata.interop?.[data.parent_feature],
      mdn: metadata.mdn?.[data.parent_feature]
    };

    processedKeys.push(...createTimelineEntries(baseBcdKey, shipDates));
  });

  // BCD-specific date range filter
  const currentDate = getToday();
  const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 3, 1);
  const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 4, 0);
  endDate.setHours(23, 59, 59, 999);

  return processedKeys
    .filter(key => {
      if (!key || !key.date || isNaN(key.date)) return false;
      return key.date >= startDate && key.date <= endDate;
    })
    .sort((a, b) => b.date - a.date);
}
