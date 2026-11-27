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
    const picker = flow.getByRole('radiogroup', {name:'Choose a skill'});
    const assigned = picker.getByRole('group');
    assert.equal(await page.locator('select#flow-skill').count(), 0);
    assert(await picker.getByRole('radio', {name:'2D Rotation', exact:true}).isChecked());
    assert.equal(await assigned.count(), 4);
    for (const [category,ids] of Object.entries(categories)) {
      const choices = picker.getByRole('group', {name:category}).getByRole('radio');
      assert.deepEqual(await choices.evaluateAll(list => list.map(input => input.value).sort()), [...ids].sort());
    }
    await picker.getByRole('radio', {name:'2D Rotation', exact:true}).focus();
    await page.keyboard.press('ArrowRight');
    assert(await picker.getByRole('radio', {name:'3D Rotation', exact:true}).isChecked());
    assert.equal(await page.locator('#flow-name').innerText(), '$spatialviz-3d-rotation');
    await page.keyboard.press('ArrowLeft');
    await page.locator('#flow-copy-name').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), '$spatialviz-2d-rotation');
    const patternIds = new Set();
    for (const skill of skills) {
      const choice = picker.getByRole('radio', {name:skill.name, exact:true});
      await choice.locator('..').getByText(skill.name, {exact:true}).click();
      assert(await choice.isChecked());
      assert.equal(await picker.locator('input:checked').count(), 1);
      assert.equal(new URL(page.url()).pathname, new URL(base).pathname);
      assert.equal(await page.locator('#flow-name').innerText(), '$' + skill.packageName);
      const details = flow.getByRole('link', {name:'Skill details for ' + skill.name, exact:true});
      assert.equal(await details.getAttribute('href'), 'skill.html?id=' + skill.id);
      const groups = skill.showcaseGroups;
      const initial = groups.find(g => g.pattern === 'patterned') || groups[0];
      assert.equal(await page.locator('#flow-explicit').inputValue(), initial.pattern);
      assert.equal(await page.locator('#flow-question').getAttribute('href'), 'task.html?id=' + initial.cases[0]);
      assert.equal(await page.locator('#flow-process').getAttribute('href'), 'process.html?id=' + initial.cases[0]);
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
    const lastSkill = skills.at(-1);
    await flow.getByRole('link', {name:'Skill details for ' + lastSkill.name, exact:true}).click();
    await page.getByRole('heading', {level:1, name:lastSkill.name, exact:true}).waitFor();
    results.push({page:'SpatialViz invocation flow', width, examples:patternIds.size});
  }
  return results;
};
