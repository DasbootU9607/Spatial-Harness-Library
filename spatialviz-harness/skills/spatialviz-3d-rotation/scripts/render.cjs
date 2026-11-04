'use strict';
const config={width:1200,height:1150,layout:'paired-isometric-and-complete-layers',cubeSize:28,layerCellSize:18,cameras:[[1,1,1],[-1,-1,1]],axes:'right-handed-x-y-z',layers:'z-ascending-x-right-y-up'};
const key=p=>p.join(',');
// Rendering derives its own normalized occupancy; the solver audits the layer output.
function scene(raw){
 const min=[0,1,2].map(i=>Math.min(...raw.map(p=>p[i]))),points=raw.map(p=>p.map((x,i)=>x-min[i]));
 const size=[0,1,2].map(i=>1+Math.max(...points.map(p=>p[i]))),set=new Set(points.map(key));
 const layers=Array.from({length:size[2]},(_,z)=>({z,rows:Array.from({length:size[1]},(_,row)=>Array.from({length:size[0]},(_,x)=>set.has(key([x,size[1]-1-row,z]))?1:0))}));
 const views=[1,-1].map(sign=>{
  const project=([x,y,z])=>[sign*.866025403784*(x-y),sign*(.5*x+.5*y)-z];
  const faces=[];
  for(const p of points)for(let axis=0;axis<3;axis++){
   const faceSign=axis===2?1:sign,neighbor=p.slice();neighbor[axis]+=faceSign;if(set.has(key(neighbor)))continue;
   const others=[0,1,2].filter(i=>i!==axis),vertices=[[0,0],[1,0],[1,1],[0,1]].map(v=>p.map((n,i)=>i===axis?n+(faceSign===1?1:0):n+v[others.indexOf(i)]));
   faces.push({axis,vertices:vertices.map(project),depth:vertices.map(([x,y,z])=>sign*(x+y)+z).reduce((a,b)=>a+b,0)/4});
  }
  faces.sort((a,b)=>a.depth-b.depth||a.axis-b.axis);
  return {faces,axes:[[1,0,0],[0,1,0],[0,0,1]].map(project)};
 });
 return {size,layers,views};
}
function visualAudit(raw){
 const built=scene(raw),decoded=[];
 for(const layer of built.layers)layer.rows.forEach((row,r)=>row.forEach((occupied,x)=>{if(occupied)decoded.push([x,built.size[1]-1-r,layer.z]);}));
 // Round-trip proof: every occupied and empty location is explicitly displayed.
 const S=require('./solve.cjs');
 return {complete:S.canonical(decoded)===S.canonical(raw),cubesDecoded:decoded.length,layers:built.layers.length,minimumCellPixels:config.layerCellSize,method:'Complete z slices, all occupied and empty cells; paired isometric views for spatial perception. Human inspection still required.'};
}
function render(spec){
 const models=[spec.geometry,...spec.options.slice(0,3).map(o=>o.geometry)];
 function panel(raw,i){const s=scene(raw),px=20+(i%2)*590,py=70+Math.floor(i/2)*480;
  let out=`<g transform="translate(${px},${py})"><rect width="570" height="460" rx="12" fill="#f8fafc" stroke="#dce4ed"/><text x="22" y="32" font-size="24" font-weight="700">${i?'ABC'[i-1]:'Original'}</text>`;
  s.views.forEach((view,j)=>{const verts=view.faces.flatMap(f=>f.vertices),lo=[0,1].map(k=>Math.min(...verts.map(v=>v[k]))),hi=[0,1].map(k=>Math.max(...verts.map(v=>v[k]))),cx=145+j*280,cy=169,z=config.cubeSize;
   out+=`<text x="${cx}" y="58" text-anchor="middle" font-size="14">${j?'Rear view':'View 1'}</text>`;
   for(const face of view.faces)out+=`<polygon points="${face.vertices.map(p=>[cx+(p[0]-(lo[0]+hi[0])/2)*z,cy+(p[1]-(lo[1]+hi[1])/2)*z].join(',')).join(' ')}" fill="${['#83a5c5','#adc7df','#d2e2ef'][face.axis]}" stroke="#233d56" stroke-width="1.2" stroke-linejoin="round"/>`;
   const ax=40+j*280,ay=265;view.axes.forEach((v,k)=>{const tx=ax+v[0]*22,ty=ay+v[1]*22;out+=`<path d="M${ax},${ay}L${tx},${ty}" stroke="#38556f"/><text x="${tx+3}" y="${ty+4}" font-size="11">${'xyz'[k]}</text>`;});
  });
  out+=`<text x="22" y="310" font-size="15" font-weight="700">Complete layers / x right, y up / z increases left to right</text>`;
  const cell=config.layerCellSize,stride=s.size[0]*cell+32;
  for(const layer of s.layers){const x=40+layer.z*stride,y=344;out+=`<text x="${x}" y="332" font-size="14">z = ${layer.z}</text>`;layer.rows.forEach((row,r)=>row.forEach((occupied,col)=>{out+=`<rect data-voxel="${col},${s.size[1]-1-r},${layer.z}" data-occupied="${occupied}" x="${x+col*cell}" y="${y+r*cell}" width="${cell}" height="${cell}" fill="${occupied?'#456f96':'#ffffff'}" stroke="#95a8ba" stroke-width=".7"/>`;}));out+=`<text x="${x-10}" y="${y+s.size[1]*cell+14}" font-size="10">(0,0)</text>`;}
  return out+'</g>';
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1150" role="img" aria-label="Original cube model and three options, each with paired views and complete layer diagrams"><rect width="1200" height="1150" fill="white"/><g font-family="Arial,sans-serif" fill="#162a3d"><text x="26" y="35" font-size="22">Which model ${spec.polarity==='can'?'CAN':'CANNOT'} be obtained by rotating the original?</text>${models.map(panel).join('')}<text x="30" y="1050" font-size="22">D. All three other options are incorrect</text><text x="30" y="1086" font-size="16">Each pair shows one solid from opposite sides. Shaded layer cell = one cube; white cell = empty.</text><text x="30" y="1116" font-size="16">Layers use View 1 axes and disclose the entire model. Rotation is allowed; reflection and edits are not.</text></g></svg>\n`;
}
module.exports={config,scene,visualAudit,render};
