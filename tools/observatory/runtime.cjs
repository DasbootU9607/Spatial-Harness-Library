'use strict';
// One journal and passive collector, also used by the existing Maze adapters.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {spawnSync} = require('node:child_process');
const S = require('../../maze-harness/tools/authoring-observatory/lib/store.cjs');
const U = require('../../maze-harness/tools/authoring-observatory/lib/session-usage.cjs');
const ROOT = path.resolve(__dirname, '../..');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const sha = S.hash;
const now = () => new Date().toISOString();
function atomic(file, value) {
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const temp = file + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(temp, JSON.stringify(value, null, 2) + '\n'); require('../../maze-harness/tools/authoring-observatory/lib/atomic.cjs').replace(temp, file);
}
function active(dir) {const m = read(path.join(dir, 'manifest.json')); if (m.finishedAt) throw new Error('Run is sealed; start an independent task.'); return m;}
function refreshUsage(dir, options) {try{return U.refresh(dir,options);}catch{S.appendEvent(dir,'capture.gap',{reason:'Usage refresh failed at this boundary; independent task verification is unchanged.'});return null;}}
function event(dir, type, details = {}, opts = {}) {active(dir); refreshUsage(dir); return S.appendEvent(dir, type, details, opts);}
function start({task, title, harness, skill, runKind = 'task-generation', benchmark = null, category = null, taskType = null, root = path.join(ROOT, '.harness/runs'), binding, viewer = true, gaps = []}) {
  if (!task || !harness || !['task-generation', 'skill-development'].includes(runKind)) throw new Error('Exact task, harness and supported runKind required.');
  const taskPath = path.resolve(task), session = binding || U.discover();
  const id = 'build-' + crypto.randomUUID();
  const dir = S.createRun({root, id, title, task: taskPath, watchSpec: taskPath, configuration: {adapter: harness}, limitations: [
    'Only recorder-mediated deliveries, commands and saved boundaries are observed; direct function calls, unwrapped commands and unsaved editor states are excluded.',
    'Design notes are explicit author annotations, not internal reasoning.'
  ]});
  S.updateManifest(dir, {runKind, harness, benchmark, category, taskType, finishedAt: null, captureGaps: gaps, skill: skill ? {id: path.basename(skill), sha256: sha(fs.readFileSync(path.join(skill, 'SKILL.md')))} : null});
  atomic(path.join(dir, 'binding.json'), {task: taskPath, sessionId: session.sessionId, runtime: session.runtime});
  U.begin(dir, {binding: session});
  event(dir, 'collector.started', {mode: 'passive-current-session'});
  for (const reason of gaps) event(dir, 'capture.gap', {reason});
  if (skill) {const ref = S.saveArtifact(dir, path.join(skill, 'SKILL.md'), 'dependencies'); event(dir, 'skill.attached', {skill: path.basename(skill), sha256: sha(fs.readFileSync(path.join(skill, 'SKILL.md')))}, {evidenceRefs: [ref]});}
  if (viewer) try {require('./viewer.cjs').ensure(root);} catch {event(dir,'capture.gap',{reason:'Local viewer could not be reached. Recording continues; inspect viewer logs and local-network permissions.'});}
  return dir;
}
function resume(dir, task, sessionId = process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID) {
  active(dir); const b = read(path.join(dir, 'binding.json'));
  if (b.task !== path.resolve(task) || !sessionId || b.sessionId !== sessionId) throw new Error('Exact task and session binding required to resume.');
  event(dir, 'run.resumed', {}); return dir;
}
function deliver(dir, file, {start = 1, end, sink = text => process.stdout.write(text)} = {}) {
  active(dir); const actionId = crypto.randomUUID(), bytes = fs.readFileSync(file), lines = bytes.toString('utf8').split(/\r?\n/);
  const delivered = start === 1 && end === undefined ? bytes : Buffer.from(lines.slice(start - 1, end).join('\n'));
  let outcome = 'delivered'; try {sink(delivered.toString('utf8'));} catch (e) {outcome = 'failed'; throw e;} finally {
    const temp = path.join(dir, 'artifacts', crypto.randomUUID() + '.txt'); fs.writeFileSync(temp, delivered);
    const ref = S.saveArtifact(dir, temp, 'resources'); fs.unlinkSync(temp);
    event(dir, 'resource.read', {label: path.basename(file), start, end: end ?? lines.length, sha256: sha(delivered), sourceSha256: sha(bytes), outcome}, {actionId, evidenceRefs: [ref]});
  }
}
function note(dir, annotation, candidateId = null) {
  const details = Object.fromEntries(['goal','sources','change','reason','expectedChecks'].map(k => [k, annotation[k] ?? null]));
  return event(dir, 'design.note', details, {origin: 'agent_statement', actor: 'author', candidateId});
}
function fingerprints(spec, bytes) {
  const out = {specification: sha(bytes)};
  for (const key of ['geometry','question','options','answer','contract','rendering','generator']) out[key] = spec && Object.hasOwn(spec, key) ? sha(spec[key]) : null;
  return out;
}
function save(dir, file, {parentId = null, parentBasis = null, actionId = crypto.randomUUID()} = {}) {
  active(dir); refreshUsage(dir); const bytes = fs.readFileSync(file); let spec = null, previewUnavailable = null;
  try {spec = JSON.parse(bytes.toString('utf8'));} catch {previewUnavailable = 'Malformed JSON draft; no preview available.';}
  return S.mutate(dir, (index, emit) => {
    const parent = index.candidates.find(c => c.id === parentId);
    if (parentId && (!parent || !parentBasis)) throw new Error('Parent requires an existing candidate and explicit basis.');
    const id = 'v' + String(index.candidates.length + 1).padStart(3, '0'), fp = fingerprints(spec, bytes), specPath = `candidates/${id}-${fp.specification.slice(0,12)}.json`;
    fs.writeFileSync(path.join(dir, specPath), bytes, {flag: 'wx'});
    const c = {id, parentId, parentBasis, actionId, createdAt: now(), specPath, sha256: fp.specification, fingerprints: fp, previewUnavailable, changes: parent ? Object.keys(fp).filter(k => fp[k] !== parent.fingerprints[k]) : Object.keys(fp).filter(k => fp[k] !== null)};
    index.candidates.push(c); emit('candidate.saved', c, {candidateId: id, actionId, evidenceRefs: [specPath]}); return c;
  });
}
function candidate(dir, id) {const c = S.readRun(dir).candidates.find(c => c.id === id); if (!c) throw new Error('Unknown candidate'); if (sha(fs.readFileSync(path.join(dir,c.specPath))) !== c.sha256) throw new Error('Candidate snapshot changed'); return c;}
function execute(dir, command, args = [], {candidateId = null, cwd = ROOT, kind = 'command', report, verifier, expectedFingerprints} = {}) {
  active(dir); const c = candidateId ? candidate(dir, candidateId) : null, actionId = crypto.randomUUID();
  if (report && fs.existsSync(report)) {const ref = S.saveArtifact(dir, report, 'previous-reports'); event(dir, 'report.previous', {sha256: sha(fs.readFileSync(report))}, {actionId, evidenceRefs: [ref]}); fs.unlinkSync(report);}
  const started = event(dir, 'command.started', {command, args, cwd, kind, label: path.basename(command)}, {actionId, candidateId});
  const result = spawnSync(command, args, {cwd, encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024});
  process.stdout.write(result.stdout || ''); process.stderr.write(result.stderr || '');
  const refs = [];
  for (const field of ['stdout', 'stderr']) {const file = path.join(dir,'commands', actionId + '.' + field + '.txt'); fs.writeFileSync(file,result[field] || result.error?.message || ''); refs.push(path.relative(dir,file).replaceAll('\\','/'));}
  const completed = event(dir, 'command.completed', {commandEventId: started.id, kind, exitCode: result.status, signal: result.signal || null}, {actionId, candidateId, evidenceRefs: refs});
  if (!report) return {exitCode: result.status ?? 1, actionId, commandEventId: started.id};
  let data = null, reportPath = null, reportSha256 = null;
  if (fs.existsSync(report)) {reportPath = S.saveArtifact(dir,report,'reports'); reportSha256 = sha(fs.readFileSync(report)); try {data = read(report);} catch {}}
  const bound = c && data && data.candidateId === candidateId && JSON.stringify(data.testedFingerprints) === JSON.stringify(c.fingerprints) && (!expectedFingerprints || JSON.stringify(expectedFingerprints) === JSON.stringify(c.fingerprints));
  const checks = Array.isArray(data?.checks) ? data.checks : [];
  let verdict = !data ? 'error' : ['passed','failed','unknown','error'].includes(data.verdict) ? data.verdict : 'unknown';
  if (!bound) verdict = 'unknown';
  if (verdict === 'passed' && (result.status !== 0 || !checks.length || checks.some(x => x.verdict !== 'passed') || !data.scope || data.verifier?.revision !== verifier?.revision || data.verifier?.id !== verifier?.id)) verdict = 'error';
  const test = {actionId, candidateId, testedFingerprints: data?.testedFingerprints || null, verifier: data?.verifier || verifier || null, reportSha256, reportPath, verdict, status: verdict, checks, scope: data?.scope || null, commandExitStatus: result.status, commandEventId: started.id, completedEventId: completed.id, binding: bound ? 'exact' : 'missing', bindingBasis: bound ? 'exact candidate and full input fingerprints' : 'missing or conflicting fingerprints', evidenceRefs: reportPath ? [reportPath] : []};
  const t = S.addTest(dir, test); refreshUsage(dir); return {...t, exitCode: result.status ?? 1};
}
function render(dir, id, adapter) {
  active(dir); const c = candidate(dir,id), actionId = crypto.randomUUID();
  event(dir,'render.started',{renderer:adapter.identity}, {actionId,candidateId:id});
  const bytes = adapter.render(read(path.join(dir,c.specPath))), file = path.join(dir,'artifacts',`${id}-${sha(bytes)}.svg`); if(!fs.existsSync(file)) fs.writeFileSync(file, bytes, {flag:'wx'});
  const ref = path.relative(dir,file).replaceAll('\\','/');
  const details = {sha256:sha(bytes), specification:c.sha256, rendering:c.fingerprints.rendering, renderer:adapter.identity, artifactPath:ref};
  event(dir,'render.completed',details,{actionId,candidateId:id,evidenceRefs:[ref]}); return details;
}
function finish(dir, id, outcome = 'accepted') {
  active(dir); const c = id ? candidate(dir,id) : null, run = S.readRun(dir);
  if (outcome === 'accepted' && (!c || !run.tests.some(t => t.candidateId === id && t.verdict === 'passed' && t.binding === 'exact' && JSON.stringify(t.testedFingerprints) === JSON.stringify(c.fingerprints)))) throw new Error('Acceptance requires exact passing verification.');
  refreshUsage(dir,{finish:true}); S.appendEvent(dir,'run.finished',{outcome,finalCandidateId:id},{candidateId:id});
  return S.updateManifest(dir,{status:outcome,finalCandidateId:id,finishedAt:now()});
}
module.exports = {ROOT,S,U,read,sha,atomic,active,event,start,resume,deliver,note,fingerprints,save,candidate,execute,render,finish};
