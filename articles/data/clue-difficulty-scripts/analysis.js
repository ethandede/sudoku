const L=require('./lib.js'); const fs=require('fs');
const rand=L.mulberry32(20261021); const rows=[]; const t0=Date.now();
const targets=[]; for(let t=22;t<=40;t++) targets.push(t);
const PER=+process.argv[2]||40;
for(const t of targets) for(let k=0;k<PER;k++){
  const sol=L.S.fillGrid(rand); const p=L.digTo(sol,t,rand); const clues=p.filter(x=>x).length;
  const g=L.grade(p,sol); rows.push({puzzle:L.toStr(p),solution:L.toStr(sol),clues,target:t,...g,techniques:undefined});
}
fs.writeFileSync('/workspace/work/analysis_raw.json',JSON.stringify(rows));
console.log('n',rows.length,'ms',Date.now()-t0);
