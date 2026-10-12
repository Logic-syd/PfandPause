# Pfand Pause

限时退瓶三消游戏，支持中文、英语和德语。点露出的瓶子，放进共用的七格传送带；三个同款自动退走。15 关逐步增加瓶型、遮挡和时间压力，第 11 关开始加入无押金玻璃的颜色分类。使用原创瓶子 SVG、店铺插画和品牌。

## 启动

需要 Node.js 20.19 或更新版本。仓库提供 `.nvmrc` 和锁文件。

```sh
npm ci
npm run dev
npm run build
npm run preview
```

开发默认端口 5173，生产预览默认端口 4173。`dist/` 使用相对资源路径，可部署到静态服务器或游戏网站的嵌入框。请通过 HTTP 服务器运行，不要双击 HTML 文件。

## 主线规则

- 瓶子错层叠放；露出的亮色卡片可以点击，被覆盖的灰色卡片不能点击。支持鼠标、触控、Tab 和 Enter / Space。
- 所有押金瓶共用七格传送带，没有指定瓶型的接收队列。三个同款会自动消除并累计模拟退回押金；不同包装即使押金相同也不算同款。
- 七格被未消除的瓶子占满，本轮失败。如果第七瓶正好组成三个同款，会先消除再判定满槽。
- 「撤销」在操作栏右边，收回最后一瓶尚未退走的瓶子。已经消除的三瓶保持已退状态。
- 「移出三瓶」每关一次，将传送带最前面三瓶放到旁边；点暂存瓶可以放回。「洗牌」每关一次，只重新排列棋盘上剩下的瓶子。满槽时的小面板提供撤回和可用的移出三瓶选项。
- 前五关宽松；第六至第十关分别为 42／40／38／35／32 秒。最后十秒显示醒目倒数，开启声音时有短促提示音。帮助、独立练习、离开棋盘和洗牌计算期间暂停计时；撤销不返还时间或投错次数。
- 第 11 关起，无押金玻璃先点选再选择白／棕／绿回收箱，不占传送带。投错扣 10 秒，三次投错结束本轮。结束时显示本轮投错次数和现实投错可能被处罚的友情提醒，不显示罚款金额。
- 时间耗尽显示「超市打烊了，明天再来」，可以立即重开。通关小票显示押金瓶数量、模拟押金合计和玻璃回收数量。

七格与三瓶配对是游戏机制；实际退瓶接收要求和押金以包装及商店说明为准。

## 回收主题与美术

示例包装注明 `EINWEG PET` / `MEHRWEG` / `OHNE PFAND`、容量和金额。柠檬汽水示例押金为 €0.25，气泡水／黑加仑／苹果／可乐橙示例为 €0.15，麦芽示例为 €0.08；无押金玻璃为零。不根据饮料或瓶身颜色猜测真实押金。

