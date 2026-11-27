'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {spawnSync}=require('node:child_process'),{prepare,readPrinted}=require('./cad_system.cjs');
const left=require('../assets/freecad/hoist-left.json'),right=require('../assets/freecad/hoist-right.json');
function print(side){
 const {worksheet}=prepare(side==='left'?left:right,421);
 return {...worksheet,facts:['A 16T / B 32T : external mesh on frame.','B and D are keyed to one shaft.','W hangs from the taut '+side+' tangent of D.'],options:worksheet.options.map(o=>o.label+'  '+o.text)};
}
test('One visible connection edit moves the physical load under the new tangent and reverses the inferred output',()=>{
 const edited=structuredClone(left);edited.connections.find(j=>j.kind==='cord').side='right';assert.deepEqual(edited,right);
 assert.equal(prepare(left,421).actual.members.W.at[0],18);assert.equal(prepare(right,421).actual.members.W.at[0],30);
 const a=readPrinted(print('left')),b=readPrinted(print('right'));assert.deepEqual(a.result,['down']);assert.deepEqual(b.result,['up']);
 assert.deepEqual(a.options.map(o=>o.text),b.options.map(o=>o.text));
});
test('Missing coupling, hidden tangent and duplicate choices cannot pass the independent reader',()=>{
 const a=print('left');a.facts.splice(1,1);assert.throws(()=>readPrinted(a),/Underdetermined|Unknown member/);
 const b=print('right');b.facts[2]=b.facts[2].replace('right ','');assert.throws(()=>readPrinted(b),/Unreadable/);
 const c=print('left');c.options[0]='A  '+c.options[1].slice(3);assert.throws(()=>readPrinted(c),/one matching/);
});
test('Formal inputs require FreeCAD settings and supported physical interfaces',()=>{
 const s=structuredClone(left);delete s.cad;assert.throws(()=>prepare(s,1),/requires cad/);
 s.cad=left.cad;s.connections[1].kind='clutch';assert.throws(()=>prepare(s,1),/No FreeCAD construction/);
});
test('An explicitly unavailable FreeCAD executable is a hard error',()=>{
 const py=process.env.SPATIALVIZ_PYTHON||'python',script=path.join(__dirname,'cad_launch.py');
 const r=spawnSync(py,['-B',script,__dirname],{env:{...process.env,SPATIALVIZ_FREECAD:path.join(__dirname,'no-such-freecad')},encoding:'utf8',windowsHide:true});
 assert.notEqual(r.status,0);assert.match(r.stderr,/FreeCAD GUI executable required/);
});
