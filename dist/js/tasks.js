// # 提醒按设备本地日期重复；只显示 App 内待办，日历文件是独立快照。
const dayKey = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayNumber = date => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
const addDays = (date, days) => { const next = new Date(date); next.setDate(next.getDate() + days); return next; };
export function validDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return Number.isFinite(date.getTime()) && dayKey(date) === value;
}
export function taskState(data, rule, now = new Date()) {
  const clock = rule.time || '08:00';
  const resumeAt = rule.status === 'paused' && rule.pauseUntil ? new Date(`${rule.pauseUntil}T${clock}:00`) : null;
  if (rule.status === 'paused' && (!resumeAt || now < resumeAt)) return { ...rule, state: 'paused', resumeAt, nextDue: null, completed: false };
  // # 定时暂停到期后按恢复日重新起算，不补出暂停期间的任务；不依赖后台计时器。
  const autoResumed = !!resumeAt;
  const records = data.records.filter(r => r.containerId === rule.containerId && r.type === rule.type && (!r.reminderId || r.reminderId === rule.id) && Date.parse(r.timestamp) <= now.getTime() && (!resumeAt || dayNumber(new Date(r.timestamp)) >= dayNumber(resumeAt)));
  let anchor = resumeAt || new Date(`${rule.startDate || (rule.createdAt ? dayKey(new Date(rule.createdAt)) : dayKey(now))}T${clock}:00`);
  // # 旧版只有间隔天数的提醒继续从最近维护记录计算。
  if (!resumeAt && !rule.startDate && !rule.createdAt && records.length) {
    const last = [...records].sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];
    anchor = addDays(new Date(`${dayKey(new Date(last.timestamp))}T${clock}:00`), rule.days);
  }
  const cycle = Math.max(0, Math.floor((dayNumber(now) - dayNumber(anchor)) / rule.days));
  let occurrence = addDays(anchor, cycle * rule.days);
  const earlyDone = records.some(r => r.reminderId === rule.id && dayKey(new Date(r.timestamp)) === dayKey(occurrence));
  if (occurrence > now && !earlyDone && cycle > 0) occurrence = addDays(occurrence, -rule.days);
  const completed = earlyDone || records.some(r => Date.parse(r.timestamp) >= occurrence.getTime());
  const nextDue = completed ? addDays(occurrence, rule.days) : occurrence;
  return { ...rule, status: 'active', state: nextDue <= now ? 'due' : 'upcoming', nextDue, completed, autoResumed };
}
export function taskStates(data, now = new Date()) {
  return data.settings.reminders.map(rule => taskState(data, rule, now)).sort((a, b) => {
    if (a.state === 'paused') return b.state === 'paused' ? 0 : 1;
    if (b.state === 'paused') return -1;
    return a.nextDue - b.nextDue;
  });
}
export function pauseResumeDate(length, value = '', now = new Date()) {
  if (length === 'manual') return '';
  const date = length === 'date' ? value : ['1', '3', '7'].includes(String(length)) ? dayKey(addDays(now, Number(length))) : '';
  if (!validDay(date) || date <= dayKey(now)) throw new Error('恢复日期请选择明天或之后。');
  return date;
}
export function pauseTask(data, id, reason = '', now = new Date(), until = '') {
  const rule = data.settings.reminders.find(r => r.id === id); if (!rule) throw new Error('这个提醒已被移除。');
  if (until && (!validDay(until) || until <= dayKey(now))) throw new Error('恢复日期请选择明天或之后。');
  rule.status = 'paused'; rule.pauseReason = String(reason).trim(); rule.pausedAt = now.toISOString(); rule.updatedAt = now.toISOString();
  if (until) rule.pauseUntil = until; else delete rule.pauseUntil;
}
export function resumeTask(data, id, now = new Date()) {
  const rule = data.settings.reminders.find(r => r.id === id); if (!rule) throw new Error('这个提醒已被移除。');
  rule.status = 'active'; rule.startDate = dayKey(now); rule.updatedAt = now.toISOString();
  delete rule.pauseUntil;
  // # 恢复不清除上次暂停原因，用户仍可查看或编辑。
}
const calendarText = value => String(value ?? '').replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
function foldLine(line) {
  const encoder = new TextEncoder(); const chunks = []; let part = '', length = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (length + size > 75) { chunks.push(part); part = ' '; length = 1; }
    part += char; length += size;
  }
  chunks.push(part); return chunks.join('\r\n');
}
const floating = date => `${dayKey(date).replaceAll('-', '')}T${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}00`;
export function tasksCalendar(data, labels, now = new Date()) {
  const active = data.settings.reminders.filter(rule => rule.status !== 'paused' || rule.pauseUntil);
  if (!active.length) throw new Error('没有正在运行的提醒。');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Little Aqua Diary//Care Tasks//ZH', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:水族维护'];
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  for (const rule of active) {
    const container = data.containers.find(c => c.id === rule.containerId); if (!container) continue;
    const title = `${container.name} · ${rule.title || labels[rule.type]?.label || rule.type}`;
    const task = taskState(data, rule, now), start = task.nextDue || task.resumeAt;
    const end = new Date(start.getTime() + 5 * 60000);
    lines.push('BEGIN:VEVENT', `UID:task-${encodeURIComponent(rule.id)}@little-aqua-diary`, `DTSTAMP:${stamp}`, `DTSTART:${floating(start)}`, `DTEND:${floating(end)}`, `RRULE:FREQ=DAILY;INTERVAL=${rule.days}`, `SUMMARY:${calendarText(title)}`, 'DESCRIPTION:从水族日记导出的提醒快照。暂停或修改 App 任务后需手动修改日历。', 'STATUS:CONFIRMED', 'BEGIN:VALARM', 'ACTION:DISPLAY', 'TRIGGER:PT0S', `DESCRIPTION:${calendarText(title)}`, 'END:VALARM', 'END:VEVENT');
  }
  lines.push('END:VCALENDAR'); return lines.map(foldLine).join('\r\n') + '\r\n';
}
