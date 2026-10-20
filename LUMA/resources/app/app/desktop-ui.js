const KEY='luma.desktop.preferences.v1';
const defaults={volume:.6,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,coordinates:true,fullscreen:false};
let stored;try{stored=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
export const desktopSettings={...defaults,...(stored&&typeof stored==='object'?stored:{})};
desktopSettings.volume=Number.isFinite(desktopSettings.volume)?Math.max(0,Math.min(1,desktopSettings.volume)):.6;
for(const k of ['reducedMotion','coordinates','fullscreen'])desktopSettings[k]=typeof desktopSettings[k]==='boolean'?desktopSettings[k]:defaults[k];
export function initDesktop(api){
  const $=id=>document.getElementById(id),native=window.lumaDesktop;
  let inGame=false,lastStage=-1,lastFocus=null;
  const saveSettings=()=>{try{localStorage.setItem(KEY,JSON.stringify(desktopSettings));}catch{}};
  const applyAppearance=()=>{document.body.classList.toggle('reduce-motion',desktopSettings.reducedMotion);document.body.classList.toggle('hide-coordinates',!desktopSettings.coordinates);};
  const closeDialogs=()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close());
  const openDialog=id=>{lastFocus=document.activeElement;closeDialogs();$(id).showModal();};
  const hasProgress=()=>{const s=api.getState();return s.stage!==0||Object.values(s.saved.records).some(r=>r.moves>0||r.completed);};
  const resumeTarget=()=>{const s=api.getState();if(!s.result?.solved)return s.stage;const next=s.LEVELS.findIndex((l,i)=>i>s.stage&&!s.saved.records[l.id]?.completed);return next<0?s.stage:next;};
  function updateHome(){
    const s=api.getState(),count=s.completionCount;
    const rules=[s.level.tiles.some(t=>t.movable)?'浮遊鏡は空きマスへ配置できます。すべての星に光を届けましょう。':'鏡を回して、すべての星に光を届けましょう。','浮遊鏡を選び、空きマスへ配置。ガラスには置けません。','青には青、桃には桃。紫には両方の光を届けます。','三角の背面から入った光が左右へ分かれます。横と先端からは通りません。','レンズはクリックで青・桃を切り替えます。通った光はその色になります。','同じ文字のワープは、光の向きを保ってつながります。','スイッチに光が当たる間、同じ数字のゲートが開きます。光はそこで止まります。',s.level.targets.some(t=>t.color===3)?'すべての星を同時に灯しましょう。紫の星には二色が必要です。':'これまでの仕組みを使い、すべての星を同時に灯しましょう。',s.level.rule||'配置と光の経路を見直し、すべての星を同時に灯しましょう。'];
    $('lesson').textContent=rules[s.level.category];
    $('title-progress-count').textContent=`${count} / ${s.LEVELS.length}`;
    $('title-progress-fill').style.width=`${count/s.LEVELS.length*100}%`;
    $('continue-game').hidden=!hasProgress();
    $('continue-stage').textContent=`STAGE ${String(resumeTarget()+1).padStart(2,'0')}`;
    $('new-game').classList.toggle('has-continue',hasProgress());
    $('setting-sound').checked=s.saved.sound;
    if(lastStage!==s.stage){lastStage=s.stage;$('play-guide').classList.remove('expanded');$('rule-toggle').setAttribute('aria-expanded','false');$('rule-toggle').textContent='操作と記号を見る ＋';}
  }
  function showHome(){api.persist();closeDialogs();inGame=false;document.body.dataset.screen='home';document.title='LUMA';$('play-screen').hidden=true;$('title-screen').hidden=false;updateHome();requestAnimationFrame(()=>($('continue-game').hidden?$('new-game'):$('continue-game')).focus({preventScroll:true}));}
  function enterGame(){closeDialogs();inGame=true;document.body.dataset.screen='game';document.title='LUMA — STAGE '+String(api.getState().stage+1).padStart(2,'0');$('title-screen').hidden=true;$('play-screen').hidden=false;api.persist();updateHome();$('tiles').firstElementChild?.focus({preventScroll:true});}
  function pause(){if(!inGame||document.querySelector('dialog[open]'))return;api.persist();const s=api.getState();$('pause-stage').textContent=`${s.CATEGORIES[s.level.category].name} · ${s.level.name}`;openDialog('pause-dialog');}
  function settings(){api.persist();$('setting-sound').checked=api.getState().saved.sound;$('setting-volume').value=Math.round(desktopSettings.volume*100);$('volume-value').value=`${Math.round(desktopSettings.volume*100)}%`;$('setting-motion').checked=desktopSettings.reducedMotion;$('setting-coordinates').checked=desktopSettings.coordinates;$('setting-fullscreen').checked=desktopSettings.fullscreen;openDialog('settings-dialog');}
  const quit=()=>{api.persist();openDialog('quit-dialog');};
  const restart=()=>{api.persist();openDialog('restart-dialog');};
  const rulesButton=document.createElement('button');rulesButton.id='rule-toggle';rulesButton.className='rule-toggle';rulesButton.setAttribute('aria-expanded','false');rulesButton.textContent='操作と記号を見る ＋';$('play-guide').append(rulesButton);
  rulesButton.addEventListener('click',()=>{const expanded=$('play-guide').classList.toggle('expanded');rulesButton.setAttribute('aria-expanded',String(expanded));rulesButton.textContent=expanded?'閉じる −':'操作と記号を見る ＋';});
  $('continue-game').addEventListener('click',()=>{const target=resumeTarget();if(target!==api.getState().stage)api.loadStage(target);enterGame();});
  $('new-game').addEventListener('click',()=>{api.loadStage(0);api.reset(true);enterGame();});
  $('title-stages').addEventListener('click',()=>{closeDialogs();api.showStages();});
  $('title-settings').addEventListener('click',settings);
  $('title-quit').addEventListener('click',quit);
  $('title-help').addEventListener('click',()=>openDialog('help-dialog'));
  $('home-button').addEventListener('click',showHome);
  $('pause-open').addEventListener('click',pause);
  $('play-stages').addEventListener('click',()=>{closeDialogs();api.showStages();});
  $('resume-game').addEventListener('click',()=>{$('pause-dialog').close();$('tiles').firstElementChild?.focus({preventScroll:true});});
  $('pause-home').addEventListener('click',showHome);
  $('pause-restart').addEventListener('click',restart);
  $('pause-dialog').addEventListener('keydown',e=>{if(e.key.toLowerCase()==='r'&&!e.repeat){e.preventDefault();restart();}});
  $('pause-stages').addEventListener('click',()=>{closeDialogs();api.showStages();});
  $('pause-settings').addEventListener('click',settings);
  $('pause-quit').addEventListener('click',quit);
  $('confirm-restart').addEventListener('click',()=>{closeDialogs();api.reset(true);enterGame();});
  $('confirm-quit').addEventListener('click',()=>{api.persist();if(native)native.quit();else{closeDialogs();showHome();}});
  $('stage-list').addEventListener('click',e=>{if(e.target.closest('[data-stage]'))enterGame();});
  $('settings-reset').addEventListener('click',()=>{closeDialogs();api.showReset();});
  $('reset-confirm').addEventListener('click',()=>{updateHome();showHome();});
  $('setting-sound').addEventListener('change',e=>{api.getState().saved.sound=e.target.checked;api.updateSound();api.persist();if(e.target.checked)api.sound([392,523.25],.035,.35,.08);});
  $('setting-volume').addEventListener('input',e=>{desktopSettings.volume=Number(e.target.value)/100;$('volume-value').value=`${e.target.value}%`;saveSettings();});
  $('setting-volume').addEventListener('change',()=>api.sound([523.25],.035,.3));
  $('setting-motion').addEventListener('change',e=>{desktopSettings.reducedMotion=e.target.checked;applyAppearance();saveSettings();api.setMotion(e.target.checked);});
  $('setting-coordinates').addEventListener('change',e=>{desktopSettings.coordinates=e.target.checked;applyAppearance();saveSettings();});
  $('setting-fullscreen').addEventListener('change',async e=>{desktopSettings.fullscreen=e.target.checked;saveSettings();if(native)await native.setFullscreen(e.target.checked);else if(e.target.checked){try{await document.documentElement.requestFullscreen();}catch{desktopSettings.fullscreen=false;e.target.checked=false;saveSettings();}}else if(document.fullscreenElement)await document.exitFullscreen();});
  if(native){native.onFullscreen(value=>{desktopSettings.fullscreen=value;$('setting-fullscreen').checked=value;saveSettings();});native.onPause(pause);native.setFullscreen(desktopSettings.fullscreen);}
  document.addEventListener('fullscreenchange',()=>{if(!native){desktopSettings.fullscreen=!!document.fullscreenElement;$('setting-fullscreen').checked=desktopSettings.fullscreen;saveSettings();}});
  document.addEventListener('luma:state',updateHome);
  document.addEventListener('keydown',e=>{if(e.repeat||e.defaultPrevented)return;if(e.key==='Escape'&&inGame&&!document.querySelector('dialog[open]')){e.preventDefault();pause();}if(e.key==='F11'&&!native){e.preventDefault();$('setting-fullscreen').checked=!desktopSettings.fullscreen;$('setting-fullscreen').dispatchEvent(new Event('change'));}});
  // The renderer owns puzzle interaction; menus only change presentation.
  document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{if(!document.querySelector('dialog[open]'))lastFocus?.isConnected&&lastFocus.focus({preventScroll:true});}));
  window.addEventListener('beforeunload',()=>{api.persist();saveSettings();});
  applyAppearance();updateHome();showHome();
}
