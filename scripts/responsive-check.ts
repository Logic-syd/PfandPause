import { chromium, type Frame, type Locator } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { levels } from "../src/data/levels";
import { TUTORIAL_VERSION } from "../src/data/tutorial";
import { translations, type Language } from "../src/i18n";
import { solveLevel } from "../src/game/solver";

const url = process.env.BASE_URL ?? "http://localhost:5173";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH
    ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH }
    : {}),
});
const errors: string[] = [];
mkdirSync("artifacts", { recursive: true });
const sizes = [
  { width: 320, height: 568, scale: 2, touch: true, language: "de" },
  { width: 390, height: 844, scale: 3, touch: true, language: "zh" },
  { width: 844, height: 390, scale: 2, touch: true, language: "en" },
  { width: 1280, height: 720, scale: 2, touch: false, language: "en" },
  { width: 1707, height: 960, scale: 1.5, touch: false, language: "de" },
  { width: 2560, height: 1440, scale: 1, touch: false, language: "en" },
  { width: 3840, height: 2160, scale: 1, touch: false, language: "en" },
] as const;

async function settled(frame: Frame) {
  await frame.waitForFunction(() => !document.querySelector(".stacks.is-busy"));
}
async function noOverflow(frame: Frame) {
  assert.ok(await frame.evaluate(() => {
    const root = document.getElementById("root")!;
    return root.scrollWidth <= root.clientWidth && root.clientHeight <= innerHeight
      && (!document.querySelector(".game-screen") || (root.scrollHeight <= root.clientHeight && root.scrollTop === 0))
      && getComputedStyle(root).scrollbarWidth === "none"
      && document.documentElement.scrollWidth <= innerWidth;
  }), "The entire embedded round must fit without page scrolling");
}

