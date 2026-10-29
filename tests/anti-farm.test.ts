import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeRarity,type RarityObservation} from '../amplify/functions/game/rarity.ts';
const now=Date.parse('2026-10-29T12:00:00Z');
const words=Array.from({length:10},(_,i)=>'word-'+i);
function event(room:string,player:string,word:string,day:number,order:number):RarityObservation {
 const occurredAt=now-(8-day)*86400000+order*500;
 return {group:'ส#animal',eventId:new Date(occurredAt).toISOString()+'#'+room+'#'+order,
   matchId:room,occurredAt,entries:[{playerId:player,word}],
   ttl:Math.floor(now/1000)+86400};
}
function run(observations:RarityObservation[]){
 return analyzeRarity({words,observations,now,
  groupStartedAt:now-20*86400000,
  firstEligibleAt:Object.fromEntries(words.map(w=>[w,now-20*86400000]))});
}
test('many disposable guest IDs in one room/day cannot inflate a word past 3 uses',()=>{
 const observations=Array.from({length:25},(_,i)=>event('same-room','guest-'+i,words[0],1,i));
 const result=run(observations);
 assert.equal(result.recentWordUses[words[0]],3);
 assert.equal(result.eligible,false);
});
test('one guest spreading many words and rooms in one day has capped group influence',()=>{
 const observations=Array.from({length:15},(_,i)=>event('room-'+i,'one-identity',words[i%10],1,i));
 const result=run(observations);
 assert.equal(Object.values(result.recentWordUses).reduce((a,b)=>a+b,0),8);
 assert.equal(result.uniquePlayers,1);
});
test('a cluster of repeated guest IDs/rooms is quarantined even after apparent sample volume',()=>{
 const observations:RarityObservation[]=[];
 for(let d=1;d<=8;d++){
   for(const room of ['farm-one','farm-two']){
     for(let w=0;w<words.length;w++){
       for(let g=0;g<3;g++)observations.push(event(room,'guest-'+((d*23+w*3+g)%190),words[w],d,w*3+g));
     }
   }
   for(let r=0;r<12;r++)observations.push(event('other-'+r,
     'real-'+(r+d*12),words[(r+d)%10],d,100+r));
 }
 const result=run(observations);
 assert.ok(result.observations>=120);
 assert.ok(result.uniqueRooms>=12);
 assert.ok(result.uniquePlayers>=20);
 assert.equal(result.suspicious,true);
 assert.equal(result.eligible,false);
 const reversed=run([...observations].reverse());
 assert.deepEqual(reversed.recentWordUses,result.recentWordUses,
   'pagination order must not decide which observations count');
});
test('normal multi-day distributed rooms are NOT incorrectly quarantined',()=>{
 const observations:RarityObservation[]=[];
 for(let d=1;d<=8;d++)for(let r=0;r<25;r++)for(let w=0;w<3;w++){
  observations.push(event('room-'+r,'guest-'+((d*31+r*7+w)%220),
    words[(r+w+d)%words.length],d,r*3+w));
 }
 const result=run(observations);
 assert.ok(result.observations>=120);
 assert.equal(result.suspicious,false);
 assert.equal(result.eligible,true);
});
