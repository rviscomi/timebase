
import { browsers, features } from '../data/data.js';
import { downloadICal } from './ical-generator.js';
import { parseLocalDate } from './utils.js';
import { shouldDisplayFeature } from './filters.js';
import { getFiltersFromURL, createURLFromFilters } from './url.js';
import { processFeatures } from './data-processor.js';
import { setupShortcuts, setupShortcutsDialog } from './shortcuts.js';
import { applyFiltersToDOM, getFiltersFromDOM, updateHistory } from './router.js';
import developerSignalsData from '../data/developer-signals.json' with { type: "json" };
import interopData from '../data/interop.json' with { type: "json" };
import mdnDocsData from '../data/mdn.json' with { type: "json" };

export class TimelineApp {
  constructor() {
    this.url = new URL(window.location);
    this.timelineContent = document.querySelector('#timeline-content');
    this.developerSignals = developerSignalsData; // Load directly from JSON import
    this.interopData = interopData; // Load directly from JSON import
    this.mdnDocs = mdnDocsData; // Load directly from JSON import
    this.features = processFeatures(features, browsers, {
      developerSignals: this.developerSignals,
      interop: this.interopData,
      mdn: this.mdnDocs
    });
    this.selectedFeatures = new Set(); // Track selected features
    this.allFeatures = [...this.features]; // Store all processed features for filtering
    this.currentStatusFilter = null; // Track the current status filter
    this.scrollFAB = null; // Track the scroll FAB element
    this.scrollObserver = null; // Track the intersection observer

    this.initEventListeners();
    this.attachInteractivityToStaticHTML();
    this.initializeFiltersFromURL();
  }

  attachInteractivityToStaticHTML() {
    // Attach click handlers to browser tags for filtering
    document.querySelectorAll('.browser-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = tag.classList.contains('active-filter');
        const filterKey = tag.getAttribute('data-filter');

        if (isActive) {
          document.querySelectorAll(`.browser-tag[data-filter="${filterKey}"]`).forEach(matchingTag => {
            matchingTag.classList.remove('active-filter');
            matchingTag.setAttribute('aria-pressed', 'false');
          });
        } else {
          document.querySelectorAll(`.browser-tag[data-filter="${filterKey}"]`).forEach(matchingTag => {
            matchingTag.classList.add('active-filter');
            matchingTag.setAttribute('aria-pressed', 'true');
          });
        }
        this.updateFeatureVisibility();
      });

