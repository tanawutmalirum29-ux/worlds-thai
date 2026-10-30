import { WORD_BANK, EXCLUDED_LETTERS, MIN_WORDS_PER_PAIR, MIN_CATEGORIES_PER_LETTER } from './dictionary.ts';
import { NEIGHBOR_PROVINCE_ALIASES } from './neighbor-provinces.ts';
import { JOB_CANONICAL_ALIASES } from './additional-jobs.ts';
import { isInappropriateLanguage, isBlockedStandaloneAnswer, nicknameValidationMessage } from './moderation.ts';

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
/** Prefixes that are descriptive category words, not the answer's initial.
 * Normalization is strictly category-local and never accepts an unlisted name.
 * E.g. ปลาดุก / ดุก -> ด, นกกระจอก / กระจอก -> ก.
 */
export const OPTIONAL_NAME_PREFIXES:Readonly<Record<string,string>>={
  tree:'ต้น',flower:'ดอก',bird:'นก',insect:'แมลง',fish:'ปลา'
};
const GENERIC_NAMES:Readonly<Record<string,readonly string[]>>={
  tree:['ต้น','ต้นไม้','ไม้'],
  flower:['ดอก','ดอกไม้'],
  bird:['นก'],insect:['แมลง'],fish:['ปลา']
};
function nameWithoutCategoryPrefix(value:unknown,category:string):string {
  const word=normalizeAnswer(value).toLocaleLowerCase('th');
  const prefix=OPTIONAL_NAME_PREFIXES[category];
  if(!prefix||!word)return word;
  if(GENERIC_NAMES[category]?.includes(word))return '';
  if(word.startsWith(prefix)){
    const remainder=normalizeAnswer(word.slice(prefix.length)).toLocaleLowerCase('th');
    // A second prefix and generic nouns must not become answers.
    if(!remainder || remainder.startsWith(prefix) ||
       GENERIC_NAMES[category]?.includes(remainder) ||
       (category==='tree'&&remainder==='ไม้') ||
       (category==='flower'&&remainder==='ไม้'))return '';
    return remainder;
  }
  return word;
}
/** In desserts, ขนม is only a label prefix, not the first letter of the answer.
 * ขนมไข่ => ข, ขนมครก => ค. All other categories keep normal initials.
 * The bare word ขนม yields no answer consonant.
 */
export function wordInitialForCategory(value:string,category:string):string {
  if(Object.prototype.hasOwnProperty.call(OPTIONAL_NAME_PREFIXES,category))
    return initialConsonant(nameWithoutCategoryPrefix(value,category));
  const word=normalizeAnswer(value);
  if(category==='dessert' && word.startsWith('ขนม'))
    return initialConsonant(normalizeAnswer(word.slice('ขนม'.length)));
  return initialConsonant(word);
}
// Named sweet aliases refer to the SAME dessert (not separate distinct answers).
// Historical vulgar spellings are canonicalized ONLY for legacy analytics;
// validAnswer() and cleanAnswers() reject them for all new gameplay.
const dessertAliases:Readonly<Record<string,string>>={
  'ไข่เหี้ย':'ไข่หงส์',
  // Both Thai names describe the same traditional sweet.
  'สอดไส้':'ขนมสอดไส้',
  'ใส่ไส้':'ขนมสอดไส้',
  'ขนมใส่ไส้':'ขนมสอดไส้',
  // Common shorthand for the same French pastry; count it once.
  'ครัวซอง':'ครัวซองต์'
};
// Common typed variants of specific named drinks resolve to one canonical
// score/stat identity. This is strictly drink-category-local.
const drinkAliases: Readonly<Record<string,string>>={
  'สไปร์':'สไปรท์',
  'สไปรต์':'สไปรท์',
  'โคคาโคล่า':'โค้ก',
  'โคคาโคลา':'โค้ก',
  'เอสเพรสโซ':'เอสเปรสโซ'
};
const dessertVocabulary=new Set(WORD_BANK.dessert.map(word=>normalizeAnswer(word).toLocaleLowerCase('th')));
/** Accepted Thai flamingo spelling variants. They are not separate rarity words. 
 * Both spellings are used by Thai-language sources; the unmarked form is canonical.
 * A bird-category leading นก is normally removed, whereas animal keeps that
 * leading นก in its own น-letter identity so stats retain the correct round key.
 */
