import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createGame, availableTiles } from '../src/game/triple';
import { levels } from '../src/data/levels';
import { translations } from '../src/i18n';
const base=process.env.BASE_URL ?? 'http://localhost:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium'});
try {
  for(const [width,height] of [[390,844],[1280,720]]) for(const language of ['zh','en','de'] as const) {
    const t=translations[language],context=await browser.newContext({viewport:{width,height},hasTouch:true});
    await context.addInitScript(language=>localStorage.setItem('pfand-pause:v1',JSON.stringify({language,sound:false,reducedMotion:false,completed:Array.from({length:20},(_,i)=>i+1),campaignVersion:2})),language);
    const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base);await page.locator('.home-actions .primary').first().click();
    const notice=page.locator('.tray-danger');
    const geometry=async()=>page.evaluate(()=>[...document.querySelectorAll('.board-viewport,.tray-slot,.tray-danger')].map(e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
    assert.equal(await notice.getAttribute('data-state'),'normal');assert.equal(await notice.innerText(),t.trayDanger);
    assert.equal(await notice.locator('svg,.capacity-alert').count(),0,'An empty tray must not show an error symbol');
    const normalColour=await notice.evaluate(e=>getComputedStyle(e).backgroundColor);
    const originalGeometry=await geometry(),first=createGame(levels[0]);
    const ids=(type:string)=>first.tiles.filter(tile=>tile.bottle===type).map(tile=>tile.id);
    const water=ids('water'),lemon=ids('lemon'),currant=ids('currant');
    const pending=[...water.slice(0,2),...lemon.slice(0,2),...currant.slice(0,2)];
    for(const [index,id] of pending.entries()) {
      await page.locator(`[data-column="${id}"]`).tap();
      await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));
      assert.deepEqual(await geometry(),originalGeometry,'Capacity notices must not reflow or rescale the board');
      if(index===4) {assert.equal(await notice.getAttribute('data-state'),'nearly');assert.ok((await notice.innerText()).includes(t.trayNearlyFull));}
    }
    assert.equal(await notice.getAttribute('data-state'),'last');assert.ok((await notice.innerText()).includes(t.trayLastSlot));
    assert.notEqual(await notice.evaluate(e=>getComputedStyle(e).backgroundColor),normalColour);
    assert.equal(await page.locator('.last-free-slot:not(.occupied)').count(),1);
    if(language==='zh'&&width===390)await page.screenshot({path:'artifacts/capacity-last-slot-mobile.png'});
    if(language==='en'&&width===1280)await page.screenshot({path:'artifacts/capacity-last-slot-desktop.png'});
    await page.locator(`[data-column="${water[2]}"]`).tap();
    await page.locator('.tray-danger[data-state="clearing"]').waitFor();
    assert.equal(await notice.innerText(),t.trayClearing);assert.equal(await page.locator('.last-free-slot').count(),0);
    assert.equal(await page.locator('.tray-full-dialog').count(),0,'A seventh matching bottle must not be presented as failure');
    await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));
    assert.equal(await page.locator('.tray-slot.occupied').count(),4);assert.equal(await notice.getAttribute('data-state'),'normal');
    await page.locator('.level-link').click();await page.locator('.level-card').nth(4).click();
    const state=createGame(levels[4]),counts=new Map<string,number>();
    const lose=availableTiles(state).filter(id=>{const type=state.tiles[id].bottle,count=counts.get(type)??0;if(count>=2)return false;counts.set(type,count+1);return true;}).slice(0,7);
    assert.equal(lose.length,7);
    for(const id of lose){await page.locator(`[data-column="${id}"]`).tap();await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));}
    await page.locator('.tray-full-dialog').waitFor();assert.equal(await notice.getAttribute('data-state'),'full');
    assert.equal(await page.locator('.fault-german-label').innerText(),'AUSSER BETRIEB');
    await page.getByRole('button',{name:t.machineFaultRetry,exact:true}).click();
    assert.equal(await notice.getAttribute('data-state'),'normal');assert.equal(await page.locator('.tray-slot.occupied').count(),0);
    assert.deepEqual(errors,[]);await context.close();
    console.log(`PASS ${width}×${height} ${language}: neutral start, five/six-slot warning, fixed geometry, seventh-bottle triple, actual full loss and fresh retry`);
  }
} finally {await browser.close();}
