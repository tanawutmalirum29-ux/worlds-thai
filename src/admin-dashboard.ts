import {initialConsonant,normalizeAnswer} from '../amplify/functions/game/logic.ts';
import {CATEGORY_OPTIONS,type Entry} from './admin-data.ts';
import type {WordStatRecord} from './stats-export.ts';

export type UsageMetric='uses'|'points';
export type UsageOrder='most'|'least';
export type GroupBy='category'|'letter'|'pair';
export type DashboardEntry=Entry & {archived?:boolean};
export type UsageGroup={key:string;category:string;letter:string;label:string;entries:number;usedEntries:number;uses:number;points:number;coverage:number};
export type UsageTotals={entries:number;usedEntries:number;unusedEntries:number;uses:number;points:number;coverage:number};
const labels=new Map(CATEGORY_OPTIONS.map(c=>[c.id,c.label]));
const normalized=(word:string)=>normalizeAnswer(word).toLocaleLowerCase('th');
const key=(category:string,word:string)=>category+'\u0000'+normalized(word);
const thaiSort=(a:string,b:string)=>a.localeCompare(b,'th');

export function mergeHistoricalStats(entries:Entry[],rawStats:WordStatRecord[]):DashboardEntry[]{
  const combined:DashboardEntry[]=entries.map(row=>({...row}));
  const seen=new Set(entries.map(row=>key(row.category,row.word)));
  // Statistics are retained independently from the curated dictionary.
  // Include previously accepted words without putting them back into gameplay.
  for(const row of rawStats){
    if(!row || typeof row.category!=='string'||typeof row.word!=='string')continue;
    const id=key(row.category,row.word);
    if(seen.has(id)||!Number.isFinite(row.timesUsed)||row.timesUsed<=0)continue;
    seen.add(id);
    combined.push({word:row.word,category:row.category,label:labels.get(row.category)||row.category,
      letter:initialConsonant(row.word),draft:false,archived:true,
      uses:row.timesUsed,points:row.totalPoints||0,lastUsedAt:row.lastUsedAt||null});
  }
  return combined;
}
export function dashboardFilter(entries:DashboardEntry[],category='',letter=''):DashboardEntry[]{
  return entries.filter(row=>(!category||row.category===category)&&(!letter||row.letter===letter));
}
export function sumUsage(entries:Pick<Entry,'uses'|'points'>[]):UsageTotals{
  let usedEntries=0,uses=0,points=0;
  for(const row of entries){if(row.uses>0)usedEntries++;uses+=row.uses;points+=row.points;}
  return {entries:entries.length,usedEntries,unusedEntries:entries.length-usedEntries,uses,points,
    coverage:entries.length?usedEntries/entries.length*100:0};
}
export function rankUsage<T extends DashboardEntry>(entries:T[],metric:UsageMetric,order:UsageOrder):T[]{
  const direction=order==='most'?-1:1;
  return [...entries].sort((a,b)=>direction*(a[metric]-b[metric])||
    direction*(a.uses-b.uses)||thaiSort(a.word,b.word)||thaiSort(a.category,b.category));
}
export function usageGroups(entries:DashboardEntry[],by:GroupBy):UsageGroup[]{
  const aggregated=new Map<string,UsageGroup>();
  for(const row of entries){
    const category=by==='letter'?'':row.category;
    const letter=by==='category'?'':row.letter;
    const id=category+'\u0000'+letter;
    let group=aggregated.get(id);
    if(!group){
      group={key:id,category,letter,label:by==='category'?(labels.get(category)||category):
        by==='letter'?letter:((labels.get(category)||category)+' · '+letter),
        entries:0,usedEntries:0,uses:0,points:0,coverage:0};
      aggregated.set(id,group);
    }
    group.entries++;
    if(row.uses>0)group.usedEntries++;
    group.uses+=row.uses;
    group.points+=row.points;
  }
  for(const group of aggregated.values())group.coverage=group.entries?group.usedEntries/group.entries*100:0;
  return [...aggregated.values()];
}
export function rankGroups(groups:UsageGroup[],metric:UsageMetric,order:UsageOrder):UsageGroup[]{
  const direction=order==='most'?-1:1;
  return [...groups].sort((a,b)=>direction*(a[metric]-b[metric])||
    direction*(a.uses-b.uses)||thaiSort(a.label,b.label));
}
export function usageMatrix(entries:DashboardEntry[]){
  const categories=[...new Set(entries.map(row=>row.category))].sort((a,b)=>thaiSort(labels.get(a)||a,labels.get(b)||b));
  const letters=[...new Set(entries.map(row=>row.letter))].sort(thaiSort);
  const cells=new Map<string,UsageGroup>();
  for(const row of usageGroups(entries,'pair'))cells.set(row.category+'\u0000'+row.letter,row);
  return {categories,letters,cells};
}
export function categoryName(id:string):string{return labels.get(id)||id;}
