/**
 * Serialize room-setting changes. A new selection is visible immediately, while
 * the server receives only the newest pending full settings snapshot after an
 * in-flight write completes. No stale response may overwrite a newer selection.
 */
export type RoomSettingSaveStatus='idle'|'saving'|'saved'|'error';
export interface RoomSettingsSaver<T>{
  update(next:T):void;
  retry():void;
  waitForIdle():Promise<void>;
  close():void;
}
export function createRoomSettingsSaver<T>(
  send:(settings:T)=>Promise<void>,
  onStatus:(status:RoomSettingSaveStatus)=>void
):RoomSettingsSaver<T>{
  let pending:T|null=null;
  let ongoing:Promise<void>|null=null;
  let version=0;
  let closed=false;

  function flush():Promise<void>{
    if(closed||pending===null)return ongoing??Promise.resolve();
    if(ongoing)return ongoing;
    let failedAt=0;
    const task=(async()=>{
      while(!closed&&pending!==null){
        const selected=pending;
        const selectedVersion=version;
        pending=null;
        onStatus('saving');
        try{
          await send(selected);
          if(!closed&&pending===null)onStatus('saved');
        }catch{
          if(closed)break;
          // Never put a failed older value back ahead of a newer user choice.
          if(pending===null)pending=selected;
          failedAt=selectedVersion;
          onStatus('error');
          break;
        }
      }
    })();
    ongoing=task.finally(()=>{
      ongoing=null;
      // New selections made while a failed request was in flight may be sent.
      // Otherwise stay in error until a new choice or online/focus retry.
      if(!closed&&pending!==null&&(!failedAt||version>failedAt))void flush();
    });
    return ongoing;
  }
  return {
    update(next){
      if(closed)return;
      version++;
      pending=next;
      onStatus('saving');
      void flush();
    },
    retry(){if(!closed&&pending!==null)void flush();},
    async waitForIdle(){
      // A pending value is either being sent or has failed; a start action may
      // still send the latest settings atomically even if the earlier save failed.
      while(ongoing)await ongoing;
    },
    close(){
      closed=true;
      pending=null;
    }
  };
}
