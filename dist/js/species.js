// # 同名居民只合并展示，不合并原始名单、个体 ID 或数量联动记录。
import { shortCountLabel, membersFor } from './data.js';
import { livingAnimal, residentDeath, residentLosses } from './mortality.js';
import { PET_TEMPLATES, inferPetTemplate } from './pets.js';
const cleanName = value => String(value || '').trim().replace(/\s+/g, ' ');
const colorNames = new Set(PET_TEMPLATES.filter(p => p.id.startsWith('tetra-')).map(p => cleanName(p.species)));
const templateRanks = new Map(PET_TEMPLATES.map((p, index) => [p.id, index]));
const unique = values => [...new Set(values)];
export const memberSortKey = (animalId, memberId) => JSON.stringify([animalId, memberId]);
export function speciesName(animal) {
  const name = cleanName(animal.species);
  return animal.templateId?.startsWith('tetra-') && colorNames.has(name) ? '彩色鱼' : name;
}
const ordered = (items, preferred, key = item => item) => {
  const rank = new Map((preferred || []).map((value, index) => [value, index]));
  return [...items].sort((a, b) => (rank.get(key(a)) ?? Infinity) - (rank.get(key(b)) ?? Infinity));
};
export function speciesCount(animals) {
  if (animals.length === 1) return shortCountLabel(animals[0]);
  if (animals.some(a => !['exact', 'estimated', 'range'].includes(a.countType))) return '待统计';
  const min = animals.reduce((n, a) => n + (a.countType === 'range' ? a.countMin : Number(a.countValue)), 0);
  const max = animals.reduce((n, a) => n + (a.countType === 'range' ? a.countMax : Number(a.countValue)), 0);
  if (![min, max].every(Number.isSafeInteger)) return '待核对';
  const approximate = animals.some(a => a.countType === 'estimated') ? '约 ' : '';
  return `${approximate}×${min === max ? min : min + '–' + max}`;
}
export function speciesGroups(data, containerId) {
  const groups = new Map(), preferences = (data.settings.residentOrder || []).filter(entry => entry.containerId === containerId);
  for (const animal of data.animals.filter(a => a.containerId === containerId)) {
    const name = speciesName(animal);
    if (!groups.has(name)) groups.set(name, { key: name, name, containerId, animals: [], members: [], variants: [] });
    const group = groups.get(name), base = animal.templateId || inferPetTemplate(animal.species, animal.icon), members = membersFor(animal);
    group.animals.push(animal);
    for (const member of members) group.members.push({ animal, member, death: residentDeath(data,animal.id,member.id), templateId: member.templateId || base, key: memberSortKey(animal.id, member.id) });
    group.variants.push(...(members.length ? members.map(m => m.templateId || base) : [base]));
  }
  for (const group of groups.values()) {
    const preference = preferences.find(entry => entry.species === group.key);
    const defaults = unique(group.variants).sort((a, b) => (templateRanks.get(a) ?? Infinity) - (templateRanks.get(b) ?? Infinity));
    group.variants = ordered(defaults, preference?.variants);
    group.members.sort((a, b) => group.variants.indexOf(a.templateId) - group.variants.indexOf(b.templateId));
    group.members = ordered(group.members, preference?.members, item => item.key);
    group.deaths = data.records.filter(r=>r.type==='death' && group.animals.some(a=>a.id===r.details.animalId)); group.losses = group.animals.reduce((sum,a)=>sum+residentLosses(data,a.id),0); group.count = speciesCount(group.animals.map(a=>livingAnimal(data,a))); group.uncertain = group.animals.some(a => a.uncertain);
  }
  return ordered([...groups.values()], preferences.map(entry => entry.species), group => group.key);
}
export function saveResidentOrder(data, { kind, containerId, species, order }) {
  if (!Array.isArray(order) || new Set(order).size !== order.length || order.some(key => typeof key !== 'string')) throw new Error('排序内容无效。');
  const groups = speciesGroups(data, containerId);
  if (!data.containers.some(c => c.id === containerId)) throw new Error('这个缸已被移除。');
  const existing = data.settings.residentOrder || [], sameTank = existing.filter(entry => entry.containerId === containerId);
  const entries = groups.map(group => ({ ...(sameTank.find(entry => entry.species === group.key) || {}), containerId, species: group.key }));
  if (kind === 'species') {
    data.settings.residentOrder = [...existing.filter(entry => entry.containerId !== containerId), ...ordered(entries, order, entry => entry.species)];
    return;
  }
  const group = groups.find(group => group.key === species), entry = entries.find(entry => entry.species === species);
  if (!group || !entry) throw new Error('这个物种已有变化，请重新排序。');
  if (kind === 'variants') {
    entry.variants = ordered(group.variants, order);
    entry.members = [...group.members].sort((a, b) => entry.variants.indexOf(a.templateId) - entry.variants.indexOf(b.templateId)).map(item => item.key);
  } else if (kind === 'members') {
    const members = ordered(group.members, order, item => item.key);
    entry.members = members.map(item => item.key);
    entry.variants = unique([...members.map(item => item.templateId), ...group.variants]);
  } else throw new Error('排序类型无效。');
  data.settings.residentOrder = [...existing.filter(entry => entry.containerId !== containerId), ...entries];
}
export const CLEAN_RECORDS_COPY = '移除维护历史和观察照片；保留缸、居民名单、名字、头像、死亡登记、日记名称和提醒。提醒日期会重新计算。';
export const START_EMPTY_COPY = '从日记移除所有缸、居民、维护记录、头像、观察照片和提醒，日记名称与设置也恢复默认。';
