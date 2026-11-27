'use strict';

const path = require('node:path');
const {spawnSync} = require('node:child_process');

function check(spec, design) {
  const {taskType, geometry, parameters, polarity, options} = spec;
  const evidenceInput = {taskType, geometry, parameters, polarity, options, answerIndex: spec.answer?.index};
  if (taskType === '3ViewProjection') {
    // Retain the exact delivered panel PNGs used by the independent projection solver.
    evidenceInput.views = spec.pipeline?.views;
  }
  const job = spawnSync(process.env.SPATIALVIZ_PYTHON || 'python',
    ['-B', path.join(__dirname, 'rotation_folding.py')], {
      input: JSON.stringify({target: design.target, spec: evidenceInput}),
      encoding: 'utf8', windowsHide: true, maxBuffer: 2 * 1024 * 1024
    });
  if (job.error || job.status !== 0) {
    return {passed: false, evidence: {}, feedback: 'Could not run the spatial reasoning check: ' +
      (job.error?.message || job.stderr || 'Python exited ' + job.status)};
  }
  return JSON.parse(job.stdout);
}

module.exports = {check};
