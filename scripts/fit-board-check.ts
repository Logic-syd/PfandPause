import { chromium, type Frame } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { translations, type Language } from "../src/i18n";

const url = process.env.BASE_URL ?? "http://localhost:5173";
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}),
});
const errors: string[] = [];
mkdirSync("artifacts", { recursive: true });
const sizes = [[240,320],[320,320],[320,568],[390,568],[390,844],[844,390],
  [1280,431],[1280,720],[1920,320],[2560,1440],[3840,2160]];
async function fitted(frame: Frame) {
  const result = await frame.evaluate(() => {
    const root = document.getElementById("root")!;
    const space = document.querySelector(".board-viewport")!.getBoundingClientRect();
    const targets = [...document.querySelectorAll("[data-column], .buffer-slot, .crate-body")];
    return {
      vertical: root.scrollHeight <= root.clientHeight + 1 && root.scrollTop === 0,
      horizontal: root.scrollWidth <= root.clientWidth + 1,
      hiddenBars: getComputedStyle(root).scrollbarWidth === "none",
      inside: targets.every(target => {
        const r = target.getBoundingClientRect();
        return r.top >= space.top - 1 && r.bottom <= space.bottom + 1
          && r.left >= space.left - 1 && r.right <= space.right + 1;
      }),
      clipped: targets.flatMap(target => {
        const r = target.getBoundingClientRect();
        return r.top >= space.top - 1 && r.bottom <= space.bottom + 1
          && r.left >= space.left - 1 && r.right <= space.right + 1 ? [] : [{
            className: target.className, top:r.top, bottom:r.bottom, left:r.left, right:r.right,
            bounds:{ top:space.top,bottom:space.bottom,left:space.left,right:space.right },
          }];
      }),
      header: document.querySelector(".header")!.getBoundingClientRect().height,
      toolbarVisible: document.querySelector(".game-toolbar")!.getBoundingClientRect().bottom <= root.clientHeight + 1,
      toolbarBottom: document.querySelector(".game-toolbar")!.getBoundingClientRect().bottom,
      scale: document.querySelector<HTMLElement>(".board-viewport")!.dataset.scale,
    };
  });
  assert.ok(result.vertical && result.horizontal, `No round may require scrolling: ${JSON.stringify(result)}`);
  assert.ok(result.inside, `Bottles, spare spots, crates and actions must remain visible: ${JSON.stringify(result)}`);
  assert.ok(result.hiddenBars && result.toolbarVisible);
  assert.ok(result.header <= 48);
  return result;
}
try {
  for (const [i, size] of sizes.entries()) {
    const [width,height] = size;
    const language: Language = (["zh","en","de"] as const)[i % 3];
    const t = translations[language];
    const context = await browser.newContext({ viewport: { width,height },
      hasTouch: true, isMobile: true, locale: { zh:"zh-CN",en:"en-US",de:"de-DE" }[language] });
    await context.addInitScript(language => localStorage.setItem("pfand-pause:v1", JSON.stringify({
      language, sound:false, reducedMotion:false, completed:[1,2,3,4,5,6,7,8,9,10],
    })), language);
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/fit-portal", route => route.fulfill({ contentType:"text/html",
      body:`<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:calc(100% - 56px);border:0}</style><header style="height:56px">Portal</header><iframe scrolling="no" src="${url}/fit-frame"></iframe>` }));
    await page.route("**/fit-frame", route => route.fulfill({ contentType:"text/html",
      body:`<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:100%;border:0}</style><iframe scrolling="no" src="${url}/?fit-test"></iframe>` }));
    await page.goto(`${url}/fit-portal`);
    await page.frameLocator("iframe").frameLocator("iframe").locator(".home-actions .primary").first().tap();
    await page.frameLocator("iframe").frameLocator("iframe").locator(".game-screen").waitFor();
    const frame = page.frames().find(frame => frame.url().includes("?fit-test"))!;
    assert.equal(await frame.locator("dialog[open]").count(), 0, "No startup dialog may block play");
    assert.equal(await frame.locator(".landing").count(), 0);
    await fitted(frame);
    await frame.locator('[data-column="0"]').tap();
    await frame.waitForFunction(() => !document.querySelector(".stacks.is-busy"));
    assert.match(await frame.locator(".game-toolbar").innerText(), new RegExp(`1 ${t.moves}`));
    await frame.getByRole("button", { name:t.undo,exact:true }).tap();
    for (let level = 0; level < 10; level++) {
      await frame.getByRole("button", { name:t.chooseLevel,exact:true }).tap();
      await frame.locator(".level-card").nth(level).tap();
      await fitted(frame);
    }
    if (width === 1280 && height === 720) {
      // Resize the same deep board across portrait/landscape layouts, as when
      // rotating a phone or changing browser zoom while the game is open.
      for (const [nextWidth,nextHeight] of [[390,568],[844,390],[1280,431],[1280,720]]) {
        await page.setViewportSize({ width:nextWidth,height:nextHeight });
        await frame.evaluate(() => new Promise<void>(resolve =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
        await fitted(frame);
        await frame.locator('[data-column="0"]').tap();
        await frame.waitForFunction(() => !document.querySelector(".stacks.is-busy"));
        assert.match(await frame.locator(".game-toolbar").innerText(), new RegExp(`1 ${t.moves}`));
        await frame.getByRole("button", { name:t.undo,exact:true }).tap();
      }
    }
    if (width === 390 && height === 844) {
      await page.screenshot({ path:"artifacts/compact-mobile-level10.png" });
      await frame.getByRole("button", { name:t.chooseLevel,exact:true }).tap();
      await frame.locator(".level-card").first().tap();
      await page.screenshot({ path:"artifacts/compact-mobile-level1.png" });
    }
    if (width === 1280 && height === 431) await page.screenshot({ path:"artifacts/compact-short-desktop.png" });
    console.log(`PASS ${width}×${height}: ${language}, home → play, tap/undo, all 10 complete boards fit, no page scrolling or scrollbars`);
    await context.close();
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
