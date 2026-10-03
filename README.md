# Pfand Pause

一个完整可玩的、以德国小饮料店退瓶区为背景的 2D 分拣解谜游戏。原创 SVG / CSS 美术，德语与英语，十个经过同一规则引擎求解验证的关卡。手机竖屏优先，也支持电脑鼠标和键盘。

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
- 同时有两个瓶箱，每箱接受指定类型的 **三个** 瓶子。瓶型、颜色、标签图案三重区分六种类型。
- 点击后，匹配的瓶子自动进箱；两个箱都不匹配时，进入 **三格临时区**。
- 同类型有两个可用箱时，先填已有更多瓶子的箱子；一样多则优先左边。
- 满箱移走，按固定订单队列补位。临时区中的匹配瓶子自动进新箱，继续结算，直到没有可执行的自动转移。
- 全部自动转移结束后，临时区仍占满三格且尚未完成，失败。全部瓶子装箱则通关。
- **撤销**恢复上次点击前的全部状态，包括自动转移、已完成箱、订单位置；可以连续撤销。**重开**恢复该关初始状态。
- 首次开始前有可跳过的独立互动练习（匹配、暂存、失败、撤销、自动换箱和通关），首页及「How to play / So geht’s」可随时重看；练习不影响正式关卡或进度；后续关卡逐步解锁。没有计时，也没有步数惩罚。
- 订单入口显示尚未发出的箱数，展开后可看到已完成、当前使用中和后续订单。两个当前箱不计入「queued / warten」。
- localStorage 自动保存已通关关卡、教程状态、语言、音效和减少动态效果设置。首次使用优先跟随浏览器德语，否则使用英语。存储被禁用或损坏时仍可游玩。
- 这是一款虚构的益智游戏，不模拟真实押金政策。

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

瓶型、玻璃质感、饮料图案与德语实物标签共同营造社区饮料店的感觉；包装保留德语，界面名称随英语／德语切换。`MEHRWEG` 与容量文字属于场景设计，不引入真实押金规则。全部包装与插画均为原创，无真实品牌、商标或外部游戏素材。

