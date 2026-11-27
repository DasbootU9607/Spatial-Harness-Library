'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { check } = require('../reasoning/motion.cjs');

const root = path.resolve(__dirname, '../../..');
const site = path.join(root, 'spatialviz-harness/site');
const cases = require(path.join(root, 'catalog/cases.json')).cases;
const ids = {
  crease: '55ff7e11741379bb06c0d33e', flap: 'e426070849f483c0f4e07277',
  arrows: 'be32b53cc866fa1a1293becd', slide: '4b79c818d711af11fdf896ce',
  single: '8c9bd6899bdbe65d7f39d49e', checkpoint: '0eb78b243c37304db7087fe1',
  stack: '2ebc163cbe53f5b85dd62cbb', flat: 'b31198e23ea7256edb5badba',
  predecessor: '83cce73c95e19deb296ac137', missing: 'd67502860a3c12babdcbce74'
};
function example(key) {
  const record = cases.find(item => item.id === 'authored-' + ids[key]);
  return { record, spec: JSON.parse(fs.readFileSync(path.join(site, record.taskArtifact))) };
}
function assess(key, target) { return check(example(key).spec, { target }); }

test('fold claim distinguishes a fixed crease punch from a reflected partner', () => {
  const rejected = assess('crease', 'diagonal-partner');
  assert.equal(rejected.passed, false);
  assert.match(rejected.feedback, /move a punch/i);
  const corrected = assess('flap', 'diagonal-partner');
  assert.equal(corrected.passed, true, corrected.feedback);
  assert.ok(corrected.evidence.changedHoles.length);
  assert.equal(corrected.evidence.crease.axis, 'diagonal');
  const joined = assess('crease', 'fold-layers');
  assert.equal(joined.passed, true);
  assert.equal(joined.evidence.originalCells.length, 2);

  // Preserve the same fold history. A punch in the uncovered top-left cell
  // now has a unique answer without bringing together any strip layers.
  const uncovered = example('crease').spec;
  uncovered.visualStructure.punches = [[0, 0]];
  uncovered.visualStructure.readOptions.D = [[0, 0]];
  const singleLayer = check(uncovered, {target: 'fold-layers'});
  assert.equal(singleLayer.passed, false);
  assert.match(singleLayer.feedback, /no pair of layers/);
});

test('changed heading must affect a later addressed move', () => {
  const positive = assess('single', 'relative-heading');
  assert.equal(positive.passed, true, positive.feedback);
  assert.ok(positive.evidence.reusedAt > positive.evidence.changedStep);

  // The E-facing mover only advances straight. Three wrong programs end on
  // three distinct legal cells, so the baseline question still has one answer.
  const fixture = {
    taskType: 'ArrowMoving', answer: {index: 0}, geometry: {mode: 'single', size: [3, 3], given: '',
      panels: {Initial: [[0, 1, 'red', 'E']], Final: [[2, 1, 'red', 'E']]},
      choices: ['Forward 1 / Forward 1','Forward 1 / Left 1','Forward 1 / Right 1','Forward 1 / Backward 1']}
  };
  const rejected = check(fixture, {target: 'relative-heading'});
  assert.equal(rejected.passed, false);
  assert.match(rejected.feedback, /next instruction/);
  assert.equal(check(fixture, {target: 'state-replay'}).passed, true);
});

test('exchanges, checkpoints and settling require observable consequences', () => {
  assert.equal(assess('slide', 'moving-occupant').passed, false);
  assert.equal(assess('arrows', 'moving-occupant').passed, true);
  assert.equal(assess('single', 'checkpoint').passed, false);
  const checkpoint = assess('checkpoint', 'checkpoint');
  assert.equal(checkpoint.passed, true, checkpoint.feedback);
  assert.ok(checkpoint.evidence.matchesWithoutCheckpoint.length > 1);
  assert.equal(assess('flat', 'support-drop').passed, false);
  const drop = assess('stack', 'support-drop');
  assert.equal(drop.passed, true, drop.feedback);
  assert.ok(drop.evidence.counterfactual.step >= drop.evidence.changedStep);
});

test('reverse and missing-step questions replay all four printed choices', () => {
  for (const key of ['missing', 'predecessor']) {
    const report = assess(key, 'state-replay');
    assert.equal(report.passed, true, report.feedback);
    assert.equal(Object.keys(report.evidence.foilWitnesses).length, 3);
  }
});

test('retained official builds bind the semantic inputs to rendered bytes and review', () => {
  for (const [id, adapterId] of [['flap', 'official-paper-folding'], ['arrows', 'arrow-movement'], ['stack', 'block-movement']]) {
    const { record, spec } = example(id);
    const adapter = require('../adapters/' + adapterId + '.cjs');
    assert.deepEqual(adapter.render(spec), fs.readFileSync(path.join(site, record.thumbnail)));
    const process = JSON.parse(fs.readFileSync(path.join(site, record.process)));
    const candidateId = record.verification.candidateId;
    assert.ok(process.tests.some(t => t.candidateId === candidateId && t.verdict === 'passed'));
    assert.ok(process.events.some(e => e.type === 'visual.review' && e.candidateId === candidateId && e.details.outcome === 'passed'));
  }
});
