'use strict';

const assert = require('node:assert/strict');

module.exports = async function checkShowcase({page, origin, catalog, selection}) {
  const base = origin + 'spatialviz-harness/';
  const items = catalog.cases.filter(item => item.harnessId === 'spatialviz-harness');
  const selected = Object.fromEntries(Object.entries(selection).map(([skill, groups]) => [skill, groups.flatMap(group => group.cases)]));
  const shownIds = Object.values(selected).flat().sort();
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
    for (const [skill, ids] of Object.entries(selected)) {
      const overviewLink = page.locator('#skills .directory-row').filter({has:page.locator('h3 a[href="skill.html?id=' + skill + '"]')}).getByRole('link', {name:'View references'});
      assert.equal(await overviewLink.getAttribute('href'), 'skill.html?id=' + skill + '#official-references');
      await page.locator('[data-filter="' + skill + '"]').click();
      assert.deepEqual(await idsIn(page.locator('#case-gallery .card')), [...ids].sort());
    }

    for (const [skill, ids] of Object.entries(selected)) {
      await page.goto(base + 'skill.html?id=' + skill);
      await page.waitForSelector('#authored .card');
      assert.equal(await page.locator('#how-to-use').count(), 0);
      assert.deepEqual(await idsIn(page.locator('#authored .card')), [...ids].sort());
      assert.equal(await page.locator('.skill-layout .chips a, #ladder td a').count(), 0);
      assert(await hasNoOverflow());
      const archive = referenceUrl(await page.getByRole('link', {name: 'View all references', exact: true}).getAttribute('href'));
      assert.equal(await page.getByRole('heading', {name: 'Official references', exact:true}).count(), 1);
      assert.equal(await page.locator('.official-example').count(), selection[skill].length);
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
      const groupLinks = [];
      for (const group of selection[skill]) {
        const row = page.locator('.comparison-row[data-pattern="' + group.pattern + '"]');
        const original = row.locator('a.official-example');
        assert.equal(await row.count(), 1);
        assert.deepEqual(await idsIn(row.locator('.paired-task')), [...group.cases].sort());
        assert.equal(await original.locator('.subtype-name').innerText(), group.label);
        assert.equal(await original.locator('img').count(), 1);
        const originalId = await original.getAttribute('data-reference');
        const ref = catalog.official.find(s => s.harnessId === 'spatialviz-harness' && s.id === originalId);
        assert(ref, originalId);
        const preview = original.locator('img');
        assert.equal(await preview.getAttribute('src'), ref.thumbnail);
        await preview.evaluate(img => img.decode());
        const href = referenceUrl(await original.getAttribute('href'));
        assert.equal(new URLSearchParams(new URL(href).hash.split('?')[1]).get('case'), ref.id);
        const [left, right] = await Promise.all([original.boundingBox(), row.locator('.paired-task').first().boundingBox()]);
        assert(left.x + left.width <= right.x + 1 && Math.abs(left.y - right.y) < 2, 'Paired thumbnails must share a row at ' + width);
        groupLinks.push({href, ref});
      }
      for (const {href, ref} of groupLinks) {
        await page.goto(href);
        await page.waitForSelector('#reader:not([hidden])');
        assert.equal(await page.locator('#pic').getAttribute('src'), ref.thumbnail.replace('../questions/', ''));
        await page.locator('#pic').evaluate(img => img.decode());
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
        const observed = processData.events.filter(event => event.type === 'reference.viewed').map(event => event.details.sourceId);
        const group = selection[skill].find(group => group.cases.includes(item.id));
        assert.equal(processData.events.findLast(e => e.type === 'choice.selected')?.details.selection, group.pattern);
        const ref = groupLinks[selection[skill].indexOf(group)].ref;
        if (group.cases.length === 1 && observed.length) assert(observed.includes(ref.sourceId), 'Prefer the original viewed in this build');
        assert.equal(review.details.outcome, 'passed');
        assert.equal(await design.getByRole('link').count(), goal.sourceIds.length);
        assert(await hasNoOverflow());
        results.push({width, skill, id:item.id, run:processData.manifest.id});
      }
    }
  }
  return results;
};
