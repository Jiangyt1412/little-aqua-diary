// # 覆盖滚动方向与边界，防止内层到头后把手势交给背景。
import test from 'node:test';
import assert from 'node:assert/strict';
import { hasScrollRoom } from '../dist/js/dialog-layer.js';
test('滚动只在对应方向还有空间时接收，顶部和底部不向背景继续传递', () => {
  const box={size:200,extent:700};
  assert.equal(hasScrollRoom({...box,offset:0,delta:-30}),false);
  assert.equal(hasScrollRoom({...box,offset:0,delta:30}),true);
  assert.equal(hasScrollRoom({...box,offset:250,delta:-30}),true);
  assert.equal(hasScrollRoom({...box,offset:500,delta:30}),false);
  assert.equal(hasScrollRoom({...box,offset:500,delta:-30}),true);
});
test('没有溢出的窗口及零移动不接收滚动，弹性越界可向内容区返回', () => {
  assert.equal(hasScrollRoom({size:300,extent:300,offset:0,delta:20}),false);
  assert.equal(hasScrollRoom({size:300,extent:900,offset:200,delta:0}),false);
  assert.equal(hasScrollRoom({size:300,extent:900,offset:-8,delta:-20}),false);
  assert.equal(hasScrollRoom({size:300,extent:900,offset:-8,delta:20}),true);
  assert.equal(hasScrollRoom({size:300,extent:900,offset:610,delta:-20}),true);
});
