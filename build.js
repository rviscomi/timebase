import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTimelineHTML } from './renderer.js';
import { browsers, features as rawFeatures } from './data.js';
import developerSignalsData from './developer-signals.json' with { type: "json" };
import interopData from './interop.json' with { type: "json" };
import mdnDocsData from './mdn.json' with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, 'docs');
const TEMPLATE_PATH = path.resolve(__dirname, 'index.html');

// Helper to parse YYYY-MM-DD as a local date (not UTC)
function parseLocalDate(dateString) {
  if (!dateString) return;
  if (dateString instanceof Date) return new Date(dateString);
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function processFeatures() {
  const processedFeatures = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);

  Object.entries(rawFeatures).forEach(([id, data]) => {
    if (data.kind && data.kind !== 'feature') {
      return;
    }

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

    const baseFeature = {
      id,
      name: data.name || id,
      description: data.description,
      description_html: data.description_html || data.description,
      discouraged: data.discouraged,
      spec: data.spec,
      status: data.status,
      shipDates: shipDates,
      developerSignal: developerSignalsData?.[id],
      interop: interopData?.[id],
      mdn: mdnDocsData?.[id]
    };

    baseFeature.status.baseline_low_date = parseLocalDate(data.status.baseline_low_date);

    if (data.status.baseline === false) {
      processedFeatures.push({
        ...baseFeature,
        date: shipDates.at(-1).date,
        prediction: shipDates.at(-1).date > now,
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
      if (!feature || !feature.date || isNaN(feature.date)) {
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
    await fs.mkdir(DIST_DIR);
  }

  // Copy static assets
  const assets = ['styles.css', 'developer-signals.css', 'interop.css', 'images', 'ical-generator.js', 'data.js', 'developer-signals.json', 'interop.json', 'mdn.json'];
  for (const asset of assets) {
    const source = path.resolve(__dirname, asset);
    const dest = path.resolve(DIST_DIR, asset);
    await fs.cp(source, dest, { recursive: true });
  }


  const template = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  const features = processFeatures();

  const timelineHTML = generateTimelineHTML(features);

  const outputHTML = template.replace('<!-- TIMELINE_CONTENT -->', timelineHTML)
    ;

  await fs.writeFile(path.resolve(DIST_DIR, 'index.html'), outputHTML);
  await fs.copyFile(path.resolve(__dirname, 'client.js'), path.resolve(DIST_DIR, 'client.js'));

  console.log('Static HTML generated successfully!');
}

build();
