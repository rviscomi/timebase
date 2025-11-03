import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTimelineHTML } from './renderer-bcd.js';
import { browsers, bcdKeys as rawBcdKeys } from './bcd-data.js';
import { parseLocalDate } from './renderer-shared.js';
import developerSignalsData from './developer-signals.json' with { type: "json" };
import interopData from './interop.json' with { type: "json" };
import mdnDocsData from './mdn.json' with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, 'docs', 'bcd');
const TEMPLATE_PATH = path.resolve(__dirname, 'index.html');

function processBcdKeys() {
  const processedKeys = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  Object.entries(rawBcdKeys).forEach(([id, data]) => {
    const shipDates = Object.entries(data.status?.support || {}).map(([browser, version]) => {
      if (typeof version !== 'string') {
        return null;
      }
      if (version === 'preview') {
        return {
          date: lastDay,
          browser,
          version: 'preview',
          isPreview: true
        };
      }
      const cleanVersion = version.replace('≤', '');
      const browserData = browsers[browser];
      if (!browserData?.releases) {
        return null;
      }
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
    shipDates.sort((a, b) => a.date - b.date);

    const baseBcdKey = {
      id,
      name: data.name || id,
      parent_feature: data.parent_feature,
      parent_feature_name: data.parent_feature_name,
      description: data.description,
      description_html: data.description_html || data.description,
      discouraged: data.discouraged,
      spec: data.spec,
      status: data.status,
      shipDates: shipDates,
      developerSignal: developerSignalsData?.[data.parent_feature],
      interop: interopData?.[data.parent_feature],
      mdn: mdnDocsData?.[data.parent_feature]
    };

    baseBcdKey.status.baseline_low_date = parseLocalDate(data.status.baseline_low_date);

    if (data.status.baseline === false) {
      processedKeys.push({
        ...baseBcdKey,
        date: shipDates.at(-1).date,
        prediction: shipDates.at(-1).date > now,
        displayType: 'limited-availability',
        displayName: 'Limited availability'
      });
      return;
    }

    if (data.status.baseline === 'high') {
      baseBcdKey.status.baseline_high_date = parseLocalDate(data.status.baseline_high_date);
    } else {
      baseBcdKey.status.baseline_high_date = parseLocalDate(data.status.baseline_low_date);
      baseBcdKey.status.baseline_high_date.setMonth(baseBcdKey.status.baseline_low_date.getMonth() + 30);
    }

    processedKeys.push({
      ...baseBcdKey,
      date: baseBcdKey.status.baseline_low_date,
      prediction: baseBcdKey.status.baseline_low_date > now,
      displayType: 'newly-available',
      displayName: 'Newly available'
    });

    processedKeys.push({
      ...baseBcdKey,
      date: baseBcdKey.status.baseline_high_date,
      prediction: data.status.baseline === 'low',
      displayType: 'widely-available',
      displayName: 'Widely available'
    });
  });

  return processedKeys
    .filter(key => {
      if (!key || !key.date || isNaN(key.date)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.date - a.date);
}

async function build() {
  try {
    await fs.access(DIST_DIR);
  } catch (error) {
    await fs.mkdir(DIST_DIR, { recursive: true });
  }

  // Only copy BCD-specific files (shared assets are in parent dir)
  const assets = ['bcd-data.js'];
  for (const asset of assets) {
    const source = path.resolve(__dirname, asset);
    const dest = path.resolve(DIST_DIR, asset);
    await fs.cp(source, dest, { recursive: false });
  }

  const template = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  const bcdKeys = processBcdKeys();

  const timelineHTML = generateTimelineHTML(bcdKeys);

  const outputHTML = template
    .replace('<!-- TIMELINE_CONTENT -->', timelineHTML)
    .replace('<script type="module" src="app.js"></script>', '<script type="module" src="client-bcd.js"></script>')
    .replace('<script type="module" src="client.js"></script>', '<script type="module" src="client-bcd.js"></script>')
    .replace('<title>Baseline timeline</title>', '<title>Baseline timeline - BCD Keys</title>')
    .replace('<h1>Baseline Timeline</h1>', '<h1>Baseline Timeline - BCD Keys</h1>')
    .replace('<p>Timeline of web features and browser support</p>', '<p>Timeline of BCD keys and browser support</p>')
    .replace('<meta name="description" content="Timeline of web features and browser support">', '<meta name="description" content="Timeline of BCD keys and browser support">')
    // Update paths to reference parent directory for shared assets
    .replace(/href="styles\.css"/g, 'href="../styles.css"')
    .replace(/href="developer-signals\.css"/g, 'href="../developer-signals.css"')
    .replace(/href="interop\.css"/g, 'href="../interop.css"')
    .replace(/src="images\//g, 'src="../images/');

  await fs.writeFile(path.resolve(DIST_DIR, 'index.html'), outputHTML);
  await fs.copyFile(path.resolve(__dirname, 'client-bcd.js'), path.resolve(DIST_DIR, 'client-bcd.js'));

  console.log(`BCD static HTML generated successfully with ${bcdKeys.length} BCD keys!`);
}

build();
