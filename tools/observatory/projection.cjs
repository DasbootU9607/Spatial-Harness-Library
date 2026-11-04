'use strict';
const fs = require('node:fs'), path = require('node:path');
const R = require('./runtime.cjs');
const select = (o, keys) => Object.fromEntries(keys.filter(k => o && Object.hasOwn(o,k)).map(k => [k,o[k]]));
function safe(value) {
  if (typeof value === 'string') return /[a-z]:[\\/]|(?:^|\s)\/(?:Users|home|tmp|workspace)\/|(?:sk-|gh[pousr]_)[a-zA-Z0-9_-]{10,}|(?:password|api[_-]?key|authorization|bearer)\s*[:=]/i.test(value) ? '[private value omitted]' : value;
  if (Array.isArray(value)) return value.map(safe);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([k]) => !/session|transcript|prompt|rawResponse|command$|args$|cwd$|sourcePath/i.test(k)).map(([k,v]) => [k,safe(v)]));
  return value;
}
const detailKeys = ['goal','sources','change','reason','expectedChecks','outcome','label','start','end','sha256','sourceSha256','commandEventId','completedEventId','kind','exitCode','signal','verdict','status','checks','scope','binding','bindingBasis','testedFingerprints','verifier','reportSha256','parentId','parentBasis','changes','fingerprints','previewUnavailable','renderer','specification','rendering','skill','finalCandidateId','review','inputs'];
function project(dir, {local = false} = {}) {
  const run = R.S.readRun(dir);
  const events = run.events.map(e => ({...select(e,['id','seq','runId','at','recordedAt','type','actor','origin','actionId','candidateId']), details:safe(select(e.details,detailKeys)), evidenceRefs:e.evidenceRefs.map(ref => ({id:R.sha(ref).slice(0,16),sha256:fs.existsSync(path.join(dir,ref)) ? R.sha(fs.readFileSync(path.join(dir,ref))) : null, availability:'local evidence; hash published'}))}));
  const usage = run.tokenUsage ? safe(select(run.tokenUsage,['schemaVersion','runId','source','runtime','status','startedAt','finishedAt','lastObservedAt','elapsedMs','elapsedKind','scope','scopeComplete','observedTokens','tokens','models','missingFields','issues','observations'])) : null;
  const candidates=run.candidates.map(c => select(c,['id','parentId','parentBasis','sha256','fingerprints','previewUnavailable','changes']));
  if(local)for(const c of candidates){const rendering=run.events.findLast(e=>e.type==='render.completed'&&e.candidateId===c.id&&e.details.specification===c.sha256);if(rendering)c.preview={path:`/api/preview/${run.manifest.id}/${c.id}`,sha256:rendering.details.sha256};}
  return {schemaVersion:1,manifest:safe(select(run.manifest,['id','title','runKind','harness','benchmark','category','taskType','skill','status','createdAt','finishedAt','finalCandidateId','limitations','captureGaps'])),events,candidates,tests:run.tests.map(t => safe(select(t,['id','actionId','candidateId','testedFingerprints','verifier','reportSha256','verdict','status','checks','scope','commandExitStatus','binding','bindingBasis','commandEventId']))),usage};
}
function contained(dir, ref) {const root=fs.realpathSync(dir), file=fs.realpathSync(path.join(dir,ref)), rel=path.relative(root,file); if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('Evidence escapes run'); return file;}
function audit(dir, delivered) {
  const run = R.S.readRun(dir), m=run.manifest;
  if (!m.finishedAt || m.status !== 'accepted') throw new Error('Accepted finished run required');
  const c=R.candidate(dir,m.finalCandidateId);
  if (R.sha(fs.readFileSync(delivered)) !== c.sha256) throw new Error('Delivered task changed after verification');
  if (run.events.some((e,i) => e.seq !== i+1 || e.id !== 'e'+String(i+1).padStart(6,'0') || e.runId !== m.id) || new Set(run.events.map(e=>e.id)).size !== run.events.length) throw new Error('Invalid event ordering');
  if (run.events.at(-1)?.type !== 'run.finished') throw new Error('Missing final event');
  const index=R.read(path.join(dir,'index.json')); if (index.nextSeq !== run.events.length+1) throw new Error('Journal/index interrupted write');
  for(const e of run.events) for(const ref of e.evidenceRefs) contained(dir,ref);
  for(const version of run.candidates) R.candidate(dir,version.id);
  const t=run.tests.findLast(t=>t.candidateId===c.id && t.verdict==='passed' && t.binding==='exact');
  if (!t || JSON.stringify(t.testedFingerprints)!==JSON.stringify(c.fingerprints) || R.sha(fs.readFileSync(contained(dir,t.reportPath)))!==t.reportSha256) throw new Error('Missing or altered verification evidence');
  const report=R.read(contained(dir,t.reportPath));
  if (report.verdict!=='passed' || report.candidateId!==c.id || JSON.stringify(report.testedFingerprints)!==JSON.stringify(c.fingerprints)) throw new Error('Report binding conflict');
  for(const e of run.events.filter(e=>e.type==='render.completed')) if (R.sha(fs.readFileSync(contained(dir,e.details.artifactPath)))!==e.details.sha256 || e.details.specification!==R.candidate(dir,e.candidateId).sha256) throw new Error('Stale rendering');
  return {run,candidate:c,test:t,process:project(dir)};
}
function csv(process) {
  const keys=['id','seq','runId','at','recordedAt','type','actor','origin','actionId','candidateId','details','evidenceRefs'];
  const cell=v=>'"'+(v==null?'':typeof v==='object'?JSON.stringify(v):String(v)).replaceAll('"','""')+'"';
  return [keys.join(','),...process.events.map(e=>keys.map(k=>cell(e[k])).join(','))].join('\n')+'\n';
}
module.exports={project,audit,csv,safe};
