'use strict';
// Independent world-coordinate solver. It does not import the constructor.
const PALETTE=['#d9e2ed','#eab66a','#6fa9ce','#8ebe92','#c49bce'];
const matrices=[[[1,0],[0,1]],[[0,-1],[1,0]],[[-1,0],[0,-1]],[[0,1],[-1,0]]];
const map=(m,p)=>m.map(row=>row.reduce((n,v,i)=>n+v*p[i],0));
const key=p=>p.join(',');
function glyphKey(g){return g.kind+':'+(g.kind==='dots'?g.points.map(key).sort():g.points.map((p,i)=>[key(p),key(g.points[(i+1)%g.points.length])].sort().join('/')).sort()).join(';');}
function valid(g){
  if(!g||![g.rows,g.cols].every(x=>Number.isInteger(x)&&x>=2&&x<=5)||g.cells?.length!==g.rows*g.cols)return false;
  if(!Array.isArray(g.marker)||g.marker.length!==2||![0,g.cols].includes(g.marker[0])||![0,g.rows].includes(g.marker[1]))return false;
  return g.cells.every(c=>PALETTE.includes(c.color)&&c.glyph&&['dots','polygon'].includes(c.glyph.kind)&&Array.isArray(c.glyph.points)&&c.glyph.points.length<=5&&(c.glyph.kind!=='polygon'||c.glyph.points.length>=3)&&c.glyph.points.every(p=>Array.isArray(p)&&p.length===2&&p.every(x=>Number.isInteger(x)&&Math.abs(x)<=3))&&new Set(c.glyph.points.map(key)).size===c.glyph.points.length);
}
function variant(g,m){
  const corners=[[0,0],[g.cols,0],[0,g.rows],[g.cols,g.rows]].map(p=>map(m,p));
  const lo=[0,1].map(i=>Math.min(...corners.map(p=>p[i]))),hi=[0,1].map(i=>Math.max(...corners.map(p=>p[i])));
  const cols=hi[0]-lo[0],rows=hi[1]-lo[1],cells=Array(rows*cols);
  g.cells.forEach((c,i)=>{const p=map(m,[i%g.cols+.5,Math.floor(i/g.cols)+.5]).map((x,k)=>Math.floor(x-lo[k]));cells[p[1]*cols+p[0]]={color:c.color,glyph:{kind:c.glyph.kind,points:c.glyph.points.map(p=>map(m,p))}};});
  return {rows,cols,cells,marker:map(m,g.marker).map((x,i)=>x-lo[i])};
}
const canonical=g=>JSON.stringify([g.rows,g.cols,g.marker,g.cells.map(c=>[c.color,glyphKey(c.glyph)])]);
function compare(a,b){
  const attempts=matrices.map((m,i)=>{
    const r=variant(a,m),issues=[];
    if(r.rows!==b.rows||r.cols!==b.cols)issues.push(`dimensions ${r.rows} by ${r.cols} instead of ${b.rows} by ${b.cols}`);
    else r.cells.forEach((c,k)=>{if(c.color!==b.cells[k].color||glyphKey(c.glyph)!==glyphKey(b.cells[k].glyph))issues.push(`cell (row ${Math.floor(k/r.cols)+1}, column ${k%r.cols+1}) has different ${c.color!==b.cells[k].color?'color':'pattern orientation or geometry'}`);});
    if(key(r.marker)!==key(b.marker))issues.push(`red corner at (${r.marker}) instead of (${b.marker})`);
    return {degrees:i*90,issues,score:issues.length+(r.rows!==b.rows||r.cols!==b.cols?100:0)};
  });
  const match=attempts.find(x=>!x.issues.length),best=[...attempts].sort((a,b)=>a.score-b.score)[0];
  return {equivalent:!!match,rotation:match?.degrees??null,witness:best,explanation:match?`A ${match.degrees} degree clockwise rotation maps every cell, internal pattern and red corner exactly.`:`No match among 0, 90, 180 and 270 degrees. Closest alignment: ${best.degrees} degrees clockwise; ${best.issues.slice(0,3).join('; ')}.`};
}
module.exports={PALETTE,valid,variant,matrices,canonical,compare,glyphKey};
