'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const R=require('./observatory/runtime.cjs');
const {assertNoAbsoluteTimes,hasAbsoluteTime}=require('./observatory/time-privacy.cjs');
const args=process.argv.slice(2),get=(key,fallback)=>{const i=args.indexOf('--'+key);return i<0?fallback:args[i+1];};
const root=path.resolve(get('root','.harness/preview')),output=path.resolve(get('out','.harness/browser'));
fs.mkdirSync(output,{recursive:true});
let playwright;try{playwright=require('playwright');}catch{playwright=require(require.resolve('playwright-core',{paths:[get('engine',path.resolve(R.ROOT,'../MazeBenchEngine'))]}));}
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{try{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(u.pathname)),rel=path.relative(root,file);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error();const full=fs.statSync(file).isDirectory()?path.join(file,'index.html'):file;res.setHeader('Content-Type',mime[path.extname(full)]||'application/octet-stream');res.end(fs.readFileSync(full));}catch{res.writeHead(404).end('Not found');}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}/Spatial-Harness-Library/`;let browser;try{
 browser=await playwright.chromium.launch({...(process.platform==='win32'?{channel:'chrome'}:{}),headless:true,args:['--enable-unsafe-swiftshader']});const page=await browser.newPage({reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const results=[];
 const catalog=R.read(path.join(root,'Spatial-Harness-Library/shared/catalog.json'));
 const shown=catalog.cases.filter(c=>c.exhibit!==false);
 const waitSlide=(p,index)=>p.waitForFunction(i=>document.querySelector('#harness-slides').dataset.current===String(i),index);
 for(const width of [1440,390]){
  await page.setViewportSize({width,height:1000});await page.goto(origin);await page.waitForSelector('.harness-slide');
  assert.equal(await page.locator('.harness-slide').count(),4);
  assert.equal(await page.locator('#header,footer,#harness-picker').count(),0);
  assert.match(await page.locator('h1').evaluate(el=>getComputedStyle(el).fontFamily),/GeistPixel/);
  if(width===1440)assert(await page.locator('.library-explainer').evaluate(el=>el.getBoundingClientRect().height<30));
  for(let i=0;i<4;i++){
   await waitSlide(page,i);
   const slide=page.locator('.harness-slide').nth(i),h=catalog.harnesses[i];
   assert.equal(await slide.getAttribute('inert'),null);assert.equal(await slide.locator('h2 a').getAttribute('href'),'./'+h.id+'/');
   assert.equal(await slide.locator('.benchmark-source').getAttribute('href'),h.benchmarkUrl);
   assert(await slide.locator('img').evaluate(img=>img.complete&&img.naturalWidth>0));
   assert(await slide.locator('img').evaluate(img=>Math.abs(img.width/img.height-img.naturalWidth/img.naturalHeight)<0.02));
   assert.equal(await slide.locator('.preview-image').evaluate(el=>getComputedStyle(el).borderWidth),'0px');
   if(!catalog.skills.some(s=>s.harnessId===h.id))assert.equal(await slide.locator('.upcoming').innerText(),'Upcoming');
   await page.screenshot({path:path.join(output,`library-${h.id}-${width}.png`),fullPage:true});
   await page.locator('#next').click();
  }
  await waitSlide(page,0);
  await page.locator('#harness-slides').focus();await page.keyboard.press('ArrowRight');await waitSlide(page,1);
  await page.keyboard.press('Home');await waitSlide(page,0);
  const box=await page.locator('.preview-image').first().boundingBox();
  await page.mouse.move(box.x+box.width*0.8,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*0.2,box.y+box.height/2,{steps:12});await page.mouse.up();await waitSlide(page,1);
  await page.locator('#harness-slides').evaluate(el=>el.scrollTo({left:2*el.clientWidth,behavior:'instant'}));await waitSlide(page,2);
  await page.locator('#harness-slides').focus();await page.keyboard.press('Home');await waitSlide(page,0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Library overflows');
  await page.locator('#harness-slides').evaluate(el=>el.blur());await page.screenshot({path:path.join(output,`library-${width}.png`),fullPage:true});
  results.push({page:'library carousel, mouse drag, keyboard, natural image proportions and benchmark links',width,passed:true});
 }
 // Every harness must fit without vertical scrolling at ordinary desktop and phone sizes.
 for(const [width,height] of [[1440,900],[1366,768],[1280,720],[390,844],[375,667],[320,568],[844,390]]){
  await page.setViewportSize({width,height});await page.goto(origin);await page.waitForSelector('.harness-slide');
  assert.equal(await page.locator('h1 a').getAttribute('href'),'https://github.com/DasbootU9607/Spatial-Harness-Library');
  assert.equal(await page.locator('.library-github').count(),0);
  for(let i=0;i<4;i++){
   await waitSlide(page,i);
   const layout=await page.evaluate(i=>{const track=document.querySelector('#harness-slides'),slide=track.children[i],img=slide.querySelector('img').getBoundingClientRect(),link=slide.querySelector('.benchmark-source').getBoundingClientRect();return {pageHeight:document.documentElement.scrollHeight,trackHeight:track.clientHeight,contentHeight:track.scrollHeight,imageHeight:img.height,bottom:link.bottom};},i);
   assert(layout.pageHeight<=height+1,`Page scrolls at ${width}x${height}: ${JSON.stringify(layout)}`);
   assert(layout.contentHeight<=layout.trackHeight+1,`Carousel scrolls vertically at ${width}x${height}: ${JSON.stringify(layout)}`);
   assert(layout.imageHeight>=50&&layout.bottom<=height,`Content clipped at ${width}x${height}: ${JSON.stringify(layout)}`);
   await page.screenshot({path:path.join(output,`single-screen-${i}-${width}x${height}.png`)});
   await page.locator('#next').click();
  }
  results.push({page:'single-screen layout and linked title',width,height,passed:true});
 }
 // Exercise a real touch sequence, not just programmatic scrollLeft updates.
 const touchContext=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,reducedMotion:'reduce'});
 try{
  const touchPage=await touchContext.newPage();touchPage.on('pageerror',e=>errors.push(e.message));
  await touchPage.goto(origin);await touchPage.waitForSelector('.harness-slide');
  const image=await touchPage.locator('.preview-image').first().boundingBox(),y=image.y+image.height/2;
  const cdp=await touchContext.newCDPSession(touchPage);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:310,y}]});
  for(const x of [280,240,200,160,120,70])await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await waitSlide(touchPage,1);
  results.push({page:'native touch swipe updates the selected harness',passed:true});
 }finally{await touchContext.close();}

 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});for(const harness of ['maze-harness','spatialviz-harness','babyvision-harness','spatialb-harness']){
  await page.goto(origin+harness+'/');await page.waitForSelector('#skills');await page.locator('#leaderboard select').first().selectOption('total_tokens');
  assert(await page.locator('h1').innerText());
  assert.equal(await page.locator('#header nav a').first().getAttribute('href'),'../');
  assert.equal(await page.locator('#header nav a').last().getAttribute('href'),'https://github.com/DasbootU9607/Spatial-Harness-Library/tree/main/'+harness);
  assert.equal(await page.locator('#header .benchmark-link').getAttribute('href'),catalog.harnesses.find(h=>h.id===harness).benchmarkUrl);
  const harnessSkills=catalog.skills.filter(s=>s.harnessId===harness),all=shown.filter(c=>c.harnessId===harness);
  assert.equal(await page.locator('#skill-filters button').count(),harnessSkills.length+1);
  assert.equal(await page.locator('#case-gallery .card').count(),all.length);
  for(const skill of harnessSkills){
   await page.locator(`[data-filter="${skill.id}"]`).click();
   const expected=all.filter(c=>c.skillIds.includes(skill.id)).map(c=>c.id).sort();
   assert.deepEqual((await page.locator('#case-gallery .card').evaluateAll(cards=>cards.map(c=>c.dataset.case))).sort(),expected);
   assert.equal(await page.locator(`[data-filter="${skill.id}"]`).getAttribute('aria-pressed'),'true');
  }
  await page.locator('[data-filter="all"]').click();
  if(harness==='spatialviz-harness'){
   assert(all.length>=4);assert.equal(catalog.cases.filter(c=>c.harnessId===harness&&c.exhibit===false&&!c.supersededBy).length,5);
   for(const previous of catalog.cases.filter(c=>c.harnessId===harness&&c.supersededBy)){
    assert.equal(await page.locator(`#case-gallery [data-case="${previous.id}"]`).count(),0);
    assert.equal(await page.locator(`#case-gallery [data-case="${previous.supersededBy}"]`).count(),1);
   }
   assert.equal(await page.locator('#case-gallery img').evaluateAll(imgs=>imgs.every(i=>i.src.endsWith('.png'))),true);
   await page.locator('[data-filter="2d-rotation"]').click();await page.reload();await page.waitForSelector('#case-gallery .card');assert.equal(await page.locator('#case-gallery .card').count(),all.filter(c=>c.skillIds.includes('2d-rotation')).length);await page.locator('[data-filter="all"]').click();
  }
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,harness+' overflows');
  assert.equal(await page.locator('img').evaluateAll(images=>images.filter(i=>i.complete&&i.naturalWidth===0).length),0,'Broken task image');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,`${harness}-${width}.png`),fullPage:true});results.push({harness,width,page:'home',passed:true});
 }}
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'maze-harness/world.html');await page.waitForSelector('#site-header nav');assert(await page.locator('#site-header nav a').first().isVisible());assert.equal(await page.locator('#site-header nav a').first().getAttribute('href'),'../');assert(await page.locator('#site-header .github-link').isVisible());assert.equal(await page.locator('#site-header .benchmark-link').getAttribute('href'),'https://mazebench.com/');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);results.push({page:'retained Maze navigation',width,passed:true});}
 await page.setViewportSize({width:1440,height:1000});
 await require('./official-questions-browser.cjs')({page,origin,root,output,results,catalog});
 await page.goto(origin+'questions/#/spatialbench');await page.waitForSelector('#play svg');await page.locator('#mode3').click();await page.waitForSelector('#play .pick');await page.locator('#mode2').click();await page.waitForSelector('#play input');results.push({page:'spatialbench practice',passed:true});
 const c=catalog.cases.find(c=>c.harnessId==='spatialviz-harness');
 if(c){await page.goto(origin+'spatialviz-harness/skill.html?id=2d-rotation');await page.waitForSelector('#authored .card');await page.locator('#model-filter').selectOption({index:1});await page.goto(origin+'spatialviz-harness/task.html?id='+c.id);await page.waitForSelector('[data-answer]');assert.equal(await page.locator('#answer').getAttribute('open'),null);await page.locator('[data-answer]').first().click();assert(await page.locator('#answer-status').textContent());await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,'task-desktop.png'),fullPage:true});}
 // Shared process pages use the Maze orbit, version browser, and evidence inspector.
 for(const example of catalog.cases.filter(c=>c.harnessId==='spatialviz-harness'&&(c.exhibit!==false||c===catalog.cases.find(x=>x.harnessId==='spatialviz-harness')))){
  const process=R.read(path.join(root,'Spatial-Harness-Library',example.harnessId,example.process));
  assertNoAbsoluteTimes(process);
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:1000});await page.goto(origin+example.harnessId+'/process.html?id='+example.id);await page.waitForSelector('#process-orbit');
   assert.equal(await page.locator('.process-view-tabs button').count(),3);
   await page.locator('#orbit-mode').selectOption('all');
   assert.equal(Number(await page.locator('#process-orbit').getAttribute('data-event-count')),process.events.length);
   assert(await page.locator('.orbit-stage').evaluate(el=>el.clientHeight>=280),'Timeline must show neighboring events');
   await page.locator('.orbit-stage').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#operation-detail').getAttribute('data-event-id'),process.events[0].id);
   await page.keyboard.press('ArrowDown');assert.equal(await page.locator('#operation-detail').getAttribute('data-event-id'),process.events[1].id);
   await page.locator('[data-view="versions"]').click();assert.equal(await page.locator('.version-option').count(),process.candidates.length);
   const version=process.candidates.find(c=>c.preview);
   if(version){
    await page.locator(`[data-version="${version.id}"]`).click();
    const node=new URL(page.url()).searchParams.get('node');assert.equal(node,process.events.find(e=>e.type==='candidate.saved'&&e.candidateId===version.id).id);
    assert((await page.locator('.operation-detail .preview-image').getAttribute('src')).endsWith(version.preview.path));
    await page.locator('[data-expand]').click();await page.waitForSelector('dialog[open]');
    assert((await page.locator('dialog img').getAttribute('src')).endsWith(version.preview.path));
    await page.keyboard.press('Escape');assert.equal(await page.locator('dialog[open]').count(),0);
   }
   await page.locator('[data-view="evidence"]').click();
   const read=process.events.find(e=>e.type==='resource.read');
   await page.locator('[aria-label="Search evidence"]').fill(read.id);
   await page.locator(`.evidence-results [data-event="${read.id}"]`).click();assert.equal(await page.locator('#operation-detail').getAttribute('data-event-id'),read.id);
   await page.locator('[aria-label="Search evidence"]').fill('no-such-record-837329');assert.match(await page.locator('.evidence-results').innerText(),/No matching evidence/);
   await page.locator('[aria-label="Search evidence"]').fill('');await page.locator('[aria-label="Evidence type"]').selectOption('test.completed');
   assert.equal(await page.locator('.evidence-results button').count(),Math.min(30,process.events.filter(e=>e.type==='test.completed').length));
   await page.locator('.evidence-results button').first().click();assert(await page.locator('.process-checks li').count()>0);
   if(process.events.filter(e=>e.type==='test.completed').length>30){await page.locator('[data-page-step="1"]').click();assert.match(await page.locator('.evidence-count').innerText(),/31–60/);}
   await page.locator('[data-view="actions"]').click();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Process overflow');
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,`process-${example.id}-${width}.png`),fullPage:true});
   assert.equal(hasAbsoluteTime(await page.locator('#main').innerText()),false);
   for(const file of [example.process,example.eventsCsv]){const response=await page.request.get(origin+example.harnessId+'/'+file);assert(response.ok());assert.equal(hasAbsoluteTime(await response.text()),false);}
   results.push({page:'Maze-style process timeline, exact previews, evidence search and pagination',id:example.id,width,passed:true});
  }
 }

 for(const example of catalog.cases.filter(c=>['2d-rotation','3d-rotation'].some(id=>c.skillIds.includes(id)))){
  const spec=R.read(path.join(root,'Spatial-Harness-Library',example.harnessId,example.taskArtifact));
  for(const width of [1440,390]){
   await page.setViewportSize({width,height:900});await page.goto(origin+example.harnessId+'/task.html?id='+example.id);await page.waitForSelector('[data-answer]');
   assert.equal(await page.locator('[data-answer]').count(),4);
   assert.match(await page.locator('[data-answer="3"]').innerText(),/All three other options are incorrect/);
   assert.equal(await page.locator('.check-answer,.solution-link').count(),0);
   assert.equal(await page.locator('#answer').getAttribute('open'),null);
   assert.equal(await page.locator('#answer-status').textContent(),'');
   assert(await page.locator('.answer-panel,.answer-choice,.choice-letter').evaluateAll(elements=>elements.every(el=>['backgroundColor','borderTopColor','color'].every(key=>{const channels=getComputedStyle(el)[key].match(/[\d.]+/g)?.slice(0,3).map(Number);return channels?.length===3&&channels.every(c=>c===channels[0]);}))), 'Unanswered controls must use neutral colors');
   assert(await page.locator('h1').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)<=36));
   if(width===1440){const box=await page.locator('.options').boundingBox();assert(box.y+box.height<=900,'Answer choices must be visible on desktop');}
   await page.locator('.diagram-enlarge').click();assert(await page.locator('dialog').isVisible());
   await page.locator('.diagram-zoom').click();assert.equal(await page.locator('.diagram-zoom').getAttribute('aria-pressed'),'true');
   assert(await page.locator('.diagram-scroll').evaluate(el=>el.scrollWidth>el.clientWidth));
   await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').isVisible(),false);
   assert(await page.locator('.diagram-enlarge').evaluate(el=>el===document.activeElement));
   if(example.id==='authored-0dd9dde74dafe28bbfdc8e59'){await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,'instant-initial-'+width+'.png'),fullPage:true});}
   await page.locator('[data-answer="3"]').click();
   assert(await page.locator('[data-answer="3"] input').isChecked());assert.equal(await page.locator('[data-answer="3"]').getAttribute('class'),'answer-choice is-incorrect');

   assert.match(await page.locator('#answer-status').textContent(),/^Incorrect\./);assert.equal(await page.locator('.answer-panel #feedback,.feedback-correct,.feedback-incorrect').count(),0);assert(await page.locator('#answer-status').evaluate(el=>el.getBoundingClientRect().width<=1&&el.getBoundingClientRect().height<=1));
   assert.match(await page.locator('.answer-choice.is-correct').innerText(),new RegExp(spec.options[spec.answer.index].label));
   assert(await page.locator('[data-answer="3"] input').isEnabled());
   if(example.id==='authored-0dd9dde74dafe28bbfdc8e59'){await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,'instant-incorrect-'+width+'.png'),fullPage:true});}
   await page.locator('#answer summary').click();assert.equal(await page.locator('#answer p').count(),5);assert.notEqual(await page.locator('#answer').getAttribute('open'),null);
   await page.locator('.retry-answer').click();assert.equal(await page.locator('#answer-status').textContent(),'');assert.equal(await page.locator('input:checked').count(),0);assert.equal(await page.locator('#answer').getAttribute('open'),null);assert.equal(await page.locator('.check-answer,.solution-link').count(),0);
   await page.locator('[data-answer="0"] input').focus();await page.keyboard.press('ArrowRight');assert(await page.locator('[data-answer="1"] input').isChecked());assert.match(await page.locator('#answer-status').textContent(),spec.answer.index===1?/^Correct\./:/^Incorrect\./);
   await page.locator(`[data-answer="${spec.answer.index}"]`).click();
   assert.match(await page.locator('#answer-status').textContent(),/^Correct\./);
   assert.equal(await page.locator('.answer-choice.is-incorrect').count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.waitForFunction(()=>{const img=document.querySelector('.task-figure img');return img.complete&&img.naturalWidth>0;});
   await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,example.id+'-'+width+'.png'),fullPage:true});
   await page.goto(origin+example.harnessId+'/task.html?id='+example.id+'#answer');await page.reload();await page.waitForSelector('#answer[open]');
   assert.equal(await page.locator('#answer-status').textContent(),'');assert.equal(await page.locator('input:checked').count(),0);
   results.push({page:'rotation quiz: instant grading, change answer, retry, keyboard, zoom and solution link',id:example.id,width,passed:true});
  }
  assert((await page.request.get(origin+example.harnessId+'/'+example.thumbnail)).ok());assert((await page.request.get(origin+example.harnessId+'/'+example.verification.report)).ok());
 }
 assert.deepEqual(errors,[]);R.atomic(path.join(output,'report.json'),{schemaVersion:1,origin,results,consoleErrors:errors,scope:'Desktop/mobile layouts, labels and keyboard controls supplied by semantic HTML, overflow, live images, official filters and answers, practice, authored task and process controls. Not a complete WCAG certification.'});console.log(JSON.stringify(results));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
