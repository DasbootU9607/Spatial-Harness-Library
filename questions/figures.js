// Integer voxel projection used for the collection plate and generated exercises.
export function voxelSvg(points) {
  const project = ([x,y,z]) => [(x-y)*.8660254, (x+y)*.5-z];
  const voxels = points.map(p => p.map((v,i) => Math.round(v-points[0][i])));
  const occupied = new Set(voxels.map(v=>v.join(',')));
  const faces = [
    {offset:[1,0,0],corners:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],color:'#c4c4c1'},
    {offset:[0,1,0],corners:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]],color:'#e1e1de'},
    {offset:[0,0,1],corners:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],color:'#fcfcfa'}
  ];
  const polys=[], xs=[], ys=[];
  const depth=p=>p[0]+p[1]+p[2];
  for(const pos of voxels.sort((a,b)=>depth(a)-depth(b))) {
    for(const f of faces) {
      if(occupied.has(pos.map((n,i)=>n+f.offset[i]).join(','))) continue;
      const vertices=f.corners.map(c=>project(c.map((v,i)=>v+pos[i])));
      vertices.forEach(([x,y])=>{xs.push(x);ys.push(y)});
      polys.push('<polygon points="'+vertices.map(pt=>pt.join(',')).join(' ')+'" fill="'+f.color+'"/>');
    }
  }
  const x=Math.min(...xs)-.22,y=Math.min(...ys)-.22;
  const box=[x,y, Math.max(...xs)-x+.22,Math.max(...ys)-y+.22].join(' ');
  return '<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" viewBox="'+box+'"><g stroke="#242424" stroke-width=".035" stroke-linejoin="round">'+polys.join('')+'</g></svg>';
}

function torus() {
  // Oblique projection of a twisted torus, sampled as continuous contour lines.
  const lines=[], tau=2*Math.PI;
  for(let i=0;i<90;i++) {
    const u=tau*i/90, pts=[];
    for(let j=0;j<=54;j++) {
      const v=tau*j/54, w=v+2*u;
      const radial=1.03+.49*Math.cos(w)*Math.cos(u)-.28*Math.sin(w)*Math.sin(u);
      const h=.49*Math.cos(w)*Math.sin(u)+.28*Math.sin(w)*Math.cos(u);
      const x=radial*Math.cos(u),y=radial*Math.sin(u);
      pts.push((150+77*x+8*y).toFixed(2)+','+(78+36*y-65*h-14*x).toFixed(2));
    }
    lines.push('<polyline points="'+pts.join(' ')+'"/>');
  }
  return '<svg viewBox="0 0 300 155" aria-hidden="true"><g stroke="#222" stroke-width=".67" fill="none">'+lines.join('')+'</g></svg>';
}
export function drawPlates() {
  document.querySelector('#specimen').innerHTML=torus();
  document.querySelector('#cover-cubes').innerHTML=voxelSvg([[0,0,0],[1,0,0],[2,0,0],[2,0,1],[2,1,1],[2,2,1],[2,2,2]]);
  const rings=[];
  for(let i=0;i<4;i++) for(let j=0;j<3;j++) {
    const x=45+30*i,y=22+30*j,angle=i===2&&j===1?-48:48;
    rings.push('<g transform="translate('+x+' '+y+') rotate('+angle+')"><ellipse rx="11" ry="7" fill="none" stroke="#444" stroke-width=".9"/><ellipse rx="8" ry="4" fill="none" stroke="#555" stroke-width=".6"/><circle cx="2" r="2.2" fill="#303030"/></g>');
  }
  document.querySelector('#cover-eyes').innerHTML='<svg viewBox="0 0 180 104" aria-hidden="true">'+rings.join('')+'</svg>';
  const curves=['M12 78 C22 5 156 2 165 78','M10 34 C45 100 98 98 164 25','M20 87 C138 0 35 14 165 70','M14 52 C70 8 111 99 168 53','M23 19 C126 92 60 100 156 16'];
  document.querySelector('#cover-path').innerHTML='<svg viewBox="0 0 180 104" aria-hidden="true"><g fill="none" stroke="#444" stroke-width="1.2">'+curves.map(d=>'<path d="'+d+'"/>').join('')+'</g>'+[[12,78],[165,78],[10,34],[164,25],[20,87],[165,70],[14,52],[168,53],[23,19],[156,16]].map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="4" fill="'+(i===0?'#222':'white')+'" stroke="#333"/>').join('')+'</svg>';
}
