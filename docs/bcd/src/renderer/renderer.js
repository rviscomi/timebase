import { escapeHtml, groupItemsByDate } from '../utils.js';

function createDateHeader(date) {
  const monthText = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long'
  });
  const monthName = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const anchorId = `${monthName}-${date.getFullYear()}`;
  return `
    <div class="date-header">
      <a href="#${anchorId}" class="date-link" title="Link to ${monthText}">
        ${monthText}
        <span class="link-icon">🔗</span>
      </a>
    </div>
  `;
}

function createBrowserTag(browser, version) {
  const baseBrowser = browser.replace('_android', '').replace('_ios', '');
  let displayText = version;
  if (browser.includes('_')) {
    const platform = browser.split('_')[1];
    displayText += ` (${platform.charAt(0).toUpperCase() + platform.slice(1)})`;
  }

  return `
    <button class="browser-tag ${browser}" type="button" data-browser="${browser}" data-version="${version}" data-filter="${browser}:${version}" aria-pressed="false">
      <img src="images/${baseBrowser}.svg" alt="${browser} logo" class="browser-logo">
      <span>${displayText}</span>
    </button>
  `;
}

function createInteropTag(year) {
  return `
    <button class="interop-tag" type="button" data-interop-year="${year}" data-filter="${year}" aria-pressed="false">
      <span>Interop ${year}</span>
    </button>
  `;
}

function addBrowserTagsInOrder(browserReleases) {
  const browserOrder = ['chrome', 'edge', 'safari', 'firefox'];
  const browserMap = {};
  browserReleases.forEach(release => {
    browserMap[release.baseBrowser] = release;
  });

  let tagsHTML = '';
  browserOrder.forEach(browser => {
    if (browserMap[browser]) {
      const release = browserMap[browser];
      tagsHTML += createBrowserTag(release.browser, release.version);
    }
  });
  return tagsHTML;
}

