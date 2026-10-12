# Pfand Pause

一个限时退瓶与玻璃回收解谜游戏。原创 SVG / CSS 美术，支持中文、英语与德语，共 15 个经求解验证的关卡。前15 关退押金瓶，后五关加入无押金玻璃的颜色分类。手机与桌面界面按视口适配，不需要上下滚动。

## 德国回收练习（中英德三语）

首页的「德国回收练习」提供八个包装示例，让新来德国的玩家依据包装信息选择商店退瓶或白／棕／绿玻璃回收箱。每题展示材料和标签，回答后说明正确去向和依据；结束时显示首次答对数与模拟退回金额，可重新练习。

内容包括一次性押金 0.25 €、常见可重复使用瓶押金 0.15 € / 0.08 €、无押金玻璃按颜色分类，以及蓝色等其他颜色通常进入绿玻璃箱。示例押金明确写在包装信息中，不根据饮料种类或瓶子颜色推断。可重复使用瓶金额不统一，商店接收瓶型及当地分类要求也可能不同；真实投放应查看实际包装、购买凭证和当地说明。无押金塑料、金属及纸盒包装不属于本练习的玻璃箱范围。

主线采用虚构的每批三瓶规则，但每种示例包装都明确标示押金：柠檬汽水为 Einweg PET / 0.25 €，其他 Mehrweg 示例为 0.15 € 或 0.08 €。三种无押金玻璃瓶明确标示 OHNE PFAND。教学数据位于 `src/data/recycling.ts`，界面位于 `src/components/RecyclingPractice.tsx`。`npm test` 包含教学去向与押金统计测试。规则参考入口：[DPG](https://dpg-pfandsystem.de/) 与 [德国消费者中心](https://www.verbraucherzentrale.de/wissen/umwelt-haushalt/abfall)。

## 启动

需要 **Node.js 20.19 或更新版本**。若使用 nvm，可先运行 `nvm use`（首次可能需要 `nvm install`）。

```sh
npm ci
npm run dev
```

打开终端显示的地址，默认 `http://localhost:5173`。开发服务器监听本机网络接口，同一局域网手机可访问终端中的 Network 地址。此操作不会部署到公网。

```sh
npm run build          # TypeScript 检查 + 生产构建
npm run preview        # 本地预览 dist，默认 http://localhost:4173
```

`dist/` 是可以交给静态服务器的完整版本，使用相对资源路径，支持部署在子目录。没有后台、账号、追踪、外部字体或素材请求。不要直接双击 `dist/index.html`；请通过 HTTP 服务器访问。

## 玩法

- 每列从上到下排列瓶子。只能拿取最上方、带亮色边框的瓶子；后面的瓶子可看见但不可点击。移动设备直接点按，键盘可用 Tab 选择并按 Enter / Space。
- 退瓶机有两个接收位，每批接受三个相同包装的押金瓶。空位优先安排队列中尚未在接收的瓶型，两个正在接收的位置保持不同；只剩同一种时逐批处理，另一位显示等待。这是解谜机制，不代表真实机器一定要凑三瓶。
- 没有对应接收位的押金瓶进入三个暂存位；有接收位时自动移入。暂存位满时，仍可退匹配的瓶子；继续取不匹配的瓶子扣 5 秒，瓶子不移动。
- 第 11 关起，点选标有 OHNE PFAND 的玻璃瓶，再选择白／棕／绿玻璃回收箱。投错扣 10 秒；累计投错三次结束本轮。
- 前五关保持宽松；第六至第十关逐步收紧为 42／40／38／35／32 秒。最后 10 秒显示醒目倒数，声音开启时每秒有短促提示音；玻璃关卡保留原时间，最后一关 120 秒。查看帮助、教学或离开关卡暂停计时；撤销不返还已扣时间，也不清除投错次数。
- 倒计时结束前处理所有瓶子才能通关。通关统计分别显示实际归还的押金瓶数、模拟退回押金和无押金玻璃回收数。无押金玻璃不增加押金或退瓶数。
- 时间用完或投错达到上限后只能重开／返回首页。投错结束时显示本轮投错次数，以及“友情提醒：现实中投错可能会被处罚。”

## 社区饮料店的视觉设计

六种饮料取材于德国日常饮料店：

| 类型 token | 德语名称 | 英语名称 | 包装容量 |
| --- | --- | --- | --- |
| `water` | Sprudel | Sparkling water | 0,7 l |
| `lemon` | Zitronenlimo | Lemon soda | 0,5 l |
| `currant` | Johannisbeer-Schorle | Currant spritzer | 0,5 l |
| `apple` | Apfelschorle | Apple spritzer | 0,5 l |
| `malt` | Malz | Malt drink | 0,33 l |
| `kola` | Kola-Mix | Cola-orange | 0,5 l |

瓶型、材质、图案与德语标签用于识别包装。界面随中英德切换，包装标签保留德语。`EINWEG PET`／`MEHRWEG`／`OHNE PFAND`、容量与金额明确写在示例包装上；真实押金以实际包装和购买凭证为准。全部包装与插画均为原创，无真实品牌、商标或外部游戏素材。

参考了 [GDB 的回收瓶型](https://www.gdb.de/mehrweg/flaschen-und-kaesten/)、[RAPP 的日常饮料品类](https://www.rapp.de/shop/alkoholfreie-rapp-getraenke/)和 [Karamalz 的麦芽饮料规格](https://www.karamalz.de/produkte/karamalz-classic)，仅用作生活背景研究，没有使用这些品牌的名称、标志或包装素材。

类型由 `berry / orange / cola / mint` 一一改为 `currant / apple / malt / kola`，原十关排列继续保留；新倒计时、三位满后的扣时规则和玻璃分类独立演进。存档只保存已完成关卡 id 和设置，原有进度继续有效。

## 文件位置与设计

| 文件                          | 用途                                                     |
| ----------------------------- | -------------------------------------------------------- |
| `src/game/types.ts`           | 瓶子、关卡、完整游戏状态、动画事件的类型                 |
| `src/game/engine.ts`          | 纯规则：初始化、校验、选箱、拿瓶、自动结算、瓶子守恒统计 |
| `src/game/solver.ts`          | 使用相同 `takeBottle` 的带记忆深度优先搜索               |
| `src/data/levels.ts`          | 十个退瓶谜题及五个玻璃分类关卡；每列数组第一个元素就是最上方瓶子     |
| `src/data/tutorial.ts`        | 独立9瓶练习关、教学操作顺序和引导版本                    |
| `src/components/Tutorial.tsx` | 与正式关卡隔离的互动新手引导                             |
| `src/data/bottles.ts`         | 九种包装的配色、瓶型路径和瓶盖尺寸                       |
| `src/components/Bottle.tsx`   | 统一 SVG 绘制及包装标签                              |
| `src/components/FitBoard.tsx` | 根据实际容器宽高缩放整局，兼容嵌套 iframe与动态窗口尺寸 |
| `src/components/Dialog.tsx`   | 原生 modal dialog、焦点恢复和 Escape 支持                |
| `src/App.tsx`                 | 页面、操作历史、动画事件播放、同步输入锁                 |
| `src/styles.css`              | 原创店铺插画、工作台、瓶箱与响应式布局                   |
| `src/i18n.ts`                 | 中英德游戏文案、关卡名与固定德语包装标签                                     |
| `src/storage.ts`              | 有容错的版本化本地存储                                   |
| `src/audio.ts`                | 用户交互后启用的 Web Audio 音效及英语通关配音                        |
| `tests/engine.test.ts`        | 规则与关卡验证                                           |
| `scripts/solve.ts`            | 导出每关的解路径                                         |
| `scripts/browser-check.ts`    | 可重复的真实浏览器回归                                   |
| `docs/solutions.json`         | 每关至少一条已回放验证的解；列号从 **1** 开始            |

`takeBottle(previous, column)` 不修改输入，返回最终状态与一系列动画帧。界面先同步加锁，保存操作前的快照，再播放帧，最后发布最终状态并解锁。因此「一次撤销」对应一次完整玩家操作，不会只撤销一半自动转移。规则中不包含 DOM、React、音效或计时器。

求解器使用完全相同的转移函数，并缓存已经证明无法通关的状态。它会优先尝试直接装箱的动作，但也会搜索临时存放动作。求解器只用于开发验证，不被打包到玩家页面中。缓存包含当前待退队列，避免不同补位顺序被误认为同一状态。达到搜索上限会明确失败，不会把尚未找到解误报成已验证。

## 验证

```sh
npm test              # 核心规则、逐关解回放、动画帧守恒、随机合法操作
npm run solve         # 校验15 关并更新 docs/solutions.json
npm run typecheck
npm run build
```

浏览器验证需要先启动 `npm run dev`，另开终端执行：

```sh
npx playwright install chromium   # 首次安装测试浏览器
npm run test:browser
npm run test:responsive            # 手机触控、嵌入框、2K/4K 与音频异常回归
npm run test:timer                 # 倒计时、帮助暂停、扣时、不可撤销的惩罚、结束与重开
npm run test:glass                 # 三语玻璃关卡、投错、撤销、统计与小屏完整显示
npm run test:fit-board             # 11种窗口、全部15 关完整显示，无棋盘滚动或滚动条
npm run test:practice-fit          # 三语、6种窗口，首页／教学全步骤／八题问答／通关统计
npm run test:embedded-scroll       # 跨源嵌套 iframe 的触摸滚动兼容与故障模拟
```

已有 Google Chrome 时也可运行：

```sh
BROWSER_CHANNEL=chrome npm run test:browser
# 对生产预览运行同一套检查：
BASE_URL=http://localhost:4173 BROWSER_CHANNEL=chrome npm run test:browser
```

脚本会实际点击通关全部15 关，并检查 30 次同时点击只产生一步、暂存位满后撤销、自动转移后撤销、重开、关卡解锁、刷新保存、德英语言、被禁用/损坏的存储、桌面通关，以及 320 / 360 / 390 / 768 / 1280px 的横向溢出。截图与回归报告写入 `artifacts/`。

三语回归覆盖浏览器语言识别、八个回收示例、练习中切换语言、设置持久化、教程、帮助和窄屏布局：

```sh
npm run test:languages
# 使用环境已有的 Chromium 时：
BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:languages
```

包装上的德语标识保留，题目、材料说明、选项和反馈跟随所选语言；切换语言保留当前题目和得分。

测试中的「连续满箱」用刻意构造的中间状态检验结算循环：正常可继续游玩的回合末临时区至多只有两瓶，新空箱只能吸收两瓶，所以多个连续满箱在普通合法存档中通常不会出现。引擎仍完整支持连续结算，且始终在结算结束后才判负。

## 修改或新增关卡

在 `src/data/levels.ts` 添加配置：

```ts
{
  id: 11,
  columns: [
    ['water', 'lemon'], // water 是最上方，可以先拿
    ['water', 'lemon'],
    ['water', 'lemon'],
  ],
  orders: ['water', 'lemon'], // 共享批次队列，接收位优先安排不同瓶型
}
```

1. 关卡 id 保持从 1 开始连续，每个列数组按 **从顶到底** 填写。
2. 押金瓶每条接收订单对应三个瓶子；无押金玻璃不进接收队列，可单瓶出现。校验器拒绝不平衡押金瓶或将玻璃排入退瓶队列。
3. 在 `src/i18n.ts` 的三语 `levelNames` 中补充关卡名。
4. 存档关卡范围依据 `levels.length`，新增关卡后原有完成记录继续有效。
5. 运行 `npm run solve` 和 `npm test`；没有验证解的关卡不能发布。
6. 用 390px 窄屏检查列数和最深堆叠。目前经过视觉验证的范围是 3–5 列、2–9 层；更多列应补充 CSS 尺寸规则。

`scripts/extend-levels.ts` 保留了后七关的确定性生成过程。它从固定种子抽取候选，通过同一求解器筛选后写入静态文件。正常修改关卡只需直接编辑数据；重新运行生成脚本会覆盖第 4–10 关。

## 新增瓶子

1. 在 `src/game/types.ts` 的 `bottleTypes` 中增加类型。现有退瓶类型为 `water / lemon / currant / apple / malt / kola`，无押金类型为 `glassClear / glassBrown / glassGreen`；新增时使用独立 token（例如 `rhubarb`），不要复用已有类型。
2. 在 `src/data/bottles.ts` 中补齐颜色、浅色、SVG 瓶身路径、瓶盖位置；采用相同的 `68 × 124` 坐标系。
3. 在 `src/components/Bottle.tsx` 的 `Pattern` 中画一个独立标签图案。务必同时保持颜色、瓶型、图案的辨识度。
4. 在 `src/i18n.ts` 的中英德 `bottleNames` 中加上名称，并在 `bottlePackaging` 中配置固定德语标签与容量。然后用新类型配置关卡并运行全部验证。

瓶箱和规则使用类型数据，不需要为每种新瓶子增加规则分支。

## 当前范围

本版本支持现代 Chrome / Edge / Firefox / Safari；实际自动回归使用桌面 Chrome 的鼠标与手机触屏模拟，没有替代实体 iPhone / Android 测试。没有后端、跨设备同步或 PWA 离线安装。保存的是通关进度和设置，刷新会回到首页，点击继续进入首个未通关关卡，**不会恢复正在进行的半局**。正式关卡按实际窗口完整适配，无需横向或纵向滚动；教学练习、回收问答及通关总结也无需滑动，长订单和规则说明可以独立滑动，所有滚动条隐藏。

游戏已发布到 [Game Jolt](https://gamejolt.com/games/pfand-pause/1106213)。HTML5 包更新步骤和手机兼容验证见 [Game Jolt 更新说明](docs/GAMEJOLT.md)。另保留了可选的 [GitHub Pages 部署说明](docs/DEPLOYMENT.md)。

## DaVinci 英语配音

用户在 DaVinci 网页中生成并提供了一条英语配音：**“All sorted! Time for a little pause.”**。原始 MP3 原样保存在 `src/assets/voice/win-en.mp3`，约 40 KB、2.5 秒。声线与模型名称未提供，因此不在项目记录中猜测；未生成卡通熊声音、德语配音或其他教学台词，也没有购买付费套餐。

英语模式下，正式关卡或独立练习完成后会在通关音效之后播放一次。已有声音开关同时控制语音。中文和德语模式继续使用原来的短音效；当前录音仅有英语。进入下一关、重开、离开页面、退出练习、切换语言或关闭声音都会取消待播或正在播放的语音。异步加载或解码失败不会妨碍游戏。音频随构建打包，本地加载；玩家无需访问 DaVinci。

- `docs/voice-assets.json`：实际素材来源、原始文件名、校验值、触发点。
- `docs/davinci-voice-brief.json`：最初的多语言制作计划以及明确标注的最终缩减范围。
- `tests/voice.test.ts`：声音关闭、语言切换、延迟加载取消、重复请求和错误恢复。
- `BROWSER_CHANNEL=chrome npm run test:voice`：对已启动的生产预览验证实际 MP3 解码、播放时序、英语/德语与静音分支、退出取消和错误恢复。

项目经历可如实描述为：**使用 DaVinci 生成英语通关配音，并将音频接入 React 浏览器游戏，实现用户交互后播放、静音控制和页面切换时的播放取消。**
