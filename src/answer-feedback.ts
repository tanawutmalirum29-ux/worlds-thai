import {
  OPTIONAL_NAME_PREFIXES,canonicalAnswer,normalizeAnswer,
  validAnswer,wordInitialForCategory
} from '../amplify/functions/game/logic.ts';
import {isInappropriateLanguage,isBlockedStandaloneAnswer} from '../amplify/functions/game/moderation.ts';
import {letterCaption} from './letters.ts';

export type AnswerFeedbackStatus =
  'empty'|'accepted'|'forbidden'|'inappropriate'|'prefix-not-counted'|'wrong-letter'|'unknown';
export type AnswerFeedback={status:AnswerFeedbackStatus;message:string};

/** UI-only reason for a rejected answer; never overrides server scoring. */
export function checkAnswerFeedback(input:string,requiredLetter:string,category:string):AnswerFeedback {
  const answer=normalizeAnswer(input);
  if(!answer)return {status:'empty',message:'ตรวจคำให้ทันที'};
  if(isBlockedStandaloneAnswer(answer))return {status:'forbidden',message:'ห้ามใช้คำว่า “วี” เป็นคำตอบ'};
  if(isInappropriateLanguage(answer))return {status:'inappropriate',message:
    category==='body'?'ห้ามใช้คำไม่สุภาพ · ใช้คำทางกายวิภาคแทน':'ห้ามใช้คำหยาบ กรุณาใช้คำสุภาพ'};

  const prefix=category==='dessert'?'ขนม':OPTIONAL_NAME_PREFIXES[category];
  const bare=answer.toLocaleLowerCase('th');
  const isPrefixed=Boolean(prefix&&bare.startsWith(prefix));
  const remaining=isPrefixed?normalizeAnswer(bare.slice(prefix.length)):bare;
  const canonical=canonicalAnswer(answer,category);
  const isForbidden=Boolean(prefix&&(
    !canonical ||
    bare===prefix ||
    (category==='flower'&&bare==='ดอกไม้') ||
    (category==='tree'&&(bare==='ต้นไม้'||bare==='ไม้')) ||
    (isPrefixed&&(!remaining||remaining.startsWith(prefix))) ||
    (isPrefixed&&category==='tree'&&remaining==='ไม้') ||
    (isPrefixed&&category==='flower'&&remaining==='ไม้')
  ));
  if(isForbidden)return {status:'forbidden',message:'ห้ามใช้คำนี้เป็นคำตอบในหมวดนี้'};
  if(validAnswer(answer,requiredLetter,category))
    return {status:'accepted',message:'✓ คำนี้ใช้ได้'};

  const effectiveLetter=wordInitialForCategory(answer,category);
  if(effectiveLetter!==requiredLetter){
    if(isPrefixed && effectiveLetter)
      return {
        status:'prefix-not-counted',
        message:'ไม่นับ “'+prefix+'” นำหน้า · นับ '+letterCaption(effectiveLetter)
      };
    return {status:'wrong-letter',message:'ตัวอักษรต้นไม่ตรง'};
  }
  return {status:'unknown',message:'ยังไม่พบคำนี้ในหมวด'};
}
