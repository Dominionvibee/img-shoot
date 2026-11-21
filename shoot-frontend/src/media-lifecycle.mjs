// A real page navigation discards pending media promises. React navigation
// retains the document, so consume only the expected cancellation when an
// app video is removed before its play request completes.
export function setupMediaLifecycle() {
  const play=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(...args){
    const local=Boolean(this.closest('#app'));
    const result=play.apply(this,args);
    if(!local||!result?.catch)return result;
    return result.catch(error=>{
      if(error.name==='AbortError'&&!this.isConnected)return;
      // Browser autoplay policy leaves the original play control available.
      // It is an expected paused state, rather than an application exception.
      if(error.name==='NotAllowedError')return;
      throw error;
    });
  };
}
