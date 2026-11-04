'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const argument = process.argv[2];
if (!argument) throw new Error('Supply an empty output directory');
const out = path.resolve(argument);
fs.mkdirSync(out, { recursive: true });
if (fs.readdirSync(out).length) throw new Error('Select an empty directory for the Pages artifact');

for (const file of ['index.html', 'library.css', 'chooser.js']) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
for (const harness of ['maze-harness', 'spatialviz-harness', 'babyvision-harness', 'spatialb-harness']) {
  const site = path.join(root, harness, 'site');
  if (!fs.statSync(path.join(site, 'index.html')).isFile()) throw new Error('Missing site for ' + harness);
  fs.cpSync(site, path.join(out, harness), { recursive: true });
}
fs.cpSync(path.join(root, 'questions'), path.join(out, 'questions'), { recursive: true });
require('../../tools/build-exhibition.cjs').build(out);
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Library, four harness sites, and question collections assembled at ' + out);
