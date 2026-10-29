import {canonicalAnswer,normalizeAnswer,validAnswer,wordInitialForCategory,roundLetter,type Match} from './logic.ts';

/** One anonymous candidate count per finished round; no player identifiers saved. */
export type DessertSuggestion={
  id:string;category:'dessert';word:string;letter:string;timesSuggested:1;
};
const REJECTION_CHARS=/^[\u0E01-\u0E5B ]+$/u;
export const SUGGESTION_MIN_REPORTS=3;
export const SUGGESTION_TTL_DAYS=90;
export function roundDessertSuggestions(before:Match|null,after:Match):DessertSuggestion[]{
  if(!before||before.phase!=='playing'||after.phase!=='review'||
    after.history.length!==before.history.length+1)return [];
  const round=after.history.at(-1);
  if(!round||round.round!==before.round||
    !(round.topicCategory==='dessert'||round.categories.includes('dessert')))return [];
  const words=new Map<string,DessertSuggestion>();
  for(const entry of round.entries){
    for(const slot of round.categories){
      if((round.topicCategory||slot)!=='dessert'||(entry.perCategory[slot]||0)>0)continue;
      const letter=roundLetter(round.letter,slot,round.topicCategory);
      const text=normalizeAnswer(entry.answers[slot]).toLocaleLowerCase('th');
      if(text.length<3||text.length>36||!REJECTION_CHARS.test(text)||
        text==='ขนม'||text.startsWith('ขนมขนม'))continue;
      if(wordInitialForCategory(text,'dessert')!==letter||
        validAnswer(text,letter,'dessert'))continue;
      const word=canonicalAnswer(text,'dessert');
      const id='suggest#dessert#'+letter+'#'+word;
      if(!words.has(id))words.set(id,{id,category:'dessert',word,letter,timesSuggested:1});
      if(words.size>=8)break;
    }
    if(words.size>=8)break;
  }
  return [...words.values()];
}
