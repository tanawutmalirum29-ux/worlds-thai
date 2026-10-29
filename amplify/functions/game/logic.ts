import { WORD_BANK, EXCLUDED_LETTERS, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from './dictionary.ts';
import { NEIGHBOR_PROVINCE_ALIASES } from './neighbor-provinces.ts';

const CATEGORY_LABELS = [
  ['animal', 'สัตว์'], ['sport', 'กีฬา'], ['job', 'อาชีพ'], ['verb', 'คำกริยา'],
  ['fruit', 'ผลไม้'], ['vegetable', 'ผัก'], ['food', 'อาหาร'], ['drink', 'เครื่องดื่ม'],
  ['province', 'จังหวัด/รัฐทั่วโลก'], ['country', 'ประเทศ'], ['city', 'เมือง'], ['music', 'เครื่องดนตรี'],
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
export const CATEGORIES = CATEGORY_LABELS.filter(([id]) => Object.prototype.hasOwnProperty.call(WORD_BANK,id));
// Modern ข ไข่ is a playable consonant. The obsolete ฃ ขวด is not sampled.
const ALL_LETTERS = [...'กขคงจฉชซดตถทนบปผพฟภมยรลวสหอ'] as const;
/** In desserts, ขนม is only a label prefix, not the first letter of the answer.
 * ขนมไข่ => ข, ขนมครก => ค. All other categories keep normal initials.
 * The bare word ขนม yields no answer consonant.
 */
export function wordInitialForCategory(value:string,category:string):string {
  const word=normalizeAnswer(value);
  if(category==='dessert' && word.startsWith('ขนม'))
    return initialConsonant(normalizeAnswer(word.slice('ขนม'.length)));
  return initialConsonant(word);
}
// Named sweet aliases refer to the SAME dessert (not separate distinct answers).
// ขนมไข่เหี้ย is the historical name for ขนมไข่หงส์.
const dessertAliases:Readonly<Record<string,string>>={
  'ไข่เหี้ย':'ไข่หงส์',
  // Both Thai names describe the same traditional sweet.
  'สอดไส้':'ขนมสอดไส้',
  'ใส่ไส้':'ขนมสอดไส้',
  'ขนมใส่ไส้':'ขนมสอดไส้'
};
const dessertVocabulary=new Set(WORD_BANK.dessert.map(word=>normalizeAnswer(word).toLocaleLowerCase('th')));
/** Canonical identity for scoring, duplicates and word statistics.
 * An optional leading "ขนม" is accepted ONLY when its remainder is a real
 * registered dessert or a curated alias. Existing fully prefixed names
 * (e.g. ขนมครก) keep their full identity if "ครก" is not a known dessert.
 * Other categories are never altered.
 */
export function canonicalAnswer(value:unknown,category:string):string {
  const raw=normalizeAnswer(value).toLocaleLowerCase('th');
  // Different Thai spellings of the same neighboring region must share points/stats.
  if(category==='province')return NEIGHBOR_PROVINCE_ALIASES[raw] || raw;
  if(category!=='dessert'||!raw)return raw;
  let core=raw;
  if(raw.startsWith('ขนม')){
    const unprefixed=normalizeAnswer(raw.slice('ขนม'.length)).toLocaleLowerCase('th');
    if(unprefixed && !unprefixed.startsWith('ขนม')
      && (dessertVocabulary.has(unprefixed)||Object.prototype.hasOwnProperty.call(dessertAliases,unprefixed)))
      core=unprefixed;
  }
  return dessertAliases[core]||core;
}
const eligibleByLetter: Record<string,string[]> = Object.fromEntries(
  ALL_LETTERS.map(letter => [letter, CATEGORIES.map(([id]) => id).filter(category =>
    new Set((WORD_BANK[category] || [])
      .filter(word => wordInitialForCategory(word,category) === letter)
      .map(word => canonicalAnswer(word,category))).size >= MIN_WORDS_PER_PAIR)])
);
export const LETTERS = ALL_LETTERS.filter(letter =>
  !EXCLUDED_LETTERS.has(letter) && eligibleByLetter[letter].length >= MIN_CATEGORIES_PER_LETTER
);
export function eligibleCategories(letter: string): string[] {
  return (LETTERS as readonly string[]).includes(letter) ? [...eligibleByLetter[letter]] : [];
}
const acceptedWords = new Map<string,Set<string>>(
  Object.entries(WORD_BANK).map(([category,words]) =>
    [category,new Set(words.map(word => canonicalAnswer(word,category)))])
);
export const MAX_PLAYERS = 8;
export const DEFAULT_SETTINGS = { rounds: 3, categories: 5, seconds: 40 } as const;
export type GameSettings = { rounds: number; categories: number; seconds: number };
export const REVIEW_SECONDS = 10;
export const IDLE_SECONDS = 43;
export const ROUND_SECONDS = DEFAULT_SETTINGS.seconds;
export const ROUNDS = DEFAULT_SETTINGS.rounds;
export type Phase = 'lobby' | 'playing' | 'review' | 'final';
export type Player = { id: string; name: string; score: number; lastSeen: number };
export type RoundEntry = { id: string; name: string; answers: Record<string,string>; points: number; perCategory: Record<string,number> };
export type History = { round: number; letter: string; categories: string[]; entries: RoundEntry[] };
export type Match = {
  id: string; version: number; phase: Phase; players: Player[]; round: number;
  ownerId: string; settings: GameSettings; createdAt?: number;
  letter: string; categories: string[]; deadline: number; countdown: number;
  submissions: Record<string, Record<string,string>>; history: History[];
  previousLetters: string[]; previousCategories: string[]; ttl: number;
};
export function newMatch(id: string, now: number): Match {
  return { id, version: 0, phase: 'lobby', players: [], ownerId: '', createdAt: now, settings: { ...DEFAULT_SETTINGS },
    round: 0, letter: '', categories: [], deadline: 0, countdown: 0,
    submissions: {}, history: [], previousLetters: [], previousCategories: [],
    ttl: Math.floor(now / 1000) + 86400 };
}
export function validateSettings(raw: unknown): GameSettings {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string,unknown> : {};
  const rounds = value.rounds ?? DEFAULT_SETTINGS.rounds;
  const categories = value.categories ?? DEFAULT_SETTINGS.categories;
  const seconds = value.seconds ?? DEFAULT_SETTINGS.seconds;
  if (!Number.isInteger(rounds) || !Number.isInteger(categories) || !Number.isInteger(seconds)
    || (rounds as number) < 1 || (rounds as number) > 10
    || (categories as number) < 3 || (categories as number) > 8
    || (seconds as number) < 20 || (seconds as number) > 120) {
    throw new Error('ตั้งค่าไม่ถูกต้อง: รอบ 1–10 หมวด 3–8 เวลา 20–120 วินาที');
  }
  return { rounds: rounds as number, categories: categories as number, seconds: seconds as number };
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
    && wordInitialForCategory(answer,category) === letter
    && eligibleCategories(letter).includes(category)
    && (acceptedWords.get(category)?.has(canonicalAnswer(answer,category)) ?? false);
}
export function cleanAnswers(value: unknown, categories: string[]): Record<string,string> {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
  return Object.fromEntries(categories.map(id => [id, normalizeAnswer(input[id])]));
}

export function chooseRound(match: Match, random = Math.random) {
  const supported = LETTERS.filter(letter => eligibleCategories(letter).length >= match.settings.categories);
  if (supported.length === 0) throw new Error('NO_SUPPORTED_LETTERS');
  const candidateLetters = supported.filter(letter => !match.previousLetters.slice(-6).includes(letter));
  const letters = candidateLetters.length ? candidateLetters : supported;
  const letter = letters[Math.min(letters.length-1, Math.floor(random()*letters.length))];
  let pool = eligibleCategories(letter).filter(id => !match.previousCategories.includes(id));
  if (pool.length < match.settings.categories) pool = eligibleCategories(letter);
  const chosen: string[] = [];
  for (let i=0;i<match.settings.categories;i++) {
    // Prefer categories offering more distinct valid answers, reducing easy duplicates.
    const weights=pool.map(category=>{
      const count=new Set((WORD_BANK[category] || [])
        .filter(word=>wordInitialForCategory(word,category)===letter)
        .map(word=>canonicalAnswer(word,category))).size;
      return Math.min(4,Math.max(1,(count-MIN_WORDS_PER_PAIR)/2+1));
    });
    const totalWeight=weights.reduce((sum,weight)=>sum+weight,0);
    let roll=Math.max(0,Math.min(0.999999999,random()))*totalWeight;
    let index=weights.length-1;
    for(let j=0;j<weights.length;j++){
      roll-=weights[j];
      if(roll<0){index=j;break;}
    }
    chosen.push(pool.splice(index,1)[0]);
  }
  return { letter, categories: chosen };
}
export function scoreRound(match: Match): RoundEntry[] {
  const all = match.players.map(player => ({ player, answers: cleanAnswers(match.submissions[player.id], match.categories) }));
  return all.map(({ player, answers }) => {
    const perCategory: Record<string,number> = {};
    for (const category of match.categories) {
      const answer = answers[category];
      if (!validAnswer(answer,match.letter,category)) { perCategory[category]=0; continue; }
      const duplicateCount = all.filter(entry =>
        validAnswer(entry.answers[category],match.letter,category) &&
        canonicalAnswer(entry.answers[category],category) === canonicalAnswer(answer,category)).length;
      perCategory[category] = duplicateCount > 1 ? 1 : 2;
    }
    return { id: player.id, name: player.name, answers, perCategory,
      points: Object.values(perCategory).reduce((a,b)=>a+b,0) };
  });
}
export function advance(match: Match, now: number, random = Math.random): Match {
  match.players = match.players.filter(player => now-player.lastSeen <= IDLE_SECONDS*1000);
  if (!match.players.some(player => player.id === match.ownerId)) {
    match.ownerId = match.players[0]?.id || '';
  }
  if (match.phase === 'playing' && now >= match.deadline) {
    const entries = scoreRound(match);
    for (const entry of entries) {
      const player = match.players.find(player => player.id===entry.id);
      if (player) player.score += entry.points;
    }
    match.history.push({ round:match.round, letter:match.letter, categories:[...match.categories], entries });
    match.phase='review';
    match.deadline=now+REVIEW_SECONDS*1000;
  } else if (match.phase === 'review' && now >= match.deadline) {
    if (match.round >= match.settings.rounds || match.players.length === 0) {
      match.phase='final';
      match.deadline=0;
    } else {
      const round = chooseRound(match,random);
      match.round++;
      match.letter=round.letter; match.categories=round.categories;
      match.previousLetters.push(round.letter);
      match.previousCategories.push(...round.categories);
      match.phase='playing'; match.submissions={};
      match.deadline=now+match.settings.seconds*1000;
    }
  }
  match.ttl=Math.floor(now/1000)+86400;
  return match;
}
export function snapshot(match: Match) {
  return {
    roomId:match.id, phase:match.phase, round:match.round, letter:match.letter,
    categories:match.categories, deadline:match.deadline, countdown:match.countdown,
    ownerId:match.ownerId, settings:match.settings,
    players:match.players.map(({id,name,score})=>({id,name,score})),
    submitted:match.phase==='playing' ? Object.keys(match.submissions) : [],
    history:match.phase==='review'||match.phase==='final' ? match.history : [],
    revision:match.version
  };
}
export function applyAction(
  match: Match, action: string, userId: string, now: number,
  name='', answers?:unknown, rawSettings?:unknown
) {
  // Enforce server clock before processing submissions or owner actions.
  advance(match,now);
  const player=match.players.find(player=>player.id===userId);
  if (action==='create') {
    if (match.players.length!==0) throw new Error('ROOM_UNAVAILABLE');
    const nickname=name.trim().replace(/[<>]/g,'').slice(0,18);
    if (!nickname) throw new Error('กรุณาใส่ชื่อเล่น');
    match.ownerId=userId;
    match.settings=validateSettings(rawSettings);
    match.players.push({id:userId,name:nickname,score:0,lastSeen:now});
  } else if (action==='join') {
    if (player) {
      player.lastSeen=now;
    } else {
      if (match.phase!=='lobby' || match.players.length===0 || match.players.length>=MAX_PLAYERS)
        throw new Error('ห้องนี้เริ่มเกมแล้วหรือเต็มแล้ว');
      const nickname=name.trim().replace(/[<>]/g,'').slice(0,18);
      if (!nickname) throw new Error('กรุณาใส่ชื่อเล่น');
      match.players.push({id:userId,name:nickname,score:0,lastSeen:now});
    }
  } else if (action==='leave') {
    if (!player) throw new Error('NOT_JOINED');
    match.players=match.players.filter(p=>p.id!==userId);
    if (match.ownerId===userId) match.ownerId=match.players[0]?.id || '';
    delete match.submissions[userId];
  } else {
    if (!player) throw new Error('NOT_JOINED');
    player.lastSeen=now;
    if (action==='settings') {
      if (match.ownerId!==userId) throw new Error('เฉพาะเจ้าของห้องเท่านั้นที่ตั้งค่าได้');
      if (match.phase!=='lobby') throw new Error('เปลี่ยนค่าได้เฉพาะก่อนเริ่มเกม');
      match.settings=validateSettings(rawSettings);
    } else if (action==='start') {
      if (match.ownerId!==userId) throw new Error('เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้');
      if (match.phase!=='lobby') throw new Error('เกมเริ่มไปแล้ว');
      if (match.players.length<2) throw new Error('ต้องมีผู้เล่นอย่างน้อย 2 คน');
      // Starting commits the settings in the same authorized mutation.
      if (rawSettings!==undefined) match.settings=validateSettings(rawSettings);
      match.round=1;
      match.history=[];match.submissions={};match.previousLetters=[];match.previousCategories=[];
      const round=chooseRound(match);
      match.letter=round.letter;match.categories=round.categories;
      match.previousLetters.push(round.letter);match.previousCategories.push(...round.categories);
      match.phase='playing';
      match.deadline=now+match.settings.seconds*1000;
    } else if (action==='reset') {
      if (match.ownerId!==userId) throw new Error('เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมใหม่ได้');
      if (match.phase!=='final') throw new Error('เกมยังไม่จบ');
      match.phase='lobby';match.round=0;match.letter='';match.categories=[];match.deadline=0;
      match.submissions={};match.history=[];match.previousLetters=[];match.previousCategories=[];
      for(const p of match.players)p.score=0;
    } else if (action==='draft' || action==='submit') {
      // The most recent server-saved input is scored at the deadline.
      // A previous draft is fully replaced so clearing text also removes it.
      if (match.phase!=='playing' || now>=match.deadline) throw new Error('หมดเวลาบันทึกคำตอบแล้ว');
      match.submissions[userId]=cleanAnswers(answers,match.categories);
    } else if (action!=='pulse') {
      throw new Error('UNKNOWN_ACTION');
    }
  }
  return advance(match,now);
}

/** Safe public lobby projection; never returns player identities, answers or invite links. */
export type PublicRoom = {
  roomId:string; hostName:string; playerCount:number; settings:GameSettings; createdAt:number;
};
export function publicRoom(match:Match,now:number):PublicRoom|null {
  if(match.phase!=='lobby' || !/^room-[a-f0-9]{20}$/.test(match.id))return null;
  const active=match.players.filter(player=>now-player.lastSeen<=IDLE_SECONDS*1000);
  if(!active.length || active.length>=MAX_PLAYERS)return null;
  const owner=active.find(player=>player.id===match.ownerId) || active[0];
  if(!owner)return null;
  return {
    roomId:match.id, hostName:owner.name.slice(0,18), playerCount:active.length,
    settings:match.settings || {...DEFAULT_SETTINGS}, createdAt:match.createdAt || 0
  };
}
