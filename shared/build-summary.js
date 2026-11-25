// Shared by the library and harness pages. Missing observations are never zero.
export const exhibited = items => items.filter(c => c.exhibit !== false);
export function modelNames(c) {
  const names = (c.build?.usage?.models || c.build?.models || []).map(m => m.model).filter(Boolean);
  return names.length ? [...new Set(names)] : [c.build?.model || 'Not recorded'];
}
export function intervals(items) {
  const found = new Map();
  for (const c of items) {
    const b = c.build;
    if (!b) continue;
    const key = b.runId || b.evidenceSha256;
    if (!key) continue;
    if (!found.has(key)) found.set(key, {id:key, usage:b.usage || {
      elapsedMs:b.elapsedMs, runtime:b.runtime,
      models:b.models?.length ? b.models : [{model:b.model, reasoningEffort:b.reasoningEffort, tokens:b.tokens}],
      observedTokens:b.tokens, status:b.usageStatus, scopeComplete:false
    }, cases:[], skillIds:[]});
    const row = found.get(key);
    row.cases.push(c);
    row.skillIds.push(...c.skillIds);
  }
  return [...found.values()];
}
export function aggregate(items) {
  const rows = intervals(items);
  const sum = key => {
    const values = rows.map(r => key === 'elapsedMs' ? r.usage.elapsedMs : r.usage.observedTokens?.total_tokens).filter(Number.isFinite);
    return {value:values.length ? values.reduce((a,b) => a+b, 0) : null, coverage:values.length};
  };
  return {rows, time:sum('elapsedMs'), tokens:sum('tokens')};
}
