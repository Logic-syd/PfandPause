import { chromium } from "@playwright/test";
import { readFileSync, mkdirSync } from "node:fs";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  locale: "en-US",
  isMobile: true,
  hasTouch: true,
});
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
mkdirSync("artifacts", { recursive: true });
await page.goto("http://localhost:5173");
await page.screenshot({ path: "artifacts/start-mobile.png", fullPage: true });
await page.getByRole("button", { name: "Let’s sort", exact: true }).click();
await page.screenshot({
  path: "artifacts/tutorial-mobile.png",
  fullPage: true,
});
await page.getByRole("button", { name: "Skip tutorial", exact: true }).click();
const solutions = JSON.parse(readFileSync("docs/solutions.json", "utf8"));
for (const solution of solutions.slice(0, 3)) {
  await page.screenshot({
    path: `artifacts/level-${solution.level}-mobile.png`,
    fullPage: true,
  });
  for (const column of solution.path) {
    const button = page.locator(`[data-column="${column - 1}"]`);
    await button.click();
    await page.waitForFunction(
      () => !document.querySelector(".stacks.is-busy"),
    );
  }
  await page.getByRole("dialog").waitFor();
  if (!(await page.locator("dialog.won").isVisible())) throw Error("Not won");
  console.log(`Browser: level ${solution.level} won`);
  await page.screenshot({
    path: `artifacts/win-${solution.level}-mobile.png`,
    fullPage: true,
  });
  if (solution.level < 3)
    await page.getByRole("button", { name: "Next level", exact: true }).click();
}
console.log("Page errors:", errors);
await browser.close();
if (errors.length) process.exit(1);
