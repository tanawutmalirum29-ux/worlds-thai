import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, wordInitialForCategory, canonicalAnswer, normalizeAnswer } from '../amplify/functions/game/logic.ts';
import { letterCaption } from './letters.ts';
// Intentional nuisance gate ONLY: public code cannot secure an API.
export const EXPORT_PROMPT_CODE='251029';
export type WordStatRecord={letter:string;category:string;word:string;timesUsed:number;totalPoints:number;lastUsedAt?:number|null};
const quote=(value:string|number)=>'"'+String(value).replaceAll('"','""')+'"';
export function buildWordUsageCsv(records:WordStatRecord[],dictionary:Record<string,readonly string[]>=WORD_BANK):string{
  // Merge both historical and new stat rows for the same category+word,
  // regardless of whether an older record was filed under the prefix ข.
  const lookup=new Map<string,WordStatRecord>();
  for(const item of records){
    const k=[item.category,canonicalAnswer(item.word,item.category)].join('\u0000');
    const old=lookup.get(k);
    lookup.set(k,{...item,timesUsed:(old?.timesUsed||0)+(item.timesUsed||0),
      totalPoints:(old?.totalPoints||0)+(item.totalPoints||0),
      lastUsedAt:Math.max(old?.lastUsedAt||0,item.lastUsedAt||0)||null});
  }
  const labels=new Map<string,string>(CATEGORIES.map(([id,label])=>[id,label]));
  const rows:{letter:string;category:string;word:string;used:number;points:number;last:string}[]=[];
  for(const [category,words] of Object.entries(dictionary)){
    const seen=new Set<string>();
    for(const raw of words){
      const word=normalizeAnswer(raw),letter=wordInitialForCategory(word,category);
      const canonical=canonicalAnswer(word,category);
      if(seen.has(canonical))continue;
      seen.add(canonical);
      const stat=lookup.get([category,canonical].join('\u0000'));
      rows.push({letter,category,word,used:stat?.timesUsed||0,points:stat?.totalPoints||0,
        last:stat?.lastUsedAt?new Date(stat.lastUsedAt).toISOString():''});
    }
  }
  rows.sort((a,b)=>a.letter.localeCompare(b.letter,'th')||
    (labels.get(a.category)||a.category).localeCompare(labels.get(b.category)||b.category,'th')||
    b.used-a.used||b.points-a.points||a.word.localeCompare(b.word,'th'));
  const header=['ตัวอักษร','ชื่อพยัญชนะ','หมวด','คำศัพท์','จำนวนครั้งที่ใช้','คะแนนสะสมของคำ','ใช้ล่าสุด (UTC)'];
  const lines=[header,...rows.map(row=>[row.letter,letterCaption(row.letter),
    labels.get(row.category)||row.category,row.word,row.used,row.points,row.last])];
  return '\uFEFF'+lines.map(line=>line.map(quote).join(',')).join('\r\n')+'\r\n';
}
