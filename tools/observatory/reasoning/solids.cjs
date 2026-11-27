'use strict';

const path = require('node:path');
const {spawnSync} = require('node:child_process');
const nativeScripts = '../../../spatialviz-harness/skills/spatialviz-mechanical-system/scripts/';
const {readPrinted} = require(nativeScripts + 'cad_solve.cjs');
const {solve} = require(nativeScripts + 'solve.cjs');

const targets = {
  CrossSection: ['marked-plane', 'marked-side', 'seam-containment'],
  CubeAssembly: ['exact-cover', 'equal-volume-interface'],
  CubeCounting: ['count-feasibility', 'third-view-essential'],
  MechanicalSystem: ['critical-joint']
};

function failure(evidence, feedback) {
  return {passed: false, evidence, feedback};
}

function mechanical(printed, spec, design) {
  const baseline = readPrinted(printed);
  const jointName = j => j.kind + ':' + j.ports.join('/');
  const joints = baseline.joints.map(jointName);
  const evidence = {joints, original: baseline.result, choice: baseline.options[baseline.index].label};
  if (baseline.index !== spec.answer.index) {
    return failure(evidence, 'The front-view facts select ' + evidence.choice + '. Restore the printed driver, target and designated answer before comparing connections.');
  }
  const index = joints.indexOf(design.joint);
  if (index < 0 || joints.lastIndexOf(design.joint) !== index) {
    return failure(evidence, 'Identify the one decisive printed joint by kind and ordered body IDs: ' + joints.join(', ') + '. Preserve the driver and observer.');
  }
  const changed = structuredClone(baseline.joints);
  const joint = changed[index];
  if (joint.kind === 'cord') {
    joint.settings.side = joint.settings.side === 'left' ? 'right' : 'left';
    evidence.change = 'Re-thread the taut line on the ' + joint.settings.side + ' tangent. Keep the load below that tangent and retain the drum bearing.';
  } else {
    changed.splice(index, 1);
    evidence.change = 'Release only ' + design.joint + ' while retaining bearings, guides, driver, observer and the other ideal kinematic constraints.';
  }
  // Keep released bodies in the system: a target without a determining joint is a
  // free degree of freedom, distinct from an absent or misspelled member.
  const bodies = new Set([baseline.driver, ...baseline.targets.map(t => t.name)]);
  for (const j of baseline.joints) {
    for (const body of j.ports) bodies.add(body);
    if (j.kind === 'mesh' && j.settings.arm !== 'frame') bodies.add(j.settings.arm);
  }
  const components = Object.fromEntries(Array.from(bodies, name => [name, true]));
  const outcomes = [];
  for (const target of baseline.targets) {
    try {
      const model = {components, joints: changed, driver: baseline.driver, input: baseline.input, targets: [target]};
      outcomes.push(solve(model).result[0]);
    } catch (e) {
      if (e.message !== 'Underdetermined ' + target.name) throw e;
      outcomes.push('underdetermined');
    }
  }
  evidence.changedOutputs = outcomes;
  if (outcomes.every((value, i) => value === baseline.result[i])) {
    return failure(evidence, 'Changing ' + design.joint + ' leaves the requested motion ' + outcomes.join(' / ') + '. Keep the observer and drive; select the contact that determines this output or change the observed body.');
  }
  return {passed: true, evidence, feedback: ''};
}

/** Replay the declared inference from the final plate and verified native geometry. */
function check(spec, design) {
  const supported = targets[spec.taskType] || [];
  if (!supported.includes(design.target)) {
    return failure({supported}, 'Choose a supported inference for ' + spec.taskType + ': ' + supported.join(', '));
  }
  const input = {taskType: spec.taskType, options: spec.options, answer: {index: spec.answer.index},
    geometry: spec.geometry, rendering: {pngBase64: spec.rendering.pngBase64}};
  const child = spawnSync(process.env.SPATIALVIZ_PYTHON || 'python',
    ['-B', path.join(__dirname, 'solid_witness.py')], {
      input: JSON.stringify({spec: input, target: design.target}), encoding: 'utf8',
      windowsHide: true, maxBuffer: 16 * 1024 * 1024
    });
  if (child.error || child.status !== 0) {
    return failure({}, 'The native reasoning checker could not run: ' + (child.error?.message || child.stderr.trim().split('\n').at(-1)));
  }
  try {
    const report = JSON.parse(child.stdout);
    if (report.printed) return mechanical(report.printed, spec, design);
    return report;
  } catch (e) {
    return failure({}, 'Could not reconstruct the final printed conditions: ' + e.message);
  }
}

module.exports = {check};
