import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateManager } from '../../src/core/StateManager.js';

// Mock window.location and window.history
const mockLocation = new URL('http://localhost/');
global.window = {
  location: mockLocation,
  history: {
    replaceState: vi.fn()
  }
};

describe('StateManager', () => {
  let stateManager;

  beforeEach(() => {
    vi.clearAllMocks();
    stateManager = new StateManager(new URL('http://localhost/'));
  });

  it('should initialize with default state', () => {
    const state = stateManager.getState();
    expect(state.filters).toEqual({
      browsers: [],
      interop: [],
      status: null,
      showPredictions: true
    });
    expect(state.selectedFeatures.size).toBe(0);
  });

  it('should toggle browser filter', () => {
    stateManager.toggleBrowserFilter('chrome:125');
    expect(stateManager.getState().filters.browsers).toContain('chrome:125');

    stateManager.toggleBrowserFilter('chrome:125');
    expect(stateManager.getState().filters.browsers).not.toContain('chrome:125');
  });

  it('should toggle interop filter', () => {
    stateManager.toggleInteropFilter('2023');
    expect(stateManager.getState().filters.interop).toContain('2023');

    stateManager.toggleInteropFilter('2023');
    expect(stateManager.getState().filters.interop).not.toContain('2023');
  });

  it('should handle "any" interop filter correctly', () => {
    stateManager.toggleInteropFilter('2023');
    stateManager.toggleInteropFilter('any');
    expect(stateManager.getState().filters.interop).toEqual(['any']);

    stateManager.toggleInteropFilter('2024');
    expect(stateManager.getState().filters.interop).toEqual(['2024']);
  });

  it('should toggle status filter', () => {
    stateManager.toggleStatusFilter('widely-available');
    expect(stateManager.getState().filters.status).toBe('widely-available');

    stateManager.toggleStatusFilter('widely-available');
    expect(stateManager.getState().filters.status).toBeNull();
  });

  it('should toggle predictions', () => {
    expect(stateManager.getState().filters.showPredictions).toBe(true);
    stateManager.togglePredictions();
    expect(stateManager.getState().filters.showPredictions).toBe(false);
    stateManager.togglePredictions();
    expect(stateManager.getState().filters.showPredictions).toBe(true);
  });

  it('should reset filters', () => {
    stateManager.toggleBrowserFilter('chrome:125');
    stateManager.toggleInteropFilter('2023');
    stateManager.toggleStatusFilter('widely-available');
    stateManager.togglePredictions();

    stateManager.resetFilters(true);
    expect(stateManager.getState().filters).toEqual({
      browsers: [],
      interop: [],
      status: null,
      showPredictions: true
    });
  });

  it('should toggle feature selection', () => {
    stateManager.toggleFeatureSelection('feature-1');
    expect(stateManager.isFeatureSelected('feature-1')).toBe(true);
    expect(stateManager.getState().selectedFeatures.has('feature-1')).toBe(true);

    stateManager.toggleFeatureSelection('feature-1');
    expect(stateManager.isFeatureSelected('feature-1')).toBe(false);
    expect(stateManager.getState().selectedFeatures.has('feature-1')).toBe(false);
  });

  it('should clear selection', () => {
    stateManager.toggleFeatureSelection('feature-1');
    stateManager.toggleFeatureSelection('feature-2');
    expect(stateManager.getSelectedFeatures().size).toBe(2);

    stateManager.clearSelection();
    expect(stateManager.getSelectedFeatures().size).toBe(0);
  });

  it('should notify subscribers on change', () => {
    const callback = vi.fn();
    stateManager.subscribe(callback);
    stateManager.toggleBrowserFilter('chrome:125');
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({
        browsers: ['chrome:125']
      })
    }));

    stateManager.toggleFeatureSelection('feature-1');
    expect(callback).toHaveBeenCalledWith(expect.objectContaining({
      selectedFeatures: expect.any(Set)
    }));
  });
});
