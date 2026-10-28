// # 时间、记录摘要、筛选与统计独立于界面；日期按使用者设备本地时区处理。
import { TYPES, WATER_FIELDS } from './data.js';
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const localDate = (value = new Date()) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const localDateTime = value => {
  const d = value ? new Date(value) : new Date();
  return `${localDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
export const timeLabel = value => new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
export const dayLabel = value => new Date(value).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
export const newestFirst = (a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp) || Date.parse(b.createdAt) - Date.parse(a.createdAt); // # 同一分钟内使用创建时间区分先后。
export function daysSince(value, now = new Date()) {
  const d = new Date(value);
  return Math.round((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())) / 86400000);
}
export function relativeTime(value, now = new Date()) {
  if (!value) return '暂无记录';
  const days = daysSince(value, now);
  if (days < 0) return `${localDate(value)}（未来）`;
  if (days === 0) return `今天 ${timeLabel(value)}`;
  if (days === 1) return '昨天';
  return `${days} 天前`;
}
export function latestRecord(data, containerId, type) {
  return data.records.filter(r => r.containerId === containerId && r.type === type).sort(newestFirst)[0];
}
export function recordSummary(record) {
  const d = record.details || {};
  switch (record.type) {
    case 'feed': return [d.food, d.amount].filter(Boolean).join(' · ');
    case 'water': return [d.liters ? `${d.liters} L` : '', d.percent ? `${d.percent}%` : ''].filter(Boolean).join(' / ');
    case 'topup': return d.liters ? `${d.liters} L` : '';
    case 'siphon': return [d.area, d.withWater ? '同时换水' : ''].filter(Boolean).join(' · ');
    case 'test': return WATER_FIELDS.filter(([key]) => d[key] !== undefined && d[key] !== '').map(([key, label, unit]) => `${label} ${d[key]}${unit ? ` ${unit}` : ''}`).join(' · ');
    case 'death': return `${d.species || '生物'} · 死亡 ${d.quantity || ''} 只${d.cause ? ' · ' + d.cause : ''}`;
    case 'add': return [d.species, d.quantity, d.length, d.source ? `来自 ${d.source}` : ''].filter(Boolean).join(' · ');
    case 'medication': case 'salt': return [d.category, d.name, d.dose].filter(Boolean).join(' · ');
    case 'equipment': return [d.task, d.detail].filter(Boolean).join(' · ') || '完成设备维护';
    case 'observe': return d.text || record.notes || '';
    default: return d.title || '自定义事件';
  }
}
export function filterRecords(data, filters) {
  const names = Object.fromEntries(data.containers.map(c => [c.id, c.name]));
  const query = (filters.search || '').trim().toLowerCase();
  return data.records.filter(r => {
    if (filters.container && filters.container !== r.containerId) return false;
    if (filters.type && filters.type !== r.type) return false;
    const date = localDate(r.timestamp);
    if (filters.from && date < filters.from) return false;
    if (filters.to && date > filters.to) return false;
    return !query || [names[r.containerId], TYPES[r.type]?.label, recordSummary(r), r.notes, JSON.stringify(r.details)].join(' ').toLowerCase().includes(query);
  }).sort(newestFirst);
}
export function statistics(data, now = new Date()) {
  const today = localDate(now);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - (weekStart.getDay() + 6) % 7);
  const week = data.records.filter(r => new Date(r.timestamp) >= weekStart && new Date(r.timestamp) <= now);
  return { today: data.records.filter(r => localDate(r.timestamp) === today).length, weekWater: week.filter(r => r.type === 'water').length, weekFeed: week.filter(r => r.type === 'feed').length, tests: data.records.filter(r => r.type === 'test').length, total: data.records.length };
}
export function reminders(data, now = new Date()) {
  return data.settings.reminders.map(rule => {
    const last = latestRecord(data, rule.containerId, rule.type);
    return { ...rule, last, elapsed: last ? daysSince(last.timestamp, now) : null };
  }).filter(rule => rule.elapsed === null || rule.elapsed >= rule.days);
}

// # 月历只表示实际喂食记录，不把未记录的日期判断为未喂食。
export function shiftMonth(month, offset) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + offset);
  return localDate(date).slice(0, 7);
}
export const CARE_TYPES = ['feed', 'siphon', 'topup', 'water'];
export function careMonth(data, containerId, month) {
  const [year, value] = month.split('-').map(Number);
  const first = new Date(year, value - 1, 1), totalDays = new Date(year, value, 0).getDate();
  const leading = (first.getDay() + 6) % 7;
  const records = filterRecords(data, { container: containerId, from: `${month}-01`, to: `${month}-${totalDays}` });
  const byDay = new Map();
  records.forEach(r => { const day = localDate(r.timestamp); if (!byDay.has(day)) byDay.set(day, []); byDay.get(day).push(r); });
  const days = Array.from({ length: totalDays }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`, items = byDay.get(date) || [];
    const counts = Object.fromEntries(CARE_TYPES.map(type => [type, items.filter(r => r.type === type).length]));
    return { date, day: i + 1, counts, feedCount: counts.feed, careCount: Object.values(counts).reduce((n,value)=>n+value,0), records: items };
  });
  return { year, month: value, leading, days, records, counts: Object.fromEntries(CARE_TYPES.map(type=>[type,records.filter(r=>r.type===type).length])), feedCount: records.filter(r => r.type === 'feed').length, feedDays: days.filter(d => d.feedCount).length, waterCount: records.filter(r => r.type === 'water').length, observeCount: records.filter(r => r.type === 'observe').length };
}
// # 保留旧调用名称，月历现在统一统计四种维护。
export const feedingMonth = careMonth;

// # CSV 使用 UTF-8 BOM、双引号转义与公式注入防护，保留每一种记录的详情。
export function csvText(data) {
  const names = Object.fromEntries(data.containers.map(c => [c.id, c.name]));
  const cell = value => {
    let v = String(value ?? '');
    if (/^[\s]*[=+\-@]/.test(v) || /^[\t\r\n]/.test(v)) v = `'${v}`;
    return `"${v.replace(/"/g, '""')}"`;
  };
  const rows = [['记录ID', '容器', '类型', '本地日期时间', 'ISO时间', '摘要', '备注', '详情JSON', '照片数', '创建时间', '修改时间']];
  [...data.records].sort(newestFirst).forEach(r => rows.push([r.id, names[r.containerId], TYPES[r.type].label, localDateTime(r.timestamp).replace('T', ' '), r.timestamp, recordSummary(r), r.notes, JSON.stringify(r.details), r.photoIds?.length || 0, r.createdAt, r.updatedAt]));
  return '\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n');
}
export function downloadFile(name, contents, mime = 'application/json') {
  const blob = new Blob([contents], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name;
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
}
