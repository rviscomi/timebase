import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export function patchWebFeatures() {
  patchIndexTs();
  patchComputeBaseline();
}

function patchIndexTs() {
  const indexPath = join(__dirname, '..', 'node_modules', 'web-features', 'index.ts');

  if (!existsSync(indexPath)) {
    throw new Error(`❌ Could not find web-features index.ts at ${indexPath}\nMake sure you have run npm install and that the file exists.`);
  }

  let content = readFileSync(indexPath, 'utf8');

  const sentinel = '// Patched by Timebase';

  if (content.includes(sentinel)) {
    console.log('ℹ️ web-features index.ts is already patched by Timebase, skipping.');
    return;
  }

  // The surgical patch: remove the pre-release filter
  const searchStr = '.filter(release => !release.isPrerelease())';

  if (content.includes(searchStr)) {
    console.log('Applying "futures" patch to web-features index.ts...');
    content = sentinel + '\n' + content.replace(searchStr, '');
    writeFileSync(indexPath, content, 'utf8');
    console.log('✅ Patch applied successfully to index.ts!');
  } else {
    throw new Error(`❌ Could not find search string in web-features index.ts to apply patch.\nSearch string: "${searchStr}"\nThis likely means the upstream code has changed and the patcher needs update.`);
  }
}

function patchComputeBaseline() {
  const supportPath = join(__dirname, '..', 'node_modules', 'web-features', 'packages', 'compute-baseline', 'dist', 'baseline', 'support.js');

  if (!existsSync(supportPath)) {
    console.log(`ℹ️ Could not find compute-baseline support.js at ${supportPath}. It might be built later, skipping.`);
    return;
  }

  let content = readFileSync(supportPath, 'utf8');

  const sentinel = '// Patched by Timebase (compute-baseline)';

  if (content.includes(sentinel)) {
    console.log('ℹ️ compute-baseline support.js is already patched by Timebase, skipping.');
    return;
  }

  const searchStr = 'for (let index = b.current().releaseIndex; index >= 0; index--)';

  if (content.includes(searchStr)) {
    console.log('Applying "futures" patch to compute-baseline support.js...');
    content = sentinel + '\n' + content.replace(searchStr, 'for (let index = b.releases.length - 1; index >= 0; index--)');
    writeFileSync(supportPath, content, 'utf8');
    console.log('✅ Patch applied successfully to compute-baseline support.js!');
  } else {
    console.log(`⚠️ Could not find search string in compute-baseline support.js to apply patch. This might mean it was already patched or the code structure changed.`);
  }
}


if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    patchWebFeatures();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

