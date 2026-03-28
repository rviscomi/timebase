import { execSync } from 'node:child_process';
import { patchWebFeatures } from './patch-web-features.js';

console.log('🚀 Preparing web-features for timebase (upstream futures)...');

function runCommand(cmd) {
  console.log(`\n⚙️ Running: ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`❌ Command failed: ${cmd}`);
    throw error;
  }
}

export function prepareFutures() {
  try {
    // 1. Install workspace dependencies for web-features repo (builds compute-baseline)
    runCommand('npm install --prefix node_modules/web-features');

    // 2. Apply local patch in node_modules
    console.log('\n🩹 Applying local patch to web-features and compute-baseline...');
    patchWebFeatures();


    // 3. Regenerate .yml.dist files using our patched logic
    runCommand('npm run dist --prefix node_modules/web-features');

    // 4. Build web-features package to produce data.json
    runCommand('npm run build --prefix node_modules/web-features');

    console.log('\n✅ web-features preparation complete!');
  } catch (error) {
    console.error('\n❌ Preparation failed!');
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  prepareFutures();
}
