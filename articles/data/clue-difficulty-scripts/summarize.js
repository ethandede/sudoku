const r=require('./analysis_raw.json'); const fs=require('fs');
const bins=[[22,24],[25,26],[27,28],[29,30],[31,32],[33,34],[35,36],[37,38],[39,40]];
const cat=g=>!g.solved?'unsolved':g.rank<=2?'singles':g.rank===3?'locked':g.rank<=5?'pairs_triples':g.rank<=9?'fish_wings_quads':'chains';
const out=[];
for(const [a,b] of bins){ const xs=r.filter(x=>x.clues>=a&&x.clues<=b); const n=xs.length; const cnt={singles:0,locked:0,pairs_triples:0,fish_wings_quads:0,chains:0,unsolved:0}; xs.forEach(x=>cnt[cat(x)]++);
 const solved=xs.filter(x=>x.solved); const mean=(arr,f)=>arr.length?arr.reduce((s,x)=>s+f(x),0)/arr.length:null;
 const stalled=solved.filter(x=>x.stalls>0);
 out.push({clues:`${a}-${b}`,n,counts:cnt,pct:Object.fromEntries(Object.entries(cnt).map(([k,v])=>[k,+(100*v/n).toFixed(1)])),
  meanTechniqueSteps_solved:+mean(solved,x=>x.steps).toFixed(2), meanStalls_solved:+mean(solved,x=>x.stalls).toFixed(2), meanForcedMoves_solved:+mean(solved,x=>x.bottlenecks).toFixed(2),
  meanFilledAtFirstStall_stalledOnly: stalled.length?+mean(stalled,x=>x.filledAtFirstStall).toFixed(1):null, nStalled:stalled.length});
}
console.table(out.map(o=>({clues:o.clues,n:o.n,...o.pct,steps:o.meanTechniqueSteps_solved,stalls:o.meanStalls_solved,forced:o.meanForcedMoves_solved,firstStall:o.meanFilledAtFirstStall_stalledOnly})));
const hi=r.filter(x=>x.clues>=30&&x.solved&&x.rank>=4); console.log('30+ needing pair+',hi.length, hi.map(x=>x.clues+':'+x.hardest).join(' '));
const lo=r.filter(x=>x.clues<=24&&x.rank<=2); console.log('<=24 singles only',lo.length);
const tot=r.length; console.log('total',tot);
fs.writeFileSync('/workspace/work/summary.json',JSON.stringify(out,null,1));
