#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
let directory=__dirname,root=null;
while(true){const binding=path.join(directory,'.harness-library.json');if(fs.existsSync(binding)){root=JSON.parse(fs.readFileSync(binding,'utf8')).root;break;}if(fs.existsSync(path.join(directory,'tools/construct.cjs'))){root=directory;break;}const parent=path.dirname(directory);if(parent===directory)break;directory=parent;}
if(!root)throw Error('Install this package using the library tools/install.cjs command to bind its shared runtime.');
const result=spawnSync(process.execPath,[path.join(root,'tools/construct.cjs'),...process.argv.slice(2)],{stdio:'inherit',windowsHide:true});
process.exitCode=result.status??1;
