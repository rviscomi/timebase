import { describe, it, expect } from 'vitest';
import { processFeatures, processBcdKeys } from '../../src/core/data-processor.js';

describe('Data Processor', () => {
  const mockBrowsers = {
    chrome: {
      releases: [
        { version: '100', date: '2022-01-01' },
        { version: '101', date: '2022-02-01' }
      ]
    },
    firefox: {
      releases: [
        { version: '100', date: '2022-01-15' }
      ]
    }
  };

  const mockMetadata = {
    developerSignals: { feature1: { rating: 'positive' } },
    interop: { feature1: { score: 100 } },
    mdn: { feature1: { url: 'https://mdn.com/feature1' } }
  };

  describe('processFeatures', () => {
    it('should process a basic feature correctly', () => {
      const features = {
        feature1: {
          name: 'Feature 1',
          status: {
            support: { chrome: '100', firefox: '100' },
            baseline_low_date: '2022-01-15',
            baseline: 'high',
            baseline_high_date: '2024-07-15'
          }
        }
      };

      const result = processFeatures(features, mockBrowsers, mockMetadata);

      expect(result).toHaveLength(2); // newly-available and widely-available
      // Actually, let's check the logic. 
      // It pushes:
      // 1. Newly available (baseline_low_date)
      // 2. Widely available (baseline_high_date)
      // AND if baseline is false, it pushes "Limited availability" instead.

      const newlyAvailable = result.find(r => r.displayType === 'newly-available');
      expect(newlyAvailable).toBeDefined();
      expect(newlyAvailable.id).toBe('feature1');
      expect(newlyAvailable.developerSignal).toEqual({ rating: 'positive' });
    });

    it('should handle limited availability features', () => {
      const features = {
        feature2: {
          name: 'Feature 2',
          status: {
            support: { chrome: '100' },
            baseline: false
          }
        }
      };

      const result = processFeatures(features, mockBrowsers);
      expect(result).toHaveLength(1);
      expect(result[0].displayType).toBe('limited-availability');
      expect(result[0].browser).toBeUndefined(); // The top level object doesn't have browser, shipDates does
    });

    it('should handle numeric versions with null dates', () => {
      const browsersWithNull = {
        ...mockBrowsers,
        safari: {
          releases: [
            { version: '26.2', date: null }
          ]
        }
      };
      const features = {
        f_null: {
          status: {
            support: { safari: '26.2' },
            baseline: false
          }
        }
      };
      const result = processFeatures(features, browsersWithNull);
      expect(result).toHaveLength(1);
      expect(result[0].shipDates[0].version).toBe('26.2');
      expect(result[0].shipDates[0].isPreview).toBe(true);
      // Check date is end of current month
      const now = new Date();
      const expectedDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      expectedDate.setHours(23, 59, 59, 999);
      expect(result[0].shipDates[0].date.getTime()).toBe(expectedDate.getTime());
    });

    it('should sort by date descending', () => {
      const features = {
        f1: {
          status: { baseline_low_date: '2022-01-01', baseline: 'low' }
        },
        f2: {
          status: { baseline_low_date: '2023-01-01', baseline: 'low' }
        }
      };
      // Mock support to ensure they pass filters
      features.f1.status.support = { chrome: '100' };
      features.f2.status.support = { chrome: '100' };

      const result = processFeatures(features, mockBrowsers);
      // We expect f2 (2023) to come before f1 (2022)
      const f2Index = result.findIndex(r => r.id === 'f2');
      const f1Index = result.findIndex(r => r.id === 'f1');
      expect(f2Index).toBeLessThan(f1Index);
    });
  });

  describe('processBcdKeys', () => {
    it('should process BCD keys correctly', () => {
      const bcdKeys = {
        key1: {
          name: 'Key 1',
          parent_feature: 'feature1',
          status: {
            support: { chrome: '100' },
            baseline_low_date: '2022-01-01',
            baseline: 'low'
          }
        }
      };

      // We need to mock the date range filter in processBcdKeys
      // The filter is: 3 months ago to 4 months future.
      // So we need to pick a date that is "now" or close to it for the test to pass, 
      // OR we need to accept that it filters out old stuff.
      // Wait, the test runner uses real system time? Yes.
      // So '2022-01-01' will definitely be filtered out if we run this in 2025.
      // We should probably mock the Date object or use a date relative to now.

      const now = new Date();
      const recentDate = new Date(now);
      recentDate.setMonth(now.getMonth() - 1); // 1 month ago
      const recentDateStr = recentDate.toISOString().split('T')[0];

      bcdKeys.key1.status.baseline_low_date = recentDateStr;
      // We also need a matching browser release date for this to work perfectly?
      // Actually processBcdKeys uses baseline_low_date for the main entry date.

      // We need to update mockBrowsers to have a recent release too if we want shipDates to work?
      // shipDates are calculated but the main entry date comes from baseline_low_date.

      const result = processBcdKeys(bcdKeys, mockBrowsers, mockMetadata);
      // It might still be filtered if the browser release date is old?
      // The filter checks `key.date`.
      // For 'newly-available', date is baseline_low_date.

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].id).toBe('key1');
    });
  });
});
