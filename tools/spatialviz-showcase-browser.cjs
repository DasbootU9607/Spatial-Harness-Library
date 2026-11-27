'use strict';

const assert = require('node:assert/strict');

module.exports = async function checkShowcase({page, origin, catalog, selection}) {
  const base = origin + 'spatialviz-harness/';
  const items = catalog.cases.filter(item => item.harnessId === 'spatialviz-harness');
  const shownIds = Object.values(selection).flat().sort();
  const idsIn = locator => locator.evaluateAll(cards => cards.map(card => card.dataset.case).sort());
  const referenceUrl = pageUrl => new URL(pageUrl, base).href;
  const hasNoOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
  const results = [];

  for (const width of [1440, 390]) {
    await page.setViewportSize({width, height: 900});
    await page.goto(base);
    await page.waitForSelector('#case-gallery .card');
    assert.deepEqual(await idsIn(page.locator('#case-gallery .card')), shownIds);
    assert.equal(await page.locator('#skills .chips a, #leaderboard td a').count(), 0);
    assert(await hasNoOverflow());
    for (const [skill, ids] of Object.entries(selection)) {
      await page.locator('[data-filter="' + skill + '"]').click();
      assert.deepEqual(await idsIn(page.locator('#case-gallery .card')), [...ids].sort());
    }

    for (const [skill, ids] of Object.entries(selection)) {
      await page.goto(base + 'skill.html?id=' + skill);
      await page.waitForSelector('#authored .card');
      assert.deepEqual(await idsIn(page.locator('#authored .card')), [...ids].sort());
      assert.equal(await page.locator('.skill-layout .chips a, #ladder td a').count(), 0);
      assert(await hasNoOverflow());
      const archive = referenceUrl(await page.getByRole('link', {name: 'View references', exact: true}).getAttribute('href'));
      const links = [];
      for (const id of ids) {
        const card = page.locator('#authored [data-case="' + id + '"]');
        const item = items.find(row => row.id === id);
        assert.equal(await card.locator('h3').innerText(), item.title);
        links.push({
          item,
          task: referenceUrl(await card.getByRole('link', {name: /Open task/}).getAttribute('href')),
          process: referenceUrl(await card.getByRole('link', {name: 'Build process'}).getAttribute('href'))
        });
      }
      await page.goto(archive);
      await page.waitForSelector('#reader:not([hidden])');
      assert.equal(await page.locator('#type').inputValue(), new URLSearchParams(new URL(archive).hash.split('?')[1]).get('type'));

      for (const {item, task, process} of links) {
        await page.goto(task);
        await page.waitForSelector('[data-answer]');
        assert.equal(await page.locator('h1').innerText(), item.title);
        assert.equal(await page.locator('.task-crumb a').last().getAttribute('href'), 'process.html?id=' + item.id);
        await page.locator('.task-figure img').evaluate(img => img.decode());
        const spec = await page.evaluate(async url => (await fetch(url)).json(), item.taskArtifact);
        assert.equal(spec.title, item.title);
        await page.locator('[data-answer="' + spec.answer.index + '"]').click();
        assert.match(await page.locator('#answer-status').innerText(), /^Correct\./);
        await page.locator('#answer summary').click();
        assert((await page.locator('.solution-verdict').innerText()).includes(spec.answer.explanation));
        assert(await hasNoOverflow());

        await page.goto(process);
        await page.waitForSelector('[data-spatial-design]');
        assert.equal(await page.locator('.process-intro p').innerText(), item.title);
        const processData = await page.evaluate(async url => (await fetch(url)).json(), item.process);
        assert.equal(processData.caseId, item.id);
        assert.equal(processData.manifest.id, item.build.runId);
        const version = processData.candidates.find(c => c.id === processData.manifest.finalCandidateId);
        const goal = processData.events.find(e => e.id === version.designId).details.design;
        const review = processData.events.findLast(e => e.type === 'visual.review' && e.candidateId === version.id);
        const design = page.locator('[data-spatial-design]');
        const evidence = await design.innerText();
        for (const detail of [goal.inference, goal.condition, goal.foil, goal.evidence, ...goal.sourceIds, review.details.review]) assert(evidence.includes(detail), item.title + ': ' + detail);
        assert.equal(review.details.outcome, 'passed');
        assert.equal(await design.getByRole('link').count(), goal.sourceIds.length);
        assert(await hasNoOverflow());
        results.push({width, skill, id:item.id, run:processData.manifest.id});
      }
    }
  }
  return results;
};
