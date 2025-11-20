import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateTimelineHTML } from '../src/renderer/renderer-bcd.js';
import { browsers, bcdKeys as rawBcdKeys } from '../data/bcd-data.js';
import { processBcdKeys } from '../src/data-processor.js';
import developerSignalsData from '../data/developer-signals.json' with { type: "json" };
import interopData from '../data/interop.json' with { type: "json" };
import mdnDocsData from '../data/mdn.json' with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../docs', 'bcd');
const TEMPLATE_PATH = path.resolve(__dirname, '../src/index.html');

async function build() {
  try {
    await fs.access(DIST_DIR);
  } catch (error) {
    await fs.mkdir(DIST_DIR, { recursive: true });
  }

  // Only copy BCD-specific files (shared assets are in parent dir)
  // We also need to copy src for the modules to work
  const assets = ['data', 'src'];
  for (const asset of assets) {
    const source = path.resolve(__dirname, '../', asset);
    const dest = path.resolve(DIST_DIR, asset);
    await fs.cp(source, dest, { recursive: true });
  }

  const template = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  const bcdKeys = processBcdKeys(rawBcdKeys, browsers, {
    developerSignals: developerSignalsData,
    interop: interopData,
    mdn: mdnDocsData
  });

  const timelineHTML = generateTimelineHTML(bcdKeys);

  const outputHTML = template
    .replace('<!-- TIMELINE_CONTENT -->', timelineHTML)
    .replace('<script type="module" src="client.js"></script>', '<script type="module" src="client-bcd.js"></script>')
    .replace('<title>Baseline timeline</title>', '<title>Baseline timeline - BCD Keys</title>')
    .replace('<h1>Baseline Timeline</h1>', '<h1>Baseline Timeline - BCD Keys</h1>')
    .replace('<p>Timeline of web features and browser support</p>', '<p>Timeline of BCD keys and browser support</p>')
    .replace('<meta name="description" content="Timeline of web features and browser support">', '<meta name="description" content="Timeline of BCD keys and browser support">')
    // Remove calendar buttons
    .replace(/<button id="download-ical-top"[^>]*>[\s\S]*?<\/button>/g, '')
    .replace(/<button id="download-ical-bottom"[^>]*>[\s\S]*?<\/button>/g, '')
    .replace(/<p>Add web features timeline to your calendar<\/p>/g, '')
    // Update paths to reference parent directory for shared assets
    .replace(/href="styles\.css"/g, 'href="../styles.css"')
    .replace(/src="images\//g, 'src="../images/');

  await fs.writeFile(path.resolve(DIST_DIR, 'index.html'), outputHTML);
  await fs.copyFile(path.resolve(__dirname, '../src/client-bcd.js'), path.resolve(DIST_DIR, 'client-bcd.js'));

  console.log(`BCD static HTML generated successfully with ${bcdKeys.length} BCD keys!`);
}

build();
