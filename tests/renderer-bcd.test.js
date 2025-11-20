import { describe, it, expect } from 'vitest';
import { generateTimelineHTML } from '../src/renderer/renderer-bcd.js';

describe('Renderer BCD', () => {
  // Helper to parse HTML string into a DOM element
  function parseHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html.trim();
    return div.firstElementChild;
  }

  const mockBcdKeys = [
    {
      id: 'bcd-1',
      name: 'BCD Key 1',
      date: new Date(2023, 0, 1), // Jan 2023
      displayType: 'newly-available',
      shipDates: [
        { browser: 'chrome', version: '110', date: new Date(2023, 0, 1) }
      ],
      status: { baseline: 'low' },
      parent_feature: 'feature-1',
      parent_feature_name: 'Feature 1'
    },
    {
      id: 'bcd-2',
      name: 'BCD Key 2',
      date: new Date(2023, 1, 1), // Feb 2023
      displayType: 'limited-availability',
      shipDates: [
        { browser: 'firefox', version: '110', date: new Date(2023, 1, 1) }
      ],
      status: { baseline: false },
      parent_feature: 'feature-2'
    }
  ];

  it('should generate timeline content with date groups', () => {
    const html = generateTimelineHTML(mockBcdKeys);
    const element = parseHTML(html);

    expect(element.id).toBe('timeline-content');
    
    const dateGroups = element.querySelectorAll('.date-group');
    expect(dateGroups).toHaveLength(2); // Jan and Feb

    // Feb should be first (descending)
    const firstGroup = dateGroups[0];
    expect(firstGroup.id).toBe('february-2023');
    
    // Jan should be second
    const secondGroup = dateGroups[1];
    expect(secondGroup.id).toBe('january-2023');
  });

  it('should generate BCD key cards with correct details', () => {
    const html = generateTimelineHTML(mockBcdKeys);
    const element = parseHTML(html);

    const cards = element.querySelectorAll('.feature-card');
    expect(cards).toHaveLength(2);

    // BCD 2 (Feb) should be first
    const bcd2Card = cards[0];
    expect(bcd2Card.id).toContain('bcd-bcd-2');
    expect(bcd2Card.classList.contains('limited-availability')).toBe(true);
    expect(bcd2Card.querySelector('.feature-title').textContent).toContain('BCD Key 2');
    expect(bcd2Card.querySelector('.parent-feature-info')).not.toBeNull();

    // BCD 1 (Jan) should be second
    const bcd1Card = cards[1];
    expect(bcd1Card.id).toContain('bcd-bcd-1');
    expect(bcd1Card.classList.contains('newly-available')).toBe(true);
    expect(bcd1Card.querySelector('.feature-title').textContent).toContain('BCD Key 1');
  });
});
