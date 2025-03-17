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
            .forEach(([name, data]) => {
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
                        return release.date ? { date: new Date(release.date), browser, version: cleanVersion } : null;
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
                    name: data.name || name,
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
        
        const versionText = document.createElement('span');
        versionText.textContent = version;
        versionText.className = 'version-text';
        
        tag.appendChild(logo);
        tag.appendChild(versionText);
        return tag;
    }

    createFeatureHeader(feature) {
        const header = document.createElement('div');
        header.className = 'feature-card-header';
        
        // Get the feature ID once for use throughout this method
        const featureId = this.getFeatureId(feature.name);
        
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
            
            // For widely-available, always show the widely icon
            if (feature.displayType === 'widely-available') {
                iconName = 'baseline-widely-icon.svg';
                titleText = 'Baseline Widely available';
            } else if (baseline === false) {
                // For limited availability
                iconName = 'baseline-limited-icon.svg';
                titleText = 'Limited availability across browsers';
            } else if (baseline === 'low') {
                // For newly-available
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
        linkIcon.href = `#feature-${featureId}`;
        linkIcon.className = 'feature-link-icon';
        linkIcon.innerHTML = '🔗';
        linkIcon.title = `Link to ${feature.name}`;
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
            availabilityText = `Newly available since ${formattedDate}.`;
        } else if (feature.displayType === 'widely-available') {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            
            if (feature.date > now) {
                availabilityText = `Will be widely available on ${formattedDate}.`;
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
                availabilityInfo.textContent = availabilityText;
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
                availabilityInfo.textContent = availabilityText;
                details.appendChild(availabilityInfo);
            }
        } else if (availabilityText) {
            // If there's no description but we have availability info, add it as the description
            const availabilityInfo = document.createElement('div');
            availabilityInfo.className = 'availability-info-text';
            availabilityInfo.textContent = availabilityText;
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
            browserHeader.textContent = 'Browser';
            headerRow.appendChild(browserHeader);
            
            const versionHeader = document.createElement('th');
            versionHeader.textContent = 'Version';
            headerRow.appendChild(versionHeader);
            
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
                browserCell.className = 'browser-cell';
                
                // Get base browser name for logo
                const baseBrowser = shipDate.browser.replace('_android', '').replace('_ios', '');
                
                // Create browser logo
                const logo = document.createElement('img');
                logo.src = `images/${baseBrowser}.svg`;
                logo.alt = `${baseBrowser} logo`;
                logo.className = 'browser-logo';
                browserCell.appendChild(logo);
                
                // Format browser name
                let displayName = baseBrowser.charAt(0).toUpperCase() + baseBrowser.slice(1);
                if (shipDate.browser.includes('_')) {
                    const platform = shipDate.browser.split('_')[1];
                    // Special case for iOS to ensure proper capitalization
                    if (platform.toLowerCase() === 'ios') {
                        displayName += ' (iOS)';
                    } else {
                        displayName += ` (${platform.charAt(0).toUpperCase() + platform.slice(1)})`;
                    }
                }
                
                const nameSpan = document.createElement('span');
                nameSpan.textContent = displayName;
                browserCell.appendChild(nameSpan);
                
                row.appendChild(browserCell);
                
                // Version cell
                const versionCell = document.createElement('td');
                versionCell.className = 'version-cell';
                versionCell.textContent = shipDate.version;
                row.appendChild(versionCell);
                
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
        webstatusLink.href = `https://webstatus.dev/features/${featureId}`;
        webstatusLink.className = 'webstatus-link';
        webstatusLink.textContent = 'Web Status';
        webstatusLink.target = '_blank';
        linksContainer.appendChild(webstatusLink);
        
        // Add web-platform-dx.github.io link
        const webPlatformDxLink = document.createElement('a');
        webPlatformDxLink.href = `https://web-platform-dx.github.io/web-features-explorer/features/${featureId}/`;
        webPlatformDxLink.className = 'web-platform-dx-link';
        webPlatformDxLink.textContent = 'Web Features Explorer';
        webPlatformDxLink.target = '_blank';
        linksContainer.appendChild(webPlatformDxLink);
        
        details.appendChild(linksContainer);
        header.appendChild(details);
        
        // Make the top row clickable to toggle details
        topRow.style.cursor = 'pointer';
        topRow.setAttribute('aria-expanded', 'false');
        topRow.setAttribute('aria-controls', `details-${featureId}`);
        details.id = `details-${featureId}`;
        
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
    
    getFeatureId(featureName) {
        // Convert feature name to kebab-case for URL
        return featureName
            .toLowerCase()
            .replace(/\./g, '-')       // Convert dots to hyphens (e.g., readablestream.from → readablestream-from)
            .replace(/[^\w\s-]/g, '')  // Remove special characters except hyphens
            .replace(/[\s_]+/g, '-')   // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, '');  // Remove leading/trailing hyphens
    }

    createFeatureCard(feature) {
        const card = document.createElement('div');
        
        // Get the feature ID once for use throughout this method
        const featureId = this.getFeatureId(feature.name);
        
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
        
        // Add a unique ID to the feature card for deep linking
        card.id = `feature-${featureId}`;
        
        // Create header with title
        const header = this.createFeatureHeader(feature);
        
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
                        
                        // Store the card reference for hash navigation
                        featureCards[`feature-${this.getFeatureId(feature.name)}`] = {
                            card,
                            dateGroup
                        };
                    }
                });
            
            // Only append the date group if it has any feature cards
            if (dateGroup.querySelectorAll('.feature-card').length > 0) {
                this.timelineContent.appendChild(dateGroup);
            }
        });
        
        // Handle navigation based on URL hash or default to current month
        if (window.location.hash) {
            // If there's a hash in the URL, prioritize scrolling to that element
            const targetId = window.location.hash.substring(1); // Remove the # character
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                setTimeout(() => {
                    // Use a more precise calculation for the scroll position
                    if (targetId.startsWith('feature-')) {
                        // For feature cards, first expand the card, then scroll to it
                        const card = targetElement;
                        const topRow = card.querySelector('.feature-top-row');
                        const details = card.querySelector('.feature-details');
                        
                        // First expand the card if it's not already expanded
                        if (topRow && details && details.style.display === 'none') {
                            // Expand the card
                            details.style.display = 'block';
                            topRow.setAttribute('aria-expanded', 'true');
                            card.classList.add('expanded');
                            
                            // Wait for the expansion to complete before scrolling
                            setTimeout(() => {
                                // Now calculate the position with the expanded content
                                const headerHeight = 80; // Approximate height of sticky header
                                const extraPadding = 20; // Additional padding for visual comfort
                                
                                // Scroll to the card with proper offset
                                window.scrollTo({
                                    top: card.offsetTop - headerHeight - extraPadding,
                                    behavior: 'smooth'
                                });
                            }, 300);
                        } else {
                            // If already expanded, just scroll to it
                            const headerHeight = 80;
                            const extraPadding = 20;
                            
                            window.scrollTo({
                                top: card.offsetTop - headerHeight - extraPadding,
                                behavior: 'smooth'
                            });
                        }
                    } else {
                        // For month headers, use the default scrollIntoView
                        targetElement.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start'
                        });
                    }
                }, 200);
            }
        } else if (currentMonthElement) {
            // Only scroll to current month if there's no hash in the URL
            setTimeout(() => {
                currentMonthElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}

// Initialize the app
new TimelineApp(); 
