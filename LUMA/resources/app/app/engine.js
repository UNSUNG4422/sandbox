import {CATEGORIES,LEVELS} from './campaign.js';
export {CATEGORIES,LEVELS};
export const DIRS=[[0,-1],[1,0],[0,1],[-1,0]];
const MIRROR=[[1,0,3,2],[3,2,1,0]];
export const period=tile=>tile.t==='p'?4:2;
export const initialPositions=level=>level.tiles.map(t=>[t.x,t.y]);
export function legalPlacements(level,positions,index){
  const tile=level.tiles[index];if(!tile?.movable)return [];
  const blocked=new Set([...(level.glass||[]),...(level.walls||[]),...(level.sources||[]),...(level.targets||[]),...(level.portals||[]),...(level.switches||[]),...(level.gates||[])].map(p=>`${p.x},${p.y}`));
  positions.forEach((p,i)=>{if(i!==index)blocked.add(`${p[0]},${p[1]}`);});
  blocked.add(positions[index].join(','));
  const places=[];for(let y=0;y<level.size;y++)for(let x=0;x<level.size;x++)if(!blocked.has(`${x},${y}`))places.push([x,y]);
  return places;
}
export function place(level,positions,index,destination){
  if(!Array.isArray(destination)||destination.length!==2||!destination.every(Number.isInteger)||!legalPlacements(level,positions,index).some(p=>p[0]===destination[0]&&p[1]===destination[1]))return null;
  return positions.map((p,i)=>i===index?[...destination]:[...p]);
}
// Older offline verification scripts use these names; both now mean one direct placement.
export const legalSlides=legalPlacements,slide=place;
export function turn(level,rotations,index,delta=1){
  const next=[...rotations],n=period(level.tiles[index]);
  next[index]=(next[index]+delta%n+n)%n;return next;
}
// Start each configuration with closed gates. Opening a relay can expose another.
export function trace(level,rotations=level.tiles.map(t=>t.r),positions=initialPositions(level),{timeline=false}={}){
  const open=new Set();let result;
  for(let pass=0;pass<=(level.switches?.length||0);pass++){
    result=tracePass(level,rotations,open,positions,timeline);
    const newly=result.switchHits.filter(id=>!open.has(id));
    if(!newly.length)break;
    newly.forEach(id=>open.add(id));
  }
  return {...result,openGates:[...open]};
}
function tracePass(level,rotations,open,positions,timeline){
  const {size,tiles,sources,targets}=level;
  const at=(items=[])=>new Map(items.map((p,i)=>[`${p.x},${p.y}`,i]));
  const optics=at(tiles.map((t,i)=>({...t,x:positions[i][0],y:positions[i][1]}))),goals=at(targets),lamps=at(sources),warps=at(level.portals),switches=at(level.switches),gates=at(level.gates),walls=at(level.walls);
  const portals=level.portals||[],sensors=level.switches||[],doors=level.gates||[];
  const segments=[],hits=targets.map(()=>0),touched=new Set(),visited=new Set(),blocked=[],jumps=[],switchHits=new Set(),portalHits=new Set(),tileHits=tiles.map(()=>({colors:0,directions:0}));
  const queue=sources.map(s=>({...s}));
  while(queue.length){
    let {x,y,d,color}=queue.shift();
    for(let step=0;step<size*size*16;step++){
      const key=`${x},${y},${d},${color}`;
      if(visited.has(key))break;visited.add(key);
      const [dx,dy]=DIRS[d],nx=x+dx,ny=y+dy;
      const segment={x1:x,y1:y,x2:nx,y2:ny,color};
      if(timeline){segment.state=key;segment.next=[];if(gates.has(`${x},${y}`))segment.gate=doors[gates.get(`${x},${y}`)].group;}
      segments.push(segment);
      if(nx<0||ny<0||nx>=size||ny>=size)break;x=nx;y=ny;
      const pos=`${x},${y}`;
      if(goals.has(pos)){hits[goals.get(pos)]|=color;if(timeline)segment.target=goals.get(pos);break;}
      if(lamps.has(pos)||walls.has(pos))break;
      if(switches.has(pos)){const group=sensors[switches.get(pos)].group;switchHits.add(group);if(timeline)segment.switch=group;break;}
      if(gates.has(pos)&&!open.has(doors[gates.get(pos)].group))break;
      if(warps.has(pos)){
        const i=warps.get(pos),entry=portals[i],exit=portals.find((p,j)=>j!==i&&p.pair===entry.pair);
        if(!exit)break;
        jumps.push({x1:x,y1:y,x2:exit.x,y2:exit.y,pair:entry.pair,color});portalHits.add(entry.pair);
        if(timeline){segment.portal=entry.pair;segment.jump=true;segment.next=[`${exit.x},${exit.y},${d},${color}`];}
        x=exit.x;y=exit.y;continue;
      }
      if(optics.has(pos)){
        const i=optics.get(pos),tile=tiles[i],r=rotations[i];touched.add(i);tileHits[i].colors|=color;tileHits[i].directions|=1<<d;if(timeline)segment.tile=i;
        if(tile.t==='m')d=MIRROR[r%2][d];
        else if(tile.t==='f')color=r===0?1:2;
        else if(d===r){queue.push({x,y,d:(d+1)%4,color},{x,y,d:(d+3)%4,color});if(timeline)segment.next=[`${x},${y},${(d+1)%4},${color}`,`${x},${y},${(d+3)%4},${color}`];break;}
        else{blocked.push(i);break;}
      }
      if(timeline)segment.next=[`${x},${y},${d},${color}`];
    }
  }
  const lit=hits.map((h,i)=>h===targets[i].color);
  return {segments,hits,lit,touched:[...touched],tileHits,blocked,jumps,switchHits:[...switchHits],portalHits:[...portalHits],solved:targets.length>0&&lit.every(Boolean)};
}
