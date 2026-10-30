/**
 * A build identity is baked into the Vite bundle. Every successful deploy also
 * publishes /version.json with the same ID. Avoid inferring versions from
 * mutable asset timestamps or polling the game API.
 */
declare const __KHAMWAI_BUILD_ID__:string;
export const CURRENT_BUILD_ID: string =
  typeof __KHAMWAI_BUILD_ID__==='string'?__KHAMWAI_BUILD_ID__:'';
export const BUILD_CHECK_INTERVAL_MS=35_000;
const BUILD_ID_PATTERN=/^[a-f0-9]{32}$/;
export const VERSION_QUERY_KEY='__khamwai_build';

export function parseDeployedBuild(payload:unknown):string|null{
  if(!payload||typeof payload!=='object')return null;
  const build=(payload as {build?:unknown}).build;
  return typeof build==='string'&&BUILD_ID_PATTERN.test(build)?build:null;
}
export function isNewerBuild(current:string,deployed:string|null):boolean{
  return !!deployed&&BUILD_ID_PATTERN.test(current)&&deployed!==current;
}
/**
 * Any joined room is unsafe to reload. This includes waiting, review and final
 * phases: rematch votes or unsaved edits may still be in progress.
 */
export function safeToAutoUpdate(roomId:string,storedRoomId:string|null,busy:boolean):boolean{
  return !roomId&&!storedRoomId&&!busy;
}
/** A version query bypasses a stale CDN/browser HTML cache on full navigation. */
export function buildRefreshUrl(href:string,deployed:string):string{
  const target=new URL(href);
  target.searchParams.set(VERSION_QUERY_KEY,deployed);
  return target.toString();
}
