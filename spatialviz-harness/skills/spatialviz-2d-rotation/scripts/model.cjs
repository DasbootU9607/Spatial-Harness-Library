'use strict';
const S=require('./solve.cjs');
const clone=x=>JSON.parse(JSON.stringify(x));
function random(seed){let x=seed>>>0;return n=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return Math.floor(x/4294967296*n);};}
// Constructor uses array indices; validation uses transformed cell centers.
function rotate(g){const h={rows:g.cols,cols:g.rows,cells:Array(g.cells.length),marker:[g.rows-g.marker[1],g.marker[0]]};g.cells.forEach((c,i)=>{const r=Math.floor(i/g.cols),col=i%g.cols;h.cells[col*h.cols+g.rows-1-r]={color:c.color,glyph:{kind:c.glyph.kind,points:c.glyph.points.map(([x,y])=>[-y||0,x])}};});return h;}
function mirror(g){const h=clone(g);h.marker=[g.cols-g.marker[0],g.marker[1]];g.cells.forEach((c,i)=>{h.cells[Math.floor(i/g.cols)*g.cols+g.cols-1-i%g.cols]={color:c.color,glyph:{kind:c.glyph.kind,points:c.glyph.points.map(([x,y])=>[-x||0,y])}};});return h;}
function generate(seed,params={}){
  const p={rows:3,cols:2,mode:'colored',distractors:['mirror','swap'],...params};
  if(Object.keys(params).some(k=>!['rows','cols','mode','distractors'].includes(k))||!Number.isSafeInteger(seed)||![p.rows,p.cols].every(x=>Number.isInteger(x)&&x>=2&&x<=5)||!['colored','patterned'].includes(p.mode)||!Array.isArray(p.distractors)||p.distractors.length!==2||p.distractors.some(x=>!['mirror','swap','orientation','marker'].includes(x))||(p.mode==='colored'&&p.distractors.includes('orientation')))throw Error('Supported: integer seed, rows/cols 2..5, colored or patterned, two supported distractors (orientation requires patterned).');
  const rand=random(seed),motifs=[{kind:'dots',points:[[-2,0],[2,0]]},{kind:'dots',points:[[-2,-2],[-2,2],[2,2]]},{kind:'polygon',points:[[-3,-2],[3,0],[-3,2]]}];
  for(let trial=0;trial<400;trial++){
    const geometry={rows:p.rows,cols:p.cols,cells:Array.from({length:p.rows*p.cols},()=>({color:S.PALETTE[rand(p.mode==='colored'?5:2)],glyph:p.mode==='colored'?{kind:'dots',points:[]}:clone(motifs[rand(motifs.length)])})),marker:[rand(2)*p.cols,rand(2)*p.rows]};
    const options=[],operations=[];
    let target=geometry;const turns=1+rand(3);for(let i=0;i<turns;i++)target=rotate(target);
    options.push(target);operations.push({kind:'rotation',degrees:90*turns});
    for(const kind of p.distractors){
      let accepted=false;
      for(let attempt=0;attempt<80;attempt++){
        let h=clone(target);for(let i=0,n=rand(4);i<n;i++)h=rotate(h);
        if(kind==='mirror')h=mirror(h);
        if(kind==='swap'){const a=rand(h.cells.length),b=rand(h.cells.length);[h.cells[a],h.cells[b]]=[h.cells[b],h.cells[a]];}
        if(kind==='orientation'){const c=h.cells[rand(h.cells.length)];c.glyph.points=c.glyph.points.map(([x,y])=>[-y||0,x]);}
        if(kind==='marker'){const axis=rand(2);h.marker[axis]=(axis===0?h.cols:h.rows)-h.marker[axis];}
        if(!S.compare(geometry,h).equivalent&&!options.some(o=>S.canonical(o)===S.canonical(h))){options.push(h);operations.push({kind});accepted=true;break;}
      }
      if(!accepted)break;
    }
    if(options.length!==3)continue;
    for(let i=2;i>0;i--){const j=rand(i+1);[options[i],options[j]]=[options[j],options[i]];[operations[i],operations[j]]=[operations[j],operations[i]];}
    return {geometry,options,parameters:p,operations,polarity:'can'};
  }
  throw Error('No valid distinct distractor set within retry bound; change parameters or seed.');
}
module.exports={generate,rotate,mirror};
