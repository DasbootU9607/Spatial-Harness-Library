'use strict';
const fs=require('node:fs'),crypto=require('node:crypto');
const wait=new Int32Array(new SharedArrayBuffer(4));
// Windows may temporarily deny replacement while a reader/virus scanner holds a handle.
// Keep the old complete file until rename succeeds; never unlink it as a fallback.
function replace(temp,file){const deadline=Date.now()+3000;while(true){try{fs.renameSync(temp,file);return;}catch(error){if(!['EPERM','EACCES','EBUSY'].includes(error.code)||Date.now()>=deadline)throw error;Atomics.wait(wait,0,0,20);}}}
function atomic(file,data){const temp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(data,null,2)+'\n');replace(temp,file);}
module.exports={replace,atomic};
