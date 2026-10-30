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
  assert.match(source, /game\.phase==='playing'&&game\.timeRush\?100:1000/);
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
  assert.match(source,/return\(\)=>window\.cancelAnimationFrame\(frame\)/);
  assert.match(source,/if\(game\?\.phase!=='playing'\)\{\s*lastScrolledRoundRef\.current=''/);
  assert.doesNotMatch(source,/firstAnswerRef\.current\?\.focus\(/);
  assert.match(styles,/\.game-layout-playing \.answer-item:first-child\{scroll-margin-top:calc\(130px \+ env\(safe-area-inset-top,0px\)\)\}/);
});
