// # v1.3.1 合并原始名单中的两组；这是管理分组，不确认生物分类。
const normalize = value => String(value || '').replace(/\s/g, '');
const epoch = animal => animal.inventoryEpoch || 0;
const unknown = animal => ['unknown', 'text'].includes(animal.countType);
const bounds = animal => animal.countType === 'range' ? [animal.countMin, animal.countMax] : [Number(animal.countValue), Number(animal.countValue)];
const description = animal => animal.countType === 'range' ? `${animal.countMin}–${animal.countMax}` : String(animal.countValue || '待统计');

export function mergeLegacyGobyGroups(data, membersFor) {
  if (data.gobyGroupMergeVersion === 1) return data;
  data.gobyGroupMergeVersion = 1;
  const source = data.animals.find(a => a.id === 'a6' && ['虾虎鱼/沙塘鳢', '沙塘鳢'].includes(normalize(a.species)));
  if (!source) return data;
  const target = data.animals.find(a => a.id === 'a5' && normalize(a.species) === '虾虎鱼');
  // # 尊重已修改的物种、移动的容器和主动删除的目标组，不重新创建或移动居民。
  if (!target || source.containerId !== target.containerId) return data;
  const members = structuredClone(target.members || membersFor(target));
  const sourceMembers = structuredClone(source.members || membersFor(source));
  const nextEpoch = Math.max(epoch(target), epoch(source)) + 1;
  if (members.length + sourceMembers.length > 200 || !Number.isSafeInteger(nextEpoch)) return data;
  const merged = { ...target, species: '虾虎鱼', members, inventoryEpoch: nextEpoch };
  if (!target.displayName || normalize(target.displayName) === '虾虎鱼') merged.displayName = '虾虎鱼';
  const notes = [target.notes, source.notes ? `${source.species}：${source.notes}` : ''];
  if (unknown(target) || unknown(source)) {
    merged.countType = 'unknown'; merged.countValue = '总数待统计';
    notes.push(`合并前：${target.species} ${description(target)}；${source.species} ${description(source)}。`);
  } else {
    const [targetMin, targetMax] = bounds(target), [sourceMin, sourceMax] = bounds(source);
    const min = targetMin + sourceMin, max = targetMax + sourceMax;
    if (![min, max].every(Number.isSafeInteger)) return data;
    if ([target.countType, source.countType].includes('range')) {
      merged.countType = 'range'; merged.countMin = min; merged.countMax = max; merged.countValue = '';
    } else {
      merged.countType = target.countType === 'exact' && source.countType === 'exact' ? 'exact' : 'estimated';
      merged.countValue = String(max);
      if (merged.countType === 'exact' && members.length + sourceMembers.length > max) return data;
    }
  }
  merged.notes = notes.filter(Boolean).join('\n');
  if (merged.notes.length > 10000) return data;
  if (source.uncertain || target.uncertain) merged.uncertain = true;
  if (merged.countType !== 'range') { delete merged.countMin; delete merged.countMax; }
  const taken = new Set(members.map(m => m.id)), remapped = new Map();
  for (const [index, member] of sourceMembers.entries()) {
    const previousId = member.id;
    if (taken.has(member.id)) {
      let suffix = index + 1;
      do { member.id = `a6_merged_${suffix++}`; } while (taken.has(member.id));
    }
    taken.add(member.id); remapped.set(previousId, member.id); members.push(member);
  }
  const changes = [];
  let activeCredit = 0, base = 0;
  for (const animal of [target, source]) {
    const linked = data.records.filter(r => r.inventoryEffect?.animalId === animal.id);
    const active = linked.reduce((sum, r) => sum + (r.inventoryEffect.countingEpoch === epoch(animal) ? r.inventoryEffect.creditedQuantity : 0), 0);
    if (unknown(animal)) base += Math.max(animal.knownAddedBase || 0, (animal.knownAdded || 0) - active);
    for (const record of linked) {
      const effect = record.inventoryEffect;
      const credit = effect.countingEpoch === epoch(animal) ? effect.creditedQuantity : 0;
      activeCredit += credit;
      changes.push([record, { ...effect, animalId: target.id, countingEpoch: nextEpoch, creditedQuantity: credit,
        memberIds: animal.id === source.id ? effect.memberIds.map(id => remapped.get(id) || id) : [...effect.memberIds] }]);
    }
  }
  if (!Number.isSafeInteger(base + activeCredit)) return data;
  delete merged.knownAdded; delete merged.knownAddedBase;
  if (unknown(merged)) {
    if (base) merged.knownAddedBase = base;
    if (base + activeCredit) merged.knownAdded = base + activeCredit;
  }
  // # 保留历史物种文字、记录时间和照片；只迁移数量联动的内部引用。
  for (const [record, effect] of changes) record.inventoryEffect = effect;
  data.animals = data.animals.filter(a => a.id !== source.id).map(a => a.id === target.id ? merged : a);
  return data;
}
