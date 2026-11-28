'use strict';

const assert = require('node:assert/strict');

module.exports = async function checkQuestionEntry({page, origin, catalog}) {
  const entries = catalog.harnesses.filter(h => h.sourceRoute);
  const spatial = entries.find(h => h.sourceRoute === 'spatialviz');
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height:900});
    for (const {h, direct} of [...entries.map(h => ({h})), {h:spatial, direct:''}, {h:spatial, direct:'#collections'}]) {
      const official = h.sourceRoute !== 'spatialbench';
      const url = origin + 'questions/';
      let release, pending;
      const holdReader = new Promise(resolve => {release = resolve;});
      const pattern = '**/questions/app.js*';
      await page.goto(direct === undefined ? origin + h.id + '/' : 'about:blank');
      await page.route(pattern, request => (pending = holdReader.then(() => request.continue())));
      try {
        if (direct === undefined) {
          await page.getByRole('navigation', {name:'Main navigation'}).getByRole('link', {name:h.browserLabel, exact:true}).click({noWaitAfter:true});
        } else {
          await page.goto(url + direct, {waitUntil:'commit'});
        }
        await page.locator('#entry-status').waitFor();
        await page.locator('.sitehead .brand').filter({hasText:h.name}).waitFor();
        assert.equal(await page.locator('.sitehead .brand').innerText(), h.name);
        assert.equal(await page.locator('#entry-status').innerText(), official ? 'Loading questions…' : 'Loading practice…');
        assert.equal(await page.locator('#home,#collections').count(), 0);
        assert.equal(await page.getByText('A Spatial Reasoning Atlas.', {exact:true}).count(), 0);
      } finally {
        release();
        await pending;
        await page.unroute(pattern);
      }
      await page.locator(official ? '#reader:not([hidden]) #pic[src]' : '#play svg').first().waitFor();
      assert.equal(await page.locator('.sitehead .brand').innerText(), h.name);
      assert(await page.locator('#entry-status').isHidden());
      assert(new URL(page.url()).hash.startsWith('#/' + h.sourceRoute));
    }
  }
};
