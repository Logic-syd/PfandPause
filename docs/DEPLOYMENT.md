# 发布到 GitHub Pages

项目是静态网站，可以用 GitHub Pages 提供公开的 HTTPS 访问。无需购买服务器、域名或配置应用密钥。部署工作流已放在 [`.github/workflows/deploy-pages.yml`](../.github/workflows/deploy-pages.yml)。

默认地址为 **https://logic-syd.github.io/PfandPause/**。此地址是按仓库名称推导的预期地址；实际发布状态及最终地址以仓库 **Settings → Pages** 和成功的 Actions 部署记录为准。

## 首次发布

1. 将网站代码及工作流提交并推送到 `Logic-syd/PfandPause` 的 `main` 分支。
2. 打开仓库的 **Settings → Pages → Build and deployment**，把 **Source** 设为 **GitHub Actions**。需要仓库管理权限；私有仓库还需账户套餐支持 Pages。不要为了启用 Pages 自动更改仓库可见性。
3. 打开 **Actions → Deploy GitHub Pages → Run workflow**，选择 `main`。如果先前自动运行因 Pages 尚未开启而失败，启用后重新运行。
4. 等待 `build` 和 `deploy` 都成功，打开 `github-pages` 环境显示的 HTTPS 地址。首次发布可能需要几分钟。
5. 用手机和电脑打开网站，切换中文、English、Deutsch，完成一个回收练习，再刷新确认语言设置保留。

## 更新和验证

以后每次推送到 `main` 都会自动运行 `npm ci`、`npm test` 和 `npm run build`，通过后发布 `dist/`。Node.js 版本读取仓库的 `.nvmrc`；依赖版本读取 `package-lock.json`。构建或测试失败时，不会进入部署步骤。

提交前可本地执行：

```sh
npm ci
npm test
npm run build
npm run preview
```

浏览器检查另需启动预览服务器并安装测试浏览器，可参考 [README 的验证说明](../README.md#验证)。发布工作流本身运行单元测试、类型检查和构建，不运行浏览器回归。

Vite 已配置 `base: "./"`，资源可以在 `/PfandPause/` 子路径加载。工作流只上传 `dist/`，使用 GitHub 自动提供的短期凭证；不需要添加个人访问令牌。仅 `main` 可触发正式部署，部署串行执行，进行中的部署不会被后续推送取消。

玩家进度和语言保存在当前浏览器的本地存储中。网站发布后可直接分享网址；更换设备或域名不会自动同步进度。
