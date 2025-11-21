import { getFiltersFromURL, createURLFromFilters } from './url.js';

export class FilterManager {
  constructor(initialURL = window.location) {
    this.url = new URL(initialURL);
    this.subscribers = [];
    this.filters = getFiltersFromURL(this.url);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(sub => sub !== callback);
    };
  }

  notify() {
    this.subscribers.forEach(callback => callback(this.filters));
  }

  getFilters() {
    return { ...this.filters };
  }

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

  reset(resetBrowserFilters = true) {
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
