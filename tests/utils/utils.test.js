import { describe, it, expect } from 'vitest';
import { parseLocalDate, groupItemsByDate, escapeHtml, getToday } from '../../src/utils/utils.js';

describe('Utils', () => {
  describe('parseLocalDate', () => {
    it('should parse YYYY-MM-DD string correctly', () => {
      const date = parseLocalDate('2023-01-15');
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(0); // January is 0
      expect(date.getDate()).toBe(15);
    });

    it('should return undefined for empty input', () => {
      expect(parseLocalDate('')).toBeUndefined();
    });

    it('should return Date object as is', () => {
      const now = new Date();
      expect(parseLocalDate(now)).toEqual(now);
    });
  });

  describe('escapeHtml', () => {
    it('should escape special characters', () => {
      const input = '<div class="test">User\'s & "Input"</div>';
      const expected = '&lt;div class=&quot;test&quot;&gt;User&#039;s &amp; &quot;Input&quot;&lt;/div&gt;';
      expect(escapeHtml(input)).toBe(expected);
    });

    it('should return empty string for null/undefined', () => {
      expect(escapeHtml(null)).toBe('');
      expect(escapeHtml(undefined)).toBe('');
    });

    it('should return original string if no special characters', () => {
      expect(escapeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('groupItemsByDate', () => {
    it('should group items by month and sort descending', () => {
      const items = [
        { date: new Date(2023, 0, 15), id: 1 }, // Jan
        { date: new Date(2023, 1, 10), id: 2 }, // Feb
        { date: new Date(2023, 0, 20), id: 3 }, // Jan
      ];
      const groups = groupItemsByDate(items);

      expect(groups).toHaveLength(2);
      // Feb should be first (descending)
      expect(groups[0].date.getMonth()).toBe(1);
      expect(groups[0].items).toHaveLength(1);

      // Jan should be second
      expect(groups[1].date.getMonth()).toBe(0);
      expect(groups[1].items).toHaveLength(2);
    });

    it('should ignore items without valid dates', () => {
      const items = [
        { date: null, id: 1 },
        { date: 'invalid', id: 2 },
        { date: new Date(2023, 0, 1), id: 3 }
      ];
      const groups = groupItemsByDate(items);
      expect(groups).toHaveLength(1);
      expect(groups[0].items).toHaveLength(1);
    });
  });

  describe('getToday', () => {
    it('should return a date with time set to midnight', () => {
      const today = getToday();
      expect(today).toBeInstanceOf(Date);
      expect(today.getHours()).toBe(0);
      expect(today.getMinutes()).toBe(0);
      expect(today.getSeconds()).toBe(0);
      expect(today.getMilliseconds()).toBe(0);
    });
  });
});
