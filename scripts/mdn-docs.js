/**
 * mdn-docs.js
 * 
 * Simple script to fetch MDN documentation mappings from GitHub and
 * save it to a local JSON file for the application to use.
 */

import fs from 'fs/promises';
import { fileURLToPath } from 'node:url';

// URL to the raw JSON file on GitHub
const MDN_DOCS_URL = 'https://raw.githubusercontent.com/web-platform-dx/web-features-mappings/main/mappings/mdn-docs.json';
const OUTPUT_FILE = './data/mdn.json';

export async function updateMDNDocs() {
  try {
    console.log(`Fetching MDN docs from ${MDN_DOCS_URL}...`);
    
    const response = await fetch(MDN_DOCS_URL);
    
    if (!response.ok) {
      throw new Error(`Request failed with status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    
    console.log(`Saving data to ${OUTPUT_FILE}...`);
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(jsonData, null, 2));
    
    console.log('MDN docs data updated successfully!');
  } catch (error) {
    console.error(`Error updating MDN docs: ${error.message}`);
    throw error;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await updateMDNDocs();
  } catch (error) {
    process.exit(1);
  }
}
