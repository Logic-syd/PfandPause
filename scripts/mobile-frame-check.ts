import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const url = process.env.BASE_URL ?? "http://localhost:5173";
const portal = new URL(url);
portal.port = String(Number(portal.port) + 1);
const browser = await chromium.launch({ headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}),
});
mkdirSync("artifacts", { recursive: true });
try {
  for (const language of ["zh", "en", "de"]) {
    const context = await browser.newContext({ viewport: { width: 1000, height: 900 }, hasTouch: true, deviceScaleFactor: 3,
      permissions: ["local-network-access"] });
    await context.addInitScript(language => localStorage.setItem("pfand-pause:v1", JSON.stringify({
      language, sound: false, reducedMotion: true, campaignVersion: 2,
      completed: Array.from({ length: 14 }, (_, i) => i + 1),
    })), language);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    // The parent is deliberately cross-origin and its size never changes.
    // Only the two nested, non-scrolling portal frames resize during play.
    await page.route("**/mobile-portal", route => route.fulfill({ contentType: "text/html", body:
      `<style>body{margin:0;overflow:hidden}iframe{display:block;width:320px;height:512px;border:0;margin:60px 20px;transform-origin:top left}</style><iframe scrolling="no" src="${portal.origin}/mobile-shell"></iframe>` }));
    await page.route("**/mobile-shell", route => route.fulfill({ contentType: "text/html", body:
      `<style>html,body{margin:0;height:100%;overflow:hidden}iframe{display:block;border:0;width:100%;height:100%}</style><iframe scrolling="no" src="${url}/?mobile-frame"></iframe>` }));
    await page.goto(`${portal.origin}/mobile-portal`);
    await page.frameLocator("iframe").frameLocator("iframe").locator(".home-actions .primary").first().tap();
    const frame = page.frames().find(frame => frame.url().includes("?mobile-frame"))!;
    assert.equal(await frame.evaluate(() => { try { return !!parent.document; } catch { return false; } }), false,
      "This regression must exercise an inaccessible cross-origin parent");
    for (const [width, height, outerScale] of [[320,512,1],[390,600,1],[390,460,1],[844,334,1],[320,264,1],[390,732,1],[390,600,.8]]) {
      await page.locator("iframe").evaluate((element, dimensions) => {
        const [w, h, scale] = dimensions;
        element.style.width = `${w}px`; element.style.height = `${h}px`; element.style.transform = `scale(${scale})`;
      }, [width, height, outerScale]);
      await frame.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
      assert.deepEqual(await frame.evaluate(() => [innerWidth, innerHeight]), [width, height]);
      for (const level of [2,4,13]) {
        await frame.locator(".level-link").tap();
        await frame.locator(".level-card").nth(level).tap();
        const geometry = await frame.evaluate(() => {
          const root = document.getElementById("root")!;
          const bounds = document.querySelector(".board-viewport")!.getBoundingClientRect();
          const elements = [...document.querySelectorAll(".tile-card, .tray-slot, .tray-danger, .glass-bin")];
          const rects = elements.map(element => element.getBoundingClientRect());
          const targets = [...document.querySelectorAll(".tile-card:enabled, .glass-bin")].map(element => element.getBoundingClientRect());
          return {
            fitted: rects.every(r => r.top >= bounds.top - 1 && r.bottom <= bounds.bottom + 1 && r.left >= bounds.left - 1 && r.right <= bounds.right + 1),
            noScroll: root.scrollHeight <= root.clientHeight + 1 && root.scrollWidth <= root.clientWidth + 1,
            smallestTarget: Math.min(...targets.flatMap(r => [r.width, r.height])),
          };
        });
        assert.ok(geometry.fitted && geometry.noScroll, JSON.stringify({ width, height, level, geometry }));
        if (height >= 512 || width >= 700) assert.ok(geometry.smallestTarget >= 44 - .1,
          `Phone controls need usable targets: ${JSON.stringify({ language, width, height, level, geometry })}`);
        await frame.locator('.tile-card:enabled:not(:has([data-bottle-type^="glass"]))').first().tap();
        assert.equal(await frame.locator(".tray-slot.occupied").count(), 1, "Frame offsets/scaling must not shift taps");
        assert.equal(await frame.locator(".game-screen").count(), 1);
      }
      if (language === "zh" && outerScale === 1 && height === 512) await page.screenshot({ path: "artifacts/mobile-frame-320.png" });
      console.log(`PASS ${language} cross-origin frame ${width}×${height}, parent scale ${outerScale}: three dense rounds, resize, visible slots/bins, accurate taps`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  }
} finally { await browser.close(); }
