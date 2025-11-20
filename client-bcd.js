import { browsers, bcdKeys } from './bcd-data.js';
import developerSignalsData from '../developer-signals.json' with { type: "json" };
import interopData from '../interop.json' with { type: "json" };
import mdnDocsData from '../mdn.json' with { type: "json" };
import { processBcdKeys } from './src/data-processor.js';
import { setupShortcuts, setupShortcutsDialog } from './src/shortcuts.js';
class BcdTimelineApp {
  constructor() {
    this.url = new URL(window.location);
    this.timelineContent = document.querySelector('#timeline-content');
    this.developerSignals = developerSignalsData;
    this.interopData = interopData;
    this.mdnDocs = mdnDocsData;
    this.bcdKeys = processBcdKeys(bcdKeys, browsers, {
      developerSignals: this.developerSignals,
      interop: this.interopData,
      mdn: this.mdnDocs
    });
    this.allKeys = [...this.bcdKeys];
    this.currentStatusFilter = null;
    this.scrollFAB = null;
    this.scrollObserver = null;

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

      if (hasNewlyAvailable || hasWidelyAvailable) {
        const element = document.getElementById(targetId);
        if (element) {
          this.scrollToAndExpandCard(element);
        }
      } else if (targetId.startsWith('bcd-')) {
        const baseKeyId = targetId.split('-newly-available')[0].split('-widely-available')[0];
        const newlyAvailableId = `${baseKeyId}-newly-available`;
        const newlyAvailableElement = document.getElementById(newlyAvailableId);

        if (newlyAvailableElement) {
          this.scrollToAndExpandCard(newlyAvailableElement);
        } else {
          const widelyAvailableId = `${baseKeyId}-widely-available`;
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

        const targetId = link.dataset.targetId || link.getAttribute('href').substring(1);
        if (targetId) {
          const targetCard = document.getElementById(targetId);
          if (targetCard) {
            this.scrollToAndExpandCard(targetCard);
          }
        }
      }
    });

