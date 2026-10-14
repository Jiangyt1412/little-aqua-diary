// # 验证容易遗漏的发布错误，不依赖 GitHub 或用户浏览器的数据。
import test from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, validateRelease } from '../scripts/release-validation.mjs';
const fixture = () => ({ version: '1.3.0', appVersion: '1.3.0', htmlVersion: '1.3.0', previousVersion: '1.2.0', readme: 'Version 1.3.0\n## 本次更新 · v1.3.0', changelog: '## [1.3.0] - 2026-10-14\n### 更新内容\n- 新增部署。\n### 验证\n- 已完成实际检查。\n' });
test('版本按数值比较，补丁和次版本均可递增', () => { assert.equal(compareVersions('1.10.0', '1.9.9'), 1); assert.equal(compareVersions('1.3.1', '1.3.0'), 1); assert.doesNotThrow(() => validateRelease(fixture())); });
test('拒绝遗漏升级、版本漂移和无效版本号', () => { assert.throws(() => validateRelease({ ...fixture(), previousVersion: '1.3.0' }), /必须高于/); assert.throws(() => validateRelease({ ...fixture(), htmlVersion: '1.2.0' }), /不一致/); assert.throws(() => compareVersions('1.03.0', '1.2.0'), /MAJOR/); });
test('拒绝漏写最新变更或验证，并保留旧版本历史', () => { const f = fixture(); assert.throws(() => validateRelease({ ...f, changelog: f.changelog.replace('### 验证', '### 计划') }), /实际验证/); assert.throws(() => validateRelease({ ...f, readme: f.readme.replace('## 本次更新', '## 使用') }), /本次更新/); assert.doesNotThrow(() => validateRelease({ ...f, changelog: f.changelog + '\n## [1.2.0] - 2026-10-14\n历史变更\n' })); });
