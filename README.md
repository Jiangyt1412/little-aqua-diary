<p align="center"><img src="dist/favicon.svg" width="56" alt="小小水族日记"></p>

<h1 align="center">小小水族日记</h1>

<p align="center">照顾好，也记录好。<br>给家里的鱼缸、龟缸和虾桶，一本随手可记的日记。</p>

<p align="center"><strong>Version 1.3.1</strong> · 2026-10-15<br><a href="https://jiangyt1412.github.io/little-aqua-diary/">打开日记</a> · <a href="https://jiangyt1412.github.io/little-aqua-diary/intro.html">项目简介</a> · <a href="CHANGELOG.md">更新记录</a></p>

![小小水族日记实际界面，演示数据](dist/media/cover-v1.3.1.jpg)

## 每天常用的，放在手边

- **随手记时间**：喂食、吸便、加水一点就记；换水可填升数或比例。
- **看看这个缸**：点进鱼缸，查看喂食月历与维护记录。
- **认识每一位居民**：改物种和数量，给非黑壳虾个体取名字、上传头像。
- **新增自动联动**：新增生物后，缸内名单与数量一起更新。
- **照片留住观察**：观察记录支持照片，历史支持关键词搜索。
- **备份带走日记**：导出包含记录、居民和照片的 JSON，换网址或手机时恢复。

主界面只有首页、记录、居民三个入口。没有独立水质数据页或背景设置。

## 看一段实际操作

[▶ 在线播放 v1.3.1 演示](https://jiangyt1412.github.io/little-aqua-diary/intro.html#demo) · [下载 MP4](dist/media/demo-v1.3.1.mp4)

视频展示首页喂食、换水、喂食月历、居民命名、观察附件、新增数量联动、搜索和备份入口。简介页面使用原生视频播放器，可直接在手机播放。

<table>
  <tr>
    <td align="center"><img src="dist/media/phone-home-v1.3.1.jpg" width="260" alt="首页，一键记录"><br>首页 · 一键记录</td>
    <td align="center"><img src="dist/media/phone-tank-v1.3.1.jpg" width="260" alt="缸内喂食月历"><br>缸内 · 喂食月历</td>
    <td align="center"><img src="dist/media/phone-residents-v1.3.1.jpg" width="260" alt="居民名字与头像"><br>居民 · 名字与头像</td>
  </tr>
</table>

截图和视频来自隔离的演示浏览器。演示记录与名字均为示例，图片附件是像素插画，不是用户的个人照片；应用初始数据没有虚构的维护记录。当前像素场景为原创 SVG；按实鱼照片制作的新形象仍在审核，尚未替换到应用。

## 本次更新 · v1.3.1

- 原“虾虎鱼 / 沙塘鳢”并入“虾虎鱼”，初始数量改为 2 条，仍可分别取名和上传头像。
- 读取原有本地名单或恢复旧备份时合并这两组，保留数量、名字、头像、备注与历史记录。
- 原新增生物记录改为关联合并后的组，编辑与撤销仍联动数量。
- 已改物种名、移缸、删除目标组或超出个体容量的旧名单保持原样；不把管理分组合并当作物种鉴定。
- 更新本版实际截图、视频和简介。照片形象审核稿尚未应用。

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

Node.js 20+ 可运行检查：

```sh
npm test # 验证数据、数量联动、旧备份与版本检查逻辑
npm run check:release # 核对版本、变更记录和当前版本的截图及视频
```

[完整使用说明](docs/USAGE.md) · [GitHub 部署与更新流程](docs/DEPLOYMENT.md) · [后续维护约定](AGENTS.md)

手机验证使用模拟视口，不等同于各品牌手机或 Safari 实机测试。本版没有云端同步、PWA 离线安装或系统推送。
