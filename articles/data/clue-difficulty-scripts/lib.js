require('/workspace/sudoku/assets/js/solver.js');
const S = globalThis.SudokuSolver;
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
const toArr = s => s.split('').map(ch => (ch==='.'?0:+ch));
const toStr = a => a.map(x=>x||0).join('');
const LABEL = ['naked single','hidden single (box)','hidden single (row/col)','pointing/claiming','pair','triple','quad','X-wing','XY-wing','swordfish','chain/coloring','not solved by these techniques'];
function grade(p, sol){ const g=S.grade(p,{solution:sol}); return {solved:g.solved, rank:g.rank, hardest:g.hardestName, label:LABEL[g.rank], steps:g.steps, stalls:g.stalls, bottlenecks:g.bottlenecks, filledAtFirstStall:g.filledAtFirstStall, techniques:g.techniques, used:g.used}; }
function solve(p){ if (S.countSolutions(p,2)!==1) return null; const a=p.slice();
  const peers=[]; for(let i=0;i<81;i++){const r=Math.floor(i/9),c=i%9,br=r-r%3,bc=c-c%3,s=new Set();for(let k=0;k<9;k++){s.add(r*9+k);s.add(k*9+c);s.add((br+Math.floor(k/3))*9+bc+k%3);}s.delete(i);peers.push([...s]);}
  function cand(i){let m=0x3fe;for(const j of peers[i]) if(a[j]) m&=~(1<<a[j]);return m;}
  function rec(){let best=-1,bm=0,bc=10;for(let i=0;i<81;i++){if(a[i])continue;const m=cand(i);let c=0;for(let d=1;d<=9;d++)if(m&(1<<d))c++;if(c<bc){bc=c;best=i;bm=m;if(c<=1)break;}}
    if(best<0)return true; if(bc===0)return false; for(let d=1;d<=9;d++){if(bm&(1<<d)){a[best]=d;if(rec())return true;a[best]=0;}} return false;}
  rec(); return a; }
function digTo(sol, target, rand){ const p=sol.slice(); const order=[...Array(81).keys()]; for(let i=80;i>0;i--){const j=Math.floor(rand()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
  let clues=81; for(const i of order){ if(clues<=target) break; const d=p[i]; p[i]=0; if(S.countSolutions(p,2)!==1) p[i]=d; else clues--; } return p; }
function ascii(s){ const a=s.split(''); let out='+-------+-------+-------+\n'; for(let r=0;r<9;r++){ let line='|'; for(let c=0;c<9;c++){ line+=' '+(a[r*9+c]==='0'?'.':a[r*9+c]); if(c%3===2) line+=' |'; } out+=line+'\n'; if(r%3===2) out+='+-------+-------+-------+\n'; } return out; }
module.exports={S,mulberry32,toArr,toStr,grade,solve,digTo,ascii,LABEL};
