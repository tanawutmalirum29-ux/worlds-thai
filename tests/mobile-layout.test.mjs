import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const source = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');

test('homepage keeps room controls and removes redundant feature pills', () => {
  assert.match(source, /className="room-mode-switch"/);
  assert.match(source, /สร้างห้อง<\/button>/);
  assert.match(source, /เข้าร่วมห้อง<\/button>/);
  assert.doesNotMatch(source, /className="feature-chips"/);
  assert.doesNotMatch(source, /className="divider-word"|className="join-benefits"/);
  assert.doesNotMatch(source, /เล่นง่าย ๆ|เพื่อนเห็นห้องและกดเข้าร่วม/);
  assert.doesNotMatch(styles, /\.join-benefits|\.divider-word/);
});

test('mobile letter and live countdown stay pinned while answering', () => {
  assert.match(source, /game-layout-playing/);
  assert.match(source, /topbar-playing/);
  assert.match(source, /className="challenge-banner"/);
  assert.match(source, /className="time-box"/);
  assert.match(styles, /\.game-layout-playing \.challenge-banner\{position:sticky;top:env\(safe-area-inset-top,0px\);z-index:6/);
  assert.match(source,/className="challenge-banner" ref=\{challengeBannerRef\}/);
  assert.match(styles, /\.app-shell\{overflow:clip\}/);
});

test('mobile introduction does not reserve an empty decorative gap', () => {
  assert.match(styles, /\.welcome-copy\{padding:0\}/);
  assert.match(styles, /\.welcome-copy \.floating-letters\{position:relative/);
});

test('room setup controls use equal-height single-line triggers and a stable mode slot', () => {
  assert.match(source, /className="room-intro"/);
  assert.match(source, /className="room-mode-content"/);
  assert.match(styles, /\.room-mode-content\{height:365px;display:flex;flex-direction:column;min-width:0\}/);
  assert.match(styles, /\.settings-choice-trigger\{height:52px;min-height:52px;max-height:52px;white-space:nowrap;/);
  assert.match(styles, /\.settings-choice-label\{min-height:34px;/);
  assert.match(styles, /html\{scrollbar-gutter:stable\}/);
});

test('audio messages float outside main and are dismissed without layout shift', () => {
  assert.match(source, /className="audio-toast-region" aria-live="polite"/);
  assert.match(source, /window\.setTimeout\(\(\)=>setAudioNotice\(/);
  assert.match(source, /3200\)/);
  assert.match(styles, /\.audio-toast-region\{position:fixed;/);
  assert.match(styles, /pointer-events:none/);
  assert.doesNotMatch(source, /<main className="container">\s*\{audioNotice/);
});

test('idle home does not update the entire React page every 250ms', () => {
  assert.doesNotMatch(source, /setInterval\(\(\)=>setNow\(Date\.now\(\)\),250\)/);
  assert.match(source, /if\(game\?\.phase!=='playing' && game\?\.phase!=='review'\)return/);
  assert.match(source, /game\.phase==='playing'&&game\.timeRush\?250:1000/);
});

test('network polling skips redundant data and does not overlap requests', () => {
  assert.match(source, /next\.revision<=current\.current\.revision/);
  assert.match(source, /sameRoomListings\(previous,value as PublicRoom\[\]\)/);
  assert.match(source, /if\(!client \|\| game \|\| mode!=='join'\)return/);
  assert.match(source, /if\(stopped \|\| refreshing \|\| document\.hidden\)return/);
  assert.match(source, /const answerStates=useMemo\(/);
});

test('create and join tabs remain fully tappable on small screens', () => {
  assert.match(source, /onClick=\{\(\)=>\{setMode\('create'\);setError\(''\);\}\}/);
  assert.match(source, /onClick=\{\(\)=>\{setMode\('join'\);setError\(''\);\}\}/);
  assert.match(styles, /\.card-deco\{[^}]*pointer-events:none;/);
  assert.match(styles, /\.floating-letters\{[^}]*pointer-events:none;/);
  assert.match(styles, /\.room-mode-switch\{position:relative;z-index:2;isolation:isolate;/);
  assert.match(styles, /\.room-mode\{[^}]*min-height:52px;[^}]*touch-action:manipulation;/);
  assert.match(styles, /\.join-card \.room-mode\{min-height:50px;/);
});

test('name field flags invalid nicknames immediately and blocks room actions',()=>{
  assert.match(source,/nicknameValidationMessage\(name\.trim\(\)\.slice\(0,18\)\)/);
  assert.match(source,/aria-invalid=\{Boolean\(invalidNicknameMessage\)\}/);
  assert.match(source,/id="nickname-validation"/);
  assert.match(source,/className="nickname-validation-slot"/);
  assert.match(source,/disabled=\{working\|\|status!=='ready'\|\|Boolean\(invalidNicknameMessage\)\}/);
  assert.match(styles,/\.nickname-validation-slot\{min-height:19px;/);
});


test('final rematch vote floats at exactly the skip-time location and keeps live vote count',()=>{
  assert.match(source,/game\.phase==='final'\?<button type="button" className="skip-time-floating rematch-floating"/);
  assert.match(source,/onClick=\{\(\)=>void vote\('rematch'\)\}/);
  assert.match(source,/<strong>\{rematchCount\}\/\{game\.players\.length\}<\/strong>/);
  assert.match(source,/disabled=\{hasRematched\|\|working\}/);
  assert.doesNotMatch(source,/className="primary-btn rematch-vote"/);
  assert.match(styles,/\.rematch-floating\{border-color:/);
  assert.match(styles,/\.skip-time-floating\{position:fixed;right:max\(15px,env\(safe-area-inset-right\)\);bottom:max\(15px,env\(safe-area-inset-bottom\)\)/);
});

test('every new round scrolls the first answer into view below the mobile sticky banner',()=>{
  assert.match(source,/const firstAnswerRef = useRef<HTMLLabelElement\|null>\(null\)/);
  assert.match(source,/const lastScrolledRoundRef = useRef\(''\)/);
  assert.match(source,/const key=game\.roomId\+':'\+game\.round/);
  assert.match(source,/ref=\{index===0\?firstAnswerRef:undefined\}/);
  assert.match(source,/target\.scrollIntoView\(\{/);
  assert.match(source,/block:'start',inline:'nearest'/);
  assert.match(source,/window\.requestAnimationFrame\(\(\)=>\{/);
  assert.match(source,/window\.cancelAnimationFrame\(frame\)/);
  assert.match(source,/if\(game\?\.phase!=='playing'\)\{\s*lastScrolledRoundRef\.current=''/);
  assert.doesNotMatch(source,/firstAnswerRef\.current\?\.focus\(/);
  assert.match(styles,/\.game-layout-playing \.answer-item:first-child\{scroll-margin-top:calc\(130px \+ env\(safe-area-inset-top,0px\)\)\}/);
});

test('iPad portrait, landscape and desktop keep the letter/category and timer sticky',()=>{
  // The sticky rule must exist *outside* @media(max-width:720px).
  const allScreenRule='.game-layout-playing .challenge-banner{position:sticky;top:env(safe-area-inset-top,0px);z-index:6';
  const mobileStart=styles.indexOf('/* Only the compact banner sizing is specific to narrow screens. */');
  const universalStart=styles.indexOf('/* Keep the round consonant/category and timer visible on every device,');
  const tabletStart=styles.indexOf('@media(min-width:721px) and (max-width:1180px)');
  assert.ok(mobileStart>=0&&universalStart>mobileStart&&tabletStart>universalStart);
  assert.ok(styles.slice(universalStart,tabletStart).includes(allScreenRule),
    'universal sticky rule must not be inside the mobile-only media query');
  assert.match(styles,/@media\(min-width:721px\) and \(max-width:1180px\)\{\s*\.game-layout-playing \.challenge-banner\{min-height:140px/);
  assert.match(styles,/\.app-shell\{overflow:clip\}/);
  assert.doesNotMatch(styles,/\.game-main\{[^}]*overflow:(?:auto|scroll|hidden)/);
});

test('new-round auto scroll measures the actual sticky banner height on every viewport',()=>{
  assert.match(source,/const challengeBannerRef = useRef<HTMLDivElement\|null>\(null\)/);
  assert.match(source,/const banner=challengeBannerRef\.current/);
  assert.match(source,/window\.getComputedStyle\(banner\)\.top/);
  assert.match(source,/banner\.getBoundingClientRect\(\)\.height\+stickyTop\+12/);
  assert.match(source,/const marginTop=Math\.ceil\(/);
  assert.match(source,/target\.style\.scrollMarginTop=marginTop\+'px'/);
  assert.match(source,/lastScrolledRoundRef\.current=key/);
  assert.match(source,/target\.scrollIntoView\(\{/);
  assert.doesNotMatch(source,/firstAnswerRef\.current\?\.focus\(/);
});


test('room owner setting choices autosave immediately, without a separate save button',()=>{
  assert.match(source,/function updateRoomSetting\(field:SettingKey,value:GameSettings\[SettingKey\]\)/);
  assert.match(source,/onClick=\{\(\)=>updateRoomSetting\('mode','letter'\)\}/);
  assert.match(source,/onClick=\{\(\)=>updateRoomSetting\('mode','category'\)\}/);
  assert.match(source,/onClick=\{\(\)=>\{updateRoomSetting\(activeChoice.field,value\);closeCustomDialog\(\);\}\}/);
  assert.match(source,/const saver=createRoomSettingsSaver<GameSettings>\(/);
  assert.match(source,/const result=await call\('settings',roomId,undefined,undefined,value\)/);
  assert.match(source,/await roomSettingsSaverRef.current.saver.waitForIdle\(\)/);
  assert.match(source,/const next=await call\(action,game.roomId,undefined,undefined,draftSettingsRef.current\)/);
  assert.doesNotMatch(source,/ownerAction\('settings'\)/);
  assert.doesNotMatch(source,/>บันทึกการตั้งค่า<\/button>/);
  assert.match(source,/บันทึกการตั้งค่าอัตโนมัติ/);
  assert.match(styles,/\.settings-auto-save\{min-height:30px;/);
});

test('new round preserves current viewport before React replaces the review and then animates smoothly',()=>{
  const acceptStart=source.indexOf('const accept=useCallback(');
  const setGame=source.indexOf('current.current=next;setGame(next)',acceptStart);
  const reserve=source.indexOf("document.body.style.minHeight=Math.ceil(",acceptStart);
  assert.ok(acceptStart>=0&&reserve>acceptStart&&reserve<setGame,
    'reserve old document height before committing the next round');
  assert.match(source,/document\.documentElement\.style\.overflowAnchor='none'/);
  assert.match(source,/useLayoutEffect\(\(\)=>\{/);
  assert.match(source,/const startY=window\.scrollY/);
  assert.match(source,/const destination=Math\.max\(0,Math\.min\(maximum,/);
  assert.match(source,/const pageBottom=document\.querySelector\('\.app-shell'\)/);
  assert.match(source,/const eased=1-Math\.pow\(1-t,3\)/);
  assert.match(source,/window\.scrollTo\(0,startY\+distance\*eased\)/);
  assert.match(source,/window\.requestAnimationFrame\(step\)/);
  assert.doesNotMatch(source,/window\.scrollTo\(\{top:0/);
});

test('auto-scroll yields to user interaction and respects reduced motion',()=>{
  assert.match(source,/window\.addEventListener\('touchstart',userInterrupt/);
  assert.match(source,/window\.addEventListener\('wheel',userInterrupt/);
  assert.match(source,/window\.addEventListener\('pointerdown',userInterrupt/);
  assert.match(source,/window\.removeEventListener\('wheel',userInterrupt\)/);
  assert.match(source,/roundScrollAnimationRef\.current\?\.cancel\(\)/);
  assert.match(source,/prefers-reduced-motion: reduce/);
  assert.match(source,/target\.scrollIntoView\(\{behavior:'auto',block:'start',inline:'nearest'\}\)/);
  assert.match(source,/document\.body\.style\.minHeight=priorMinHeight/);
});

test('weak clients fetch authoritative round on timer expiration and recover from stalled reads',()=>{
  assert.match(source,/const lastDeadlineProbeRef=useRef\(''\)/);
  assert.match(source,/refreshGameRef\.current\(\)/);
  assert.match(source,/lastDeadlineProbeRef\.current=key/);
  assert.match(source,/pendingNetworkRequests>=2/);
  assert.match(source,/Promise\.race\(\[request,timeoutResult\]\)/);
  assert.match(source,/12000\)/);
  assert.match(source,/window\.addEventListener\('online',onResume\)/);
  assert.match(source,/heartbeatPending/);
  assert.match(source,/กำลังซิงค์รอบถัดไป/);
  assert.match(source,/เครือข่ายช้า · กำลังตามรอบ/);
  assert.doesNotMatch(source,/setInterval\(refresh,2000\)/);
});
