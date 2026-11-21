// The original theme expects a full document reload. Give each routed instance
// the same lifetime for its global listeners, animation loops and observers.
let current;
let installed=false;
const fromTheme=()=>current&&!current.closed&&new Error().stack?.includes('theme-routed.js')?current:null;

function install(){
  if(installed)return;
  installed=true;
  const add=EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener=function(type,listener,options){
    const scope=(this===window||this===document||this===document.body)?fromTheme():null;
    if(scope)scope.listeners.push([this,type,listener,options]);
    return add.call(this,type,listener,options);
  };
  for(const [method,cancel]of [['setTimeout','clearTimeout'],['setInterval','clearInterval'],['requestAnimationFrame','cancelAnimationFrame']]){
    const original=window[method].bind(window);
    window[method]=function(callback,...args){
      const scope=fromTheme();
      if(!scope||typeof callback!=='function')return original(callback,...args);
      const id=original(function(...values){if(!scope.closed)return callback.apply(this,values);},...args);
      scope.tasks.push([cancel,id]);
      return id;
    };
  }
  for(const name of ['MutationObserver','IntersectionObserver','ResizeObserver']){
    const Original=window[name];
    if(!Original)continue;
    window[name]=class extends Original{
      constructor(callback,...args){
        const scope=fromTheme();
        super((...values)=>{if(!scope?.closed)callback(...values);},...args);
        scope?.observers.push(this);
      }
    };
  }
}

export function createThemeScope(){
  install();
  const scope={closed:false,listeners:[],tasks:[],observers:[]};
  return {
    activate(){current=scope;},
    dispose(){
      scope.closed=true;
      if(current===scope)current=null;
      for(const [target,type,listener,options]of scope.listeners)target.removeEventListener(type,listener,options);
      for(const [cancel,id]of scope.tasks)window[cancel](id);
      for(const observer of scope.observers)observer.disconnect();
      scope.listeners.length=scope.tasks.length=scope.observers.length=0;
    },
  };
}
