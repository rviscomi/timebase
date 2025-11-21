/**
 * Parses the current URL to extract active filters.
 * @param {URL} url - The current URL object.
 * @returns {Object} An object containing the active filters.
 */
export function getFiltersFromURL(url) {
  const searchParams = url.searchParams;
  
  return {
    browsers: searchParams.getAll('browser'),
    interop: searchParams.getAll('interop'),
    status: searchParams.get('status'),
    showPredictions: searchParams.get('predictions') !== 'false'
  };
}

/**
 * Generates a new URL based on the provided filters.
 * @param {URL} currentURL - The current URL object.
 * @param {Object} filters - The filters to apply.
 * @param {string[]} [filters.browsers] - Array of "browser:version" strings.
 * @param {string[]} [filters.interop] - Array of interop years or "any".
 * @param {string} [filters.status] - Status filter.
 * @param {boolean} [filters.showPredictions] - Whether to show predictions.
 * @returns {URL} A new URL object with the updated parameters.
 */
export function createURLFromFilters(currentURL, filters) {
  const newURL = new URL(currentURL);
  const searchParams = newURL.searchParams;

  // Clear existing params
  searchParams.delete('browser');
  searchParams.delete('interop');
  searchParams.delete('status');
  searchParams.delete('predictions');

  // Add browser filters
  if (filters.browsers && filters.browsers.length > 0) {
    // Deduplicate
    [...new Set(filters.browsers)].forEach(browser => {
      searchParams.append('browser', browser);
    });
  }

  // Add interop filters
  if (filters.interop && filters.interop.length > 0) {
    // Deduplicate
    [...new Set(filters.interop)].forEach(year => {
      searchParams.append('interop', year);
    });
  }

  // Add status filter
  if (filters.status) {
    searchParams.set('status', filters.status);
  }

  // Add predictions filter if explicitly false (default is true)
  if (filters.showPredictions === false) {
    searchParams.set('predictions', 'false');
  }

  return newURL;
}
