import { getFiltersFromURL, createURLFromFilters } from './url.js';

export class StateManager {
  constructor(initialURL = window.location) {
    this.url = new URL(initialURL);
    this.subscribers = [];
    this.filters = getFiltersFromURL(this.url);
    this.selectedFeatures = new Set();
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(callback => callback(this.getState()));
  }

  getState() {
    return {
      filters: { ...this.filters },
      selectedFeatures: new Set(this.selectedFeatures)
    };
  }

  // Filter Methods
  setFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    this.updateURL();
    this.notify();
  }

  toggleBrowserFilter(browserKey) {
    const browsers = new Set(this.filters.browsers);
    if (browsers.has(browserKey)) {
      browsers.delete(browserKey);
    } else {
      browsers.add(browserKey);
    }
    this.setFilters({ browsers: Array.from(browsers) });
  }

  toggleInteropFilter(interopKey) {
    let interop = new Set(this.filters.interop);

    if (interopKey === 'any') {
      if (interop.has('any')) {
        interop.delete('any');
      } else {
        interop = new Set(['any']); // 'any' overrides other interop filters
      }
    } else {
      if (interop.has('any')) {
        interop.delete('any');
      }
      if (interop.has(interopKey)) {
        interop.delete(interopKey);
      } else {
        interop.add(interopKey);
      }
    }
    this.setFilters({ interop: Array.from(interop) });
  }

  toggleStatusFilter(status) {
    this.setFilters({
      status: this.filters.status === status ? null : status
    });
  }

  togglePredictions() {
    this.setFilters({
      showPredictions: !this.filters.showPredictions
    });
  }

  resetFilters(resetBrowserFilters = true) {
    const newFilters = {
      interop: [],
      status: null,
      showPredictions: true
    };
    if (resetBrowserFilters) {
      newFilters.browsers = [];
    } else {
      newFilters.browsers = this.filters.browsers;
    }
    this.setFilters(newFilters);
  }

  // Selection Methods
  toggleFeatureSelection(featureId) {
    if (this.selectedFeatures.has(featureId)) {
      this.selectedFeatures.delete(featureId);
    } else {
      this.selectedFeatures.add(featureId);
    }
    this.notify();
  }

  isFeatureSelected(featureId) {
    return this.selectedFeatures.has(featureId);
  }

  getSelectedFeatures() {
    return new Set(this.selectedFeatures);
  }

  clearSelection() {
    this.selectedFeatures.clear();
    this.notify();
  }

  // URL Management
  updateURL() {
    this.url = createURLFromFilters(this.url, this.filters);
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', this.url);
    }
  }

  initializeFromURL() {
    this.filters = getFiltersFromURL(this.url);
    this.notify();
  }
}
