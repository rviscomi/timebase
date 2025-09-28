import { browsers, features } from './data.js';
import { downloadICal } from './ical-generator.js';
import developerSignalsData from './developer-signals.json' with { type: "json" };
import interopData from './interop.json' with { type: "json" };
import mdnDocsData from './mdn.json' with { type: "json" };

class TimelineApp {
  constructor() {
    this.url = new URL(window.location);
    this.timelineContent = document.querySelector('.timeline-content');
    this.developerSignals = developerSignalsData; // Load directly from JSON import
    this.interopData = interopData; // Load directly from JSON import
    this.mdnDocs = mdnDocsData; // Load directly from JSON import
    this.features = this.processFeatures();;
    this.selectedFeatures = new Set(); // Track selected features
    this.allFeatures = [...this.features]; // Store all processed features for filtering
    this.currentStatusFilter = null; // Track the current status filter

    this.renderTimeline();
    this.initEventListeners();
    this.initializeFiltersFromURL();
  }

  processFeatures() {
    const processedFeatures = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999);

    Object.entries(features).forEach(([id, data]) => {
      // Skip non-feature kinds (moved or split)
      if (data.kind && data.kind !== 'feature') {
        return;
      }

      // Get all ship dates from browsers
      const shipDates = Object.entries(data.status?.support || {}).map(([browser, version]) => {
        // Skip if version is not a string (some might be objects with more complex support info)
        if (typeof version !== 'string') {
          return null;
        }
        // Handle preview versions specially
        if (version === 'preview') {
          // For preview versions, we create an entry with null date
          return {
            date: lastDay,
            browser,
            version: 'preview',
            isPreview: true
          };
        }
        // Clean up the version number
        const cleanVersion = version.replace('≤', '');
        // Find the release date from browsers data
        const browserData = browsers[browser];
        if (!browserData?.releases) {
          return null;
        }
        // Find the matching release
        const release = browserData.releases.find(r => r.version === cleanVersion);
        if (!release) {
          return null;
        }
        return {
          date: release.date ? parseLocalDate(release.date) : null,
          browser,
          version: cleanVersion,
          isPreview: false
        };
      }).filter(item => item !== null);

      if (!shipDates.length) return;
      shipDates.sort((a,b) => {
        return a - b;
      });

      // Create the base feature object
      const baseFeature = {
        id,
        name: data.name || id,
        description: data.description,
        description_html: data.description_html || data.description,
        discouraged: data.discouraged,
        spec: data.spec,
        status: data.status,
        shipDates: shipDates,
        developerSignal: this.developerSignals?.[id],
        interop: this.interopData?.[id]
      };

      baseFeature.status.baseline_low_date = parseLocalDate(data.status.baseline_low_date);

      if (data.status.baseline === false) {
        processedFeatures.push({
          ...baseFeature,
          date: shipDates[0].date,
          prediction: shipDates[0].date > now,
          displayType: 'limited-availability',
          displayName: 'Limited availability'
        });
        return;
      }

      if (data.status.baseline === 'high') {
        baseFeature.status.baseline_high_date = parseLocalDate(data.status.baseline_high_date);
      } else {
        baseFeature.status.baseline_high_date = parseLocalDate(data.status.baseline_low_date);
        baseFeature.status.baseline_high_date.setMonth(baseFeature.status.baseline_low_date.getMonth() + 30);
      }
      
      processedFeatures.push({
        ...baseFeature,
        date: baseFeature.status.baseline_low_date,
        prediction: baseFeature.status.baseline_low_date > now,
        displayType: 'newly-available',
        displayName: 'Newly available'
      });

      processedFeatures.push({
        ...baseFeature,
        date: baseFeature.status.baseline_high_date,
        prediction: data.status.baseline === 'low',
        displayType: 'widely-available',
        displayName: 'Widely available'
      });
    });

