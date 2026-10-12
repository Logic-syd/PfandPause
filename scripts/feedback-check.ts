import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync } from 'node:fs';
import { translations } from '../src/i18n';
import { recyclingTranslations } from '../src/data/recyclingTranslations';
import { recyclingChoiceLabels } from '../src/data/recycling';
const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium'});
const base=process.env.BASE_URL ?? 'http://localhost:4173';
const errors:string[]=[];mkdirSync('artifacts',{recursive:true});
try {
 for(const [width,height] of [[390,844],[1280,720]]) for(const language of ['zh','en','de'] as const){
  const context=await browser.newContext({viewport:{width,height},hasTouch:true});
  await context.addInitScript(language=>{
   localStorage.setItem('pfand-pause:v1',JSON.stringify({language,sound:true,reducedMotion:false,completed:[]}));
   const audit:{frequency:number;type:string}[]=[];Object.assign(window,{feedbackAudio:audit});
   const original=AudioContext.prototype.createOscillator;
   AudioContext.prototype.createOscillator=function(){const node=original.call(this),start=node.start.bind(node),setFrequency=node.frequency.setValueAtTime.bind(node.frequency);let frequency=node.frequency.value;node.frequency.setValueAtTime=(value,at)=>{frequency=value;return setFrequency(value,at);};node.start=(at=0)=>{audit.push({frequency,type:node.type});start(at);};return node;};
  },language);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
  const t=recyclingTranslations[language];await page.getByRole('button',{name:translations[language].recyclingEntry,exact:true}).click();
  await page.locator('.recycling-choices button').first().click();await page.locator('.recycling-feedback.is-correct').waitFor();
  assert.equal(await page.locator('.feedback-verdict h2').innerText(),t.correct);assert.equal(await page.locator('.chosen-answer').count(),0);
  assert.ok((await page.locator('.feedback-reward').innerText()).includes('0.25')||(await page.locator('.feedback-reward').innerText()).includes('0,25'));
  const positive=await page.locator('.recycling-feedback').evaluate(e=>({background:getComputedStyle(e).backgroundColor,mark:getComputedStyle(e.querySelector('.feedback-mark')!).backgroundColor,icon:e.querySelector('.feedback-mark path')!.getAttribute('d'),animation:getComputedStyle(e).animationName}));
  assert.equal(positive.animation,'answer-success');assert.equal(await page.locator('.packaging-clue').count(),1);
  const audio=()=>page.evaluate(()=>((window as unknown as {feedbackAudio:{frequency:number;type:string}[]}).feedbackAudio));
  const successNotes=(await audio()).map(n=>n.frequency);assert.equal(successNotes.length,3);assert.ok(successNotes[0]<successNotes[1]&&successNotes[1]<successNotes[2],'Success must play a rising chime');
  if(language==='zh'){await page.waitForTimeout(330);await page.screenshot({path:`artifacts/feedback-correct-${width}.png`});}
  await page.locator('.recycling-actions .primary').click();
  await page.locator('.recycling-choices button').nth(1).click();await page.locator('.recycling-feedback.is-incorrect').waitFor();
  assert.equal(await page.locator('.feedback-verdict h2').innerText(),t.incorrect);
  assert.ok((await page.locator('.chosen-answer').innerText()).includes(recyclingChoiceLabels[language].white.label));
  assert.ok((await page.locator('.correct-answer').innerText()).includes(recyclingChoiceLabels[language].shop.label));
  assert.equal(await page.locator('.feedback-reward').count(),0);
  const negative=await page.locator('.recycling-feedback').evaluate(e=>({background:getComputedStyle(e).backgroundColor,mark:getComputedStyle(e.querySelector('.feedback-mark')!).backgroundColor,icon:e.querySelector('.feedback-mark path')!.getAttribute('d'),animation:getComputedStyle(e).animationName}));
  assert.notEqual(negative.background,positive.background);assert.notEqual(negative.mark,positive.mark);assert.notEqual(negative.icon,positive.icon);assert.equal(negative.animation,'answer-error');
  const errorNotes=(await audio()).slice(3).map(n=>n.frequency);assert.equal(errorNotes.length,2);assert.ok(errorNotes[0]>errorNotes[1]&&errorNotes[0]<successNotes[0],'Wrong answers must play a lower falling tone');
  assert.equal((await audio()).slice(3)[0].type,'triangle');
  if(language==='zh'){await page.waitForTimeout(350);await page.screenshot({path:`artifacts/feedback-wrong-${width}.png`});}
  // Switching language keeps the result and credit; it must not replay a sound.
  await page.locator('.language-switch').getByRole('button',{name:'English',exact:true}).click();assert.equal(await page.locator('.recycling-feedback').getAttribute('data-correct'),'false');assert.equal((await audio()).length,5);
  assert.ok(await page.locator('.recycling-progress').innerText().then(text=>text.includes('0.25')));
  await context.close();console.log(`PASS ${width}×${height} ${language}: colour, symbol, animation, positive credit, chosen/correct comparison, distinct audio, language switching`);
 }
 const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.addInitScript(()=>{
  localStorage.setItem('pfand-pause:v1',JSON.stringify({language:'en',sound:false,reducedMotion:true,completed:[]}));
  Object.assign(window,{mutedAudioAttempts:0});AudioContext.prototype.createOscillator=()=>{(window as unknown as {mutedAudioAttempts:number}).mutedAudioAttempts++;throw new Error('Muted feedback tried to make a sound');};
 });
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base);await page.getByRole('button',{name:translations.en.recyclingEntry,exact:true}).click();
 await page.evaluate(()=>{const buttons=document.querySelectorAll<HTMLButtonElement>('.recycling-choices button');buttons[0].click();buttons[3].click();buttons[0].click();});
 await page.locator('.recycling-feedback').waitFor();assert.equal(await page.locator('.recycling-feedback').getAttribute('data-correct'),'true');assert.ok((await page.locator('.recycling-progress').innerText()).includes('Correct first time: 1'));assert.equal(await page.locator('.recycling-feedback').evaluate(e=>getComputedStyle(e).animationName),'none');
 await page.evaluate(()=>{const next=document.querySelector<HTMLButtonElement>('.recycling-actions .primary')!;next.click();next.click();});
 assert.ok((await page.locator('.recycling-progress').innerText()).includes('Question 2 of 8'));
 await page.locator('.recycling-choices button').nth(1).click();assert.equal(await page.locator('.recycling-feedback').evaluate(e=>getComputedStyle(e).animationName),'none');

 await page.locator('.recycling-actions .primary').click();await page.locator('.recycling-choices button').nth(0).click();await page.locator('.recycling-actions .primary').click();
 await page.locator('.recycling-choices button').nth(1).click();assert.equal(await page.locator('.destination-white').count(),1);assert.equal(await page.locator('.feedback-reward').innerText(),recyclingTranslations.en.glassReward);
 const credit=await page.locator('.recycling-progress').innerText();assert.ok(credit.includes('0.33'));
 for(const answer of [2,3,3]){await page.locator('.recycling-actions .primary').click();await page.locator('.recycling-choices button').nth(answer).click();assert.equal(await page.locator('.feedback-reward').innerText(),recyclingTranslations.en.glassReward);assert.ok((await page.locator('.recycling-progress').innerText()).includes('0.33'));}
 assert.equal(await page.locator('.destination-green').count(),1,'Blue glass must show the green bank symbol');
 assert.equal(await page.evaluate(()=>(window as unknown as {mutedAudioAttempts:number}).mutedAudioAttempts),0);assert.deepEqual(errors,[]);await context.close();console.log('PASS mute, reduced motion, single settlement, no skipped questions, glass bank colours and no glass credit');
} finally {await browser.close();}