try {
  for (const size of sizes) {
    const language: Language = size.language;
    const t = translations[language];
    const context = await browser.newContext({
      viewport: { width: size.width, height: size.height },
      deviceScaleFactor: size.scale,
      hasTouch: size.touch,
      isMobile: size.touch,
      locale: { en: "en-US", de: "de-DE", zh: "zh-CN" }[language],
    });
    await context.addInitScript(({ language, tutorialVersion }) => {
      localStorage.setItem("pfand-pause:v1", JSON.stringify({
        language, sound: false, reducedMotion: false,
        completed: Array.from({ length: 10 }, (_, i) => i + 1),
        tutorialSeen: true, tutorialVersion,
      }));
    }, { language, tutorialVersion: TUTORIAL_VERSION });
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    // Game Jolt uses two nested frames with scrolling="no". A portal toolbar
    // also reduces the actual game height below the monitor's resolution.
    await page.route("**/portal-test", route => route.fulfill({
      contentType: "text/html",
      body: `<meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:calc(100% - 56px);border:0}</style><header style="height:56px">Game portal</header><iframe src="${url}/portal-frame" scrolling="no"></iframe>`,
    }));
    await page.route("**/portal-frame", route => route.fulfill({
      contentType: "text/html",
      body: `<meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:100%;border:0}</style><iframe src="${url}/?embedded-test" scrolling="no" allow="autoplay; fullscreen"></iframe>`,
    }));
    await page.goto(`${url}/portal-test`);
    await page.frameLocator("iframe").frameLocator("iframe").locator(".game-screen").waitFor();
    const frame = page.frames().find(frame => frame.url().includes("?embedded-test"))!;
    assert.equal(await frame.evaluate(() => innerWidth), size.width,
      "The portal must preserve the phone viewport instead of using a desktop layout viewport");
    const press = (button: Locator) => size.touch ? button.tap() : button.click();
    await press(frame.getByRole("button", { name: t.chooseLevel, exact: true }));
    await press(frame.locator(".level-card").nth(9));
    await noOverflow(frame);
    const pick = frame.locator('[data-column="0"]');
    const box = await pick.boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, "Bottles need usable tap targets");
    await press(pick);
    if (size.width === 1280) {
      // Simulate moving between displays or resizing while a bottle is flying.
      await page.setViewportSize({ width: 960, height: 540 });
    }
    await settled(frame);
    await noOverflow(frame);
    assert.match(await frame.locator(".game-toolbar").innerText(), new RegExp(`1 ${t.moves}`));
    await press(frame.getByRole("button", { name: t.undo, exact: true }));
    await settled(frame);
    assert.match(await frame.locator(".game-toolbar").innerText(), new RegExp(`0 ${t.moves}`));
    if (size.width === 1280) {
      await page.setViewportSize({ width: size.width, height: size.height });
    }

    // Wheel or touch input must not move a fitted board inside nested frames.
    await frame.evaluate(() => document.getElementById("root")!.scrollTo(0, 0));
    const bounds = await frame.locator("#root").boundingBox();
    assert.ok(bounds);
    {
      if (size.touch) {
        const touchSession = await context.newCDPSession(page);
        const x = bounds.x + bounds.width - 16;
        const y = bounds.y + bounds.height * 0.7;
        await touchSession.send("Input.dispatchTouchEvent", {
          type: "touchStart", touchPoints: [{ x, y }],
        });
        for (const distance of [30, 70, 110, 150]) {
          await touchSession.send("Input.dispatchTouchEvent", {
            type: "touchMove", touchPoints: [{ x, y: y - distance }],
          });
          await page.waitForTimeout(30);
        }
        await touchSession.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await touchSession.detach();
      } else {
        await page.mouse.move(bounds.x + bounds.width - 12, bounds.y + bounds.height / 2);
        await page.mouse.wheel(0, 700);
      }
      await noOverflow(frame);
    }
    await press(frame.getByRole("button", { name: t.restart, exact: true }));
    assert.equal(await frame.evaluate(() => document.getElementById("root")!.scrollTop), 0);
    await press(frame.locator(".order-count-button"));
    await frame.locator("dialog[open]").waitFor();
    await press(frame.getByRole("button", { name: t.close, exact: true }));

    await press(frame.locator(".brand"));
    await press(frame.getByRole("button", { name: t.recyclingEntry, exact: true }));
    await noOverflow(frame);
    await press(frame.locator(".recycling-choices button").first());
    await frame.locator(".recycling-feedback").waitFor();
    await press(frame.locator(".brand"));
    assert.equal(await frame.evaluate(() => document.getElementById("root")!.scrollTop), 0);

    // First-time tutorial remains independently scrollable; controls can be
    // reached with touch at phone and short landscape heights.
    await press(frame.getByRole("button", { name: t.learn, exact: true }));
    await frame.locator(".tutorial-dialog").waitFor();
    await press(frame.locator(".practice-target"));
    await frame.waitForFunction(() => document.querySelector(".practice-board")?.getAttribute("data-step") === "1");
    await press(frame.getByRole("button", { name: t.skip, exact: true }));
    await page.screenshot({ path: `artifacts/embedded-${size.width}x${size.height}.png` });

    // Complete a real animated level after scrolling and opening dialogs.
    await press(frame.getByRole("button", { name: t.chooseLevel, exact: true }));
    await press(frame.locator(".level-card").first());
    for (const column of solveLevel(levels[0]).path!) {
      await press(frame.locator(`[data-column="${column}"]`));
      await settled(frame);
    }
    await frame.locator(".result-dialog.won").waitFor();
    console.log(`PASS nested iframe ${size.width}×${size.height} @${size.scale}: ${language}, ${size.touch ? "touch" : "mouse"}, fitted board, undo, restart, orders, recycling, tutorial, animated win`);
    await context.close();
  }
  const faultContext = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await faultContext.addInitScript(tutorialVersion => {
    localStorage.setItem("pfand-pause:v1", JSON.stringify({
      language: "en", sound: true, reducedMotion: false, completed: [],
      tutorialSeen: true, tutorialVersion,
    }));
    AudioContext.prototype.createOscillator = () => {
      throw new Error("Simulated unavailable audio output");
    };
  }, TUTORIAL_VERSION);
  const faultPage = await faultContext.newPage();
  faultPage.on("pageerror", error => errors.push(error.message));
  await faultPage.goto(url);
  await faultPage.locator(".game-screen").waitFor();
  const faultFrame = faultPage.mainFrame();
  for (const column of solveLevel(levels[0]).path!) {
    await faultPage.locator(`[data-column="${column}"]`).click();
    await settled(faultFrame);
  }
  await faultPage.locator(".result-dialog.won").waitFor();
  await faultPage.getByRole("button", { name: "Play again", exact: true }).click();
  await faultPage.locator('[data-column="0"]').click();
  await settled(faultFrame);
  await faultPage.getByRole("button", { name: "Undo", exact: true }).click();
  assert.match(await faultPage.locator(".game-toolbar").innerText(), /0 moves/);
  console.log("PASS unavailable audio output cannot lock the board: animated win, replay and undo remain usable");
  await faultContext.close();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
