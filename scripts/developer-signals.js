/**
 * developer-signals.js
 * 
 * Simple script to fetch developer signals data from GitHub and
 * save it to a local JSON file for the application to use.
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'node:url';

// URL to the raw JSON file on GitHub
const DEVELOPER_SIGNALS_URL = 'https://web-platform-dx.github.io/developer-signals/web-features-signals.json';
const OUTPUT_FILE = './data/developer-signals.json';

export async function updateDeveloperSignals() {
  try {
    console.log(`Fetching developer signals from ${DEVELOPER_SIGNALS_URL}...`);
    
    const response = await fetch(DEVELOPER_SIGNALS_URL);
    
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    
    console.log(`Saving data to ${OUTPUT_FILE}...`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
    
    console.log('Developer signals data updated successfully!');
  } catch (error) {
    console.error(`Error updating developer signals: ${error.message}`);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await updateDeveloperSignals();
  } catch (error) {
    process.exit(1);
  }
}
