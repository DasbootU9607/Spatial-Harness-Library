'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const argument = process.argv[2];
if (!argument) throw new Error('Supply an empty output directory');
const out = path.resolve(argument);
fs.mkdirSync(out, { recursive: true });
if (fs.readdirSync(out).length) throw new Error('Select an empty directory for the Pages artifact');

for (const file of ['index.html', 'library.css']) {
  fs.copyFileSync(path.join(root, file), path.join(out, file));
}
for (const harness of ['maze-harness', 'spatialviz-harness', 'babyvision-harness', 'spatialb-harness']) {
  const site = path.join(root, harness, 'site');
  if (!fs.statSync(path.join(site, 'index.html')).isFile()) throw new Error('Missing site for ' + harness);
  fs.cpSync(site, path.join(out, harness), { recursive: true });
}
console.log('Library and four harness sites assembled at ' + out);
