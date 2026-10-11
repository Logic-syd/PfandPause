# Game Jolt 更新与手机兼容

公开页面：https://gamejolt.com/games/pfand-pause/1106213

## 1.0.1

- 游戏使用独立的纵向滚动容器，即使平台的双层 iframe 设置 `scrolling="no"`，也能到达整个棋盘、瓶箱和按钮。
- 手机竖屏压缩棋盘空白，扩大瓶子、帮助、撤销和重开的触控区域，保留安全区边距。订单由棋盘上方的队列按钮查看，手机不再重复显示侧栏。
- 矮屏上固定操作栏；弹窗退出时避免跳到原按钮位置。导航和重开重置游戏滚动位置。
- 教学练习中暂时不可选的瓶子会变淡。
- 音效设备异常不再中断操作、使瓶子按钮永久锁定。

测试覆盖 Chromium 的触控／鼠标模拟、320×568、390×844、844×390、1280×720 @2、1707×960 @1.5、2560×1440、3840×2160；也检查动画中改变窗口大小、三语、嵌入框内滚动和音效异常。没有据此断言已经复现朋友的具体 2K 故障，需要在原浏览器与缩放设置下复测。

## 构建与检查

```sh
npm test
npm run build
npm run preview
# 在另一个终端执行；也可使用 Playwright 安装的 Chromium：
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:responsive
```

将 `dist/` 内的文件直接压缩，ZIP 根目录必须包含 `index.html`，不能包在 `dist/` 文件夹里。

## 上传 1.0.1

1. Game Jolt 后台 → Packages → Pfand Pause 的 Manage → New Release。
2. Version Number 填 `1.0.1`，在 Upload Browser Build 上传 `PfandPause-html5-1.0.1.zip`。
3. 开启 Fit to screen?，保持 HTTPS support? 开启，点击 Save Build。
4. 处理完成后确认构建为 Active，点击 Publish Release。
5. 从公开游戏页面重新点击 Play，用手机和朋友原来的 2K 屏幕／缩放设置复测。使用同一个浏览器与 Game Jolt 地址时，现有语言设置和通关进度沿用原存储键。

原 `1.0.0` 可以保留。游戏页面已经公开，无需创建第二个游戏页面。
