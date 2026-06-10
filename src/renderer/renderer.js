// Shared rendering utilities for both features and BCD keys

import { escapeHtml, groupItemsByDate, getToday, getBcdKeysForFeature } from '../utils/utils.js';



export function createDateHeader(date) {
  const monthText = date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long'
  });
  const monthName = date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
  const anchorId = `${monthName}-${date.getFullYear()}`;
  return `
    <h2 class="date-header">
      <a href="#${anchorId}" class="date-link" aria-label="Permalink to ${monthText}">
        ${monthText}
        <span class="link-icon" aria-hidden="true">🔗</span>
      </a>
    </h2>
  `;
}

export function createBrowserTag(browser, version) {
  const baseBrowser = browser.replace('_android', '').replace('_ios', '');
  let displayText = version;
  if (browser.includes('_')) {
    const platform = browser.split('_')[1];
    displayText += ` (${platform.charAt(0).toUpperCase() + platform.slice(1)})`;
  }
  const browserNameFormatted = baseBrowser.charAt(0).toUpperCase() + baseBrowser.slice(1);

  return `
    <button class="browser-tag ${browser}" type="button" data-browser="${browser}" data-version="${version}" data-filter="${browser}:${version}" aria-pressed="false" aria-label="Filter timeline by ${browserNameFormatted} version ${displayText}">
      <img src="images/${baseBrowser}.svg" alt="" class="browser-logo" aria-hidden="true">
      <span>${displayText}</span>
    </button>
  `;
}

export function createInteropTag(year) {
  return `
    <button class="interop-tag" type="button" data-interop-year="${year}" data-filter="${year}" aria-pressed="false">
      <span>Interop ${year}</span>
    </button>
  `;
}

