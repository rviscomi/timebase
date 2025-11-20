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

import { processFeatures } from './src/data-processor.js';


async function build() {
  try {
    await fs.access(DIST_DIR);
  } catch (error) {
    await fs.mkdir(DIST_DIR);
  }

  // Copy static assets
  const assets = ['styles.css', 'developer-signals.css', 'interop.css', 'images', 'data.js', 'developer-signals.json', 'interop.json', 'mdn.json', 'src'];
  for (const asset of assets) {
    const source = path.resolve(__dirname, asset);
    const dest = path.resolve(DIST_DIR, asset);
    await fs.cp(source, dest, { recursive: true });
  }


  const template = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  const features = processFeatures(rawFeatures, browsers, {
    developerSignals: developerSignalsData,
    interop: interopData,
    mdn: mdnDocsData
  });

  const timelineHTML = generateTimelineHTML(features);

  const outputHTML = template.replace('<!-- TIMELINE_CONTENT -->', timelineHTML)
    ;

  await fs.writeFile(path.resolve(DIST_DIR, 'index.html'), outputHTML);
  await fs.copyFile(path.resolve(__dirname, 'client.js'), path.resolve(DIST_DIR, 'client.js'));

  console.log('Static HTML generated successfully!');
}

build();
