// Presentation only: the engine supplies the actual ray graph, including forks
// and portal exits. Arrival order never changes puzzle rules or saved state.
export const LIGHT_TRAVEL_LIMIT=250;
export const LIGHT_FADE=55;
const point=(x,y)=>`${x},${y}`;
export function edgeKey(s){return [point(s.x1,s.y1),point(s.x2,s.y2)].sort().join('|');}
const sameDirection=(a,b)=>a.x1===b.x1&&a.y1===b.y1;
function mergedEdges(segments){
  const map=new Map();
  for(const s of segments){const key=edgeKey(s),old=map.get(key);if(old)old.color|=s.color;else map.set(key,{...s});}
  return map;
}
export function planLight(level,result,previous={segments:[],openGates:[]}){
  const old=mergedEdges((previous.steadySegments||previous.segments).filter(s=>s.complete!==false)),edges=mergedEdges(result.segments);
  for(const e of edges.values())e.samples=[];
  const graph=new Map(result.segments.map(s=>[s.state,s])),arrivals=new Map(),queue=[],waiting=new Map(),switchTimes=new Map();
  const events={targets:level.targets.map(()=>[]),tiles:new Map(),portals:new Map(),switches:new Map(),gates:new Map()};
  (previous.hits||[]).forEach((color,i)=>{const kept=color&result.hits[i];if(kept)events.targets[i].push({color:kept,at:0});});
  for(const [name,current]of [['tiles',result.touched],['portals',result.portalHits],['switches',result.switchHits],['gates',result.openGates]]){
    const prior=previous[{tiles:'touched',portals:'portalHits',switches:'switchHits',gates:'openGates'}[name]]||[];
    for(const key of prior)if(current.includes(key))events[name].set(key,0);
  }
  const enqueue=(state,time)=>{if(time<(arrivals.get(state)??Infinity)){arrivals.set(state,time);queue.push({state,time});}};
  const earliest=(map,key,time)=>map.set(key,Math.min(map.get(key)??Infinity,time));
  level.sources.forEach(s=>enqueue(`${s.x},${s.y},${s.d},${s.color}`,0));
  while(queue.length){
    queue.sort((a,b)=>a.time-b.time);const {state,time}=queue.shift();
    if(time!==arrivals.get(state))continue;
    const s=graph.get(state);if(!s)continue;
    let start=time;
    if(s.gate!==undefined&&!previous.openGates.includes(s.gate)){
      if(!switchTimes.has(s.gate)){const held=waiting.get(s.gate)||[];held.push({state,time});waiting.set(s.gate,held);continue;}
      start=Math.max(start,switchTimes.get(s.gate)+.6);
    }
    const e=edges.get(edgeKey(s)),retained=((old.get(edgeKey(s))?.color||0)&s.color)===s.color,end=start+(retained?0:1);
    for(const color of [1,2])if(s.color&color)e.samples.push({color,start:retained?0:start,end:retained?0:end,forward:sameDirection(e,s)});
    if(s.target!==undefined)events.targets[s.target].push({color:s.color,at:end});
    if(s.tile!==undefined)earliest(events.tiles,s.tile,end);
    if(s.portal!==undefined)earliest(events.portals,s.portal,end);
    if(s.gate!==undefined)earliest(events.gates,s.gate,start);
    if(s.switch!==undefined){
      earliest(events.switches,s.switch,end);
      if(end<(switchTimes.get(s.switch)??Infinity)){
        switchTimes.set(s.switch,end);earliest(events.gates,s.switch,end);
        for(const held of waiting.get(s.switch)||[]){arrivals.delete(held.state);enqueue(held.state,held.time);}
        waiting.delete(s.switch);
      }
    }
    for(const next of s.next)enqueue(next,end+(s.jump&&!retained ? .4 : 0));
  }
  const max=Math.max(0,...[...edges.values()].flatMap(e=>e.samples.map(s=>s.end)),...events.gates.values());
  const scale=Math.min(26,LIGHT_TRAVEL_LIMIT/(max||1));
  for(const e of edges.values())for(const s of e.samples){s.start*=scale;s.end*=scale;}
  for(const list of events.targets)for(const e of list)e.at*=scale;
  for(const map of [events.tiles,events.portals,events.switches,events.gates])for(const [key,time]of map)map.set(key,time*scale);
  const fade=[...old.values()].map(s=>({...s,color:s.color&~(edges.get(edgeKey(s))?.color||0)})).filter(s=>s.color);
  return {edges:[...edges.values()],events,fade,duration:Math.max(max*scale,fade.length?LIGHT_FADE:0)};
}
export function lightFrame(plan,time){
  const segments=[],steadySegments=[];
  for(const e of plan.edges){
    const ranges=e.samples.map(s=>{const f=s.end===0?1:Math.max(0,Math.min(1,(time-s.start)/(s.end-s.start)));return {color:s.color,lo:s.forward?0:1-f,hi:s.forward?f:1};}).filter(r=>r.hi>r.lo);
    const cuts=[...new Set([0,1,...ranges.flatMap(r=>[r.lo,r.hi])])].sort((a,b)=>a-b);
    let completeColor=e.color;
    for(let i=0;i<cuts.length-1;i++){
      const lo=cuts[i],hi=cuts[i+1],mid=(lo+hi)/2,color=ranges.reduce((mask,r)=>mid>=r.lo&&mid<=r.hi?mask|r.color:mask,0);
      if(color)segments.push({x1:e.x1+(e.x2-e.x1)*lo,y1:e.y1+(e.y2-e.y1)*lo,x2:e.x1+(e.x2-e.x1)*hi,y2:e.y1+(e.y2-e.y1)*hi,color,complete:lo===0&&hi===1});
      completeColor&=color;
    }
    if(completeColor)steadySegments.push({...e,color:completeColor,complete:true});
  }
  const active=map=>[...map].filter(([,at])=>at<=time).map(([key])=>key);
  return {segments,steadySegments,hits:plan.events.targets.map(list=>list.reduce((mask,e)=>e.at<=time?mask|e.color:mask,0)),touched:active(plan.events.tiles),portalHits:active(plan.events.portals),switchHits:active(plan.events.switches),openGates:active(plan.events.gates)};
}
