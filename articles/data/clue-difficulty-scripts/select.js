const L=require('./lib.js'); const fs=require('fs');
const raw=require('./analysis_raw.json');
const pick=(f)=>raw.filter(f).sort((a,b)=>b.clues-a.clues);
console.log('HIGH ADV:', pick(x=>x.solved&&x.rank>=7&&x.clues>=33).map(x=>[x.clues,x.hardest,x.steps,x.puzzle]).slice(0,8));
console.log('LOW SINGLES:', raw.filter(x=>x.rank<=2&&x.clues<=23).map(x=>[x.clues,x.hardest,x.bottlenecks,x.puzzle]).slice(0,6));
// hill climb: add clues while still needing >= targetRank
function climb(puz,sol,minRank,rand){ let p=L.toArr(puz), s=L.toArr(sol); let improved=true;
  while(improved){ improved=false; const empt=[...Array(81).keys()].filter(i=>!p[i]); for(let i=empt.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[empt[i],empt[j]]=[empt[j],empt[i]];}
    for(const i of empt){ p[i]=s[i]; const g=L.S.grade(p,{solution:s}); if(g.solved&&g.rank>=minRank&&g.rank<=9){improved=true;} else p[i]=0; } }
  return p; }
const rand=L.mulberry32(99);
let best={};
for(const x of raw.filter(x=>x.solved&&x.rank>=4&&x.rank<=9)){ for(const [minRank,key] of [[7,'xwing+'],[4,'pair+']]){ if(x.rank<minRank) continue; for(let t=0;t<3;t++){ const p=climb(x.puzzle,x.solution,minRank,rand); const c=p.filter(v=>v).length; const g=L.grade(p,L.toArr(x.solution)); const k=key+':'+g.hardest; if(!best[k]||best[k].clues<c) best[k]={clues:c,puzzle:L.toStr(p),solution:x.solution,hardest:g.hardest,steps:g.steps,techniques:L.S.grade(p).techniques}; } } }
console.log(Object.fromEntries(Object.entries(best).map(([k,v])=>[k,[v.clues,v.puzzle,v.techniques.join(',')]])));
fs.writeFileSync('climb_best.json',JSON.stringify(best,null,1));
