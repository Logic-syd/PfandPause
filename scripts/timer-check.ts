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
  const boardGeometry=async()=> {
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    return page.evaluate(()=>({
      scale:document.querySelector<HTMLElement>('.board-viewport')!.dataset.scale,
      boxes:[...document.querySelectorAll('.board-viewport, .counter, .buffer-slot, .crate-body')].map(element=>{
        const rect=element.getBoundingClientRect();
        return [rect.x,rect.y,rect.width,rect.height];
      }),
    }));
  };
  const initial=await seconds();await page.clock.fastForward(10000);assert.ok((await seconds())<=initial-9);
  await page.locator('.help-button').click();const paused=await seconds();await page.clock.fastForward(20000);assert.equal(await seconds(),paused);
  await page.getByRole('button',{name:'Close',exact:true}).click();
  const undoBox=await page.getByRole('button',{name:'Undo',exact:true}).boundingBox();
  const restartBox=await page.getByRole('button',{name:'Start again',exact:true}).boundingBox();
  assert.ok(undoBox && restartBox && undoBox.x>restartBox.x,'Undo belongs on the right');
  const reminder=await page.locator('.buffer-reminder').innerText();
  assert.equal(reminder,'Storage full? No more bottles fit—make some room.');
  const blocked={path:[1,3,3,3],column:3};
  for(const column of blocked.path) {await page.locator(`[data-column="${column}"]`).click();await page.waitForFunction(()=>!document.querySelector('.stacks.is-busy'));}
  const before=await seconds();const moves=await page.locator('.game-toolbar').innerText();
  const geometryBeforeNotice=await boardGeometry();
  await page.locator(`[data-column="${blocked.column}"]`).click();assert.equal(await page.locator('.game-toolbar').innerText(),moves);assert.ok((await seconds())<=before-5);
  assert.equal(await page.locator('.penalty-flash[role="status"]').innerText(),'−5 seconds');
  assert.deepEqual(await boardGeometry(),geometryBeforeNotice,'Showing the penalty must not move or rescale the board');
  await page.clock.fastForward(1000);
  const beforeRepeat=await seconds();
  await page.locator(`[data-column="${blocked.column}"]`).click();
  assert.ok((await seconds())<=beforeRepeat-5,'Repeated mistakes deduct time again');
  await page.clock.fastForward(1000);
  assert.equal(await page.locator('.penalty-flash').count(),1,'A repeated mistake restarts the flash duration');
  await page.clock.fastForward(700);
  assert.equal(await page.locator('.penalty-flash').count(),0,'The deduction flash clears automatically');
  assert.equal(await page.locator('.buffer-reminder').innerText(),reminder,'The storage reminder stays visible');
  assert.deepEqual(await boardGeometry(),geometryBeforeNotice,'Flash expiry must not move or rescale the board');
  const deducted=await seconds();await page.getByRole('button',{name:'Undo',exact:true}).click();assert.ok((await seconds())<=deducted);
  assert.equal(await page.locator('.penalty-flash').count(),0);
  assert.deepEqual(await boardGeometry(),geometryBeforeNotice,'Clearing the penalty must not move or rescale the board');
  await page.clock.fastForward(180000);await page.locator('.lost').waitFor();assert.equal(await page.locator('.lost h2').innerText(),'Time is up');
  assert.equal(await page.locator('.lost button').filter({hasText:'Undo'}).count(),0);
  await page.getByRole('button',{name:'Try again',exact:true}).click();assert.ok((await seconds())>=initial-1);
  await page.locator('.brand').click();await page.getByRole('button',{name:'Choose a level',exact:true}).click();
  // Seed an existing ten-level save through a reload to test the first glass level.
  await page.evaluate(()=>localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:[1,2,3,4,5,6,7,8,9,10]})));
  await page.reload();await page.locator('.home-actions .primary').first().click();
  await page.locator('[data-column="0"]').click();const start=await seconds();
  for(let i=0;i<2;i++) await page.locator('[data-bin="glassBrown"]').click();
  assert.equal(await page.locator('.penalty-flash').innerText(),'−10 seconds');
  assert.ok((await seconds())<=start-20);
  await page.locator('.bottle-pick:not(:has([data-bottle-type^="glass"]))').first().click();await page.waitForFunction(()=>!document.querySelector('.stacks.is-busy'));
  await page.getByRole('button',{name:'Undo',exact:true}).click();assert.match(await page.locator('.round-clock').innerText(),/2\/3/);
  await page.locator('[data-column="0"]').click();await page.locator('[data-bin="glassBrown"]').click();await page.locator('.lost').waitFor();
  assert.equal(await page.locator('.lost h2').innerText(),'Wrong choices this round: 3');
  await page.getByRole('button',{name:'Try again',exact:true}).click();assert.match(await page.locator('.round-clock').innerText(),/0\/3/);
  assert.deepEqual(errors,[]);console.log('PASS timer counts elapsed time, help pauses, buffer costs 5s without moving or rescaling the board on notice/undo, glass costs 10s, undo cannot refund penalties, timeout and third mistake end rounds, restart resets timer and mistakes');
  await context.close();
} finally {await browser.close();}
