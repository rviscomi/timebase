import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import developerSignalsData from '../data/developer-signals.json' with { type: "json" };
import interopData from '../data/interop.json' with { type: "json" };
import mdnDocsData from '../data/mdn.json' with { type: "json" };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATE_PATH = path.resolve(__dirname, '../src/index.html');

/**
 * Shared build function for generating timeline HTML
 * @param {Object} options
 * @param {string} options.distDir - Output directory
 * @param {Array} options.data - Data to render (features or keys)
 * @param {Function} options.renderer - Function to generate HTML from data
 * @param {Array<[string|RegExp, string]>} options.templateReplacements - Array of [pattern, replacement] pairs
 * @param {string} options.clientScript - Name of the client script to copy (e.g., 'client.js')
 * @param {Function} options.dataProcessor - Function to process data before rendering (optional)
 * @param {Object} options.rawArgs - Raw arguments for data processor (optional)
 */
export async function buildTimeline({
  distDir,
  renderer,
  templateReplacements = [],
  clientScript,
  dataProcessor,
  rawArgs
}) {
  try {
    await fs.access(distDir);
  } catch (error) {
    await fs.mkdir(distDir, { recursive: true });
  }

  // Copy static assets
  // If distDir is a subdirectory (like docs/bcd), we need to handle assets differently
  // But for now, let's assume we copy 'data' and 'src' to the output directory
  // or ensure they are accessible.
  // The original scripts copied 'images', 'data', 'src' to docs/
  // and 'data', 'src' to docs/bcd/
  
  const assets = ['data', 'src'];
  // Add images if we are in the root docs dir (heuristic: distDir ends with 'docs')
  if (distDir.endsWith('docs')) {
    assets.push('images');
  }

  for (const asset of assets) {
    const source = path.resolve(__dirname, '../', asset);
    const dest = path.resolve(distDir, asset);
    await fs.cp(source, dest, { recursive: true, force: true });
  }

  const template = await fs.readFile(TEMPLATE_PATH, 'utf-8');
  
  let processedData;
  if (dataProcessor && rawArgs) {
    processedData = dataProcessor(rawArgs.data, rawArgs.browsers, {
      developerSignals: developerSignalsData,
      interop: interopData,
      mdn: mdnDocsData
    });
  } else {
    throw new Error('dataProcessor and rawArgs are required');
  }

  const timelineHTML = renderer(processedData);

  let outputHTML = template.replace('<!-- TIMELINE_CONTENT -->', timelineHTML);

  for (const [pattern, replacement] of templateReplacements) {
    outputHTML = outputHTML.replace(pattern, replacement);
  }

  await fs.writeFile(path.resolve(distDir, 'index.html'), outputHTML);
  
  if (clientScript) {
    await fs.copyFile(
      path.resolve(__dirname, `../src/${clientScript}`), 
      path.resolve(distDir, clientScript)
    );
  }

  console.log(`Static HTML generated successfully at ${distDir}!`);
}
