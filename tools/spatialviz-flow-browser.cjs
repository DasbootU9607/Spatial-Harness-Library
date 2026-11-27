'use strict';

const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async function checkFlow({page, origin, catalog, output}) {
  const skills = catalog.skills.filter(skill => skill.harnessId === 'spatialviz-harness');
  const categories = {
    'Mental Rotation': ['2d-rotation', '3d-rotation', '3view-projection'],
    'Mental Folding': ['cube-reconstruction', 'cube-unfolding', 'paper-folding'],
    'Visual Penetration': ['cross-sections', 'cube-assembly', 'cube-counting'],
    'Mental Animation': ['arrow-movement', 'block-movement', 'mechanical-system']
  };
  const base = origin + 'spatialviz-harness/';
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {origin: new URL(base).origin});
  const results = [];
  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 900});
    await page.goto(base + '?width=' + width + '#how-to-use');
    const flow = page.locator('#how-to-use');
    await flow.getByRole('heading', {name:'How to use a skill'}).waitFor();
    assert(await flow.evaluate(el => el.previousElementSibling.matches('.hero') &&
      (el.compareDocumentPosition(document.querySelector('#skills')) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0));
    assert.equal(await page.locator('#flow-selection').innerText(), 'Specified in the request → Dice dots');
    assert.deepEqual(await page.locator('#flow-menu button').allTextContents(), ['Colored squares','Dice dots','Lines and circles']);
    if (output) await flow.screenshot({path:path.join(output, 'skill-flow-' + width + '.png')});
    const assigned = flow.locator('nav > div');
    assert.equal(await assigned.count(), 4);
    for (const [category,ids] of Object.entries(categories)) {
      const links = assigned.filter({has:page.getByRole('heading', {name:category, exact:true})}).locator('a');
      assert.deepEqual(await links.evaluateAll(list => list.map(a => new URL(a.href).searchParams.get('id')).sort()), [...ids].sort());
    }
    await page.locator('#flow-copy-name').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '$spatialviz-2d-rotation');
    const patternIds = new Set();
    for (const skill of skills) {
      await page.locator('#flow-skill').selectOption(skill.id);
      assert.equal(await page.locator('#flow-name').innerText(), '$' + skill.packageName);
      const groups = skill.showcaseGroups;
      assert.deepEqual(await page.locator('#flow-menu button').allTextContents(), groups.map(g => g.choiceLabel));
      for (const group of groups) {
        await page.locator('#flow-menu button').filter({hasText:group.choiceLabel}).first().click();
        assert.equal(await page.locator('#flow-selection').innerText(), 'Chosen from the menu → ' + group.choiceLabel);
        assert.equal(await page.locator('#flow-question').getAttribute('href'), 'task.html?id=' + group.cases[0]);
        assert.equal(await page.locator('#flow-process').getAttribute('href'), 'process.html?id=' + group.cases[0]);
        assert(!patternIds.has(group.cases[0]));
        patternIds.add(group.cases[0]);
      }
      await page.locator('#flow-explicit').selectOption(groups[0].pattern);
      assert.equal(await page.locator('#flow-selection').innerText(), 'Specified in the request → ' + groups[0].choiceLabel);
      await page.locator('#flow-pool summary').click();
      const boxes = page.locator('#flow-pool input');
      for (const box of await boxes.all()) await box.uncheck();
      assert(await page.locator('#flow-random').isDisabled());
      const last = groups.at(-1);
      await boxes.last().check();
      await page.locator('#flow-random').click();
      assert.equal(await page.locator('#flow-selection').innerText(), 'Random selection → ' + last.choiceLabel);
      assert.equal(await page.locator('#flow-question').getAttribute('href'), 'task.html?id=' + last.cases[0]);
      await page.getByRole('radio', {name:'Add requirements'}).check();
      assert.equal(await page.locator('#flow-extra').inputValue(), last.exampleRequirement);
      await page.locator('#flow-extra').fill('Make the closest alternative plausible.');
      assert((await page.locator('#flow-request').inputValue()).endsWith('Make the closest alternative plausible.'));
      await page.getByRole('radio', {name:'Use defaults'}).check();
      assert(await page.locator('#flow-extra').isHidden());
      const custom = '$' + skill.packageName + ' Create a new question and carry over my constraints.';
      await page.locator('#flow-request').fill(custom);
      await page.locator('#flow-copy-request').click();
      assert.equal(await page.evaluate(() => navigator.clipboard.readText()), custom);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
    results.push({page:'SpatialViz invocation flow', width, examples:patternIds.size});
  }
  return results;
};
