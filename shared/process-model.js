const text = value => typeof value === 'string' ? value : value == null ? '' : JSON.stringify(value);
export const eventLabel = type => String(type || 'record').replaceAll('.', ' ').replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
export function eventKind(event) {
  if (['resource.read','skill.attached'].includes(event.type)) return 'resource';
  if (event.type === 'candidate.saved') return 'candidate';
  if (event.type === 'design.note') return 'note';
  if (event.type === 'test.completed') return 'test';
  if (event.type === 'run.finished') return 'delivery';
  return 'operation';
}
export function eventStatus(event) {
  const d = event.details || {};
  if (event.type === 'test.completed') return d.verdict || 'unknown';
  if (event.type === 'visual.review') return d.outcome || 'unknown';
  if (event.type === 'command.completed') return d.exitCode === 0 ? 'passed' : d.exitCode == null ? 'unknown' : 'failed';
  return null;
}
export function eventSummary(event) {
  const d = event.details || {};
  switch (event.type) {
    case 'resource.read': return `${text(d.label) || 'Reference'} · ${d.outcome || 'delivery unknown'}`;
    case 'skill.attached': return text(d.skill) || 'Skill attached to this run.';
    case 'candidate.saved': return `${event.candidateId || 'Version'} · ${d.parentId ? 'Based on '+d.parentId : 'No parent recorded'}${d.changes?.length ? ' · '+d.changes.join(', ')+' changed' : ''}`;
    case 'design.note': return text(d.change || d.goal) || 'Author annotation saved.';
    case 'test.completed': return `${d.verdict || 'Unknown'} · ${(d.checks || []).filter(c => (c.verdict || c.status) === 'passed').length}/${(d.checks || []).length} checks passed. ${text(d.scope)}`;
    case 'visual.review': return text(d.review) || `${d.outcome || 'Unknown'} visual review.`;
    case 'command.started': return `${text(d.label) || 'Command'} · ${d.kind || 'purpose not recorded'}`;
    case 'command.completed': return `${d.kind || 'Command'} · ${d.exitCode == null ? 'exit code unknown' : 'exit code '+d.exitCode}`;
    case 'render.completed': return 'A rendered image was recorded for this exact version.';
    case 'run.finished': return `${d.outcome || 'Finished'} · final version ${d.finalCandidateId || event.candidateId || 'not recorded'}`;
    default: return text(d.summary || d.label || d.reason) || eventLabel(event.type);
  }
}
export function versionResult(p, candidate) {
  const tests = (p.tests || []).filter(t => t.candidateId === candidate.id && t.testedFingerprints?.specification === candidate.sha256);
  return tests.at(-1)?.verdict || 'unknown';
}
export function timelineEvents(p) {
  const events = p.events || [], firstTypes = new Set(), keys = new Set();
  // Key markers are a navigation subset. All records retain their saved order and IDs.
  for (const event of events) {
    if (!['command.started','command.completed','render.started','render.completed','collector.started','build.saved','report.previous'].includes(event.type) && !firstTypes.has(event.type)) {
      firstTypes.add(event.type); keys.add(event.id);
    }
    if (event.candidateId === p.manifest?.finalCandidateId && ['candidate.saved','test.completed','visual.review','run.finished'].includes(event.type)) keys.add(event.id);
  }
  const failed = events.find(event => eventStatus(event) === 'failed');
  if (failed) keys.add(failed.id);
  if (events.length) keys.add(events.at(-1).id);
  return events.map(event => ({id:event.id, kind:eventKind(event), label:eventLabel(event.type),
    summary:eventSummary(event).replace(/\s+/g, ' ').slice(0,190), ordinal:event.seq,
    status:eventStatus(event), statusLabel:event.type === 'command.completed' ? (event.details?.exitCode === 0 ? 'Process exited 0' : event.details?.exitCode == null ? 'Exit unknown' : 'Process failed') : undefined,
    isKey:keys.has(event.id)}));
}
