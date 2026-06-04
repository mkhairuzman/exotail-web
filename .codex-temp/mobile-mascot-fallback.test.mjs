import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('src/js/main.js', 'utf8');

assert.match(source, /MOBILE_START\s*=\s*['"]\/animation\/axolotl-start-mobile\.webp['"]/);
assert.match(source, /MOBILE_WAVE\s*=\s*['"]\/animation\/axolotl-wave-mobile\.webp['"]/);
assert.match(source, /injectMascotPoster\(mount,\s*MOBILE_START\)/);
assert.match(source, /mobileImg\.src\s*=\s*MOBILE_WAVE/);
assert.match(source, /mobileImg\.src\s*=\s*MOBILE_START/);
