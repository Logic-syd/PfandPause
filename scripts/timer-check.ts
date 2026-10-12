import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { levels } from '../src/data/levels';
import { createGame, solveState } from '../src/game/triple';
const url=process.env.BASE_URL ?? 'http://localhost:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium'});
try {
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  await context.addInitScript(()=>!localStorage.getItem('pfand-pause:v1') && localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:[1,2,3,4],campaignVersion:2})));
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.clock.install();await page.goto(url);await page.locator('.home-actions .primary').first().click();
  const seconds=async()=> {const match=(await page.locator('.round-clock').innerText()).match(/(\d+):(\d+)/)!;return Number(match[1])*60+Number(match[2]);};
  const boardGeometry=async()=> {
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    return page.evaluate(()=>({
      scale:document.querySelector<HTMLElement>('.board-viewport')!.dataset.scale,
      boxes:[...document.querySelectorAll('.board-viewport, .tile-counter, .tray-slot')].map(element=>{
        const rect=element.getBoundingClientRect();
        return [rect.x,rect.y,rect.width,rect.height];
      }),
    }));
  };
  const initial=await seconds();await page.clock.fastForward(10000);assert.ok((await seconds())<=initial-9);
  await page.locator('.help-button').click();const paused=await seconds();await page.clock.fastForward(20000);assert.equal(await seconds(),paused);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Undo',exact:true}).count(),0);
  assert.equal(await page.locator('.tray-danger').innerText(),'Seven full slots. Game over.');
  await page.locator('.tile-card:enabled').first().click();await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));
  const geometryBeforeNotice=await boardGeometry();
  await page.clock.fastForward(((await seconds())-11)*1000);
  assert.equal(await page.locator('.final-countdown').count(),0,'The large countdown starts only in the final ten seconds');
  await page.clock.fastForward(1000);assert.equal(await page.locator('.final-countdown').innerText(),'10');
  assert.deepEqual(await boardGeometry(),geometryBeforeNotice,'The countdown must not move or rescale the board');
  await page.locator('.help-button').click();const pausedCountdown=await seconds();
  await page.clock.fastForward(20000);assert.equal(await seconds(),pausedCountdown);
  assert.equal(await page.locator('.final-countdown').count(),0,'The countdown pauses while help is open');
  await page.getByRole('button',{name:'Close',exact:true}).click();assert.equal(await page.locator('.final-countdown').innerText(),'10');
  await page.clock.fastForward(1000);assert.equal(await page.locator('.final-countdown').innerText(),'9');
  await page.clock.fastForward(8000);assert.equal(await page.locator('.final-countdown').innerText(),'1');
  await page.clock.fastForward(1000);await page.locator('.lost').waitFor();assert.equal(await page.locator('.lost h2').innerText(),'The supermarket is closed');
  assert.equal(await page.locator('.lost .result-content > p').innerText(),'Come back tomorrow.');
  assert.equal(await page.locator('.final-countdown').count(),0,'Expired rounds never retain the countdown overlay');
  assert.equal(await page.locator('.lost button').filter({hasText:'Undo'}).count(),0);
  await page.getByRole('button',{name:'One more go',exact:true}).click();assert.ok((await seconds())>=initial-1);
  assert.equal(await page.locator('.final-countdown').count(),0,'Restart clears the countdown');
  await page.locator('.brand').click();await page.locator('.pause-dialog').getByRole('button',{name:'Choose a level',exact:true}).click();
  // Seed an existing ten-level save through a reload to test the first glass level.
  await page.evaluate(()=>localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:[1,2,3,4,5,6,7,8,9,10,11],campaignVersion:2})));
  await page.reload();await page.locator('.home-actions .primary').first().click();
  const initialGlass=createGame(levels[11]), route=solveState(initialGlass).path!;const glassAt=route.findIndex(id=>initialGlass.tiles[id].bottle.startsWith('glass'));
  for(const id of route.slice(0,glassAt)){await page.locator(`[data-column="${id}"]`).click();await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));}
  const glassId=route[glassAt], glassType=initialGlass.tiles[glassId].bottle, wrongType=glassType==='glassBrown'?'glassGreen':'glassBrown';
  await page.locator(`[data-column="${glassId}"]`).click();const start=await seconds();
  for(let i=0;i<2;i++) await page.locator(`[data-bin="${wrongType}"]`).click();
  assert.equal(await page.locator('.penalty-flash').innerText(),'−10 seconds');
  assert.ok((await seconds())<=start-20);
  assert.match(await page.locator('.round-clock').innerText(),/2\/3/);
  await page.locator(`[data-bin="${wrongType}"]`).click();await page.locator('.lost').waitFor();
  assert.equal(await page.locator('.lost h2').innerText(),'Wrong choices this round: 3');
  await page.getByRole('button',{name:'One more go',exact:true}).click();assert.match(await page.locator('.round-clock').innerText(),/0\/3/);
  assert.deepEqual(errors,[]);console.log('PASS final countdown runs 10→1 without layout shifts, help pauses, timer counts elapsed time, glass costs 10s, no undo controls, timeout and third mistake end rounds, restart resets timer and mistakes');
  await context.close();
} finally {await browser.close();}
