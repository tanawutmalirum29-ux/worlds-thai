import test from 'node:test';
import assert from 'node:assert/strict';
import {WORD_BANK} from '../amplify/functions/game/dictionary.ts';
import {canonicalAnswer} from '../amplify/functions/game/logic.ts';
import {DESSERT_SUBTYPES,dessertSubtype,dessertSubtypeLabel} from '../src/dessert-subtypes.ts';

test('dessert subtype registry contains all intended operational groups',()=>{
 const ids=DESSERT_SUBTYPES.map(x=>x.id);
 assert.deepEqual(ids,['thai','baked','fried','cold','international','unreviewed']);
 for(const [name,tag] of [['ขนมใส่ไส้','thai'],['ขนมสอดไส้','thai'],
   ['ไข่เหี้ย','fried'],['ขนมไข่หงส์','fried'],['บราวนี','baked'],
   ['บิงซู','cold'],['กุหลาบจามุน','international']] as const){
   assert.equal(dessertSubtype(name),tag,name);
 }
 assert.equal(dessertSubtype('ขนมจรวดสายรุ้ง'),'unreviewed');
 assert.equal(dessertSubtypeLabel('fried'),'ขนมทอด');
});
test('subtype registry does not change reviewed dictionary and aliases count once',()=>{
 const original=WORD_BANK.dessert.length;
 const counts=new Set(WORD_BANK.dessert.map(w=>canonicalAnswer(w,'dessert')));
 assert.equal(WORD_BANK.dessert.length,original);
 assert.ok(counts.size<original,'synonyms should be a single distinct playable sweet');
 assert.ok(WORD_BANK.dessert.every(w=>typeof dessertSubtype(w)==='string'));
});