      tag.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          tag.click();
        }
      });
    });

    // Attach click handlers to interop tags
    document.querySelectorAll('.interop-tag').forEach(tag => {
      tag.addEventListener('click', (e) => {
        e.stopPropagation();
        const isActive = tag.classList.contains('active-filter');
        const filterKey = tag.getAttribute('data-filter');
        const hasAnyInteropFilter = this.url.searchParams.getAll('interop').includes('any');

        if (isActive) {
          document.querySelectorAll(`.interop-tag[data-filter="${filterKey}"]`).forEach(matchingTag => {
            matchingTag.classList.remove('active-filter');
            matchingTag.setAttribute('aria-pressed', 'false');
          });
        } else {
          if (hasAnyInteropFilter) {
            this.url.searchParams.delete('interop');
            document.querySelectorAll('[data-interop-any]').forEach(card => {
              card.removeAttribute('data-interop-any');
            });
            window.history.replaceState({}, '', this.url);
          }
          document.querySelectorAll(`.interop-tag[data-filter="${filterKey}"]`).forEach(matchingTag => {
            matchingTag.classList.add('active-filter');
            matchingTag.setAttribute('aria-pressed', 'true');
          });
        }
        this.updateURLWithFilters();
        this.updateFeatureVisibility();
      });

      tag.addEventListener('keydown', (e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          tag.click();
        }
      });
    });

    // Attach expand/collapse handlers to feature cards
    document.querySelectorAll('.feature-top-row').forEach(topRow => {
      topRow.addEventListener('click', (event) => {
        if (event.target.tagName === 'A' ||
          event.target.closest('a') ||
          (event.target.tagName === 'IMG' && event.target.closest('a'))) {
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
      });
    });

    // Handle hash navigation for deep linking
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
      } else if (targetId.startsWith('feature-')) {
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

    // Add click handler for widely-available links
    document.addEventListener('click', (event) => {
      if (event.target.classList.contains('widely-available-link') ||
        event.target.closest('.widely-available-link')) {
        const link = event.target.classList.contains('widely-available-link') ?
          event.target : event.target.closest('.widely-available-link');

        if (this.currentStatusFilter) {
          this.filterFeaturesByType(this.currentStatusFilter);
        }
        if (this.url.searchParams.get('predictions') === 'false') {
          this.filterPredictedFeatures();
        }

        const targetId = link.dataset.targetId;
        if (targetId) {
          const targetCard = document.getElementById(targetId);
          if (targetCard) {
            this.scrollToAndExpandCard(targetCard);
          }
        }
      }
    });

    // Create scroll to current month FAB with current or most recent past visible month
    this.updateScrollTarget();
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

  // Method to update the visibility of feature cards based on active filters and prediction visibility
  updateFeatureVisibility() {
    const activeFilters = getFiltersFromDOM(
      this.currentStatusFilter,
      this.url.searchParams.get('predictions') !== 'false'
    );

    this.allFeatures.forEach(feature => {
      const isVisible = shouldDisplayFeature(feature, activeFilters);
      // Construct ID: feature-{id}-{displayType}
      // Note: displayType is set in processFeatures (e.g. 'newly-available', 'widely-available', 'limited-availability')
      const cardId = `feature-${feature.id}-${feature.displayType}`;
      const card = document.getElementById(cardId);

      if (card) {
        card.style.display = isVisible ? '' : 'none';
      }
    });

    // Hide date headers with no visible cards
    this.updateDateHeadersVisibility();

    // Update URL parameters to reflect current filter state
    this.updateURLWithFilters();
  }

  // Method to filter features by interop
  filterInteropFeatures() {
    const currentInteropFilter = this.url.searchParams.get('interop');

    // If 'any' is already active, toggle it off
    if (currentInteropFilter === 'any') {
      // Remove the "any" interop filter
      this.url.searchParams.delete('interop');

      // Update the URL without reloading the page
      updateHistory(this.url);

      // Update feature visibility with all active filters
      this.updateFeatureVisibility();
      return;
    }

    // Don't reset any active status filters - preserve them

    // Don't reset any active browser filters - preserve them

    // Reset any active interop filters first
    // (to prevent conflicts with the "any" interop filter)
    document.querySelectorAll('.interop-tag.active-filter').forEach(tag => {
      tag.classList.remove('active-filter');
      tag.setAttribute('aria-pressed', 'false');
    });

    // Create a special "any" interop filter data attribute on all feature cards
    const allCards = document.querySelectorAll('.feature-card');
    allCards.forEach(card => {
      // Check if this card has any interop data attribute
      const hasInterop = Array.from(card.attributes)
        .some(attr => attr.name.startsWith('data-interop-'));

      if (hasInterop) {
        // Set a special data attribute for filtering
        card.setAttribute('data-interop-any', 'true');
      } else {
        // Remove the attribute if it exists
        card.removeAttribute('data-interop-any');
      }
    });

    // Add the "any" interop filter
    this.url.searchParams.delete('interop'); // Remove any specific interop year filters
    this.url.searchParams.set('interop', 'any'); // Add the "any" filter

    // Update the URL without reloading the page
    updateHistory(this.url);

    // Update feature visibility with all active filters
    this.updateFeatureVisibility();
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
    const activeFilters = getFiltersFromDOM(
      this.currentStatusFilter,
      this.url.searchParams.get('predictions') !== 'false'
    );
    this.url = createURLFromFilters(this.url, activeFilters);
    updateHistory(this.url);
  }

  // Initialize filters from URL parameters
  initializeFiltersFromURL() {
    const filters = getFiltersFromURL(this.url);

    // Apply filters to DOM
    applyFiltersToDOM(filters);

    // Apply status filter
    if (filters.status) {
      this.currentStatusFilter = filters.status;
    }

    // Update visibility if any filters are applied
    if (filters.browsers.length > 0 || filters.interop.length > 0 || filters.status || filters.showPredictions === false) {
      this.updateFeatureVisibility();
      this.updateScrollTarget();
    }
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
    const featureId = `${feature.id}-${feature.displayType}`;
    if (this.selectedFeatures.has(featureId)) {
      this.selectedFeatures.delete(featureId);
    } else {
      this.selectedFeatures.add(featureId);
    }
    this.updateSelectionUI();
  }

  isFeatureSelected(feature) {
    const featureId = `${feature.id}-${feature.displayType}`;
    return this.selectedFeatures.has(featureId);
  }

  updateSelectionUI() {
    // Update all feature cards to show selection state
    document.querySelectorAll('.feature-card').forEach(card => {
      const feature = card.featureData;
      if (feature) {
        if (this.isFeatureSelected(feature)) {
          card.classList.add('selected');
        } else {
          card.classList.remove('selected');
        }
      }
    });

    // Update download button text to show selection count
    const selectedCount = this.selectedFeatures.size;
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
      if (card && card.featureData) {
        const feature = card.featureData;
        if (this.isFeatureSelected(feature)) {
          btn.innerHTML = '✅ Remove from Calendar';
        } else {
          btn.innerHTML = '📅 Add to Calendar';
        }
      }
    });
  }

  getSelectedFeatures() {
    if (this.selectedFeatures.size === 0) {
      return this.features; // Return all features if none selected
    }

    return this.features.filter(feature => {
      const featureId = `${feature.id}-${feature.displayType}`;
      return this.selectedFeatures.has(featureId);
    });
  }

  // Filter features by type (widely-available, newly-available, limited-availability)
  filterFeaturesByType(type) {
    // Check if we're toggling the same filter
    if (this.currentStatusFilter === type) {
      // Toggle off the filter
      this.currentStatusFilter = null;
    } else {
      // Set the new filter
      this.currentStatusFilter = type;
    }

    window.history.replaceState({}, '', this.url);
    this.updateFeatureVisibility();
  }

  // Reset all filters and show all features
  resetFilters(resetBrowserFilters = true) {
    // Reset status filter
    this.currentStatusFilter = null;

    // If requested, also reset browser filters
    if (resetBrowserFilters) {
      document.querySelectorAll('.browser-tag.active-filter').forEach(tag => {
        tag.classList.remove('active-filter');
        tag.setAttribute('aria-pressed', 'false');
      });
    }

    // Always reset interop filters
    document.querySelectorAll('.interop-tag.active-filter').forEach(tag => {
      tag.classList.remove('active-filter');
      tag.setAttribute('aria-pressed', 'false');
    });

    // Clear the 'any' interop filter from URL if present
    if (this.url.searchParams.has('interop')) {
      this.url.searchParams.delete('interop');

      // Also clean up the special 'any' interop data attribute
      document.querySelectorAll('[data-interop-any]').forEach(card => {
        card.removeAttribute('data-interop-any');
      });
    }

    this.url.searchParams.delete('predictions');

    // Show all feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
      card.style.display = 'block';
    });

    window.history.replaceState({}, '', this.url);

    // Update date headers visibility
    this.updateDateHeadersVisibility();

    // Update URL to remove filters
    this.updateURLWithFilters();
  }

  // Toggle prediction visibility
  filterPredictedFeatures() {
    if (this.url.searchParams.get('predictions') === 'false') {
      this.url.searchParams.delete('predictions');
    } else {
      this.url.searchParams.set('predictions', 'false');
    }

    // Update the URL without reloading the page
    window.history.replaceState({}, '', this.url);
    this.updateFeatureVisibility();
  }

  // Filter to show only deprecated (discouraged) features
  filterDeprecatedFeatures() {
    // Check if we're toggling the same filter
    if (this.currentStatusFilter === 'discouraged') {
      // Toggle off the filter
      this.currentStatusFilter = null;
      this.resetFilters(false); // Don't reset browser filters
    } else {
      // Set the new filter
      this.currentStatusFilter = 'discouraged';

      // Get all feature cards
      const allCards = document.querySelectorAll('.feature-card');

      allCards.forEach(card => {
        let shouldDisplay = card.classList.contains('discouraged');

        // Apply visibility
        card.style.display = shouldDisplay ? '' : 'none';
      });

      // Hide date headers with no visible cards
      this.updateDateHeadersVisibility();

      // Update URL parameters to reflect current filter state
      this.updateURLWithFilters();
    }
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
