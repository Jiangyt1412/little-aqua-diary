// # 仅识别从未编辑的旧默认配置；SHA-256 完整匹配之外的数据保留。
const STARTER_HASHES = new Set(["1e29432a7d73e94cd710149e3597c699350cae4e90d23d3b48b51ee3e025f8d9","291162feed5f1481bd1486a72396267d798d093193f2ce7ae9cdde4238e61c17"]);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export async function isUntouchedStarter(data) {
  if (data.revision !== 0 || data.records.length || data.settings.reminders.length || !globalThis.crypto?.subtle) return false;
  const bytes = new TextEncoder().encode(JSON.stringify(canonical(data)));
  let digest; try { digest = await crypto.subtle.digest('SHA-256', bytes); } catch { return false; }
  const hash = [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  return STARTER_HASHES.has(hash);
}
