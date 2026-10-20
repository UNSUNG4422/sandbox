import {initDesktop,desktopSettings} from './desktop-ui.js';
import {CATEGORIES,LEVELS,trace,turn,initialPositions,legalPlacements,place} from './engine.js';
import {planLight,lightFrame,LIGHT_FADE} from './light-motion.js';
import {newRecord,readProgress,writeProgress,clearProgress} from './progress.js';
import {MINIMUM_MOVES} from './minimum-moves.js';
const $=id=>document.getElementById(id);
const COLORS={1:'#83e1de',2:'#f1a1bd',3:'#c2afff'},NAMES={1:'青',2:'桃',3:'紫'};
const GOAL_COLORS={1:'#6caeab',2:'#cc92ab',3:'#a28bc7'};
const STEP=64,OFFSET=88,pos=n=>OFFSET+n*STEP;
const PER_CATEGORY=5;
let reducedMotion=desktopSettings.reducedMotion;
let storage;try{storage=localStorage;}catch{storage={getItem:()=>null,setItem:()=>{throw Error('Unavailable');},removeItem:()=>{}};}
let saved=readProgress(storage),stage=Math.max(0,LEVELS.findIndex(l=>l.id===saved.stageId));
let saveAvailable=true,toastTimer,audioContext,wonTimer,level,record,result,rotationAngles=[],particleSegments=[],burst=[],completionCount=0,modalCategory=0,selectedTile=null,dragState=null,suppressClick=false;
let lightAnimation=0,visualLight=null;
const isComplete=i=>saved.records[LEVELS[i].id]?.completed===true;
const categoryCount=c=>LEVELS.reduce((n,l,i)=>n+(l.category===c&&isComplete(i)?1:0),0);
function persist(){saved.stageId=LEVELS[stage].id;saveAvailable=writeProgress(storage,saved);$('save-status').textContent=saveAvailable?'自動保存':'保存できません。空き容量をご確認ください';}

function toast(message){clearTimeout(toastTimer);$('toast').textContent=message;$('toast').classList.add('visible');toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),2400);}
function sound(notes,volume=.045,length=.25,spacing=.08){
  if(!saved.sound||desktopSettings.volume===0)return;
  try {
    audioContext??=new(window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});
    notes.forEach((frequency,i)=>{
      const osc=audioContext.createOscillator(),gain=audioContext.createGain(),at=audioContext.currentTime+i*spacing;
      osc.type='sine';osc.frequency.value=frequency;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(Math.max(.0001,volume*desktopSettings.volume),at+.012);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
      osc.connect(gain);gain.connect(audioContext.destination);osc.start(at);osc.stop(at+length+.02);
    });
  }catch{/* Optical puzzles remain fully playable without audio support. */}
}
function updateSound(){
  $('sound').setAttribute('aria-pressed',String(saved.sound));$('sound-text').textContent=saved.sound?'音あり':'消音';
  $('sound-icon').innerHTML=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z"/>${saved.sound?'<path d="M17 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>':'<path d="m17 9 5 6m0-6-5 6"/>'}</svg>`;
}
function starPath(s=14){return `M0 ${-s} ${s*.26} ${-s*.26} ${s} 0 ${s*.26} ${s*.26} 0 ${s} ${-s*.26} ${s*.26} ${-s} 0 ${-s*.26} ${-s*.26}Z`;}


