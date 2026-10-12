import { chromium, type Frame, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { availableTiles, createGame } from '../src/game/triple';
import { levels } from '../src/data/levels';
import { translations } from '../src/i18n';

const url = process.env.BASE_URL ?? 'http://localhost:4173';
const portal = new URL(url); portal.port = String(Number(portal.port) + 1);
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium' });
const t = translations.zh;
async function settled(frame: Frame) {
  await frame.waitForFunction(() => !document.querySelector('.tile-field.is-busy, .tile-card.is-pending'));
}
async function burst(page: Page, frame: Frame, ids: number[]) {
  const boxes = await Promise.all(ids.map(id => frame.locator(`[data-column="${id}"]`).boundingBox()));
  for (const box of boxes) {
    assert.ok(box);
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
  }
}
try {
  for (const [width, height, embedded] of [[390,844,false],[390,844,true],[844,390,true]] as const) {
    const context = await browser.newContext({ viewport: { width, height }, hasTouch: true, isMobile: true,
      deviceScaleFactor: 3, permissions: ['local-network-access'] });
    await context.addInitScript(() => localStorage.setItem('pfand-pause:v1', JSON.stringify({
      language:'zh', sound:false, reducedMotion:false, campaignVersion:2,
      completed:Array.from({length:20},(_,i)=>i+1),
    })));
    const page = await context.newPage(), errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install();
    if (embedded) {
      await page.route('**/tap-portal', route => route.fulfill({ contentType:'text/html', body:
        `<meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{height:100%;margin:0;overflow:hidden}iframe{border:0;width:100%;height:calc(100% - 56px)}</style><header style="height:56px">Portal</header><iframe scrolling="no" src="${portal.origin}/tap-shell"></iframe>` }));
      await page.route('**/tap-shell', route => route.fulfill({ contentType:'text/html', body:
        `<style>html,body{height:100%;margin:0;overflow:hidden}iframe{border:0;width:100%;height:100%}</style><iframe scrolling="no" src="${url}/?tap-game"></iframe>` }));
    }
    await page.goto(embedded ? `${url}/tap-portal` : `${url}/?tap-game`);
    const frame = page.frames().find(frame => frame.url().includes('?tap-game'))!;
    await frame.locator('.home-actions .primary').first().tap();
    async function select(index: number) {
      await settled(frame);
      await frame.locator('.level-link').tap();
      await frame.locator('.level-card').nth(index).tap();
    }
    await select(2);
    const ids = availableTiles(createGame(levels[2])).slice(0,5);
    assert.equal(ids.length, 5);
    await burst(page, frame, ids);
    assert.ok(await frame.locator('.tile-card.is-pending').count() > 0, 'Accepted taps must have immediate visible feedback');
    await settled(frame);
    assert.match(await frame.locator('.game-toolbar').innerText(), /5 步/, 'All five taps during animation must be consumed');
    for (const id of ids) assert.equal(await frame.locator(`[data-column="${id}"]`).count(), 0);

    await select(0);
    const initial = createGame(levels[0]);
    const trio = initial.tiles.filter(tile => tile.bottle === initial.tiles[0].bottle).map(tile => tile.id);
    // Same event-loop bursts also exercise the synchronous duplicate guard.
    await frame.evaluate(id => { const button = document.querySelector<HTMLButtonElement>(`[data-column="${id}"]`)!; button.click(); button.click(); button.click(); }, trio[0]);
    await burst(page, frame, trio.slice(1));
    await settled(frame);
    assert.match(await frame.locator('.game-toolbar').innerText(), /3 步/);
    assert.equal(await frame.locator('.level-progress > span > b').first().innerText(), '3');
    assert.equal(await frame.locator('.tray-slot.occupied').count(), 0, 'Rapid triples must clear exactly once');

    await select(4);
    const crowded = createGame(levels[4]);
    const counts = new Map<string,number>();
    const fullIds = availableTiles(crowded).filter(id => {
      const type = crowded.tiles[id].bottle, count = counts.get(type) ?? 0;
      if (count === 2) return false;
      counts.set(type,count+1); return true;
    }).slice(0,8);
    assert.equal(fullIds.length,8);
    await burst(page, frame, fullIds);
    await frame.locator('.tray-full-dialog').waitFor();
    assert.match(await frame.locator('.game-toolbar').innerText(), /7 步/, 'Queued clicks must stop at terminal seven-slot loss');
    await frame.locator('.tray-full-dialog > .primary').tap();
    await settled(frame);
    assert.match(await frame.locator('.game-toolbar').innerText(), /0 步/, 'Retry must discard all old queued taps');

    await burst(page, frame, fullIds.slice(0,5));
    await page.clock.fastForward(3600000);
    await settled(frame);
    assert.equal(await frame.locator('.result-dialog.lost').count(),0, 'No timeout after an hour');
    assert.match(await frame.locator('.game-toolbar').innerText(), /5 步/);

    await select(13);
    const mixed = createGame(levels[13]), free = availableTiles(mixed);
    const deposit = free.find(id => !mixed.tiles[id].bottle.startsWith('glass'))!;
    const glass = free.find(id => mixed.tiles[id].bottle.startsWith('glass'))!;
    assert.ok(deposit !== undefined && glass !== undefined);
    await burst(page,frame,[deposit,glass]);
    await settled(frame);
    await frame.locator(`[data-bin="${mixed.tiles[glass].bottle}"]`).tap();
    await settled(frame);
    assert.match(await frame.locator('.game-toolbar').innerText(), /2 步/, 'Glass selection during a flight must still reach its chosen bin');

    await frame.locator('.brand').tap();
    await frame.locator('.pause-dialog').getByRole('button',{name:t.exitRound,exact:true}).tap();
    await frame.getByRole('button',{name:t.learn,exact:true}).tap();
    const practiceIds = await frame.locator('dialog .tile-card:enabled').evaluateAll(elements => elements.slice(0,3).map(e => Number(e.getAttribute('data-column'))));
    await burst(page,frame,practiceIds);
    await settled(frame);
    for (const id of practiceIds) assert.equal(await frame.locator(`dialog [data-column="${id}"]`).count(),0);
    const nextId = Number(await frame.locator('dialog .tile-card:enabled').first().getAttribute('data-column'));
    await burst(page,frame,[nextId]);
    await frame.locator('dialog .dialog-close').tap();
    await frame.getByRole('button',{name:t.learn,exact:true}).tap();
    await page.waitForTimeout(450);
    assert.equal(await frame.locator('dialog .tile-card').count(),12, 'Closing practice must cancel its old animation and queue');
    assert.equal(await frame.locator('dialog .tray-slot.occupied').count(),0);
    assert.deepEqual(errors,[]);
    await context.close();
    console.log(`PASS ${width}×${height} ${embedded?'cross-origin iframe':'direct'}: rapid taps, visible acknowledgment, deduplication, triple, terminal loss, retry, tutorial cancellation`);
  }
} finally { await browser.close(); }
