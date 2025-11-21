/**
 * Determines if a feature should be displayed based on active filters.
 * @param {Object} feature - The feature data object.
 * @param {Object} filters - The active filters.
 * @param {string[]} [filters.browsers] - Array of "browser:version" strings.
 * @param {string[]} [filters.interop] - Array of interop years or "any".
 * @param {string} [filters.status] - Status filter ("limited-availability", "discouraged", "predictions").
 * @param {boolean} [filters.showPredictions] - Whether to show predictions (default true).
 * @returns {boolean} True if the feature should be displayed.
 */
export function shouldDisplayFeature(feature, filters) {
  const {
    browsers = [],
    interop = [],
    status = null,
    showPredictions = true
  } = filters;

  // 1. Check browser filters
  if (browsers.length > 0) {
    const matchesAllBrowsers = browsers.every(filter => {
      const [browser, version] = filter.split(':');
      return feature.shipDates.some(shipDate => {
        if (shipDate.version !== version) return false;

        // Exact match
        if (shipDate.browser === browser) return true;

        // Loose match: if filter is base browser (e.g. firefox), match mobile variant (e.g. firefox_android)
        if (browser === 'firefox' && shipDate.browser === 'firefox_android') return true;
        if (browser === 'chrome' && shipDate.browser === 'chrome_android') return true;
        if (browser === 'safari' && shipDate.browser === 'safari_ios') return true;

        return false;
      });
    });
    if (!matchesAllBrowsers) return false;
  }

  // 2. Check interop filters
  if (interop.length > 0) {
    if (interop.includes('any')) {
      // Check if feature has any interop data
      if (!feature.interop || feature.interop.length === 0) {
        return false;
      }
    } else {
      // Check for specific years
      const matchesAnyInterop = interop.some(year => 
        feature.interop && feature.interop.some(i => i.year.toString() === year.toString())
      );
      if (!matchesAnyInterop) return false;
    }
  }

  // 3. Check predictions visibility
  if (!showPredictions && feature.prediction) {
    return false;
  }

  // 4. Check status filter
  if (status) {
    if (status === 'limited-availability') {
      if (feature.displayType !== 'limited-availability') return false;
    } else if (status === 'discouraged') {
      if (!feature.discouraged) return false;
    } else if (status === 'predictions') {
      if (!feature.prediction) return false;
    } else {
      // Generic status check (e.g. "widely-available", "newly-available")
      if (feature.displayType !== status) return false;
    }
  }

  return true;
}