    this.updateScrollTarget();
  }

  updateScrollTarget() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const visibleMonths = Array.from(document.querySelectorAll('.date-group:not([style*="display: none"])'));
    
    const monthMap = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    
    let targetMonth = null;
    
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
    
    if (!targetMonth && visibleMonths.length > 0) {
      targetMonth = visibleMonths[0];
    }
    
    if (this.scrollFAB) {
      this.scrollFAB.remove();
      this.scrollFAB = null;
    }
    
    if (this.scrollObserver) {
      this.scrollObserver.disconnect();
      this.scrollObserver = null;
    }
    
    if (targetMonth) {
      this.createScrollToCurrentMonthFAB(targetMonth);
    }
  }



  initEventListeners() {
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

  updateFeatureVisibility() {
    const activeBrowserFilters = Array.from(document.querySelectorAll('.browser-tag.active-filter'))
      .map(tag => tag.getAttribute('data-filter'));

    const activeInteropFilters = Array.from(document.querySelectorAll('.interop-tag.active-filter'))
      .map(tag => tag.getAttribute('data-filter'))
      .map(filter => filter.split(':')[1]);

    const hasAnyInteropFilter = this.url.searchParams.getAll('interop').includes('any');

    const allInteropFilters = hasAnyInteropFilter
      ? [...activeInteropFilters, 'any']
      : activeInteropFilters;

    const allCards = document.querySelectorAll('.feature-card');

    allCards.forEach(card => {
      let shouldDisplay = true;

      if (activeBrowserFilters.length > 0) {
        const matchesAllBrowserFilters = activeBrowserFilters.every(filter => {
          const [browser, version] = filter.split(':');
          return card.hasAttribute(`data-browser-${browser}-${version}`);
        });

        if (!matchesAllBrowserFilters) {
          shouldDisplay = false;
        }
      }

      if (shouldDisplay && allInteropFilters.length > 0) {
        if (allInteropFilters.includes('any')) {
          const hasInterop = Array.from(card.attributes)
            .some(attr => attr.name.startsWith('data-interop-'));

          if (!hasInterop) {
            shouldDisplay = false;
          }
        } else {
          const matchesAnyInteropFilter = allInteropFilters.some(year => {
            return card.hasAttribute(`data-interop-${year}`);
          });

          if (!matchesAnyInteropFilter) {
            shouldDisplay = false;
          }
        }
      }

      if (shouldDisplay && this.url.searchParams.get('predictions') === 'false') {
        if (card.classList.contains('prediction')) {
          shouldDisplay = false;
        }
      }

      if (shouldDisplay && this.currentStatusFilter) {
        if (this.currentStatusFilter === 'limited-availability') {
          if (!card.classList.contains('limited-availability')) {
            shouldDisplay = false;
          }
        } else if (this.currentStatusFilter === 'discouraged') {
          if (!card.classList.contains('discouraged')) {
            shouldDisplay = false;
          }
        } else if (this.currentStatusFilter === 'predictions') {
          if (!card.classList.contains('prediction')) {
            shouldDisplay = false;
          }
        } else if (!card.classList.contains(this.currentStatusFilter)) {
          shouldDisplay = false;
        }
      }

      card.style.display = shouldDisplay ? '' : 'none';
    });

    this.updateDateHeadersVisibility();
    this.updateURLWithFilters();
  }

  filterInteropFeatures() {
    const currentInteropFilter = this.url.searchParams.get('interop');

    if (currentInteropFilter === 'any') {
      this.url.searchParams.delete('interop');
      window.history.replaceState({}, '', this.url);
      this.updateFeatureVisibility();
      return;
    }

    document.querySelectorAll('.interop-tag.active-filter').forEach(tag => {
      tag.classList.remove('active-filter');
      tag.setAttribute('aria-pressed', 'false');
    });

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

    this.url.searchParams.delete('interop');
    this.url.searchParams.set('interop', 'any');
    window.history.replaceState({}, '', this.url);
    this.updateFeatureVisibility();
  }

  updateDateHeadersVisibility() {
    const dateGroups = document.querySelectorAll('.date-group');

    dateGroups.forEach(group => {
      const hasVisibleCards = Array.from(group.querySelectorAll('.feature-card'))
        .some(card => card.style.display !== 'none');

      group.style.display = hasVisibleCards ? '' : 'none';
    });
  }

  updateURLWithFilters() {
    this.url.searchParams.delete('browser');
    this.url.searchParams.delete('status');
    this.url.searchParams.delete('interop');

    const activeBrowserFilters = Array.from(document.querySelectorAll('.browser-tag.active-filter'))
      .map(tag => tag.getAttribute('data-filter'));

    const uniqueBrowserFilters = [...new Set(activeBrowserFilters)];

    if (uniqueBrowserFilters.length > 0) {
      uniqueBrowserFilters.forEach(filter => {
        this.url.searchParams.append('browser', filter);
      });
    }

    const activeInteropFilters = Array.from(document.querySelectorAll('.interop-tag.active-filter'))
      .map(tag => tag.getAttribute('data-filter'))
      .map(filter => filter.split(':')[1]);

    if (activeInteropFilters.length > 0) {
      const uniqueInteropFilters = [...new Set(activeInteropFilters)];

      uniqueInteropFilters.forEach(year => {
        this.url.searchParams.append('interop', year);
      });
    } else {
      const allCards = document.querySelectorAll('.feature-card');
      const anyInteropFilterActive = Array.from(allCards).some(card => {
        return card.hasAttribute('data-interop-any');
      });

      if (anyInteropFilterActive) {
        this.url.searchParams.set('interop', 'any');
      }
    }

    if (this.currentStatusFilter) {
      this.url.searchParams.set('status', this.currentStatusFilter);
    } else {
      this.url.searchParams.delete('status');
    }

    window.history.replaceState({}, '', this.url);
  }

  initializeFiltersFromURL() {
    const browserFilters = this.url.searchParams.getAll('browser');
    if (browserFilters.length > 0) {
      browserFilters.forEach(filter => {
        document.querySelectorAll(`.browser-tag[data-filter="${filter}"]`).forEach(tag => {
          tag.classList.add('active-filter');
          tag.setAttribute('aria-pressed', 'true');
        });
      });
    }

    const interopFilters = this.url.searchParams.getAll('interop');
    if (interopFilters.length > 0) {
      interopFilters.forEach(year => {
        if (year !== 'any') {
          document.querySelectorAll(`.interop-tag[data-filter="interop:${year}"]`).forEach(tag => {
            tag.classList.add('active-filter');
            tag.setAttribute('aria-pressed', 'true');
          });
        }
      });
    }

    const predictionsFilter = this.url.searchParams.get('predictions');
    const statusFilter = this.url.searchParams.get('status');
    if (statusFilter) {
      this.currentStatusFilter = statusFilter;
    }

    if (browserFilters.length > 0 || interopFilters.length > 0 || statusFilter || predictionsFilter) {
      this.updateFeatureVisibility();
      this.updateScrollTarget();
    }
  }

  scrollToAndExpandCard(card) {
    setTimeout(() => {
      if (!card) return;

      const topRow = card.querySelector('.feature-top-row');
      const details = card.querySelector('.feature-details');

      if (topRow && details) {
        card.setAttribute('data-scroll-target', 'true');

        if (details.style.display === 'none') {
          details.style.display = 'block';
          details.style.opacity = '0';
          topRow.setAttribute('aria-expanded', 'true');
          card.classList.add('expanded');

          void card.offsetHeight;

          const headerHeight = 80;
          const extraPadding = 20;
          const targetPosition = card.getBoundingClientRect().top + window.pageYOffset - headerHeight - extraPadding;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          setTimeout(() => {
            details.style.transition = 'opacity 0.3s ease';
            details.style.opacity = '1';
          }, 100);
        } else {
          const headerHeight = 80;
          const extraPadding = 20;
          const targetPosition = card.getBoundingClientRect().top + window.pageYOffset - headerHeight - extraPadding;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }

        setTimeout(() => {
          card.removeAttribute('data-scroll-target');
        }, 1000);
      }
    }, 100);
  }

  createScrollToCurrentMonthFAB(currentMonthElement) {
    if (!currentMonthElement) return;

    const fab = document.createElement('button');
    fab.className = 'scroll-to-current-month-fab';
    
    this.scrollFAB = fab;

    const now = new Date();
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'short' });
    const currentYear = now.getFullYear();

    fab.innerHTML = `
      <span class="fab-icon">📅</span>
      <span class="fab-text">Scroll to current month</span>
    `;

    fab.title = `Go to ${currentMonthName} ${currentYear}`;
    fab.setAttribute('aria-label', `Go to ${currentMonthName} ${currentYear}`);

    fab.addEventListener('click', () => {
      currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const rect = currentMonthElement.getBoundingClientRect();
    const isInView = rect.top >= 80 && rect.top <= window.innerHeight;
    
    if (isInView) {
      fab.classList.add('hidden');
    } else {
      fab.classList.remove('hidden');
    }

    document.body.appendChild(fab);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.15) {
          fab.classList.add('hidden');
        } else {
          fab.classList.remove('hidden');
        }
      });
    }, { 
      rootMargin: '-80px 0px',
      threshold: [0, 0.15, 0.3]
    });

    this.scrollObserver = observer;
    observer.observe(currentMonthElement);
  }

  filterFeaturesByType(type) {
    if (this.currentStatusFilter === type) {
      this.currentStatusFilter = null;
    } else {
      this.currentStatusFilter = type;
    }

    window.history.replaceState({}, '', this.url);
    this.updateFeatureVisibility();
  }

  resetFilters(resetBrowserFilters = true) {
    this.currentStatusFilter = null;

    if (resetBrowserFilters) {
      document.querySelectorAll('.browser-tag.active-filter').forEach(tag => {
        tag.classList.remove('active-filter');
        tag.setAttribute('aria-pressed', 'false');
      });
    }

    document.querySelectorAll('.interop-tag.active-filter').forEach(tag => {
      tag.classList.remove('active-filter');
      tag.setAttribute('aria-pressed', 'false');
    });

    if (this.url.searchParams.has('interop')) {
      this.url.searchParams.delete('interop');

      document.querySelectorAll('[data-interop-any]').forEach(card => {
        card.removeAttribute('data-interop-any');
      });
    }

    this.url.searchParams.delete('predictions');

    document.querySelectorAll('.feature-card').forEach(card => {
      card.style.display = 'block';
    });

    window.history.replaceState({}, '', this.url);
    this.updateDateHeadersVisibility();
    this.updateURLWithFilters();
  }

  filterPredictedFeatures() {
    if (this.url.searchParams.get('predictions') === 'false') {
      this.url.searchParams.delete('predictions');
    } else {
      this.url.searchParams.set('predictions', 'false');
    }

    window.history.replaceState({}, '', this.url);
    this.updateFeatureVisibility();
  }

  filterDeprecatedFeatures() {
    if (this.currentStatusFilter === 'discouraged') {
      this.currentStatusFilter = null;
      this.resetFilters(false);
    } else {
      this.currentStatusFilter = 'discouraged';

      const allCards = document.querySelectorAll('.feature-card');

      allCards.forEach(card => {
        let shouldDisplay = card.classList.contains('discouraged');
        card.style.display = shouldDisplay ? '' : 'none';
      });

      this.updateDateHeadersVisibility();
      this.updateURLWithFilters();
    }
  }

  scrollToCurrentMonth() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    const visibleMonths = Array.from(document.querySelectorAll('.date-group:not([style*="display: none"])'));
    
    const monthMap = {
      'january': 0, 'february': 1, 'march': 2, 'april': 3,
      'may': 4, 'june': 5, 'july': 6, 'august': 7,
      'september': 8, 'october': 9, 'november': 10, 'december': 11
    };
    
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
    
    if (visibleMonths.length > 0) {
      visibleMonths[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function parseLocalDate(dateString) {
  if (!dateString) return;
  if (dateString instanceof Date) return new Date(dateString);
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

const app = new BcdTimelineApp();

if (!window.location.hash) {
  window.addEventListener('DOMContentLoaded', () => {
    app.scrollToCurrentMonth();
  });
}
