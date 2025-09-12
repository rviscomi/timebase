import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = join(__dirname, 'node_modules', 'web-features', 'data.extended.json');
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

// Extract both browsers and features data
const moduleContent = `// Generated from web-features package
export const browsers = ${JSON.stringify(data.browsers, null, 2)};
export const features = ${JSON.stringify(data.features, null, 2)};
`;

writeFileSync('data.js', moduleContent);
console.log('Data extracted successfully!'); 