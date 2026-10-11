import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
const url=process.env.BASE_URL ?? 'http://localhost:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium'});
try {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  await context.addInitScript(()=>!localStorage.getItem('pfand-pause:v1') && localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:[1,2,3,4]})));
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.goto(url);await page.locator('.home-actions .primary').first().click();
  const seconds=async()=> {const match=(await page.locator('.round-clock').innerText()).match(/(\d+):(\d+)/)!;return Number(match[1])*60+Number(match[2]);};
  const initial=await seconds();await page.clock.fastForward(10000);assert.ok((await seconds())<=initial-9);
  await page.locator('.help-button').click();const paused=await seconds();await page.clock.fastForward(20000);assert.equal(await seconds(),paused);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  const blocked={path:[0,1,3],column:0};
  for(const column of blocked.path) {await page.locator(`[data-column="${column}"]`).click();await page.waitForFunction(()=>!document.querySelector('.stacks.is-busy'));}
  const before=await seconds();const moves=await page.locator('.game-toolbar').innerText();
  await page.locator(`[data-column="${blocked.column}"]`).click();assert.equal(await page.locator('.game-toolbar').innerText(),moves);assert.ok((await seconds())<=before-5);
  await page.locator('.time-penalty').waitFor();const deducted=await seconds();await page.getByRole('button',{name:'Undo',exact:true}).click();assert.ok((await seconds())<=deducted);
  await page.clock.fastForward(180000);await page.locator('.lost').waitFor();assert.equal(await page.locator('.lost h2').innerText(),'Time is up');
  assert.equal(await page.locator('.lost button').filter({hasText:'Undo'}).count(),0);
  await page.getByRole('button',{name:'Try again',exact:true}).click();assert.ok((await seconds())>=initial-1);
  await page.locator('.brand').click();await page.getByRole('button',{name:'Choose a level',exact:true}).click();
  // Seed an existing ten-level save through a reload to test the first glass level.
  await page.evaluate(()=>localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:[1,2,3,4,5,6,7,8,9,10]})));
  await page.reload();await page.locator('.home-actions .primary').first().click();
  await page.locator('[data-column="0"]').click();const start=await seconds();
  for(let i=0;i<2;i++) await page.locator('[data-bin="glassBrown"]').click();
  assert.ok((await seconds())<=start-20);
  await page.locator('.bottle-pick:not(:has([data-bottle-type^="glass"]))').first().click();await page.waitForFunction(()=>!document.querySelector('.stacks.is-busy'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.match(await page.locator('.round-clock').innerText(),/2\/3/);
  await page.locator('[data-column="0"]').click();await page.locator('[data-bin="glassBrown"]').click();await page.locator('.lost').waitFor();
  assert.equal(await page.locator('.lost h2').innerText(),'Wrong choices this round: 3');
  await page.getByRole('button',{name:'Try again',exact:true}).click();assert.match(await page.locator('.round-clock').innerText(),/0\/3/);
  assert.deepEqual(errors,[]);console.log('PASS timer counts elapsed time, help pauses, buffer costs 5s, glass costs 10s, undo cannot refund penalties, timeout and third mistake end rounds, restart resets timer and mistakes');
  await context.close();
} finally {await browser.close();}