export function addBrowserTagsInOrder(browserReleases) {
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

export function processBrowserSupport(item) {
  const browserReleases = [];
  const processedBrowsers = new Set();
  const browserVersionMap = new Map();

  if (item.shipDates) {
    item.shipDates.forEach(shipDate => {
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

  if (item.shipDates) {
    [...item.shipDates].sort((a, b) => b.date - a.date).forEach(shipDate => {
      const browser = shipDate.browser;
      const cleanVersion = shipDate.version;
      const releaseDate = shipDate.date;
      const isInCurrentMonth =
        item.displayType === 'widely-available' ||
        !releaseDate ||
        (releaseDate.getMonth() === item.date.getMonth() &&
          releaseDate.getFullYear() === item.date.getFullYear());
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

export function createBrowserSupportTable(item) {
  let browserTableHTML = '';
  if (item.shipDates && item.shipDates.length > 0) {
    const sortedShipDates = [...item.shipDates].sort((a, b) => {
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

    const escapedOriginalName = escapeHtml(item.name);

    browserTableHTML = `
      <div class="browser-support-table-container">
        <table class="browser-support-table">
          <caption class="visually-hidden">Browser support details for ${escapedOriginalName}</caption>
          <thead>
            <tr>
              <th scope="col">Browser Version</th>
              <th scope="col">Release Date</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  }
  return browserTableHTML;
}

export function createBcdKeysList(item, bcdKeys) {
  if (!bcdKeys) return '';
  
  const keys = getBcdKeysForFeature(item.id, bcdKeys);
  if (keys.length === 0) return '';
  
  const getBaselineLabel = (baseline) => {
    if (baseline === 'high') return 'Widely available';
    if (baseline === 'low' || baseline === true) return 'Newly available';
    return 'Limited availability';
  };
  
  const getBaselineIcon = (baseline) => {
    if (baseline === 'high') return 'baseline-widely-icon.svg';
    if (baseline === 'low' || baseline === true) return 'baseline-newly-icon.svg';
    return 'baseline-limited-icon.svg';
  };
  
  const getBaselineColor = (baseline) => {
    if (baseline === 'high') return 'widely-available';
    if (baseline === 'low' || baseline === true) return 'newly-available';
    return 'limited-availability';
  };
  
  // Create color bar segments
  let colorBarHTML = '<div class="bcd-keys-color-bar" aria-hidden="true">';
  keys.forEach(key => {
    const colorClass = getBaselineColor(key.baseline);
    const label = getBaselineLabel(key.baseline);
    colorBarHTML += `<div class="color-segment ${colorClass}"></div>`;
  });
  colorBarHTML += '</div>';
  
  let keysHTML = '<ul class="bcd-keys-list">';
  keys.forEach(key => {
    const iconSrc = getBaselineIcon(key.baseline);
    const label = getBaselineLabel(key.baseline);
    keysHTML += `
      <li class="bcd-key-item">
        <img src="images/${iconSrc}" alt="${label}" class="baseline-icon" title="${label}">
        <code>${escapeHtml(key.name)}</code>
      </li>
    `;
  });
  keysHTML += '</ul>';
  
  return `
    <div class="bcd-keys-section">
      <h4>BCD Keys (${keys.length})</h4>
      ${colorBarHTML}
      ${keysHTML}
    </div>
  `;
}

export function createCard(item, options = {}) {
  const {
    idPrefix = 'feature',
    renderParentFeature = false,
    getWebStatusId = (item) => item.id,
    getWebFeaturesId = (item) => item.id,
    bcdKeys = null
  } = options;

  let baselineIconHTML = '';
  const baseline = item.status?.baseline;
  if (baseline !== undefined) {
    let iconName;
    let titleText;
    let altText = '';
    if (baseline === false) {
      iconName = 'baseline-limited-icon.svg';
      titleText = item.discouraged ? 'This feature is discouraged' : 'Limited availability across browsers';
      altText = 'Limited availability';
    } else if (item.displayType === 'widely-available') {
      iconName = 'baseline-widely-icon.svg';
      titleText = `Baseline ${item.displayName}`;
      altText = 'Widely available';
    } else if (item.displayType === 'newly-available') {
      iconName = 'baseline-newly-icon.svg';
      titleText = `Baseline ${item.displayName}`;
      altText = 'Newly available';
    }
    if (iconName) {
      baselineIconHTML = `<img src="images/${iconName}" alt="${altText}" class="baseline-icon" title="${titleText}">`;
    }
  }

  let predictionHTML = '';
  if (item.prediction) {
    predictionHTML = '<span aria-hidden="true">🔮 </span><span class="visually-hidden">Predicted: </span>';
  }

  const escapedName = escapeHtml(item.name);
  const escapedOriginalName = escapeHtml(item.name);

  let upvoteHTML = '';
  if (item.developerSignal) {
    upvoteHTML = `
      <div class="upvote-info title-upvote">
        <a href="${item.developerSignal.url}" class="upvote-count" target="_blank" rel="noopener noreferrer" aria-label="${item.developerSignal.votes} developer signals on GitHub">
          <span class="upvote-icon" aria-hidden="true">👍</span> ${item.developerSignal.votes}
        </a>
      </div>
    `;
  }

  let displayTypeForTooltip = item.displayName;
  if (item.discouraged) {
    displayTypeForTooltip = 'discouraged';
  } else if (item.status?.baseline === false) {
    displayTypeForTooltip = 'Limited availability';
  }

  const browserReleases = processBrowserSupport(item);
  const browserTagsHTML = addBrowserTagsInOrder(browserReleases);

  let interopHTML = '';
  if (item.interop) {
    const interopYears = item.interop.map(entry => entry.year).sort((a, b) => b - a);
    if (interopYears.length > 0) {
      const mostRecentYear = interopYears[0];
      interopHTML = createInteropTag(mostRecentYear);
    }
  }

  // Create availability info text
  let availabilityHTML = '';
  let itemDate = item.date;
  if (item.displayType === 'limited-availability') {
    // For limited availability, use the earliest ship date
    if (item.shipDates && item.shipDates.length > 0) {
      itemDate = item.shipDates[0].date;
    }
  }
  if (!itemDate && item.shipDates && item.shipDates.length > 0) {
    itemDate = item.shipDates[0].date;
  }

  if (itemDate) {
    const now = getToday();
    const formattedDate = itemDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let availabilityText = '';
    if (item.displayType === 'limited-availability') {
      if (item.discouraged) {
        const authority = item.discouraged.according_to.map(url => {
          const hostname = new URL(url).hostname;
          if (hostname == 'github.com') {
            const repo = url.split('/').slice(-2).join('/');
            return `<a href="${url}" target="_blank">${repo}</a>`;
          }
          return `<a href="${url}" target="_blank">${hostname}</a>`;
        }).join(', ');
        const reason = item.discouraged.reason_html ? ` <span class="discouraged-reason">${item.discouraged.reason_html}</span>` : '';
        availabilityText = `This feature is discouraged by ${authority}.${reason}`;
      } else if (itemDate > now) {
        availabilityText = `🔮 Expected to become Limited availability across browsers on ${formattedDate}.`;
      } else {
        availabilityText = `Limited availability across browsers since ${formattedDate}.`;
      }
    } else if (item.displayType === 'newly-available' && item.status?.baseline_high_date) {
      const widelyFormattedDate = item.status.baseline_high_date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const widelyAvailableId = `${idPrefix}-${item.id}-widely-available`;

      if (item.status.baseline === 'high') {
        availabilityText = `Newly available since ${formattedDate}.<br>Became widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      } else if (item.prediction) {
        availabilityText = `🔮 Expected to become newly available on ${formattedDate}.<br>🔮 Expected to become widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      } else {
        availabilityText = `Newly available since ${formattedDate}.<br>🔮 Expected to become widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      }
    } else if (item.displayType === 'widely-available') {
      if (item.prediction) {
        availabilityText = `🔮 Expected to become widely available on ${formattedDate}.`;
      } else {
        availabilityText = `Widely available since ${formattedDate}.`;
      }
    }

    if (availabilityText) {
      availabilityHTML = `<div class="availability-info-text">${availabilityText}</div>`;
    }
  }

  const browserTableHTML = createBrowserSupportTable(item);

  let bcdKeysHTML = '';
  // Only show BCD keys for web features (not for BCD keys themselves)
  if (bcdKeys && !item.parent_feature) {
    bcdKeysHTML = createBcdKeysList(item, bcdKeys);
  }

  let descriptionHTML = '';
  if (item.description_html) {
    descriptionHTML = `<div class="feature-description">${item.description_html}</div>`;
  } else if (item.description) {
    descriptionHTML = `<div class="feature-description">${escapeHtml(item.description)}</div>`;
  }

  let parentFeatureHTML = '';
  if (renderParentFeature && item.parent_feature && item.parent_feature !== item.id) {
    const parentCardType = item.parent_feature_baseline === false ? 'limited-availability' : 'newly-available';
    parentFeatureHTML = `<div class="parent-feature-info">Part of: <a href="../index.html#feature-${item.parent_feature}-${parentCardType}" target="_blank" rel="noopener">${escapeHtml(item.parent_feature_name || item.parent_feature)}<span class="visually-hidden"> (opens in a new tab)</span></a></div>`;
  }

  let linksHTML = '';
  if (item.spec) {
    linksHTML += `<a href="${item.spec}" class="spec-link" target="_blank" rel="noopener">Specification<span class="visually-hidden"> for ${escapedOriginalName} (opens in a new tab)</span></a>`;
  }
  linksHTML += `<a href="https://webstatus.dev/features/${getWebStatusId(item)}" class="webstatus-link" target="_blank" rel="noopener">Web Status<span class="visually-hidden"> for ${escapedOriginalName} (opens in a new tab)</span></a>`;
  linksHTML += `<a href="https://web-platform-dx.github.io/web-features-explorer/features/${getWebFeaturesId(item)}/" class="web-platform-dx-link" target="_blank" rel="noopener">Web Features Explorer<span class="visually-hidden"> for ${escapedOriginalName} (opens in a new tab)</span></a>`;
  if (item.mdn) {
    const mdnEntry = item.mdn[0];
    linksHTML += `<a href="${mdnEntry.url}" class="mdn-link" title="${escapeHtml(mdnEntry.title)}" target="_blank" rel="noopener">MDN<span class="visually-hidden"> documentation for ${escapedOriginalName} (opens in a new tab)</span></a>`;
  }
  if (item.chromeContent) {
    // Show one link from web.dev if available
    if (item.chromeContent['web.dev'] && item.chromeContent['web.dev'].length > 0) {
      const webDevUrl = item.chromeContent['web.dev'][0];
      linksHTML += `<a href="${webDevUrl}" class="webdev-link" target="_blank" rel="noopener">web.dev<span class="visually-hidden"> article for ${escapedOriginalName} (opens in a new tab)</span></a>`;
    }
    // Show one link from developer.chrome.com if available
    if (item.chromeContent['developer.chrome.com'] && item.chromeContent['developer.chrome.com'].length > 0) {
      const chromeDevUrl = item.chromeContent['developer.chrome.com'][0];
      linksHTML += `<a href="${chromeDevUrl}" class="chromedev-link" target="_blank" rel="noopener">developer.chrome.com<span class="visually-hidden"> article for ${escapedOriginalName} (opens in a new tab)</span></a>`;
    }
  }

  let cardType = item.displayType;
  if (item.status?.baseline === false) {
    cardType = 'limited-availability';
  }
  const uniqueCardId = `${idPrefix}-${item.id}-${cardType}`;

  const classes = ['feature-card'];
  if (item.prediction) classes.push('prediction');
  if (item.discouraged) classes.push('discouraged');
  else if (item.status?.baseline === false) classes.push('limited-availability');
  else classes.push(item.displayType);

  let dataAttrs = '';
  if (item.shipDates) {
    item.shipDates.forEach(shipDate => {
      dataAttrs += ` data-browser-${shipDate.browser}-${shipDate.version}="true"`;
    });
  }
  if (item.interop) {
    const interopYears = item.interop.map(entry => entry.year).sort((a, b) => b - a);
    if (interopYears.length > 0) {
      dataAttrs += ` data-interop-${interopYears[0]}="true"`;
    }
  }

  return `
    <div id="${uniqueCardId}" class="${classes.join(' ')}"${dataAttrs}>
      <div class="feature-card-header">
        <div class="feature-top-row">
          <div class="title-container">
            <h3 class="feature-title">
              <button class="feature-toggle-btn" type="button" aria-expanded="false" aria-controls="details-${uniqueCardId}">
                ${baselineIconHTML}
                ${predictionHTML}
                <span>${escapedName}</span>
              </button>
              ${upvoteHTML}
              <a href="#${uniqueCardId}" class="feature-link-icon" aria-label="Permalink to ${escapedOriginalName} (${displayTypeForTooltip})"><span aria-hidden="true">🔗</span></a>
            </h3>
          </div>
          <div class="browser-support">${browserTagsHTML}${interopHTML}</div>
        </div>
        <div class="feature-details" id="details-${uniqueCardId}" style="display: none;">
          ${parentFeatureHTML}
          ${descriptionHTML}
          ${availabilityHTML}
          ${browserTableHTML}
          ${bcdKeysHTML}
          <div class="feature-links">${linksHTML}</div>
        </div>
      </div>
    </div>
  `;
}

export function generateTimelineHTML(items, options = {}) {
  const groups = groupItemsByDate(items);
  let html = '<div id="timeline-content">';

  groups.forEach(group => {
    const dateHeader = createDateHeader(group.date);
    const monthName = group.date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    const anchorId = `${monthName}-${group.date.getFullYear()}`;

    let itemsHTML = '';
    group.items
      .sort((a, b) => b.date - a.date)
      .forEach(item => {
        itemsHTML += createCard(item, options);
      });

    if (itemsHTML) {
      html += `<div class="date-group" id="${anchorId}">`;
      html += dateHeader;
      html += itemsHTML;
      html += '</div>';
    }
  });

  html += '</div>';
  return html;
}