function tileName(t){return t.t==='m'?(t.movable?'浮遊鏡':'鏡'):t.t==='p'?'分光器':'色替えレンズ';}
function tileLabel(t,i){
  const orientation=t.t==='m'?(record.rotations[i]===0?'右上がり':'右下がり'):t.t==='p'?['上向き','右向き','下向き','左向き'][record.rotations[i]]:NAMES[record.rotations[i]===0?1:2];
  return `${tileName(t)} ${String.fromCharCode(65+record.positions[i][0])}${record.positions[i][1]+1}、${orientation}。${result?.solved?'クリア済み':t.movable?'選択して配置。ダブルクリック・Spaceで回転':t.t==='f'?'色を変える':'回転する'}`;
}
function createBoard(){
  let grid='',dots='',axes='',stars='';
  // Decoration lives in the border, outside the 7×7 playing area.
  const scenes=[
    '<path d="M16 94V16h78M25 105V25h78M466 544h78v-78M455 535h80v-80"/>',
    '<path d="M16 180V58Q16 16 58 16h122M380 544h122q42 0 42-42V380"/><circle cx="32" cy="32" r="4"/><circle cx="528" cy="528" r="4"/><path d="M100 25h35m-17-8v16M425 535h35m-17-8v16"/>',
    '<path d="M8 120Q8 8 120 8M22 128Q22 22 128 22M440 552q112 0 112-112M432 538q106 0 106-106"/>',
    '<path d="M12 172 12 12 172 12ZM388 548h160V388ZM22 100 100 22M460 538l78-78"/>',
    '<ellipse cx="18" cy="18" rx="100" ry="160"/><ellipse cx="18" cy="18" rx="80" ry="135"/><ellipse cx="542" cy="542" rx="100" ry="160"/><ellipse cx="542" cy="542" rx="80" ry="135"/>',
    '<path d="M5 200Q5 5 200 5M18 185Q18 18 185 18M555 360q0 195-195 195M542 375q0 167-167 167M25 94q0-69 69-69M535 466q0 69-69 69"/>',
    '<path d="M12 180V40h28V12h140M380 548h140v-28h28V380M24 160V54h30V24h106M400 536h106v-30h30V400"/><circle cx="180" cy="12" r="3"/><circle cx="380" cy="548" r="3"/>',
    '<path d="M8 185Q8 8 185 8M20 170Q20 20 170 20M32 155Q32 32 155 32M552 375q0 177-177 177M540 390q0 150-150 150M528 405q0 123-123 123"/>',
    '<path d="M20 160V20H160M400 540h140V400M26 126 26 26 126 26M434 534h100V434M60 20h42m178 0h30m148 520h42m-220 0h30"/><path d="m20 24 4 10 10 4-10 4-4 10-4-10-10-4 10-4Zm520 484 4 10 10 4-10 4-4 10-4-10-10-4 10-4Z"/><circle cx="160" cy="20" r="2"/><circle cx="400" cy="540" r="2"/>'
  ];
  const scenery=`<g class="scene-art" aria-hidden="true" pointer-events="none" clip-path="url(#scene-border)">${scenes[level.category]}</g>`;
  for(let i=0;i<8;i++){const p=56+i*STEP;grid+=`<path class="grid-line" d="M56 ${p}H504M${p} 56V504"/>`;}
  for(let y=0;y<7;y++)for(let x=0;x<7;x++)dots+=`<circle class="grid-dot" cx="${pos(x)}" cy="${pos(y)}" r="1.3"/>`;
  for(let i=0;i<7;i++)axes+=`<text class="axis-label" x="${pos(i)}" y="32" text-anchor="middle">${String.fromCharCode(65+i)}</text><text class="axis-label" x="30" y="${pos(i)+2}" text-anchor="middle">${i+1}</text>`;
  for(let i=0;i<35;i++)stars+=`<circle cx="${30+(i*137.3)%500}" cy="${30+(i*83.7)%500}" r="${i%3===0?.7:.4}" fill="#bbdbdf" opacity="${i%3===0?.18:.09}"/>`;
  const floor=scenery;
  const glass=(level.glass||[]).map(g=>`<g class="glass" transform="translate(${pos(g.x)} ${pos(g.y)})" role="img" aria-label="ガラス。光は通れますが鏡は置けません"><rect x="-24" y="-24" width="48" height="48" rx="6"/><path d="m-15 13 28-28m-17 31 20-20"/></g>`).join('');
  const optics=level.tiles.map((t,i)=>{
    const art=t.t==='m'?'<circle class="mirror-mount" cx="-16" cy="16" r="3"/><circle class="mirror-mount" cx="16" cy="-16" r="3"/><path class="mirror-metal" d="m-13 13 26-26"/><path class="mirror-highlight" d="m-13 12 25-25"/>':t.t==='p'?'<path class="prism-inner" d="M-22 0h44M0 22V0"/><path class="prism-body" d="m0-16 16 27h-32Z"/><path class="prism-inner" d="m0-16 0 27m-16 0 16-10 16 10"/><circle class="prism-port" cy="21" r="2"/><circle class="prism-port" cx="-22" r="1.8"/><circle class="prism-port" cx="22" r="1.8"/>':'<path class="lens-axis" d="M-22 0h44M0-22v44"/><circle class="lens-body" r="16"/><path class="lens-crystal" d="m0-11 8 11-8 11-8-11Z"/>';
    return `<g class="tile ${t.t==='f'?'lens':''} ${t.movable?'movable':''}" data-tile="${i}" role="button" tabindex="0" aria-label="${tileName(t)} ${String.fromCharCode(65+t.x)}${t.y+1}" transform="translate(${pos(record.positions[i][0])} ${pos(record.positions[i][1])})" style="color:${COLORS[record.rotations[i]===0?1:2]}"><rect x="-31" y="-31" width="62" height="62" fill="transparent"/><rect class="tile-plate" x="-26" y="-26" width="52" height="52" rx="11"/><rect class="tile-focus" x="-30" y="-30" width="60" height="60" rx="13"/><g class="tile-mechanism" style="transform:rotate(${record.rotations[i]*90}deg)">${art}</g>${t.movable?`<g class="rotate-handle" data-rotate="${i}" role="button" tabindex="0" aria-label="浮遊鏡${i+1}を回転"><rect x="8" y="-32" width="28" height="28" rx="14" fill="transparent"/><circle cx="22" cy="-18" r="10"/><text x="22" y="-18">↻</text></g><path class="slider-badge" d="M-15 22h30m-12-3-3 3 3 3m24-6 3 3-3 3"/>`:String()}</g>`;
  }).join('');
  const walls=level.walls.map(w=>`<g transform="translate(${pos(w.x)} ${pos(w.y)})" role="img" aria-label="壁"><rect class="fixed-wall" x="-18" y="-18" width="36" height="36" rx="5"/><path class="wall-mark" d="m-12 3 15-15m-15 23 23-23m-15 23 15-15"/></g>`).join('');
  const portals=level.portals.map((p,i)=>`<g id="portal-${i}" class="portal" transform="translate(${pos(p.x)} ${pos(p.y)})" role="img" aria-label="ワープ ${String.fromCharCode(65+p.pair)}"><circle class="portal-inner" r="26"/><circle class="portal-ring" r="19"/><circle class="portal-inner" r="14"/><text class="portal-label">${String.fromCharCode(65+p.pair)}</text></g>`).join('');
  const sensors=level.switches.map((s,i)=>`<g id="switch-${i}" class="switch" transform="translate(${pos(s.x)} ${pos(s.y)})" role="img" aria-label="スイッチ${s.group}、未作動"><path class="switch-body" d="m0-22 22 22-22 22-22-22Z"/><text class="switch-label">${s.group}</text></g>`).join('');
  const gates=level.gates.map((g,i)=>`<g id="gate-${i}" class="gate" transform="translate(${pos(g.x)} ${pos(g.y)})" role="img" aria-label="ゲート${g.group}、閉じています"><rect class="gate-base" x="-20" y="-20" width="40" height="40" rx="7"/><path class="gate-bar left" d="M-5-11v22"/><path class="gate-bar right" d="M5-11v22"/><text class="gate-label" y="30">${g.group}</text></g>`).join('');
  const sources=level.sources.map(s=>`<g transform="translate(${pos(s.x)} ${pos(s.y)})" style="color:${COLORS[s.color]}"><title>${NAMES[s.color]}の光源</title><circle class="source-orbit" r="24"/><circle class="source-pulse" r="14"/><circle class="source-base" r="17"/><circle class="source-core" r="6"/><circle fill="#e6fffa" r="2"/><g transform="rotate(${s.d*90})"><path class="source-ray" d="m0-25 3 5h-6Z"/></g></g>`).join('');
  const targets=level.targets.map((t,i)=>`<g id="target-${i}" transform="translate(${pos(t.x)} ${pos(t.y)})" style="color:${COLORS[t.color]}" role="img" aria-label="${NAMES[t.color]}の星、未点灯"><title>${NAMES[t.color]}の星</title><circle class="target-aura" r="25"/><circle class="target-outer" r="26"/><circle class="target-ring" r="20"/><path class="target-star" d="${starPath(13)}"/></g>`).join('');
  $('board').innerHTML=`<defs><clipPath id="scene-border"><path d="M0 0H560V560H0Z M48 48V512H512V48Z" clip-rule="evenodd"/></clipPath><filter id="beam-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter><filter id="soft-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="4"/></filter><filter id="star-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter><filter id="aura-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="15"/></filter><clipPath id="beam-clip"><rect x="45" y="45" width="470" height="470" rx="12"/></clipPath><radialGradient id="win-wash"><stop stop-color="#9bdbb7" stop-opacity=".3"/><stop offset="1" stop-color="#9bdbb7" stop-opacity="0"/></radialGradient></defs>${floor}${grid}${dots}${stars}${axes}<path class="board-corner" d="M44 59V44h15M501 44h15v15M516 501v15h-15M59 516H44v-15"/><g id="beams" clip-path="url(#beam-clip)"></g>${walls}${glass}<g id="tiles">${optics}</g>${portals}${sensors}${gates}${sources}<g id="targets">${targets}</g><g id="move-targets"></g><g id="drag-ghost" pointer-events="none"></g><rect class="board-wash" width="560" height="560"/>`;
  rotationAngles=record.rotations.map(r=>r*90);
}
function paintBeams(segments,fade=[],opacity=0){
  const paths={1:'',2:'',3:''},dying={1:'',2:'',3:''};
  const add=(groups,s)=>groups[s.color]+=`M${pos(s.x1)} ${pos(s.y1)}L${pos(s.x2)} ${pos(s.y2)}`;
  segments.forEach(s=>add(paths,s));fade.forEach(s=>add(dying,s));
  const markup=(groups)=>Object.entries(groups).filter(([,d])=>d).map(([color,d])=>`<g style="color:${COLORS[color]}"><path class="beam-halo" d="${d}" stroke="currentColor"/><path class="beam-main" d="${d}" stroke="currentColor"/><path class="beam-core" d="${d}"/><path class="beam-flow" d="${d}" stroke="currentColor"/></g>`).join('');
  $('beams').innerHTML=markup(paths)+(opacity>0?`<g opacity="${opacity}">${markup(dying)}</g>`:'');
  particleSegments=segments.filter(s=>s.complete!==false);
}
function renderLight({animate,celebrate,previousHits}){
  cancelAnimationFrame(lightAnimation);clearTimeout(wonTimer);
  const previous=visualLight||{segments:[],openGates:[]},plan=planLight(level,result,previous);
  const duration=animate&&!reducedMotion?plan.duration:0,born=performance.now();
  const frame=now=>{
    const elapsed=duration?Math.min(now-born,duration):plan.duration;
    visualLight=lightFrame(plan,elapsed);
    paintBeams(visualLight.segments,plan.fade,duration?Math.max(0,1-elapsed/LIGHT_FADE):0);
    particleSegments=visualLight.steadySegments;
    renderLightObjects(visualLight);
    $('beams').dataset.propagating=String(elapsed<duration);
    if(elapsed<duration){lightAnimation=requestAnimationFrame(frame);return;}
    $('play-guide').hidden=result.solved;$('success').hidden=!result.solved;document.querySelector('.game-card').classList.toggle('is-solved',result.solved);
    if(celebrate&&result.solved){emitBurst();sound([392,493.88,587.33,783.99],.065,.9,.12);$('board-announcement').textContent=`${level.name}クリア。${record.moves}手ですべての星が点灯しました。`;document.dispatchEvent(new Event('luma:clear'));}
    else if(celebrate&&result.lit.some((v,i)=>v&&!previousHits[i]))sound([523.25,659.25],.035,.45,.07);
  };
  // Render the retained prefix synchronously. Further input cancels this frame
  // loop and plans from what is actually visible, without locking the board.
  $('play-guide').hidden=false;$('success').hidden=true;document.querySelector('.game-card').classList.remove('is-solved');
  frame(born);
}
function categoryButtons(selected){return CATEGORIES.map((c,i)=>`<button class="category-button ${selected===i?'active':''}" data-category="${i}" ${selected===i?'aria-current="true"':''} aria-label="カテゴリ${i+1} ${c.name}、${categoryCount(i)}/5クリア"><strong><span class="category-symbol" aria-hidden="true">${c.glyph}</span>${c.name}</strong><small><span>${i*5+1}–${i*5+5}</span><span>${categoryCount(i)} / 5</span></small></button>`).join('');}
function stageRecordDetails(i){
  const l=LEVELS[i],r=saved.records[l.id],minimum=MINIMUM_MOVES[l.id],best=r?.completed&&Number.isSafeInteger(r.best)&&r.best>=0?r.best:null;
  return {label:`${l.name}、最短${minimum}手、${best!==null?`自己ベスト${best}手`:r?.completed?'クリア済み、手数の記録なし':'未クリア'}`,markup:`<span class="stage-stats" aria-hidden="true"><span class="stage-stat"><span>最短</span><b>${minimum}<span>手</span></b></span><span class="stage-stat personal"><span>自分</span><b>${best!==null?`${best}<span>手</span>`:'—'}</b></span></span>`};
}
function renderNav(){
  completionCount=LEVELS.reduce((sum,l,i)=>sum+(isComplete(i)?1:0),0);
  $('journey-count').textContent=`${completionCount} / ${LEVELS.length}`;
  $('category-nav').innerHTML=categoryButtons(level.category);
  $('chapter-nav').innerHTML=LEVELS.map((l,i)=>{if(l.category!==level.category)return '';const stats=stageRecordDetails(i);return `<button data-stage="${i}" class="chapter-button ${i===stage?'active':''} ${isComplete(i)?'complete':''}" ${i===stage?'aria-current="step"':''} aria-label="${stats.label}"><span class="chapter-index">${String(i+1).padStart(2,'0')}</span>${isComplete(i)?'<span class="chapter-check" aria-hidden="true">✓</span>':''}${stats.markup}</button>`;}).join('');
}
function renderLightObjects(view){
  view.lit=view.hits.map((h,i)=>h===level.targets[i].color);
  level.tiles.forEach((t,i)=>$('tiles').children[i].classList.toggle('touched',view.touched.includes(i)));
  level.targets.forEach((t,i)=>{const el=$(`target-${i}`);el.classList.toggle('target-lit',view.lit[i]);el.classList.toggle('target-partial',!view.lit[i]&&view.hits[i]!==0);el.setAttribute('aria-label',`${NAMES[t.color]}の星、${view.lit[i]?'点灯':view.hits[i]?'色が足りないか違います':'未点灯'}`);});
  level.portals.forEach((p,i)=>$(`portal-${i}`).classList.toggle('active',view.portalHits.includes(p.pair)));
  level.switches.forEach((s,i)=>{const el=$(`switch-${i}`),active=view.switchHits.includes(s.group);el.classList.toggle('active',active);el.setAttribute('aria-label',`スイッチ${s.group}、${active?'作動中':'未作動'}`);});
  level.gates.forEach((g,i)=>{const el=$(`gate-${i}`),open=view.openGates.includes(g.group);el.classList.toggle('active',open);el.setAttribute('aria-label',`ゲート${g.group}、${open?'開いています':'閉じています'}`);});
  const lit=view.lit.filter(Boolean).length;
  $('lit-count').textContent=lit;$('goal-count').textContent=` / ${level.targets.length}`;$('progress-line').style.width=`${lit/level.targets.length*100}%`;
  const signature=level.id+':'+view.hits.join(',');
  if($('goal-icons').dataset.hits!==signature){$('goal-icons').dataset.hits=signature;
  $('goal-icons').innerHTML=level.targets.map((t,i)=>`<div class="goal-item ${view.lit[i]?'lit':view.hits[i]?'partial':''}" style="--goal-color:${GOAL_COLORS[t.color]}" title="${NAMES[t.color]}の星${view.lit[i]?'：点灯':''}"><svg viewBox="-18 -18 36 36" aria-hidden="true"><path d="${starPath(13)}"/></svg><span>${view.lit[i]?'✓':NAMES[t.color]}</span></div>`).join('');
  }
}
function update({celebrate=false,previousHits=[]}={}){
  const animate=!!result;
  result=trace(level,record.rotations,record.positions,{timeline:true});
  level.tiles.forEach((t,i)=>{const el=$('tiles').children[i];el.setAttribute('transform',`translate(${pos(record.positions[i][0])} ${pos(record.positions[i][1])})`);el.querySelector('.tile-mechanism').style.transform=`rotate(${rotationAngles[i]}deg)`;if(t.t==='f')el.style.color=COLORS[record.rotations[i]===0?1:2];el.setAttribute('aria-label',tileLabel(t,i));el.setAttribute('aria-disabled',String(result.solved));});
  $('moves').textContent=String(record.moves).padStart(2,'0');$('undo').disabled=!record.history.length;$('reset').disabled=record.moves===0&&atInitialState();
  if(result.solved){
    if(!record.completed||record.best===null||record.moves<record.best)record.best=record.moves;record.completed=true;
    const all=LEVELS.every((_,i)=>isComplete(i));
    $('success-description').textContent=`${record.moves} 手でクリア。${CATEGORIES[level.category].name} ${categoryCount(level.category)} / 5`;
    if(stage===39&&LEVELS.slice(0,40).every((_,i)=>isComplete(i)))$('success-description').textContent='本編40ステージをクリア。最後の五つの光へ。';
    $('next').innerHTML=all?'全ステージクリア <span>✧</span>':stage===LEVELS.length-1?'未クリアのステージへ <span>→</span>':stage===39?'EXTRAへ <span>✦</span>':(stage+1)%5===0?'次のカテゴリへ <span>→</span>':'次のステージへ <span>→</span>';
  }
  renderLight({animate,celebrate,previousHits});
  $('best').textContent=record.best!==null?`自己ベスト ${record.best} 手`:'';renderMoveTargets();renderNav();persist();document.dispatchEvent(new Event('luma:state'));
}
function loadStage(index,{focus=false}={}){
  if(!Number.isInteger(index)||!LEVELS[index])return;
  cancelAnimationFrame(lightAnimation);visualLight=null;clearTimeout(wonTimer);stage=index;level=LEVELS[stage];record=saved.records[level.id]??=newRecord(level);burst=[];result=null;selectedTile=null;dragState=null;suppressClick=false;
  document.querySelector('.board-bottom>span:first-child').textContent=level.tiles.some(t=>t.movable)?'浮遊鏡は選んで配置 · ダブルクリックで回転':'クリックで回転 · 右クリックで逆回転';
  const c=CATEGORIES[level.category];$('board-number').textContent=String(stage+1).padStart(2,'0');$('stage-total').textContent=`/ ${LEVELS.length}`;$('board-name').textContent=c.name+(level.finale?' · 総合':'');
  document.body.dataset.category=String(level.category);
  document.querySelector('.game-card').classList.toggle('is-finale',!!level.finale);
  $('chapter-label').textContent=level.category===8?`EXTRA ${String(stage-39).padStart(2,'0')} / 05`:`CATEGORY ${String(level.category+1).padStart(2,'0')}`;$('chapter-en').textContent=c.en;$('chapter-title').textContent=level.name;$('chapter-intro').textContent='';$('lesson').textContent=level.rule||c.rule;$('chapter-glyph').textContent=c.glyph;$('rule-glyph').textContent=c.glyph;
  const legend=[['╱','鏡',true],['△','分光器',level.tiles.some(t=>t.t==='p')],['◎','ワープ',level.portals.length],['◈','レンズ',level.tiles.some(t=>t.t==='f')],['◇','スイッチ',level.switches.length],['Ⅱ','ゲート',level.gates.length],['▣','壁',level.walls.length],['▧','ガラス',level.glass?.length],['✧','浮遊鏡',level.tiles.some(t=>t.movable)]];
  $('board-legend').innerHTML=legend.filter(([, ,v])=>v).map(([g,n])=>`<span><b aria-hidden="true">${g}</b>${n}</span>`).join('');
  createBoard();update();$('board-announcement').textContent=`${c.name}、${level.name}。${level.targets.length}つの星を灯してください。`;
  if(focus){$('tiles').firstElementChild?.focus({preventScroll:true});}
}
function snapshot(){record.history.push({rotations:[...record.rotations],positions:record.positions.map(p=>[...p]),moves:record.moves});if(record.history.length>100)record.history.shift();}
function rotateTile(index,delta=1){
  if(result.solved||!level.tiles[index])return;const previousHits=result.lit;snapshot();record.rotations=turn(level,record.rotations,index,delta);record.moves++;rotationAngles[index]+=delta*90;
  sound([261.63*Math.pow(2,(index%7)*2/12)],.03,.18);update({celebrate:true,previousHits});if(!result.solved)$('board-announcement').textContent=`${record.moves}手。${result.lit.filter(Boolean).length}/${level.targets.length}の星が点灯。`;
}
function undo(){if(!record.history.length)return;clearTimeout(wonTimer);const old=record.history.pop();record.rotations=old.rotations;record.positions=old.positions;record.moves=old.moves;selectedTile=null;rotationAngles=record.rotations.map(r=>r*90);burst=[];sound([293.66,246.94],.025,.2,.035);update();$('board-announcement').textContent=`一手戻しました。${record.moves}手。`;}
function reset(replay=false){
  if(!replay&&record.moves===0&&atInitialState())return;
  if(replay)record.history=[];else snapshot();clearTimeout(wonTimer);record.rotations=level.tiles.map(t=>t.r);record.positions=initialPositions(level);selectedTile=null;record.moves=0;rotationAngles=record.rotations.map(r=>r*90);burst=[];update();if(!replay)toast('このステージを最初の配置に戻しました');
}
function renderStagePicker(){
  $('modal-categories').innerHTML=categoryButtons(modalCategory);$('modal-category-rule').textContent=CATEGORIES[modalCategory].rule;
  $('stage-list').innerHTML=LEVELS.map((l,i)=>{if(l.category!==modalCategory)return '';const stats=stageRecordDetails(i);return `<button class="stage-pick ${i===stage?'current':''} ${isComplete(i)?'complete':''}" data-stage="${i}" aria-label="${stats.label}"><strong>${String(i+1).padStart(2,'0')}</strong>${stats.markup}</button>`;}).join('');
}
function showStages(){modalCategory=level.category;renderStagePicker();$('stages-dialog').showModal();}
function showEnding(){const total=Object.values(saved.records).reduce((sum,r)=>sum+(r.completed?(r.best||0):0),0);$('ending-record').innerHTML=`<div><strong>${completionCount}<span style="font-size:13px"> / ${LEVELS.length}</span></strong>クリアしたステージ</div><div><strong>${total}</strong>自己ベストの合計手数</div>`;$('ending-dialog').showModal();sound([392,493.88,587.33,783.99,987.77],.045,1.4,.18);}
function showReset(){const started=Object.values(saved.records).filter(r=>r.moves>0||r.completed).length;$('reset-count').textContent=`クリア済み ${completionCount} / ${LEVELS.length} · プレイ済み ${started} ステージ`;$('reset-dialog').showModal();$('reset-cancel').focus();}

