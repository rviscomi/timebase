import { describe, it, expect } from 'vitest';
import {
  generateTimelineHTML,
  createDateHeader,
  createBrowserTag,
  createInteropTag,
  processBrowserSupport
} from '../../src/renderer/renderer.js';

describe('Renderer', () => {
  // Helper to parse HTML string into a DOM element
  function parseHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  const mockFeatures = [
    {
      id: 'feature-1',
      name: 'Feature 1',
      date: new Date(2023, 0, 1), // Jan 2023
      displayType: 'newly-available',
      shipDates: [
        { browser: 'chrome', version: '110', date: new Date(2023, 0, 1) }
      ],
      status: { baseline: 'low' }
    },
    {
      id: 'feature-2',
      name: 'Feature 2',
      date: new Date(2023, 0, 15), // Jan 2023
      displayType: 'widely-available',
      shipDates: [
        { browser: 'firefox', version: '110', date: new Date(2023, 0, 15) }
      ],
      status: { baseline: 'high' }
    },
    {
      id: 'feature-3',
      name: 'Feature 3',
      date: new Date(2023, 1, 1), // Feb 2023
      displayType: 'limited-availability',
      shipDates: [
        { browser: 'chrome', version: '110', date: new Date(2023, 1, 1) }
      ],
      status: { baseline: false }
    }
  ];

  it('should generate timeline content with date groups', () => {
    const html = generateTimelineHTML(mockFeatures);
    const element = parseHTML(html);

    expect(element.id).toBe('timeline-content');

    const dateGroups = element.querySelectorAll('.date-group');
    expect(dateGroups).toHaveLength(2); // Jan and Feb

    const firstGroup = dateGroups[0];
    expect(firstGroup.id).toBe('february-2023');
    expect(firstGroup.querySelector('.date-header').textContent).toContain('February 2023');

    const secondGroup = dateGroups[1];
    expect(secondGroup.id).toBe('january-2023');
    expect(secondGroup.querySelector('.date-header').textContent).toContain('January 2023');
  });

  it('should generate feature cards with correct details', () => {
    const html = generateTimelineHTML(mockFeatures);
    const element = parseHTML(html);

    const cards = element.querySelectorAll('.feature-card');
    expect(cards).toHaveLength(3);

    // Feature 3 (Feb) should be first
    const feature3Card = cards[0];
    expect(feature3Card.id).toContain('feature-feature-3');
    expect(feature3Card.classList.contains('limited-availability')).toBe(true);
    expect(feature3Card.querySelector('.feature-title').textContent).toContain('Feature 3');

    // Feature 2 (Jan, later date) should be second
    const feature2Card = cards[1];
    expect(feature2Card.id).toContain('feature-feature-2');
    expect(feature2Card.classList.contains('widely-available')).toBe(true);
    expect(feature2Card.querySelector('.feature-title').textContent).toContain('Feature 2');

    // Feature 1 (Jan, earlier date) should be third
    const feature1Card = cards[2];
    expect(feature1Card.id).toContain('feature-feature-1');
    expect(feature1Card.classList.contains('newly-available')).toBe(true);
    expect(feature1Card.querySelector('.feature-title').textContent).toContain('Feature 1');
  });

  it('should handle features with predictions', () => {
    const predictionFeature = [{
      id: 'pred-1',
      name: 'Predicted Feature',
      date: new Date(2024, 0, 1),
      displayType: 'newly-available',
      prediction: true,
      shipDates: []
    }];

    const html = generateTimelineHTML(predictionFeature);
    const element = parseHTML(html);
    const card = element.querySelector('.feature-card');

    expect(card.classList.contains('prediction')).toBe(true);
    const titleText = card.querySelector('.feature-title').textContent.replace(/\s+/g, ' ').trim();
    expect(titleText).toContain('🔮 Predicted: Predicted Feature');
  });

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
      expect(element.getAttribute('aria-label')).toBe('Filter timeline by Chrome version 110');

      const img = element.querySelector('img');
      expect(img.getAttribute('src')).toBe('images/chrome.svg');
      expect(img.getAttribute('alt')).toBe('');
      expect(element.textContent).toContain('110');
    });

    it('should handle mobile browsers', () => {
      const html = createBrowserTag('chrome_android', '110');
      const element = parseHTML(html);

      expect(element.classList.contains('chrome_android')).toBe(true);
      expect(element.dataset.browser).toBe('chrome_android');
      expect(element.getAttribute('aria-label')).toBe('Filter timeline by Chrome version 110 (Android)');

      const img = element.querySelector('img');
      expect(img.getAttribute('src')).toBe('images/chrome.svg'); // Base browser logo
      expect(img.getAttribute('alt')).toBe('');
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


  describe('processBrowserSupport', () => {
    it('should NOT collapse mobile browser to base browser if versions differ', async () => {
      const item = {
        date: new Date(2023, 0, 1),
        displayType: 'widely-available',
        shipDates: [
          { browser: 'firefox', version: '72', date: new Date(2020, 0, 7) },
          { browser: 'firefox_android', version: '79', date: new Date(2020, 6, 28) }
        ]
      };

      const result = processBrowserSupport(item);

      const firefoxEntry = result.find(r => r.version === '79');
      expect(firefoxEntry).toBeDefined();
      expect(firefoxEntry.browser).toBe('firefox'); // Should be collapsed to 'firefox'
      expect(firefoxEntry.baseBrowser).toBe('firefox');
    });
  });
});
