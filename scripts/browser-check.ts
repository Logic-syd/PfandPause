import { chromium, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { levels } from '../src/data/levels';
import { createGame, takeBottle, availableTiles, solveState, moveOut, shuffleBoard, returnReserve, type TripleState } from '../src/game/triple';
import { isGlass } from '../src/game/types';
import { returnStats } from '../src/game/returns';
const base=process.env.BASE_URL ?? 'http://localhost:4173';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium'});
const errors:string[]=[];mkdirSync('artifacts',{recursive:true});
async function settled(page:Page){await page.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));}
async function play(page:Page,s:TripleState,path:number[]){for(const id of path){
 if(id<0){await page.locator(`[data-reserve="${-id-1}"]`).click();s=returnReserve(s,-id-1).state;}
 else{const type=s.tiles[id].bottle;await page.locator(`[data-column="${id}"]`).click();if(isGlass(type))await page.locator(`[data-bin="${type}"]`).click();s=takeBottle(s,id,isGlass(type)?type:undefined).state;}
 await settled(page);
 }return s;}

function lossPath(s:TripleState,path:number[]=[],seen=new Set<string>()):number[]|null {
 if(s.endReason==='full')return path;if(s.status!=='playing')return null;
 const key=JSON.stringify([s.columns,s.buffer]);if(seen.has(key)||seen.size>5000)return null;seen.add(key);
 const ids=availableTiles(s).sort((a,b)=>s.buffer.filter(t=>t===s.tiles[a].bottle).length-s.buffer.filter(t=>t===s.tiles[b].bottle).length);
 for(const id of ids){const found=lossPath(takeBottle(s,id).state,[...path,id],seen);if(found)return found;}return null;
}
try{
 const context=await browser.newContext({viewport:{width:1280,height:720}});
 await context.addInitScript(()=>!localStorage.getItem('pfand-pause:v1')&&localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:[]})));
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.locator('.home-actions .primary').first().click();assert.equal(await page.locator('dialog[open]').count(),0);assert.equal(await page.locator('.tray-slot').count(),7);assert.equal(await page.locator('.crate-wrap').count(),0);
 await page.evaluate(()=>{const b=document.querySelector<HTMLButtonElement>('[data-column="0"]')!;b.click();b.click();b.click();});await settled(page);assert.equal(await page.locator('.tray-slot.occupied').count(),1,'A burst cannot collect the same card twice');
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal(await page.locator('.tray-slot.occupied').count(),0);
 for(const level of levels){
  await page.getByRole('button',{name:'Choose a level',exact:true}).click();await page.locator('.level-card').nth(level.id-1).click();
  const state=createGame(level), route=solveState(state).path!;assert.ok(route);
  if(level.id===9){await page.screenshot({path:'artifacts/triple-desktop.png'});assert.ok(await page.locator('.tile-card.is-covered:disabled').count()>0);}
  await play(page,state,route);await page.locator('dialog.won').waitFor();
  const expected=returnStats(level.columns.flat()), values=await page.locator('.result-stats b').allTextContents();assert.equal(values[0],String(expected.bottles));
  assert.match(values[1],new RegExp((expected.cents/100).toFixed(2).replace('.', '[.,]')));assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('pfand-pause:v1')!))).completed.includes(level.id));
  await page.locator('.result-dialog .dialog-close').click();await page.locator('.brand').click();await page.locator('.home-actions .primary').first().click();
 }
 console.log('PASS all 15 rounds: real clicks, triples, blocked cards, per-bottle credit, glass colour banks, receipts and saved progress');
 await page.getByRole('button',{name:'Choose a level',exact:true}).click();await page.locator('.level-card').nth(9).click();
 let s=createGame(levels[9]);const path=lossPath(s);assert.ok(path);s=await play(page,s,path);
 await page.locator('dialog.lost').waitFor();assert.equal(await page.locator('dialog.lost h2').innerText(),'The conveyor is full');
 await page.locator('dialog.lost').getByRole('button',{name:'Move out 3',exact:true}).click();assert.equal(await page.locator('.tray-slot.occupied').count(),4);assert.equal(await page.locator('[data-reserve]').count(),3);assert.equal(await page.locator('.tool-lift').isDisabled(),true);
 await page.getByRole('button',{name:'Shuffle',exact:true}).click();await settled(page);assert.equal(await page.locator('.tool-shuffle').isDisabled(),true);assert.equal(await page.locator('.tray-slot.occupied').count(),4);assert.equal(await page.locator('[data-reserve]').count(),3);
 s=shuffleBoard(moveOut(s));const rescue=solveState(s).path;assert.ok(rescue);s=await play(page,s,rescue);assert.equal(s.status,'won');await page.locator('dialog.won').waitFor();
 await page.getByRole('button',{name:'Play again',exact:true}).click();
 console.log('PASS seven-slot failure, move-out rescue, once-only shuffle, real reserve returns and completion of the rescued round');
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Start again',exact:true}).click();await page.screenshot({path:'artifacts/triple-mobile.png'});
 const r=await page.getByRole('button',{name:'Start again',exact:true}).boundingBox(),u=await page.getByRole('button',{name:'Undo',exact:true}).boundingBox();assert.ok(r&&u&&u.x>r.x);
 await page.reload();assert.equal((await page.evaluate(()=>JSON.parse(localStorage.getItem('pfand-pause:v1')!))).completed.length,15);assert.deepEqual(errors,[]);
 console.log('PASS mobile toolbar, reload and no runtime errors');await context.close();
}finally{await browser.close();}