function atInitialState(){return record.rotations.every((r,i)=>r===level.tiles[i].r)&&record.positions.every((p,i)=>p[0]===level.tiles[i].x&&p[1]===level.tiles[i].y);}
function renderMoveTargets(){
  const layer=$('move-targets');if(!layer)return;
  const canMove=selectedTile!==null&&!result.solved;
  for(let i=0;i<level.tiles.length;i++)$('tiles').children[i].classList.toggle('selected',canMove&&selectedTile===i);
  $('selected-rotate').hidden=!canMove;
  const moves=canMove?legalPlacements(level,record.positions,selectedTile):[];
  layer.innerHTML=moves.map(([x,y])=>`<g class="move-target" role="button" tabindex="0" data-move="${x},${y}" aria-label="選択した鏡を${String.fromCharCode(65+x)}${y+1}へ移動" transform="translate(${pos(x)} ${pos(y)})"><rect x="-26" y="-26" width="52" height="52" rx="9"/><text>＋</text></g>`).join('');
  $('move-instruction').textContent=level.tiles.some(t=>t.movable)?canMove?'空いているマスを選んで配置。ダブルクリック・↻・Spaceで回転できます。':'枠付きの浮遊鏡は、選択して空きマスへ。遠いマスへもドラッグで直接配置できます。':'';
}
function selectTile(index){if(result.solved)return;selectedTile=index;renderMoveTargets();}
function moveTile(index,to){
  if(result.solved)return false;const next=place(level,record.positions,index,to);if(!next)return false;
  const previousHits=result.lit;snapshot();record.positions=next;record.moves++;selectedTile=index;sound([329.63,392],.025,.2,.04);update({celebrate:true,previousHits});
  if(!result.solved)$('board-announcement').textContent=`鏡を${String.fromCharCode(65+to[0])}${to[1]+1}へ移動しました。${record.moves}手。`;return true;
}
function destinationFromPointer(e){const r=$('board').getBoundingClientRect();return [Math.round(((e.clientX-r.left)*560/r.width-OFFSET)/STEP),Math.round(((e.clientY-r.top)*560/r.height-OFFSET)/STEP)];}
$('board').addEventListener('click',e=>{
  if(suppressClick){suppressClick=false;return;}
  const rotate=e.target.closest('[data-rotate]');if(rotate){rotateTile(Number(rotate.dataset.rotate),e.shiftKey?-1:1);return;}
  const move=e.target.closest('[data-move]');if(move){moveTile(selectedTile,move.dataset.move.split(',').map(Number));return;}
  const tile=e.target.closest('[data-tile]');if(tile){const i=Number(tile.dataset.tile);if(level.tiles[i].movable)selectTile(i);else rotateTile(i,e.shiftKey?-1:1);}
});
$('board').addEventListener('dblclick',e=>{
  if(e.target.closest('[data-rotate]'))return;
  const tile=e.target.closest('[data-tile]');if(!tile)return;
  const index=Number(tile.dataset.tile);if(level.tiles[index].movable){e.preventDefault();rotateTile(index,e.shiftKey?-1:1);}
});
$('board').addEventListener('contextmenu',e=>{const tile=e.target.closest('[data-tile]');if(tile){e.preventDefault();rotateTile(Number(tile.dataset.tile),-1);}});
$('board').addEventListener('pointerdown',e=>{
  if(e.button!==0||result.solved||e.target.closest('[data-rotate],[data-move]'))return;
  const tile=e.target.closest('[data-tile]');if(!tile)return;const index=Number(tile.dataset.tile);if(!level.tiles[index].movable)return;
  selectTile(index);dragState={index,x:e.clientX,y:e.clientY,moved:false};
});
$('board').addEventListener('pointermove',e=>{
  if(!dragState)return;if(Math.hypot(e.clientX-dragState.x,e.clientY-dragState.y)<8&&!dragState.moved)return;
  if(!dragState.moved)$('board').setPointerCapture(e.pointerId);
  dragState.moved=true;const [x,y]=destinationFromPointer(e),valid=legalPlacements(level,record.positions,dragState.index).some(p=>p[0]===x&&p[1]===y);
  $('drag-ghost').innerHTML=`<g transform="translate(${pos(x)} ${pos(y)})" opacity="${valid?.8:.25}"><rect class="drag-outline" x="-24" y="-24" width="48" height="48" rx="10"/><path class="drag-line" d="${record.rotations[dragState.index]===0?'m-12 12 24-24':'m-12-12 24 24'}"/></g>`;
});
$('board').addEventListener('pointerup',e=>{
  if(!dragState)return;const drag=dragState;dragState=null;$('drag-ghost').innerHTML='';
  if(drag.moved){suppressClick=true;if(!moveTile(drag.index,destinationFromPointer(e)))toast('物体やガラスのないマスへ配置できます');}
});
$('board').addEventListener('pointercancel',()=>{dragState=null;$('drag-ghost').innerHTML='';});
$('board').addEventListener('keydown',e=>{
  if(e.key==='Escape'&&selectedTile!==null){e.preventDefault();selectedTile=null;renderMoveTargets();return;}
  const handle=e.target.closest('[data-rotate]');if(handle&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(!e.repeat)rotateTile(Number(handle.dataset.rotate),e.shiftKey?-1:1);return;}
  const move=e.target.closest('[data-move]');if(move&&(e.key==='Enter'||e.key===' ')){e.preventDefault();moveTile(selectedTile,move.dataset.move.split(',').map(Number));return;}
  const tile=e.target.closest('[data-tile]');if(!tile)return;const i=Number(tile.dataset.tile);
  if(e.key==='Enter'||e.key===' '){e.preventDefault();if(e.repeat)return;if(level.tiles[i].movable&&e.key==='Enter')selectTile(i);else rotateTile(i,e.shiftKey?-1:1);return;}
  const directions={ArrowUp:0,ArrowRight:1,ArrowDown:2,ArrowLeft:3};
  if(e.key in directions){
    e.preventDefault();if(level.tiles[i].movable){selectTile(i);const p=record.positions[i],d=[[0,-1],[1,0],[0,1],[-1,0]][directions[e.key]];moveTile(i,[p[0]+d[0],p[1]+d[1]]);return;}
    const from=record.positions[i],horizontal=e.key==='ArrowLeft'||e.key==='ArrowRight',sign=e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1;
    const candidates=record.positions.map((p,j)=>({j,along:(horizontal?p[0]-from[0]:p[1]-from[1])*sign,across:Math.abs(horizontal?p[1]-from[1]:p[0]-from[0])})).filter(t=>t.along>0).sort((a,b)=>(a.along+a.across*2)-(b.along+b.across*2));
    if(candidates.length)$('tiles').children[candidates[0].j].focus({preventScroll:true});
  }
});

