import { test } from 'node:test';
import assert from 'node:assert/strict';
import { languageFromLocale } from '../src/storage';

test('browser locales select Chinese and German, with English as the fallback', () => {
  for (const locale of ['zh', 'zh-CN', 'zh-TW', 'zh-Hant', 'ZH_cn']) assert.equal(languageFromLocale(locale), 'zh');
  for (const locale of ['de', 'de-DE', 'de-AT', 'de-CH']) assert.equal(languageFromLocale(locale), 'de');
  for (const locale of ['en', 'en-GB', 'en-US', 'fr-FR', 'ja-JP', '']) assert.equal(languageFromLocale(locale), 'en');
});

test('removing old round one migrates progress once while preserving preferences',async()=>{
 const {loadPreferences,savePreferences,STORAGE_KEY}=await import('../src/storage');
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
 const oldStorage=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 const memory=new Map<string,string>();
 Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>({matches:false})}});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,value)}});
 try{
  memory.set(STORAGE_KEY,JSON.stringify({language:'de',sound:false,reducedMotion:true,completed:[1,2,3,15,15,'4',null],tutorialVersion:4}));
  const migrated=loadPreferences();assert.deepEqual(migrated.completed,[1,2,14]);assert.equal(migrated.language,'de');assert.equal(migrated.sound,false);assert.equal(migrated.campaignVersion,2);
  assert.equal(savePreferences(migrated),true);assert.deepEqual(loadPreferences(),migrated);
 }finally{
  if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');
  if(oldStorage)Object.defineProperty(globalThis,'localStorage',oldStorage);else Reflect.deleteProperty(globalThis,'localStorage');
 }
});
