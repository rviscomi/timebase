/**
 * interop.js
 * 
 * Script to fetch Interop feature mappings data from GitHub and
 * save it to a local JSON file for the application to use.
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'node:url';

// URL to the raw JSON file on GitHub
const INTEROP_URL = 'https://raw.githubusercontent.com/web-platform-dx/web-features-mappings/main/mappings/interop.json';
const OUTPUT_FILE = './data/interop.json';

export async function updateInteropMappings() {
  try {
    console.log(`Fetching Interop mappings from ${INTEROP_URL}...`);
    
    const response = await fetch(INTEROP_URL);
    
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    
    console.log(`Saving data to ${OUTPUT_FILE}...`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
    
    console.log('Interop mappings data updated successfully!');
  } catch (error) {
    console.error(`Error updating Interop mappings: ${error.message}`);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await updateInteropMappings();
  } catch (error) {
    process.exit(1);
  }
}