$('selected-rotate').addEventListener('click',e=>{if(selectedTile!==null)rotateTile(selectedTile,e.shiftKey?-1:1);});
$('undo').addEventListener('click',undo);$('reset').addEventListener('click',()=>reset());$('replay').addEventListener('click',()=>reset(true));
$('next').addEventListener('click',()=>{if(completionCount===LEVELS.length){showEnding();return;}loadStage(stage===LEVELS.length-1?LEVELS.findIndex((_,i)=>!isComplete(i)):stage+1,{focus:true});});
$('ending-restart').addEventListener('click',()=>{$('ending-dialog').close();showStages();});
$('sound').addEventListener('click',()=>{saved.sound=!saved.sound;updateSound();persist();if(saved.sound)sound([392,523.25],.035,.4,.08);});
$('help').addEventListener('click',()=>$('help-dialog').showModal());$('stage-open').addEventListener('click',showStages);
$('chapter-nav').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b)loadStage(Number(b.dataset.stage),{focus:true});});
$('category-nav').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;const c=Number(b.dataset.category);if(c===level.category)return;const first=LEVELS.findIndex((l,i)=>l.category===c&&!isComplete(i));loadStage(first<0?c*5:first,{focus:true});});
$('modal-categories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(b){modalCategory=Number(b.dataset.category);renderStagePicker();}});
$('stage-list').addEventListener('click',e=>{const b=e.target.closest('[data-stage]');if(b){$('stages-dialog').close();loadStage(Number(b.dataset.stage),{focus:true});}});
$('progress-reset').addEventListener('click',showReset);$('reset-cancel').addEventListener('click',()=>$('reset-dialog').close());
$('reset-confirm').addEventListener('click',()=>{const cleared=clearProgress(storage,saved);saved=cleared.saved;$('reset-dialog').close();loadStage(0);updateSound();toast(saveAvailable?'進捗をリセットしました':'進捗をリセットしました。このブラウザーでは保存できません');});
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
document.addEventListener('keydown',e=>{if(document.body.dataset.screen!=='game')return;if(e.ctrlKey||e.metaKey||e.altKey||e.repeat||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName))return;if(e.key.toLowerCase()==='z'){e.preventDefault();undo();}if(e.key.toLowerCase()==='r'){e.preventDefault();reset();}});

