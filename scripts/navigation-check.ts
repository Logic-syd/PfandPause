import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createGame, solveState } from '../src/game/triple';
import { levels } from '../src/data/levels';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH??'/usr/bin/chromium'});
const url=process.env.BASE_URL??'http://localhost:4173';
try {
 for(const [width,height,touch,scale] of [[390,844,true,3],[1280,720,false,1],[2560,1440,false,1.5]] as const){
  const context=await browser.newContext({viewport:{width,height},hasTouch:touch,deviceScaleFactor:scale});
  await context.addInitScript(()=>localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'zh',sound:false,reducedMotion:false,completed:[1,2],campaignVersion:2})));
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.locator('.home-actions .primary').first().click();
  const route=solveState(createGame(levels[2])).path!;
  let blanks=0;
  for(const id of route.slice(0,5)){
   await page.locator(`[data-column="${id}"]`).click();
   // Real pointer hits in clear space during the flying-bottle transition.
   const spots=await page.evaluate(()=>{
    const out:{x:number;y:number}[]=[];
    for(let y=70;y<innerHeight-10;y+=45)for(let x=8;x<innerWidth-8;x+=55){const el=document.elementFromPoint(x,y);if(el&&!el.closest('button,a,nav,header,dialog'))out.push({x,y});}
    return out.filter((_,i)=>i%Math.max(1,Math.floor(out.length/8))===0).slice(0,8);
   });
   for(const {x,y} of spots){if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);blanks++;assert.ok(await page.locator('.game-screen').isVisible());}
   await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));
  }
  assert.ok(blanks>=20);assert.equal(await page.locator('.home-screen').count(),0);
  const bottles=await page.locator('.tile-card').count();
  await page.locator('.brand').click();await page.locator('.pause-dialog').waitFor();
  assert.equal(await page.locator('.round-clock').count(),0);
  await page.mouse.click(2,height/2);assert.ok(await page.locator('.pause-dialog').isVisible());
  await page.getByRole('button',{name:'继续退瓶',exact:true}).click();assert.equal(await page.locator('.tile-card').count(),bottles);
  await page.locator('.brand').click();await page.getByRole('button',{name:'返回首页',exact:true}).click();assert.ok(await page.locator('.home-screen').isVisible());
  assert.deepEqual(errors,[]);await context.close();console.log(`PASS ${width}×${height} @${scale}: ${blanks} blank pointer hits during picks preserve round; menu pauses, backdrop inert, resume retains bottles, explicit home works`);
 }
} finally {await browser.close();}
