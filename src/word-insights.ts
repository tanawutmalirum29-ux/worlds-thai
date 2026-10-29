import { SYNONYM_GROUPS } from '../amplify/functions/game/synonyms.ts';
import { validAnswer } from '../amplify/functions/game/logic.ts';

export type SynonymInsight = {
  category: string;
  word: string;
  meaning: string;
  related: readonly string[];
};

/** Educational examples are shown ONLY after a round. Never use these to
 * bypass the curated answer bank or to give hints during active play. */
export function synonymExamplesForRound(letter: string, categories: readonly string[], limit = 4): SynonymInsight[] {
  const results: SynonymInsight[] = [];
  for (const category of categories) {
    for (const group of SYNONYM_GROUPS) {
      if (group.category !== category) continue;
      for (const word of group.words) {
        if (!validAnswer(word,letter,category)) continue;
        results.push({
          category, word, meaning: group.meaning,
          related: group.words.filter(other => other !== word).slice(0,5)
        });
        if (results.length >= limit) return results;
      }
    }
  }
  return results;
}
