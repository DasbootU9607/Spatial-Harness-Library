'use strict';
const config={width:1200,height:650,cellSize:46,layout:'four-columns',axes:'x-right-y-down',marker:'outer-corner'};
function render(s){
 const models=[s.geometry,...s.options.slice(0,3).map(o=>o.geometry)];
 function panel(g,i){const z=config.cellSize,x=150+i*300-g.cols*z/2,y=120+(5-g.rows)*z/2;
  let out=`<text x="${150+i*300}" y="76" text-anchor="middle" font-size="24" font-weight="700">${i?'ABC'[i-1]:'Original'}</text>`;
  g.cells.forEach((c,k)=>{const cx=x+(k%g.cols)*z,cy=y+Math.floor(k/g.cols)*z;out+=`<rect x="${cx}" y="${cy}" width="${z}" height="${z}" fill="${c.color}" stroke="#233447" stroke-width="1.5"/>`;
   const points=c.glyph.points.map(([a,b])=>[cx+z/2+a*z/10,cy+z/2+b*z/10]);
   out+=c.glyph.kind==='dots'?points.map(([a,b])=>`<circle cx="${a}" cy="${b}" r="3.8" fill="#132333"/>`).join(''):`<polygon points="${points.map(p=>p.join(',')).join(' ')}" fill="#132333"/>`;
  });
  const mx=x+g.marker[0]*z+(g.marker[0]===0?-11:0),my=y+g.marker[1]*z+(g.marker[1]===0?-11:0);
  return out+`<rect x="${mx}" y="${my}" width="11" height="11" fill="#df2935" stroke="#8c1821"/>`;
 }
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 650" role="img" aria-label="Original grid, three graphical choices and text option D"><rect width="1200" height="650" fill="#fff"/><g font-family="Arial,sans-serif" fill="#162a3d"><text x="30" y="30" font-size="15">ROTATION STUDY / ${s.generator.parameters.mode.toUpperCase()} GRID</text>${models.map(panel).join('')}<path d="M30 420H1170" stroke="#d9e2ed"/><text x="35" y="462" font-size="22">D. All three other options are incorrect</text><text x="35" y="510" font-size="18">Choose the grid obtainable by rotation only. Do not reflect or change any part.</text><text x="35" y="544" font-size="17">The red corner and all internal patterns rotate together with the grid.</text><text x="35" y="598" font-size="14" fill="#52687c">Newly constructed example / A, B, C are graphical choices; D is a text choice.</text></g></svg>\n`;
}
module.exports={config,render};
