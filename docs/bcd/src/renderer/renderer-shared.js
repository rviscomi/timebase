// Shared rendering utilities for both features and BCD keys

import { escapeHtml, groupItemsByDate } from '../utils.js';



export function createDateHeader(date) {
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

export function createBrowserTag(browser, version) {
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

export function createInteropTag(year) {
  return `
    <button class="interop-tag" type="button" data-interop-year="${year}" data-filter="interop:${year}" aria-pressed="false">
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
  return browserTableHTML;
}
