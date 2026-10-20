import {LEVELS,period,initialPositions} from './engine.js';
export const SAVE_KEY='luma.atelier.v8',LEGACY_KEYS=['luma.atelier.v7','luma.atelier.v6','luma.atelier.v5','luma.atelier.v4','luma.atelier.v3','luma.atelier.v2','luma.atelier.v1'];
export const newProgress=(sound=false)=>({version:8,stageId:LEVELS[0].id,sound,fromPreviousEdition:false,records:{}});
export const newRecord=level=>({rotations:level.tiles.map(t=>t.r),positions:initialPositions(level),moves:0,completed:false,best:null,history:[]});
export function validPositions(level,positions){
  if(!Array.isArray(positions)||positions.length!==level.tiles.length)return false;
  const blocked=new Set([...(level.glass||[]),...(level.walls||[]),...level.sources,...level.targets,...level.portals,...level.switches,...level.gates].map(p=>`${p.x},${p.y}`)),occupied=new Set();
  return positions.every((p,i)=>{
    if(!Array.isArray(p)||p.length!==2||!p.every(Number.isInteger))return false;
    const t=level.tiles[i],key=p.join(',');if(occupied.has(key)||blocked.has(key))return false;occupied.add(key);
    if(!t.movable)return p[0]===t.x&&p[1]===t.y;
    return p[0]>=0&&p[1]>=0&&p[0]<level.size&&p[1]<level.size;
  });
}
export function cleanRecord(level,record){
  if(!record)return null;
  const rotations=a=>Array.isArray(a)&&a.length===level.tiles.length&&a.every((r,i)=>Number.isInteger(r)&&r>=0&&r<period(level.tiles[i]));
  const natural=n=>Number.isSafeInteger(n)&&n>=0;
  if(!rotations(record.rotations)||!validPositions(level,record.positions))return null;
  return {rotations:[...record.rotations],positions:record.positions.map(p=>[...p]),moves:natural(record.moves)?record.moves:0,completed:record.completed===true,best:natural(record.best)?record.best:null,history:Array.isArray(record.history)?record.history.filter(h=>h&&rotations(h.rotations)&&validPositions(level,h.positions)&&natural(h.moves)).slice(-100).map(h=>({rotations:[...h.rotations],positions:h.positions.map(p=>[...p]),moves:h.moves})):[]};
}
export function readProgress(storage){
  try{
    const raw=storage.getItem(SAVE_KEY);
    if(raw!==null){
      const data=JSON.parse(raw);if(data?.version!==8)return newProgress();
      const saved=newProgress(data.sound===true);saved.fromPreviousEdition=data.fromPreviousEdition===true;
      if(LEVELS.some(l=>l.id===data.stageId))saved.stageId=data.stageId;
      for(const l of LEVELS){const r=cleanRecord(l,data.records?.[l.id]);if(r)saved.records[l.id]=r;}return saved;
    }
    for(const key of LEGACY_KEYS){
      const raw=storage.getItem(key);if(raw===null)continue;
      let previous;try{previous=JSON.parse(raw);}catch{continue;}
      const saved=newProgress(previous.sound===true);saved.fromPreviousEdition=true;
      if(previous.version===7||previous.version===6||previous.version===5||previous.version===4||previous.version===3){
        for(const l of LEVELS){const r=cleanRecord(l,previous.records?.[l.id]);if(r)saved.records[l.id]=r;}
        if(LEVELS.some(l=>l.id===previous.stageId)&&saved.records[previous.stageId])saved.stageId=previous.stageId;
      }
      return saved;
    }
  }catch{}
  return newProgress();
}
export function writeProgress(storage,saved){try{storage.setItem(SAVE_KEY,JSON.stringify(saved));return true;}catch{return false;}}
export function clearProgress(storage,saved){
  const clean=newProgress(saved.sound);for(const key of LEGACY_KEYS)try{storage.removeItem(key);}catch{}
  return {saved:clean,persisted:writeProgress(storage,clean)};
}
