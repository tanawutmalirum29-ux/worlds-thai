import { WORD_BANK } from './dictionary.ts';
import { canonicalAnswer, validAnswer, wordInitialForCategory, type Match } from './logic.ts';

/**
 * A single, transactional record per category in a finished round.
 * Player IDs are already pseudonymous guest IDs; never expose these rows via AppSync.
 * The record is retained for 40 days, and used only for recent popularity.
 */
export type RarityObservation = {
  group: string;
  eventId: string;
  matchId: string;
  occurredAt: number;
  entries: { playerId: string; word: string }[];
  ttl: number;
};
export type RarityTier = 0 | 1 | 2;
export type CandidateState = { tier: RarityTier; streak: number };
export type RaritySnapshot = {
  day: string;
  bonuses: Record<string, number>;
  candidates: Record<string, CandidateState>;
  eligible: boolean;
  observations: number;
  uniquePlayers: number;
  uniqueRooms: number;
  /** Deduplicated uses from the last 30 days; missing for pre-upgrade snapshots. */
  recentWordUses?: Record<string,number>;
  evaluatedAt?: number;
};
export const RARITY_WINDOW_DAYS = 30;
export const RARITY_RETENTION_DAYS = 40;
export const RARITY_MIN_POOL = 10;
export const RARITY_MAX_EVENTS = 5000;

export function wordsForGroup(letter: string, category: string): string[] {
  return [...new Set((WORD_BANK[category] || [])
    .filter(word => wordInitialForCategory(word, category) === letter)
    .map(word => canonicalAnswer(word, category)))].sort();
}

export function rarityGroup(letter: string, category: string): string {
  return letter + '#' + category;
}

/** Match settlement is the ONLY source of rarity observations, never drafts. */
export function roundRarityObservations(before: Match | null, after: Match, now: number): RarityObservation[] {
  if (!before || before.phase !== 'playing' || after.phase !== 'review' ||
      after.history.length !== before.history.length + 1) return [];
  const round = after.history.at(-1);
  if (!round || round.round !== before.round) return [];
  const rows: RarityObservation[] = [];
  for (const category of round.categories) {
    const entries = round.entries.flatMap(player => {
      const answer = canonicalAnswer(player.answers[category], category);
      return (player.perCategory[category] || 0) > 0 && validAnswer(answer, round.letter, category)
        ? [{playerId: player.id, word: answer}] : [];
    });
    if (!entries.length) continue;
    rows.push({
      group: rarityGroup(round.letter, category),
      eventId: new Date(now).toISOString() + '#' + after.id + '#' + round.round,
      matchId: after.id,
      occurredAt: now,
      entries,
      ttl: Math.floor(now / 1000) + RARITY_RETENTION_DAYS * 86400
    });
  }
  return rows;
}

export function rarityDay(now: number): string {
  // Day rollover at 03:00 in Thailand (20:00 UTC on the previous calendar day).
  return new Date(now + 4 * 3600000).toISOString().slice(0, 10);
}
function median(numbers: number[]): number {
  const sorted = [...numbers].sort((a,b) => a-b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid-1] + sorted[mid]) / 2;
}
function groupByDay(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}
function recentDayDifference(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
}
/**
 * This is a conservative lower-tail detector, not a bottom-N ranking.
 * Median protects normal words against a handful of runaway popular words.
 * An approximate one-sided upper bound prevents sparse samples from producing rarity.
 * Zero rare words is a legitimate result.
 */
