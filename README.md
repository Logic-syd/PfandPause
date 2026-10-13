# Pfand Pause

德国球赛散场，你拎着一袋空瓶去超市退押金，偏偏退瓶机闹毛病，只肯收三个同款，后面的人还在催。支持中文、英语和德语的不限时七格三消，共二十袋瓶子逐步加深遮挡。第十一袋开始混入无押金玻璃分类。使用原创瓶子 SVG、店铺插画和品牌。

首页、试玩、机器说明、关名和结算围绕同一个场景。排队吐槽放在七格台面下方，每四秒纵向滚动换句，结合开局、三瓶收走、台面将满、快退完四种状态。十二秒没有操作开始轻催，二十五秒后加强催促，并出现背景人影、轻微晃动、低声嘟囔感与脚步音；没有倒计时失败或扣秒。操作立即解除催促，暂停、离开页面、切出浏览器均停止，静音与减少动画设置有效。文字区域固定高度，背景不拦截点击。小票保留瓶数和模拟押金。台面未满时显示中性容量说明，五格占用变黄色轻提醒，六格突出最后一个空位；凑齐三瓶的收取动画不误报满槽。真正满槽时显示居中的德国退瓶机故障屏（AUSSER BETRIEB），点击“换台机器再退”重开当前这一袋。现实退瓶规则在帮助及回收问答中说明。

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

- 瓶子错层叠放；露出的亮色卡片可以点击，被覆盖的灰色卡片不能点击。支持鼠标、触控、Tab 和 Enter / Space。动画中连续点其他露出的瓶子会按顺序处理，立即变色打勾；同一瓶不会重复入列。重开或关闭试玩会清空未处理的点击。
- 所有押金瓶共用七格传送带，没有指定瓶型的接收队列。三个同款会自动消除并累计模拟退回押金；不同包装即使押金相同也不算同款。
- 七格被未消除的瓶子占满，本轮失败。如果第七瓶正好组成三个同款，会先消除再判定满槽。
- 没有撤销、移出或洗牌救场；满槽结束后只能重新开始。试玩使用相同失败规则。
- 原第二关成为第一关。第二关四种瓶子、两层；第三关六种、三层；第五关起十种。按可解的交错顺序生成遮挡，乱点可能堵死。
- 全部二十关不限时，没有倒数、扣秒或超时失败。第三关起加入两侧长叠堆；中心轮换双堆、十字、环形与塔形，后期主堆九层、侧堆十五瓶。先拆哪边、何时凑三需要规划。
- 第 11 关起，无押金玻璃先点选再选择白／棕／绿回收箱，不占传送带。三次投错结束本轮。结束时显示本轮投错次数和现实投错可能被处罚的友情提醒，不显示罚款金额。
- 失败可以立即重开。通关小票显示押金瓶数量、模拟押金合计和玻璃回收数量。

七格与三瓶配对是游戏机制；实际退瓶接收要求和押金以包装及商店说明为准。

## 回收主题与美术

示例包装注明 `EINWEG PET` / `MEHRWEG` / `OHNE PFAND`、容量和金额。柠檬汽水示例押金为 €0.25，气泡水／黑加仑／苹果／可乐橙示例为 €0.15，麦芽示例为 €0.08；无押金玻璃为零。不根据饮料或瓶身颜色猜测真实押金。

