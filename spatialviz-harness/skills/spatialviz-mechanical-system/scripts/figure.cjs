'use strict';
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const ink='#193742',teal='#0a796a',amber='#b56426',paper='#fffefa';
const text=(x,y,s,size=16,color=ink,weight=400)=>'<text x="'+x+'" y="'+y+'" font-family="DejaVu Sans,Arial,sans-serif" font-size="'+size+'" font-weight="'+weight+'" fill="'+color+'">'+esc(s)+'</text>';
const circ=(x,y,r,fill,stroke=ink)=>'<circle cx="'+x+'" cy="'+y+'" r="'+r+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
const line=(x,y,X,Y,col=ink,w=3)=>'<path d="M'+x+' '+y+' L'+X+' '+Y+'" stroke="'+col+'" stroke-width="'+w+'" fill="none"/>';
const rect=(x,y,w,h,fill,stroke='none')=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="4" fill="'+fill+'" stroke="'+stroke+'"/>';
const poly=(pts,fill,stroke=ink)=>'<polygon points="'+pts.join(' ')+'" fill="'+fill+'" stroke="'+stroke+'" stroke-width="2"/>';
function wheel(x,y,r,name,inner=false){
 const pts=[];for(let i=0;i<16*4;i++){const a=Math.PI*2*i/64,dr=r+([1,2].includes(i%4)?2:-2);pts.push([x+Math.cos(a)*dr,y+Math.sin(a)*dr].join(','));}
 return (inner?circ(x,y,r+8,'#f0c89d'):'')+poly(pts,inner?paper:'#b9ded5')+(inner?'':circ(x,y,5,paper))+text(x-6,y-8,name,16,ink,700);
}
function jointView(j){
 const [a,b,c]=j.ports,s=j.settings;
 const wheelPair=()=>wheel(65,57,28,a)+wheel(130,57,37,b);
 const pivot=(x,y)=>circ(x,y,5,paper);
 let svg='',lines=[];
 switch(j.kind){
 case 'mesh':{
  const [n,m]=s.teeth,inside=s.contact==='inside';const rb=inside?43:43*Math.min(1,m/n),ra=rb*n/m;
  svg=inside?wheel(110,57,rb,'',true)+wheel(110+rb-ra,57,ra,'')+text(75,64,b)+text(159,38,a):wheel(83-ra,57,ra,'')+wheel(83+rb,57,rb,'')+text(48,27,a)+text(125,33,b);
  lines=[a+' / '+b+'   '+n+' / '+m+' teeth',inside?'Inner teeth of '+b+' engage '+a+'.':'Outer rims in mesh.',s.arm==='frame'?'Both axle centers fixed.':'Axle centers ride on '+s.arm+'.'];break;
 }
 case 'sleeve':svg=rect(34,50,169,14,'#a1b4b7',ink)+rect(80,39,30,8,teal)+rect(80,67,30,8,teal);lines=[a+' and '+b+' share an axis.','Free bearing between the hubs.'];break;
 case 'key':svg=rect(34,50,169,14,'#a1b4b7',ink)+rect(75,31,15,50,'#99d1c1',ink)+rect(150,31,15,50,'#eab880',ink)+rect(75,43,90,8,ink);lines=[a+' and '+b+' on one shaft.','Solid key joins both hubs.'];break;
 case 'helix':{
  svg=rect(30,27,135,57,'#d3e6db',ink);for(let x=42;x<145;x+=17)svg+=line(x,80,x+17,31,teal,3);
  svg+=text(24,23,a+' CW →')+text(100,107,b+' CW ←');lines=[a+' and '+b+' engage helical flanks.','Pitch surfaces unwrapped together.','Arrows give local positive travel.'];break;}
 case 'face':{
  const same=s.bank==='near';svg=poly(['40,48','85,43','98,69','52,74'],'#a8d9cc')+poly(['99,67','136,49','173,62','135,81'],'#f3c895')+circ(98,67,3,ink)+text(30,35,a+' CW  →')+text(118,102,b+' CW  '+(same?'→':'←'));if(s.form.includes('sector')){const mirror=s.form==='right sector'?-1:1;svg+=line(52,86,151,86,teal,3)+rect(mirror===1?51:143,78,9,14,amber);}
  lines=[s.form[0].toUpperCase()+s.form.slice(1)+'.','Arrows show each CW tangent','from its labeled shaft end.'];break;
 }
 case 'index-tooth':svg=wheel(66,57,29,a)+wheel(134,57,36,b)+line(91,57,102,57,amber,8);lines=['Drive tooth '+a+' is seated','in an outer pocket of '+b+'.'];break;
 case 'parallel-guide':svg=line(49,84,77,44,teal,6)+line(105,84,133,44,teal,6)+line(77,44,133,44,amber,7)+line(49,84,105,84,ink,4)+pivot(49,84)+pivot(105,84)+pivot(77,44)+pivot(133,44)+text(91,32,a);lines=['Parallel linkage guides '+a+'.','Its center orbits on the arm.','Its orientation stays fixed.'];break;
 case 'ground':svg=wheel(95,50,29,a)+line(95,50,95,87)+line(68,88,122,88);for(let k=70;k<120;k+=10)svg+=line(k,89,k-8,97);lines=['Lock '+a+' to the fixed frame.'];break;
 case 'cord':{
  const x=s.side==='left'?84:144;svg=circ(114,43,30,'#bbddd8')+pivot(114,43)+line(x,43,x,80,amber,3)+rect(x-10,78,20,20,'#eac69f',ink)+text(152,45,a)+text(x+15,99,b);
  lines=['Taut cord leaves '+a+' at its',s.side+' tangent and carries '+b+'.','Cord winds without slipping.'];break;
 }
 case 'roll':svg=wheel(100,48,31,a)+line(33,80,170,80)+text(150,49,b);lines=['Rack locked below wheel '+a+'.',b+' marks its center. Pure rolling.'];break;
 case 'clutch':case 'ratchet':{
  svg=wheel(103,57,34,b)+line(135,40,158,22,amber,6)+pivot(158,22)+line(76,39,52,24,teal,6)+pivot(52,24);
  lines=j.kind==='clutch'?[a+' drives clutch on drum '+b+'.','Locks '+s.locks+', overruns '+(s.locks==='CW'?'CCW':'CW')+'.','Holding brake in overrun.']:['Arm '+a+' strokes ratchet '+b+'.','Holding pawl blocks CCW.','Full stroke exceeds a tooth.'];break;
 }
 case 'lug':{
  const right=s.phase===180;
  svg=pivot(108,66)+line(108,66,right?163:53,43,teal,8)+circ(right?163:53,43,6,'#efa968')+line(right?167:48,40,right?177:40,62,amber,7)+text(102,91,a)+text(right?180:26,39,b);
  lines=[(s.phase===180?'After half-turn, arm ':'Start, arm ')+a+' at '+s.phase+' degrees.','CCW pushes lug '+b+' CCW.','CW retreats. Detent holds.'];break;
 }
 case 'inertia':svg=circ(107,53,40,'#cbdedc')+circ(107,53,27,'#edc996')+pivot(107,53)+text(147,65,b)+text(113,46,a);
  lines=[a+' balanced rotor pack inside '+b+'.','Free coaxial housing. Starts at rest.','External axial torque is zero.'];break;
 case 'racks':svg=line(31,48,158,48,teal,12)+line(84,21,158,92,amber,12)+line(105,40,105,62,ink,5)+text(25,31,a)+text(167,90,b);
  lines=[a+' horizontal, '+b+' on SE rail.','Engaged tooth flanks have a','horizontal common normal.'];break;
 case 'slide-arm':case 'rocker':case 'stroke':case 'yoke':{
  const rocker=j.kind==='rocker',oblique=j.kind==='slide-arm',x=110;
  svg='';
  if(rocker){svg=line(x,100,x,18,amber,17)+line(x,89,x,25,paper,8)+pivot(x,100);}
  else if(oblique){const flip=s.rail==='SW'?-1:1;svg=line(x-35*flip,18,x+52*flip,89,'#8d9d9b',4)+line(x,87,x,42,teal,10)+line(x,84,x,42,paper,4)+pivot(x,87);}
  else svg=rect(x-10,18,20,67,'#f0c798',ink)+rect(x-4,23,8,57,paper)+line(x+11,51,182,51,amber,7)+line(154,45,182,45)+line(154,57,182,57);
  if(!oblique)svg+=line(x,78,x,44,teal,7)+pivot(x,78);
  svg+=pivot(x,44)+text(52,102,a)+text(168,71,b);
  lines=oblique?['Vertical slotted arm '+a+'. Pin at top.',b+' slides along the '+s.rail+' rail.']:
   rocker?['Pin atop crank '+a+' rides a radial','slot above pivot '+b+'. Both arms','point up at this instant.']:
   ['Top pin on crank '+a+' rides the','vertical slot of horizontal yoke '+b+'.','Throw radius '+s.radius+' mm.'];break;
 }
 case 'index':svg=line(25,61,171,61,'#a6cfc4',7)+pivot(26,61)+circ(93,61,29,'none')+pivot(93,61)+line(118,61,159,61,amber,8)+pivot(118,61)+pivot(146,61)+text(20,37,b)+text(83,39,a)+text(115,90,c);
  lines=['Centers and pin lie on a rightward ray.',b+' radius '+s.orbit+'; '+a+' pin offset +'+s.offset+'.','Pin in radial slot, +'+s.lever+' from '+c+'.'];break;
 case 'cams':case 'grooves':{
  const cam=j.kind==='cams';
  svg=cam?circ(77,55,29,'#b6dbce')+circ(141,55,35,'#eac498')+pivot(69,55)+pivot(150,55):'<path d="M55 76 Q42 22 99 31 Q145 40 102 73 Q73 87 71 58 M73 58 Q120 5 148 42 Q166 78 115 86" fill="none" stroke="'+teal+'" stroke-width="6"/>'+line(101,18,101,94,'#888',2)+circ(101,73,5,'#efaf78');
  if(cam){
   const profile=(cx,r,phase,slope,fill)=>poly(Array.from({length:80},(_,i)=>{const t=i*Math.PI/40,rad=r-7*Math.sign(slope)*Math.sin(t-phase);return [cx+rad*Math.cos(t),54+rad*Math.sin(t)].join(',');}),fill);
   svg=profile(62,32,0,s.a[1]-s.a[0],'#b6dbce')+profile(150,37,Math.PI,s.b[1]-s.b[0],'#eac498')+pivot(62,54)+pivot(150,54)+rect(94,51,19,6,ink)+line(94,45,113,45)+line(94,63,113,63)+text(55,105,a)+text(144,105,b);
  }else{
   svg=line(108,14,108,99,'#869799',3);
   for(const [slope,col] of [[1,teal],[-1,amber]]){
    const pts=Array.from({length:81},(_,i)=>{const t=(i-40)*.043-Math.PI/2,r=27+slope*(i-40)*.24;return [108+r*Math.cos(t),68+r*Math.sin(t)].join(',');});
    svg+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="'+col+'" stroke-width="5"/>';
   }
   svg+=pivot(108,68)+circ(108,41,5,'#ce7193')+text(63,68,a)+text(146,68,b);
  }
  lines=[cam?'Guided shoe between loaded cams.':'Both slots capture one guided pin.', 'Radii for one small CW step (mm)',a+'  '+s.a.join(' → ')+'       '+b+'  '+s.b.join(' → '),cam?'Fixed gap, linear local flanks.':'Parallel guides, same radial datum.'];break;
 }
 default:throw Error('Missing drawing '+j.kind);
 }
 return {svg,lines};
}
const titles={sleeve:'Free sleeve','parallel-guide':'Parallel motion',helix:'Helical mesh',mesh:'Gear mesh',key:'Keyed shaft',cord:'Winding drum',face:'Shaft-end views',lug:'Drive lug',clutch:'Overrunning clutch',ratchet:'Ratchet stroke',ground:'Frame lock',roll:'Rolling contact','index-tooth':'Index contact',racks:'Rack guides',stroke:'Captive yoke',yoke:'Captive yoke',rocker:'Slotted rocker','slide-arm':'Slotted guide',inertia:'Free housing',index:'Output slot',cams:'Loaded cam pair',grooves:'Guided spiral pin'};
function figure(q){
 if(q.assembly)return require('./assembly.cjs').assemblyFigure(q,{jointView,titles,text,rect,line,esc});
 const g=q.geometry,columns=g.joints.length===1?1:2,card=455,W=Math.max(640,columns*card+56);
 const top=178,h=128,end=top+Math.ceil(g.joints.length/columns)*h+18,H=end+150;
 let svg=rect(0,0,W,H,paper)+text(24,31,'MECHANICAL SYSTEM   /   MOTION STUDY',15,teal,700)+text(24,67,'Drive '+g.driver+'   '+g.input,29,ink,700)+text(24,96,'Find '+g.targets.map(t=>t.name+' ('+t.kind+')').join(' and ')+' '+g.scope+'.',15)+text(24,123,'CW = clockwise in the marked view. Matching letters denote one body.',12)+text(24,146,'Detail views use pitch outlines. Only the labeled joints transmit motion.',12);
 g.joints.forEach((j,i)=>{const x=24+(i%columns)*card,y=top+Math.floor(i/columns)*h;
  const {svg:pic,lines}=jointView(j);
  svg+=rect(x,y,card-9,h-9,'#f1f5f1')+'<g transform="translate('+x+' '+(y+13)+') scale(.86)">'+pic+'</g>'+text(x+179,y+24,titles[j.kind],17,teal,700)+lines.map((s,k)=>text(x+179,y+48+17*k,s,12)).join('');});
 svg+=line(24,end,W-24,end,'#b5c9c3',1);
 q.options.forEach((o,i)=>{svg+=text(27,end+32+i*28,o.label,16,amber,700)+text(57,end+32+i*28,o.text,16);});
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+W+'" height="'+H+'" viewBox="0 0 '+W+' '+H+'">'+svg+'</svg>\n';
}
module.exports={figure,jointView};
