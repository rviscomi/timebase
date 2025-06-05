import { browsers, features } from './data.js';
import { browserIcons } from './browser-icons.js';

class TimelineApp {
    constructor() {
        this.timelineContent = document.querySelector('.timeline-content');
        this.features = this.processFeatures();
        this.init();
    }

    processFeatures() {
        const processedFeatures = [];
        
        Object.entries(features)
            .forEach(([id, data]) => {
                // Get all ship dates from browsers
                const shipDates = Object.entries(data.status?.support || {})
                    .map(([browser, version]) => {
                        // Skip if version is not a string (some might be objects with more complex support info)
                        if (typeof version !== 'string') {
                            return null;
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
                        return release.date ? { date: parseLocalDate(release.date), browser, version: cleanVersion } : null;
                    })
                    .filter(item => item !== null);

                if (!shipDates.length) return;

                // Sort ship dates chronologically
                shipDates.sort((a, b) => a.date - b.date);
                
                // The newly available date is when the last browser adds support
                const newlyAvailableDate = shipDates[shipDates.length - 1].date;
                
                // Calculate widely available date (30 months after newly available)
                const widelyAvailableDate = new Date(newlyAvailableDate);
                widelyAvailableDate.setMonth(widelyAvailableDate.getMonth() + 30);
                
                // Create the base feature object
                const baseFeature = {
                    id,
                    name: data.name || id,
                    description: data.description,
                    description_html: data.description_html || data.description,
                    spec: data.spec,
                    status: data.status,
                    shipDates: shipDates
                };
                
                // Get current date for comparison
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                // Always add the newly available entry
                processedFeatures.push({
                    ...baseFeature,
                    date: newlyAvailableDate,
                    displayType: 'newly-available'
                });
                
                // Only add widely available entry if:
                // 1. The newly available date is in the past or present (feature is already available)
                // 2. We're not filtering out future widely available dates
                // 3. The feature has full browser support (baseline is not false)
                if (newlyAvailableDate <= now && data.status?.baseline !== false) {
                    processedFeatures.push({
                        ...baseFeature,
                        date: widelyAvailableDate,
                        displayType: 'widely-available'
                    });
                }
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
        const tag = document.createElement('span');
        tag.className = `browser-tag ${browser}`;
        
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
        
        // Add platform information if applicable
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
                titleText = 'Limited availability across browsers';
            }
            // Then prioritize the display type for non-limited features
            else if (feature.displayType === 'widely-available') {
                // For widely-available, always show the widely icon
                iconName = 'baseline-widely-icon.svg';
                titleText = 'Baseline Widely available';
            } else if (feature.displayType === 'newly-available') {
                // For newly-available, always show the newly icon regardless of baseline value
                iconName = 'baseline-newly-icon.svg';
                titleText = 'Baseline Newly available';
            } else if (baseline === 'low') {
                iconName = 'baseline-newly-icon.svg';
                titleText = 'Baseline Newly available';
            } else if (baseline === 'high') {
                iconName = 'baseline-widely-icon.svg';
                titleText = 'Baseline Widely available';
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
        const nameText = document.createTextNode(feature.name);
        title.appendChild(nameText);
        
        // Add a link icon for deep linking to this feature
        const linkIcon = document.createElement('a');
        linkIcon.href = `#${uniqueCardId}`;
        linkIcon.className = 'feature-link-icon';
        linkIcon.innerHTML = '🔗';
        linkIcon.title = `Link to ${feature.name} (${feature.displayType})`;
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
        if (feature.displayType === 'newly-available') {
            // Check if this is actually a limited availability feature
            if (feature.status?.baseline === false) {
                // For limited availability features, use a different text format
                availabilityText = `Limited availability across browsers since ${formattedDate}.`;
            } else {
                // Calculate the widely available date (30 months after newly available)
                const widelyAvailableDate = new Date(feature.date);
                widelyAvailableDate.setMonth(widelyAvailableDate.getMonth() + 30);
                
                // Format the widely available date
                const widelyFormattedDate = widelyAvailableDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                
                // Create the widely available feature ID
                const widelyAvailableId = `feature-${feature.id}-widely-available`;
                
                // Check if the widely available date is in the past
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                // Create the newly available text with a link to the widely available entry
                // Use past tense if the widely available date is in the past
                if (widelyAvailableDate <= now) {
                    availabilityText = `Newly available since ${formattedDate}. Became widely available on <a href="#${widelyAvailableId}" class="widely-available-link" data-target-id="${widelyAvailableId}">${widelyFormattedDate}</a>.`;
                } else {
                    availabilityText = `Newly available since ${formattedDate}. Will become widely available on <a href="#${widelyAvailableId}" class="widely-available-link" data-target-id="${widelyAvailableId}">${widelyFormattedDate}</a>.`;
                }
            }
        } else if (feature.displayType === 'widely-available') {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            if (feature.date > now) {
                availabilityText = `Will become widely available on ${formattedDate}.`;
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
                dateCell.textContent = shipDate.date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
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
        
        // First check if this is a widely-available feature - these should always have the green border
        if (feature.displayType === 'widely-available') {
            card.className = 'feature-card widely-available';
            
            // Add 'future' class to widely available features that are in the future
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            if (feature.date > now) {
                card.classList.add('future');
            }
        }
        // Then check if this is a limited availability feature
        else if (feature.status?.baseline === false) {
            card.className = 'feature-card limited-availability';
        } 
        // Otherwise, it's a newly-available feature
        else {
            card.className = `feature-card ${feature.displayType}`;
        }
        
        // Create a unique ID that includes both the feature name and its display type
        // This ensures each instance (newly vs widely available) has a unique ID
        const uniqueCardId = `feature-${feature.id}-${feature.displayType}`;
        
        // Add a unique ID to the feature card for deep linking
        card.id = uniqueCardId;
        
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
        
        // First collect all browser releases with their dates
        if (feature.shipDates) {
            feature.shipDates.forEach(shipDate => {
                const browser = shipDate.browser;
                const cleanVersion = shipDate.version;
                const releaseDate = shipDate.date;
                
                // For widely-available, we want to show all browsers
                // For newly-available, we only show browsers released in the current month
                const isInCurrentMonth = 
                    feature.displayType === 'widely-available' || 
                    (releaseDate.getMonth() === feature.date.getMonth() && 
                     releaseDate.getFullYear() === feature.date.getFullYear());
                
                // Get base browser name (without platform)
                const baseBrowser = browser.replace('_android', '').replace('_ios', '');
                
                // Skip if we already have this base browser (to avoid duplicates)
                if (processedBrowsers.has(baseBrowser)) {
                    return;
                }
                
                processedBrowsers.add(baseBrowser);
                
                browserReleases.push({
                    browser,
                    baseBrowser,
                    version: cleanVersion,
                    date: releaseDate,
                    isRecent: isInCurrentMonth
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

    init() {
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
        
        // Set up scroll event listener to show/hide the FAB
        const viewportHeight = window.innerHeight;
        const threshold = viewportHeight * 0.01; // 1vh
        
        window.addEventListener('scroll', () => {
            if (!currentMonthElement) return;
            
            const rect = currentMonthElement.getBoundingClientRect();
            const isVisible = 
                (rect.top >= -threshold && rect.top <= viewportHeight) ||
                (rect.bottom >= 0 && rect.bottom <= viewportHeight + threshold);
            
            // Show/hide FAB based on current month visibility
            if (!isVisible) {
                fab.classList.remove('hidden');
            } else {
                fab.classList.add('hidden');
            }
        });
    }
}

// Helper to parse YYYY-MM-DD as a local date (not UTC)
function parseLocalDate(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
}

// Initialize the app
new TimelineApp();
