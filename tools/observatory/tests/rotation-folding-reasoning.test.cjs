'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {check} = require('../reasoning/rotation-folding.cjs');
const cases = require('../../../catalog/cases.json').cases;

function published(id) {
  const entry = cases.find(c => c.id === 'authored-' + id);
  assert.ok(entry);
  assert.equal(entry.supersededBy, undefined);
  return path.resolve(__dirname, '../../../spatialviz-harness/site', entry.taskArtifact);
}

function exercise(spec, target, expected) {
  const report = check(spec, {target});
  assert.equal(report.passed, expected, JSON.stringify(report));
  return report;
}

test('a red-corner shortcut is valid for general rotation and fails a claimed motif target; keep the CAD renders for the repair', () => {
  const file = published('90f81f5fd0a46f44ce653394');
  const spec = require(file);
  assert.match(exercise(spec, 'decorated-grid', true).evidence.shortcut, /C/);
  assert.match(exercise(spec, 'motif-orientation', false).feedback, /corner and grid size already select C/);

  const run = spawnSync(process.env.SPATIALVIZ_PYTHON || 'python', ['-B',
    path.join(__dirname, 'fixtures/recompose-rotation.py'), file], {encoding:'utf8', windowsHide:true});
  assert.equal(run.status, 0, run.stderr);
  const repaired = JSON.parse(run.stdout);
  assert.notEqual(repaired.previewDigest, spec.rendering.image.sha256);
  assert.deepEqual(repaired.geometry, spec.geometry);
  assert.ok(Object.keys(exercise(repaired, 'motif-orientation', true).evidence.orientationDifferences).length);
  const dots = require(published('f3e2bb897cc215f0aba5f0a0'));
  assert.ok(exercise(dots, 'motif-orientation', true).evidence.orientationDifferences.B.length);
  const duplicate = structuredClone(dots);
  duplicate.options[1].geometry = duplicate.options[0].geometry;
  assert.deepEqual(exercise(duplicate, 'motif-orientation', false).evidence.fullMatches, ['A','B']);
});

test('3D proper-rotation goals require a same-count near miss; a count-change goal preserves a different inference', () => {
  const cannot = require(published('0dd9dde74dafe28bbfdc8e59'));
  assert.match(exercise(cannot, 'proper-rotation', false).feedback, /counting/);
  exercise(cannot, 'cube-count-change', true);
  const original = require(published('f79db8d6a2473b80ac1a9005'));
  const broken = structuredClone(original);
  for (const option of broken.options.filter(o => o.type === 'figure' && o.label !== 'ABC'[original.answer.index])) {
    option.geometry.cubes = option.geometry.cubes.slice(0, original.geometry.cubes.length-1);
  }
  assert.match(exercise(broken, 'proper-rotation', false).feedback, /same-count/);
  const report = exercise(original, 'proper-rotation', true);
  assert.equal(report.evidence.fullMatches.length, 1);
  assert.ok(Object.values(report.evidence.alignments).some(a => a.missing.length && a.extra.length));
});

test('projection checks a same-outline colored foil in the printed panels and changes of projected CAD edges', () => {
  const cubes = require(published('c584d59b6459862c7cfa6a1c'));
  const broken = structuredClone(cubes);
  broken.pipeline.views.A = broken.pipeline.views.B;
  assert.match(exercise(broken, 'nearest-surface', false).feedback, /Left outline/);
  const noOcclusion = structuredClone(cubes);
  noOcclusion.geometry.cubes.find(([x,y,z]) => x===2 && y===1 && z===0)[3] = 'G';
  assert.match(exercise(noOcclusion, 'nearest-surface', false).feedback, /hidden behind/);
  const rays = exercise(cubes, 'nearest-surface', true).evidence.occludingRays.A;
  assert.deepEqual(rays[0], {row:3, column:2, nearX:0, hiddenX:[2], nearColor:'G', foilColor:'R'});
  for (const id of ['3fd24385eefbe6dcd4e8f848','de5cb480b5961b20dd56ecd3']) {
    const cad = require(published(id));
    const noChange = structuredClone(cad);
    noChange.parameters.given = noChange.parameters.target;
    assert.match(exercise(noChange, 'cad-view', false).feedback, /coincide/);
    assert.ok(exercise(cad, 'cad-view', true).evidence.givenTargetDistance > 8);
  }
});

test('reconstruction checks named opposite faces, ordered corners and when motif direction is informative', () => {
  const opposite = require(published('4650b452cbccb5d947d2b7a8'));
  const wrong = structuredClone(opposite);
  wrong.options[1].text = wrong.options[2].text;
  assert.deepEqual(exercise(wrong, 'opposite-face', false).evidence.fullMatches, ['B','C']);
  assert.equal(exercise(opposite, 'opposite-face', true).evidence.opposite, 'green');
  const color = require(published('e1021b79ff687920a48a05ab'));
  assert.match(exercise(color, 'face-orientation', false).feedback, /order alone/);
  exercise(color, 'visible-corner', true);
  const lines = require(published('c1308cc922e23f7b8603bc18'));
  const checked = exercise(lines, 'face-orientation', true).evidence;
  assert.notDeepEqual(checked.ignoringFaceTurns, checked.fullMatches);
});

test('unfolding distinguishes orientation dependence under both positive and negative question polarity', () => {
  const color = require(published('2511a9b635397c10c445ac83'));
  assert.match(exercise(color, 'face-orientation', false).feedback, /order alone/);
  exercise(color, 'visible-corner', true);
  for (const id of ['bb348ceb2351f866084b53fe','9f0b65010e6d637d01189a9f']) {
    const original = require(published(id));
    const altered = structuredClone(original);
    const winner = original.answer.index;
    altered.geometry.options[(winner+1)%4] = altered.geometry.options[winner];
    assert.equal(exercise(altered, 'visible-corner', false).evidence.fullMatches.length, 2);
    const evidence = exercise(original, 'face-orientation', true).evidence;
    assert.notDeepEqual(evidence.ignoringFaceTurns, evidence.fullMatches);
  }
});