参考了 [GDB 的回收瓶型](https://www.gdb.de/mehrweg/flaschen-und-kaesten/)、[RAPP 的日常饮料品类](https://www.rapp.de/shop/alkoholfreie-rapp-getraenke/)和 [Karamalz 的麦芽饮料规格](https://www.karamalz.de/produkte/karamalz-classic)，仅用作生活背景研究，没有使用这些品牌的名称、标志或包装素材。

类型由 `berry / orange / cola / mint` 一一改为 `currant / apple / malt / kola`，关卡排列、订单顺序和规则保持相同，因此不改变难度与既有解路径。存档只保存已完成关卡 id 和设置，原有进度继续有效。

## 文件位置与设计

| 文件                          | 用途                                                     |
| ----------------------------- | -------------------------------------------------------- |
| `src/game/types.ts`           | 瓶子、关卡、完整游戏状态、动画事件的类型                 |
| `src/game/engine.ts`          | 纯规则：初始化、校验、选箱、拿瓶、自动结算、瓶子守恒统计 |
| `src/game/solver.ts`          | 使用相同 `takeBottle` 的带记忆深度优先搜索               |
| `src/data/levels.ts`          | 十关独立的静态数据；每列数组第一个元素就是最上方瓶子     |
| `src/data/tutorial.ts`        | 独立9瓶练习关、教学操作顺序和引导版本                    |
| `src/components/Tutorial.tsx` | 与正式关卡隔离的互动新手引导                             |
| `src/data/bottles.ts`         | 六种瓶子的配色、瓶型路径和瓶盖尺寸                       |
| `src/components/Bottle.tsx`   | 统一 SVG 绘制及六种标签图案                              |
| `src/components/Dialog.tsx`   | 原生 modal dialog、焦点恢复和 Escape 支持                |
| `src/App.tsx`                 | 页面、操作历史、动画事件播放、同步输入锁                 |
| `src/styles.css`              | 原创店铺插画、工作台、瓶箱与响应式布局                   |
| `src/i18n.ts`                 | 德英游戏文案、关卡名与固定德语包装标签                                     |
| `src/storage.ts`              | 有容错的版本化本地存储                                   |
| `src/audio.ts`                | 用户交互后启用的 Web Audio 音效及英语通关配音                        |
| `tests/engine.test.ts`        | 规则与关卡验证                                           |
| `scripts/solve.ts`            | 导出每关的解路径                                         |
| `scripts/browser-check.ts`    | 可重复的真实浏览器回归                                   |
| `docs/solutions.json`         | 每关至少一条已回放验证的解；列号从 **1** 开始            |

`takeBottle(previous, column)` 不修改输入，返回最终状态与一系列动画帧。界面先同步加锁，保存操作前的快照，再播放帧，最后发布最终状态并解锁。因此「一次撤销」对应一次完整玩家操作，不会只撤销一半自动转移。规则中不包含 DOM、React、音效或计时器。

求解器使用完全相同的转移函数，并缓存已经证明无法通关的状态。它会优先尝试直接装箱的动作，但也会搜索临时存放动作。求解器只用于开发验证，不被打包到玩家页面中。达到搜索上限会明确失败，不会把尚未找到解误报成已验证。

## 验证

```sh
npm test              # 核心规则、逐关解回放、动画帧守恒、随机合法操作
npm run solve         # 校验十关并更新 docs/solutions.json
npm run typecheck
npm run build
```

浏览器验证需要先启动 `npm run dev`，另开终端执行：

```sh
npx playwright install chromium   # 首次安装测试浏览器
npm run test:browser
```

已有 Google Chrome 时也可运行：

```sh
BROWSER_CHANNEL=chrome npm run test:browser
# 对生产预览运行同一套检查：
BASE_URL=http://localhost:4173 BROWSER_CHANNEL=chrome npm run test:browser
```

脚本会实际点击通关全部十关，并检查 30 次同时点击只产生一步、失败后撤销、自动转移后撤销、重开、关卡解锁、刷新保存、德英语言、被禁用/损坏的存储、桌面通关，以及 320 / 360 / 390 / 768 / 1280px 的横向溢出。截图与回归报告写入 `artifacts/`。

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
  orders: ['water', 'lemon'], // 初始左箱、初始右箱，随后是共享队列
}
```

1. 关卡 id 保持从 1 开始连续，每个列数组按 **从顶到底** 填写。
2. 某种瓶子每出现一条订单，桌面就必须正好有三个这种瓶子；校验器会拒绝不平衡配置。
3. 在 `src/i18n.ts` 的两种 `levelNames` 中补充关卡名。
4. 若扩展到十关之外，更新 `src/storage.ts` 中保存关卡 id 的上限；这是一版十关的存档边界。
5. 运行 `npm run solve` 和 `npm test`；没有验证解的关卡不能发布。
6. 用 390px 窄屏检查列数和最深堆叠。目前经过视觉验证的范围是 3–5 列、2–8 层；更多列应补充 CSS 尺寸规则。

`scripts/extend-levels.ts` 保留了后七关的确定性生成过程。它从固定种子抽取候选，通过同一求解器筛选后写入静态文件。正常修改关卡只需直接编辑数据；重新运行生成脚本会覆盖第 4–10 关。

## 新增瓶子

1. 在 `src/game/types.ts` 的 `bottleTypes` 中增加类型。现有类型为 `water / lemon / currant / apple / malt / kola`；新增时使用独立 token（例如 `rhubarb`），不要复用已有类型。
2. 在 `src/data/bottles.ts` 中补齐颜色、浅色、SVG 瓶身路径、瓶盖位置；采用相同的 `68 × 124` 坐标系。
3. 在 `src/components/Bottle.tsx` 的 `Pattern` 中画一个独立标签图案。务必同时保持颜色、瓶型、图案的辨识度。
4. 在 `src/i18n.ts` 的德英 `bottleNames` 中加上名称，并在 `bottlePackaging` 中配置固定德语标签与容量。然后用新类型配置关卡并运行全部验证。

瓶箱和规则使用类型数据，不需要为每种新瓶子增加规则分支。

## 当前范围

本版本支持现代 Chrome / Edge / Firefox / Safari；实际自动回归使用桌面 Chrome 的鼠标与手机触屏模拟，没有替代实体 iPhone / Android 测试。没有后端、跨设备同步或 PWA 离线安装。保存的是通关进度和设置，刷新会回到开始页，**不会恢复正在进行的半局**。深层关卡在矮屏上需要纵向滚动；不会横向滚动。

已提供生产构建，但没有部署到公网。

## DaVinci 英语配音

用户在 DaVinci 网页中生成并提供了一条英语配音：**“All sorted! Time for a little pause.”**。原始 MP3 原样保存在 `src/assets/voice/win-en.mp3`，约 40 KB、2.5 秒。声线与模型名称未提供，因此不在项目记录中猜测；未生成卡通熊声音、德语配音或其他教学台词，也没有购买付费套餐。

英语模式下，正式关卡或独立练习完成后会在通关音效之后播放一次。已有声音开关同时控制语音。德语模式继续使用原来的短音效。进入下一关、重开、离开页面、退出练习、切换语言或关闭声音都会取消待播或正在播放的语音。异步加载或解码失败不会妨碍游戏。音频随构建打包，本地加载；玩家无需访问 DaVinci。

- `docs/voice-assets.json`：实际素材来源、原始文件名、校验值、触发点。
- `docs/davinci-voice-brief.json`：最初的多语言制作计划以及明确标注的最终缩减范围。
- `tests/voice.test.ts`：声音关闭、语言切换、延迟加载取消、重复请求和错误恢复。
- `BROWSER_CHANNEL=chrome npm run test:voice`：对已启动的生产预览验证实际 MP3 解码、播放时序、英语/德语与静音分支、退出取消和错误恢复。

项目经历可如实描述为：**使用 DaVinci 生成英语通关配音，并将音频接入 React 浏览器游戏，实现用户交互后播放、静音控制和页面切换时的播放取消。**