十种饮料包装、玻璃瓶、店铺插画和品牌均为原创。瓶型和饮料背景参考 [GDB](https://www.gdb.de/mehrweg/flaschen-und-kaesten/)、[RAPP](https://www.rapp.de/shop/alkoholfreie-rapp-getraenke/) 和 [Karamalz](https://www.karamalz.de/produkte/karamalz-classic)。未使用这些品牌的包装素材。

主玩法采用常见的七格配对消除机制。设计研究参考 [yulegeyu](https://github.com/liyupi/yulegeyu) 中的槽位、遮挡与消除规则；当前引擎和关卡生成代码为本项目实现，未复制其他游戏的图片、角色、音效或品牌。

首页有独立的「这瓶扔哪？」，包含八个包装示例、解释和模拟押金统计。规则参考 [DPG](https://dpg-pfandsystem.de/) 和 [德国消费者中心](https://www.verbraucherzentrale.de/wissen/umwelt-haushalt/abfall)。另有十二瓶自由试玩，包含四种瓶型和遮挡，不计时，不强制操作顺序，不改变关卡进度。试玩随操作说明拿取、三瓶消除和遮挡；七格旁始终显示满槽失败提醒，失败后只能重试。

回收问答答对显示绿色大勾、上扬音效和本题押金奖励；答错显示红色大叉、轻微摇动和低音提示，对照所选答案与正确去向。包装线索高亮，玻璃回收显示对应颜色的垃圾箱图标。静音及减少动态效果设置有效，答错与玻璃回收不增加押金。

作答前只显示瓶子、材料和包装标记，选项为商店、白玻璃箱、棕玻璃箱、绿玻璃箱，不再按押金金额拆分商店选项。金额、完整包装说明和解释在作答后揭晓；不同押金瓶退回商店均判对，模拟退款仍按本题金额结算。

## 实现

| 文件 | 用途 |
| --- | --- |
| `src/game/triple.ts` | 当前七格引擎、遮挡、匹配、终局判定和求解器 |
| `src/components/TripleBoard.tsx` | 错层棋盘、七格传送带、满槽警告及玻璃箱 |
| `src/data/levels.ts` | 二十关瓶子库存，保留原始 columns / orders 数据格式 |
| `src/components/Tutorial.tsx` | 独立十二瓶自由试玩 |
| `src/components/useBottleInput.ts` | 动画期间接收连点、去重和取消待处理点击 |
| `src/game/layout.ts` | 主堆形状、错层遮挡及两侧长叠堆 |
| `src/components/FitBoard.tsx` | 根据实际容器缩放，处理嵌套框和窗口调整 |
| `src/components/ReturnReceipt.tsx` | 按包装押金计算的小票 |
| `src/data/recycling.ts` | 八个回收示例与正确去向 |
| `src/i18n.ts` | 中英德游戏文案 |
| `src/storage.ts` | 本地设置及已完成关卡，兼容原存档 |
| `tests/triple.test.ts` | 当前玩法、二十关回放、守恒和边界规则 |
| `scripts/solve.ts` | 导出二十关的验证路径，卡片编号从 1 开始 |

`createGame` 先构造不会塞满七格的拿取序列，再沿随机拓扑顺序把瓶子分配到遮挡图中。第三关开始同时交错更多未完成瓶型，末关主堆九层。生成路径由移动规则逐步验证遮挡、槽位和瓶子守恒；另用固定种子的贪心策略检查后期关卡不能仅靠优先拿可见同款轻松通关。这不是真人通关率。游戏不会给玩家显示解路径。

所有规则函数不修改输入，返回最终状态与动画帧。界面按点击顺序播放动画，连点先入队并立即标记，同一瓶重复点击只处理一次。满槽是不可恢复的终局；菜单先暂停，必须点明确的返回按钮才能离开，点击弹窗外空白不会关闭或跳转。旧存档移除原第一关并将后续完成编号前移一次，保留语言和声音设置。

`src/game/engine.ts`、`solver.ts`、`undo.ts` 、`src/data/legacy-levels.ts` 和旧练习数据保留为上一版规则及历史回归；正式界面不再使用旧接收队列。当前解路径见 `docs/solutions.json`。

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
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:mobile-frame
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:rapid-taps
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:queue
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:capacity
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:embedded-scroll
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:demo
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:practice-fit
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:feedback
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:navigation
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:glass
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:timer
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:languages
BASE_URL=http://localhost:4173 BROWSER_EXECUTABLE_PATH=/usr/bin/chromium npm run test:voice
```

浏览器检查覆盖手机及 iframe 连点、重复点击去重、重开清空待处理点击、实际点击二十关、七格满槽终局和重开、三语练习及玻璃分类、存档、长时间停留不超时、押金小票、动画、不同像素密度、短窗口和两层 iframe。模拟检查不能代替真实 iPhone Safari 或 Game Jolt 的最终设备测试。

手机和矮嵌入框将重开按钮并入进度栏，并压缩牌面、传送带及玻璃桶的占位。断点以游戏 iframe 自己的宽高为准。`test:mobile-frame` 固定外层浏览器大小，只改变跨域双层 iframe 的尺寸，覆盖三语、第三/五/二十关、框架高度变化和外层缩放后的实际触屏点击；常见小屏检查瓶子及回收桶至少 44px，极矮框检查全部内容可见且无滚动。游戏不能修改跨域平台外层的框架尺寸或消除平台本身的裁切。

## 发布

GitHub Pages 的 main 推送会运行单元测试和构建，再发布 `dist/`。

- 测试网站：https://logic-syd.github.io/PfandPause/
- Game Jolt：https://gamejolt.com/games/pfand-pause/1106213
- Game Jolt 后台：https://gamejolt.com/dashboard/games/1106213/packages

Game Jolt 版本由账号持有人上传；代码或 Pages 更新不会自动替换 Game Jolt 文件。打包时 ZIP 根目录需包含 `index.html` 和 `assets/`。当前按用户要求先测试，不生成新 ZIP。详细上传说明见 `docs/GAMEJOLT.md`。

## 声音

用户提供的英语 MP3 保存在 `src/assets/voice/win-en.mp3`，约 40 KB / 2.5 秒，台词为 “All sorted! Time for a little pause.”。正式关卡与自由试玩通关后在英语、声音开启时播放。退出、换语言或静音取消播放，音频失败不阻碍游戏。没有生成额外配音。
