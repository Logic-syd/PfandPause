// Regression: removing the visible clock must also remove hidden timeout logic.
import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { levels } from '../src/data/levels';
import { createPuzzle } from '../src/game/triple';
const url = process.env.BASE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium' });
try {
  const context = await browser.newContext({ viewport:{width:390,height:844}, hasTouch:true });
  await context.addInitScript(() => !localStorage.getItem('pfand-pause:v1') && localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:[1,2,3,4,5,6],campaignVersion:2})));
  const page = await context.newPage(), errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install(); await page.goto(url);
  await page.locator('.home-actions .primary').first().click();
  const assertNoClock = async () => assert.equal(await page.locator('.round-clock,.final-countdown,[role="timer"]').count(),0);
  await assertNoClock();
  await page.clock.fastForward(3600000);
  assert.equal(await page.locator('.lost').count(),0);
  await page.locator('.tile-card:enabled').first().click();
  await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));
  assert.match(await page.locator('.game-toolbar').innerText(),/1 moves/);
  await page.locator('.help-button').click();
  assert.ok((await page.locator('.rules').innerText()).includes('No timer'));
  await page.clock.fastForward(3600000);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  assert.equal(await page.locator('.lost').count(),0);
  await page.getByRole('button',{name:'Start again',exact:true}).click();
  assert.match(await page.locator('.game-toolbar').innerText(),/0 moves/);
  await page.evaluate(()=>localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:Array.from({length:11},(_,i)=>i+1),campaignVersion:2})));
  await page.reload(); await page.locator('.home-actions .primary').first().click();
  const {state,solution} = createPuzzle(levels[11]);
  const glassAt = solution.findIndex(id=>state.tiles[id].bottle.startsWith('glass'));
  for (const id of solution.slice(0,glassAt)) {
    await page.locator(`[data-column="${id}"]`).click();
    await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));
  }
  const glassId=solution[glassAt], type=state.tiles[glassId].bottle;
  const wrong=type==='glassBrown'?'glassGreen':'glassBrown';
  await page.locator(`[data-column="${glassId}"]`).click();
  for(let i=0;i<2;i++) await page.locator(`[data-bin="${wrong}"]`).click();
  assert.equal(await page.locator('.penalty-flash').innerText(),'Wrong bank!');
  assert.match(await page.locator('.round-status').innerText(),/2\/3/);
  await page.clock.fastForward(3600000);
  assert.equal(await page.locator('.lost').count(),0); await assertNoClock();
  await page.locator(`[data-bin="${wrong}"]`).click();
  await page.locator('.lost').waitFor();
  assert.equal(await page.locator('.lost h2').innerText(),'Wrong bins in this bag: 3');
  await page.getByRole('button',{name:'Try this bag again',exact:true}).click();
  assert.match(await page.locator('.round-status').innerText(),/0\/3/);
  assert.deepEqual(errors,[]);
  console.log('PASS no visible or hidden timer after hours of play, help and restart; glass mistakes count without time penalties and the third ends the round');
  await context.close();
} finally { await browser.close(); }
