import { describe, it, expect } from 'vitest';
import { parseLocalDate } from '../src/utils.js';

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
});
