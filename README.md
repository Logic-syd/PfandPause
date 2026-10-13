# Pfand Pause

[English](#english) · [简体中文](#简体中文)

## English

The match is over. You have a bag full of empty bottles and a deposit to collect. At the supermarket, the return machine has other ideas: it only takes **three identical bottles at a time**. The queue behind you is getting impatient.

**Pfand Pause** is a browser-based, layered tile-matching puzzle set at a German bottle return machine. Tap exposed bottles, make triples, and keep the seven-slot counter from filling up.

[Play in your browser](https://logic-syd.github.io/PfandPause/) · [Game Jolt](https://gamejolt.com/games/pfand-pause/1106213) · [Download the 2.0 HTML5 package](https://raw.githubusercontent.com/Logic-syd/PfandPause/main/downloads/PfandPause-html5-2.0.zip)

### How to play

1. **Tap an exposed bottle.** Bright cards are available; dimmed cards are covered by another card. Remove the cards above them to reveal what is underneath. No dragging or swapping is needed.
2. **Use the shared seven-slot counter.** Every deposit bottle you pick goes into the same counter. Matching bottles group together automatically.
3. **Collect three identical bottles.** The machine takes the triple, frees those slots, and adds the simulated deposit to your return total. Matching is by bottle type, not deposit value: two different bottles worth €0.15 do not match.
4. **Keep room for the next bottle.** If all seven slots remain occupied after matching is resolved, the machine jams and you lose the round. A seventh bottle that completes a triple is collected first, so it does **not** cause a loss.
5. **Empty the whole bag to win.** Return every deposit bottle and, in later rounds, recycle every non-deposit glass bottle. Your deposit slip shows the bottles returned, simulated refund, and glass recycled.

There are **no undo, shuffle, or extra storage tools**. A full counter ends the round; “try another machine” restarts the same bag from the beginning.

### Twenty rounds, no timer

| Rounds | What changes |
| --- | --- |
| 1–2 | Smaller bags, fewer bottle types, and simpler layouts. |
| 3–10 | More bottle types, deeper overlapping layers, and stacks on both sides. From round 5, all ten deposit-bottle types are in play. |
| 11–20 | Non-deposit glass joins the bag alongside increasingly dense bottle stacks. |

Look at what your next pick will uncover, rather than taking every available bottle. The later bags require planning around unfinished triples and the limited counter space.

**There is no countdown, time penalty, or timeout.** People behind you rotate through impatient comments. Leave the machine idle and the crowd becomes more restless, with optional background effects. They can grumble; you can still take your time.

### Glass bottles from round 11

Non-deposit glass follows a separate route:

- Tap an exposed non-deposit glass bottle, then tap its matching **clear, brown, or green glass bank**.
- Choose by the glass colour, not the label. Glass bottles do not occupy the seven-slot counter and do not earn a deposit.
- A wrong bank counts as one mistake and leaves the bottle on the board. The **third wrong placement in the same round ends the round**.

Deposit bottles still belong in the return machine. The three-at-a-time requirement is a fictional game mechanic; real deposits and accepted packaging depend on the bottle and the shop.

### Other ways to play

- **Try a small bag:** an optional 12-bottle demo with four bottle types and overlapping layers. It uses the same seven-slot loss rule and does not change campaign progress.
- **Where does this bottle go?** Eight optional packaging questions about returning deposit bottles and recycling non-deposit glass. Correct and incorrect answers have distinct visual and sound feedback, followed by an explanation.
- **English, Chinese, and German:** switch directly from the header. Sound and reduced-motion options are available in settings. Game effects remain; there is no spoken victory recording.
- **Local progress:** completed rounds and preferences are stored in the current browser. Saves do not sync between devices or between the GitHub Pages and Game Jolt sites.

### Run locally

Built with React, TypeScript, and Vite. Use Node.js **20.19 or newer**; `.nvmrc` pins 20.19.2.

```sh
npm ci
npm run dev
```

The development server normally runs at `http://localhost:5173`. To build and preview the production version:

```sh
npm run build
npm run preview
```

The preview normally runs at `http://localhost:4173`. Run the game through an HTTP server rather than opening `index.html` directly.

The layout adapts to its actual container, including mobile screens and embedded iframes. Mouse, touch, and keyboard activation with Tab and Enter / Space are supported. Embedded layouts and touch input are checked in Chromium; real Safari and the hosting platform still need device testing. The game cannot resize a cross-origin host iframe.

### Development and checks

The active rules are in [`src/game/triple.ts`](src/game/triple.ts), the twenty-round campaign in [`src/data/levels.ts`](src/data/levels.ts), and the layered layouts in [`src/game/layout.ts`](src/game/layout.ts). [`TripleBoard`](src/components/TripleBoard.tsx) renders the board and counter; [`FitBoard`](src/components/FitBoard.tsx) handles container fitting. Older engine files remain for historical regression checks and are not the current gameplay.

```sh
npm test
npm run solve
npm run build
```

`solve` exports verification paths; these are not shown to players. With the production preview running, representative browser checks are:

```sh
npm run test:browser
npm run test:demo
npm run test:mobile-frame
npm run test:audio
```

These scripts default to `http://localhost:4173`. Set `BASE_URL` or `BROWSER_EXECUTABLE_PATH` for another server or Chromium executable. See [`docs/VERIFICATION.md`](docs/VERIFICATION.md) for validation records.

### Publishing and credits

Pushing `main` runs tests and builds the GitHub Pages site. **Game Jolt updates are separate:** upload the HTML5 ZIP under **Upload Browser Build** and publish the release. The 2.0 package uses release number **2.0.0**; its root contains `index.html` and `assets/`. See [`downloads/README.md`](downloads/README.md) and [`docs/GAMEJOLT.md`](docs/GAMEJOLT.md).

Bottle SVGs, the shop illustration, and the Pfand Pause branding were created for this project. Bottle research references [GDB](https://www.gdb.de/mehrweg/flaschen-und-kaesten/), [RAPP](https://www.rapp.de/shop/alkoholfreie-rapp-getraenke/), and [Karamalz](https://www.karamalz.de/produkte/karamalz-classic/); their packaging artwork is not used. Seven-slot matching and overlap research references [yulegeyu](https://github.com/liyupi/yulegeyu). This project's engine and layouts are implemented here, without those games' artwork, characters, recordings, or branding.

Recycling information references [DPG](https://dpg-pfandsystem.de/) and the [German consumer advice centres](https://www.verbraucherzentrale.de/wissen/umwelt-haushalt/abfall). Refunds in the game are simulated, not real payouts.

---

## 简体中文

球赛散场，你拎着一袋空瓶去超市，准备把押金拿回来。偏偏退瓶机坏了，**三个同款才肯收**，后面还有一队人在催。

**Pfand Pause** 是一款以德国退瓶机为背景的网页叠层三消游戏。点击露出的瓶子，凑齐三个同款，别把机器前的七格台面塞满。

[直接开玩](https://logic-syd.github.io/PfandPause/) · [Game Jolt](https://gamejolt.com/games/pfand-pause/1106213) · [下载 2.0 网页游戏包](https://raw.githubusercontent.com/Logic-syd/PfandPause/main/downloads/PfandPause-html5-2.0.zip)

### 怎么玩

1. **点击露出的瓶子。** 亮色卡片可以点；灰色卡片被上面的卡片挡住了，要先拿走遮挡它的瓶子。不需要拖动，也不需要交换位置。
2. **所有押金瓶共用七格台面。** 点到的押金瓶都会进入同一个台面，同款瓶子会自动排在一起。
3. **三个同款自动退走。** 凑齐三个，机器就会收下，空出位置，并累计模拟押金。配对看瓶型，不看金额：两种不同的瓶子即使都值 €0.15，也不能凑成一组。
4. **别让七格全部占满。** 匹配结算后，如果七格里仍有七个瓶子，本轮就输了。第七个瓶子如果刚好凑成三个同款，会先退走，**不会判输**。
5. **退完这一袋就过关。** 押金瓶全部退走，后期混入的无押金玻璃也全部回收后，本轮完成。结算小票显示退回瓶数、模拟押金合计和玻璃回收数量。

**没有撤销、洗牌或额外暂存道具。** 七格塞满就结束这一轮；“换台机器再退”是从头重开当前这一袋。

### 二十关，不限时

| 关卡 | 变化 |
| --- | --- |
| 第 1–2 关 | 瓶子较少、种类较少，叠层也比较简单。 |
| 第 3–10 关 | 瓶子种类、遮挡层数和两侧叠堆逐渐增加。第 5 关起包含全部十种押金瓶。 |
| 第 11–20 关 | 无押金玻璃混入袋中，瓶子堆也继续加深。 |

别只看哪个瓶子现在能点，还要看看拿走它之后会露出什么。后面的关卡需要规划拆层顺序，兼顾台面里没凑齐的瓶子和剩余空位。

**没有倒计时、扣秒或超时失败。** 后面的人会轮流吐槽；停太久不操作，催促和背景动静会更明显，声音可以关闭。他们催他们的，你可以慢慢想。

### 第十一关开始的玻璃分类

无押金玻璃走另一条路线：

- 先点击露出的无押金玻璃瓶，再点击对应的**白玻璃、棕玻璃或绿玻璃回收箱**。
- 看玻璃本身的颜色，不看标签颜色。玻璃回收不占七格台面，也不增加押金。
- 投错一次记一次错误，瓶子仍留在棋盘上。**同一轮累计投错三次，本轮结束。**

有押金的瓶子仍然退给机器。三个同款才能收是游戏设定；现实中的押金和商店接收范围，应以包装及商店说明为准。

### 其他入口与设置

- **先试一小袋：** 可选的十二瓶试玩，包含四种瓶型和遮挡，使用相同的七格满槽失败规则，不影响正式关卡进度。
- **这瓶扔哪？** 八道可选的包装判断题，区分退押金与无押金玻璃回收。答对、答错有不同的画面和音效反馈，作答后显示解释。
- **中文、英语、德语：** 顶部直接切换语言。设置里可以开关声音、减少动画；保留游戏音效，不播放通关配音。
- **本地进度：** 已完成关卡与偏好设置保存在当前浏览器。不同设备，以及 GitHub Pages 和 Game Jolt 两个站点之间，不会自动同步存档。

### 本地运行

使用 React、TypeScript 和 Vite。需要 Node.js **20.19 或更新版本**；`.nvmrc` 指定 20.19.2。

```sh
npm ci
npm run dev
```

开发服务器通常为 `http://localhost:5173`。构建并预览生产版本：

```sh
npm run build
npm run preview
```

预览通常为 `http://localhost:4173`。请通过 HTTP 服务器打开，不要直接双击 `index.html`。

布局根据实际容器适配电脑、手机和 iframe，支持鼠标、触控及 Tab 配合 Enter / Space 操作。嵌入布局与触控已用 Chromium 检查，真实 Safari 和平台页面仍需设备测试；游戏无法修改跨域平台外层 iframe 的尺寸。

### 开发与验证

当前规则在 [`src/game/triple.ts`](src/game/triple.ts)，二十关库存在 [`src/data/levels.ts`](src/data/levels.ts)，叠层布局在 [`src/game/layout.ts`](src/game/layout.ts)。[`TripleBoard`](src/components/TripleBoard.tsx) 渲染棋盘与台面，[`FitBoard`](src/components/FitBoard.tsx) 处理容器适配。旧引擎文件仅保留作历史回归，不代表当前玩法。

```sh
npm test
npm run solve
npm run build
```

`solve` 导出验证用的通关路径，不会向玩家显示答案。启动生产预览后，可运行以下浏览器检查：

```sh
npm run test:browser
npm run test:demo
npm run test:mobile-frame
npm run test:audio
```

脚本默认访问 `http://localhost:4173`，可通过 `BASE_URL` 或 `BROWSER_EXECUTABLE_PATH` 指定其他服务器或 Chromium 路径。验证记录见 [`docs/VERIFICATION.md`](docs/VERIFICATION.md)。

### 发布与来源

推送 `main` 会运行测试、构建并更新 GitHub Pages。**Game Jolt 需要单独更新：** 将 HTML5 ZIP 上传到 **Upload Browser Build** 后发布 Release。2.0 游戏包的版本号填 **2.0.0**，ZIP 根目录包含 `index.html` 和 `assets/`。详见 [`downloads/README.md`](downloads/README.md) 与 [`docs/GAMEJOLT.md`](docs/GAMEJOLT.md)。

瓶子 SVG、店铺插画及 Pfand Pause 品牌为本项目制作。瓶型研究参考 [GDB](https://www.gdb.de/mehrweg/flaschen-und-kaesten/)、[RAPP](https://www.rapp.de/shop/alkoholfreie-rapp-getraenke/) 和 [Karamalz](https://www.karamalz.de/produkte/karamalz-classic/)，未使用这些品牌的包装图片。七格配对与遮挡机制研究参考 [yulegeyu](https://github.com/liyupi/yulegeyu)；引擎和布局由本项目实现，未使用其他游戏的图片、角色、录音或品牌。

回收信息参考 [DPG](https://dpg-pfandsystem.de/) 和 [德国消费者中心](https://www.verbraucherzentrale.de/wissen/umwelt-haushalt/abfall)。游戏中的押金为模拟统计，不是真实兑付。
