import { execSync } from 'node:child_process';
import { patchWebFeatures } from './patch-web-features.js';
import { updateMetadata } from './update-meta.js';

console.log('🚀 Starting upstream synchronization for web-features...');

function runCommand(cmd) {
  console.log(`\n⚙️ Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Command failed: ${cmd}`);
    throw error;
  }
}

async function main() {
  try {
    // 1. Apply local patch in node_modules
    console.log('\n🩹 Applying local patch to web-features...');
    patchWebFeatures();

    // 2. Install workspace dependencies for web-features repo
    runCommand('npm install --prefix node_modules/web-features');

    // 3. Regenerate .yml.dist files using our patched logic
    runCommand('npm run dist --prefix node_modules/web-features');

    // 4. Build web-features package to produce data.json
    runCommand('npm run build --prefix node_modules/web-features');

    // 5. Extract metadata into timebase
    console.log('\n📊 Extracting metadata into timebase...');
    await updateMetadata();

    console.log('\n✅ Upstream synchronization complete!');
  } catch (error) {
    console.error('\n❌ Synchronization failed!');
    process.exit(1);
  }
}

main();

