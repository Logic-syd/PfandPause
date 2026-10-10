import { test } from 'node:test';
import assert from 'node:assert/strict';
import { languageFromLocale } from '../src/storage';

test('browser locales select Chinese and German, with English as the fallback', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh-Hant', 'ZH_cn']) assert.equal(languageFromLocale(locale), 'zh');
  for (const locale of ['de', 'de-DE', 'de-AT', 'de-CH']) assert.equal(languageFromLocale(locale), 'de');
  for (const locale of ['en', 'en-GB', 'en-US', 'fr-FR', 'ja-JP', '']) assert.equal(languageFromLocale(locale), 'en');
});
