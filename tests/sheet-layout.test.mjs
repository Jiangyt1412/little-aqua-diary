// # 键盘、浏览器平移和缩放的视口边界，不依赖真实设备的私有键盘接口。
import test from'node:test';import assert from'node:assert/strict';
import{sheetViewport}from'../dist/js/sheet-layout.js';
test('键盘只缩小可见区域时计算正确的底部遮挡',()=>{const r=sheetViewport({height:844,visualHeight:420,offsetTop:36,baselineHeight:844,focused:true,coarse:true});assert.equal(r.bottom,388);assert.equal(r.height,420);assert.equal(r.keyboard,true);});
test('浏览器同时缩小布局视口时仍识别输入状态',()=>{const r=sheetViewport({height:420,visualHeight:420,baselineHeight:844,focused:true,coarse:true});assert.equal(r.bottom,0);assert.equal(r.keyboard,true);});
test('缩放或没有编辑焦点的窗口调整不误判为键盘',()=>{assert.equal(sheetViewport({height:844,visualHeight:420,scale:2,focused:true,coarse:true}).keyboard,false);assert.equal(sheetViewport({height:420,baselineHeight:844,coarse:true}).keyboard,false);assert.equal(sheetViewport({height:420,baselineHeight:844,focused:true,coarse:false}).keyboard,false);});
test('恢复完整视口和不存在 VisualViewport 时保留正常布局',()=>{assert.deepEqual(sheetViewport({height:844}),{height:844,top:0,bottom:0,keyboard:false});assert.equal(sheetViewport({height:844,visualHeight:844,focused:true,coarse:true}).keyboard,false);});
