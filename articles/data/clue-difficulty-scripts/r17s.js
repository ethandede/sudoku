const L=require('./lib.js'); const fs=require('fs');
const lines=fs.readFileSync('royle17.txt','utf8').trim().split('\n').map(s=>s.trim());
const N=+process.argv[2]; const rand=L.mulberry32(17017); const idx=new Set(); while(idx.size<N) idx.add(Math.floor(rand()*lines.length));
const cat={}; const rows=[]; let nonunique=0; let slow=0; const t0=Date.now();
for(const k of [...idx].sort((a,b)=>a-b)){ const s=lines[k]; const p=L.toArr(s); if(p.filter(x=>x).length!==17) throw 'bad';
  if(L.S.countSolutions(p,2)!==1){nonunique++;continue;}
  const t=Date.now(); const g=L.grade(p); const dt=Date.now()-t; if(dt>2000) slow++;
  rows.push({line:k+1,puzzle:s,rank:g.rank,hardest:g.hardest,label:g.label,steps:g.steps,stalls:g.stalls,bottlenecks:g.bottlenecks,filledAtFirstStall:g.filledAtFirstStall,solved:g.solved,ms:dt});
  cat[g.label]=(cat[g.label]||0)+1; if(rows.length%100===0) console.log(rows.length, Date.now()-t0); }
console.log('n',rows.length,'nonunique',nonunique,'slow',slow); console.log(cat);
fs.writeFileSync('r17_sample.json',JSON.stringify(rows));
