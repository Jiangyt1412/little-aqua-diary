// # 发布检查负责发现漏升版本、文档不一致和缺失的演示素材。
export function compareVersions(left, right) {
  const parts = value => {
    if (!/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(value)) throw new Error(`版本号必须为 MAJOR.MINOR.PATCH：${value}`);
    const numbers = value.split('.').map(Number);
    if (!numbers.every(Number.isSafeInteger)) throw new Error('版本号超出安全整数范围');
    return numbers;
  };
  const a = parts(left), b = parts(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
export function validateRelease({ version, appVersion, htmlVersion, readme, changelog, previousVersion }) {
  compareVersions(version, version);
  if (version !== appVersion || version !== htmlVersion) throw new Error('package、应用版本和入口版本不一致');
  if (!readme.includes(`Version ${version}`) || !readme.includes(`## 本次更新 · v${version}`)) throw new Error('README 必须注明当前版本和本次更新');
  const latest = changelog.match(/^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})$/m);
  if (!latest || latest[1] !== version) throw new Error('CHANGELOG 最新版本不匹配或没有发布日期');
  const section = changelog.slice(latest.index + latest[0].length).split(/^## /m)[0];
  if (!/^### 更新内容$/m.test(section) || !/^### 验证$/m.test(section) || !/^- \S/m.test(section)) throw new Error('CHANGELOG 必须说明更新内容和实际验证');
  if (previousVersion && compareVersions(version, previousVersion) <= 0) throw new Error(`发布版本必须高于上次版本 ${previousVersion}`);
}