const flamingoAliases: Readonly<Record<string,string>> = {
  'ฟลามิงโก้':'ฟลามิงโก',
  'ฟลามิงโก้ใหญ่':'ฟลามิงโกใหญ่',
  'ฟลามิงโก้เล็ก':'ฟลามิงโกเล็ก',
  'นกฟลามิงโก้':'นกฟลามิงโก'
};
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
  if(Object.prototype.hasOwnProperty.call(OPTIONAL_NAME_PREFIXES,category)){
    const name=nameWithoutCategoryPrefix(raw,category);
    return category==='bird' ? (flamingoAliases[name] || name) : name;
  }
  if(category==='animal')return flamingoAliases[raw] || raw;
  // Only explicitly approved alternatives share an occupation identity.
  // Do not strip นัก globally: บิน is not a synonym for นักบิน.
  if(category==='job')return JOB_CANONICAL_ALIASES[raw] || raw;
  if(category==='drink')return drinkAliases[raw] || raw;
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
export type GameMode = 'letter' | 'category';
export type GameSettings = { rounds: number; categories: number; seconds: number; mode?: GameMode };
export function gameMode(settings: GameSettings): GameMode { return settings.mode === 'category' ? 'category' : 'letter'; }
/** Category mode stores a different consonant as each answer slot; classic mode stores categories. */
export function roundCategory(slot:string,topicCategory?:string):string {return topicCategory || slot;}
export function roundLetter(letter:string,slot:string,topicCategory?:string):string {return topicCategory ? slot : letter;}
export function validRoundAnswer(value:string,letter:string,slot:string,topicCategory?:string):boolean {
  return validAnswer(value,roundLetter(letter,slot,topicCategory),roundCategory(slot,topicCategory));
}
export const REVIEW_SECONDS = 10;
export const RUSH_ANIMATION_MS = 1800;
// Give slow connections time to recover without losing their player slot.
export const IDLE_SECONDS = 150;
export const ROUND_SECONDS = DEFAULT_SETTINGS.seconds;
export const ROUNDS = DEFAULT_SETTINGS.rounds;
export type Phase = 'lobby' | 'playing' | 'review' | 'final';
export type Player = { id: string; name: string; score: number; lastSeen: number };
export type RoundEntry = { id: string; name: string; answers: Record<string,string>; points: number; perCategory: Record<string,number>; rarityBonus?: Record<string,number> };
export type History = { round: number; letter: string; categories: string[]; entries: RoundEntry[]; topicCategory?:string };
export type Match = {
  id: string; version: number; phase: Phase; players: Player[]; round: number;
  ownerId: string; settings: GameSettings; createdAt?: number;
  letter: string; categories: string[]; topicCategory?:string; deadline: number; countdown: number;
  submissions: Record<string, Record<string,string>>; history: History[];
  previousLetters: string[]; previousCategories: string[]; ttl: number;
  /** Current round's SERVER-ONLY daily rarity snapshot; never returned during play. */
  rarityBonuses?: Record<string, Record<string, number>>;
  /** Votes are keyed by server-issued Cognito guest identity, never tab-specific identifiers. */
  skipVotes?: Record<string, true>;
  rematchVotes?: Record<string, true>;
  /** Server-owned acceleration: fast visual sweep followed by 5 real seconds. */
  timeRush?: {start:number; ends:number; from:number};
};
export function newMatch(id: string, now: number): Match {
  return { id, version: 0, phase: 'lobby', players: [], ownerId: '', createdAt: now, settings: { ...DEFAULT_SETTINGS },
    round: 0, letter: '', categories: [], deadline: 0, countdown: 0,
    submissions: {}, history: [], previousLetters: [], previousCategories: [],
    skipVotes:{}, rematchVotes:{},
    ttl: Math.floor(now / 1000) + 86400 };
}
export function validateSettings(raw: unknown): GameSettings {
  const value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string,unknown> : {};
  const rounds = value.rounds ?? DEFAULT_SETTINGS.rounds;
  const categories = value.categories ?? DEFAULT_SETTINGS.categories;
  const seconds = value.seconds ?? DEFAULT_SETTINGS.seconds;
  const mode = value.mode;
  if (!Number.isInteger(rounds) || !Number.isInteger(categories) || !Number.isInteger(seconds)
    || (rounds as number) < 1 || (rounds as number) > 10
    || (categories as number) < 3 || (categories as number) > 8
    || (seconds as number) < 20 || (seconds as number) > 120
    || (mode !== undefined && mode !== 'letter' && mode !== 'category')) {
    throw new Error('ตั้งค่าไม่ถูกต้อง: รอบ 1–10 หมวด 3–8 เวลา 20–120 วินาที');
  }
  return { rounds: rounds as number, categories: categories as number, seconds: seconds as number,
    ...(mode !== undefined ? {mode:mode as GameMode} : {}) };
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
    && !isInappropriateLanguage(answer)
    && !isBlockedStandaloneAnswer(answer)
    && wordInitialForCategory(answer,category) === letter
    && eligibleCategories(letter).includes(category)
    && (acceptedWords.get(category)?.has(canonicalAnswer(answer,category)) ?? false);
}
export function cleanAnswers(value: unknown, categories: string[]): Record<string,string> {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string,unknown> : {};
  return Object.fromEntries(categories.map(id => {
    const answer=normalizeAnswer(input[id]);
    return [id,isInappropriateLanguage(answer)||isBlockedStandaloneAnswer(answer)?'':answer];
  }));
}

