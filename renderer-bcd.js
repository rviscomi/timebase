import {
  escapeHtml,
  groupItemsByDate,
  createDateHeader,
  addBrowserTagsInOrder,
  processBrowserSupport,
  createBrowserSupportTable,
  createInteropTag
} from './renderer-shared.js';

function createBcdKeyHeader(bcdKey, uniqueCardId) {
  let baselineIconHTML = '';
  const baseline = bcdKey.status?.baseline;
  if (baseline !== undefined) {
    let iconName;
    let titleText;
    if (baseline === false) {
      iconName = 'baseline-limited-icon.svg';
      titleText = bcdKey.discouraged ? 'This feature is discouraged' : 'Limited availability across browsers';
    } else if (bcdKey.displayType === 'widely-available') {
      iconName = 'baseline-widely-icon.svg';
      titleText = `Baseline ${bcdKey.displayName}`;
    } else if (bcdKey.displayType === 'newly-available') {
      iconName = 'baseline-newly-icon.svg';
      titleText = `Baseline ${bcdKey.displayName}`;
    }
    if (iconName) {
      baselineIconHTML = `<img src="images/${iconName}" alt="${iconName.replace('baseline-', '').replace('-icon.svg', '')} support" class="baseline-icon" title="${titleText}">`;
    }
  }

  let bcdKeyName = bcdKey.name;
  if (bcdKey.prediction) {
    bcdKeyName = '🔮 ' + bcdKeyName;
  }

  const escapedName = escapeHtml(bcdKeyName);
  const escapedOriginalName = escapeHtml(bcdKey.name);

  let upvoteHTML = '';
  if (bcdKey.developerSignal) {
    upvoteHTML = `
      <div class="upvote-info title-upvote">
        <a href="${bcdKey.developerSignal.url}" class="upvote-count" target="_blank" rel="noopener noreferrer">
          <span class="upvote-icon">👍</span> ${bcdKey.developerSignal.votes}
        </a>
      </div>
    `;
  }

  let displayTypeForTooltip = bcdKey.displayName;
  if (bcdKey.discouraged) {
    displayTypeForTooltip = 'discouraged';
  } else if (bcdKey.status?.baseline === false) {
    displayTypeForTooltip = 'Limited availability';
  }

  const browserReleases = processBrowserSupport(bcdKey);
  const browserTagsHTML = addBrowserTagsInOrder(browserReleases);

  let interopHTML = '';
  if (bcdKey.interop) {
    const interopYears = bcdKey.interop.map(entry => entry.year).sort((a, b) => b - a);
    if (interopYears.length > 0) {
      const mostRecentYear = interopYears[0];
      interopHTML = createInteropTag(mostRecentYear);
    }
  }

  // Create availability info text
  let availabilityHTML = '';
  let itemDate = bcdKey.date;
  if (bcdKey.displayType === 'limited-availability') {
    itemDate = bcdKey.shipDates[0].date;
  }
  if (!itemDate && bcdKey.shipDates && bcdKey.shipDates.length > 0) {
    itemDate = bcdKey.shipDates[0].date;
  }
  
  if (itemDate) {
    const now = new Date();
    const formattedDate = itemDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let availabilityText = '';
    if (bcdKey.displayType === 'limited-availability') {
      if (bcdKey.discouraged) {
        const authority = bcdKey.discouraged.according_to.map(url => {
          const hostname = new URL(url).hostname;
          if (hostname == 'github.com') {
            const repo = url.split('/').slice(-2).join('/');
            return `<a href="${url}" target="_blank">${repo}</a>`;
          }
          return `<a href="${url}" target="_blank">${hostname}</a>`;
        }).join(', ');
        availabilityText = `This feature is discouraged by ${authority}.`;
      } else if (itemDate > now) {
        availabilityText = `🔮 Expected to become Limited availability across browsers on ${formattedDate}.`;
      } else {
        availabilityText = `Limited availability across browsers since ${formattedDate}.`;
      }
    } else if (bcdKey.displayType === 'newly-available' && bcdKey.status?.baseline_high_date) {
      const widelyFormattedDate = bcdKey.status.baseline_high_date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const widelyAvailableId = `bcd-${bcdKey.id}-widely-available`;
      
      if (bcdKey.status.baseline === 'high') {
        availabilityText = `Newly available since ${formattedDate}.<br>Became widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      } else if (bcdKey.prediction) {
        availabilityText = `🔮 Expected to become newly available on ${formattedDate}.<br>🔮 Expected to become widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      } else {
        availabilityText = `Newly available since ${formattedDate}.<br>🔮 Expected to become widely available on <a href="#${widelyAvailableId}" class="widely-available-link">${widelyFormattedDate}</a>.`;
      }
    } else if (bcdKey.displayType === 'widely-available') {
      if (bcdKey.prediction) {
        availabilityText = `🔮 Expected to become widely available on ${formattedDate}.`;
      } else {
        availabilityText = `Widely available since ${formattedDate}.`;
      }
    }

    if (availabilityText) {
      availabilityHTML = `<div class="availability-info-text">${availabilityText}</div>`;
    }
  }

  const browserTableHTML = createBrowserSupportTable(bcdKey);

  let descriptionHTML = '';
  if (bcdKey.description_html) {
    descriptionHTML = `<div class="feature-description">${bcdKey.description_html}</div>`;
  } else if (bcdKey.description) {
    descriptionHTML = `<div class="feature-description">${escapeHtml(bcdKey.description)}</div>`;
  }

  // Add parent feature info for BCD keys
  let parentFeatureHTML = '';
  if (bcdKey.parent_feature && bcdKey.parent_feature !== bcdKey.id) {
    parentFeatureHTML = `<div class="parent-feature-info">Part of: <a href="../index.html#feature-${bcdKey.parent_feature}" target="_blank">${escapeHtml(bcdKey.parent_feature_name || bcdKey.parent_feature)}</a></div>`;
  }

  let linksHTML = '';
  if (bcdKey.spec) {
    linksHTML += `<a href="${bcdKey.spec}" class="spec-link" target="_blank">Specification</a>`;
  }
  linksHTML += `<a href="https://webstatus.dev/features/${bcdKey.id}" class="webstatus-link" target="_blank">Web Status</a>`;
  if (bcdKey.mdn) {
    const mdnEntry = bcdKey.mdn[0];
    linksHTML += `<a href="${mdnEntry.url}" class="mdn-link" title="${escapeHtml(mdnEntry.title)}" target="_blank">MDN</a>`;
  }

  return `
    <div class="feature-card-header">
      <div class="feature-top-row" style="cursor: pointer;" aria-expanded="false" aria-controls="details-${uniqueCardId}">
        <div class="title-container">
          <h2 class="feature-title">
            ${baselineIconHTML}
            <span>${escapedName}</span>
            ${upvoteHTML}
            <a href="#${uniqueCardId}" class="feature-link-icon" title="Link to ${escapedOriginalName} (${displayTypeForTooltip})">🔗</a>
          </h2>
        </div>
        <div class="browser-support">${browserTagsHTML}${interopHTML}</div>
      </div>
      <div class="feature-details" id="details-${uniqueCardId}" style="display: none;">
        ${parentFeatureHTML}
        ${descriptionHTML}
        ${availabilityHTML}
        ${browserTableHTML}
        <div class="feature-links">${linksHTML}</div>
      </div>
    </div>
  `;
}

