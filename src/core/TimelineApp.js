
import { browsers, features } from '../../data/web-features.js';
import { downloadICal } from '../utils/ical-generator.js';
import { parseLocalDate } from '../utils/utils.js';
import { shouldDisplayFeature } from '../utils/filters.js';
import { getFiltersFromURL, createURLFromFilters } from '../utils/url.js';
import { processFeatures } from './data-processor.js';
import { setupShortcuts, setupShortcutsDialog } from '../utils/shortcuts.js';
import { applyFiltersToDOM, getFiltersFromDOM, updateHistory } from './router.js';
import { StateManager } from './StateManager.js';
import { ScrollManager } from './ScrollManager.js';
import developerSignalsData from '../../data/developer-signals.json' with { type: "json" };
import interopData from '../../data/interop.json' with { type: "json" };
import mdnDocsData from '../../data/mdn.json' with { type: "json" };
import chromeContentData from '../../data/chrome-content.json' with { type: "json" };


export class TimelineApp {
  constructor(options = {}) {
    this.options = {
      idPrefix: 'feature',
      dataLoader: null,
      ...options
    };
    this.url = new URL(window.location);
    this.timelineContent = document.querySelector('#timeline-content');
    this.developerSignals = developerSignalsData;
    this.interopData = interopData;
    this.mdnDocs = mdnDocsData;
    this.chromeContent = chromeContentData;
    this.scrollFAB = null;
    this.scrollObserver = null;
    this.stateManager = new StateManager(this.url);
    this.stateManager.subscribe(this.handleStateChange.bind(this));
    this.scrollManager = new ScrollManager();
  }

  loadData() {
    if (this.options.dataLoader) {
      this.options.dataLoader.call(this);
    } else {
      this.features = processFeatures(features, browsers, {
        developerSignals: this.developerSignals,
        interop: this.interopData,
        mdn: this.mdnDocs,
        chromeContent: this.chromeContent
      });
      this.allFeatures = [...this.features];
    }
  }

  init() {
    this.initEventListeners();
    this.attachInteractivityToStaticHTML();
    this.stateManager.initializeFromURL();
  }

