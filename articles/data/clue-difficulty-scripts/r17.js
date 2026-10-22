const L=require('./lib.js'); const fs=require('fs');
const lines=fs.readFileSync('royle17.txt','utf8').trim().split('\n').map(s=>s.trim());
const t0=Date.now(); const cat={}; const rows=[]; let nonunique=0, bad=0;
for(const s of lines){ if(!/^[0-9.]{81}$/.test(s)){bad++;continue;} const p=L.toArr(s); if(p.filter(x=>x).length!==17){bad++;continue;}
  if(L.S.countSolutions(p,2)!==1){nonunique++;continue;}
  const g=L.grade(p); rows.push({puzzle:s,rank:g.rank,hardest:g.hardest,steps:g.steps,stalls:g.stalls,bottlenecks:g.bottlenecks,filledAtFirstStall:g.filledAtFirstStall,solved:g.solved});
  cat[g.label]=(cat[g.label]||0)+1; }
console.log('ms',Date.now()-t0,'n',rows.length,'nonunique',nonunique,'bad',bad); console.log(cat);
fs.writeFileSync('r17_graded.json',JSON.stringify(rows));
