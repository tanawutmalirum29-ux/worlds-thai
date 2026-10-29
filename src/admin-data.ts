import {WORD_BANK,EXCLUDED_LETTERS,MIN_WORDS_PER_PAIR,MIN_CATEGORIES_PER_LETTER} from '../amplify/functions/game/dictionary.ts';
import {CATEGORIES,initialConsonant,normalizeAnswer} from '../amplify/functions/game/logic.ts';
import {LETTER_NAMES,letterCaption} from './letters.ts';
import type {WordStatRecord} from './stats-export.ts';

export type Drafts=Record<string,string[]>;
export type Entry={word:string;category:string;label:string;letter:string;draft:boolean;uses:number;points:number;lastUsedAt:number|null};
export const STORAGE_KEY='kw-admin-vocabulary-drafts-v1';
export const CATEGORY_OPTIONS=CATEGORIES.map(([id,label])=>({id,label}));
const labels=new Map<string,string>(CATEGORIES.map(([id,label])=>[id,label]));
export const LETTER_OPTIONS=Object.keys(LETTER_NAMES).map(id=>({id,label:letterCaption(id)}));
const key=(word:string)=>normalizeAnswer(word).toLocaleLowerCase('th');
export function normalizeDrafts(input:unknown):Drafts {
  if(!input||typeof input!=='object'||Array.isArray(input))return {};
  const data=input as Record<string,unknown>;
  const result:Drafts={};
  for(const category of Object.keys(WORD_BANK)){
    const values=data[category];if(!Array.isArray(values))continue;
    const seen=new Set((WORD_BANK[category]||[]).map(key));
    const words:string[]=[];
    for(const item of values){
      if(typeof item!=='string')continue;
      const value=normalizeAnswer(item);
      if(!isAcceptableWord(value) || seen.has(key(value)))continue;
      seen.add(key(value));words.push(value);
    }
    if(words.length)result[category]=words;
  }
  return result;
}
export function isAcceptableWord(value:string):boolean{
  const word=normalizeAnswer(value);
  return word.length>0&&word.length<=48&&
    Object.prototype.hasOwnProperty.call(LETTER_NAMES,initialConsonant(word))&&
    !/[\r\n<>]/.test(word);
}
export function mergedBank(drafts:Drafts):Record<string,readonly string[]>{
  const normalized=normalizeDrafts(drafts);
  return Object.fromEntries(Object.entries(WORD_BANK).map(([category,words])=>
    [category,[...words,...(normalized[category]||[])]]));
}
export function addDraft(drafts:Drafts,wordInput:string,category:string):Drafts {
  if(!labels.has(category))throw new Error('กรุณาเลือกหมวด');
  const word=normalizeAnswer(wordInput);
  if(!isAcceptableWord(word))throw new Error('กรุณาใส่คำภาษาไทยที่ถูกต้อง ไม่เกิน 48 ตัวอักษร');
  if((mergedBank(drafts)[category]||[]).some(w=>key(w)===key(word)))throw new Error('มีคำนี้อยู่ในหมวดแล้ว');
  return normalizeDrafts({...drafts,[category]:[...(drafts[category]||[]),word]});
}
export function dropDraft(drafts:Drafts,word:string,category:string):Drafts{
  return normalizeDrafts({...drafts,[category]:(drafts[category]||[]).filter(w=>key(w)!==key(word))});
}
export function getEntries(drafts:Drafts,stats:WordStatRecord[]=[]):Entry[]{
  const counter=new Map(stats.map(s=>[s.category+'\u0000'+key(s.word),s]));
  const staged=new Set(Object.entries(normalizeDrafts(drafts)).flatMap(([category,words])=>
    words.map(w=>category+'\u0000'+key(w))));
  const rows:Entry[]=[];
  for(const [category,words] of Object.entries(mergedBank(drafts))){
    for(const word of words){
      const id=category+'\u0000'+key(word),s=counter.get(id);
      rows.push({word,category,label:labels.get(category)||category,letter:initialConsonant(word),
        draft:staged.has(id),uses:s?.timesUsed||0,points:s?.totalPoints||0,lastUsedAt:s?.lastUsedAt||null});
    }
  }
  return rows;
}
export function filterEntries(rows:Entry[],search='',category='',letter=''):Entry[]{
  const q=key(search);
  return rows.filter(row=>(!category||row.category===category)&&(!letter||row.letter===letter)
    &&(!q||key(row.word).includes(q)));
}
export function exactEntries(rows:Entry[],search:string):Entry[]{
  const q=key(search);
  return q?rows.filter(row=>key(row.word)===q):[];
}
export function exportDictionary(drafts:Drafts):string{
  const data=mergedBank(drafts);
  return [
    '/** Curated Thai answers for category-aware scoring. Exported by word workspace. */',
    '/** Review all staged terms before replacing the production source. */',
    'export const WORD_BANK: Record<string, readonly string[]> = '+JSON.stringify(data,null,2)+';',
    'export const EXCLUDED_LETTERS = new Set('+JSON.stringify([...EXCLUDED_LETTERS])+');',
    'export const MIN_WORDS_PER_PAIR = '+MIN_WORDS_PER_PAIR+';',
    'export const MIN_CATEGORIES_PER_LETTER = '+MIN_CATEGORIES_PER_LETTER+';',
    ''
  ].join('\n');
}
