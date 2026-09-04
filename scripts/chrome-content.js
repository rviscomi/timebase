/**
 * chrome-content.js
 * 
 * Simple script to fetch web.dev and developer.chrome.com content mappings
 * and save them to a local JSON file for the application to use.
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'node:url';

// URLs to the content mappings
const WEBDEV_URL = 'https://web.dev/web-features.json';
const CHROME_DEVS_URL = 'https://developer.chrome.com/web-features.json';
const OUTPUT_FILE = './data/chrome-content.json';

export async function updateChromeContent() {
  try {
    // Load existing data as fallback if available
    let existingData = {};
    try {
      const raw = await fs.readFile(OUTPUT_FILE, 'utf-8');
      existingData = JSON.parse(raw);
    } catch {
      // If file doesn't exist or is invalid, fallback is empty
    }

    let webDevWebFeatures = existingData['web-features']?.['web.dev'] || {};
    let webDevBcd = existingData['bcd']?.['web.dev'] || {};
    let chromeDevsWebFeatures = existingData['web-features']?.['developer.chrome.com'] || {};
    let chromeDevsBcd = existingData['bcd']?.['developer.chrome.com'] || {};

    // Fetch web.dev data
    try {
      console.log(`Fetching web.dev mappings from ${WEBDEV_URL}...`);
      const webDevResponse = await fetch(WEBDEV_URL);
      if (!webDevResponse.ok) {
        console.warn(`⚠️ web.dev request failed with status: ${webDevResponse.status}. Retaining existing mappings.`);
      } else {
        const webDevData = await webDevResponse.json();
        webDevWebFeatures = webDevData['web-features'] || {};
        webDevBcd = webDevData['bcd'] || {};
      }
    } catch (error) {
      console.warn(`⚠️ Error fetching web.dev mappings: ${error.message}. Retaining existing mappings.`);
    }

    // Fetch developer.chrome.com data
    try {
      console.log(`Fetching developer.chrome.com mappings from ${CHROME_DEVS_URL}...`);
      const chromeDevsResponse = await fetch(CHROME_DEVS_URL);
      if (!chromeDevsResponse.ok) {
        console.warn(`⚠️ developer.chrome.com request failed with status: ${chromeDevsResponse.status}. Retaining existing mappings.`);
      } else {
        const chromeDevsData = await chromeDevsResponse.json();
        chromeDevsWebFeatures = chromeDevsData['web-features'] || {};
        chromeDevsBcd = chromeDevsData['bcd'] || {};
      }
    } catch (error) {
      console.warn(`⚠️ Error fetching developer.chrome.com mappings: ${error.message}. Retaining existing mappings.`);
    }

    // Combine the data - structure will have separate sources
    const extractedData = {
      'web-features': {
        'web.dev': webDevWebFeatures,
        'developer.chrome.com': chromeDevsWebFeatures
      },
      'bcd': {
        'web.dev': webDevBcd,
        'developer.chrome.com': chromeDevsBcd
      }
    };

    const webDevWebFeaturesCount = Object.keys(extractedData['web-features']['web.dev']).length;
    const chromeDevsWebFeaturesCount = Object.keys(extractedData['web-features']['developer.chrome.com']).length;
    const webDevBcdCount = Object.keys(extractedData['bcd']['web.dev']).length;
    const chromeDevsBcdCount = Object.keys(extractedData['bcd']['developer.chrome.com']).length;

    console.log(`Extracted ${webDevWebFeaturesCount} web.dev web-features mappings`);
    console.log(`Extracted ${chromeDevsWebFeaturesCount} developer.chrome.com web-features mappings`);
    console.log(`Extracted ${webDevBcdCount} web.dev BCD mappings`);
    console.log(`Extracted ${chromeDevsBcdCount} developer.chrome.com BCD mappings`);

    console.log(`Saving data to ${OUTPUT_FILE}...`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(extractedData, null, 2));

    console.log('Web.dev and developer.chrome.com mappings updated successfully!');
  } catch (error) {
    console.error(`Error updating mappings: ${error.message}`);
    // Non-critical: log and do not break the pipeline
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await updateChromeContent();
  } catch (error) {
    process.exit(1);
  }
}

