<p align="center"><img src="dist/favicon.svg" width="56" alt="小小水族日记"></p>

<h1 align="center">小小水族日记</h1>

<p align="center">照顾好，也记录好。<br>给家里的鱼缸、龟缸和虾桶，一本随手可记的日记。</p>

<p align="center"><strong>Version 1.4.0</strong> · 2026-10-15<br><a href="https://jiangyt1412.github.io/little-aqua-diary/">打开日记</a> · <a href="https://jiangyt1412.github.io/little-aqua-diary/intro.html">项目简介</a> · <a href="CHANGELOG.md">更新记录</a></p>

![小小水族日记实际界面，演示数据](dist/media/cover-v1.4.0.jpg)

## 每天常用的，放在手边

- **随手记时间**：喂食、吸便、加水一点就记；换水可填升数或比例。
- **看看这个缸**：点进鱼缸，查看喂食月历与维护记录。
- **认识每一位居民**：改物种和数量，给非黑壳虾个体取名字、上传头像。
- **新增自动联动**：新增生物后，缸内名单与数量一起更新。
- **照片留住观察**：观察记录支持照片，历史支持关键词搜索。
- **备份带走日记**：导出包含记录、居民和照片的 JSON，换网址或手机时恢复。

主界面只有首页、记录、居民三个入口。缸景在创建与编辑缸时选择；提醒收在右上角，保持三个主入口。

## 看一段实际操作

[▶ 在线播放 v1.4.0 演示](https://jiangyt1412.github.io/little-aqua-diary/intro.html#demo) · [下载 MP4](dist/media/demo-v1.4.0.mp4)

视频展示从空白创建缸、选择孔雀鱼形象、个体命名与头像、提醒完成/暂停、日历导出、观察照片、搜索、月历和备份。简介页面使用原生视频播放器，可直接在手机播放。

<table>
  <tr>
    <td align="center"><img src="dist/media/phone-home-v1.4.0.jpg" width="260" alt="首页，一键记录"><br>首页 · 一键记录</td>
    <td align="center"><img src="dist/media/phone-tank-v1.4.0.jpg" width="260" alt="缸内喂食月历"><br>缸内 · 喂食月历</td>
    <td align="center"><img src="dist/media/phone-residents-v1.4.0.jpg" width="260" alt="居民名字与头像"><br>居民 · 名字与头像</td>
  </tr>
</table>

截图和视频来自隔离的演示浏览器。演示记录与名字均为示例，图片附件是像素插画，不是用户的个人照片；应用初始数据没有虚构的维护记录。当前形象沿用照片参考审核稿的原生 SVG，新增孔雀鱼依据用户补充的外观描述；海报组合不代表实际同缸或数量。

## 本次更新 · v1.4.0

- 新日记从空白开始，自行创建缸与居民。旧版完整且从未修改的默认配置转为空白；已有个人资料保留，可通过备份菜单重新开始。
- 十二种像素形象可选择，加入鲫鱼、黑壳虾，以及按用户描述绘制的黄色尾巴、粉色半透明身体、黑眼孔雀鱼。选择该孔雀鱼创建时建议 4 条，可修改；不会自动加入初始日记。
- 四款可选空缸背景。生物标签和默认头像使用选择的像素形象，个体仍可命名、改形象和上传照片。
- 创建喂食、吸便、换水、加水重复提醒；完成可记录维护，暂停原因保存在备份，随时恢复。
- 导出标准 .ics 日历文件。日历是快照，App 暂停或修改任务不会自动修改已导入日历。
- 增加主屏幕安装图标、manifest 和离线缓存；首次联网缓存后可离线记录与查看已存照片。
- HEIC 在支持解码的浏览器中转 JPEG 保存；不支持时提示选择兼容图片。

![当前居民形象与空缸模板海报](dist/media/pixel-library-v1.4.0.png)

已完成的验证与部署状态见 [验收记录](验收记录.md)。版本历史见 [CHANGELOG](CHANGELOG.md)。

## 从原网址迁移

原网址：[小小水族日记 · 原入口](https://little-aqua-diary-jyt.jiangy-t-10.chatgpt.site/)。

1. 在原网址打开右上角「管理与备份」，导出「备份（含照片）」。
2. 在新网址打开同一菜单，选择「恢复备份」。
3. 核对居民、记录和照片；恢复会替换新网址当前的数据，若已开始记录，先备份这份数据。

记录与名单保存在当前浏览器的 localStorage，照片保存在 IndexedDB。不同网址、浏览器和设备各自保存，不能自动同步。源码仓库不包含你实际使用时保存的记录与照片；清除网站数据会导致本地资料丢失，请保留浏览器之外的 JSON 备份。

## 运行与维护

网页是静态 HTML、CSS 和 JavaScript，无前端依赖或构建步骤。手机使用在线地址；本地运行需要 Python 3。

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory dist # 在项目目录运行，打开 http://127.0.0.1:4173/
```

Node.js 22+ 可运行检查：

```sh
npm test # 验证数据、数量联动、旧备份与版本检查逻辑
npm run check:release # 核对版本、变更记录和当前版本的截图及视频
```

[完整使用说明](docs/USAGE.md) · [GitHub 部署与更新流程](docs/DEPLOYMENT.md) · [后续维护约定](AGENTS.md)

手机验证使用模拟视口，不等同于各品牌手机或 Safari 实机测试。本版提供主屏幕安装和缓存后的离线记录；没有云端同步或后台系统推送。

## 在 iPhone 使用

Safari 打开在线日记，点「共享 → 添加到主屏幕」，开启「作为网页 App 打开」再添加。先成功联网打开一次，缓存完成后可离线使用。设置里的安装提示也能查看步骤。[Apple 官方说明](https://support.apple.com/zh-cn/guide/iphone/iphea86e5236/ios)

提醒在 App 内显示。可导出日历文件，再作为附件从 Apple「邮件」打开导入日历；是否直接从下载文件导入，以设备实际界面为准。App 的暂停不会自动修改导入后的日历。[Apple 日历说明](https://support.apple.com/zh-cn/guide/iphone/ipha0d932e96/ios)