  attachInteractivityToStaticHTML() {
    // Use event delegation for browser tags, interop tags, feature card expansion, and widely-available links
    if (this.timelineContent) {
      this.timelineContent.addEventListener('click', (e) => {
        // Handle browser tag clicks
        const browserTag = e.target.closest('.browser-tag');
        if (browserTag) {
          e.stopPropagation();
          this.handleBrowserTagClick(browserTag);
          return;
        }

        // Handle interop tag clicks
        const interopTag = e.target.closest('.interop-tag');
        if (interopTag) {
          e.stopPropagation();
          this.handleInteropTagClick(interopTag);
          return;
        }

        // Handle widely-available link clicks
        const widelyAvailableLink = e.target.closest('.widely-available-link');
        if (widelyAvailableLink) {
          this.handleWidelyAvailableLinkClick(widelyAvailableLink);
          return;
        }

        // Handle feature card expansion
        const topRow = e.target.closest('.feature-top-row');
        if (topRow) {
          this.handleFeatureCardExpansion(topRow, e.target);
        }
      });

      // Handle keyboard interaction for browser and interop tags using delegation on keydown
      this.timelineContent.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          const tag = e.target.closest('.browser-tag, .interop-tag');
          if (tag) {
            e.preventDefault();
            e.stopPropagation();
            tag.click();
          }
        }
      });
    }

    this.handleHashNavigation();
    this.scrollManager.updateScrollTarget();
  }

  handleBrowserTagClick(tag) {
    const filterKey = tag.getAttribute('data-filter');
    this.stateManager.toggleBrowserFilter(filterKey);
  }

  handleInteropTagClick(tag) {
    const filterKey = tag.getAttribute('data-filter');
    this.stateManager.toggleInteropFilter(filterKey);
  }

  handleFeatureCardExpansion(topRow, target) {
    // Avoid expanding when clicking other links/buttons (e.g. browser tags, upvotes)
    if (target.tagName === 'A' ||
      target.closest('a') ||
      (target.tagName === 'IMG' && target.closest('a')) ||
      target.closest('.browser-tag') ||
      target.closest('.interop-tag')) {
      return;
    }

    const toggleBtn = topRow.querySelector('.feature-toggle-btn');
    if (!toggleBtn) return;

    const detailsId = toggleBtn.getAttribute('aria-controls');
    const details = document.getElementById(detailsId);
    if (!details) return;

    const isExpanded = details.style.display !== 'none';
    details.style.display = isExpanded ? 'none' : 'block';
    toggleBtn.setAttribute('aria-expanded', !isExpanded);

    const card = topRow.closest('.feature-card');
    if (card) {
      if (isExpanded) {
        card.classList.remove('expanded');
      } else {
        card.classList.add('expanded');
      }
    }
  }

  handleWidelyAvailableLinkClick(link) {
    const state = this.stateManager.getState();
    if (state.filters.status) {
      this.stateManager.toggleStatusFilter(state.filters.status);
    }
    if (state.filters.showPredictions === false) {
      this.stateManager.togglePredictions();
    }

    const targetId = link.dataset.targetId;
    if (targetId) {
      const targetCard = document.getElementById(targetId);
      if (targetCard) {
        this.scrollManager.scrollToAndExpandCard(targetCard);
      }
    }
  }

  handleHashNavigation() {
    if (window.location.hash) {
      const targetId = window.location.hash.substring(1);
      const hasNewlyAvailable = targetId.includes('-newly-available');
      const hasWidelyAvailable = targetId.includes('-widely-available');

      if (hasNewlyAvailable) {
        const element = document.getElementById(targetId);
        if (element) {
          this.scrollManager.scrollToAndExpandCard(element);
        }
      } else if (hasWidelyAvailable) {
        const element = document.getElementById(targetId);
        if (element) {
          this.scrollManager.scrollToAndExpandCard(element);
        }
      } else if (targetId.startsWith(`${this.options.idPrefix}-`)) {
        const baseFeatureId = targetId.split('-newly-available')[0].split('-widely-available')[0];
        const newlyAvailableId = `${baseFeatureId}-newly-available`;
        const newlyAvailableElement = document.getElementById(newlyAvailableId);

        if (newlyAvailableElement) {
          this.scrollManager.scrollToAndExpandCard(newlyAvailableElement);
        } else {
          const widelyAvailableId = `${baseFeatureId}-widely-available`;
          const widelyAvailableElement = document.getElementById(widelyAvailableId);
          if (widelyAvailableElement) {
            this.scrollManager.scrollToAndExpandCard(widelyAvailableElement);
          } else {
            const exactElement = document.getElementById(targetId);
            if (exactElement) {
              this.scrollManager.scrollToAndExpandCard(exactElement);
            }
          }
        }
      } else {
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  }




  initEventListeners() {
    // Add event listeners for iCal download buttons
    const downloadTopBtn = document.getElementById('download-ical-top');
    const downloadBottomBtn = document.getElementById('download-ical-bottom');

    if (downloadTopBtn) {
      downloadTopBtn.addEventListener('click', () => {
        downloadICal(this.getSelectedFeatures());
      });
    }

    if (downloadBottomBtn) {
      downloadBottomBtn.addEventListener('click', () => {
        downloadICal(this.getSelectedFeatures());
      });
    }

    // Initialize shortcuts dialog
    this.shortcutsDialogManager = setupShortcutsDialog();

    // Set up keyboard shortcuts
    setupShortcuts({
      'w': () => this.filterFeaturesByType('widely-available'),
      'n': () => this.filterFeaturesByType('newly-available'),
      'l': () => this.filterFeaturesByType('limited-availability'),
      'd': () => this.filterDeprecatedFeatures(),
      'c': () => this.scrollManager.scrollToCurrentMonth(),
      'r': () => this.resetFilters(),
      'i': () => this.filterInteropFeatures(),
      'p': () => this.filterPredictedFeatures(),
      '?': () => this.showShortcutsDialog()
    });
  }

  // Show the keyboard shortcuts dialog
  showShortcutsDialog() {
    this.shortcutsDialogManager.show();
  }

  handleStateChange(state) {
    const { filters, selectedFeatures } = state;

    // Update DOM tags
    applyFiltersToDOM(filters);

    // Update feature card visibility
    this.allFeatures.forEach(feature => {
      const isVisible = shouldDisplayFeature(feature, filters);
      const cardId = `${this.options.idPrefix}-${feature.id}-${feature.displayType}`;
      const card = document.getElementById(cardId);

      if (card) {
        card.style.display = isVisible ? '' : 'none';

        // Update selection state
        if (selectedFeatures.has(cardId)) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });

    // Update special interop-any attribute if needed
    if (filters.interop.includes('any')) {
      const allCards = document.querySelectorAll('.feature-card');
      allCards.forEach(card => {
        const hasInterop = Array.from(card.attributes)
          .some(attr => attr.name.startsWith('data-interop-'));
        if (hasInterop) {
          card.setAttribute('data-interop-any', 'true');
        } else {
          card.removeAttribute('data-interop-any');
        }
      });
    } else {
      document.querySelectorAll('[data-interop-any]').forEach(card => {
        card.removeAttribute('data-interop-any');
      });
    }

    // Update download button text to show selection count
    const selectedCount = selectedFeatures.size;
    const downloadButtons = document.querySelectorAll('.download-btn');
    downloadButtons.forEach(btn => {
      if (selectedCount === 0) {
        btn.innerHTML = '📅 Download ICS Calendar';
      } else {
        btn.innerHTML = `📅 Download ICS Calendar <span class="selection-count">(${selectedCount} selected)</span>`;
      }
    });

    // Update "Add to Calendar" button text based on selection state
    document.querySelectorAll('.add-to-calendar-btn').forEach(btn => {
      const card = btn.closest('.feature-card');
      if (card) {
        const cardId = card.id;
        if (selectedFeatures.has(cardId)) {
          btn.innerHTML = '✅ Remove from Calendar';
        } else {
          btn.innerHTML = '📅 Add to Calendar';
        }
      }
    });

    this.updateDateHeadersVisibility();
    this.scrollManager.updateScrollTarget();
  }

  // Keep for backward compatibility or if needed elsewhere, but mostly handled by handleStateChange
  updateFeatureVisibility() {
    this.handleStateChange(this.stateManager.getState());
  }

  // Method to filter features by interop
  filterInteropFeatures() {
    this.stateManager.toggleInteropFilter('any');
  }

  // Helper method to hide date headers with no visible feature cards
  updateDateHeadersVisibility() {
    const dateGroups = document.querySelectorAll('.date-group');

    dateGroups.forEach(group => {
      const hasVisibleCards = Array.from(group.querySelectorAll('.feature-card'))
        .some(card => card.style.display !== 'none');

      group.style.display = hasVisibleCards ? '' : 'none';
    });
  }

  // Update URL with current filter state
  updateURLWithFilters() {
    // Handled by StateManager
  }

  // Initialize filters from URL parameters
  initializeFiltersFromURL() {
    // Handled by StateManager
  }



  // Add selection methods
  toggleFeatureSelection(feature) {
    const featureId = `${this.options.idPrefix}-${feature.id}-${feature.displayType}`;
    this.stateManager.toggleFeatureSelection(featureId);
  }

  isFeatureSelected(feature) {
    const featureId = `${this.options.idPrefix}-${feature.id}-${feature.displayType}`;
    return this.stateManager.isFeatureSelected(featureId);
  }

  updateSelectionUI() {
    // Handled by handleStateChange
  }

  getSelectedFeatures() {
    const selectedIds = this.stateManager.getSelectedFeatures();
    if (selectedIds.size === 0) {
      return this.features; // Return all features if none selected
    }

    return this.features.filter(feature => {
      const featureId = `${this.options.idPrefix}-${feature.id}-${feature.displayType}`;
      return selectedIds.has(featureId);
    });
  }

  // Filter features by type (widely-available, newly-available, limited-availability)
  filterFeaturesByType(type) {
    this.stateManager.toggleStatusFilter(type);
  }

  // Reset all filters and show all features
  resetFilters(resetBrowserFilters = true) {
    this.stateManager.resetFilters(resetBrowserFilters);
  }

  // Toggle prediction visibility
  filterPredictedFeatures() {
    this.stateManager.togglePredictions();
  }

  // Filter to show only deprecated (discouraged) features
  filterDeprecatedFeatures() {
    this.stateManager.toggleStatusFilter('discouraged');
  }

  // Scroll to the current month in the timeline
  scrollToCurrentMonth() {
    this.scrollManager.scrollToCurrentMonth();
  }
}
