// # 裁剪边界和备份保护影响照片安全；测试不同画幅、旋转与非法引用。
import test from 'node:test';
import assert from 'node:assert/strict';
import { cropGeometry } from '../dist/js/avatar-crop.js';
import { seedData, validateData } from '../dist/js/data.js';
import { referencedPhotos } from '../dist/js/media.js';
function diary(member = {}) {
  const data = seedData(); data.containers.push({ id: 'tank', name: '测试缸', type: 'tank' });
  data.animals.push({ id: 'fish', containerId: 'tank', species: '孔雀鱼', countType: 'exact', countValue: '1',
    members: [{ id: 'member', name: '小鱼', avatarId: 'avatar', ...member }] });
  return data;
}
test('横幅和竖幅裁剪能移动到边缘，并始终用照片填满方形头像', () => {
  for (const [w, h] of [[1600, 400], [400, 1600], [480, 480], [17, 1]]) {
    for (const rotation of [0, 90, 180, 270]) for (const zoom of [1, 2.5, 6]) for (const corner of [0, 1]) {
      const g = cropGeometry(w, h, { x: corner, y: 1 - corner, zoom, rotation });
      const half = 480 / (2 * g.scale), epsilon = 1e-8;
      assert.ok(g.cx - half >= -epsilon && g.cx + half <= g.w + epsilon);
      assert.ok(g.cy - half >= -epsilon && g.cy + half <= g.h + epsilon);
    }
  }
  assert.equal(cropGeometry(800, 400, {x:0}).crop.x, .25);
  assert.equal(cropGeometry(800, 400, {x:1}).crop.x, .75);
  assert.equal(cropGeometry(400, 800, {y:0}).crop.y, .25);
});
test('裁剪坐标在手机预览与 480 px 输出间保持相同取景', () => {
  const state = {x:.7,y:.4,zoom:2.8,rotation:90};
  const small = cropGeometry(1920, 1080, state, 280), large = cropGeometry(1920, 1080, state, 480);
  assert.deepEqual(small.crop, large.crop);
  assert.ok(Math.abs(small.scale / large.scale - 280 / 480) < 1e-12);
});
test('非法尺寸拒绝裁剪，缩放和坐标不会产生无穷值或空白边缘', () => {
  for (const value of [0,-1,NaN,Infinity]) assert.throws(()=>cropGeometry(value,480),/尺寸/);
  const g = cropGeometry(800, 400, {x:NaN,y:Infinity,zoom:Infinity,rotation:45});
  assert.deepEqual(g.crop,{x:.5,y:.5,zoom:1,rotation:0});
  assert.equal(cropGeometry(800,400,{zoom:99}).crop.zoom,6);
  assert.equal(cropGeometry(800,400,{zoom:-9}).crop.zoom,1);
});
test('头像完整取景和裁剪参数随 JSON 保留，旧头像资料仍可读', () => {
  const data = diary({avatarSourceId:'source',avatarCrop:{x:.7,y:.5,zoom:2,rotation:90}});
  assert.deepEqual(validateData(JSON.parse(JSON.stringify(data))),data);
  assert.doesNotThrow(()=>validateData(diary()));
  assert.deepEqual(referencedPhotos(data),['avatar','source']);
  data.animals[0].members.push({id:'second',avatarId:'avatar',avatarSourceId:'source'});
  assert.deepEqual(referencedPhotos(data),['avatar','source']);
});
test('备份拒绝无效头像原图与裁剪参数，不接受丢失头像的原图引用', () => {
  for (const value of ['bad/path', 'javascript:alert(1)', 'a'.repeat(151)]) assert.throws(()=>validateData(diary({avatarSourceId:value})),/原图引用/);
  assert.throws(()=>validateData(diary({avatarId:'',avatarSourceId:'source'})),/原图引用/);
  const valid = {x:.5,y:.5,zoom:1,rotation:0};
  for (const change of [{x:-.1},{y:1.1},{zoom:.9},{zoom:7},{rotation:45},{x:'0.5'},{rotation:Infinity}]) {
    assert.throws(()=>validateData(diary({avatarSourceId:'source',avatarCrop:{...valid,...change}})),/裁剪参数/);
  }
  assert.throws(()=>validateData(diary({avatarCrop:valid})),/裁剪参数/);
});
