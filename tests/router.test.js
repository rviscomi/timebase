import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { applyFiltersToDOM, getFiltersFromDOM, updateHistory } from '../src/router.js';

describe('Router Module', () => {
  describe('applyFiltersToDOM', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button class="browser-tag" data-filter="chrome">Chrome</button>
        <button class="browser-tag" data-filter="firefox">Firefox</button>
        <button class="interop-tag" data-filter="interop:2023">Interop 2023</button>
        <button class="interop-tag" data-filter="interop:2024">Interop 2024</button>
      `;
    });

    it('should apply browser filters', () => {
      applyFiltersToDOM({ browsers: ['chrome'] });
      const chromeTag = document.querySelector('.browser-tag[data-filter="chrome"]');
      const firefoxTag = document.querySelector('.browser-tag[data-filter="firefox"]');

      expect(chromeTag.classList.contains('active-filter')).toBe(true);
      expect(chromeTag.getAttribute('aria-pressed')).toBe('true');
      expect(firefoxTag.classList.contains('active-filter')).toBe(false);
    });

    it('should apply interop filters', () => {
      applyFiltersToDOM({ interop: ['2023'] });
      const tag2023 = document.querySelector('.interop-tag[data-filter="interop:2023"]');
      const tag2024 = document.querySelector('.interop-tag[data-filter="interop:2024"]');

      expect(tag2023.classList.contains('active-filter')).toBe(true);
      expect(tag2023.getAttribute('aria-pressed')).toBe('true');
      expect(tag2024.classList.contains('active-filter')).toBe(false);
    });

    it('should ignore "any" interop filter', () => {
      applyFiltersToDOM({ interop: ['any'] });
      const tag2023 = document.querySelector('.interop-tag[data-filter="interop:2023"]');
      expect(tag2023.classList.contains('active-filter')).toBe(false);
    });
  });

  describe('getFiltersFromDOM', () => {
    beforeEach(() => {
      document.body.innerHTML = `
        <button class="browser-tag active-filter" data-filter="chrome">Chrome</button>
        <button class="browser-tag" data-filter="firefox">Firefox</button>
        <button class="interop-tag active-filter" data-filter="interop:2023">Interop 2023</button>
        <div class="feature-card" data-interop-any="true"></div>
      `;
    });

    it('should retrieve active filters', () => {
      const filters = getFiltersFromDOM('widely-available', true);

      expect(filters.browsers).toEqual(['chrome']);
      expect(filters.interop).toContain('2023');
      expect(filters.interop).toContain('any');
      expect(filters.status).toBe('widely-available');
      expect(filters.showPredictions).toBe(true);
    });

    it('should handle no active filters', () => {
      document.body.innerHTML = '';
      const filters = getFiltersFromDOM(null, false);

      expect(filters.browsers).toEqual([]);
      expect(filters.interop).toEqual([]);
      expect(filters.status).toBeNull();
      expect(filters.showPredictions).toBe(false);
    });
  });

  describe('updateHistory', () => {
    it('should call history.replaceState', () => {
      // Mock replaceState directly on the instance
      window.history.replaceState = vi.fn();
      const url = new URL('http://localhost/?foo=bar');

      updateHistory(url);

      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', url);
    });
  });
});
