'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {check} = require('../reasoning/solids.cjs');

const library = path.resolve(__dirname, '../../..');
function task(id, name = 'task.json') {
  return require(path.join(library, 'spatialviz-harness/site/records', 'authored-' + id, name));
}

test('A marked plane through the base alone cannot test the viewing side; cutting the cap restores the dependency', () => {
  const base = task('2702dd90b90a371a9a91c68d');
  const cap = task('f8d5bd6662e652869f0be68e');
  const wrong = check(base, {target: 'marked-side'});
  assert.equal(wrong.passed, false);
  assert.deepEqual(wrong.evidence.controlChoices, wrong.evidence.choices);
  assert.match(wrong.feedback, /shoulder/);
  const fixed = check(cap, {target: 'marked-side'});
  assert.equal(fixed.passed, true);
  assert.deepEqual(fixed.evidence.controlChoices, ['C']);
  assert.deepEqual(check(cap, {target: 'marked-plane'}).evidence.controlChoices, ['B']);
});

test('Seam containment requires an impossible chord and attainable witnesses for all the other choices', () => {
  const original = task('b289488b0ea4a7c36950b331');
  const broken = structuredClone(original);
  const wrong = (broken.answer.index + 1) % 4;
  broken.options[wrong] = broken.options[broken.answer.index];
  const failed = check(broken, {target: 'seam-containment'});
  assert.equal(failed.passed, false);
  assert.ok(failed.evidence.choices.includes('ABCD'[wrong]));
  const pass = check(original, {target: 'seam-containment'});
  assert.equal(pass.passed, true);
  assert.equal(pass.evidence.planes.filter(p => p.matchesIndependentClip).length, 3);
});

test('Exact cover can pass with a volume shortcut; a same-volume nonfitting riser tests the interface', () => {
  const sampled = task('44a9c20c4a6c41fff26b2dd3');
  assert.equal(check(sampled, {target: 'exact-cover'}).passed, true);
  const failed = check(sampled, {target: 'equal-volume-interface'});
  assert.equal(failed.passed, false);
  assert.match(failed.feedback, /A=6, B=7, C=6/);
  const r = check(task('9451d76c6dbafb1c238bb80e'), {target: 'equal-volume-interface'});
  assert.equal(r.passed, true);
  assert.deepEqual(r.evidence.equalVolumeFoils, ['A','C']);
  assert.equal(r.evidence.placements[1].coordinatesByPiece.length, 2);
});

test('Changing the feasible set alone does not prove Left essential for the requested answer', () => {
  const unchangedMaximum = task('c6d944a15026a091274fa5e2');
  assert.equal(check(unchangedMaximum, {target: 'count-feasibility'}).passed, true);
  const failed = check(unchangedMaximum, {target: 'third-view-essential'});
  assert.equal(failed.passed, false);
  assert.deepEqual(failed.evidence.totals, [15,16,17]);
  assert.deepEqual(failed.evidence.choices, failed.evidence.choicesWithoutLeft);
  assert.match(failed.feedback, /still selects A/);
  const fixed = check(task('40f1b06b1134e1834402f5b6'), {target: 'third-view-essential'});
  assert.equal(fixed.passed, true);
  assert.deepEqual(fixed.evidence.totals, [7]);
  assert.deepEqual(fixed.evidence.withoutLeft, [7,8,9,10,11]);
  assert.ok(fixed.evidence.excludedExample.heights.length > 0);
});

// This fixture changes only the question and four visible answer lines on a real
// hoist plate. The cord still exists, but the newly observed driven gear is upstream.
function askAboutGear(original) {
  const fixture = structuredClone(original);
  const source = `
import base64, io, json, sys
from PIL import Image
sys.path.insert(0, sys.argv[1])
from cad_plate import PAPER, START, ROW, line, read_pixels
data = base64.b64decode(sys.stdin.read())
printed = read_pixels(io.BytesIO(data))
im = Image.open(io.BytesIO(data)).convert('RGB')
def rewrite(y, text):
    im.paste(PAPER, (0,y,im.width,y+ROW))
    line(im,y,text)
rewrite(START + ROW, 'Find B (frame spin) at the shown instant.')
start = START + (2+len(printed['facts']))*ROW + 37
for i, text in enumerate(('CW','CCW','stationary','translates')):
    rewrite(start+i*ROW, 'ABCD'[i]+'  '+text)
out = io.BytesIO()
im.save(out,format='PNG')
print(base64.b64encode(out.getvalue()).decode())
`;
  fixture.rendering.pngBase64 = execFileSync(process.env.SPATIALVIZ_PYTHON || 'python', ['-B','-c',source,
    path.join(library, 'spatialviz-harness/skills/spatialviz-mechanical-system/scripts')], {
    input: original.rendering.pngBase64, encoding:'utf8', windowsHide:true, maxBuffer:8*1024*1024
  }).trim();
  fixture.answer.index = 1;
  return fixture;
}

test('Re-threading the line affects the weight, while it cannot determine the upstream gear spin', () => {
  const left = task('e979ecaa5c35287a3747ec04');
  const wrong = check(askAboutGear(left), {target: 'critical-joint', joint: 'cord:D/W'});
  assert.equal(wrong.passed, false);
  assert.deepEqual(wrong.evidence.original, ['CCW']);
  assert.deepEqual(wrong.evidence.changedOutputs, ['CCW']);
  assert.match(wrong.feedback, /cord:D\/W/);
  const a = check(left, {target: 'critical-joint', joint: 'cord:D/W'});
  const b = check(task('f1b2e96852e4013b0a62f69e'), {target: 'critical-joint', joint: 'cord:D/W'});
  assert.equal(a.passed, true);
  assert.equal(b.passed, true);
  assert.deepEqual(a.evidence.changedOutputs, b.evidence.original);
  assert.deepEqual(b.evidence.changedOutputs, a.evidence.original);
  const slide = check(task('5df35a34e74253b184d2b44b'), {target: 'critical-joint', joint: 'key:B/K'});
  assert.equal(slide.passed, true);
  assert.deepEqual(slide.evidence.changedOutputs, ['underdetermined']);
});