    return processedFeatures
      .filter(feature => {
        if (!feature) {
          return false;
        }
        if (!feature.date) {
          return false;
        }
        if (isNaN(feature.date)) {
          return false;
        }
        return true;
      })
      .sort((a, b) => b.date - a.date);
  }

  groupFeaturesByDate() {
    const groups = {};
    this.features.forEach(feature => {
      // Skip features without a valid date
      if (!feature.date || !(feature.date instanceof Date)) {
        return;
      }
      const year = feature.date.getFullYear();
      const month = feature.date.getMonth();
      const key = `${year}-${month}`;
      if (!groups[key]) {
        groups[key] = {
          date: new Date(year, month, 1),
          features: []
        };
      }
      groups[key].features.push(feature);
    });
    return Object.values(groups).sort((a, b) => b.date - a.date);
  }

  createDateHeader(date) {
    const header = document.createElement('div');
    header.className = 'date-header';

    // Create the month text
    const monthText = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    });

    // Create a link to this month
    const monthName = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    const anchorId = `${monthName}-${date.getFullYear()}`;
    const monthLink = document.createElement('a');
    monthLink.href = `#${anchorId}`;
    monthLink.className = 'date-link';
    monthLink.textContent = monthText;
    monthLink.title = `Link to ${monthText}`;

    // Add a link icon
    const linkIcon = document.createElement('span');
    linkIcon.className = 'link-icon';
    linkIcon.innerHTML = '🔗';
    linkIcon.style.fontSize = '0.8em';
    linkIcon.style.marginLeft = '0.5em';
    linkIcon.style.opacity = '0';
    linkIcon.style.transition = 'opacity 0.2s ease';

    // Show the link icon on hover
    header.addEventListener('mouseenter', () => {
      linkIcon.style.opacity = '0.6';
    });
    header.addEventListener('mouseleave', () => {
      linkIcon.style.opacity = '0';
    });

    monthLink.appendChild(linkIcon);
    header.appendChild(monthLink);

    return header;
  }

  // Helper method to generate a link to a specific month
  getMonthLink(date) {
    const monthName = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    const year = date.getFullYear();
    return `#${monthName}-${year}`;
  }

  createBrowserTag(browser, version) {
    const tag = document.createElement('button'); // Change to button for better accessibility
    tag.className = `browser-tag ${browser}`;
    tag.type = 'button'; // Specify button type
    tag.setAttribute('data-browser', browser);
    tag.setAttribute('data-version', version);
    tag.setAttribute('data-filter', `${browser}:${version}`);
    tag.setAttribute('aria-pressed', 'false');

    // Get base browser name for logo
    const baseBrowser = browser.replace('_android', '').replace('_ios', '');

    const logo = document.createElement('img');
    logo.src = `images/${baseBrowser}.svg`;
    logo.alt = `${browser} logo`;
    logo.className = 'browser-logo';
    tag.appendChild(logo);

    // Create a single text span for version and platform
    const textSpan = document.createElement('span');

    // Start with just the version number
    let displayText = version;

    // Add platform information if applicable, but only if browser includes platform info
    // This ensures that if we're using the base browser name (because all platforms have same version),
    // we won't add platform info
    if (browser.includes('_')) {
      const platform = browser.split('_')[1];

      // Special case for iOS to ensure proper capitalization
      if (platform.toLowerCase() === 'ios') {
        displayText += ' (iOS)';
      } else {
        displayText += ` (${platform.charAt(0).toUpperCase() + platform.slice(1)})`;
      }
    }

    textSpan.textContent = displayText;

    tag.appendChild(textSpan);

    // Function to toggle the filter
    const toggleFilter = () => {
      const isActive = tag.classList.contains('active-filter');
      const filterKey = tag.getAttribute('data-filter');

      if (isActive) {
        // If untoggling, also untoggle all chips with the same browser version
        document.querySelectorAll(`.browser-tag[data-filter="${filterKey}"]`).forEach(matchingTag => {
          matchingTag.classList.remove('active-filter');
          matchingTag.setAttribute('aria-pressed', 'false');
        });
      } else {
        // When toggling on, also toggle all chips with the same browser version
        document.querySelectorAll(`.browser-tag[data-filter="${filterKey}"]`).forEach(matchingTag => {
          matchingTag.classList.add('active-filter');
          matchingTag.setAttribute('aria-pressed', 'true');
        });
      }

      this.updateFeatureVisibility();
    };

    // Add click event listener for filtering
    tag.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card expansion when clicking the tag
      toggleFilter();
    });

    // Add keyboard event listener for filtering via spacebar
    tag.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); // Prevent scrolling with spacebar
        e.stopPropagation();
        toggleFilter();
      }
    });

    return tag;
  }

  createInteropTag(year) {
    const tag = document.createElement('button');
    tag.className = 'interop-tag';
    tag.type = 'button';
    tag.setAttribute('data-interop-year', year);
    tag.setAttribute('data-filter', `interop:${year}`);
    tag.setAttribute('aria-pressed', 'false');

    // Create text for the tag
    const textSpan = document.createElement('span');
    textSpan.textContent = `Interop ${year}`;
    tag.appendChild(textSpan);

    // Function to toggle the filter
    const toggleFilter = () => {
      const isActive = tag.classList.contains('active-filter');
      const filterKey = tag.getAttribute('data-filter');

      // Check if the 'any' interop filter is active in the URL
      const hasAnyInteropFilter = this.url.searchParams.getAll('interop').includes('any');

      if (isActive) {
        // If untoggling, also untoggle all chips with the same interop year
        document.querySelectorAll(`.interop-tag[data-filter="${filterKey}"]`).forEach(matchingTag => {
          matchingTag.classList.remove('active-filter');
          matchingTag.setAttribute('aria-pressed', 'false');
        });
      } else {
        // When toggling on, first check if 'any' filter is active
        if (hasAnyInteropFilter) {
          // Remove the 'any' filter from URL
          this.url.searchParams.delete('interop');

          // Also remove any data-interop-any attributes
          document.querySelectorAll('[data-interop-any]').forEach(card => {
            card.removeAttribute('data-interop-any');
          });

          window.history.replaceState({}, '', this.url);
        }

        // Then toggle all chips with the same interop year
        document.querySelectorAll(`.interop-tag[data-filter="${filterKey}"]`).forEach(matchingTag => {
          matchingTag.classList.add('active-filter');
          matchingTag.setAttribute('aria-pressed', 'true');
        });
      }

      // First update the URL with the new filter state
      this.updateURLWithFilters();

      // Then update feature visibility based on the new filters
      this.updateFeatureVisibility();
    };

    // Add click event listener for filtering
    tag.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card expansion when clicking the tag
      toggleFilter();
    });

    // Add keyboard event listener for filtering via spacebar
    tag.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); // Prevent scrolling with spacebar
        e.stopPropagation();
        toggleFilter();
      }
    });

    return tag;
  }

  createFeatureHeader(feature, uniqueCardId) {
    const header = document.createElement('div');
    header.className = 'feature-card-header';

    // Top row: baseline logo, feature name, browser support
    const topRow = document.createElement('div');
    topRow.className = 'feature-top-row';

    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';

    const title = document.createElement('h2');
    title.className = 'feature-title';

    // Add baseline support indicator based on display type
    const baseline = feature.status?.baseline;
    if (baseline !== undefined) {
      const baselineIcon = document.createElement('img');
      let iconName;
      let titleText;

      // First check if this is a limited availability feature
      if (baseline === false) {
        // For limited availability
        iconName = 'baseline-limited-icon.svg';
        if (feature.discouraged) {
          titleText = 'This feature is discouraged';
        } else {
          titleText = 'Limited availability across browsers';
        }
      }
      // Then prioritize the display type for non-limited features
      else if (feature.displayType === 'widely-available') {
        // For widely-available, always show the widely icon
        iconName = 'baseline-widely-icon.svg';
        titleText = `Baseline ${feature.displayName}`;
      } else if (feature.displayType === 'newly-available') {
        // For newly-available, always show the newly icon regardless of baseline value
        iconName = 'baseline-newly-icon.svg';
        titleText = `Baseline ${feature.displayName}`;
      }

      if (iconName) {
        baselineIcon.src = `images/${iconName}`;
        baselineIcon.alt = iconName.replace('baseline-', '').replace('-icon.svg', '') + ' support';
        baselineIcon.className = 'baseline-icon';
        baselineIcon.title = titleText;
        title.appendChild(baselineIcon);
      }
    }

    // Add feature name text after the baseline icon
    let featureName = feature.name;
    if (feature.prediction) {
      featureName = '🔮 ' + featureName;
    }
    const nameText = document.createElement('span');
    nameText.textContent = featureName;
    title.appendChild(nameText);

    // Add upvote info next to the feature name if available
    if (feature.developerSignal) {
      const upvoteInfo = document.createElement('div');
      upvoteInfo.className = 'upvote-info title-upvote';

      // Create a linked upvote count (the entire element is clickable)
      const upvoteLink = document.createElement('a');
      upvoteLink.href = feature.developerSignal.url;
      upvoteLink.className = 'upvote-count';
      upvoteLink.target = '_blank';
      upvoteLink.rel = 'noopener noreferrer';
      upvoteLink.innerHTML = `<span class="upvote-icon">👍</span> ${feature.developerSignal.votes}`;
      upvoteLink.title = 'Add your support for this feature on GitHub';

      // Add event to prevent card selection when clicking the button
      upvoteLink.addEventListener('click', (e) => {
        e.stopPropagation();
      });

      upvoteInfo.appendChild(upvoteLink);
      title.appendChild(upvoteInfo);
    }

    // Add a link icon for deep linking to this feature
    const linkIcon = document.createElement('a');
    linkIcon.href = `#${uniqueCardId}`;
    linkIcon.className = 'feature-link-icon';
    linkIcon.innerHTML = '🔗';

    // Use the correct display type in tooltip - check if it's a limited availability feature
    let displayTypeForTooltip = feature.displayName;
    if (feature.discouraged) {
      displayTypeForTooltip = 'discouraged';
    } else if (feature.status?.baseline === false) {
      displayTypeForTooltip = 'Limited availability';
    }
    linkIcon.title = `Link to ${feature.name} (${displayTypeForTooltip})`;

    linkIcon.style.fontSize = '0.8em';
    linkIcon.style.marginLeft = '0.5em';
    linkIcon.style.opacity = '0';
    linkIcon.style.transition = 'opacity 0.2s ease';
    linkIcon.style.textDecoration = 'none';

    // Show the link icon on hover
    title.addEventListener('mouseenter', () => {
      linkIcon.style.opacity = '0.6';
    });
    title.addEventListener('mouseleave', () => {
      linkIcon.style.opacity = '0';
    });

    title.appendChild(linkIcon);
    titleContainer.appendChild(title);

    // No longer adding a separate expand button
    // Instead, the entire top row will be clickable

    topRow.appendChild(titleContainer);
    header.appendChild(topRow);

    // Create details section (bottom row)
    const details = document.createElement('div');
    details.className = 'feature-details';
    details.style.display = 'none';

    // Format the date for display with full date (including day)
    const formattedDate = feature.date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Create availability info text based on display type
    let availabilityText = '';
    if (feature.displayType === 'limited-availability') {
      // Check if this is actually a limited availability feature
      if (feature.discouraged) {
        const authority = feature.discouraged.according_to.map(url => {
          const hostname = new URL(url).hostname;
          if (hostname == 'github.com') {
            // Use the repo name as the authority
            const repo = url.split('/').slice(-2).join('/');
            return `<a href="${url}" target="_blank">${repo}</a>`;
          }
          return `<a href="${url}" target="_blank">${hostname}</a>`;
        }).join(', ');
        availabilityText = `This feature is discouraged by ${authority}.`;
      } else if (feature.prediction) {
        availabilityText = `🔮 Expected to become Limited availability across browsers on ${formattedDate}.`;
      } else {
        availabilityText = `Limited availability across browsers since ${formattedDate}.`;
      }
    } else if (feature.displayType === 'newly-available') {
      const widelyFormattedDate = feature.status.baseline_high_date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

      // Create the widely available feature ID
      const widelyAvailableId = `feature-${feature.id}-widely-available`;
      // Create the newly available text with a link to the widely available entry
      // Use past tense if the widely available date is in the past
      if (feature.status.baseline === 'high') {
        availabilityText = `Newly available since ${formattedDate}. Became widely available on <a href="#${widelyAvailableId}" class="widely-available-link" data-target-id="${widelyAvailableId}">${widelyFormattedDate}</a>.`;
      } else if (feature.prediction) {
        availabilityText = `🔮 Expected to become newly available on ${formattedDate}. 🔮 Expected to become widely available on <a href="#${widelyAvailableId}" class="widely-available-link" data-target-id="${widelyAvailableId}">${widelyFormattedDate}</a>.`;
      } else {
        availabilityText = `Newly available since ${formattedDate}. 🔮 Expected to become widely available on <a href="#${widelyAvailableId}" class="widely-available-link" data-target-id="${widelyAvailableId}">${widelyFormattedDate}</a>.`;
      }
    } else if (feature.displayType === 'widely-available') {
      if (feature.prediction) {
        availabilityText = `🔮 Expected to become widely available on ${formattedDate}.`;
      } else {
        availabilityText = `Widely available since ${formattedDate}.`;
      }
    }

    // Add description if available
    if (feature.description_html) {
      const description = document.createElement('div');
      description.className = 'feature-description';

      // Use innerHTML with description_html for HTML formatting
      description.innerHTML = feature.description_html;
      details.appendChild(description);

      // Add availability info if it exists as a separate element
      if (availabilityText) {
        const availabilityInfo = document.createElement('div');
        availabilityInfo.className = 'availability-info-text';
        availabilityInfo.innerHTML = availabilityText; // Use innerHTML to render the link
        details.appendChild(availabilityInfo);
      }
    } else if (feature.description) {
      // Fallback to plain text description if HTML version is not available
      const description = document.createElement('div');
      description.className = 'feature-description';
      description.textContent = feature.description;
      details.appendChild(description);

      // Add availability info if it exists as a separate element
      if (availabilityText) {
        const availabilityInfo = document.createElement('div');
        availabilityInfo.className = 'availability-info-text';
        availabilityInfo.innerHTML = availabilityText; // Use innerHTML to render the link
        details.appendChild(availabilityInfo);
      }
    } else if (availabilityText) {
      // If there's no description but we have availability info, add it as the description
      const availabilityInfo = document.createElement('div');
      availabilityInfo.className = 'availability-info-text';
      availabilityInfo.innerHTML = availabilityText; // Use innerHTML to render the link
      details.appendChild(availabilityInfo);
    }

    // Add browser support table
    if (feature.shipDates && feature.shipDates.length > 0) {
      const supportTableContainer = document.createElement('div');
      supportTableContainer.className = 'browser-support-table-container';

      const supportTable = document.createElement('table');
      supportTable.className = 'browser-support-table';

      // Create table header
      const tableHeader = document.createElement('thead');
      const headerRow = document.createElement('tr');

      const browserHeader = document.createElement('th');
      browserHeader.textContent = 'Browser Version';
      headerRow.appendChild(browserHeader);

      const dateHeader = document.createElement('th');
      dateHeader.textContent = 'Release Date';
      headerRow.appendChild(dateHeader);

      tableHeader.appendChild(headerRow);
      supportTable.appendChild(tableHeader);

      // Create table body
      const tableBody = document.createElement('tbody');

      // Sort ship dates by browser name for consistent ordering
      const sortedShipDates = [...feature.shipDates].sort((a, b) => {
        // First sort by base browser name
        const baseA = a.browser.replace('_android', '').replace('_ios', '');
        const baseB = b.browser.replace('_android', '').replace('_ios', '');

        if (baseA !== baseB) {
          // Use our preferred browser order
          const browserOrder = ['chrome', 'edge', 'safari', 'firefox'];
          return browserOrder.indexOf(baseA) - browserOrder.indexOf(baseB);
        }

        // If same base browser, sort by platform (desktop first)
        const isPlatformA = a.browser.includes('_');
        const isPlatformB = b.browser.includes('_');

        if (isPlatformA !== isPlatformB) {
          return isPlatformA ? 1 : -1; // Desktop first
        }

        // If both are platform browsers, sort by platform name
        if (isPlatformA && isPlatformB) {
          const platformA = a.browser.split('_')[1];
          const platformB = b.browser.split('_')[1];
          return platformA.localeCompare(platformB);
        }

        return 0;
      });

      // Add rows for each browser
      sortedShipDates.forEach(shipDate => {
        const row = document.createElement('tr');

        // Browser cell with icon and name
        const browserCell = document.createElement('td');

        // Create a wrapper for browser cell content to fix border alignment
        const browserCellWrapper = document.createElement('div');
        browserCellWrapper.className = 'browser-cell-wrapper';

        const browserCellContent = document.createElement('div');
        browserCellContent.className = 'browser-cell';

        // Get base browser name for logo
        const baseBrowser = shipDate.browser.replace('_android', '').replace('_ios', '');

        // Create browser logo
        const logo = document.createElement('img');
        logo.src = `images/${baseBrowser}.svg`;
        logo.alt = `${baseBrowser} logo`;
        logo.className = 'browser-logo';
        browserCellContent.appendChild(logo);

        // Format browser name and version with platform all in one span
        let displayName = baseBrowser.charAt(0).toUpperCase() + baseBrowser.slice(1);
        let fullText = displayName + ' ' + shipDate.version;

        // Add platform information if applicable
        if (shipDate.browser.includes('_')) {
          const platform = shipDate.browser.split('_')[1];

          // Special case for iOS to ensure proper capitalization
          if (platform.toLowerCase() === 'ios') {
            fullText += ' (iOS)';
          } else {
            fullText += ` (${platform.charAt(0).toUpperCase() + platform.slice(1)})`;
          }
        }

        // Create a single span for all the text
        const textSpan = document.createElement('span');
        textSpan.textContent = fullText;
        browserCellContent.appendChild(textSpan);

        // Add the browser cell content to the wrapper, then to the cell
        browserCellWrapper.appendChild(browserCellContent);
        browserCell.appendChild(browserCellWrapper);
        row.appendChild(browserCell);

        // Date cell
        const dateCell = document.createElement('td');
        dateCell.className = 'date-cell';
        dateCell.textContent = shipDate.date ? shipDate.date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'TBD';
        row.appendChild(dateCell);

        tableBody.appendChild(row);
      });

      supportTable.appendChild(tableBody);
      supportTableContainer.appendChild(supportTable);
      details.appendChild(supportTableContainer);
    }

    // Add links container
    const linksContainer = document.createElement('div');
    linksContainer.className = 'feature-links';

    if (feature.status.baseline) {
      // Add "Add to calendar" button
      const addToCalendarBtn = document.createElement('button');
      addToCalendarBtn.className = 'add-to-calendar-btn';
      addToCalendarBtn.textContent = '📅 Add to Calendar';
      addToCalendarBtn.type = 'button';
      addToCalendarBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card expansion toggle
        this.toggleFeatureSelection(feature);
      });
      linksContainer.appendChild(addToCalendarBtn);
    }

    // Add spec link if available
    if (feature.spec) {
      const specLink = document.createElement('a');
      specLink.href = feature.spec;
      specLink.className = 'spec-link';
      specLink.textContent = 'Specification';
      specLink.target = '_blank';
      linksContainer.appendChild(specLink);
    }

    // Add webstatus.dev link
    const webstatusLink = document.createElement('a');
    webstatusLink.href = `https://webstatus.dev/features/${feature.id}`;
    webstatusLink.className = 'webstatus-link';
    webstatusLink.textContent = 'Web Status';
    webstatusLink.target = '_blank';
    linksContainer.appendChild(webstatusLink);

    // Add web-platform-dx.github.io link
    const webPlatformDxLink = document.createElement('a');
    webPlatformDxLink.href = `https://web-platform-dx.github.io/web-features-explorer/features/${feature.id}/`;
    webPlatformDxLink.className = 'web-platform-dx-link';
    webPlatformDxLink.textContent = 'Web Features Explorer';
    webPlatformDxLink.target = '_blank';
    linksContainer.appendChild(webPlatformDxLink);

    // Add MDN documentation links if available
    if (this.mdnDocs[feature.id]) {
      // Only include the first doc
      const mdnEntry = this.mdnDocs[feature.id][0];
      const mdnLink = document.createElement('a');
      mdnLink.href = mdnEntry.url;
      mdnLink.className = 'mdn-link';
      mdnLink.textContent = 'MDN';
      mdnLink.title = mdnEntry.title; // Add title as tooltip
      mdnLink.target = '_blank';
      linksContainer.appendChild(mdnLink);
    }

    details.appendChild(linksContainer);
    header.appendChild(details);

    // Make the top row clickable to toggle details
    topRow.style.cursor = 'pointer';
    topRow.setAttribute('aria-expanded', 'false');
    topRow.setAttribute('aria-controls', `details-${uniqueCardId}`);
    details.id = `details-${uniqueCardId}`;

    // Set up expand/collapse functionality on the top row
    topRow.addEventListener('click', (event) => {
      // Prevent clicks on links from toggling the card
      if (event.target.tagName === 'A' ||
        event.target.closest('a') ||
        (event.target.tagName === 'IMG' && event.target.closest('a'))) {
        return;
      }

      const isExpanded = details.style.display !== 'none';
      details.style.display = isExpanded ? 'none' : 'block';

      // Update accessibility attributes
      topRow.setAttribute('aria-expanded', !isExpanded);

      // Toggle the expanded class on the parent card for styling
      const card = header.closest('.feature-card');
      if (card) {
        if (isExpanded) {
          card.classList.remove('expanded');
        } else {
          card.classList.add('expanded');
        }
      }
    });

    return header;
  }

  createFeatureCard(feature) {
    const card = document.createElement('div');

    // Store feature data on the card for selection functionality
    card.featureData = feature;

    card.classList.add('feature-card');
    if (feature.prediction) {
      card.classList.add('prediction');
    }
    if (feature.discouraged) {
      card.classList.add('discouraged');
    } else if (feature.status?.baseline === false) {
      card.classList.add('limited-availability');
    } else {
      card.classList.add(feature.displayType);
    }

    // Create a unique ID that includes both the feature name and its display type
    // This ensures each instance (newly vs widely available) has a unique ID
    let cardType = feature.displayType;
    // Use 'limited-availability' in the ID for limited availability features instead of 'newly-available'
    if (feature.status?.baseline === false) {
      cardType = 'limited-availability';
    }
    const uniqueCardId = `feature-${feature.id}-${cardType}`;

    // Add a unique ID to the feature card for deep linking
    card.id = uniqueCardId;

    // Add data attributes for browser filtering
    if (feature.shipDates) {
      feature.shipDates.forEach(shipDate => {
        card.setAttribute(`data-browser-${shipDate.browser}-${shipDate.version}`, 'true');
      });
    }

    // Create header with title
    const header = this.createFeatureHeader(feature, uniqueCardId);

    // Process browser support info
    const browserReleases = this.processBrowserSupport(feature);

    // Add browser support tags to the top row
    const topRow = header.querySelector('.feature-top-row');
    const browserSupport = document.createElement('div');
    browserSupport.className = 'browser-support';

    // Add browser support tags in a specific order
    this.addBrowserTagsInOrder(browserSupport, browserReleases);

    // Add Interop tags if applicable
    if (feature.interop) {
      // Sort interop years by most recent first
      const interopYears = feature.interop.map(entry => entry.year).sort((a, b) => b - a);

      // Add the most recent interop year tag
      if (interopYears.length > 0) {
        const mostRecentYear = interopYears[0];

        // Create an interop tag
        const interopTag = this.createInteropTag(mostRecentYear);
        interopTag.title = `Part of Interop ${mostRecentYear}`;

        // Add data attribute for filtering
        card.setAttribute(`data-interop-${mostRecentYear}`, 'true');

        // Add the tag to browser support
        browserSupport.appendChild(interopTag);
      }
    }

    // Add browser support to the top row
    topRow.appendChild(browserSupport);

    // Add the header to the card
    card.appendChild(header);

    // For newly-available, only show if there was a new release this month
    if (feature.displayType === 'newly-available') {
      if (browserReleases.some(release => release.isRecent)) {
        return card;
      }
      return null;
    }

    // For widely-available, always show
    return card;
  }

  processBrowserSupport(feature) {
    const browserReleases = [];
    const processedBrowsers = new Set();

    // Create a map to track versions across platforms
    const browserVersionMap = new Map();

    // First collect all browser versions to identify which ones have the same version across platforms
    if (feature.shipDates) {
      feature.shipDates.forEach(shipDate => {
        const browser = shipDate.browser;
        const cleanVersion = shipDate.version;
        const baseBrowser = browser.replace('_android', '').replace('_ios', '');

        // Track versions by base browser name
        if (!browserVersionMap.has(baseBrowser)) {
          browserVersionMap.set(baseBrowser, {
            versions: new Map(),
            platforms: new Set()
          });
        }

        const browserData = browserVersionMap.get(baseBrowser);

        // Track if this is a platform variant (mobile)
        if (browser !== baseBrowser) {
          browserData.platforms.add(browser);
        }

        // Track this version
        if (!browserData.versions.has(cleanVersion)) {
          browserData.versions.set(cleanVersion, new Set());
        }

        // Add this browser to the set of browsers with this version
        browserData.versions.get(cleanVersion).add(browser);
      });
    }

    // Now process the shipDates again, but with knowledge of which versions are shared
    if (feature.shipDates) {
      feature.shipDates.forEach(shipDate => {
        const browser = shipDate.browser;
        const cleanVersion = shipDate.version;
        const releaseDate = shipDate.date;

        // For widely-available, we want to show all browsers
        // For newly-available, we only show browsers released in the current month
        // Preview versions (with null dates) are always shown
        const isInCurrentMonth =
          feature.displayType === 'widely-available' ||
          !releaseDate || // Include preview versions
          (releaseDate.getMonth() === feature.date.getMonth() &&
            releaseDate.getFullYear() === feature.date.getFullYear());

        // Get base browser name (without platform)
        const baseBrowser = browser.replace('_android', '').replace('_ios', '');

        // Skip if we already have this base browser (to avoid duplicates)
        if (processedBrowsers.has(baseBrowser)) {
          return;
        }

        processedBrowsers.add(baseBrowser);

        // Check if this version is shared across all platforms for this browser
        const browserData = browserVersionMap.get(baseBrowser);
        const browsersWithThisVersion = browserData.versions.get(cleanVersion);

        // If all platforms of this browser have the same version, use the base browser name
        const useBaseBrowserOnly = browserData.platforms.size > 0 &&
          [...browserData.platforms].every(platformBrowser =>
            browsersWithThisVersion.has(platformBrowser));

        browserReleases.push({
          browser: useBaseBrowserOnly ? baseBrowser : browser,
          baseBrowser,
          version: cleanVersion,
          date: releaseDate,
          isRecent: isInCurrentMonth,
          useBaseBrowserOnly
        });
      });
    }

    return browserReleases;
  }

  addBrowserTagsInOrder(container, browserReleases) {
    // Define browser order
    const browserOrder = ['chrome', 'edge', 'safari', 'firefox'];

    // Create a map for quick lookup
    const browserMap = {};
    browserReleases.forEach(release => {
      browserMap[release.baseBrowser] = release;
    });

    // Add browsers in the specified order
    browserOrder.forEach(browser => {
      if (browserMap[browser]) {
        const release = browserMap[browser];
        // Use the browser name determined in processBrowserSupport
        const tag = this.createBrowserTag(release.browser, release.version);

        // Add full info as tooltip
        const platform = release.browser.includes('_')
          ? release.browser.split('_')[1]
          : 'desktop';
        tag.title = `${release.baseBrowser} ${platform} ${release.version}`;

        if (release.isRecent) {
          tag.classList.add('recent-release');
        }

        container.appendChild(tag);
      }
    });
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

    // Set up keyboard shortcuts dialog
    this.initShortcutsDialog();

    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Only handle keypresses if no input element is focused
      const activeElement = document.activeElement;
      const isInputFocused = activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable;

      // Skip if an input is focused or if Cmd/Ctrl/Alt keys are pressed
      // (but allow Shift modifier for potential alternative shortcuts)
      if (isInputFocused || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'w': // Filter widely available features
          this.filterFeaturesByType('widely-available');
          break;
        case 'n': // Filter newly available features
          this.filterFeaturesByType('newly-available');
          break;
        case 'l': // Filter limited availability features
          this.filterFeaturesByType('limited-availability');
          break;
        case 'd': // Filter deprecated (discouraged) features
          this.filterDeprecatedFeatures();
          break;
        case 'c': // Scroll to current month
          this.scrollToCurrentMonth();
          break;
        case 'r': // Reset filters
          this.resetFilters();
          break;
        case 'i': // Filter features with interop tags
          this.filterInteropFeatures();
          break;
        case 'p': // Toggle predictions
          this.filterPredictedFeatures();
          break;
        case '?': // Show keyboard shortcuts dialog
          this.showShortcutsDialog();
          break;
      }
    });
  }

  // Initialize the keyboard shortcuts dialog
  initShortcutsDialog() {
    this.shortcutsDialog = document.getElementById('shortcuts-dialog');
    const closeShortcutsButton = document.getElementById('close-shortcuts');

    if (this.shortcutsDialog && closeShortcutsButton) {
      // Add click event to close button
      closeShortcutsButton.addEventListener('click', () => {
        this.shortcutsDialog.close();
      });

      // Close dialog when clicking on the backdrop (outside the dialog)
      this.shortcutsDialog.addEventListener('click', (e) => {
        if (e.target === this.shortcutsDialog) {
          this.shortcutsDialog.close();
        }
      });
    }
  }

  // Show the keyboard shortcuts dialog
  showShortcutsDialog() {
    if (this.shortcutsDialog && !this.shortcutsDialog.open) {
      this.shortcutsDialog.showModal();
    }
  }

  // Method to update the visibility of feature cards based on active filters and prediction visibility
  updateFeatureVisibility() {
    // Get all active filters
    const activeBrowserFilters = Array.from(document.querySelectorAll('.browser-tag.active-filter'))
      .map(tag => tag.getAttribute('data-filter'));

    const activeInteropFilters = Array.from(document.querySelectorAll('.interop-tag.active-filter'))
      .map(tag => tag.getAttribute('data-filter'))
      .map(filter => filter.split(':')[1]); // Extract year from 'interop:YYYY'

    // We now use the 'prediction' class and status filter for prediction visibility

    // Check if we have the special 'any' interop filter in the URL
    const hasAnyInteropFilter = this.url.searchParams.getAll('interop').includes('any');

    // If we have the 'any' filter, add it to our active filters
    const allInteropFilters = hasAnyInteropFilter
      ? [...activeInteropFilters, 'any']
      : activeInteropFilters;

    // Get all feature cards
    const allCards = document.querySelectorAll('.feature-card');

    allCards.forEach(card => {
      let shouldDisplay = true;

      // Check browser filters if there are any
      if (activeBrowserFilters.length > 0) {
        const matchesAllBrowserFilters = activeBrowserFilters.every(filter => {
          const [browser, version] = filter.split(':');
          return card.hasAttribute(`data-browser-${browser}-${version}`);
        });

        if (!matchesAllBrowserFilters) {
          shouldDisplay = false;
        }
      }

      // Check interop filters if there are any
      if (shouldDisplay && allInteropFilters.length > 0) {
        // Check if this is the special 'any' filter
        if (allInteropFilters.includes('any')) {
          // For 'any', check if the card has any interop attribute
          const hasInterop = Array.from(card.attributes)
            .some(attr => attr.name.startsWith('data-interop-'));

          if (!hasInterop) {
            shouldDisplay = false;
          }
        } else {
          // For specific years, check each one
          const matchesAnyInteropFilter = allInteropFilters.some(year => {
            return card.hasAttribute(`data-interop-${year}`);
          });

          if (!matchesAnyInteropFilter) {
            shouldDisplay = false;
          }
        }
      }

      // Check status filter if one is active
      if (shouldDisplay && this.currentStatusFilter) {
        if (this.currentStatusFilter === 'limited-availability') {
          // Special handling for limited availability features
          if (!card.classList.contains('limited-availability')) {
            shouldDisplay = false;
          }
        } else if (this.currentStatusFilter === 'discouraged') {
          // Special handling for deprecated (discouraged) features
          if (!card.classList.contains('discouraged')) {
            shouldDisplay = false;
          }
        } else if (this.currentStatusFilter === 'predictions') {
          // Hide anything that's not a prediction when status=predictions
          // (this is a special off-menu filter that isn't hooked up to any keyboard shortcuts)
          if (!card.classList.contains('prediction')) {
            shouldDisplay = false;
          }
        } else if (this.currentStatusFilter.type === 'predictions') {
          // Hide predicted features when predictions=false
          if (card.classList.contains('prediction')) {
            shouldDisplay = this.currentStatusFilter.value === 'true';
          }
        } else if (!card.classList.contains(this.currentStatusFilter)) {
          shouldDisplay = false;
        }
      }

      // Apply visibility
      card.style.display = shouldDisplay ? '' : 'none';
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
      url.searchParams.delete('interop');

      // Update the URL without reloading the page
      window.history.replaceState({}, '', this.url);

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
    window.history.replaceState({}, '', this.url);

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
    // Clear existing filter parameters
    this.url.searchParams.delete('browser');
    this.url.searchParams.delete('status');

    // We'll handle interop filters purely based on active tag elements
    // and completely clear any existing interop params
    this.url.searchParams.delete('interop');

    // Add browser filters - using Set to deduplicate
    const activeBrowserFilters = Array.from(document.querySelectorAll('.browser-tag.active-filter'))
      .map(tag => tag.getAttribute('data-filter'));

    // Deduplicate the filters
    const uniqueBrowserFilters = [...new Set(activeBrowserFilters)];

    if (uniqueBrowserFilters.length > 0) {
      uniqueBrowserFilters.forEach(filter => {
        this.url.searchParams.append('browser', filter);
      });
    }

    // Get active interop filters from tag elements
    const activeInteropFilters = Array.from(document.querySelectorAll('.interop-tag.active-filter'))
      .map(tag => tag.getAttribute('data-filter'))
      .map(filter => filter.split(':')[1]); // Extract year from 'interop:YYYY'

    // If we have specific year filters, add them to the URL
    if (activeInteropFilters.length > 0) {
      // Deduplicate the interop filters
      const uniqueInteropFilters = [...new Set(activeInteropFilters)];

      uniqueInteropFilters.forEach(year => {
        this.url.searchParams.append('interop', year);
      });
    } else {
      // Check if we should preserve the 'any' filter
      // This happens when the 'i' shortcut was used but no specific year is selected
      const allCards = document.querySelectorAll('.feature-card');
      const anyInteropFilterActive = Array.from(allCards).some(card => {
        return card.hasAttribute('data-interop-any');
      });

      if (anyInteropFilterActive) {
        this.url.searchParams.set('interop', 'any');
      }
    }

    // Handle predictions filter
    if (this.currentStatusFilter && this.currentStatusFilter.type === 'predictions') {
      this.url.searchParams.set('predictions', this.currentStatusFilter.value);
    } else {
      this.url.searchParams.delete('predictions');
    }

    // Handle other status filters
    if (this.currentStatusFilter && !this.currentStatusFilter.type) {
      this.url.searchParams.set('status', this.currentStatusFilter);
    } else {
      this.url.searchParams.delete('status');
    }

    // Update the URL without reloading the page
    window.history.replaceState({}, '', this.url);
  }

  // Initialize filters from URL parameters
  initializeFiltersFromURL() {
    // Get browser filters
    const browserFilters = this.url.searchParams.getAll('browser');
    if (browserFilters.length > 0) {
      browserFilters.forEach(filter => {
        // Find and activate matching browser tags
        document.querySelectorAll(`.browser-tag[data-filter="${filter}"]`).forEach(tag => {
          tag.classList.add('active-filter');
          tag.setAttribute('aria-pressed', 'true');
        });
      });
    }

    // Get interop filters
    const interopFilters = this.url.searchParams.getAll('interop');
    if (interopFilters.length > 0) {
      // Don't need to do anything special for 'any' - 
      // updateFeatureVisibility will check for it directly from the URL

      // For specific years, find and activate matching tags
      interopFilters.forEach(year => {
        if (year !== 'any') {
          document.querySelectorAll(`.interop-tag[data-filter="interop:${year}"]`).forEach(tag => {
            tag.classList.add('active-filter');
            tag.setAttribute('aria-pressed', 'true');
          });
        }
      });
    }

    // Get predictions filter
    const predictionsFilter = this.url.searchParams.get('predictions');
    if (predictionsFilter === 'false' || predictionsFilter === 'true') {
      this.currentStatusFilter = { type: 'predictions', value: predictionsFilter };
    }

    // Get other status filters
    const statusFilter = this.url.searchParams.get('status');
    if (statusFilter) {
      // Set the status filter
      this.currentStatusFilter = statusFilter;
    }

    // Update visibility if any filters are applied
    if (browserFilters.length > 0 || interopFilters.length > 0 || statusFilter || predictionsFilter) {
      this.updateFeatureVisibility();
    }
  }

  renderTimeline() {
    // Clear existing content
    this.timelineContent.innerHTML = '';

    const groups = this.groupFeaturesByDate();

    // Find the current month for scrolling
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    let currentMonthElement = null;

    // Store all feature cards for hash navigation
    const featureCards = {};

    groups.forEach(group => {
      const dateGroup = document.createElement('div');
      dateGroup.className = 'date-group';

      // Create a unique ID for the date group based on year and month
      const groupDate = group.date;
      const groupMonthKey = `${groupDate.getFullYear()}-${groupDate.getMonth()}`;

      // Create a more URL-friendly anchor ID
      const monthName = groupDate.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
      const anchorId = `${monthName}-${groupDate.getFullYear()}`;
      dateGroup.id = anchorId;

      // Check if this is the current month
      if (groupMonthKey === currentMonthKey) {
        currentMonthElement = dateGroup;
      }

      dateGroup.appendChild(this.createDateHeader(group.date));

      // Sort features within each group by date (newest first)
      group.features
        .sort((a, b) => b.date - a.date)
        .forEach(feature => {
          const card = this.createFeatureCard(feature);
          if (card) {
            dateGroup.appendChild(card);

            // Store the card reference for hash navigation using its actual ID
            // This ensures we can find the card even with the new unique ID format
            featureCards[card.id] = {
              card,
              dateGroup
            };

            // Also store with the old ID format for backward compatibility with existing links
            // But make sure we're not overwriting a more specific ID that already exists
            const oldFormatId = `feature-${feature.id}`;

            // For backward compatibility, store specific display type versions too
            const specificTypeId = `${oldFormatId}-${feature.displayType}`;
            featureCards[specificTypeId] = {
              card,
              dateGroup
            };

            // Only store in the generic ID if it doesn't exist or if this is newly-available
            if (!featureCards[oldFormatId] ||
              (feature.displayType === 'newly-available' &&
                featureCards[oldFormatId].card.id.includes('widely-available'))) {
              featureCards[oldFormatId] = {
                card,
                dateGroup
              };
            }
          }
        });

      // Only append the date group if it has any feature cards
      if (dateGroup.querySelectorAll('.feature-card').length > 0) {
        this.timelineContent.appendChild(dateGroup);
      }
    });

    // Create the "Scroll to current month" FAB
    this.createScrollToCurrentMonthFAB(currentMonthElement);

    // Handle navigation based on URL hash or default to current month
    if (window.location.hash) {
      // If there's a hash in the URL, prioritize scrolling to that element
      const targetId = window.location.hash.substring(1); // Remove the # character

      // Check if the hash explicitly contains a display type
      const hasNewlyAvailable = targetId.includes('-newly-available');
      const hasWidelyAvailable = targetId.includes('-widely-available');

      // If the hash explicitly includes "newly-available", make sure we navigate to that one
      if (hasNewlyAvailable) {
        const element = document.getElementById(targetId);
        if (element) {
          this.scrollToAndExpandCard(element);
        }
      }
      // If the hash explicitly includes "widely-available", navigate to that one
      else if (hasWidelyAvailable) {
        const element = document.getElementById(targetId);
        if (element) {
          this.scrollToAndExpandCard(element);
        }
      }
      // For generic feature IDs without a specific display type
      else if (targetId.startsWith('feature-')) {
        // Extract the base feature ID without any display type
        const baseFeatureId = targetId.split('-newly-available')[0].split('-widely-available')[0];

        // First try to find the newly-available version
        const newlyAvailableId = `${baseFeatureId}-newly-available`;
        const newlyAvailableElement = document.getElementById(newlyAvailableId);

        if (newlyAvailableElement) {
          // Navigate to the newly-available version
          this.scrollToAndExpandCard(newlyAvailableElement);
        } else {
          // If newly-available doesn't exist, try the widely-available version
          const widelyAvailableId = `${baseFeatureId}-widely-available`;
          const widelyAvailableElement = document.getElementById(widelyAvailableId);

          if (widelyAvailableElement) {
            this.scrollToAndExpandCard(widelyAvailableElement);
          } else {
            // If neither specific version exists, try the exact ID
            const exactElement = document.getElementById(targetId);
            if (exactElement) {
              this.scrollToAndExpandCard(exactElement);
            }
          }
        }
      } else {
        // For non-feature hashes (like month headers)
        const element = document.getElementById(targetId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    } else if (currentMonthElement) {
      // Only scroll to current month if there's no hash in the URL
      setTimeout(() => {
        currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }

    // Add a global click handler for widely-available links
    document.addEventListener('click', (event) => {
      // Check if the clicked element is a widely-available link
      if (event.target.classList.contains('widely-available-link') ||
        event.target.closest('.widely-available-link')) {

        const link = event.target.classList.contains('widely-available-link') ?
          event.target : event.target.closest('.widely-available-link');

        // Get the target ID from the data attribute
        const targetId = link.dataset.targetId;

        if (targetId) {
          // Find the target card
          const targetCard = document.getElementById(targetId);

          if (targetCard) {
            // Use the same method for consistency
            this.scrollToAndExpandCard(targetCard);
          }
        }
      }
    });
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

    // Initially hide the FAB (using opacity and transform for smooth transitions)
    fab.classList.add('hidden');

    // Add the FAB to the document
    document.body.appendChild(fab);

    // Set up Intersection Observer to show/hide the FAB
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        // isIntersecting is true if the element is at all visible.
        // We want to show the FAB when the current month is NOT visible.
        if (entry.isIntersecting) {
          fab.classList.add('hidden');
        } else {
          fab.classList.remove('hidden');
        }
      });
    }, { threshold: 0 });

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
      this.resetFilters(false); // Don't reset browser filters
    } else {
      // Set the new filter
      this.currentStatusFilter = type;

      // Apply the filter using our combined filtering logic
      this.updateFeatureVisibility();
    }
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
      window.history.replaceState({}, '', this.url);

      // Also clean up the special 'any' interop data attribute
      document.querySelectorAll('[data-interop-any]').forEach(card => {
        card.removeAttribute('data-interop-any');
      });
    }

    // Show all feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
      card.style.display = 'block';
    });

    // Update date headers visibility
    this.updateDateHeadersVisibility();

    // Update URL to remove filters
    this.updateURLWithFilters();
  }

  // Toggle prediction visibility
  filterPredictedFeatures() {
    const currentFilter = this.currentStatusFilter;

    if (currentFilter && currentFilter.type === 'predictions' && currentFilter.value === 'false') {
      // Currently hiding predictions, remove the filter
      this.currentStatusFilter = null;
      this.url.searchParams.delete('predictions');
    } else {
      // Currently showing predictions (or no filter), hide them
      this.currentStatusFilter = { type: 'predictions', value: 'false' };
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
    const currentMonthName = now.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    const currentYear = now.getFullYear();
    const monthId = `${currentMonthName}-${currentYear}`;

    // Find the current month element
    const currentMonthElement = document.getElementById(monthId) ||
      document.querySelector(`[id^="${currentMonthName}-"]`); // Fallback to any instance of this month

    if (currentMonthElement) {
      currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Helper to parse YYYY-MM-DD as a local date (not UTC)
function parseLocalDate(dateString) {
  if (!dateString) return;
  if (dateString instanceof Date) return dateString;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Initialize the app
new TimelineApp();
