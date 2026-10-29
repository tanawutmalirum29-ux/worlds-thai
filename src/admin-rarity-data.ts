import {canonicalAnswer,eligibleCategories} from '../amplify/functions/game/logic.ts';
import {rarityDay} from '../amplify/functions/game/rarity.ts';
import type {Entry} from './admin-data.ts';

export type RarityMetaRecord={
  category:string;letter:string;
  groupStartedAt:number|null;
  firstEligibleAt:Record<string,number>;
  snapshot:{
    day:string;eligible:boolean;observations:number;uniquePlayers:number;uniqueRooms:number;
    bonuses:Record<string,number>;
    candidates:Record<string,{tier:number;streak:number}>;
    recentWordUses?:Record<string,number>;
    evaluatedAt?:number;
  }|null;
};
export type GroupState='not-playable'|'not-started'|'stale'|'learning'|'no-rare'|'active';
export type RarityWordRow={
  word:string; canonical:string; lifetimeUses:number; lifetimePoints:number;
  recentUses:number|null; firstEligibleAt:number|null;
  bonus:0|1|2; pendingTier:0|1|2; pendingDays:number;
};
export type RarityGroupRow={
  key:string;category:string;letter:string;state:GroupState;
  totalWords:number; lifetimeUses:number; recentUses:number|null;
  rareWords:number;veryRareWords:number;
  snapshotDay:string|null;groupStartedAt:number|null;
  uniquePlayers:number|null;uniqueRooms:number|null;observations:number|null;
  words:RarityWordRow[];
};
export function rarityPairKey(category:string,letter:string):string{return category+'\u0000'+letter;}
export function displayRarityState(state:GroupState):string{
  switch(state){
    case 'not-playable':return 'ยังไม่เข้าเงื่อนไขสุ่มเล่น';
    case 'not-started':return 'ยังไม่เริ่มสะสมสถิติ';
    case 'stale':return 'รอประเมินรอบใหม่';
    case 'learning':return 'กำลังเรียนรู้ / ข้อมูลไม่พอ';
    case 'no-rare':return 'ไม่มีคำหายาก';
    case 'active':return 'มีคำหายาก';
  }
}
export function buildRarityGroups(
  entries:Entry[],records:RarityMetaRecord[],now:number=Date.now()
):RarityGroupRow[]{
  const latestDay=rarityDay(now);
  const byRecord=new Map<string,RarityMetaRecord>();
  for(const record of records){
    if(record && typeof record.category==='string' && typeof record.letter==='string')
      byRecord.set(rarityPairKey(record.category,record.letter),record);
  }
  const grouped=new Map<string,RarityGroupRow>();
  for(const entry of entries){
    // Draft words live only on the current browser; they do not participate in rarity.
    if(entry.draft)continue;
    const key=rarityPairKey(entry.category,entry.letter);
    let group=grouped.get(key);
    if(!group){
      const meta=byRecord.get(key);
      const snapshot=meta?.snapshot;
      const playable=eligibleCategories(entry.letter).includes(entry.category);
      const rare=Object.values(snapshot?.bonuses||{}).filter(n=>n===1||n===2).length;
      const state:GroupState=!playable?'not-playable':!meta?'not-started':
        !snapshot||snapshot.day!==latestDay?'stale':
        !snapshot.eligible?'learning':rare?'active':'no-rare';
      group={
        key,category:entry.category,letter:entry.letter,state,totalWords:0,
        lifetimeUses:0,recentUses:snapshot?.recentWordUses?0:null,
        rareWords:0,veryRareWords:0,snapshotDay:snapshot?.day||null,
        groupStartedAt:meta?.groupStartedAt||null,
        uniquePlayers:snapshot?.uniquePlayers??null,uniqueRooms:snapshot?.uniqueRooms??null,
        observations:snapshot?.observations??null,words:[]
      };
      grouped.set(key,group);
    }
    const record=byRecord.get(key);
    const snap=record?.snapshot;
    const canonical=canonicalAnswer(entry.word,entry.category);
    const tier=snap?.bonuses?.[canonical];
    const bonus:0|1|2=tier===2?2:tier===1?1:0;
    const pending=snap?.candidates?.[canonical];
    const pendingTier:0|1|2=pending?.tier===2?2:pending?.tier===1?1:0;
    const rawRecent=snap?.recentWordUses?.[canonical];
    const recentUses=typeof rawRecent==='number'&&Number.isFinite(rawRecent)?rawRecent:
      snap?.recentWordUses?0:null;
    group.words.push({word:entry.word,canonical,lifetimeUses:entry.uses,
      lifetimePoints:entry.points,recentUses,firstEligibleAt:record?.firstEligibleAt?.[canonical]??null,
      bonus,pendingTier,pendingDays:pending?.streak||0});
    group.totalWords++;
    group.lifetimeUses+=entry.uses;
    if(group.recentUses!==null && recentUses!==null)group.recentUses+=recentUses;
    if(bonus===1)group.rareWords++;
    if(bonus===2)group.veryRareWords++;
  }
  return [...grouped.values()].sort((a,b)=>a.category.localeCompare(b.category,'th')||
    a.letter.localeCompare(b.letter,'th'));
}
export function rarityGroupSummary(groups:RarityGroupRow[]){
  return {
    groups:groups.length,playable:groups.filter(g=>g.state!=='not-playable').length,
    active:groups.filter(g=>g.state==='active').length,
    noRare:groups.filter(g=>g.state==='no-rare').length,
    learning:groups.filter(g=>g.state==='learning'||g.state==='stale'||g.state==='not-started').length,
    rare:groups.reduce((sum,g)=>sum+g.rareWords,0),
    veryRare:groups.reduce((sum,g)=>sum+g.veryRareWords,0)
  };
}
