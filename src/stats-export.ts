import { WORD_BANK } from '../amplify/functions/game/dictionary.ts';
import { CATEGORIES, initialConsonant, normalizeAnswer } from '../amplify/functions/game/logic.ts';
import { letterCaption } from './letters.ts';
// Intentional nuisance gate ONLY: public code cannot secure an API.
export const EXPORT_PROMPT_CODE='251029';
export type WordStatRecord={letter:string;category:string;word:string;timesUsed:number;totalPoints:number;lastUsedAt?:number|null};
const quote=(value:string|number)=>'"'+String(value).replaceAll('"','""')+'"';
export function buildWordUsageCsv(records:WordStatRecord[]):string{
  const lookup=new Map<string,WordStatRecord>();
  for(const item of records)lookup.set([item.letter,item.category,normalizeAnswer(item.word).toLocaleLowerCase('th')].join('\u0000'),item);
  const labels=new Map<string,string>(CATEGORIES.map(([id,label])=>[id,label]));
  const rows:{letter:string;category:string;word:string;used:number;points:number;last:string}[]=[];
  for(const [category,words] of Object.entries(WORD_BANK)){
    for(const raw of words){
      const word=normalizeAnswer(raw),letter=initialConsonant(word);
      const stat=lookup.get([letter,category,word.toLocaleLowerCase('th')].join('\u0000'));
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
