import { WORD_BANK, EXCLUDED_LETTERS, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from './dictionary.ts';

export const CATEGORIES = [
  ['animal', 'สัตว์'], ['sport', 'กีฬา'], ['job', 'อาชีพ'], ['verb', 'คำกริยา'],
  ['fruit', 'ผลไม้'], ['vegetable', 'ผัก'], ['food', 'อาหาร'], ['drink', 'เครื่องดื่ม'],
  ['province', 'จังหวัด'], ['country', 'ประเทศ'], ['city', 'เมือง'], ['music', 'เครื่องดนตรี'],
  ['body', 'อวัยวะ'], ['clothing', 'เครื่องแต่งกาย'], ['vehicle', 'ยานพาหนะ'],
  ['device', 'เครื่องใช้ไฟฟ้า'], ['school', 'ของใช้ในโรงเรียน'], ['plant', 'พืช'],
  ['flower', 'ดอกไม้'], ['tree', 'ต้นไม้'], ['object', 'สิ่งของ'], ['color', 'สี'],
  ['cartoon', 'ตัวการ์ตูน'], ['film', 'ภาพยนตร์'], ['person', 'ชื่อคน'],
  ['adjective', 'คำคุณศัพท์'], ['science', 'วิทยาศาสตร์'], ['technology', 'เทคโนโลยี'],
  ['place', 'สถานที่'], ['festival', 'เทศกาล'], ['toy', 'ของเล่น'], ['fish', 'ปลา'],
  ['insect', 'แมลง'], ['bird', 'นก'], ['dessert', 'ขนม'], ['nature', 'ธรรมชาติ'],
  ['furniture', 'เฟอร์นิเจอร์'], ['material', 'วัสดุ'], ['health', 'สุขภาพ'],
  ['tool', 'เครื่องมือ'], ['fiction', 'ตัวละครในนิยาย'], ['transport', 'การเดินทาง']
] as const;
const ALL_LETTERS = [...'กขคงจฉชซดตถทนบปผพฟภมยรลวสหอ'] as const;
const eligibleByLetter: Record<string,string[]> = Object.fromEntries(
  ALL_LETTERS.map(letter => [letter, CATEGORIES.map(([id]) => id).filter(category =>
    (WORD_BANK[category] || []).filter(word => initialConsonant(word) === letter).length >= MIN_WORDS_PER_PAIR)])
);
export const LETTERS = ALL_LETTERS.filter(letter =>
  !EXCLUDED_LETTERS.has(letter) && eligibleByLetter[letter].length >= MIN_CATEGORIES_PER_LETTER
);
export function eligibleCategories(letter: string): string[] {
  return (LETTERS as readonly string[]).includes(letter) ? [...eligibleByLetter[letter]] : [];
}
const acceptedWords = new Map<string,Set<string>>(
  Object.entries(WORD_BANK).map(([category,words]) =>
    [category,new Set(words.map(word => normalizeAnswer(word).toLocaleLowerCase('th')))])
);
export const MAX_PLAYERS = 8;
export const ROUND_SECONDS = 40;
export const ROUNDS = 3;
export const REVIEW_SECONDS = 12;
export const LOBBY_SECONDS = 9;
export const IDLE_SECONDS = 43;
export const FINAL_SECONDS = 35;
export type Phase = 'lobby' | 'playing' | 'review' | 'final';
export type Player = { id: string; name: string; score: number; lastSeen: number };
export type RoundEntry = { id: string; name: string; answers: Record<string,string>; points: number; perCategory: Record<string,number> };
export type History = { round: number; letter: string; categories: string[]; entries: RoundEntry[] };
export type Match = {
  id: string; version: number; phase: Phase; players: Player[]; round: number;
  letter: string; categories: string[]; deadline: number; countdown: number;
  submissions: Record<string, Record<string,string>>; history: History[];
  previousLetters: string[]; previousCategories: string[]; ttl: number;
};
export function newMatch(id: string, now: number): Match {
  return { id, version: 0, phase: 'lobby', players: [], round: 0, letter: '', categories: [],
    deadline: 0, countdown: 0, submissions: {}, history: [], previousLetters: [], previousCategories: [],
    ttl: Math.floor(now / 1000) + 86400 };
}
export function normalizeAnswer(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.normalize('NFC').replace(/[\u200B-\u200D\uFEFF]/g, '').trim().replace(/\s+/g, ' ').slice(0, 48);
}
export function initialConsonant(value: string): string {
  const clean = normalizeAnswer(value).replace(/^["'“”‘’\s]+/, '');
  // Thai written leading vowels are stored before the initial consonant.
  return clean.replace(/^[เแโใไ]+/, '').charAt(0);
}
export function validAnswer(value: string, letter: string, category: string): boolean {
  const answer = normalizeAnswer(value).toLocaleLowerCase('th');
  return answer.length > 0
    && initialConsonant(answer) === letter
    && eligibleCategories(letter).includes(category)
    && (acceptedWords.get(category)?.has(answer) ?? false);
}
export function cleanAnswers(value: unknown, categories: string[]): Record<string,string> {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
  return Object.fromEntries(categories.map(id => [id, normalizeAnswer(input[id])]));
}
export function chooseRound(match: Match, random = Math.random) {
  const available = LETTERS.filter(x => !match.previousLetters.slice(-6).includes(x));
  const letter = available[Math.floor(random() * available.length)] || LETTERS[0];
  let pool = eligibleCategories(letter).filter(id => !match.previousCategories.includes(id));
  if (pool.length < 5) pool = eligibleCategories(letter);
  const chosen: string[] = [];
  for (let i = 0; i < 5; i++) {
    const index = Math.floor(random() * pool.length);
    chosen.push(pool.splice(index, 1)[0]);
  }
  return { letter, categories: chosen };
}
export function scoreRound(match: Match): RoundEntry[] {
  const all = match.players.map(player => ({ player, answers: cleanAnswers(match.submissions[player.id], match.categories) }));
  return all.map(({ player, answers }) => {
    const perCategory: Record<string, number> = {};
    for (const category of match.categories) {
      const answer = answers[category];
      if (!validAnswer(answer, match.letter, category)) { perCategory[category] = 0; continue; }
      const duplicates = all.filter(entry => validAnswer(entry.answers[category], match.letter, category) &&
        entry.answers[category].toLocaleLowerCase('th') === answer.toLocaleLowerCase('th')).length;
      perCategory[category] = duplicates > 1 ? 10 : 20;
    }
    return { id: player.id, name: player.name, answers, points: Object.values(perCategory).reduce((a,b) => a+b,0), perCategory };
  });
}
export function advance(match: Match, now: number, random = Math.random): Match {
  match.players = match.players.filter(player => now - player.lastSeen <= IDLE_SECONDS * 1000);
  if (match.phase === 'lobby') {
    if (match.players.length < 2) match.countdown = 0;
    else if (!match.countdown) match.countdown = now + LOBBY_SECONDS * 1000;
    if (match.countdown && now >= match.countdown && match.players.length >= 2) {
      const round = chooseRound(match, random);
      match.round = 1; match.letter = round.letter; match.categories = round.categories;
      match.previousLetters.push(round.letter); match.previousCategories.push(...round.categories);
      match.submissions = {}; match.phase = 'playing'; match.countdown = 0;
      match.deadline = now + ROUND_SECONDS * 1000;
    }
  } else if (match.phase === 'playing' && now >= match.deadline) {
    const entries = scoreRound(match);
    for (const entry of entries) {
      const player = match.players.find(x => x.id === entry.id);
      if (player) player.score += entry.points;
    }
    match.history.push({ round: match.round, letter: match.letter, categories: [...match.categories], entries });
    match.phase = 'review'; match.deadline = now + REVIEW_SECONDS * 1000;
  } else if (match.phase === 'review' && now >= match.deadline) {
    if (match.round >= ROUNDS || match.players.length < 2) {
      match.phase = 'final'; match.deadline = now + FINAL_SECONDS * 1000;
    } else {
      const next = chooseRound(match, random);
      match.round++; match.letter = next.letter; match.categories = next.categories;
      match.previousLetters.push(next.letter); match.previousCategories.push(...next.categories);
      match.phase = 'playing'; match.submissions = {};
      match.deadline = now + ROUND_SECONDS * 1000;
    }
  } else if (match.phase === 'final' && now >= match.deadline) {
    match.phase = 'lobby'; match.round = 0; match.letter = ''; match.categories = [];
    match.deadline = 0; match.countdown = 0; match.submissions = {}; match.history = [];
    for (const player of match.players) player.score = 0;
  }
  match.ttl = Math.floor(now / 1000) + 86400;
  return match;
}
export function snapshot(match: Match) {
  return {
    roomId: match.id, phase: match.phase, round: match.round,
    letter: match.letter, categories: match.categories,
    deadline: match.deadline, countdown: match.countdown,
    players: match.players.map(({id,name,score}) => ({id,name,score})),
    submitted: match.phase === 'playing' ? Object.keys(match.submissions) : [],
    history: match.phase === 'review' || match.phase === 'final' ? match.history : [],
    revision: match.version
  };
}
export function applyAction(match: Match, action: string, userId: string, now: number, name = '', answers?: unknown) {
  // Advance timers before accepting a potentially late submission.
  advance(match, now);
  const player = match.players.find(x => x.id === userId);
  if (action === 'join') {
    if (player) { player.lastSeen = now; if (name.trim()) player.name = name.trim().slice(0, 18); }
    else {
      if (match.phase !== 'lobby' || match.players.length >= MAX_PLAYERS) throw new Error('ROOM_UNAVAILABLE');
      const nickname = name.trim().replace(/[<>]/g,'').slice(0,18);
      if (!nickname) throw new Error('กรุณาใส่ชื่อผู้เล่น');
      match.players.push({ id: userId, name: nickname, score: 0, lastSeen: now });
    }
    advance(match, now);
  } else if (action === 'leave') {
    match.players = match.players.filter(x => x.id !== userId);
    advance(match, now);
  } else {
    if (!player) throw new Error('NOT_JOINED');
    player.lastSeen = now;
    if (action === 'submit') {
      if (match.phase !== 'playing' || now >= match.deadline) throw new Error('หมดเวลาส่งคำตอบแล้ว');
      match.submissions[userId] = cleanAnswers(answers, match.categories);
    } else if (action !== 'pulse') throw new Error('UNKNOWN_ACTION');
    advance(match, now);
  }
  return match;
}
