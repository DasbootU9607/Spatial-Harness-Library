'use strict';

const path = require('node:path');
const { spawnSync } = require('node:child_process');

// The normal domain verifier binds these structures to the final printed sheet.
// Pass only the solved question, never the embedded multi-megabyte image.
function check(spec, design) {
  const { taskType, geometry, visualStructure } = spec;
  const result = spawnSync(process.env.SPATIALVIZ_PYTHON || 'python', [
    '-B', path.join(__dirname, 'motion_claim.py')
  ], {
    windowsHide: true, encoding: 'utf8',
    input: JSON.stringify({ taskType, geometry, visualStructure, target: design.target, index: spec.answer?.index })
  });
  if (result.status !== 0 || result.error) {
    return { passed: false, evidence: {}, feedback: 'Motion reasoning check could not run: ' +
      (result.error?.message || result.stderr.trim() || 'Python exited without a result.') };
  }
  return JSON.parse(result.stdout);
}

module.exports = { check };
