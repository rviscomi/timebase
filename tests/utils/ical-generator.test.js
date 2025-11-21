import { describe, it, expect, vi } from 'vitest';
import { generateICal, downloadICal } from '../../src/utils/ical-generator.js';

describe('iCal Generator', () => {
  const mockFeatures = [
    {
      id: 'feature-1',
      name: 'Feature 1',
      description: 'Description 1',
      date: new Date('2023-01-01T00:00:00Z'),
      displayType: 'newly-available',
      shipDates: [
        { browser: 'chrome', version: '110' },
        { browser: 'firefox', version: '110' }
      ]
    },
    {
      id: 'feature-2',
      name: 'Feature 2',
      description: 'Description 2',
      date: new Date('2023-02-01T00:00:00Z'),
      displayType: 'widely-available',
      shipDates: [
        { browser: 'safari', version: '16.4' }
      ]
    }
  ];

  describe('generateICal', () => {
    it('should generate valid iCal content', () => {
      const ical = generateICal(mockFeatures);

      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('VERSION:2.0');
      expect(ical).toContain('SUMMARY:🆕 Newly Available: Feature 1');
      expect(ical).toContain('SUMMARY:✅ Widely Available: Feature 2');
      expect(ical).toContain('END:VCALENDAR');
    });

    it('should handle empty features list', () => {
      const ical = generateICal([]);
      expect(ical).toContain('BEGIN:VCALENDAR');
      expect(ical).toContain('END:VCALENDAR');
      expect(ical).not.toContain('BEGIN:VEVENT');
    });

    it('should escape special characters', () => {
      const featuresWithSpecialChars = [{
        id: 'special',
        name: 'Special, Feature',
        description: 'Line 1\nLine 2',
        date: new Date('2023-01-01'),
        displayType: 'newly-available',
        shipDates: []
      }];

      const ical = generateICal(featuresWithSpecialChars);
      expect(ical).toContain('Special\\, Feature');
      expect(ical).toContain('Line 1\\nLine 2');
    });
  });

  describe('downloadICal', () => {
    it('should create a blob and trigger download', () => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      const createObjectURL = vi.fn(() => 'blob:url');
      const revokeObjectURL = vi.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;

      // Mock document.createElement and body.appendChild/removeChild
      const link = document.createElement('a');
      link.click = vi.fn();

      const createElement = vi.spyOn(document, 'createElement').mockReturnValue(link);
      const appendChild = vi.spyOn(document.body, 'appendChild');
      const removeChild = vi.spyOn(document.body, 'removeChild');

      downloadICal(mockFeatures);

      expect(createObjectURL).toHaveBeenCalled();
      expect(createElement).toHaveBeenCalledWith('a');
      expect(link.href).toBe('blob:url');
      expect(link.download).toBe('web-features-timeline.ics');
      expect(appendChild).toHaveBeenCalledWith(link);
      expect(link.click).toHaveBeenCalled();
      expect(removeChild).toHaveBeenCalledWith(link);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:url');
    });
  });
});
