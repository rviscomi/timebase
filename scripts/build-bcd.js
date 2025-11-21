import path from 'path';
import { fileURLToPath } from 'url';
import { generateTimelineHTML } from '../src/renderer/renderer-bcd.js';
import { browsers, bcdKeys as rawBcdKeys } from '../data/bcd-data.js';
import { processBcdKeys } from '../src/data-processor.js';
import { buildTimeline } from './build-shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../docs', 'bcd');

async function build() {
  await buildTimeline({
    distDir: DIST_DIR,
    renderer: generateTimelineHTML,
    templateReplacements: [
      ['<script type="module" src="client.js"></script>', '<script type="module" src="client-bcd.js"></script>'],
      ['<title>Baseline timeline</title>', '<title>Baseline timeline - BCD Keys</title>'],
      ['<h1>Baseline Timeline</h1>', '<h1>Baseline Timeline - BCD Keys</h1>'],
      ['<p>Timeline of web features and browser support</p>', '<p>Timeline of BCD keys and browser support</p>'],
      ['<meta name="description" content="Timeline of web features and browser support">', '<meta name="description" content="Timeline of BCD keys and browser support">'],
      // Remove calendar buttons
      [new RegExp('<button id="download-ical-top"[^>]*>[\\s\\S]*?<\\/button>', 'g'), ''],
      [new RegExp('<button id="download-ical-bottom"[^>]*>[\\s\\S]*?<\\/button>', 'g'), ''],
      [new RegExp('<p>Add web features timeline to your calendar<\\/p>', 'g'), ''],
      // Update paths to reference parent directory for shared assets
      [new RegExp('href="styles\\.css"', 'g'), 'href="../src/styles.css"'],
      [new RegExp('src="images\\/', 'g'), 'src="../images/']
    ],
    clientScript: 'client-bcd.js',
    dataProcessor: processBcdKeys,
    rawArgs: {
      data: rawBcdKeys,
      browsers: browsers
    }
  });
}

build();