function createBcdKeyCard(bcdKey) {
  let cardType = bcdKey.displayType;
  if (bcdKey.status?.baseline === false) {
    cardType = 'limited-availability';
  }
  const uniqueCardId = `bcd-${bcdKey.id}-${cardType}`;

  const classes = ['feature-card'];
  if (bcdKey.prediction) classes.push('prediction');
  if (bcdKey.discouraged) classes.push('discouraged');
  else if (bcdKey.status?.baseline === false) classes.push('limited-availability');
  else classes.push(bcdKey.displayType);

  let dataAttrs = '';
  if (bcdKey.shipDates) {
    bcdKey.shipDates.forEach(shipDate => {
      dataAttrs += ` data-browser-${shipDate.browser}-${shipDate.version}="true"`;
    });
  }
  if (bcdKey.interop) {
    const interopYears = bcdKey.interop.map(entry => entry.year).sort((a, b) => b - a);
    if (interopYears.length > 0) {
      dataAttrs += ` data-interop-${interopYears[0]}="true"`;
    }
  }

  const headerHTML = createBcdKeyHeader(bcdKey, uniqueCardId);

  return `
    <div id="${uniqueCardId}" class="${classes.join(' ')}"${dataAttrs}>
      ${headerHTML}
    </div>
  `;
}

export function generateTimelineHTML(bcdKeys) {
  const groups = groupItemsByDate(bcdKeys);
  let html = '<div id="timeline-content">';

  groups.forEach(group => {
    const dateHeader = createDateHeader(group.date);
    const monthName = group.date.toLocaleDateString('en-US', { month: 'long' }).toLowerCase();
    const anchorId = `${monthName}-${group.date.getFullYear()}`;

    let itemsHTML = '';
    group.items
      .sort((a, b) => b.date - a.date)
      .forEach(item => {
        itemsHTML += createBcdKeyCard(item);
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
