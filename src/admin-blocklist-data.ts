import {
  DISALLOWED_EXACT,DISALLOWED_PHRASES,BLOCKED_NICKNAME_FRAGMENT,BLOCKED_STANDALONE_ANSWER
} from '../amplify/functions/game/moderation.ts';

export type BlockKind='exact'|'contains'|'nickname'|'answer';
export type BlockedEntry={word:string;kind:BlockKind};
export const BLOCK_KIND_LABELS:Record<BlockKind,string>={
  exact:'คำหยาบ · ตรงทั้งคำ',
  contains:'คำหยาบ · มีในข้อความ',
  nickname:'ชื่อผู้เล่น · มีในชื่อ',
  answer:'คำตอบเกม · ตรงทั้งคำ'
};

/** Read-only projection of the actual validator rules; no duplicate word bank. */
export const BLOCKED_ENTRIES:readonly BlockedEntry[]=[
  ...[...DISALLOWED_EXACT].map(word=>({word,kind:'exact' as const})),
  ...DISALLOWED_PHRASES.map(word=>({word,kind:'contains' as const})),
  {word:BLOCKED_NICKNAME_FRAGMENT,kind:'nickname'},
  {word:BLOCKED_STANDALONE_ANSWER,kind:'answer'}
];

export function filterBlockedEntries(search:string,kind:BlockKind|'all'='all'):BlockedEntry[]{
  const query=search.normalize('NFC').trim().toLocaleLowerCase('th');
  return BLOCKED_ENTRIES.filter(row=>(kind==='all'||row.kind===kind)
    && (!query||row.word.toLocaleLowerCase('th').includes(query)));
}
