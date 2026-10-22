// Honest timing demo for the "AI is bad at Sudoku" article.
import vm from "node:vm"; import fs from "node:fs";
const root="/workspace/sudoku";
const ctx={console,Math,performance}; ctx.globalThis=ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(root+"/assets/js/solver.js","utf8"),ctx);
const { grade } = ctx.SudokuSolver;
// ~25-line plain backtracking solver
function bt(g){ const rows=new Uint16Array(9),cols=new Uint16Array(9),box=new Uint16Array(9); const empty=[];
  for(let i=0;i<81;i++){const d=g[i]; if(d){const b=1<<d; const r=i/9|0,c=i%9,x=(r/3|0)*3+(c/3|0); rows[r]|=b;cols[c]|=b;box[x]|=b;} else empty.push(i);}
  let nodes=0;
  function rec(k){ if(k===empty.length) return true; const i=empty[k],r=i/9|0,c=i%9,x=(r/3|0)*3+(c/3|0);
    for(let d=1;d<=9;d++){const b=1<<d; if((rows[r]|cols[c]|box[x])&b) continue; nodes++;
      g[i]=d; rows[r]|=b;cols[c]|=b;box[x]|=b; if(rec(k+1)) return true; rows[r]&=~b;cols[c]&=~b;box[x]&=~b; g[i]=0;}
    return false;}
  const ok=rec(0); return {ok,nodes}; }
function valid(g){ for(let u=0;u<9;u++){const R=new Set,C=new Set,B=new Set; for(let k=0;k<9;k++){R.add(g[u*9+k]);C.add(g[k*9+u]);B.add(g[(Math.floor(u/3)*3+Math.floor(k/3))*9+(u%3)*3+k%3]);} if(R.size<9||C.size<9||B.size<9||R.has(0))return false;} return true;}
const puzzles=[];
for(const lvl of ["easy","medium","hard"]){ const lines=fs.readFileSync(`/workspace/nyt/doks_${lvl}.csv`,"utf8").trim().split(/\r?\n/).slice(1);
  for(const L of lines){ const m=L.match(/"\[([^\]]*)\]","\[([^\]]*)\]"$/); if(m) puzzles.push({lvl,p:m[1].split(",").map(Number)}); } }
const famous={ "Inkala 2012 (\"world's hardest\")":"800000000003600000070090200050007000000045700000100030001000068008500010090000400"};
let t0=performance.now(), maxMs=0, allOk=true;
for(const {p} of puzzles){ const g=p.slice(); const s=performance.now(); const r=bt(g); const e=performance.now()-s; maxMs=Math.max(maxMs,e); allOk&&=r.ok&&valid(g); }
const tot=performance.now()-t0;
console.log(`NYT archive: ${puzzles.length} puzzles, plain backtracking: all solved & valid=${allOk}, total ${tot.toFixed(0)} ms, mean ${(tot/puzzles.length).toFixed(3)} ms, max ${maxMs.toFixed(2)} ms`);
t0=performance.now(); let gm=0, solvedH=0; for(const {p} of puzzles){const s=performance.now(); const r=grade(p.slice()); gm=Math.max(gm,performance.now()-s); if(r.solved) solvedH++;}
const gt=performance.now()-t0;
console.log(`Human-style grader: solved ${solvedH}/${puzzles.length} by logic, mean ${(gt/puzzles.length).toFixed(3)} ms, max ${gm.toFixed(2)} ms`);
for(const [n,s] of Object.entries(famous)){ const g=[...s].map(Number); const st=performance.now(); const r=bt(g); const e=performance.now()-st; const gr=grade([...s].map(Number));
  console.log(`${n}: backtracking ok=${r.ok&&valid(g)} nodes=${r.nodes} ${e.toFixed(1)} ms; human-style grader solved=${gr.solved} hardest=${gr.hardestName}`); }
console.log(`node ${process.version}, ${(await import("node:os")).cpus()[0].model}`);
// Variant: backtracking that always fills the cell with fewest options first (MRV)
function mrv(g){ let nodes=0; function rec(){ let best=-1,bm=0,bc=10;
  for(let i=0;i<81;i++){ if(g[i]) continue; const r=i/9|0,c=i%9; let used=0;
    for(let k=0;k<9;k++){used|=1<<g[r*9+k];used|=1<<g[k*9+c];used|=1<<g[((r/3|0)*3+(k/3|0))*9+(c/3|0)*3+k%3];}
    const m=(~used)&0x3fe; let cnt=0; for(let d=1;d<=9;d++) if(m&(1<<d)) cnt++;
    if(cnt<bc){bc=cnt;best=i;bm=m; if(cnt<=1)break;} }
  if(best<0) return true; for(let d=1;d<=9;d++) if(bm&(1<<d)){nodes++; g[best]=d; if(rec()) return true; g[best]=0;} return false;}
  return {ok:rec(),nodes}; }
{ let t=performance.now(),mx=0,ok=true; for(const {p} of puzzles){const g=p.slice(); const s=performance.now(); const r=mrv(g); mx=Math.max(mx,performance.now()-s); ok&&=r.ok&&valid(g);} const tt=performance.now()-t;
  console.log(`MRV backtracking: all valid=${ok}, mean ${(tt/puzzles.length).toFixed(3)} ms, max ${mx.toFixed(2)} ms`);
  const g=[...famous[Object.keys(famous)[0]]].map(Number); const s=performance.now(); const r=mrv(g); console.log(`MRV on Inkala: ok=${r.ok&&valid(g)} ${(performance.now()-s).toFixed(2)} ms nodes=${r.nodes}`); }
