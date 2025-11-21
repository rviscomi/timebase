import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FilterManager } from '../src/FilterManager.js';

// Mock window.location and window.history
const mockLocation = new URL('http://localhost/');
global.window = {
  location: mockLocation,
  history: {
    replaceState: vi.fn()
  }
};

describe('FilterManager', () => {
  let filterManager;

  beforeEach(() => {
    vi.clearAllMocks();
    filterManager = new FilterManager(new URL('http://localhost/'));
  });

  it('should initialize with default filters', () => {
    expect(filterManager.getFilters()).toEqual({
      browsers: [],
      interop: [],
      status: null,
      showPredictions: true
    });
  });

  it('should toggle browser filter', () => {
    filterManager.toggleBrowserFilter('chrome:125');
    expect(filterManager.getFilters().browsers).toContain('chrome:125');
    
    filterManager.toggleBrowserFilter('chrome:125');
    expect(filterManager.getFilters().browsers).not.toContain('chrome:125');
  });

  it('should toggle interop filter', () => {
    filterManager.toggleInteropFilter('2023');
    expect(filterManager.getFilters().interop).toContain('2023');
    
    filterManager.toggleInteropFilter('2023');
    expect(filterManager.getFilters().interop).not.toContain('2023');
  });

  it('should handle "any" interop filter correctly', () => {
    filterManager.toggleInteropFilter('2023');
    filterManager.toggleInteropFilter('any');
    expect(filterManager.getFilters().interop).toEqual(['any']);
    
    filterManager.toggleInteropFilter('2024');
    expect(filterManager.getFilters().interop).toEqual(['2024']);
  });

  it('should toggle status filter', () => {
    filterManager.toggleStatusFilter('widely-available');
    expect(filterManager.getFilters().status).toBe('widely-available');
    
    filterManager.toggleStatusFilter('widely-available');
    expect(filterManager.getFilters().status).toBeNull();
  });

  it('should toggle predictions', () => {
    expect(filterManager.getFilters().showPredictions).toBe(true);
    filterManager.togglePredictions();
    expect(filterManager.getFilters().showPredictions).toBe(false);
    filterManager.togglePredictions();
    expect(filterManager.getFilters().showPredictions).toBe(true);
  });

  it('should reset filters', () => {
    filterManager.toggleBrowserFilter('chrome:125');
    filterManager.toggleInteropFilter('2023');
    filterManager.toggleStatusFilter('widely-available');
    filterManager.togglePredictions();
    
    filterManager.reset(true);
    expect(filterManager.getFilters()).toEqual({
      browsers: [],
      interop: [],
      status: null,
      showPredictions: true
    });
  });

  it('should reset filters keeping browser filters', () => {
    filterManager.toggleBrowserFilter('chrome:125');
    filterManager.toggleInteropFilter('2023');
    
    filterManager.reset(false);
    expect(filterManager.getFilters().browsers).toContain('chrome:125');
    expect(filterManager.getFilters().interop).toEqual([]);
  });

  it('should notify subscribers on change', () => {
    const callback = vi.fn();
    filterManager.subscribe(callback);
    filterManager.toggleBrowserFilter('chrome:125');
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      browsers: ['chrome:125']
    }));
  });
});
