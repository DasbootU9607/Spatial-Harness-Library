'use strict';
const {execFileSync}=require('node:child_process'),path=require('node:path');
const {readPrinted}=require('./cad_solve.cjs');
function readNative(file){
 const output=execFileSync(process.env.SPATIALVIZ_PYTHON||'python',['-B',path.join(__dirname,'cad_plate.py'),'read',file],{encoding:'utf8',windowsHide:true});
 const printed=JSON.parse(output);return {printed,...readPrinted(printed)};
}
if(require.main===module)console.log(JSON.stringify(readNative(process.argv[2]),null,2));
module.exports={readNative};
