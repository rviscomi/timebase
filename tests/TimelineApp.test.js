import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimelineApp } from '../src/TimelineApp.js';

// Mock dependencies
vi.mock('/data/data.js', () => ({
  browsers: {
    chrome: {
      releases: [
        { version: '100', date: '2024-01-01' }
      ]
    },
    firefox: {
      releases: [
        { version: '100', date: '2024-01-01' }
      ]
    },
    safari: {
      releases: [
        { version: '100', date: '2024-01-01' }
      ]
    }
  },
  features: {
    'feature-1': {
      name: 'Feature 1',
      kind: 'feature',
      status: {
        support: {
          chrome: '100',
          firefox: '100',
          safari: '100'
        },
        baseline: 'high',
        baseline_low_date: '2024-01-01',
        baseline_high_date: '2024-01-01'
      }
    }
  }
}));

vi.mock('/data/developer-signals.json', () => ({
  default: {}
}));

vi.mock('/data/interop.json', () => ({
  default: {}
}));

vi.mock('/data/mdn.json', () => ({
  default: {}
}));

// Mock router.js to avoid history API issues
vi.mock('../src/router.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    updateHistory: vi.fn()
  };
});

describe('TimelineApp', () => {
  let app;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="timeline-content">
        <div class="date-group" id="january-2024">
          <div class="feature-card" id="feature-feature-1-widely-available" data-browser-chrome-100 data-browser-firefox-100 data-browser-safari-100>
            <div class="feature-top-row" aria-controls="details-1"></div>
            <div class="feature-details" id="details-1" style="display: none;"></div>
            <button class="add-to-calendar-btn"></button>
          </div>
        </div>
        <div class="browser-tag" data-filter="chrome:100">Chrome 100</div>
        <div class="interop-tag" data-filter="2024">Interop 2024</div>
        <button id="download-ical-top" class="download-btn"></button>
      </div>
    `;

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/'),
      writable: true
    });

    // Mock window.scrollTo
    window.scrollTo = vi.fn();

    // Mock HTMLElement.prototype.scrollIntoView
    HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('should initialize correctly', () => {
    app = new TimelineApp();
    app.loadData();
    app.init();
    expect(app).toBeDefined();
    // processFeatures creates 2 entries for baseline high: newly-available and widely-available
    expect(app.features).toHaveLength(2);
  });

  it('should filter features by browser', () => {
    app = new TimelineApp();
    app.loadData();
    app.init();

    // Simulate clicking a browser tag
    const browserTag = document.querySelector('.browser-tag');
    browserTag.click();

    // Check if URL was updated (we mocked updateHistory but we can check app.url)
    expect(app.url.searchParams.get('browser')).toBe('chrome:100');

    // Check if feature is still visible (it matches)
    const card = document.getElementById('feature-feature-1-widely-available');
    expect(card.style.display).not.toBe('none');
  });

  it('should toggle feature selection', () => {
    app = new TimelineApp();
    app.loadData();
    app.init();
    const feature = app.features[0];

    app.toggleFeatureSelection(feature);
    expect(app.isFeatureSelected(feature)).toBe(true);

    app.toggleFeatureSelection(feature);
    expect(app.isFeatureSelected(feature)).toBe(false);
  });
});
