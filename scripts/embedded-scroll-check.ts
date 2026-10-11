import { chromium, type BrowserContext, type Page, type Frame } from "@playwright/test";
import assert from "node:assert/strict";
import { TUTORIAL_VERSION } from "../src/data/tutorial";
import { translations } from "../src/i18n";

const url = process.env.BASE_URL ?? "http://localhost:5173";
const gameUrl = url;
const frameOrigin = new URL(url);
frameOrigin.port = String(Number(frameOrigin.port) + 1);
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}),
});
const t = translations.zh;
const errors: string[] = [];
async function swipe(context: BrowserContext, page: Page, x: number, from: number, to: number) {
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: from }] });
  for (let i = 1; i <= 10; i++) {
    await session.send("Input.dispatchTouchEvent", { type: "touchMove",
      touchPoints: [{ x, y: from + (to - from) * i / 10 }] });
    await page.waitForTimeout(30);
  }
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.waitForTimeout(500);
  await session.detach();
}
async function select(frame: Frame, index: number) {
  await frame.locator(".brand").tap();
  await frame.getByRole("button", { name: t.chooseLevel, exact: true }).tap();
  await frame.locator(".level-card").nth(index).tap();
}
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 700 },
    isMobile: true, hasTouch: true, deviceScaleFactor: 3,
    permissions: ["local-network-access"] });
  await context.addInitScript(tutorialVersion => {
    localStorage.setItem("pfand-pause:v1", JSON.stringify({ language: "zh", sound: false,
      reducedMotion: false, completed: [1,2,3,4,5,6,7,8,9,10], tutorialSeen: true, tutorialVersion }));
    document.addEventListener("DOMContentLoaded", () => {
      // Fault injection: touch events arrive but the browser does not pan.
      // Simulate an embedded browser that cannot natively pan inside its frame.
      const style = document.createElement("style");
      style.textContent = "#root, dialog { touch-action: none !important; }";
      document.head.append(style);
    });
  }, TUTORIAL_VERSION);
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(error.message));
  page.on("requestfailed", request => console.error("Request failed:", request.url(), request.failure()?.errorText));
  await page.route("**/scroll-portal", route => route.fulfill({ contentType: "text/html",
    body: `<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:calc(100% - 56px);border:0}</style><header style="height:56px">Portal</header><iframe scrolling="no" src="${frameOrigin.origin}/scroll-frame"></iframe>` }));
  await page.route("**/scroll-frame", route => route.fulfill({ contentType: "text/html",
    body: `<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:100%;border:0}</style><iframe scrolling="no" src="${gameUrl}/?scroll-compat"></iframe>` }));
  await page.goto(`${url}/scroll-portal`);
  await page.frameLocator("iframe").frameLocator("iframe").locator(".game-screen").waitFor({ timeout: 5000 });
  const frame = page.frames().find(frame => frame.url().includes("?scroll-compat"))!;
  assert.equal(await frame.evaluate(() => innerWidth), 390);
  await select(frame, 1);
  const box = await frame.locator('[data-column="0"]').boundingBox();
  assert.ok(box);
  await swipe(context, page, box.x + box.width / 2, box.y + box.height - 12, box.y - 90);
  assert.equal(await frame.locator("#root").evaluate(el => el.scrollTop), 0,
    "The fitted board must stay fixed when swiped inside a portal");
  assert.match(await frame.locator(".game-toolbar").innerText(), new RegExp(`0 ${t.moves}`),
    "Swiping a bottle must not pick it up");
  console.log("PASS cross-origin nested frame: fitted board stays fixed when swiped; no accidental move");
  await swipe(context, page, 195, 160, 500);
  assert.equal(await frame.locator("#root").evaluate(el => el.scrollTop), 0);
  await frame.locator('[data-column="0"]').tap();
  await frame.waitForFunction(() => !document.querySelector(".stacks.is-busy"));
  assert.match(await frame.locator(".game-toolbar").innerText(), new RegExp(`1 ${t.moves}`));
  await frame.getByRole("button", { name: t.undo, exact: true }).tap();
  console.log("PASS reverse swipe, then bottle tap and undo remain usable");

  await page.setViewportSize({ width: 390, height: 568 });
  await select(frame, 9);
  await frame.locator(".order-count-button").tap();
  const dialog = frame.locator("dialog[open]");
  const orders = dialog.locator(".all-orders");
  const ordersBox = await orders.boundingBox();
  assert.ok(ordersBox);
  const background = await frame.locator("#root").evaluate(el => el.scrollTop);
  await swipe(context, page, ordersBox.x + ordersBox.width / 2,
    ordersBox.y + ordersBox.height - 20, ordersBox.y + 20);
  assert.ok(await orders.evaluate(el => el.scrollTop) > 0, "The list inside the order dialog must scroll independently");
  assert.equal(await frame.locator("#root").evaluate(el => el.scrollTop), background);
  await frame.getByRole("button", { name: t.close, exact: true }).tap();
  console.log("PASS short viewport: order dialog scrolls without moving the board behind it");

  await frame.evaluate(() => {
    const root = document.getElementById("root")!;
    root.scrollTop = 0;
    const startTouches = [new Touch({ identifier: 1, target: root, clientX: 190, clientY: 300 }),
      new Touch({ identifier: 2, target: root, clientX: 220, clientY: 300 })];
    const movedTouches = [new Touch({ identifier: 1, target: root, clientX: 190, clientY: 150 }),
      new Touch({ identifier: 2, target: root, clientX: 220, clientY: 450 })];
    root.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: startTouches }));
    const event = new TouchEvent("touchmove", { bubbles: true, cancelable: true, touches: movedTouches });
    root.dispatchEvent(event);
    if (event.defaultPrevented || root.scrollTop !== 0) throw new Error("Two-finger gestures must be left to the browser");
    root.dispatchEvent(new TouchEvent("touchend", { bubbles: true, touches: [] }));
  });
  console.log("PASS two-finger gestures are not intercepted");
  await context.close();

  // Direct links also keep the entire board visible and accept bottle taps.
  const direct = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true });
  await direct.addInitScript(tutorialVersion => localStorage.setItem("pfand-pause:v1", JSON.stringify({
    language: "zh", sound: false, completed: [1,2,3,4,5,6,7,8,9,10], tutorialSeen: true, tutorialVersion,
  })), TUTORIAL_VERSION);
  const directPage = await direct.newPage();
  directPage.on("pageerror", error => errors.push(error.message));
  await directPage.goto(gameUrl);
  await select(directPage.mainFrame(), 1);
  await swipe(direct, directPage, 195, 560, 200);
  assert.equal(await directPage.locator("#root").evaluate(el => el.scrollTop), 0);
  await directPage.locator('[data-column="0"]').tap();
  await directPage.waitForFunction(() => !document.querySelector(".stacks.is-busy"));
  assert.match(await directPage.locator(".game-toolbar").innerText(), new RegExp(`1 ${t.moves}`));
  console.log("PASS direct game stays fitted and bottle taps remain usable");
  await direct.close();
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