function processBrowserSupport(feature) {
  const browserReleases = [];
  const processedBrowsers = new Set();
  const browserVersionMap = new Map();

  if (feature.shipDates) {
    feature.shipDates.forEach(shipDate => {
      const browser = shipDate.browser;
      const cleanVersion = shipDate.version;
      const baseBrowser = browser.replace('_android', '').replace('_ios', '');

      if (!browserVersionMap.has(baseBrowser)) {
        browserVersionMap.set(baseBrowser, {
          versions: new Map(),
          platforms: new Set()
        });
      }

      const browserData = browserVersionMap.get(baseBrowser);
      if (browser !== baseBrowser) {
        browserData.platforms.add(browser);
      }
      if (!browserData.versions.has(cleanVersion)) {
        browserData.versions.set(cleanVersion, new Set());
      }
      browserData.versions.get(cleanVersion).add(browser);
    });
  }

  if (feature.shipDates) {
    [...feature.shipDates].sort((a, b) => b.date - a.date).forEach(shipDate => {
      const browser = shipDate.browser;
      const cleanVersion = shipDate.version;
      const releaseDate = shipDate.date;
      const isInCurrentMonth =
        feature.displayType === 'widely-available' ||
        !releaseDate ||
        (releaseDate.getMonth() === feature.date.getMonth() &&
          releaseDate.getFullYear() === feature.date.getFullYear());
      const baseBrowser = browser.replace('_android', '').replace('_ios', '');

      if (processedBrowsers.has(baseBrowser)) {
        return;
      }
      processedBrowsers.add(baseBrowser);

      const browserData = browserVersionMap.get(baseBrowser);
      const browsersWithThisVersion = browserData.versions.get(cleanVersion);
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

function createFeatureHeader(feature, uniqueCardId) {
  let baselineIconHTML = '';
  const baseline = feature.status?.baseline;
  if (baseline !== undefined) {
    let iconName;
    let titleText;
    if (baseline === false) {
      iconName = 'baseline-limited-icon.svg';
      titleText = feature.discouraged ? 'This feature is discouraged' : 'Limited availability across browsers';
    } else if (feature.displayType === 'widely-available') {
      iconName = 'baseline-widely-icon.svg';
      titleText = `Baseline ${feature.displayName}`;
    } else if (feature.displayType === 'newly-available') {
      iconName = 'baseline-newly-icon.svg';
      titleText = `Baseline ${feature.displayName}`;
    }
    if (iconName) {
      baselineIconHTML = `<img src="images/${iconName}" alt="${iconName.replace('baseline-', '').replace('-icon.svg', '')} support" class="baseline-icon" title="${titleText}">`;
    }
  }

  let featureName = feature.name;
  if (feature.prediction) {
    featureName = '🔮 ' + featureName;
  }

  // Escape the feature name for safe HTML insertion
  const escapedFeatureName = escapeHtml(featureName);
  const escapedOriginalName = escapeHtml(feature.name);

  let upvoteHTML = '';
  if (feature.developerSignal) {
    upvoteHTML = `
      <div class="upvote-info title-upvote">
        <a href="${feature.developerSignal.url}" class="upvote-count" target="_blank" rel="noopener noreferrer">
          <span class="upvote-icon">👍</span> ${feature.developerSignal.votes}
        </a>
      </div>
    `;
  }

  let displayTypeForTooltip = feature.displayName;
  if (feature.discouraged) {
    displayTypeForTooltip = 'discouraged';
  } else if (feature.status?.baseline === false) {
    displayTypeForTooltip = 'Limited availability';
  }

  const browserReleases = processBrowserSupport(feature);
  const browserTagsHTML = addBrowserTagsInOrder(browserReleases);

  let interopHTML = '';
  if (feature.interop) {
    const interopYears = feature.interop.map(entry => entry.year).sort((a, b) => b - a);
    if (interopYears.length > 0) {
      const mostRecentYear = interopYears[0];
      interopHTML = createInteropTag(mostRecentYear);
    }
  }

  // Create availability info text
  let availabilityHTML = '';
  let featureDate = feature.date;
  if (feature.displayType === 'limited-availability') {
    // For limited availability, use the earliest ship date (which is shipDates[0] since it's sorted ascending in build.js)
    featureDate = feature.shipDates[0].date;
  }
  if (!featureDate && feature.shipDates && feature.shipDates.length > 0) {
    featureDate = feature.shipDates[0].date;
  }

  if (featureDate) {
    const now = new Date();
    const formattedDate = featureDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let availabilityText = '';
    if (feature.displayType === 'limited-availability') {
      if (feature.discouraged) {
        const authority = feature.discouraged.according_to.map(url => {
          const hostname = new URL(url).hostname;
          if (hostname == 'github.com') {
            const repo = url.split('/').slice(-2).join('/');
            return `<a href="${url}" target="_blank">${repo}</a>`;
          }
          return `<a href="${url}" target="_blank">${hostname}</a>`;
        }).join(', ');
        availabilityText = `This feature is discouraged by ${authority}.`;
      } else if (featureDate > now) {
        availabilityText = `🔮 Expected to become Limited availability across browsers on ${formattedDate}.`;
      } else {
        availabilityText = `Limited availability across browsers since ${formattedDate}.`;
      }
    } else if (feature.displayType === 'newly-available' && feature.status?.baseline_high_date) {
      const widelyFormattedDate = feature.status.baseline_high_date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const widelyAvailableId = `feature-${feature.id}-widely-available`;

      if (feature.status.baseline === 'high') {
        availabilityText = `Newly available since ${formattedDate}.<br>Became widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      } else if (feature.prediction) {
        availabilityText = `🔮 Expected to become newly available on ${formattedDate}.<br>🔮 Expected to become widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      } else {
        availabilityText = `Newly available since ${formattedDate}.<br>🔮 Expected to become widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      }
    } else if (feature.displayType === 'widely-available') {
      if (feature.prediction) {
        availabilityText = `🔮 Expected to become widely available on ${formattedDate}.`;
      } else {
        availabilityText = `Widely available since ${formattedDate}.`;
      }
    }

    if (availabilityText) {
      availabilityHTML = `<div class="availability-info-text">${availabilityText}</div>`;
    }
  }

  // Create browser support table
  let browserTableHTML = '';
  if (feature.shipDates && feature.shipDates.length > 0) {
    const sortedShipDates = [...feature.shipDates].sort((a, b) => {
      const baseA = a.browser.replace('_android', '').replace('_ios', '');
      const baseB = b.browser.replace('_android', '').replace('_ios', '');

      if (baseA !== baseB) {
        const browserOrder = ['chrome', 'edge', 'safari', 'firefox'];
        return browserOrder.indexOf(baseA) - browserOrder.indexOf(baseB);
      }

      const isPlatformA = a.browser.includes('_');
      const isPlatformB = b.browser.includes('_');

      if (isPlatformA !== isPlatformB) {
        return isPlatformA ? 1 : -1;
      }

      if (isPlatformA && isPlatformB) {
        const platformA = a.browser.split('_')[1];
        const platformB = b.browser.split('_')[1];
        return platformA.localeCompare(platformB);
      }

      return 0;
    });

    let tableRows = '';
    sortedShipDates.forEach(shipDate => {
      const baseBrowser = shipDate.browser.replace('_android', '').replace('_ios', '');
      let displayName = baseBrowser.charAt(0).toUpperCase() + baseBrowser.slice(1);
      let fullText = displayName + ' ' + shipDate.version;

      if (shipDate.browser.includes('_')) {
        const platform = shipDate.browser.split('_')[1];
        if (platform.toLowerCase() === 'ios') {
          fullText += ' (iOS)';
        } else {
          fullText += ` (${platform.charAt(0).toUpperCase() + platform.slice(1)})`;
        }
      }

      const dateText = (shipDate.date && !shipDate.isPreview) ?
        shipDate.date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) : 'TBD';

      tableRows += `
        <tr>
          <td>
            <div class="browser-cell">
              <img src="images/${baseBrowser}.svg" alt="${baseBrowser} logo" class="browser-logo">
              <span>${escapeHtml(fullText)}</span>
            </div>
          </td>
          <td class="date-cell">${dateText}</td>
        </tr>
      `;
    });

    browserTableHTML = `
      <div class="browser-support-table-container">
        <table class="browser-support-table">
          <thead>
            <tr>
              <th>Browser Version</th>
              <th>Release Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  }

  let descriptionHTML = '';
  if (feature.description_html) {
    descriptionHTML = `<div class="feature-description">${feature.description_html}</div>`;
  } else if (feature.description) {
    descriptionHTML = `<div class="feature-description">${escapeHtml(feature.description)}</div>`;
  }

  let linksHTML = '';
  if (feature.spec) {
    linksHTML += `<a href="${feature.spec}" class="spec-link" target="_blank">Specification</a>`;
  }
  linksHTML += `<a href="https://webstatus.dev/features/${feature.id}" class="webstatus-link" target="_blank">Web Status</a>`;
  linksHTML += `<a href="https://web-platform-dx.github.io/web-features-explorer/features/${feature.id}/" class="web-platform-dx-link" target="_blank">Web Features Explorer</a>`;
  if (feature.mdn) {
    const mdnEntry = feature.mdn[0];
    linksHTML += `<a href="${mdnEntry.url}" class="mdn-link" title="${escapeHtml(mdnEntry.title)}" target="_blank">MDN</a>`;
  }


  return `
    <div class="feature-card-header">
      <div class="feature-top-row" style="cursor: pointer;" aria-expanded="false" aria-controls="details-${uniqueCardId}">
        <div class="title-container">
          <h2 class="feature-title">
            ${baselineIconHTML}
            <span>${escapedFeatureName}</span>
            ${upvoteHTML}
            <a href="#${uniqueCardId}" class="feature-link-icon" title="Link to ${escapedOriginalName} (${displayTypeForTooltip})">🔗</a>
          </h2>
        </div>
        <div class="browser-support">${browserTagsHTML}${interopHTML}</div>
      </div>
      <div class="feature-details" id="details-${uniqueCardId}" style="display: none;">
        ${descriptionHTML}
        ${availabilityHTML}
        ${browserTableHTML}
        <div class="feature-links">${linksHTML}</div>
      </div>
    </div>
  `;
}

function createFeatureCard(feature) {
  let cardType = feature.displayType;
  if (feature.status?.baseline === false) {
    cardType = 'limited-availability';
  }
  const uniqueCardId = `feature-${feature.id}-${cardType}`;

  const classes = ['feature-card'];
  if (feature.prediction) classes.push('prediction');
  if (feature.discouraged) classes.push('discouraged');
  else if (feature.status?.baseline === false) classes.push('limited-availability');
  else classes.push(feature.displayType);

  let dataAttrs = '';
  if (feature.shipDates) {
    feature.shipDates.forEach(shipDate => {
      dataAttrs += ` data-browser-${shipDate.browser}-${shipDate.version}="true"`;
    });
  }
  if (feature.interop) {
    const interopYears = feature.interop.map(entry => entry.year).sort((a, b) => b - a);
    if (interopYears.length > 0) {
      dataAttrs += ` data-interop-${interopYears[0]}="true"`;
    }
  }


  const headerHTML = createFeatureHeader(feature, uniqueCardId);

  return `
    <div id="${uniqueCardId}" class="${classes.join(' ')}"${dataAttrs}>
      ${headerHTML}
    </div>
  `;
}

export function generateTimelineHTML(features) {
  const groups = groupItemsByDate(features);
  let html = '<div id="timeline-content">';

  groups.forEach(group => {
    const dateHeader = createDateHeader(group.date);
    const monthName = group.date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    const anchorId = `${monthName}-${group.date.getFullYear()}`;

    let featuresHTML = '';
    group.items
      .sort((a, b) => b.date - a.date)
      .forEach(feature => {
        featuresHTML += createFeatureCard(feature);
      });

    if (featuresHTML) {
      html += `<div class="date-group" id="${anchorId}">`;
      html += dateHeader;
      html += featuresHTML;
      html += '</div>';
    }
  });

  html += '</div>';
  return html;
}
