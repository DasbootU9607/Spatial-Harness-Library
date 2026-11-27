#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');
let directory=__dirname;
while (!fs.existsSync(path.join(directory,'tools/construct.cjs'))) {
  const binding=path.join(directory,'.harness-library.json');
  if (fs.existsSync(binding)) { directory=JSON.parse(fs.readFileSync(binding,'utf8')).root;break; }
  const parent=path.dirname(directory);
  if (parent===directory) throw Error('Install with the Spatial Harness Library installer to bind its runtime');
  directory=parent;
}
Promise.resolve().then(()=>require(path.join(directory,'spatialviz-harness/penetration/author.cjs'))(
  path.resolve(__dirname,'..'),process.argv.slice(2))).catch(error=>{console.error(error);process.exitCode=1;});
