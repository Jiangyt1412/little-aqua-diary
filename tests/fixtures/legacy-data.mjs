// # v1.3.1 旧格式演示配置，仅用于兼容性测试；不进入网页初始数据。
export function legacySeedData() {
  return {
    schemaVersion: 1,
    gobyGroupMergeVersion: 1,
    revision: 0,
    containers: [
      { id: 'turtle', name: '龟鱼缸', dimensions: '60 × 40 × 34 cm', estimatedVolume: '', type: 'tank', art: 'turtle', notes: '' },
      { id: 'goby', name: '鲫鱼 / 虾虎鱼缸', dimensions: '50 × 27 × 30 cm', estimatedVolume: '', type: 'tank', art: 'goby', notes: '' },
      { id: 'parrot', name: '鹦鹉鱼缸', dimensions: '48 × 28.9 × 31.3 cm', estimatedVolume: '', type: 'tank', art: 'parrot', notes: '' },
      { id: 'shrimp-a', name: '黑壳虾桶 A', dimensions: '', estimatedVolume: '约 12 L', type: 'bucket', art: 'shrimp', notes: '原来约 80 只，当前实际存活数量未知。' },
      { id: 'shrimp-b', name: '黑壳虾桶 B', dimensions: '', estimatedVolume: '约 12 L', type: 'bucket', art: 'shrimp', notes: '原来约 80 只，当前实际存活数量未知。' }
    ],
    animals: [
      { id: 'a1', containerId: 'turtle', species: '小青龟', displayName: '小青龟', icon: 'turtle', countType: 'exact', countValue: '1', length: '约 4 cm', notes: '' },
      { id: 'a2', containerId: 'turtle', species: '天使鱼', displayName: '天使鱼', icon: 'fish', countType: 'exact', countValue: '2', length: '约 4 / 3.5 cm', notes: '' },
      { id: 'a3', containerId: 'turtle', species: '黑壳虾', displayName: '黑壳虾', icon: 'shrimp', countType: 'range', countMin: 20, countMax: 30, countValue: '', length: '', notes: '' },
      { id: 'a4', containerId: 'goby', species: '鲫鱼', displayName: '鲫鱼', icon: 'fish', countType: 'exact', countValue: '2', length: '', notes: '' },
      { id: 'a5', containerId: 'goby', species: '虾虎鱼', displayName: '虾虎鱼', icon: 'fish', countType: 'exact', countValue: '2', length: '', notes: '原“虾虎鱼 / 沙塘鳢”个体的物种待确认。', uncertain: true, members: [
        { id: 'a5_member_1', name: '', length: '', avatarId: '' },
        { id: 'a6_member_1', name: '', length: '', avatarId: '' }
      ] },
      { id: 'a7', containerId: 'parrot', species: '鹦鹉鱼', displayName: '鹦鹉鱼', icon: 'fish', countType: 'exact', countValue: '2', length: '', notes: '' },
      { id: 'a8', containerId: 'parrot', species: '黑壳虾', displayName: '黑壳虾', icon: 'shrimp', countType: 'text', countValue: '少于 10 只', length: '', notes: '' },
      { id: 'a9', containerId: 'shrimp-a', species: '黑壳虾', displayName: '黑壳虾', icon: 'shrimp', countType: 'unknown', countValue: '存活数量待重新统计', length: '', notes: '原来约 80 只；当前数量未知。' },
      { id: 'a10', containerId: 'shrimp-b', species: '黑壳虾', displayName: '黑壳虾', icon: 'shrimp', countType: 'unknown', countValue: '存活数量待重新统计', length: '', notes: '原来约 80 只；当前数量未知。' }
    ],
    records: [],
    settings: { theme: 'shore', animations: true, reminders: [], lastBackupAt: null }
  };
}
