#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
let directory=__dirname,root=null;
while(true){const binding=path.join(directory,'.harness-library.json');if(fs.existsSync(binding)){root=JSON.parse(fs.readFileSync(binding,'utf8')).root;break;}if(fs.existsSync(path.join(directory,'tools/construct.cjs'))){root=directory;break;}const parent=path.dirname(directory);if(parent===directory)break;directory=parent;}
if(!root)throw Error('Install this package using the library tools/install.cjs command to bind its shared runtime.');
const forwarded=process.argv.slice(2),command=forwarded[0];
if(['generate','render','verify'].includes(command)){
 if(forwarded.includes('--adapter'))throw Error('This skill selects its own domain adapter.');
 forwarded.push('--adapter','official-rotation-2d');
}
if(command==='start'&&!forwarded.includes('--harness'))forwarded.push('--harness','spatialviz-harness');
if(['start','finish'].includes(command)&&!forwarded.includes('--skill'))forwarded.push('--skill',path.resolve(__dirname,'..'));
const result=spawnSync(process.execPath,[path.join(root,'tools/construct.cjs'),...forwarded],{stdio:'inherit',windowsHide:true});
process.exitCode=result.status??1;
