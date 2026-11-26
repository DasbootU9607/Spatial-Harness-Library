'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');

module.exports=async function checkOfficialQuestions({page,origin,root,output,results,catalog}){
 const records=Object.fromEntries(['spatialviz','babyvision'].map(route=>[route,JSON.parse(fs.readFileSync(path.join(root,'Spatial-Harness-Library/questions/data',route+'.json'),'utf8'))]));
 const openCatalogue=async()=>{if(await page.locator('#catalogue-panel').getAttribute('open')===null)await page.locator('#catalogue-panel>summary').click();};
 const waitCase=id=>page.waitForFunction(id=>document.querySelector('#case-id')?.textContent==='ID '+id,id);
 for(const width of [1440,390])for(const route of ['spatialviz','babyvision']){
  const rows=records[route],record=rows.find(r=>r.answerKind==='choice'&&r.options.length===(route==='babyvision'?6:4));
  await page.setViewportSize({width,height:900});
  await page.goto(origin+'questions/#/'+route+'?case='+encodeURIComponent(record.id));await page.reload();await waitCase(record.id);
  assert.equal(await page.locator('#options input').count(),record.options.length);
  assert.equal(await page.locator('#options input:checked').count(),0);
  assert(await page.locator('#archive-name').evaluate(el=>parseFloat(getComputedStyle(el).fontSize)<=34));
  assert.equal(await page.locator('#prompt').textContent(),record.question);
  assert((await page.locator('#pic').getAttribute('src')).endsWith(record.image));
  assert.equal(await page.locator('#official-response [type=submit],#official-response .solution-link').count(),0);
  assert.equal(await page.locator('#archive>.intro #search,#archive>.intro #question-filters').count(),2);
  assert.equal(await page.locator('.question-catalogue input,.question-catalogue select,.catalogue-pages').count(),0);
  assert.equal(await page.locator('.question-card').count(),rows.length,'All matching questions are available without pagination');
  const controls=await page.locator('#archive-controls').boundingBox(),reader=await page.locator('#reader').boundingBox();
  assert(controls.y+controls.height<=reader.y,'Search and filters belong in the heading above the reader');
  if(width===1440){
   const left=await page.locator('.question-catalogue').boundingBox(),question=await page.locator('.official-question').boundingBox(),answer=await page.locator('#official-response').boundingBox();
   assert(left.x+left.width<=question.x&&question.x+question.width<=answer.x,'Catalogue, question and answer must occupy separate columns');
  }else assert.equal(await page.locator('#catalogue-panel').getAttribute('open'),null);
  await page.waitForFunction(()=>{const image=document.querySelector('#pic');return image.complete&&image.naturalWidth>0;});
  await page.screenshot({path:path.join(output,`official-${route}-initial-${width}.png`),fullPage:true});
  const wrong=(record.answerIndex+1)%record.options.length;
  await page.locator(`#options [data-answer="${wrong}"]`).click();
  assert.equal(await page.locator('#options .is-incorrect').getAttribute('data-answer'),String(wrong));
  assert.equal(await page.locator('#options .is-correct').getAttribute('data-answer'),String(record.answerIndex));
  assert.match(await page.locator('#official-answer-status').textContent(),/^Incorrect\./);
  assert(await page.locator('#official-answer-status').evaluate(el=>el.getBoundingClientRect().height<=1));
  assert.equal(await page.locator('#official-response .feedback-incorrect,#official-response #feedback').count(),0);
  await page.locator(`#options [data-answer="${record.answerIndex}"]`).click();
  assert.match(await page.locator('#official-answer-status').textContent(),/^Correct\./);
  assert.equal(await page.locator('#options .is-incorrect').count(),0);
  await page.locator('#next').click();await page.locator('#prev').click();await waitCase(record.id);
  assert(await page.locator(`#options input[value="${record.answerIndex}"]`).isChecked(),'Answers survive navigation within the collection');
  await openCatalogue();
  assert.equal(await page.locator('.question-card[aria-current=true] .question-card-state').textContent(),'Correct');
  assert(await page.locator('.question-card').evaluateAll(cards=>cards.every(card=>{const box=card.getBoundingClientRect();return [...card.children].every(child=>child.getBoundingClientRect().bottom<=box.bottom);})), 'Question labels and answer states fit inside their cards');
  await page.locator('#retry-answer').click();assert.equal(await page.locator('#options input:checked').count(),0);
  await page.locator('#options input').first().focus();await page.keyboard.press('ArrowRight');
  assert(await page.locator('#options input[value="1"]').isChecked());
  assert.match(await page.locator('#official-answer-status').textContent(),record.answerIndex===1?/^Correct\./:/^Incorrect\./);
  await page.locator('#zoom').click();await page.locator('#zoom-detail').click();
  assert.equal(await page.locator('#zoom-detail').getAttribute('aria-pressed'),'true');
  assert(await page.locator('#image-scroll').evaluate(el=>el.scrollWidth>el.clientWidth));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#lightbox').getAttribute('open'),null);
  await page.locator('#answer summary').click();await page.waitForFunction(()=>document.querySelector('#answer-content').childElementCount>0);assert(await page.locator('#answer-content').innerText());
  await openCatalogue();await page.locator('#clear').click();
  const list=page.locator('#question-list'),nextId=rows.at(-1).id;
  assert(await list.evaluate(el=>el.scrollHeight>el.clientHeight),'Question list must scroll vertically');
  await list.evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await page.locator('.question-card').last().click();await waitCase(nextId);
  assert(new URL(await page.url()).hash.includes(encodeURIComponent(nextId)));
  if(width===390)assert.equal(await page.locator('#catalogue-panel').getAttribute('open'),null);
  await openCatalogue();
  assert(await list.evaluate(el=>el.scrollTop>0),'Selecting a question preserves list position');
  await page.locator('#prev').click();
  assert(await list.evaluate(el=>{const active=el.querySelector('[aria-current=true]').getBoundingClientRect(),box=el.getBoundingClientRect();return active.top>=box.top&&active.bottom<=box.bottom;}),'Previous/next navigation keeps the selected card visible');
  await openCatalogue();await page.locator('#search').fill('no-such-question-982374');
  assert(await page.locator('#case-empty').isVisible());assert.equal(await page.locator('.question-card').count(),0);
  await page.locator('#clear').click();assert(await page.locator('#case-body').isVisible());
  if(route==='spatialviz'){
   await page.locator('#question-filters>summary').click();await page.locator('#category').selectOption('MentalRotation');await page.locator('#type').selectOption('2DRotation');
   assert((await page.locator('.question-card-title').allTextContents()).every(t=>t.includes('2D rotation')));
   assert.equal(await page.locator('#matches').textContent(),rows.filter(r=>r.type==='2DRotation').length+' results');
   await page.screenshot({path:path.join(output,`official-filters-${width}.png`),fullPage:true});
   await page.keyboard.press('Escape');assert.equal(await page.locator('#question-filters').getAttribute('open'),null);
   assert(await page.locator('#question-filters>summary').evaluate(el=>el===document.activeElement));
  }
  assert.equal(await page.locator('.sitehead nav a').first().getAttribute('href'),'../');
  assert.equal(await page.locator('.sitehead .benchmark-link').getAttribute('href'),catalog.harnesses.find(h=>h.sourceRoute===route).benchmarkUrl);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Official reader overflows');
  results.push({page:'official header filters, continuous question list, instant grading, navigation, keyboard and image zoom',route,width,passed:true});
 }
 for(const kind of ['text','image']){
  const record=records.babyvision.find(r=>r.answerKind===kind);
  await page.goto(origin+'questions/#/babyvision?case='+encodeURIComponent(record.id));await waitCase(record.id);
  assert.equal(await page.locator('#options input').count(),0);assert(await page.locator('#response-note').isVisible());assert.equal(await page.locator('#official-answer-status').textContent(),'');
  await page.locator('#answer summary').click();await page.waitForFunction(()=>document.querySelector('#answer-content').childElementCount>0);
  if(kind==='image'){assert((await page.locator('#answer-content img').getAttribute('src')).endsWith(record.answerImage));}else assert((await page.locator('#answer-content').innerText()).includes(record.answer));
 }
 await page.setViewportSize({width:320,height:700});await page.goto(origin+'questions/#/spatialviz');await page.waitForSelector('#pic[src]');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Small phone reader overflows');
 await page.route('**/shared/catalog.json*',route=>route.abort());
 try{
  await page.reload();await page.waitForSelector('#options input');
  await page.locator('#options [data-answer="0"]').click();assert(await page.locator('#official-answer-status').textContent());
  assert.equal(await page.locator('.mast nav a').count(),3,'Standalone collection navigation survives an unavailable optional catalogue');
 }finally{await page.unroute('**/shared/catalog.json*');}
 results.push({page:'official written and image-answer formats preserved; narrow phone layout',passed:true});
};