// Soft motes follow the actual simulated rays; no game state lives in the animation.
const canvas=$('particles'),ctx=canvas.getContext('2d');
function resizeCanvas(){const dpr=Math.min(devicePixelRatio||1,2);canvas.width=560*dpr;canvas.height=560*dpr;ctx?.setTransform(dpr,0,0,dpr,0,0);}
resizeCanvas();window.addEventListener('resize',resizeCanvas);
function emitBurst(){
  if(reducedMotion)return;
  const now=performance.now();
  level.targets.forEach(t=>{for(let i=0;i<35;i++){const a=Math.random()*Math.PI*2,v=12+Math.random()*42;burst.push({x:pos(t.x),y:pos(t.y),vx:Math.cos(a)*v,vy:Math.sin(a)*v,born:now,life:1300+Math.random()*1100,color:COLORS[t.color],radius:.7+Math.random()*1.5});}});
}
let lastFrame=0;
function animate(time){
  requestAnimationFrame(animate);
  if(!ctx||reducedMotion||document.body.dataset.screen!=='game'||document.querySelector('dialog[open]'))return;
  if(time-lastFrame<30)return;lastFrame=time;ctx.clearRect(0,0,560,560);
  ctx.save();ctx.beginPath();ctx.roundRect(45,45,470,470,12);ctx.clip();
  for(let i=0;i<particleSegments.length;i++){
    const s=particleSegments[i],f=((time/2200+i*.371)%1),x=pos(s.x1)+(s.x2-s.x1)*STEP*f,y=pos(s.y1)+(s.y2-s.y1)*STEP*f;
    ctx.globalAlpha=.55;ctx.fillStyle=COLORS[s.color];ctx.shadowColor=COLORS[s.color];ctx.shadowBlur=6;ctx.beginPath();ctx.arc(x,y,1.3,0,Math.PI*2);ctx.fill();
  }
  ctx.shadowBlur=0;
  for(let i=0;i<18;i++){
    const x=48+(i*83.7)%463+Math.sin(time/6000+i)*5,y=48+(i*147.3)%463+Math.cos(time/7500+i)*6;
    ctx.globalAlpha=.07+.04*Math.sin(time/2200+i);ctx.fillStyle='#d0eddf';ctx.beginPath();ctx.arc(x,y,.7,0,Math.PI*2);ctx.fill();
  }
  burst=burst.filter(p=>time-p.born<p.life);
  for(const p of burst){const age=time-p.born,s=age/1000;ctx.globalAlpha=(1-age/p.life)*.9;ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=5;ctx.beginPath();ctx.arc(p.x+p.vx*s,p.y+p.vy*s+s*s*5,p.radius,0,Math.PI*2);ctx.fill();}
  ctx.restore();ctx.globalAlpha=1;
}


updateSound();loadStage(stage);if(saved.fromPreviousEdition){saved.fromPreviousEdition=false;persist();toast('ステージ構成を更新しました。継続問題の記録は引き継いでいます');}requestAnimationFrame(animate);
initDesktop({getState:()=>({saved,stage,level,record,result,completionCount,CATEGORIES,LEVELS}),loadStage,reset,persist,showStages,showReset,updateSound,sound,setMotion:value=>{reducedMotion=value;update();}});
