import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ScrollManager } from '../../src/core/ScrollManager.js';

describe('ScrollManager', () => {
  let scrollManager;

  beforeEach(() => {
    // Mock DOM
    document.body.innerHTML = `
      <div id="timeline-content">
        <div class="date-group" id="january-2024"></div>
        <div class="date-group" id="february-2024"></div>
        <div class="feature-card" id="card-1">
          <div class="feature-top-row"></div>
          <div class="feature-details" style="display: none;"></div>
        </div>
      </div>
    `;

    // Mock window methods
    window.scrollTo = vi.fn();

    // Mock Element methods
    Element.prototype.scrollIntoView = vi.fn();
    Element.prototype.getBoundingClientRect = vi.fn(() => ({ top: 100 }));

    // Mock IntersectionObserver
    global.IntersectionObserver = class {
      constructor(callback) {
        this.callback = callback;
      }
      observe = vi.fn();
      disconnect = vi.fn();
      takeRecords = vi.fn();
      unobserve = vi.fn();
    };

    scrollManager = new ScrollManager();
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('should initialize correctly', () => {
    expect(scrollManager).toBeDefined();
    expect(scrollManager.scrollFAB).toBeNull();
    expect(scrollManager.scrollObserver).toBeNull();
  });

  it('should create FAB when updateScrollTarget is called', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-01'));

    scrollManager.updateScrollTarget();

    const fab = document.querySelector('.scroll-to-current-month-fab');
    expect(fab).not.toBeNull();
    expect(scrollManager.scrollFAB).toBe(fab);
    expect(scrollManager.scrollObserver).toBeDefined();
  });

  it('should scroll to current month when FAB is clicked', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-01'));

    scrollManager.updateScrollTarget();
    const fab = document.querySelector('.scroll-to-current-month-fab');

    fab.click();

    const jan24 = document.getElementById('january-2024');
    expect(jan24.scrollIntoView).toHaveBeenCalled();
  });

  it('should scroll to and expand card', async () => {
    vi.useFakeTimers();
    const card = document.getElementById('card-1');
    scrollManager.scrollToAndExpandCard(card);

    // Fast-forward past the initial timeout
    vi.advanceTimersByTime(150);

    expect(card.classList.contains('expanded')).toBe(true);
    expect(window.scrollTo).toHaveBeenCalled();

    // Fast-forward past the fade-in timeout
    vi.advanceTimersByTime(150);
    const details = card.querySelector('.feature-details');
    expect(details.style.opacity).toBe('1');
  });
});
