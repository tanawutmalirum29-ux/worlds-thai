import { canonicalAnswer, validAnswer, type Match } from './logic.ts';

/** Only accepted words are counted, with no player identifiers or raw invalid answers. */
export type WordUsage = {
  id:string; letter:string; category:string; word:string; timesUsed:number; totalPoints:number;
};
/** Produce one combined delta per word when (and only when) a round first enters review. */
export function roundWordDeltas(before:Match|null, after:Match):WordUsage[] {
  if(!before || before.phase!=='playing' || after.phase!=='review' ||
     after.history.length!==before.history.length+1)return [];
  const completed=after.history.at(-1);
  if(!completed || completed.round!==before.round)return [];
  const counts=new Map<string,WordUsage>();
  for(const player of completed.entries){
    for(const category of completed.categories){
      const points=player.perCategory[category]||0;
      const word=canonicalAnswer(player.answers[category],category);
      if(points<=0 || !validAnswer(word,completed.letter,category))continue;
      const id=`stats#${completed.letter}#${category}#${word}`;
      const existing=counts.get(id);
      if(existing){existing.timesUsed++;existing.totalPoints+=points;}
      else counts.set(id,{id,letter:completed.letter,category,word,timesUsed:1,totalPoints:points});
    }
  }
  return [...counts.values()];
}
