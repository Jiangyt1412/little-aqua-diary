# GitHub 部署与更新

仓库：[Jiangyt1412/little-aqua-diary](https://github.com/Jiangyt1412/little-aqua-diary)。

部署目标：<https://jiangyt1412.github.io/little-aqua-diary/>。简介位于同一目录的 `intro.html`。

## 首次启用

GitHub Free 的 Pages 需要公开仓库；私有仓库需要支持该功能的付费套餐。私有源码并不意味着 Pages 网页只对自己可见；普通 Pages 发布的网站可公开访问。源码公开与账户付费由仓库主人决定。

确认可用后，在仓库 Settings → Pages → Build and deployment → Source 中选择 **GitHub Actions**。推送 `main` 会触发 `.github/workflows/pages.yml`；首次配置后可从 Actions 手动运行。流程先检查，再上传 `dist/`，最后部署。

网页使用相对资源路径，兼容 `/little-aqua-diary/` 项目子目录；不需要把文件搬到仓库根目录。`.nojekyll` 保留在发布目录。没有构建产物之外的服务端，也不需要添加个人令牌。

## 每次更新

1. 核对 `main` 最新版本及现有文件，完成实际改动。
2. 递增版本号，同步 `package.json`、`dist/js/version.js`、`dist/index.html` 元数据、`dist/sw.js` 缓存版本、简介 HTML、README 与 CHANGELOG。
3. 更新 `RELEASE_DATE`、`RELEASE_NOTES`，记录真实变化与验证结果。
4. 用隔离浏览器更新封面、三张截图、像素海报和视频，文件名包含当前版本；简介从发布元数据读取媒体路径。不得取用户的真实记录或照片作为演示。
5. 运行数据测试、发布检查，并在项目子路径下检查手机布局、备份、视频播放和缓存重开。实体 iPhone 未测试的项目如实注明。
6. 推送源码，查看 Actions 检查与部署结果，确认线上入口及菜单中的版本。只有线上验证通过后才报告上线。

```sh
npm test # 运行数据、联动与发布逻辑测试
npm run check:release # 校验版本一致性、更新记录及当前媒体
```

自动流程还会比较本次推送之前的版本，要求新版本严格递增。工作流手动运行用于重试当前发布，不要求再修改版本。

## 数据迁移

原入口、GitHub Pages 和本地预览是不同网址，各自保存数据。发布源码不会迁移或上传浏览器记录。

在原网址导出「备份（含照片）」，在新网址恢复。恢复会替换新网址当前资料；若新网址已经有记录，先导出其备份。原图请另行保存，备份包含应用压缩后的 JPEG。

## 参考

- [GitHub Pages 适用套餐及静态托管说明](https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages)
- [GitHub Actions 自定义 Pages 工作流](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
