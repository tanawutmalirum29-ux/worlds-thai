import {normalizeAnswer,initialConsonant} from '../amplify/functions/game/logic.ts';
import {LETTER_NAMES} from './letters.ts';
import type {Drafts} from './admin-data.ts';
export const INBOX_STORAGE_KEY='kw-admin-uncategorized-words-v1';
function identity(text:string){return normalizeAnswer(text).toLocaleLowerCase('th');}
function validWord(input:string):boolean{
  const word=normalizeAnswer(input);
  return word.length>0&&word.length<=48
    && /^[\u0e00-\u0e7f ]+$/u.test(word)
    && Object.prototype.hasOwnProperty.call(LETTER_NAMES,initialConsonant(word));
}
/** Unclassified words are never added to gameplay until manually categorized. */
export function normalizeInbox(value:unknown):string[]{
  if(!Array.isArray(value))return [];
  const result:string[]=[],seen=new Set<string>();
  for(const item of value){
    if(typeof item!=='string')continue;
    const word=normalizeAnswer(item),id=identity(word);
    if(!validWord(word)||seen.has(id))continue;
    result.push(word);seen.add(id);
  }
  return result;
}
/** Accept a single line or a pasted list separated by newlines/commas/semicolons. */
export function addInboxWords(existing:string[],rawInput:string):{
  words:string[];added:number;ignored:number;
}{
  const candidates=rawInput.split(/[,;\n\r]+/g).map(x=>x.trim()).filter(Boolean);
  const before=normalizeInbox(existing);
  const words=normalizeInbox([...before,...candidates]);
  return {words,added:words.length-before.length,ignored:candidates.length-(words.length-before.length)};
}
export function removeInboxWord(words:string[],target:string):string[]{
  const id=identity(target);
  return normalizeInbox(words.filter(word=>identity(word)!==id));
}
/** Plain UTF-8 list for AI categorization: one unique word per line and no metadata. */
export function exportPendingWords(drafts:Drafts,inbox:string[]):string{
  const words=[...Object.values(drafts).flat(),...inbox];
  const cleaned=normalizeInbox(words);
  return cleaned.length?cleaned.join('\n')+'\n':'';
}
