import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { translations, type Language } from '../src/i18n';
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.BROWSER_EXECUTABLE_PATH } : {}),
  ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
});
const url = process.env.BASE_URL ?? 'http://localhost:5173';
const errors: string[] = [];
try {
  for (const language of ['zh', 'en', 'de'] as const) {
    const context = await browser.newContext({ locale: { zh: 'zh-CN', en: 'en-GB', de: 'de-DE' }[language], viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url);
    assert.equal(await page.locator('html').getAttribute('lang'), language);
    await page.getByRole('button', { name: translations[language].recyclingEntry, exact: true }).click();
    for (let question = 0; question < 8; question++) {
      if (language !== 'zh') assert.ok(!/[\u3400-\u9fff]/u.test(await page.locator('.recycling-practice').innerText()));
      await page.locator('.recycling-choices button').nth([0, 1, 2, 3, 4, 5, 5, 0][question]).click();
      await page.locator('.recycling-feedback').waitFor();
      assert.equal(await page.locator('.recycling-choices button:enabled').count(), 0);
      if (question === 0) {
        // Switching a live lesson keeps its answer, score and current question.
        const progress = await page.locator('.recycling-progress').innerText();
        const target: Language = language === 'zh' ? 'de' : 'zh';
        await page.locator('.language-button').click();
        await page.locator('.language-options').getByRole('button', { name: target === 'zh' ? '中文' : 'Deutsch', exact: true }).click();
        await page.getByRole('button', { name: translations[target].close, exact: true }).click();
        assert.equal(await page.locator('html').getAttribute('lang'), target);
        assert.equal(await page.locator('.recycling-choices button:enabled').count(), 0);
        await page.locator('.language-button').click();
        await page.locator('.language-options').getByRole('button', { name: { zh: '中文', en: 'English', de: 'Deutsch' }[language], exact: true }).click();
        await page.getByRole('button', { name: translations[language].close, exact: true }).click();
        assert.equal(await page.locator('.recycling-progress').innerText(), progress);
      }
      await page.locator('.recycling-feedback button').click();
    }
    await page.locator('.recycling-result').waitFor();
    if (language !== 'zh') assert.ok(!/[\u3400-\u9fff]/u.test(await page.locator('.recycling-practice').innerText()));
    await page.locator('.recycling-result button').click();
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${language}: overflow at ${width}`);
    }
    // A saved choice must override the browser default on the next visit.
    const savedLanguage: Language = { zh: 'de', en: 'zh', de: 'en' }[language] as Language;
    await page.locator('.language-button').click();
    await page.locator('.language-options').getByRole('button', { name: { zh: '中文', en: 'English', de: 'Deutsch' }[savedLanguage], exact: true }).click();
    await page.getByRole('button', { name: translations[savedLanguage].close, exact: true }).click();
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('lang'), savedLanguage);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('pfand-pause:v1')!).language), savedLanguage);
    await page.getByRole('button', { name: translations[savedLanguage].play, exact: true }).click();
    await page.getByRole('heading', { name: translations[savedLanguage].practiceTitle, exact: true }).waitFor();
    await page.getByRole('button', { name: translations[savedLanguage].skip, exact: true }).click();
    await page.locator('.help-button').click();
    await page.getByRole('heading', { name: translations[savedLanguage].helpTitle, exact: true }).waitFor();
    await context.close();
    console.log(`PASS ${language}: browser default, all eight lessons, language switching preserves answer and score, persistence, tutorial, help and responsive layout`);
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
}
