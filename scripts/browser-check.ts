import { chromium, type Page } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { levels } from "../src/data/levels";
import { createGame, takeBottle } from "../src/game/engine";
import { solveLevel } from "../src/game/solver";
import type { GameState } from "../src/game/types";
const url = process.env.BASE_URL ?? "http://localhost:5173";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const errors: string[] = [];
const results: string[] = [];
mkdirSync("artifacts", { recursive: true });
const check = (message: string) => {
  results.push(message);
  console.log(`PASS ${message}`);
};
function monitor(page: Page) {
  page.on("pageerror", (error) => errors.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
}
async function settled(page: Page) {
  await page.waitForFunction(() => !document.querySelector(".stacks.is-busy"));
}
async function pick(page: Page, column: number) {
  const button = page.locator(`[data-column="${column}"]`);
  if (await page.evaluate(() => navigator.maxTouchPoints > 0))
    await button.tap();
  else await button.click();
  await settled(page);
}
async function noOverflow(page: Page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    "Horizontal overflow",
  );
}
async function boardSnapshot(page: Page) {
  return page.evaluate(() => ({
    columns: [...document.querySelectorAll("[data-column]")].map((e) =>
      e.getAttribute("aria-label"),
    ),
    buffer: [...document.querySelectorAll('[data-place^="buffer-"]')].map((e) =>
      e.getAttribute("aria-label"),
    ),
    crates: [...document.querySelectorAll('[data-place^="crate-"]')].map((e) =>
      e.getAttribute("aria-label"),
    ),
    toolbar: document.querySelector(".game-toolbar")?.textContent,
    progress: document.querySelector(".level-progress")?.textContent,
  }));
}
function lossPath(state: GameState, path: number[] = []): number[] | null {
  if (state.status === "lost") return path;
  if (state.status === "won") return null;
  for (let i = 0; i < state.columns.length; i++)
    if (state.columns[i].length) {
      const found = lossPath(takeBottle(state, i).state, [...path, i]);
      if (found) return found;
    }
  return null;
}
try {
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "en-US",
    isMobile: true,
    hasTouch: true,
  });
  const page = await mobile.newPage();
  monitor(page);
  await page.goto(url);
  await noOverflow(page);
  await page.screenshot({ path: "artifacts/start-mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: "Choose a level", exact: true })
    .click();
  assert.equal(await page.locator(".level-card:disabled").count(), 9);
  check("Fresh save unlocks only level 1");
  await page.locator(".level-card").first().click();
  await page.locator(".tutorial-dialog").waitFor();
  const beforePractice = await boardSnapshot(page);
  await page.waitForTimeout(250); // Capture after the opening fade completes.
  await page.screenshot({
    path: "artifacts/tutorial-mobile.png",
    fullPage: true,
  });
  await noOverflow(page);
  const practiceActions = [0, 1, 2, 3, null, 0, 0, 3, 1, 1, 1];
  for (const [step, column] of practiceActions.entries()) {
    if (column === null)
      await page
        .getByRole("button", { name: "Undo this move", exact: true })
        .click();
    else await page.locator(`[data-tutorial-column="${column}"]`).tap();
    await page.waitForFunction(
      (expected) =>
        document.querySelector(".practice-board")?.getAttribute("data-step") ===
        String(expected),
      step + 1,
    );
    if (step === 0)
      assert.match(
        (await page
          .locator(".practice-crate")
          .first()
          .getAttribute("aria-label"))!,
        /Water, 1\/3/,
      );
    if (step === 3) {
      assert.equal(await page.locator(".practice-buffer .occupied").count(), 3);
      await page.screenshot({
        path: "artifacts/tutorial-failure-mobile.png",
        fullPage: true,
      });
    }
    if (step === 4)
      assert.equal(await page.locator(".practice-buffer .occupied").count(), 2);
    if (step === 6) {
      assert.equal(await page.locator(".practice-buffer .occupied").count(), 0);
      assert.match(
        (await page
          .locator(".practice-crate")
          .first()
          .getAttribute("aria-label"))!,
        /Berry, 2\/3/,
      );
      await page.screenshot({
        path: "artifacts/tutorial-auto-transfer-mobile.png",
        fullPage: true,
      });
    }
  }
  await page
    .getByRole("heading", { name: "You’ve got it!", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Got it", exact: true }).click();
  assert.deepEqual(await boardSnapshot(page), beforePractice);
  assert.equal(
    (
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("pfand-pause:v1")!),
      )
    ).completed.length,
    0,
  );
  check(
    "Guided practice teaches matching, deliberate failure, undo, automatic transfers and winning without changing the real game",
  );
  const initial = await boardSnapshot(page);
  await page.locator('[data-column="0"]').evaluate((element) => {
    for (let i = 0; i < 30; i++) (element as HTMLButtonElement).click();
  });
  await settled(page);
  assert.match((await page.locator(".game-toolbar").textContent())!, /1 moves/);
  check("30 simultaneous clicks produce exactly one move during animation");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await boardSnapshot(page), initial);
  check("Undo restores full visible state after animation");
  await pick(page, 1);
  await page.getByRole("button", { name: "Start again", exact: true }).click();
  assert.deepEqual(await boardSnapshot(page), initial);
  assert.equal(await page.locator(".tutorial-dialog").count(), 0);
  check("Restart resets the full board and skipped tutorial stays dismissed");
  await pick(page, 1);
  const inProgress = await boardSnapshot(page);
  await page
    .getByRole("button", { name: "How to play", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Show me how", exact: true }).click();
  await page.locator('[data-tutorial-column="0"]').tap();
  await page
    .getByRole("button", { name: "Skip tutorial", exact: true })
    .click();
  await page.waitForTimeout(400);
  assert.deepEqual(await boardSnapshot(page), inProgress);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  assert.deepEqual(await boardSnapshot(page), initial);
  check(
    "Replay and skip during an animation preserve the current level and its undo history",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page
    .getByRole("switch", { name: "Reduce motion", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Gentle sounds", exact: true })
    .click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.locator('[data-column="0"]').evaluate((element) => {
    for (let i = 0; i < 30; i++) (element as HTMLButtonElement).click();
  });
  await settled(page);
  assert.match((await page.locator(".game-toolbar").textContent())!, /1 moves/);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  check(
    "Reduced-motion mode also locks simultaneous clicks until the UI updates",
  );
  for (const [index, level] of levels.entries()) {
    if (level.id === 2) {
      const baseline = await boardSnapshot(page);
      const failure = lossPath(createGame(level));
      assert.ok(failure);
      let beforeLast: Awaited<ReturnType<typeof boardSnapshot>> | undefined;
      for (const [i, column] of failure.entries()) {
        if (i === failure.length - 1) beforeLast = await boardSnapshot(page);
        await pick(page, column);
      }
      await page.locator("dialog.lost").waitFor();
      await page.screenshot({
        path: "artifacts/failure-mobile.png",
        fullPage: true,
      });
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Undo", exact: true })
        .click();
      assert.deepEqual(await boardSnapshot(page), beforeLast);
      check("Real failure screen and undo recover the entire pre-loss state");
      await page
        .getByRole("button", { name: "Start again", exact: true })
        .click();
      assert.deepEqual(await boardSnapshot(page), baseline);
      // Water, Berry, Water, Berry, Water: replacement drains two waiting berries.
      const before = await boardSnapshot(page);
      for (const c of [0, 0, 1, 1]) await pick(page, c);
      assert.equal(await page.locator(".buffer-slot.occupied").count(), 2);
      const preCascade = await boardSnapshot(page);
      await pick(page, 2);
      assert.equal(await page.locator(".buffer-slot.occupied").count(), 0);
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      assert.deepEqual(await boardSnapshot(page), preCascade);
      check(
        "Undo restores waiting bottles, old crate and order queue after auto-transfer",
      );
      await page
        .getByRole("button", { name: "Start again", exact: true })
        .click();
      assert.deepEqual(await boardSnapshot(page), before);
    }
    const solution = solveLevel(level);
    assert.ok(solution.path);
    await noOverflow(page);
    if ([3, 6, 10].includes(level.id))
      await page.screenshot({
        path: `artifacts/level-${level.id}-mobile.png`,
        fullPage: true,
      });
    await page.locator(".order-count-button").click();
    assert.equal(
      await page.getByRole("dialog").locator(".all-orders li").count(),
      level.orders.length,
    );
    await page.getByRole("button", { name: "Close", exact: true }).click();
    for (const column of solution.path) await pick(page, column);
    await page.locator("dialog.won").waitFor();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("pfand-pause:v1")!),
    );
    assert.ok(saved.completed.includes(level.id));
    check(
      `Level ${level.id} completed in the browser (${solution.path.length} moves)`,
    );
    if (index < levels.length - 1)
      await page
        .getByRole("button", { name: "Next level", exact: true })
        .click();
  }
  await page.screenshot({
    path: "artifacts/all-complete-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Choose a level", exact: true })
    .click();
  assert.equal(await page.locator(".level-card.complete").count(), 10);
  await page.screenshot({
    path: "artifacts/levels-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Deutsch", exact: true }).click();
  await page.getByRole("button", { name: "Schließen", exact: true }).click();
  await page.reload();
  assert.equal(await page.locator("html").getAttribute("lang"), "de");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("pfand-pause:v1")!),
  );
  assert.equal(saved.sound, false);
  assert.equal(saved.reducedMotion, true);
  assert.equal(saved.completed.length, 10);
  check("All progress, language, sound and motion settings survive reload");
  await page.getByRole("button", { name: "Level wählen", exact: true }).click();
  await page.locator(".level-card").last().click();
  await page.screenshot({
    path: "artifacts/level-10-mobile-de.png",
    fullPage: true,
  });
  for (const width of [320, 360, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
  }
  check(
    "No horizontal overflow at 320, 360, 390, 768 and 1280px (deepest German level)",
  );
  const desktop = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: "de-DE",
  });
  const desk = await desktop.newPage();
  monitor(desk);
  await desk.goto(url);
  assert.equal(await desk.locator("html").getAttribute("lang"), "de");
  await desk.screenshot({
    path: "artifacts/start-desktop.png",
    fullPage: true,
  });
  await desk.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await desk.getByRole("button", { name: "Überspringen", exact: true }).click();
  await desk.screenshot({ path: "artifacts/game-desktop.png", fullPage: true });
  await noOverflow(desk);
  check("German browser default and desktop layout");
  for (const c of solveLevel(levels[0]).path!) await pick(desk, c);
  await desk.locator("dialog.won").waitFor();
  check("Desktop mouse play completes a full level with animation");
  const blocked = await browser.newContext({ locale: "fr-FR" });
  // A string avoids tsx injecting a Node-only __name helper into serialized callbacks.
  await blocked.addInitScript(`
    Object.defineProperty(Storage.prototype, 'getItem', { value: function () { throw new Error('blocked'); } });
    Object.defineProperty(Storage.prototype, 'setItem', { value: function () { throw new Error('blocked'); } });
  `);
  const blockedPage = await blocked.newPage();
  monitor(blockedPage);
  await blockedPage.goto(url);
  assert.equal(await blockedPage.locator("html").getAttribute("lang"), "en");
  await blockedPage.locator(".save-error").waitFor();
  await blockedPage
    .getByRole("button", { name: "Let’s sort", exact: true })
    .click();
  await blockedPage
    .getByRole("button", { name: "Skip tutorial", exact: true })
    .click();
  await pick(blockedPage, 0);
  check(
    "Unavailable localStorage is nonfatal; unsupported language falls back to English",
  );
  const corrupt = await browser.newContext();
  await corrupt.addInitScript(() =>
    localStorage.setItem("pfand-pause:v1", "{not-json"),
  );
  const corruptPage = await corrupt.newPage();
  monitor(corruptPage);
  await corruptPage.goto(url);
  await corruptPage
    .getByRole("button", { name: "Let’s sort", exact: true })
    .waitFor();
  check("Corrupt save recovers safely");
  const legacy = await browser.newContext({
    viewport: { width: 390, height: 844 },
    locale: "de-DE",
  });
  await legacy.addInitScript(
    `if (!localStorage.getItem('pfand-pause:v1')) localStorage.setItem('pfand-pause:v1', JSON.stringify({language:'de',sound:false,reducedMotion:true,tutorialSeen:true,completed:[1,2]}));`,
  );
  const legacyPage = await legacy.newPage();
  monitor(legacyPage);
  await legacyPage.goto(url);
  await legacyPage
    .getByRole("button", { name: "Weitersortieren", exact: true })
    .click();
  await legacyPage.locator(".tutorial-dialog").waitFor();
  await legacyPage.screenshot({
    path: "artifacts/tutorial-mobile-de.png",
    fullPage: true,
  });
  await noOverflow(legacyPage);
  await legacyPage
    .getByRole("button", { name: "Überspringen", exact: true })
    .click();
  await legacyPage.reload();
  await legacyPage
    .getByRole("button", { name: "Weitersortieren", exact: true })
    .click();
  assert.equal(await legacyPage.locator(".tutorial-dialog").count(), 0);
  await legacyPage
    .getByRole("button", { name: "Pfand Pause · Startseite", exact: true })
    .click();
  await legacyPage
    .getByRole("button", { name: "Zeig mir, wie’s geht", exact: true })
    .click();
  await legacyPage.locator(".tutorial-dialog").waitFor();
  await legacyPage.keyboard.press("Escape");
  assert.deepEqual(
    (
      await legacyPage.evaluate(() =>
        JSON.parse(localStorage.getItem("pfand-pause:v1")!),
      )
    ).completed,
    [1, 2],
  );
  check(
    "Old saves see the new tutorial once; home replay and Escape keep saved progress",
  );
  assert.deepEqual(errors, []);
  check("No browser console or runtime errors");
} finally {
  writeFileSync(
    "artifacts/browser-report.json",
    JSON.stringify({ url, results, errors }, null, 2),
  );
  await browser.close();
}
