
import { browsers, features } from '../data/data.js';
import { downloadICal } from './ical-generator.js';
import { parseLocalDate } from './utils.js';
import { shouldDisplayFeature } from './filters.js';
import { getFiltersFromURL, createURLFromFilters } from './url.js';
import { processFeatures } from './data-processor.js';
import { setupShortcuts, setupShortcutsDialog } from './shortcuts.js';
import { applyFiltersToDOM, getFiltersFromDOM, updateHistory } from './router.js';
import { StateManager } from './StateManager.js';
import developerSignalsData from '../data/developer-signals.json' with { type: "json" };
import interopData from '../data/interop.json' with { type: "json" };
import mdnDocsData from '../data/mdn.json' with { type: "json" };


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
    this.scrollFAB = null;
    this.scrollObserver = null;
    this.stateManager = new StateManager(this.url);
    this.stateManager.subscribe(this.handleStateChange.bind(this));
  }

  loadData() {
    if (this.options.dataLoader) {
      this.options.dataLoader.call(this);
    } else {
      this.features = processFeatures(features, browsers, {
        developerSignals: this.developerSignals,
        interop: this.interopData,
        mdn: this.mdnDocs
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
    this.updateScrollTarget();
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
    if (target.tagName === 'A' ||
      target.closest('a') ||
      (target.tagName === 'IMG' && target.closest('a'))) {
      return;
    }

    const detailsId = topRow.getAttribute('aria-controls');
    const details = document.getElementById(detailsId);
    if (!details) return;

    const isExpanded = details.style.display !== 'none';
    details.style.display = isExpanded ? 'none' : 'block';
    topRow.setAttribute('aria-expanded', !isExpanded);

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
        this.scrollToAndExpandCard(targetCard);
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
          this.scrollToAndExpandCard(element);
        }
      } else if (hasWidelyAvailable) {
        const element = document.getElementById(targetId);
        if (element) {
          this.scrollToAndExpandCard(element);
        }
      } else if (targetId.startsWith(`${this.options.idPrefix}-`)) {
        const baseFeatureId = targetId.split('-newly-available')[0].split('-widely-available')[0];
        const newlyAvailableId = `${baseFeatureId}-newly-available`;
        const newlyAvailableElement = document.getElementById(newlyAvailableId);

        if (newlyAvailableElement) {
          this.scrollToAndExpandCard(newlyAvailableElement);
        } else {
          const widelyAvailableId = `${baseFeatureId}-widely-available`;
          const widelyAvailableElement = document.getElementById(widelyAvailableId);
          if (widelyAvailableElement) {
            this.scrollToAndExpandCard(widelyAvailableElement);
          } else {
            const exactElement = document.getElementById(targetId);
            if (exactElement) {
              this.scrollToAndExpandCard(exactElement);
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


  // Find current or most recent past visible month
  updateScrollTarget() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const visibleMonths = Array.from(document.querySelectorAll('.date-group:not([style*="display: none"])'));

    // Month names to indices
    const monthMap = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    let targetMonth = null;

    // Find the first visible month that's on or before today
    for (const month of visibleMonths) {
      const [monthName, yearStr] = month.id.split('-');
      const monthIndex = monthMap[monthName];
      const year = parseInt(yearStr, 10);

      if (monthIndex !== undefined && !isNaN(year)) {
        const monthDate = new Date(year, monthIndex, 1);
        monthDate.setHours(0, 0, 0, 0);

        if (monthDate <= now) {
          targetMonth = month;
          break;
        }
      }
    }

    // Fallback to first visible month
    if (!targetMonth && visibleMonths.length > 0) {
      targetMonth = visibleMonths[0];
    }

    // Remove old FAB and observer if they exist
    if (this.scrollFAB) {
      this.scrollFAB.remove();
      this.scrollFAB = null;
    }

    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = null;
    }

    // Create new FAB with the target month
    if (targetMonth) {
      this.createScrollToCurrentMonthFAB(targetMonth);
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
      'c': () => this.scrollToCurrentMonth(),
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
    this.updateScrollTarget();
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

  // Helper method to scroll to and expand a feature card
  scrollToAndExpandCard(card) {
    // Use a single timeout to ensure DOM is ready
    setTimeout(() => {
      if (!card) return;

      // Expand the card
      const topRow = card.querySelector('.feature-top-row');
      const details = card.querySelector('.feature-details');

      if (topRow && details) {
        // First mark the card as our target for scrolling
        // This helps in case there are multiple cards being expanded
        card.setAttribute('data-scroll-target', 'true');

        // Expand the card if it's not already expanded
        if (details.style.display === 'none') {
          // First make the details visible but with opacity 0
          details.style.display = 'block';
          details.style.opacity = '0';
          topRow.setAttribute('aria-expanded', 'true');
          card.classList.add('expanded');

          // Force a reflow to ensure the browser calculates the expanded height
          void card.offsetHeight;

          // Calculate the position with the expanded content
          const headerHeight = 80; // Approximate height of sticky header
          const extraPadding = 20; // Additional padding for visual comfort
          const targetPosition = card.getBoundingClientRect().top + window.pageYOffset - headerHeight - extraPadding;

          // Scroll to the card with proper offset
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // After scrolling, make the details visible with a fade-in effect
          setTimeout(() => {
            details.style.transition = 'opacity 0.3s ease';
            details.style.opacity = '1';
          }, 100);
        } else {
          // If already expanded, just scroll to it
          const headerHeight = 80;
          const extraPadding = 20;
          const targetPosition = card.getBoundingClientRect().top + window.pageYOffset - headerHeight - extraPadding;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }

        // Remove the scroll target attribute after scrolling is complete
        setTimeout(() => {
          card.removeAttribute('data-scroll-target');
        }, 1000);
      }
    }, 100);
  }

  createScrollToCurrentMonthFAB(currentMonthElement) {
    if (!currentMonthElement) return;

    // Create the FAB element
    const fab = document.createElement('button');
    fab.className = 'scroll-to-current-month-fab';

    // Store reference to the FAB
    this.scrollFAB = fab;

    // Get current month and year for the button text
    const now = new Date();
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'short' });
    const currentYear = now.getFullYear();

    // Add icon and text to the FAB using a simple text symbol instead of Material Icons
    fab.innerHTML = `
            <span class="fab-icon">📅</span>
            <span class="fab-text">Scroll to current month</span>
        `;

    fab.title = `Go to ${currentMonthName} ${currentYear}`;
    fab.setAttribute('aria-label', `Go to ${currentMonthName} ${currentYear}`);

    // Add click event to scroll to current month
    fab.addEventListener('click', () => {
      currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // Check if target is already in view to set initial state
    const rect = currentMonthElement.getBoundingClientRect();
    const isInView = rect.top >= 80 && rect.top <= window.innerHeight;

    // Initially hide the FAB if target is in view, otherwise show it
    if (isInView) {
      fab.classList.add('hidden');
    } else {
      fab.classList.remove('hidden');
    }

    // Add the FAB to the document
    document.body.appendChild(fab);

    // Set up Intersection Observer to show/hide the FAB
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // Using intersection ratio to determine visibility more precisely
        // This helps with mobile devices where elements can be partially visible
        if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
          // When current month is sufficiently visible, hide the button
          fab.classList.add('hidden');
        } else {
          // When current month is not visible enough, show the button
          fab.classList.remove('hidden');
        }
      });
    }, {
      // Create a more generous threshold area for mobile
      rootMargin: '-80px 0px',
      // Use multiple thresholds for better detection of visibility
      threshold: [0, 0.15, 0.3]
    });

    // Store reference to the observer
    this.scrollObserver = observer;

    // Start observing the current month element
    observer.observe(currentMonthElement);
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
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const visibleMonths = Array.from(document.querySelectorAll('.date-group:not([style*="display: none"])'));

    const monthMap = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };

    // Find the first visible month that's on or before today
    for (const month of visibleMonths) {
      const [monthName, yearStr] = month.id.split('-');
      const monthIndex = monthMap[monthName];
      const year = parseInt(yearStr, 10);

      if (monthIndex !== undefined && !isNaN(year)) {
        const monthDate = new Date(year, monthIndex, 1);
        monthDate.setHours(0, 0, 0, 0);

        if (monthDate <= now) {
          month.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
    }

    // Fallback to first visible month
    if (visibleMonths.length > 0) {
      visibleMonths[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
