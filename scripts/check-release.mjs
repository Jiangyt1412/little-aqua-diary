// # 本地与 GitHub Actions 共用检查；不会触碰浏览器记录或照片数据库。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { APP_VERSION } from '../dist/js/version.js';
import { validateRelease } from './release-validation.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFile(path.join(root, name), 'utf8');
const metadata = JSON.parse(await read('package.json'));
const readme = await read('README.md');
const changelog = await read('CHANGELOG.md');
const htmlVersion = (await read('dist/index.html')).match(/name="application-version" content="([^"]+)"/)?.[1];
const base = process.env.RELEASE_BASE || '';
let previousVersion;
if (base && !/^0+$/.test(base)) {
  if (!/^[a-f0-9]{40}$/.test(base)) throw new Error('发布基准必须是 Git 提交 SHA');
  previousVersion = JSON.parse(execFileSync('git', ['show', `${base}:package.json`], { cwd: root, encoding: 'utf8' })).version;
}
validateRelease({ version: metadata.version, appVersion: APP_VERSION, htmlVersion, readme, changelog, previousVersion });
for (const name of ['cover', 'phone-home', 'phone-tank', 'phone-residents']) {
  const relative = `dist/media/${name}-v${APP_VERSION}.jpg`;
  const bytes = await fs.readFile(path.join(root, relative));
  if (bytes.length < 1000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`演示截图缺失或不是 JPEG：${relative}`);
  if (!readme.includes(relative)) throw new Error(`README 未包含当前截图：${relative}`);
}
const video = `dist/media/demo-v${APP_VERSION}.mp4`;
const movie = await fs.readFile(path.join(root, video));
if (movie.length < 1000 || movie.subarray(4, 8).toString() !== 'ftyp') throw new Error('当前版本的 MP4 演示视频缺失或无效');
if (!readme.includes(video)) throw new Error('README 未包含当前视频入口');
for (const filename of ['dist/intro.html', 'dist/intro.css', 'dist/js/intro.js', 'dist/.nojekyll', 'AGENTS.md', '.github/workflows/pages.yml']) await fs.access(path.join(root, filename));
console.log(`Release v${APP_VERSION} OK: versions, changelog, screenshots and MP4 demo`);
