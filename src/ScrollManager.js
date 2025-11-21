export class ScrollManager {
  constructor() {
    this.scrollFAB = null;
    this.scrollObserver = null;
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