/** Each category-mode letter must have >=2 distinct reviewed answers and be playable. */
export function eligibleCategoryLetters(category:string):string[] {
  return LETTERS.filter(letter => eligibleCategories(letter).includes(category));
}
export function chooseRound(match: Match, random = Math.random) {
  if(gameMode(match.settings)==='category'){
    const supported=CATEGORIES.map(([id])=>id).filter(category=>
      eligibleCategoryLetters(category).length>=match.settings.categories);
    if(!supported.length)throw new Error('NO_SUPPORTED_CATEGORIES');
    const fresh=supported.filter(category=>!match.previousCategories.slice(-2).includes(category));
    const categories=fresh.length?fresh:supported;
    const topicCategory=categories[Math.min(categories.length-1,Math.max(0,Math.floor(random()*categories.length)))];
    const available=eligibleCategoryLetters(topicCategory);
    const unrepeated=available.filter(letter=>!match.previousLetters.slice(-8).includes(letter));
    const pool=unrepeated.length>=match.settings.categories?unrepeated:available;
    const selected:string[]=[];
    while(selected.length<match.settings.categories){
      const weights=pool.map(letter=>{
        const count=new Set((WORD_BANK[topicCategory]||[])
          .filter(word=>wordInitialForCategory(word,topicCategory)===letter)
          .map(word=>canonicalAnswer(word,topicCategory))).size;
        return Math.min(5,Math.max(1,count/2));
      });
      const total=weights.reduce((sum,weight)=>sum+weight,0);
      let roll=Math.max(0,Math.min(0.999999999,random()))*total;
      let index=pool.length-1;
      for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<0){index=i;break;}}
      selected.push(pool.splice(index,1)[0]);
    }
    return {letter:'',categories:selected,topicCategory};
  }
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
  return { letter, categories: chosen, topicCategory:undefined as string|undefined };
}
export function scoreRound(match: Match): RoundEntry[] {
  const all = match.players.map(player => ({ player, answers: cleanAnswers(match.submissions[player.id], match.categories) }));
  return all.map(({ player, answers }) => {
    const perCategory: Record<string,number> = {};
    const rarityBonus: Record<string,number> = {};
    const candidates: {category:string; bonus:number}[] = [];
    for (const [index,slot] of match.categories.entries()) {
      const category=roundCategory(slot,match.topicCategory);
      const answer=answers[slot];
      if(!validRoundAnswer(answer,match.letter,slot,match.topicCategory)){
        perCategory[slot]=0;continue;
      }
      const canonical=canonicalAnswer(answer,category);
      // Duplicate words within the same player's topic are never worth extra points.
      if(match.topicCategory && match.categories.slice(0,index).some(previous=>
        validRoundAnswer(answers[previous],match.letter,previous,match.topicCategory) &&
        canonicalAnswer(answers[previous],category)===canonical)){
        perCategory[slot]=0;continue;
      }
      const duplicateCount=all.filter(entry=>
        validRoundAnswer(entry.answers[slot],match.letter,slot,match.topicCategory) &&
        canonicalAnswer(entry.answers[slot],category)===canonical).length;
      perCategory[slot]=duplicateCount>1?1:2;
      if(duplicateCount===1){
        const bonus=match.rarityBonuses?.[slot]?.[canonical]||0;
        if(bonus===1||bonus===2)candidates.push({category:slot,bonus});
      }
    }
    // The rarest word receives priority; cap bonuses at +3 per player per round.
    let remainingBonus = 3;
    for (const candidate of candidates.sort((a,b) => b.bonus-a.bonus)) {
      const bonus = Math.min(candidate.bonus,remainingBonus);
      if (bonus <= 0) break;
      rarityBonus[candidate.category] = bonus;
      perCategory[candidate.category] += bonus;
      remainingBonus -= bonus;
    }
    return { id: player.id, name: player.name, answers, perCategory, rarityBonus,
      points: Object.values(perCategory).reduce((a,b)=>a+b,0) };
  });
}