export function analyzeRarity(input: {
  words: string[];
  observations: RarityObservation[];
  firstEligibleAt: Record<string, number>;
  groupStartedAt: number;
  now: number;
}): { eligible: boolean; observations: number; uniquePlayers: number; uniqueRooms: number; candidates: Record<string, RarityTier>; recentWordUses: Record<string,number> } {
  const { words, observations, firstEligibleAt, groupStartedAt, now } = input;
  const candidates: Record<string, RarityTier> = {};
  const pool = words.length;
  const accepted = new Set(words);
  const cutoff = now - RARITY_WINDOW_DAYS * 86400000;
  const counted = new Set<string>();
  const events: {playerId: string;word: string;at: number}[] = [];
  const recentWordUses:Record<string,number>={};
  const users = new Set<string>();
  const rooms = new Set<string>();
  const dates = new Set<string>();
  let firstUse = Infinity, lastUse = -Infinity;
  for (const observation of observations) {
    if (observation.occurredAt < cutoff || observation.occurredAt > now || !Array.isArray(observation.entries)) continue;
    for (const entry of observation.entries) {
      if (!accepted.has(entry.word) || !entry.playerId) continue;
      const key = groupByDay(observation.occurredAt) + '\u0000' + entry.playerId + '\u0000' + entry.word;
      if (counted.has(key)) continue;
      counted.add(key);
      recentWordUses[entry.word]=(recentWordUses[entry.word]||0)+1;
      events.push({playerId:entry.playerId, word:entry.word, at:observation.occurredAt});
      users.add(entry.playerId);
      rooms.add(observation.matchId);
      dates.add(groupByDay(observation.occurredAt));
      firstUse = Math.min(firstUse, observation.occurredAt);
      lastUse = Math.max(lastUse, observation.occurredAt);
    }
  }
  const enough = pool >= RARITY_MIN_POOL &&
    events.length >= Math.max(120, 8 * pool) &&
    users.size >= 20 && rooms.size >= 12 &&
    now - groupStartedAt >= 7 * 86400000 &&
    lastUse - firstUse >= 6 * 86400000 &&
    dates.size >= 4;
  if (!enough) return {eligible:false,observations:events.length,uniquePlayers:users.size,uniqueRooms:rooms.size,candidates,recentWordUses};

  const minimumExposure = Math.max(60, 4 * pool);
  const rates = new Map<string,{count:number;exposure:number;rate:number}>();
  for (const word of words) {
    const birth = firstEligibleAt[word];
    if (!Number.isFinite(birth) || now - birth < 5 * 86400000) continue;
    const exposure = events.filter(event => event.at >= birth).length;
    if (exposure < minimumExposure) continue;
    const count = events.filter(event => event.at >= birth && event.word === word).length;
    rates.set(word,{count,exposure,rate:count/exposure});
  }
  // If the baseline contains too few mature words, abstain rather than invent rarity.
  if (rates.size < Math.max(10, Math.ceil(pool * 0.6))) {
    return {eligible:false,observations:events.length,uniquePlayers:users.size,uniqueRooms:rooms.size,candidates,recentWordUses};
  }
  const baseline = median([...rates.values()].map(value => value.rate));
  if (baseline <= 0) return {eligible:true,observations:events.length,uniquePlayers:users.size,uniqueRooms:rooms.size,candidates,recentWordUses};
  for (const [word, {count,exposure}] of rates) {
    const upper = (count + 1 + 1.65 * Math.sqrt(count + 1)) / exposure;
    if (pool >= 20 && upper < 0.25 * baseline) candidates[word] = 2;
    else if (upper < 0.6 * baseline) candidates[word] = 1;
  }
  return {eligible:true,observations:events.length,uniquePlayers:users.size,uniqueRooms:rooms.size,candidates,recentWordUses};
}

/** Daily two-day promotion / three-day demotion; never promote twice on one day. */
export function stabilizeRarity(
  current: Record<string,RarityTier>,
  previous: RaritySnapshot | undefined,
  day: string,
  eligible: boolean
): RaritySnapshot {
  const candidates: Record<string,CandidateState> = {};
  const bonuses: Record<string,number> = {};
  if (!eligible) return {day, bonuses, candidates,eligible:false,observations:0,uniquePlayers:0,uniqueRooms:0};
  const consecutive = previous && recentDayDifference(previous.day, day) === 1;
  const keys = new Set([...Object.keys(current), ...Object.keys(previous?.bonuses || {})]);
  for (const word of keys) {
    const target = current[word] || 0;
    const existing = consecutive ? (previous?.bonuses[word] || 0) : 0;
    const prev = consecutive ? previous?.candidates[word] : undefined;
    let tier = existing;
    if (target !== existing) {
      const streak = prev?.tier === target ? prev.streak + 1 : 1;
      const required = target > existing ? 2 : 3;
      if (streak >= required) tier = target;
      else candidates[word] = {tier:target,streak};
    }
    if (tier) bonuses[word] = tier;
  }
  return {day, bonuses, candidates,eligible:true,observations:0,uniquePlayers:0,uniqueRooms:0};
}
