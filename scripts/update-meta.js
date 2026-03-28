import { extractData } from './extract-data.js';
import { extractBCDData } from './extract-bcd-data.js';
import { updateDeveloperSignals } from './developer-signals.js';
import { updateInteropMappings } from './interop.js';
import { updateMDNDocs } from './mdn-docs.js';
import { updateChromeContent } from './chrome-content.js';
import { fileURLToPath } from 'node:url';

export async function updateMetadata() {
  try {
    // 1. Extract data from web-features data.json (Assumes it's already built)
    extractData();

    
    // 2. Extract BCD keys
    extractBCDData();
    
    // 3. Update developer signals from GitHub
    await updateDeveloperSignals();
    
    // 4. Update Interop mappings from GitHub
    await updateInteropMappings();
    
    // 5. Update MDN docs from GitHub
    await updateMDNDocs();
    
    // 6. Update Chrome content mappings from web.dev
    await updateChromeContent();
    
    console.log('✅ Metadata extraction complete!');
  } catch (error) {
    console.error('❌ Metadata extraction failed!', error.message);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await updateMetadata();
  } catch (error) {
    process.exit(1);
  }
}
