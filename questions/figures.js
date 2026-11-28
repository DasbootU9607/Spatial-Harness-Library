// Integer voxel projection used for generated exercises.
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
