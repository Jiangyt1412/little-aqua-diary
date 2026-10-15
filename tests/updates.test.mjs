// # 验证网络发布信息、版本比较与转义；真实缓存替换和照片保留另用浏览器验证。
import test from 'node:test';
import assert from 'node:assert/strict';
import { compareAppVersions, validateReleaseInfo, fetchLatestRelease } from '../dist/js/updates.js';
import { updatePanel } from '../dist/js/ui.js';
import { APP_VERSION } from '../dist/js/version.js';
const release = (version = APP_VERSION) => ({ version, date: '2026-10-15', notes: [['形象更新', '金黄身体、圆腹与红鳃。']] });

test('版本按数字比较，不把 1.10 当成旧版，并拒绝无效/超限版本', () => {
  assert.equal(compareAppVersions('1.10.0','1.9.9'),1); assert.equal(compareAppVersions('1.4.1','1.4.1'),0); assert.equal(compareAppVersions('1.3.9','1.4.0'),-1);
  for(const version of ['1.04.1','1.4','v1.4.1','999999999999999999.1.0']) assert.throws(()=>compareAppVersions(version,'1.4.1'));
});
test('发布信息校验日期、条数和文字，并丢弃外部跳转等无关字段', () => {
  const raw = {...release(), redirect:'javascript:bad()'}, clean = validateReleaseInfo(raw);
  raw.notes[0][0] = '后来改动'; assert.equal(clean.notes[0][0],'形象更新'); assert.equal(clean.redirect,undefined);
  for(const bad of [{...release(),date:'2026-02-30'},{...release(),notes:Array.from({length:11},()=>['a','b'])},{...release(),notes:[['title',42]]}]) assert.throws(()=>validateReleaseInfo(bad));
});
test('检查发布信息兼容 Pages 子路径，绕过缓存，不读取私人日记', async () => {
  let requested;
  const result = await fetchLatestRelease({baseUrl:'https://example.test/little-aqua-diary/#home',fetcher:async(url,options)=>{requested={url,options};return new Response(JSON.stringify(release()));}});
  const url = new URL(requested.url); assert.equal(url.pathname,'/little-aqua-diary/release.json'); assert.ok(url.searchParams.get('check')); assert.equal(requested.options.cache,'no-store'); assert.equal(requested.options.headers.Accept,'application/json'); assert.deepEqual(result,release());
});
test('断网、失败响应和损坏发布信息不能被当成最新版本', async () => {
  await assert.rejects(fetchLatestRelease({fetcher:async()=>{throw new TypeError('network failed');}}),/无法联网检查/);
  await assert.rejects(fetchLatestRelease({fetcher:async()=>new Response('',{status:404})}),/暂不可用/);
  await assert.rejects(fetchLatestRelease({fetcher:async()=>new Response('<html>') }),/无效/);
  await assert.rejects(fetchLatestRelease({fetcher:async()=>new Response('x'.repeat(20001))}),/无效/);
});
test('检查超时可重试，不留下无期限挂起的版本检查', async () => {
  await assert.rejects(fetchLatestRelease({timeoutMs:8,fetcher:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError'))))}),/无法联网检查/);
});
test('更新说明安全显示，只有较新版本才出现安装按钮，禁止降级', () => {
  const parts = APP_VERSION.split('.').map(Number); parts[2] += 1;
  const next = {...release(parts.join('.')), notes:[['<img src=x onerror=bad()>','<script>bad()</script>']]};
  const html = updatePanel({phase:'checked',latest:next}); assert.match(html,/data-action="install-update"/); assert.ok(!html.includes('<script>')); assert.ok(!html.includes('<img src=x')); assert.match(html,/&lt;script&gt;/);
  assert.ok(!updatePanel({latest:release(APP_VERSION)}).includes('data-action="install-update"'));
  assert.ok(!updatePanel({latest:release('1.0.0')}).includes('data-action="install-update"'));
  assert.match(updatePanel({error:'无法联网检查'}),/无法联网检查/);
});
