'use strict';
// Orthographic end views. Axial planes are unfolded horizontally at a common scale.
function assemblyFigure(q,{jointView,titles,text,rect,line,esc}){
 const g=q.geometry,m=q.assembly,names=Object.keys(m),ink='#193742',green='#096b5e',orange='#a04418',paper='#fffcf5';
 const num=x=>Number(x.toFixed(3));
 const partRadius=b=>b.teeth?b.teeth/2:b.radius??(b.kind==='carrier'?4:7);
 const planes=[...new Set(names.map(n=>m[n].at[2]))].sort((a,b)=>a-b);
 const bounds=planes.map(z=>{
  const ids=names.filter(n=>m[n].at[2]===z),ext=(fn,axis,k)=>fn(...ids.map(n=>m[n].at[axis]+k*partRadius(m[n])));
  return {z,ids,l:ext(Math.min,0,-1),r:ext(Math.max,0,1),t:ext(Math.min,1,-1),b:ext(Math.max,1,1)};
 });
 const H0=Math.max(...bounds.map(b=>b.b))-Math.min(...bounds.map(b=>b.t)),wid=bounds.reduce((x,b)=>x+b.r-b.l,0);
 const sc=Math.max(.25,Math.min(6,360/Math.max(1,H0),800/Math.max(1,wid)));
 let x0=30;const pos={};
 const top=168,bottom=top+H0*sc+116,midY=top+56-Math.min(...bounds.map(b=>b.t))*sc;
 for(const b of bounds){
  b.left=x0;b.width=Math.max(150,(b.r-b.l)*sc+88);
  for(const n of b.ids)pos[n]=[num(x0+b.width/2+(m[n].at[0]-(b.l+b.r)/2)*sc),num(midY+m[n].at[1]*sc),num(partRadius(m[n])*sc)];
  x0+=b.width+19;
 }
 const hasSeats=g.joints.some(j=>j.kind==='face'&&j.settings.form==='double face wheel');
 const W=Math.max(940,x0+12),col=(W-52)/2,notes=bottom+(hasSeats?55:34),card=132,end=notes+Math.ceil(g.joints.length/2)*card+10,H=end+162;
 const margin=Math.max(0,(W-x0)/2);for(const band of bounds)band.left+=margin;for(const point of Object.values(pos))point[0]=num(point[0]+margin);
 const circle=(x,y,r,f,st=ink,width=1.7)=>'<circle cx="'+num(x)+'" cy="'+num(y)+'" r="'+num(r)+'" fill="'+f+'" stroke="'+st+'" stroke-width="'+width+'"/>';
 const label=(x,y,s,size=14,color=ink)=>'<text x="'+num(x)+'" y="'+num(y)+'" font-family="Arial,sans-serif" font-size="'+size+'" font-weight="700" stroke="'+paper+'" stroke-width="3.5" paint-order="stroke" fill="'+color+'">'+esc(s)+'</text>';
 const poly=(pts,fill,stroke,w=1)=>'<polygon points="'+pts.map(p=>p.map(num).join(',')).join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="'+w+'"/>';
 const path=(d,c,w,dash='')=>'<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+w+'"'+(dash?' stroke-dasharray="'+dash+'"':'')+'/>';
 let svg=rect(0,0,W,H,paper)+text(26,32,'MECHANICAL SYSTEM   /   ASSEMBLY STUDY',14,green,700)
  +text(26,68,'Drive '+g.driver+'   '+g.input,28,ink,700)+text(26,98,'Find '+g.targets.map(t=>t.name+' ('+t.kind+')').join(' and ')+' '+g.scope+'.',18)
  +text(26,125,'CW is clockwise looking into each marked plane. All outputs are relative to the frame.',14)
  +text(26,149,'Numbered flags locate working contacts. Crossings without a flag transmit no motion.',14);
 for(const b of bounds){svg+=rect(b.left,top,b.width,bottom-top-12,'#f1f4ee')+text(b.left+10,top+21,'PLANE '+b.z+'   ·   FRONT',12,green,700);}
 const contactPoints=[],support=new Set(),leaders=[],arms=[];
 function link(n,k,color,width,dash=''){
  const [x,y]=pos[n],[X,Y]=pos[k];return path('M'+x+' '+y+' L'+X+' '+Y,color,width,dash);
 }
 // Carrier arms sit behind the pitch surfaces. Show bearings at their supported centers.
 for(const j of g.joints)if(j.kind==='mesh'&&j.settings.arm!=='frame'){
  for(const n of j.ports){const h=j.settings.arm,id=h+'/'+n;if(support.has(id))continue;support.add(id);
   arms.push([h,n]);}
 }
 const faceStations=g.joints.filter(j=>j.kind==='face'&&j.settings.form==='double face wheel');
 const sectionBody=n=>faceStations.some(j=>j.ports.includes(n));
 const order={ring:0,carrier:1,gear:2};const sorted=names.slice().sort((a,b)=>(order[m[a].kind]??3)-(order[m[b].kind]??3));
 for(const n of sorted){
  const body=m[n],[x,y,r]=pos[n],f='#badbd2',type=body.kind;
  if(type==='wheel'&&sectionBody(n))svg+=circle(x,y,7,f,ink)+circle(x,y,2,ink);
  else if(type==='gear'||type==='ring'){
   const ring=type==='ring',teeth=body.teeth,depth=Math.min(4,sc*.65,r*.12);
   const pts=Array.from({length:teeth*4},(_,i)=>{const a=2*Math.PI*(i+.5)/(teeth*4),rr=r+([1,2].includes(i%4)?1:-1)*depth;return [x+rr*Math.cos(a),y+rr*Math.sin(a)];});
   if(ring)svg+=circle(x,y,r+depth+4,'#e9c99e');
   svg+=poly(pts,ring?'#f1f4ee':f,ink,1)+circle(x,y,r,'none','#688681',.65);
  }else if(type==='weight')svg+=rect(x-r,y-r,r*2,r*2,'#e1b485',ink);
  else if(['slider','rack'].includes(type))svg+=rect(x-r,y-r*.42,r*2,r*.84,'#dbbf99',ink)+line(x-r*1.3,y+r*.62,x+r*1.3,y+r*.62,ink,1.5);
  else if(['crank','arm','rocker'].includes(type))svg+=line(x,y,x,y-r,green,7)+circle(x,y-r,3,paper);
  else if(type==='groove'||type==='cam')svg+=circle(x+r*.14,y,r,'#ecd5ad');
  else svg+=circle(x,y,Math.max(r,5),type==='carrier'?'#e1af67':f);
  if(type!=='weight'&&type!=='slider'&&type!=='rack')svg+=circle(x,y,4.1,paper);
 }
 // A front carrier strip leaves the wheel pitch boundaries visible.
 for(const [h,n] of arms){
  const [x,y]=pos[h],[X,Y]=pos[n];if(Math.hypot(x-X,y-Y)<1)continue;
  svg+=link(h,n,'#809798',7)+link(h,n,'#d3e2de',3)+circle(X,Y,5,paper,ink)+circle(x,y,5,paper,ink);
 }
 // Each contact's figure number also appears next to its mechanical section.
 for(const [i,j] of g.joints.entries()){
  const [a,b]=j.ports,[x,y,r]=pos[a],[X,Y,R]=pos[b]||pos[a],s=j.settings;let cx=(x+X)/2,cy=(y+Y)/2;
  if(j.kind==='mesh'){
   const dist=Math.hypot(x-X,y-Y),k=s.contact==='inside'?-1:1;cx=x+k*(X-x)*r/dist;cy=y+k*(Y-y)*r/dist;
   svg+=circle(cx,cy,3.7,'#cb6423',paper,1);
  }else if(['key','sleeve','clutch','inertia'].includes(j.kind)){
   const d='M'+x+' '+y+' L'+X+' '+Y;
   svg+=path(d,paper,8)+path(d,'#556c70',j.kind==='key'?4:2,j.kind==='key'?'':'7 5');
   if(j.kind==='key')svg+=rect(cx-13,cy-4,26,8,green,ink);
   if(j.kind==='sleeve'||j.kind==='inertia')svg+=circle(cx-4,cy,4,paper)+circle(cx+4,cy,4,paper);
   if(j.kind==='clutch')svg+=poly([[cx-9,cy-7],[cx+6,cy],[cx-9,cy+7]],'#cd8a53',ink)+line(cx+7,cy-9,cx+7,cy+9,ink,3);
  }else if(j.kind==='ground'){
   cx=x;cy=y;const outer=Math.max(17,r)+7;svg+=line(x,y,x,y+outer,ink,2)+line(x-11,y+outer,x+11,y+outer,ink,3);
   for(let k=-8;k<12;k+=6)svg+=line(x+k,y+outer,x+k-5,y+outer+7,ink,1.3);
  }else if(j.kind==='cord'){
   cx=x+(s.side==='left'?-r:r);cy=y;svg+=line(cx,cy,X,Y-R,orange,2.4)+circle(cx,cy,2.6,orange);
  }else if(j.kind==='parallel-guide'){
   svg+=line(x-12,y+17,x,y,green,3)+line(x+2,y+17,x+14,y,green,3)+line(x,y,x+14,y,ink,2);
   }else if(j.kind==='face'&&s.form==='double face wheel'){
   // Unfold the opposed working seats. The same pinion occupies one seat at a time.
   const half=Math.max(16,Math.min(44,r*.74)),middleY=(y+Y)/2,centerX=(x+X)/2;
   svg+=line(x,y,centerX,middleY-6,green,5)+rect(centerX-half-6,middleY-9,half*2+12,8,'#99c8ba',ink);
   for(let u=centerX-half;u<=centerX+half;u+=6)svg+=line(u,middleY-2,u+2,middleY+2,ink,1.5);
   for(const [seat,sgn] of [['FAR',-1],['NEAR',1]]){
    const sx=centerX+sgn*half,active=(s.bank===seat.toLowerCase());
    if(active){
     cx=sx;cy=middleY;svg+=poly([[sx-7,middleY+10],[sx-4,middleY+1],[sx+4,middleY+1],[sx+7,middleY+10]],'#d88c49',ink);
     svg+=path('M'+sx+' '+(middleY+10)+' L'+sx+' '+(Y-9)+' L'+X+' '+Y,'#6b7b7c',3);
    }else svg+=circle(sx,middleY+7,5,'none','#889897',1);
    svg+=text(sx-14,middleY+24,seat,9,'#3b5757',700);
   }
  }else if(['yoke','stroke','rocker','slide-arm'].includes(j.kind)){
   // Pin and slot meet at one point. The guides/pivots determine which velocity component survives.
   const pinY=y-(j.kind==='slide-arm'?r:s.radius*sc),pinX=x;
   cx=pinX;cy=pinY;svg+=line(x,y,cx,cy,green,6)+circle(x,y,4,paper);
   if(j.kind==='rocker'){
    svg+=line(X,Y,cx,cy,'#b58a59',10)+line(X,Y,cx,cy,paper,4)+circle(X,Y,4,paper);
   }else{
    svg+=line(cx,cy-10,cx,cy+12,'#b58a59',11)+line(cx,cy-9,cx,cy+10,paper,4)+line(cx,cy+10,X,Y,'#9f794f',3);
    const dy=j.kind==='slide-arm'?(s.rail==='SE'?12:-12):0;
    svg+=line(X-16,Y-dy+6,X+16,Y+dy+6,ink,2)+line(X-16,Y-dy-6,X+16,Y+dy-6,ink,2);
   }
   svg+=circle(cx,cy,3.5,orange);
  }else if(j.kind==='roll'){
   cx=x;cy=y+r;svg+=line(x-r-10,cy,x+r+10,cy,ink,3)+line(x,y,X,Y,green,2);
   for(let t=-r;t<r;t+=8)svg+=line(x+t,cy,x+t-4,cy+6,ink,1);
  }else if(j.kind==='racks'){
   svg+=line(x,y,cx,cy,green,7)+line(cx,cy,X,Y,'#b58a59',7)+circle(cx,cy,4,orange);
  }else if(j.kind==='index'){
   const [u,v]=pos[j.ports[2]];cx=x+s.offset*sc;cy=y;
   svg+=line(X,Y,x,y,green,5)+line(x,y,cx,cy,green,4)+line(u,v,cx,cy,'#ae8257',10)+line(u,v,cx,cy,paper,4)+circle(cx,cy,4,orange);
  }else if(j.kind==='ratchet'||j.kind==='lug'||j.kind==='index-tooth'){
   svg+=line(x,y,cx,cy,green,5)+line(X,Y,cx+3,cy,'#ae8257',7)+circle(cx,cy,3,orange);
  }else{
   // The developed face section below specifies the working flank at this station.
   svg+=link(a,b,'#986a43',2,'5 4')+circle(cx,cy,3,orange);
  }
  contactPoints.push({cx,cy,kind:j.kind,i});
 }
 // Place body keys and flags outside one another with leader lines back to physical points.
 const taken=[];const mark=(x,y,w,h)=>{const hit=taken.some(v=>x<v.x+v.w&&x+w>v.x&&y<v.y+v.h&&y+h>v.y);return !hit&&x>=3&&x+w<W-3&&y>=top+25&&y+h<=bottom-6;};
 function place(x,y,w,h,dx,dy){
  for(const r of [0,16,33,52,75,100,135,175,220])for(const angle of [0,.8,-.8,1.6,-1.6,2.4,-2.4,3.14]){
   const X=x+dx+r*Math.cos(angle),Y=y+dy+r*Math.sin(angle);
   if(mark(X,Y,w,h)){taken.push({x:X,y:Y,w,h});return [X,Y];}
  }throw Error('Assembly labels conflict. Increase layout separation.');
 }
 for(const {cx,cy,kind,i} of contactPoints){
  const [X,Y]=place(cx,cy,21,19,8,-25);leaders.push(line(cx,cy,X+10,Y+9,orange,1.3)+circle(X+10,Y+9,9.5,orange,paper,1)+text(X+(i>=9?3:7),Y+13,String(i+1),11,'white',700));
 }
 for(const n of names){
  const [x,y,r]=pos[n],role=n===g.driver?' IN':g.targets.some(t=>t.name===n)?' OUT':'';
  const name=n+' '+m[n].kind+(m[n].teeth?' '+m[n].teeth+'T':'')+role;const w=name.length*7.4+6;
  const [X,Y]=place(x,y,w,17,7,Math.min(22,r*.6)+4);
  leaders.push(line(x,y,X+3,Y+8,'#78908c',1)+label(X+2,Y+13,name,13,n===g.driver?green:ink));
 }
 if(hasSeats)svg+=text(26,bottom+15,'Face station unfolded at the working rim. The solid pinion engages one seat. The open circle marks the vacant seat.',14);
 svg+=leaders.join('')+text(26,notes-7,'CONTACTS AND CONSTRAINTS',14,green,700);
 for(const [i,j] of g.joints.entries()){
  const X=26+(i%2)*col,Y=notes+Math.floor(i/2)*card;const v=jointView(j);
  if(j.kind==='face'&&j.settings.form==='double face wheel')v.lines.push((j.settings.bank==='near'?'Near':'Far')+' seat engaged.');
  if(j.kind==='clutch')v.lines[0]=j.ports[0]+' drives clutch on '+j.ports[1]+'.';
  const inset=!['mesh','key','sleeve','ground','cord','clutch'].includes(j.kind);
  svg+=rect(X,Y,col-10,card-8,'#f0f4ef')+text(X+10,Y+20,'Contact '+(i+1),12,orange,700);
  if(inset)svg+='<g transform="translate('+X+' '+(Y+27)+') scale(.77)">'+v.svg+'</g>';
  const tx=X+(inset?164:12);
  svg+=text(tx,Y+42,titles[j.kind],17,green,700)+v.lines.map((s,k)=>text(tx,Y+63+17*k,s,13)).join('');
 }
 svg+=line(26,end,W-26,end,'#9eafa9',1);
 for(const [i,o] of q.options.entries())svg+=text(27,end+29+32*i,o.label,18,orange,700)+text(57,end+29+32*i,o.text,18);
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+num(W)+'" height="'+num(H)+'" viewBox="0 0 '+num(W)+' '+num(H)+'">'+svg+'</svg>\n';
}
module.exports={assemblyFigure};