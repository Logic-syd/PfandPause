import { chromium, type Frame } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { translations } from '../src/i18n';
import { recyclingTranslations } from '../src/data/recyclingTranslations';
import { levels } from '../src/data/levels';
import { triplePracticeLevel } from '../src/data/tutorial';
import { solveState, createGame } from '../src/game/triple';

const url = process.env.BASE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({ headless:true, executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium' });
const errors: string[] = [];
mkdirSync('artifacts',{ recursive:true });
async function fits(frame: Frame, selector: string) {
  const result = await frame.evaluate(selector => {
    const root = document.getElementById('root')!;
    const dialog = document.querySelector<HTMLDialogElement>('dialog[open]');
    const container = dialog ?? root;
    const elements = [...document.querySelectorAll<HTMLElement>(selector)].filter(el => el.getClientRects().length);
    return {
      scroll:container.scrollHeight-container.clientHeight, scrollTop:container.scrollTop,
      rootScroll:root.scrollHeight-root.clientHeight, horizontal:root.scrollWidth-root.clientWidth,
      clipped:elements.flatMap(el => { const r=el.getBoundingClientRect(); const bounds=el.closest('.board-viewport')?.getBoundingClientRect() ?? container.getBoundingClientRect(); return r.top<bounds.top-1 || r.bottom>bounds.bottom+1 || r.left<bounds.left-1 || r.right>bounds.right+1 ? [{ cls:el.className,top:r.top,bottom:r.bottom,left:r.left,right:r.right,bounds:{top:bounds.top,bottom:bounds.bottom,left:bounds.left,right:bounds.right} }] : []; }),
    };
  },selector);
  assert.ok(result.scroll<=1 && result.rootScroll<=1 && result.horizontal<=1 && result.scrollTop===0,JSON.stringify(result));
  assert.deepEqual(result.clipped,[],`All instructions, answers and actions must be visible: ${JSON.stringify(result)}`);
}
try {
  for (const [width,height] of [[320,320],[320,568],[390,844],[844,390],[1280,431],[1707,960]]) {
    for (const language of ['zh','en','de'] as const) {
      const t=translations[language], r=recyclingTranslations[language];
      const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<900});
      await context.addInitScript(language => localStorage.setItem('pfand-pause:v1',JSON.stringify({language,sound:false,reducedMotion:true,completed:[1,2,3,4,5,6,7,8,9,10],campaignVersion:2})),language);
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/practice-portal',route=>route.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{width:100%;height:calc(100% - 56px);border:0}</style><header style="height:56px">Portal</header><iframe scrolling="no" src="${url}/?practice-fit"></iframe>`}));
      await page.goto(`${url}/practice-portal`);
      await page.frameLocator('iframe').locator('.home-screen').waitFor();
      const frame=page.frames().find(frame=>frame.url().includes('?practice-fit'))!;
      await fits(frame,'.landing-copy h1,.intro,.home-actions button');
      assert.ok(await frame.locator('.store-illustration').isVisible());
      if (width===390 && language==='zh') await page.screenshot({path:'artifacts/restored-home-mobile.png'});
      if (width===1707 && language==='zh') await page.screenshot({path:'artifacts/restored-home-desktop.png'});
      await frame.locator('.home-actions .learn-button').tap();
      assert.equal(await frame.locator('dialog .tile-card').count(),12);
      assert.equal(await frame.locator('dialog .tray-slot').count(),7);
      assert.ok(await frame.locator('dialog .tile-card.is-covered').count()>0);
      await fits(frame,'.practice-actions button,.tray-danger');
      for (const id of solveState(createGame(triplePracticeLevel)).path!) {
        await fits(frame,'.tile-card,.tray-slot,.tray-danger,.practice-actions button,.dialog-close');
        await frame.locator(`dialog [data-column="${id}"]`).tap();
        await frame.waitForFunction(()=>!document.querySelector('dialog .tile-field.is-busy'));
      }
      await frame.locator('.practice-finished').waitFor();
      await fits(frame,'.practice-summary,.tray-danger,.practice-actions button,.dialog-close');
      assert.equal((await frame.evaluate(()=>JSON.parse(localStorage.getItem('pfand-pause:v1')!))).completed.length,10,'Practice never changes progress');
      await frame.getByRole('button',{name:t.gotIt,exact:true}).tap();
      await frame.getByRole('button',{name:t.recyclingEntry,exact:true}).tap();
      for(let question=0;question<8;question++) {
        assert.equal(await frame.locator('.recycling-choices button').count(),4);
        await fits(frame,'.recycling-item,.recycling-choices button,.recycling-actions');
        if(width===320 && height===568 && language==='de' && question===0) await page.screenshot({path:'artifacts/recycling-all-choices-small-de.png'});
        // Include an incorrect answer to verify the explanatory state too.
        await frame.locator('.recycling-choices button').nth(question===0?3:[0,0,0,1,2,3,3,0][question]).tap();
        await fits(frame,'.recycling-item,.recycling-feedback,.recycling-actions');
        const feedback=await frame.locator('.recycling-feedback').boundingBox();
        const next=await frame.locator('.recycling-actions .primary').boundingBox();
        assert.ok(feedback && next && next.y-feedback.y-feedback.height<=20,'The next button must stay beside the feedback, with no empty spacer');
        assert.ok(next.height>=44,'Navigation must keep its touch size');
        if(width===1707 && language==='zh' && question===0) await page.screenshot({path:'artifacts/compact-feedback-desktop.png'});

        if(width===390 && language==='zh' && question===0) await page.screenshot({path:'artifacts/recycling-feedback-mobile.png'});
        await frame.locator('.recycling-actions .primary').tap();
      }
      await fits(frame,'.recycling-result,.recycling-actions');
      await frame.getByRole('button',{name:r.back,exact:true}).tap();
      await frame.getByRole('button',{name:t.chooseLevel,exact:true}).tap();
      await frame.locator('.level-card').nth(0).tap();
      for(const column of solveState(createGame(levels[0])).path!) {
        await frame.locator(`[data-column="${column}"]`).tap();
        await frame.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));
      }
      await frame.locator('.result-dialog.won').waitFor();
      await fits(frame,'.result-stats,.result-dialog > button');
      const stats=await frame.locator('.result-stats').innerText();
      assert.match(stats,/12/);assert.match(stats,/2[.,]40/);assert.ok(stats.includes(t.depositReturned));
      if(width===390 && language==='zh') await page.screenshot({path:'artifacts/returned-bottle-stats.png'});
      await context.close();
      console.log(`PASS ${width}×${height} ${language}: restored home, free-play triples and completion, all 8 questions and feedback, summary, 12 bottles / €2.40, no scrolling`);
    }
  }
  assert.deepEqual(errors,[]);
} finally { await browser.close(); }
