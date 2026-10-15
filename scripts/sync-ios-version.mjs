// Copia la versión de package.json a MARKETING_VERSION del proyecto de Xcode
// y sube CURRENT_PROJECT_VERSION (número de build) en uno si se pasa --bump.
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const pbx = resolve(root, 'ios/App/App.xcodeproj/project.pbxproj');
let s = readFileSync(pbx, 'utf8');
s = s.replace(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`);
if (process.argv.includes('--bump')) {
  const current = Number(/CURRENT_PROJECT_VERSION = (\d+);/.exec(s)?.[1] ?? 0);
  s = s.replace(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${current + 1};`);
  console.log(`Build ${current + 1}`);
}
writeFileSync(pbx, s);
console.log(`Versión ${version}`);