function resetToLobby(match:Match) {
  // Keep room, connected players, owner and last settings; only the run resets.
  match.phase='lobby';match.round=0;match.letter='';match.categories=[];match.topicCategory=undefined;match.deadline=0;
  match.submissions={};match.history=[];match.previousLetters=[];match.previousCategories=[];
  match.rarityBonuses={};match.skipVotes={};match.rematchVotes={};match.timeRush=undefined;
  for(const p of match.players)p.score=0;
}
function pruneVotes(match:Match) {
  const active=new Set(match.players.map(p=>p.id));
  for(const votes of [match.skipVotes,match.rematchVotes]) {
    if(!votes)continue;
    for(const id of Object.keys(votes))if(!active.has(id))delete votes[id];
  }
}
/** Queries can advance expired server-owned phases as well as heartbeats.
 * Read-only refreshes must not write when a deadline has not yet passed.
 */
export function timedTransitionDue(match:Pick<Match,'phase'|'deadline'>, now:number):boolean {
  return (match.phase==='playing'||match.phase==='review') &&
    match.deadline>0 && now>=match.deadline;
}
export function advance(match: Match, now: number, random = Math.random): Match {
  match.players = match.players.filter(player => now-player.lastSeen <= IDLE_SECONDS*1000);
  pruneVotes(match);
  // Membership changes are reflected in quorum, without trusting client counts.
  if(match.phase==='final' && match.players.length &&
    match.players.every(p=>match.rematchVotes?.[p.id]))resetToLobby(match);
  if(match.phase==='playing' && !match.timeRush && match.players.length &&
    match.players.every(p=>match.skipVotes?.[p.id]) && now<match.deadline) {
    const from=Math.ceil((match.deadline-now)/1000);
    if(from>7) {
      match.timeRush={start:now,ends:now+RUSH_ANIMATION_MS,from};
      match.deadline=now+RUSH_ANIMATION_MS+5000;
    } else if(from>5) {
      // For an almost-finished round, never extend the original deadline.
      match.deadline=Math.min(match.deadline,now+5000);
    }
    // Retain n/n on clients throughout the rush; cleared when round finishes.
  }
  if (!match.players.some(player => player.id === match.ownerId)) {
    match.ownerId = match.players[0]?.id || '';
  }
  if (match.phase === 'playing' && now >= match.deadline) {
    const entries = scoreRound(match);
    for (const entry of entries) {
      const player = match.players.find(player => player.id===entry.id);
      if (player) player.score += entry.points;
    }
    match.history.push({ round:match.round, letter:match.letter, categories:[...match.categories], topicCategory:match.topicCategory, entries });
    match.phase='review';
    match.skipVotes={};match.timeRush=undefined;
    match.deadline=now+REVIEW_SECONDS*1000;
  } else if (match.phase === 'review' && now >= match.deadline) {
    if (match.round >= match.settings.rounds || match.players.length === 0) {
      match.phase='final';
      match.rematchVotes={};
      match.deadline=0;
    } else {
      const round = chooseRound(match,random);
      match.round++;
      match.letter=round.letter; match.categories=round.categories;match.topicCategory=round.topicCategory;
      match.previousLetters.push(...(round.topicCategory?round.categories:[round.letter]));
      match.previousCategories.push(...(round.topicCategory?[round.topicCategory]:round.categories));
      match.phase='playing'; match.submissions={}; match.rarityBonuses={};
      match.skipVotes={};match.timeRush=undefined;
      match.deadline=now+match.settings.seconds*1000;
    }
  }
  match.ttl=Math.floor(now/1000)+86400;
  return match;
}
export function snapshot(match: Match) {
  return {
    roomId:match.id, phase:match.phase, round:match.round, letter:match.letter, topicCategory:match.topicCategory,
    categories:match.categories, deadline:match.deadline, countdown:match.countdown,
    ownerId:match.ownerId, settings:match.settings,
    players:match.players.map(({id,name,score})=>({id,name,score})),
    submitted:match.phase==='playing' ? Object.keys(match.submissions) : [],
    // The server never exposes raw in-progress guesses, even to room members.
    // Other players see fixed-width markers; each player's actual input stays local.
    maskedAnswers:match.phase==='playing' ? Object.fromEntries(match.players.map(player=>[
      player.id,Object.fromEntries(match.categories.filter(slot=>{
        const answer=match.submissions[player.id]?.[slot];
        return Boolean(normalizeAnswer(answer)) && !isInappropriateLanguage(answer) && !isBlockedStandaloneAnswer(answer);
      }).map(slot=>[slot,'1234']))
    ])) : {},
    skipVotes:match.phase==='playing'?Object.keys(match.skipVotes||{}):[],
    rematchVotes:match.phase==='final'?Object.keys(match.rematchVotes||{}):[],
    timeRush:match.phase==='playing'?match.timeRush:undefined,
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
    const nicknameError=nicknameValidationMessage(nickname);
    if (nicknameError) throw new Error(nicknameError);
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
      const nicknameError=nicknameValidationMessage(nickname);
      if (nicknameError) throw new Error(nicknameError);
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
      match.skipVotes={};match.rematchVotes={};match.timeRush=undefined;
      const round=chooseRound(match);
      match.letter=round.letter;match.categories=round.categories;match.topicCategory=round.topicCategory;
      match.previousLetters.push(...(round.topicCategory?round.categories:[round.letter]));
      match.previousCategories.push(...(round.topicCategory?[round.topicCategory]:round.categories));
      match.phase='playing'; match.rarityBonuses={};
      match.deadline=now+match.settings.seconds*1000;
    } else if (action==='rematch') {
      if(match.phase!=='final')throw new Error('โหวตเล่นใหม่ได้เมื่อจบเกมเท่านั้น');
      match.rematchVotes??={};
      match.rematchVotes[userId]=true;
    } else if (action==='skip') {
      if(match.phase!=='playing')throw new Error('ข้ามเวลาได้ระหว่างตอบคำเท่านั้น');
      if(match.timeRush||match.deadline-now<=5000)throw new Error('เหลือเวลาไม่เกิน 5 วินาทีแล้ว');
      match.skipVotes??={};
      match.skipVotes[userId]=true;
    } else if (action==='reset') {
      // Legacy action is a vote too: the owner must NOT bypass other players.
      if (match.ownerId!==userId) throw new Error('เฉพาะเจ้าของห้องเท่านั้นที่ใช้ปุ่มเดิมได้');
      if (match.phase!=='final') throw new Error('เกมยังไม่จบ');
      match.rematchVotes??={};
      match.rematchVotes[userId]=true;
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