六种饮料包装、玻璃瓶、店铺插画和品牌均为原创。瓶型和饮料背景参考 [GDB](https://www.gdb.de/mehrweg/flaschen-und-kaesten/)、[RAPP](https://www.rapp.de/shop/alkoholfreie-rapp-getraenke/) 和 [Karamalz](https://www.karamalz.de/produkte/karamalz-classic)。未使用这些品牌的包装素材。

主玩法采用常见的七格配对消除机制。设计研究参考 [yulegeyu](https://github.com/liyupi/yulegeyu) 中的槽位、遮挡与消除规则；当前引擎和关卡生成代码为本项目实现，未复制其他游戏的图片、角色、音效或品牌。

首页仍有独立的「德国回收练习」，包含八个包装示例、解释和模拟押金统计。规则参考 [DPG](https://dpg-pfandsystem.de/) 和 [德国消费者中心](https://www.verbraucherzentrale.de/wissen/umwelt-haushalt/abfall)。另有十二瓶自由试玩，包含四种瓶型和遮挡，不计时，不强制操作顺序，不改变关卡进度。试玩也可撤回、移出三瓶、洗牌；满槽时棋盘仍显示，使用道具后能继续。

## 实现

| 文件 | 用途 |
| --- | --- |
| `src/game/triple.ts` | 当前七格引擎、遮挡、匹配、撤回、移出、洗牌和求解器 |
| `src/components/TripleBoard.tsx` | 错层棋盘、七格传送带、暂存瓶及玻璃箱 |
| `src/data/levels.ts` | 十五关瓶子库存，保留原始 columns / orders 数据格式 |
| `src/components/Tutorial.tsx` | 独立十二瓶自由试玩 |
| `src/components/useRoundClock.ts` | 实际经过时间、暂停和扣时 |
| `src/components/FitBoard.tsx` | 根据实际容器缩放，处理嵌套框和窗口调整 |
| `src/components/ReturnReceipt.tsx` | 按包装押金计算的小票 |
| `src/data/recycling.ts` | 八个回收示例与正确去向 |
| `src/i18n.ts` | 中英德游戏文案 |
| `src/storage.ts` | 本地设置及已完成关卡，兼容原存档 |
| `tests/triple.test.ts` | 当前玩法、十五关回放、守恒和边界规则 |
| `scripts/solve.ts` | 导出十五关的验证路径，卡片编号从 1 开始 |

`createGame` 按关卡生成有向无环的遮挡图，并沿逐层取走顺序分配可解的三瓶组合。前两关平铺，后续两层，第八关起三层；原库存数量和押金不变。相邻两组三瓶交错分配，保证至少存在不会塞满七格的路径。随机选择仍可能塞满。

所有规则函数不修改输入，返回最终状态与动画帧。界面同步锁定操作后播放动画，防止连点重复拿取。卡片 ID 跟踪每瓶在棋盘、槽位、暂存、已退或玻璃箱中的位置；撤回不能逆转已退三瓶。洗牌保留所有已退和暂存瓶，并优先排列有机会补齐传送带组合的瓶子。已塞满的组合仍可能需要撤回或移出三瓶。

`src/game/engine.ts`、`solver.ts`、`undo.ts` 和旧练习数据保留为上一版规则及历史回归；正式界面不再使用旧接收队列。当前解路径见 `docs/solutions.json`。

## 验证

```sh
npm test
npm run solve
npm run build
```

先启动生产预览，再运行浏览器检查。系统 Chromium 可通过 `BROWSER_EXECUTABLE_PATH` 指定。

```sh
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:browser
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:fit-board
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:responsive
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:embedded-scroll
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:demo
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:practice-fit
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:glass
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:timer
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:languages
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:voice
```

浏览器检查覆盖实际点击十五关、七格满槽和救场、三语练习及玻璃分类、存档、10→1 倒数、押金小票、动画、不同像素密度、短窗口和两层 iframe。模拟检查不能代替真实 iPhone Safari 或 Game Jolt 的最终设备测试。

## 发布

GitHub Pages 的 main 推送会运行单元测试和构建，再发布 `dist/`。

- 测试网站：https://logic-syd.github.io/PfandPause/
- Game Jolt：https://gamejolt.com/games/pfand-pause/1106213
- Game Jolt 后台：https://gamejolt.com/dashboard/games/1106213/packages

Game Jolt 版本由账号持有人上传；代码或 Pages 更新不会自动替换 Game Jolt 文件。打包时 ZIP 根目录需包含 `index.html` 和 `assets/`。当前按用户要求先测试，不生成新 ZIP。详细上传说明见 `docs/GAMEJOLT.md`。

## 声音

用户提供的英语 MP3 保存在 `src/assets/voice/win-en.mp3`，约 40 KB / 2.5 秒，台词为 “All sorted! Time for a little pause.”。正式关卡与自由试玩通关后在英语、声音开启时播放。退出、换语言或静音取消播放，音频失败不阻碍游戏。没有生成额外配音。
