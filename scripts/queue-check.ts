import { chromium, type Frame } from '@playwright/test';
import assert from 'node:assert/strict';
import { translations } from '../src/i18n';

const url = process.env.BASE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium'});
try {
  for (const [width,height,language,embedded,sound,motion] of [
    [1280,720,'zh',false,true,false], [390,844,'en',false,true,false],
    [390,844,'de',false,false,true], [844,390,'zh',true,true,true],
  ] as const) {
    const context = await browser.newContext({viewport:{width,height},hasTouch:true});
    await context.addInitScript(({language,sound,motion}) => {
      localStorage.setItem('pfand-pause:v1',JSON.stringify({language,sound,reducedMotion:motion,completed:[],campaignVersion:2}));
      const audit: {duration:number;stops:number}[] = [];
      Object.assign(window,{queueAudio:audit});
      const original = AudioContext.prototype.createBufferSource;
      AudioContext.prototype.createBufferSource = function() {
        const node = original.call(this), start = node.start.bind(node), stop = node.stop.bind(node);
        let row:typeof audit[number] | undefined;
        node.start = (at=0) => {row={duration:node.buffer?.duration??0,stops:0};audit.push(row);start(at);};
        node.stop = (at=0) => {if(row)row.stops++;stop(at);};
        return node;
      };
    },{language,sound,motion});
    const page = await context.newPage(), errors:string[]=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install();
    if (embedded) await page.route('**/queue-portal',r=>r.fulfill({contentType:'text/html',body:`<style>html,body{margin:0;height:100%;overflow:hidden}iframe{width:100%;height:100%;border:0}</style><iframe scrolling="no" src="${url}/?queue-game"></iframe>`}));
    await page.goto(embedded?`${url}/queue-portal`:`${url}/?queue-game`);
    const frame:Frame=page.frames().find(f=>f.url().includes('?queue-game'))!;
    const t=translations[language];
    await frame.locator('.home-actions .primary').first().tap();
    const quote = async()=>frame.locator('.queue-current').innerText();
    const geometry = async()=>frame.evaluate(()=>[...document.querySelectorAll('.board-viewport,.tray-slot,.queue-roll')].map(el=>{const r=el.getBoundingClientRect();return [r.x,r.y,r.width,r.height];}));
    const audio = async()=>frame.evaluate(()=> (window as unknown as {queueAudio:{duration:number;stops:number}[]}).queueAudio);
    const first = await quote(), initialGeometry=await geometry();
    await page.clock.fastForward(4500);assert.notEqual(await quote(),first,'Text rotates without a move');
    assert.deepEqual(await geometry(),initialGeometry,'Ticker must never reflow the board');
    await page.clock.fastForward(8500);assert.equal(await frame.locator('.queue-backdrop').getAttribute('data-pressure'),'1');
    assert.ok(t.queueIdle.includes(await quote()));
    assert.equal(await frame.locator('.queue-backdrop').evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    await page.clock.fastForward(13500);assert.equal(await frame.locator('.queue-backdrop').getAttribute('data-pressure'),'2');
    assert.ok(t.queueLongIdle.includes(await quote()));
    assert.deepEqual(await geometry(),initialGeometry);
    const sounds=await audio();assert.equal(sounds.length>0,sound);assert.ok(sounds.every(s=>Math.abs(s.duration-.5)<.001));
    if(motion) {
      assert.equal(await frame.locator('.queue-roll-track').evaluate(el=>getComputedStyle(el).animationName),'none');
      assert.equal(await frame.locator('.queue-figure').first().evaluate(el=>getComputedStyle(el).animationName),'none');
    }
    if(language==='zh' && !embedded) await page.screenshot({path:'artifacts/queue-idle-desktop.png'});
    if(language==='en') await page.screenshot({path:'artifacts/queue-idle-mobile.png'});
    await frame.locator('.tile-card:enabled').first().tap();
    await frame.waitForFunction(()=>!document.querySelector('.tile-field.is-busy'));
    assert.equal(await frame.locator('.queue-backdrop').getAttribute('data-pressure'),'0');
    if(sound)assert.ok((await audio()).at(-1)!.stops>=2,'Interaction cancels the grumble immediately');
    await frame.locator('.brand').tap();
    const beforePause=await audio();await page.clock.fastForward(60000);
    assert.equal(await frame.locator('.queue-backdrop').getAttribute('data-pressure'),'0');assert.deepEqual(await audio(),beforePause);
    await frame.getByRole('button',{name:t.resume,exact:true}).tap();
    await page.clock.fastForward(13000);assert.equal(await frame.locator('.queue-backdrop').getAttribute('data-pressure'),'1');
    await frame.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const hiddenAudio=await audio();await page.clock.fastForward(60000);assert.deepEqual(await audio(),hiddenAudio);
    assert.equal(await frame.locator('.queue-backdrop').getAttribute('data-pressure'),'0');
    await frame.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
    await page.clock.fastForward(4000);assert.equal(await frame.locator('.queue-backdrop').getAttribute('data-pressure'),'0');
    assert.equal(await frame.locator('dialog.lost,[role="timer"]').count(),0,'Social pressure never ends a round');
    assert.deepEqual(errors,[]);await context.close();
    console.log(`PASS ${width}×${height} ${language}: ticker, fixed geometry, escalating idle, gesture reset, pause/hidden stop, sound=${sound}, reducedMotion=${motion}`);
  }
} finally {await browser.close();}
