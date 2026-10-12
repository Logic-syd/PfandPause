import { chromium, type Frame } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { triplePracticeLevel } from '../src/data/tutorial';
import { levels } from '../src/data/levels';
import { translations } from '../src/i18n';
import { createGame, takeBottle, availableTiles, solveState, type TripleState } from '../src/game/triple';
const url=process.env.BASE_URL ?? 'http://localhost:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium'});
const errors:string[]=[];mkdirSync('artifacts',{recursive:true});
const practiceLoss=[3,4,9,10,5,11,2];
function lossRoute(state:TripleState,path:number[]=[],seen=new Set<string>()):number[]|null {
 if(state.endReason==='full')return path;if(state.status!=='playing')return null;
 const key=JSON.stringify([state.columns,state.buffer]);if(seen.has(key)||seen.size>5000)return null;seen.add(key);
 const options=availableTiles(state).sort((a,b)=>state.buffer.filter(t=>t===state.tiles[a].bottle).length-state.buffer.filter(t=>t===state.tiles[b].bottle).length);
 for(const id of options){const found=lossRoute(takeBottle(state,id).state,[...path,id],seen);if(found)return found;}return null;
}
async function stateMatches(frame:Frame,state:TripleState){
 const actual=await frame.locator('dialog [data-column]').evaluateAll(elements=>elements.map(e=>Number(e.getAttribute('data-column'))));
 assert.deepEqual(actual,state.tiles.filter(tile=>state.columns[tile.id].length).map(tile=>tile.id),'Practice must match the rules after each real tap');
 assert.deepEqual(await frame.locator('dialog .tray-slot.occupied .bottle').evaluateAll(elements=>elements.map(e=>e.getAttribute('data-bottle-type'))),state.buffer);
}
async function settle(frame:Frame){await frame.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));}
async function fits(frame:Frame,selector:string) {
 const result=await frame.evaluate(selector=>{
  const root=document.getElementById('root')!,dialog=document.querySelector<HTMLDialogElement>('dialog[open]')!;
  const bounds=dialog.getBoundingClientRect();
  return {scroll:root.scrollHeight-root.clientHeight,dialogScroll:dialog.scrollHeight-dialog.clientHeight,
   clipped:[...dialog.querySelectorAll<HTMLElement>(selector)].filter(e=>e.getClientRects().length).flatMap(e=>{const r=e.getBoundingClientRect();return r.top<bounds.top-1||r.bottom>bounds.bottom+1||r.left<bounds.left-1||r.right>bounds.right+1?[e.className]:[];}),
   buttonHeights:[...dialog.querySelectorAll('.practice-actions button,.tray-full-dialog > .primary')].map(e=>e.getBoundingClientRect().height)};
 },selector);
 assert.ok(result.scroll<=1&&result.dialogScroll<=1,JSON.stringify(result));assert.deepEqual(result.clipped,[]);assert.ok(result.buttonHeights.every(h=>h>=44));
}
try{
 const initial=createGame(triplePracticeLevel);let full=initial;for(const id of practiceLoss)full=takeBottle(full,id).state;
 const solution=solveState(initial).path!;assert.ok(solution);
 const mainLoss=lossRoute(createGame(levels[2]));assert.ok(mainLoss);
 for(const [width,height] of [[240,320],[320,320],[390,844],[1280,431],[1707,960]])for(const language of ['zh','en','de'] as const){
  const t=translations[language],context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:width<900});
  await context.addInitScript(language=>localStorage.setItem('pfand-pause:v1',JSON.stringify({language,sound:false,reducedMotion:true,completed:[1,2],campaignVersion:2})),language);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/demo-portal',route=>route.fulfill({contentType:'text/html',body:`<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{height:calc(100% - 56px);width:100%;border:0}</style><header style="height:56px">Portal</header><iframe scrolling="no" src="${url}/?demo-fit"></iframe>`}));
  await page.goto(`${url}/demo-portal`);await page.frameLocator('iframe').locator('.home-screen').waitFor();
  const frame=page.frames().find(f=>f.url().includes('?demo-fit'))!;
  await frame.getByRole('button',{name:t.learn,exact:true}).tap();assert.equal(await frame.locator('dialog .tile-card').count(),12);assert.equal(await frame.locator('dialog .tray-slot').count(),7);
  await fits(frame,'.tile-card,.tray-slot,.tray-danger,.practice-progress,.practice-actions button');
  for(const id of practiceLoss){await frame.locator(`dialog [data-column="${id}"]`).tap();await settle(frame);}
  assert.equal(await frame.locator('dialog[open]').count(),1,'Full practice must not open a second result modal');
  assert.equal(await frame.locator('.practice-full').innerText(),t.practiceFull);assert.equal(await frame.locator('dialog .tray-slot.occupied').count(),7);
  await fits(frame,'.practice-full,.tile-card,.tray-slot,.tray-danger');
  assert.equal(await frame.getByRole('button',{name:t.undo,exact:true}).count(),0);
  assert.equal(await frame.getByRole('button',{name:t.moveOut,exact:true}).count(),0);
  assert.equal(await frame.locator('dialog .tile-card:not(:disabled)').count(),0);
  await page.mouse.click(1,height-5);assert.equal(await frame.locator('dialog[open]').count(),1);
  if(language==='zh'&&width===390)await page.screenshot({path:'artifacts/practice-terminal-mobile.png'});
  await frame.getByRole('button',{name:t.tryAgain,exact:true}).tap();assert.equal(await frame.locator('dialog .tray-slot.occupied').count(),0);
  let expected=initial;
  for(const id of solution){await frame.locator(`dialog [data-column="${id}"]`).tap();await settle(frame);expected=takeBottle(expected,id).state;if(expected.status!=='won')await stateMatches(frame,expected);}
  await frame.locator('.practice-finished').waitFor();await fits(frame,'.practice-summary,.practice-actions button');
  assert.deepEqual(await frame.evaluate(()=>JSON.parse(localStorage.getItem('pfand-pause:v1')!).completed),[1,2]);
  await frame.getByRole('button',{name:t.gotIt,exact:true}).tap();await frame.locator('.home-actions .primary').first().tap();
  for(const id of mainLoss){await frame.locator(`[data-column="${id}"]`).tap();await settle(frame);}
  await frame.locator('.tray-full-dialog').waitFor();assert.equal(await frame.locator('.full-tray-bottles .bottle').count(),7);
  assert.ok((await frame.locator('.tray-full-dialog').boundingBox())!.height<=270.1);
  assert.equal(await frame.locator('.tray-full-dialog').evaluate(e=>getComputedStyle(e,'::backdrop').backdropFilter),'none');
  await fits(frame,'.full-tray-content p,.full-tray-bottles,.tray-full-dialog > .primary');
  if(language==='zh'&&width===390)await page.screenshot({path:'artifacts/compact-full-mobile.png'});
  if(language==='zh'&&width===1707)await page.screenshot({path:'artifacts/compact-full-desktop.png'});
  assert.equal(await frame.getByRole('button',{name:t.undo,exact:true}).count(),0);
  assert.equal(await frame.getByRole('button',{name:t.moveOut,exact:true}).count(),0);
  await frame.getByRole('button',{name:t.tryAgain,exact:true}).tap();assert.equal(await frame.locator('.tray-slot.occupied').count(),0);
  assert.equal(await frame.locator('.tile-card').count(),levels[2].columns.flat().length);
  console.log(`PASS ${width}×${height} ${language}: visible seven-slot warning, 12-bottle practice, terminal full tray, retry, completion, no rescue or scrolling`);
  await context.close();
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close();}
