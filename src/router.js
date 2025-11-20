import { createURLFromFilters } from './url.js';

/**
 * Applies active filter classes to DOM elements based on the provided filters.
 * @param {Object} filters - The filters object (browsers, interop, etc.).
 */
export function applyFiltersToDOM(filters) {
  if (filters.browsers && filters.browsers.length > 0) {
    filters.browsers.forEach(filter => {
      document.querySelectorAll(`.browser-tag[data-filter="${filter}"]`).forEach(tag => {
        tag.classList.add('active-filter');
        tag.setAttribute('aria-pressed', 'true');
      });
    });
  }

  if (filters.interop && filters.interop.length > 0) {
    filters.interop.forEach(year => {
      if (year !== 'any') {
        document.querySelectorAll(`.interop-tag[data-filter="interop:${year}"]`).forEach(tag => {
          tag.classList.add('active-filter');
          tag.setAttribute('aria-pressed', 'true');
        });
      }
    });
  }
}

/**
 * Reads the current active filters from the DOM.
 * @param {string|null} currentStatusFilter - The current status filter state.
 * @param {boolean} showPredictions - Whether predictions are shown.
 * @returns {Object} The filters object.
 */
export function getFiltersFromDOM(currentStatusFilter, showPredictions) {
  const activeBrowserFilters = Array.from(document.querySelectorAll('.browser-tag.active-filter'))
    .map(tag => tag.getAttribute('data-filter'));

  const activeInteropFilters = Array.from(document.querySelectorAll('.interop-tag.active-filter'))
    .map(tag => tag.getAttribute('data-filter'))
    .map(filter => filter.split(':')[1]);

  // Check for "any" interop filter (marked by data-interop-any on cards)
  // This attribute is set when the "any" interop filter is active
  const anyInteropActive = Array.from(document.querySelectorAll('.feature-card'))
    .some(card => card.hasAttribute('data-interop-any'));

  if (anyInteropActive) {
    activeInteropFilters.push('any');
  }

  // Deduplicate filters just in case
  const uniqueBrowserFilters = [...new Set(activeBrowserFilters)];
  const uniqueInteropFilters = [...new Set(activeInteropFilters)];

  return {
    browsers: uniqueBrowserFilters,
    interop: uniqueInteropFilters,
    status: currentStatusFilter,
    showPredictions: showPredictions
  };
}

/**
 * Updates the browser's history with the new URL.
 * @param {URL} url - The new URL.
 */
export function updateHistory(url) {
  window.history.replaceState({}, '', url);
}
