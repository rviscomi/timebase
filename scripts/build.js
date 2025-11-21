import path from 'path';
import { fileURLToPath } from 'url';
import { generateTimelineHTML } from '../src/renderer/renderer.js';
import { browsers, features as rawFeatures } from '../data/web-features.js';
import { processFeatures } from '../src/core/data-processor.js';
import { buildTimeline } from './build-shared.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../docs');

async function build() {
  await buildTimeline({
    distDir: DIST_DIR,
    renderer: generateTimelineHTML,
    templateReplacements: [
      ['href="styles.css"', 'href="src/styles/styles.css"']
    ],
    clientScript: 'client.js',
    dataProcessor: processFeatures,
    rawArgs: {
      data: rawFeatures,
      browsers: browsers
    }
  });
}

build();
