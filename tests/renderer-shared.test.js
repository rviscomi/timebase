import { describe, it, expect } from 'vitest';
import {
  createDateHeader,
  createBrowserTag,
  createInteropTag
} from '../src/renderer/renderer-shared.js';

describe('Renderer Shared', () => {
  // Helper to parse HTML string into a DOM element
  function parseHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  describe('createDateHeader', () => {
    it('should generate correct HTML for a date', () => {
      const date = new Date(2023, 0, 1); // January 2023
      const html = createDateHeader(date);
      const element = parseHTML(html);

      expect(element.classList.contains('date-header')).toBe(true);
      const link = element.querySelector('a');
      expect(link.getAttribute('href')).toBe('#january-2023');
      expect(link.textContent).toContain('January 2023');
    });
  });

  describe('createBrowserTag', () => {
    it('should generate correct HTML for Chrome', () => {
      const html = createBrowserTag('chrome', '110');
      const element = parseHTML(html);

      expect(element.tagName).toBe('BUTTON');
      expect(element.classList.contains('chrome')).toBe(true);
      expect(element.dataset.browser).toBe('chrome');
      expect(element.dataset.version).toBe('110');

      const img = element.querySelector('img');
      expect(img.getAttribute('src')).toBe('images/chrome.svg');
      expect(element.textContent).toContain('110');
    });

    it('should handle mobile browsers', () => {
      const html = createBrowserTag('chrome_android', '110');
      const element = parseHTML(html);

      expect(element.classList.contains('chrome_android')).toBe(true);
      expect(element.dataset.browser).toBe('chrome_android');

      const img = element.querySelector('img');
      expect(img.getAttribute('src')).toBe('images/chrome.svg'); // Base browser logo
      expect(element.textContent).toContain('110 (Android)');
    });
  });

  describe('createInteropTag', () => {
    it('should generate correct HTML for Interop', () => {
      const html = createInteropTag(2023);
      const element = parseHTML(html);

      expect(element.tagName).toBe('BUTTON');
      expect(element.classList.contains('interop-tag')).toBe(true);
      expect(element.dataset.interopYear).toBe('2023');
      expect(element.textContent).toContain('Interop 2023');
    });
  });


});
