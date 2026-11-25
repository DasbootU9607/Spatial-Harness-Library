'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const R=require('./observatory/runtime.cjs');
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
   assert(all.length>=4);assert.equal(catalog.cases.filter(c=>c.harnessId===harness&&c.exhibit===false).length,5);
   assert.equal(await page.locator('#case-gallery img').evaluateAll(imgs=>imgs.every(i=>i.src.endsWith('.png'))),true);
   await page.locator('[data-filter="2d-rotation"]').click();await page.reload();await page.waitForSelector('#case-gallery .card');assert.equal(await page.locator('#case-gallery .card').count(),all.filter(c=>c.skillIds.includes('2d-rotation')).length);await page.locator('[data-filter="all"]').click();
  }
assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,harness+' overflows');
  assert.equal(await page.locator('img').evaluateAll(images=>images.filter(i=>i.complete&&i.naturalWidth===0).length),0,'Broken task image');
  await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,`${harness}-${width}.png`),fullPage:true});results.push({harness,width,page:'home',passed:true});
 }}
 for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+'maze-harness/world.html');await page.waitForSelector('#site-header nav');assert(await page.locator('#site-header nav a').first().isVisible());assert.equal(await page.locator('#site-header nav a').first().getAttribute('href'),'../');assert(await page.locator('#site-header .github-link').isVisible());assert.equal(await page.locator('#site-header .benchmark-link').getAttribute('href'),'https://mazebench.com/');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);results.push({page:'retained Maze navigation',width,passed:true});}
 await page.setViewportSize({width:1440,height:1000});
 for(const route of ['spatialviz','babyvision']){await page.goto(origin+'questions/#/'+route);await page.waitForSelector('#pic[src]');await page.locator('#answer summary').click();assert(await page.locator('#answer').getAttribute('open')!==null);await page.locator('#search').fill('no-such-question-982374');await page.waitForSelector('#case-empty:not([hidden])');await page.locator('#clear').click();await page.waitForSelector('#case-body:not([hidden])');assert.equal(await page.locator('.sitehead nav a').first().getAttribute('href'),'../');assert.match(await page.locator('.sitehead nav a').last().getAttribute('href'),/tree\/main\//);assert.equal(await page.locator('.sitehead .benchmark-link').getAttribute('href'),catalog.harnesses.find(h=>h.sourceRoute===route).benchmarkUrl);results.push({page:route+' official filters and answer',passed:true});}
 await page.goto(origin+'questions/#/spatialbench');await page.waitForSelector('#play svg');await page.locator('#mode3').click();await page.waitForSelector('#play .pick');await page.locator('#mode2').click();await page.waitForSelector('#play input');results.push({page:'spatialbench practice',passed:true});
 const c=catalog.cases.find(c=>c.harnessId==='spatialviz-harness');
 if(c){await page.goto(origin+'spatialviz-harness/skill.html?id=2d-rotation');await page.waitForSelector('#authored .card');await page.locator('#model-filter').selectOption({index:1});await page.goto(origin+'spatialviz-harness/task.html?id='+c.id);await page.waitForSelector('[data-answer]');assert.equal(await page.locator('#answer').getAttribute('open'),null);await page.locator('[data-answer]').first().click();assert(await page.locator('#feedback').innerText());await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,'task-desktop.png'),fullPage:true});await page.goto(origin+'spatialviz-harness/process.html?id='+c.id);await page.waitForSelector('.timeline button');await page.locator('[data-view]').selectOption('versions');await page.locator('[data-version]').selectOption('v002');await page.waitForSelector('.detail img');await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,'process-desktop.png'),fullPage:true});await page.locator('[data-view]').selectOption('evidence');assert(await page.locator('.evidence-table tbody tr').count()>10);for(const file of [c.process,c.eventsCsv,c.taskArtifact])assert((await page.request.get(origin+'spatialviz-harness/'+file)).ok());results.push({page:'skill, task, version preview, evidence and downloads',passed:true});await page.setViewportSize({width:390,height:844});await page.locator('[data-view]').selectOption('versions');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,'process-mobile.png'),fullPage:true});}
 for(const example of catalog.cases.filter(c=>['2d-rotation','3d-rotation'].some(id=>c.skillIds.includes(id)))){
  const spec=R.read(path.join(root,'Spatial-Harness-Library',example.harnessId,example.taskArtifact));
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.goto(origin+example.harnessId+'/task.html?id='+example.id);await page.waitForSelector('[data-answer]');assert.equal(await page.locator('[data-answer]').count(),4);assert.match(await page.locator('[data-answer="3"]').innerText(),/All three other options are incorrect/);await page.locator(`[data-answer="${spec.answer.index}"]`).click();assert.match(await page.locator('#feedback').innerText(),/^Correct\./);await page.locator('[data-answer="3"]').click();assert.match(await page.locator('#feedback').innerText(),/D means none/);await page.locator('#answer summary').click();assert.equal(await page.locator('#answer p').count(),5);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.equal(await page.locator('.task-figure img').evaluate(img=>img.complete&&img.naturalWidth>0),true);await page.evaluate(()=>window.scrollTo({top:0,behavior:'instant'}));await page.screenshot({path:path.join(output,example.id+'-'+width+'.png'),fullPage:true});results.push({page:'formal rotation task, D semantics and explanations',id:example.id,width,passed:true});}
  assert((await page.request.get(origin+example.harnessId+'/'+example.thumbnail)).ok());assert((await page.request.get(origin+example.harnessId+'/'+example.verification.report)).ok());
 }
 assert.deepEqual(errors,[]);R.atomic(path.join(output,'report.json'),{schemaVersion:1,origin,results,consoleErrors:errors,scope:'Desktop/mobile layouts, labels and keyboard controls supplied by semantic HTML, overflow, live images, official filters and answers, practice, authored task and process controls. Not a complete WCAG certification.'});console.log(JSON.stringify(results));
 }finally{await browser?.close();await new Promise(r=>server.close(r));}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
