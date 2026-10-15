// # 本地与 GitHub Actions 共用检查；不会触碰浏览器记录或照片数据库。
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { APP_VERSION, RELEASE_DATE, RELEASE_NOTES } from '../dist/js/version.js';
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
for (const name of ['cover', 'phone-home', 'phone-tank', 'phone-residents', 'phone-avatar']) {
  const relative = `dist/media/${name}-v${APP_VERSION}.jpg`;
  const bytes = await fs.readFile(path.join(root, relative));
  if (bytes.length < 1000 || bytes[0] !== 0xff || bytes[1] !== 0xd8) throw new Error(`演示截图缺失或不是 JPEG：${relative}`);
  if (!readme.includes(relative)) throw new Error(`README 未包含当前截图：${relative}`);
}
const video = `dist/media/demo-v${APP_VERSION}.mp4`;
const movie = await fs.readFile(path.join(root, video));
if (movie.length < 1000 || movie.subarray(4, 8).toString() !== 'ftyp') throw new Error('当前版本的 MP4 演示视频缺失或无效');
if (!readme.includes(video)) throw new Error('README 未包含当前视频入口');
// # 像素海报、缓存版本与安装资源一起校验，避免界面发布了但手机仍加载旧应用壳。
const poster = `dist/media/pixel-library-v${APP_VERSION}.png`;
const posterBytes = await fs.readFile(path.join(root, poster));
if (posterBytes.length < 1000 || !posterBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error('当前版本的像素海报缺失或不是 PNG');
if (!readme.includes(poster)) throw new Error('README 未包含当前像素海报');
const intro = await read('dist/intro.html');
const introVersions = [...intro.matchAll(/data-version>v([^<]+)/g)].map(match => match[1]);
if (!introVersions.length || introVersions.some(version => version !== APP_VERSION)) throw new Error('项目简介版本不一致');
if (!(await read('dist/sw.js')).includes('`${CACHE_PREFIX}v' + APP_VERSION + '`')) throw new Error('离线缓存版本未同步');
if (!(await read('dist/sw.js')).includes("const VERSION = '" + APP_VERSION + "'")) throw new Error('缓存回复的更新版本未同步');
const release = JSON.parse(await read('dist/release.json'));
if (release.version !== APP_VERSION || release.date !== RELEASE_DATE || JSON.stringify(release.notes) !== JSON.stringify(RELEASE_NOTES)) throw new Error('App 检查更新使用的发布信息不一致');
const manifest = JSON.parse(await read('dist/manifest.webmanifest'));
if (manifest.scope !== './' || manifest.start_url !== './#home' || manifest.display !== 'standalone') throw new Error('主屏幕安装路径无效');
for (const [filename, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  const bytes = await fs.readFile(path.join(root, 'dist', filename));
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) || bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size) throw new Error(`安装图标尺寸无效：${filename}`);
}
for (const filename of ['dist/studio.css', 'dist/js/pwa.js', 'dist/js/updates.js', 'dist/js/pets.js', 'dist/js/avatar-crop.js', 'dist/js/species.js', 'dist/js/sortable.js', 'dist/js/habitats.js', 'dist/js/tasks.js']) await fs.access(path.join(root, filename));
for (const filename of ['dist/intro.html', 'dist/intro.css', 'dist/js/intro.js', 'dist/.nojekyll', 'AGENTS.md', '.github/workflows/pages.yml']) await fs.access(path.join(root, filename));
console.log(`Release v${APP_VERSION} OK: versions, changelog, screenshots, pixel poster, MP4 demo and PWA resources`);
