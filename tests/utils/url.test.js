import { describe, it, expect } from 'vitest';
import { getFiltersFromURL, createURLFromFilters } from '../../src/utils/url.js';

describe('URL Management', () => {
  const baseURL = 'http://localhost:8080/';

  describe('getFiltersFromURL', () => {
    it('should extract browser filters', () => {
      const url = new URL(baseURL + '?browser=chrome:110&browser=safari:16.4');
      const filters = getFiltersFromURL(url);
      expect(filters.browsers).toEqual(['chrome:110', 'safari:16.4']);
    });

    it('should extract interop filters', () => {
      const url = new URL(baseURL + '?interop=2023');
      const filters = getFiltersFromURL(url);
      expect(filters.interop).toEqual(['2023']);
    });

    it('should extract status filter', () => {
      const url = new URL(baseURL + '?status=newly-available');
      const filters = getFiltersFromURL(url);
      expect(filters.status).toBe('newly-available');
    });

    it('should extract predictions filter', () => {
      const url = new URL(baseURL + '?predictions=false');
      const filters = getFiltersFromURL(url);
      expect(filters.showPredictions).toBe(false);
    });

    it('should default showPredictions to true', () => {
      const url = new URL(baseURL);
      const filters = getFiltersFromURL(url);
      expect(filters.showPredictions).toBe(true);
    });
  });

  describe('createURLFromFilters', () => {
    it('should create URL with browser filters', () => {
      const currentURL = new URL(baseURL);
      const filters = { browsers: ['chrome:110'] };
      const newURL = createURLFromFilters(currentURL, filters);
      expect(newURL.searchParams.getAll('browser')).toEqual(['chrome:110']);
    });

    it('should deduplicate browser filters', () => {
      const currentURL = new URL(baseURL);
      const filters = { browsers: ['chrome:110', 'chrome:110'] };
      const newURL = createURLFromFilters(currentURL, filters);
      expect(newURL.searchParams.getAll('browser')).toEqual(['chrome:110']);
    });

    it('should handle mixed filters', () => {
      const currentURL = new URL(baseURL);
      const filters = {
        browsers: ['chrome:110'],
        interop: ['2023'],
        status: 'newly-available',
        showPredictions: false
      };
      const newURL = createURLFromFilters(currentURL, filters);
      expect(newURL.searchParams.get('browser')).toBe('chrome:110');
      expect(newURL.searchParams.get('interop')).toBe('2023');
      expect(newURL.searchParams.get('status')).toBe('newly-available');
      expect(newURL.searchParams.get('predictions')).toBe('false');
    });

    it('should clear existing params', () => {
      const currentURL = new URL(baseURL + '?browser=old:1');
      const filters = { browsers: ['new:2'] };
      const newURL = createURLFromFilters(currentURL, filters);
      expect(newURL.searchParams.getAll('browser')).toEqual(['new:2']);
    });
  });
});
