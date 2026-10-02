import { chromium, type Page } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_CHANNEL
    ? { channel: process.env.BROWSER_CHANNEL }
    : {}),
});
const base = process.env.BASE_URL ?? "http://localhost:4173";
const results: string[] = [];
const errors: string[] = [];
const report = (s: string) => {
  results.push(s);
  console.log(`PASS ${s}`);
};
type VoiceAudit = {
  startAt: number;
  clock: number;
  duration: number;
  peak: number;
  rms: number;
  state: string;
  stopped: boolean;
  ended: boolean;
};
const instrumentation = `
  window.__voiceAudit=[];
  const original=AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource=function(){
    const node=original.call(this), context=this;
    const originalStart=node.start.bind(node), originalStop=node.stop.bind(node);
    let row;
    node.start=function(at=0){
      const data=node.buffer.getChannelData(0);let peak=0,sum=0;
      for(const sample of data){peak=Math.max(peak,Math.abs(sample));sum+=sample*sample;}
      row={startAt:at,clock:context.currentTime,duration:node.buffer.duration,peak,rms:Math.sqrt(sum/data.length),state:context.state,stopped:false,ended:false};
      window.__voiceAudit.push(row);
      node.addEventListener('ended',()=>{row.ended=true;});
      return originalStart(at);
    };
    node.stop=function(){if(row)row.stopped=true;return originalStop();};
    return node;
  };
`;
async function setup(language = "en", sound = true, broken = false) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: language === "de" ? "de-DE" : "en-US",
  });
  await context.addInitScript(
    `localStorage.setItem('pfand-pause:v1',JSON.stringify({language:${JSON.stringify(language)},sound:${sound},reducedMotion:true,tutorialSeen:true,tutorialVersion:2,completed:[]}));\n${instrumentation}`,
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(String(e)));
  if (broken)
    await page.route("**/*.mp3", (route) =>
      route.fulfill({
        status: 200,
        contentType: "audio/mpeg",
        body: "invalid audio data",
      }),
    );
  await page.goto(base);
  assert.equal((await audit(page)).length, 0);
  return page;
}
async function audit(page: Page): Promise<VoiceAudit[]> {
  return page.evaluate("window.__voiceAudit");
}
async function winLevel(page: Page) {
  for (const column of [0, 0, 1, 1, 2, 2]) {
    await page.locator(`[data-column="${column}"]`).tap();
    await page.waitForFunction(
      () => !document.querySelector(".stacks.is-busy"),
    );
  }
  await page.locator("dialog.won").waitFor();
}
try {
  const page = await setup();
  await page.getByRole("button", { name: "Let’s sort", exact: true }).click();
  await winLevel(page);
  await page.waitForFunction(
    "window.__voiceAudit.length === 1 && window.__voiceAudit[0].ended",
  );
  const first = (await audit(page))[0];
  assert.ok(first.duration > 2 && first.duration < 3);
  assert.ok(first.rms > 0.005);
  assert.ok(first.peak > 0.05 && first.peak <= 1);
  assert.equal(first.state, "running");
  assert.ok(first.startAt - first.clock >= 0.4);
  assert.equal(first.stopped, false);
  report(
    `English mobile win decodes and plays the real recording once (${first.duration.toFixed(3)}s, peak ${first.peak.toFixed(3)}) after the chime`,
  );
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await winLevel(page);
  await page.waitForFunction("window.__voiceAudit.length === 2");
  await page.getByRole("button", { name: "Next level", exact: true }).click();
  assert.equal((await audit(page))[1].stopped, true);
  report(
    "Entering the next level cancels the previous voice, including scheduled playback",
  );

  const muted = await setup("en", false);
  await muted.getByRole("button", { name: "Let’s sort", exact: true }).click();
  await winLevel(muted);
  await muted.waitForTimeout(600);
  assert.equal((await audit(muted)).length, 0);
  report("Sound off: English victory stays silent");
  const german = await setup("de", true);
  await german.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await winLevel(german);
  await german.waitForTimeout(600);
  assert.equal((await audit(german)).length, 0);
  report("German mode keeps existing chimes without playing an English voice");

  const practice = await setup();
  await practice
    .getByRole("button", { name: "Show me how", exact: true })
    .click();
  for (const [i, column] of [0, 1, 2, 3, null, 0, 0, 3, 1, 1, 1].entries()) {
    if (column === null)
      await practice
        .getByRole("button", { name: "Undo this move", exact: true })
        .click();
    else await practice.locator(`[data-tutorial-column="${column}"]`).tap();
    await practice.waitForFunction(
      (step) =>
        document.querySelector(".practice-board")?.getAttribute("data-step") ===
        String(step),
      i + 1,
    );
  }
  await practice.waitForFunction("window.__voiceAudit.length === 1");
  await practice.getByRole("button", { name: "Got it", exact: true }).click();
  assert.equal((await audit(practice))[0].stopped, true);
  report(
    "Practice completion plays the same clip once; leaving practice stops it",
  );

  const broken = await setup("en", true, true);
  await broken.getByRole("button", { name: "Let’s sort", exact: true }).click();
  await winLevel(broken);
  await broken.waitForTimeout(600);
  assert.equal((await audit(broken)).length, 0);
  await broken.getByRole("button", { name: "Next level", exact: true }).click();
  assert.ok(await broken.locator(".game-screen").isVisible());
  report(
    "Invalid audio does not block victory, progress or moving to the next level",
  );
  assert.deepEqual(errors, []);
  report("No browser runtime errors or unhandled audio rejections");
  mkdirSync("artifacts/voice", { recursive: true });
  writeFileSync(
    "artifacts/voice/playback-report.json",
    JSON.stringify({ url: base, results, errors, recording: first }, null, 2),
  );
} finally {
  await browser.close();
}
