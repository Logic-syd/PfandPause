# Game Jolt 更新与手机兼容

公开页面：https://gamejolt.com/games/pfand-pause/1106213

## 1.0.2

- 针对移动浏览器在平台多层 iframe 中不能执行原生滑动的情况，增加游戏内部的纵向触摸拖动和惯性滚动。
- 手指从瓶子上开始滑动时滚动页面，松手不会误选瓶子；下一次正常点击仍可操作。
- 弹窗优先滚动自己的内容，避免带动后面的棋盘；两指手势交给浏览器处理。直接打开游戏时继续使用原生滚动。
- 游戏窗口尺寸仍由平台的 Fit to screen 设置决定，没有加入固定画面宽高或缩放比例。

新增检查在跨源双层 `scrolling="no"` iframe 中禁用浏览器原生触摸平移：`1.0.1` 无法滚动，`1.0.2` 验证瓶子上的上下滑动、点击和撤销、独立弹窗滚动及两指事件处理。另验证直接打开时的原生滑动。测试使用 Chromium；当前环境无法下载 WebKit，尚未验证真实 iPhone Safari，需在原设备上复测。

## 1.0.1

- 游戏使用独立的纵向滚动容器，处理平台双层 iframe 的 `scrolling="no"` 限制；已通过 Chromium 嵌入测试。移动浏览器仍可能需要 1.0.2 的触摸兼容处理。
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
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:embedded-scroll
```

将 `dist/` 内的文件直接压缩，ZIP 根目录必须包含 `index.html`，不能包在 `dist/` 文件夹里。

## 上传 1.0.2

1. Game Jolt 后台 → Packages → Pfand Pause 的 Manage → New Release。
2. Version Number 填 `1.0.2`，在 Upload Browser Build 上传 `PfandPause-html5-1.0.2.zip`。
3. 开启 Fit to screen?，保持 HTTPS support? 开启，点击 Save Build。
4. 处理完成后确认构建为 Active，点击 Publish Release。
5. 从公开游戏页面重新点击 Play，用手机和朋友原来的 2K 屏幕／缩放设置复测。使用同一个浏览器与 Game Jolt 地址时，现有语言设置和通关进度沿用原存储键。

原 `1.0.0` 可以保留。游戏页面已经公开，无需创建第二个游戏页面。
