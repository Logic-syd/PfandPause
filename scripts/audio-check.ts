import { chromium, type Page } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { levels } from '../src/data/levels';
import { triplePracticeLevel } from '../src/data/tutorial';
import { createGame, solveState } from '../src/game/triple';
import { translations, type Language } from '../src/i18n';

const base = process.env.BASE_URL ?? 'http://localhost:4173';
const browser = await chromium.launch({ headless: true, executablePath: process.env.BROWSER_EXECUTABLE_PATH ?? '/usr/bin/chromium' });
const results: string[] = [], errors: string[] = [], recordings: string[] = [];
const instrumentation = () => {
  const audit = { notes: [] as number[], decoded: 0, speech: 0 };
  Object.assign(window, { __audioAudit: audit });
  const create = AudioContext.prototype.createOscillator;
  AudioContext.prototype.createOscillator = function () {
    const node = create.call(this), start = node.start.bind(node);
    const scheduleFrequency = node.frequency.setValueAtTime.bind(node.frequency);
    let frequency = node.frequency.value;
    node.frequency.setValueAtTime = (value, at) => {
      frequency = value;
      return scheduleFrequency(value, at);
    };
    node.start = (at = 0) => { audit.notes.push(frequency); start(at); };
    return node;
  };
  const decode = AudioContext.prototype.decodeAudioData;
  AudioContext.prototype.decodeAudioData = function (...args: Parameters<typeof decode>) {
    audit.decoded++;
    return decode.apply(this, args);
  };
  const speak = speechSynthesis.speak.bind(speechSynthesis);
  speechSynthesis.speak = (utterance) => { audit.speech++; speak(utterance); };
};
async function audit(page: Page): Promise<{ notes: number[]; decoded: number; speech: number }> {
  return page.evaluate('window.__audioAudit');
}
async function finish(page: Page, practice = false) {
  const path = solveState(createGame(practice ? triplePracticeLevel : levels[0])).path;
  assert.ok(path, 'The verification bag must be solvable');
  for (const id of path) {
    await page.locator(`${practice ? 'dialog ' : ''}[data-column="${id}"]`).tap();
    await page.waitForFunction(() => !document.querySelector('.tile-field.is-busy'));
  }
  await page.locator(practice ? '.practice-finished' : 'dialog.won').waitFor();
  // Give the former delayed voice path enough time to reveal any leftover playback.
  await page.waitForTimeout(700);
}
function report(message: string) { results.push(message); console.log(`PASS ${message}`); }
try {
  for (const language of ['zh', 'en', 'de'] as Language[]) {
    const t = translations[language];
    for (const sound of [true, false]) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      await context.addInitScript(({ language, sound }) => {
        localStorage.setItem('pfand-pause:v1', JSON.stringify({ language, sound, reducedMotion: true, tutorialSeen: true, tutorialVersion: 5, campaignVersion: 2, completed: [] }));
      }, { language, sound });
      await context.addInitScript(instrumentation);
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', request => {
        if (/\.(mp3|wav|ogg|m4a)(\?|$)/i.test(request.url())) recordings.push(request.url());
      });
      await page.goto(base);
      await page.locator('.home-actions .primary').first().tap();
      await finish(page);
      let observed = await audit(page);
      assert.equal(observed.decoded, 0);
      assert.equal(observed.speech, 0);
      if (sound) assert.deepEqual(observed.notes.slice(-4), [523, 659, 784, 1047], 'Main victory must retain its synthetic chime');
      else assert.deepEqual(observed.notes, [], 'Muted gameplay must stay silent');
      await page.getByRole('button', { name: t.replay, exact: true }).tap();
      await finish(page);
      observed = await audit(page);
      assert.equal(observed.decoded, 0);
      assert.equal(observed.speech, 0);
      if (sound) assert.deepEqual(observed.notes.slice(-4), [523, 659, 784, 1047]);
      else assert.deepEqual(observed.notes, []);
      await page.getByRole('button', { name: t.nextLevel, exact: true }).tap();
      await page.locator('.help-button').tap();
      await page.getByRole('button', { name: t.learn, exact: true }).tap();
      const before = (await audit(page)).notes.length;
      await finish(page, true);
      observed = await audit(page);
      assert.equal(observed.decoded, 0);
      assert.equal(observed.speech, 0);
      if (sound) {
        assert.ok(observed.notes.length > before);
        assert.deepEqual(observed.notes.slice(-4), [523, 659, 784, 1047], 'Practice victory must retain its synthetic chime');
      } else assert.deepEqual(observed.notes, []);
      await page.getByRole('button', { name: t.gotIt, exact: true }).tap();
      report(`${language}, sound ${sound ? 'on' : 'off'}: main victory, replay and practice without speech or recorded audio; chimes respect mute`);
      await context.close();
    }
  }
  assert.deepEqual(recordings, [], 'No recording may be requested or preloaded');
  assert.deepEqual(errors, []);
  mkdirSync('artifacts/audio', { recursive: true });
  writeFileSync('artifacts/audio/no-voice-report.json', JSON.stringify({ base, results, recordings, errors }, null, 2));
} finally { await browser.close(); }
