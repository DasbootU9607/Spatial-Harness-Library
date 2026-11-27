'use strict';
// Read visible SVG lettering in paint order. No geometry, seed, title, metadata or answer input.
function readPlate(svg){
 const words=[...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(x=>x[1].replaceAll('&amp;','&'));
 const drive=/^Drive (\w+)   (.+)$/.exec(words[1]);
 const question=words[2],targets=[...question.matchAll(/(\w+) \((\w+)\)/g)].map(m=>({name:m[1],kind:m[2]}));
 if(!drive||!targets.length)throw Error('Missing visible input or output');
 const joints=[],components={};
 function add(kind,ports,settings={}){for(const p of ports)components[p]=true;joints.push({kind,ports,settings})}
 const find=(s,rx)=>{const m=rx.exec(s);if(!m)throw Error('Unreadable connection: '+s);return m.slice(1)};
 for(let i=5;i<words.length-8;i++){
  const title=words[i],a=words[i+1],b=words[i+2],c=words[i+3],d=words[i+4];
  const required={
    'Parallel motion':[[b,'Its center orbits on the arm.'],[c,'Its orientation stays fixed.']],
    'Rolling contact':[[b?.split('. ').at(-1),'Pure rolling.']],
    'Winding drum':[[c,'Cord winds without slipping.']],
    'Ratchet stroke':[[b,'Holding pawl blocks CCW.'],[c,'Full stroke exceeds a tooth.']],
    'Drive lug':[[c,'CW retreats. Detent holds.']],
    'Free housing':[[b,'Free coaxial housing. Starts at rest.'],[c,'External axial torque is zero.']],
    'Rack guides':[[b,'Engaged tooth flanks have a'],[c,'horizontal common normal.']],
    'Loaded cam pair':[[a,'Guided shoe between loaded cams.'],[d,'Fixed gap, linear local flanks.']],
    'Guided spiral pin':[[a,'Both slots capture one guided pin.'],[d,'Parallel guides, same radial datum.']]
  };
  if(required[title]?.some(([seen,wanted])=>seen!==wanted))throw Error('Incomplete visible conditions for '+title);
  switch(title){
   case 'Gear mesh':{
    const [x,y,n,m]=find(a,/^(\w+) \/ (\w+)   (\d+) \/ (\d+) teeth$/);
    const arm=c==='Both axle centers fixed.'?'frame':find(c,/^Axle centers ride on (\w+)\.$/)[0];
    if(arm!=='frame')components[arm]=true;
    if(!(b==='Outer rims in mesh.'||b==='Inner teeth of '+y+' engage '+x+'.'))throw Error('Missing tooth boundary');
    add('mesh',[x,y],{teeth:[+n,+m],contact:b.startsWith('Inner')?'inside':'outside',arm});break;
   }
   case 'Helical mesh':{const [x,y]=find(a,/^(\w+) and (\w+) engage helical flanks/);if(words[i-2]!==x+' CW →'||words[i-1]!==y+' CW ←')throw Error('Missing flank directions');add('helix',[x,y],{lead:'opposed'});break;}
   case 'Parallel motion':add('parallel-guide',find(a,/Parallel linkage guides (\w+)\./));break;
   case 'Frame lock':add('ground',find(a,/Lock (\w+) to the fixed frame/));break;
   case 'Free sleeve':if(b!=='Free bearing between the hubs.')throw Error('Missing free bearing');add('sleeve',find(a,/^(\w+) and (\w+) share an axis/));break;
   case 'Keyed shaft':if(b!=='Solid key joins both hubs.')throw Error('Missing key');add('key',find(a,/^(\w+) and (\w+) on one shaft/));break;
   case 'Shaft-end views':{
    const [x]=find(words[i-2],/^(\w+) CW  →$/),[y,arr]=find(words[i-1],/^(\w+) CW  ([→←])$/);
    add('face',[x,y],{bank:arr==='→'?'near':'far',form:a.slice(0,-1).toLowerCase()});break;
   }
   case 'Index contact':add('index-tooth',[find(a,/Drive tooth (\w+) is seated/)[0],find(b,/pocket of (\w+)\./)[0]],{phase:'in pocket'});break;
   case 'Rolling contact':add('roll',[find(a,/below wheel (\w+)\./)[0],find(b,/^(\w+) marks/)[0]],{rail:'below'});break;
   case 'Winding drum':{const [side,y]=find(b,/^(left|right) tangent and carries (\w+)\./);add('cord',[find(a,/leaves (\w+) at/)[0],y],{side});break;}
   case 'Overrunning clutch':{const [locks,free]=find(b,/^Locks (CW|CCW), overruns (CW|CCW)\.$/);if(locks===free||c!=='Holding brake in overrun.')throw Error('Unspecified clutch state');add('clutch',find(a,/^(\w+) drives clutch on (?:drum )?(\w+)\./),{locks});break;}
   case 'Ratchet stroke':add('ratchet',find(a,/Arm (\w+) strokes ratchet (\w+)\./),{stop:'CCW'});break;
   case 'Drive lug':{const [x,angle]=find(a,/arm (\w+) at (\d+) degrees/);add('lug',[x,find(b,/pushes lug (\w+) CCW/)[0]],{phase:+angle,flank:'CCW'});break;}
   case 'Free housing':add('inertia',find(a,/^(\w+) balanced rotor pack inside (\w+)\./),{externalTorque:0});break;
   case 'Rack guides':add('racks',find(a,/^(\w+) horizontal, (\w+) on SE rail/),{guide:'SE',normal:'horizontal'});break;
   case 'Slotted guide':{const [y,rail]=find(b,/^(\w+) slides along the (SE|SW) rail/);add('slide-arm',[find(a,/slotted arm (\w+)\./)[0],y],{rail,pin:'top'});break;}
   case 'Slotted rocker':add('rocker',[find(a,/crank (\w+) rides/)[0],find(b,/pivot (\w+)\./)[0]],{pin:'top'});break;
   case 'Captive yoke':add(question.includes('complete turn')?'stroke':'yoke',[find(a,/crank (\w+) rides/)[0],find(b,/yoke (\w+)\./)[0]],{pin:'top',radius:+find(c,/radius ([\d.]+) mm/)[0]});break;
   case 'Output slot':{const [h,r,p,e]=find(b,/^(\w+) radius ([\d.]+); (\w+) pin offset \+([\d.]+)\./);const [l,o]=find(c,/slot, \+([\d.]+) from (\w+)\./);add('index',[p,h,o],{orbit:+r,offset:+e,lever:+l});break;}
   case 'Loaded cam pair':case 'Guided spiral pin':{
    const [x,n,m,y,k,l]=find(c,/^(\w+)  ([\d.]+) → ([\d.]+)       (\w+)  ([\d.]+) → ([\d.]+)$/);
    add(title==='Loaded cam pair'?'cams':'grooves',[x,y],{a:[+n,+m],b:[+k,+l]});break;
   }
  }
 }
 if(!joints.length)throw Error('No legible joints');
 const options=[];for(let i=0;i<4;i++){if(words.at(-8+i*2)!=='ABCD'[i])throw Error('Missing option label');options.push(words.at(-7+i*2));}
 return {geometry:{components,joints,driver:drive[1],input:drive[2],targets},options};
}
module.exports={readPlate};