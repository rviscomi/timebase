import { describe, it, expect } from 'vitest';
import { shouldDisplayFeature } from '../../src/utils/filters.js';

describe('shouldDisplayFeature', () => {
  const mockFeature = {
    id: 'feature-1',
    shipDates: [
      { browser: 'chrome', version: '110' },
      { browser: 'safari', version: '16.4' }
    ],
    interop: [
      { year: 2023 }
    ],
    prediction: false,
    displayType: 'newly-available',
    discouraged: false
  };

  it('should return true when no filters are active', () => {
    expect(shouldDisplayFeature(mockFeature, {})).toBe(true);
  });

  describe('Browser Filters', () => {
    it('should match specific browser version', () => {
      expect(shouldDisplayFeature(mockFeature, { browsers: ['chrome:110'] })).toBe(true);
    });

    it('should fail if browser version does not match', () => {
      expect(shouldDisplayFeature(mockFeature, { browsers: ['chrome:111'] })).toBe(false);
    });

    it('should match multiple browsers (AND logic)', () => {
      expect(shouldDisplayFeature(mockFeature, { browsers: ['chrome:110', 'safari:16.4'] })).toBe(true);
    });

    it('should fail if one of multiple browsers does not match', () => {
      expect(shouldDisplayFeature(mockFeature, { browsers: ['chrome:110', 'firefox:110'] })).toBe(false);
    });

    it('should match firefox_android when filtering by firefox (loose match)', () => {
      const mobileFeature = {
        ...mockFeature,
        shipDates: [
          { browser: 'firefox_android', version: '79' }
        ]
      };
      // This should now pass because 'firefox:79' matches 'firefox_android:79'
      expect(shouldDisplayFeature(mobileFeature, { browsers: ['firefox:79'] })).toBe(true);
    });
  });

  describe('Interop Filters', () => {
    it('should match specific interop year', () => {
      expect(shouldDisplayFeature(mockFeature, { interop: ['2023'] })).toBe(true);
    });

    it('should match "any" interop', () => {
      expect(shouldDisplayFeature(mockFeature, { interop: ['any'] })).toBe(true);
    });

    it('should fail if interop year does not match', () => {
      expect(shouldDisplayFeature(mockFeature, { interop: ['2022'] })).toBe(false);
    });

    it('should fail "any" if feature has no interop', () => {
      const noInteropFeature = { ...mockFeature, interop: [] };
      expect(shouldDisplayFeature(noInteropFeature, { interop: ['any'] })).toBe(false);
    });
  });

  describe('Status Filters', () => {
    it('should match status', () => {
      expect(shouldDisplayFeature(mockFeature, { status: 'newly-available' })).toBe(true);
    });

    it('should fail if status does not match', () => {
      expect(shouldDisplayFeature(mockFeature, { status: 'widely-available' })).toBe(false);
    });

    it('should handle "limited-availability" alias', () => {
      const limitedFeature = { ...mockFeature, displayType: 'limited-availability' };
      expect(shouldDisplayFeature(limitedFeature, { status: 'limited-availability' })).toBe(true);
    });

    it('should handle "discouraged" alias', () => {
      const discouragedFeature = { ...mockFeature, discouraged: true };
      expect(shouldDisplayFeature(discouragedFeature, { status: 'discouraged' })).toBe(true);
    });
  });

  describe('Predictions', () => {
    it('should show predictions by default', () => {
      const predictedFeature = { ...mockFeature, prediction: true };
      expect(shouldDisplayFeature(predictedFeature, {})).toBe(true);
    });

    it('should hide predictions when showPredictions is false', () => {
      const predictedFeature = { ...mockFeature, prediction: true };
      expect(shouldDisplayFeature(predictedFeature, { showPredictions: false })).toBe(false);
    });
  });
});
