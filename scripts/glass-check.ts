import { chromium, type Frame } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { levels } from '../src/data/levels';
import { translations } from '../src/i18n';
import { solveLevel } from '../src/game/solver';
import { returnStats } from '../src/game/returns';

const url=process.env.BASE_URL ?? 'http://localhost:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium'});
const errors:string[]=[];mkdirSync('artifacts',{recursive:true});
async function fits(frame:Frame, selector:string) {
  await frame.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  const result=await frame.evaluate(selector=>{
    const root=document.getElementById('root')!;
    return {overflow:root.scrollHeight-root.clientHeight,horizontal:root.scrollWidth-root.clientWidth,clipped:[...document.querySelectorAll<HTMLElement>(selector)].filter(e=>e.getClientRects().length).flatMap(e=>{
      const r=e.getBoundingClientRect(),b=e.closest('.board-viewport')?.getBoundingClientRect() ?? root.getBoundingClientRect();
      return r.left<b.left-1 || r.right>b.right+1 || r.top<b.top-1 || r.bottom>b.bottom+1 ? [{cls:e.className, rect:{x:r.x,y:r.y,width:r.width,height:r.height},bounds:{x:b.x,y:b.y,width:b.width,height:b.height}}] : [];
    })};
  },selector);
  assert.ok(result.overflow<=1 && result.horizontal<=1,JSON.stringify(result));assert.deepEqual(result.clipped,[],JSON.stringify(result));
}
try {
  for(const [width,height] of [[320,320],[390,844],[1280,431]]) for(const language of ['zh','en','de'] as const) {
    const t=translations[language];
    const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<900});
    await context.addInitScript(language=>!localStorage.getItem('pfand-pause:v1') && localStorage.setItem('pfand-pause:v1',JSON.stringify({language,sound:false,reducedMotion:true,completed:[1,2,3,4,5,6,7,8,9,10]})),language);
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/glass-portal',route=>route.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:calc(100% - 56px);border:0}</style><header style="height:56px">Portal</header><iframe scrolling="no" src="${url}/?glass-check"></iframe>`}));
    await page.goto(`${url}/glass-portal`);await page.frameLocator('iframe').locator('.home-screen').waitFor();
    let frame=page.frames().find(f=>f.url().includes('?glass-check'))!;
    assert.equal(await frame.locator('.home-actions .primary').first().innerText(),`${t.continue}\n` .trim());
    await frame.locator('.home-actions .primary').first().tap();assert.match(await frame.locator('.level-link').innerText(),/11/);
    for(const level of levels.slice(10)) {
      await frame.getByRole('button',{name:t.chooseLevel,exact:true}).tap();
      await fits(frame,'.levels-screen h1,.level-card');
      await frame.locator('.level-card').nth(level.id-1).tap();
      let wrongChecked=false;
      for(const column of solveLevel(level).path!) {
        const type=await frame.locator(`[data-column="${column}"] .bottle`).getAttribute('data-bottle-type');
        await frame.locator(`[data-column="${column}"]`).tap();
        if(type?.startsWith('glass')) {
          assert.equal(await frame.locator('.glass-selected').count(),1);
          await fits(frame,'.glass-coach,.glass-bin,.game-toolbar');
          if(!wrongChecked) {
            const before=await frame.locator('.game-toolbar').innerText();
            await frame.locator(`[data-bin="${type==='glassBrown'?'glassGreen':'glassBrown'}"]`).tap();
            assert.equal(await frame.locator('.game-toolbar').innerText(),before);
            assert.equal(await frame.locator('.glass-coach').innerText(),`${t.binPenalty} ${t.wrongBin}`);
            await fits(frame,'.glass-coach,.glass-bin');wrongChecked=true;
          }
          await frame.locator(`[data-bin="${type}"]`).tap();
        }
        await frame.waitForFunction(()=>!document.querySelector('.stacks.is-busy'));
      }
      await frame.locator('.won').waitFor();await frame.waitForTimeout(250);await fits(frame,'.result-stats,.result-dialog > button');
      const stats=await frame.locator('.result-stats').innerText();assert.ok(stats.includes(t.bottlesReturned) && stats.includes(t.depositReturned) && stats.includes(t.glassRecycled));
      const values=await frame.locator('.result-stats b').allTextContents();
      const expected=returnStats(level.columns.flat());assert.equal(values[0],String(expected.bottles));
      assert.equal(values[2],String(level.columns.flat().length-expected.bottles));
      if(width===390 && language==='zh' && level.id===15) await page.screenshot({path:'artifacts/return-glass-result-mobile.png'});
      if(level.id===11) {
        await frame.getByRole('button',{name:t.replay,exact:true}).tap();
        await frame.locator('[data-column="0"]').tap();await frame.locator('[data-bin="glassClear"]').tap();
        await frame.waitForFunction(()=>!document.querySelector('.stacks.is-busy'));
        await frame.getByRole('button',{name:t.undo,exact:true}).tap();
        assert.equal(await frame.locator('[data-column="0"] .bottle').getAttribute('data-bottle-type'),'glassClear');
        if(width===390 && language==='zh') await page.screenshot({path:'artifacts/return-machine-glass-mobile.png'});
        await frame.getByRole('button',{name:t.home,exact:false}).first().tap();
      } else {
        await frame.locator('.result-dialog .dialog-close').tap();
        // Closing returns to the level chooser; return home before the next loop.
        await frame.locator('.brand').tap();
      }
      await frame.locator('.home-actions .primary').first().tap();
    }
    await page.reload();await page.frameLocator('iframe').locator('.home-screen').waitFor();
    frame=page.frames().find(f=>f.url().includes('?glass-check'))!;
    assert.equal((await frame.evaluate(()=>JSON.parse(localStorage.getItem('pfand-pause:v1')!))).completed.length,15);
    console.log(`PASS ${width}×${height} ${language}: legacy save → level 11, all five glass levels, wrong choices, undo, refund excludes glass, progress persists, fitted choices and feedback`);
    await context.close();
  }
  assert.deepEqual(errors,[]);
} finally {await browser.close();}
