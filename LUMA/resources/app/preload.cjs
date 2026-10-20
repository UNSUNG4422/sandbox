const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('lumaDesktop',{
  quit:()=>ipcRenderer.send('luma:quit'),
  setFullscreen:value=>ipcRenderer.invoke('luma:set-fullscreen',value),
  onFullscreen:callback=>{const listener=(_event,value)=>callback(value);ipcRenderer.on('luma:fullscreen-changed',listener);return()=>ipcRenderer.removeListener('luma:fullscreen-changed',listener);},
  onPause:callback=>{const listener=()=>callback();ipcRenderer.on('luma:pause',listener);return()=>ipcRenderer.removeListener('luma:pause',listener);}
});
