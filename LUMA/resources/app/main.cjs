const {app,BrowserWindow,Menu,protocol,ipcMain,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
const APP_ROOT=path.join(__dirname,'app');
app.setName('LUMA');
app.setAppUserModelId('jp.luma.lightatelier.desktop');
app.setPath('userData',process.env.LUMA_TEST_PROFILE||path.join(app.getPath('appData'),'LUMA'));
protocol.registerSchemesAsPrivileged([{scheme:'luma',privileges:{standard:true,secure:true,supportFetchAPI:true,stream:true}}]);
let mainWindow;
const trusted=event=>mainWindow&&event.sender===mainWindow.webContents&&event.senderFrame?.url.startsWith('luma://game/');
if(!app.requestSingleInstanceLock()){app.quit();}else{
  app.on('second-instance',()=>{if(mainWindow){if(mainWindow.isMinimized())mainWindow.restore();mainWindow.show();mainWindow.focus();}});
  app.whenReady().then(()=>{
    Menu.setApplicationMenu(null);
    const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
    protocol.handle('luma',async request=>{
      try{
        const url=new URL(request.url);
        if(url.hostname!=='game')return new Response('Not found',{status:404});
        const target=path.resolve(APP_ROOT,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
        if(!target.startsWith(APP_ROOT+path.sep))return new Response('Forbidden',{status:403});
        return new Response(await fs.readFile(target),{headers:{'Content-Type':mime[path.extname(target)]||'application/octet-stream','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-src 'none'"}});
      }catch{return new Response('Not found',{status:404});}
    });
    session.defaultSession.setPermissionRequestHandler((_webContents,_permission,callback)=>callback(false));
    session.defaultSession.setPermissionCheckHandler(()=>false);
    session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*','ws://*/*','wss://*/*']},(_details,callback)=>callback({cancel:true}));
    mainWindow=new BrowserWindow({width:1280,height:820,minWidth:960,minHeight:720,useContentSize:true,title:'LUMA',backgroundColor:'#f4f2eb',icon:path.join(APP_ROOT,'icon.png'),show:false,autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true,spellcheck:false,devTools:!!process.env.LUMA_TEST_PROFILE}});
    mainWindow.webContents.setWindowOpenHandler(()=>({action:'deny'}));
    mainWindow.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith('luma://game/'))event.preventDefault();});
    mainWindow.webContents.on('will-attach-webview',event=>event.preventDefault());
    mainWindow.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&!input.isAutoRepeat&&input.key==='F11'){event.preventDefault();mainWindow.setFullScreen(!mainWindow.isFullScreen());}});
    mainWindow.on('enter-full-screen',()=>mainWindow.webContents.send('luma:fullscreen-changed',true));
    mainWindow.on('leave-full-screen',()=>mainWindow.webContents.send('luma:fullscreen-changed',false));
    mainWindow.on('blur',()=>mainWindow?.webContents.send('luma:pause'));
    mainWindow.once('ready-to-show',()=>{
      if(process.env.LUMA_TEST_PROFILE&&!process.env.LUMA_TEST_VISIBLE)return;
      mainWindow.show();
      // A hidden launcher can consume the first native ShowWindow call.
      if(!mainWindow.isVisible())setTimeout(()=>{if(mainWindow&&!mainWindow.isDestroyed())mainWindow.show();},100);
    });
    ipcMain.handle('luma:set-fullscreen',(event,value)=>{if(!trusted(event)||typeof value!=='boolean')return false;mainWindow.setFullScreen(value);return mainWindow.isFullScreen();});
    ipcMain.on('luma:quit',event=>{if(trusted(event))app.quit();});
    mainWindow.loadURL('luma://game/index.html');
  });
  app.on('window-all-closed',()=>app.quit());
  app.on('before-quit',()=>session.defaultSession.flushStorageData());
}
