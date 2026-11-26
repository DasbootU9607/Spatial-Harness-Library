'use strict';

// Public build records retain order and duration, never absolute activity times.
// Private collection and source evidence are outside this projection.
const timeField = /^(?:at|timestamp|time_stamp|(?:created|recorded|started|finished|lastObserved|updated|captured|sent|completed|observed|checked|generated)(?:At|_at)|(?:start|end|creation|modification)Time|mtimeMs|ctimeMs|birthtimeMs)$/i;
const clockPattern = '\\b(?:\\d{4}-\\d{2}-\\d{2}(?:[T ]\\d{2}:\\d{2}(?::\\d{2}(?:\\.\\d+)?)?(?:Z|[+-]\\d{2}:?\\d{2})?)?|(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?)\\b';
const hasAbsoluteTime = value => new RegExp(clockPattern, 'i').test(String(value));
function withoutAbsoluteTimes(value) {
  if (typeof value === 'string') return value.replace(new RegExp(clockPattern, 'gi'), '[absolute time omitted]');
  if (Array.isArray(value)) return value.filter(item => !(item && typeof item === 'object' && typeof item.label === 'string' && typeof item.value === 'string' && hasAbsoluteTime(item.value))).map(withoutAbsoluteTimes);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).filter(([key]) => !timeField.test(key)).map(([key, child]) => [key, withoutAbsoluteTimes(child)]));
  return value;
}
function assertNoAbsoluteTimes(value) {
  if (hasAbsoluteTime(JSON.stringify(value))) throw new Error('Absolute activity time in public build data');
  const visit = item => {
    if (!item || typeof item !== 'object') return;
    for (const [key, child] of Object.entries(item)) {
      if (timeField.test(key)) throw new Error('Private time field in public build data: ' + key);
      visit(child);
    }
  };
  visit(value);
}
module.exports = {withoutAbsoluteTimes, assertNoAbsoluteTimes, hasAbsoluteTime};
