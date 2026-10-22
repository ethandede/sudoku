const L=require('./lib.js'); const fs=require('fs');
const OUT='/workspace/articles-draft/data'; fs.mkdirSync(OUT,{recursive:true});
const raw=require('./analysis_raw.json'); const summary=require('./summary.json');
const r17=require('./r17_sample.json');
function full(id,title,puzzle,note,source){ const p=L.toArr(puzzle); const n=L.S.countSolutions(p,2); const sol=L.solve(p); const g=L.S.grade(p,{solution:sol});
  if(n!==1) throw new Error('bad '+id);
  return {id,title,puzzle,solution:L.toStr(sol),clues:p.filter(x=>x).length,uniqueSolution:n===1,source,note,
   grade:{solvedByGrader:g.solved,hardestTechnique:L.LABEL[g.rank],hardestInternal:g.hardestName,rank:g.rank,techniqueStepsBeyondSingles:g.steps,techniqueSequence:g.techniques,stalls:g.stalls,forcedMoves:g.bottlenecks,filledAtFirstStall:g.filledAtFirstStall,singlesUsed:{naked:g.used.single||0,hiddenBox:g.used.hidden_box||0,hiddenLine:g.used.hidden_line||0}},
   ascii:L.ascii(puzzle)}; }
const r17hard=r17.find(x=>!x.solved); const r17easy=r17.find(x=>x.rank<=2&&x.rank>=1); const r17pair=r17.find(x=>x.hardest==='naked_pair'||x.hardest==='hidden_pair');
const ex=[
 full('a-40-clue-xwing-xywing','40 clues, still needs an X-wing and an XY-wing','008735206000040890001908370704000009080009430003470008207504083400087052000690701','Found in the random sample below (target 40 clues). After singles fill 67 cells, the solver needs an X-wing on 2s (rows 3 and 4, columns 2 and 5) to remove 2 from r5c5, then an XY-wing.','SudokuSudoku generator sample, seed 20261021'),
 full('a2-68-clue-xywing','68 clues, no singles at all, needs an XY-wing on move one','012097083039108062408203019853001297926375148147829635005934821384712956291586374','Built on purpose: starting from a sampled puzzle that needed an XY-wing, givens from the solution were added back one at a time as long as the puzzle still required an XY-wing. Pivot r1c4 {4,6}, wings r1c1 {5,6} and r2c5 {4,5}: 5 cannot go in r2c1.','SudokuSudoku generator sample + clue-adding search (seed 99)'),
 full('a3-63-clue-xwing','63 clues, needs two pointing steps and an X-wing','236845719871060345459731286003450861168003504540618930014580603600304158385106490','Built the same way. X-wing on 7s in columns 1 and 6 (rows 4 and 7) removes 7 from r7c8.','SudokuSudoku generator sample + clue-adding search (seed 99)'),
 full('b-23-clue-singles','23 clues, singles only, never stalls','010040000000009005000030280700000010908005007000062000005000609000003000607000048','From the random sample (target 23). Solved start to finish with naked and hidden singles; there is always at least one single available.','SudokuSudoku generator sample, seed 20261021'),
 full('c1-17-clue-singles','17 clues (Royle collection), singles only',r17easy.puzzle,'From Gordon Royle\'s collection of 17-clue puzzles, as mirrored in the 607011/RateMySudoku repository (line '+r17easy.line+').','Royle 17-clue collection'),
 full('c2-17-clue-pair','17 clues (Royle collection), needs a pair',r17pair.puzzle,'Royle collection, mirror line '+r17pair.line+'.','Royle 17-clue collection'),
 full('c3-17-clue-beyond','17 clues (Royle collection), beyond every technique our grader knows',r17hard.puzzle,'Royle collection, mirror line '+r17hard.line+'. Our grader stalls; it needs techniques beyond chains/coloring (or trial and error).','Royle 17-clue collection'),
];
// note: c3 not solvable by grader -> handle separately

fs.writeFileSync(OUT+'/clue-difficulty-examples.json',JSON.stringify({generatedAt:new Date().toISOString(),grader:'github.com/ethandede/sudoku assets/js/solver.js @ main (7ac6d24), easiest-move-first',format:'81-char strings, row by row, 0 = empty',examples:ex},null,2));
// analysis
const cat=g=>!g.solved?'beyondGrader':g.rank<=2?'singlesOnly':g.rank===3?'pointingClaiming':g.rank<=5?'pairsTriples':g.rank<=9?'quadsXwingXYwingSwordfish':'chainsColoring';
const byClue={}; for(const x of raw){ const k=x.clues; byClue[k]=byClue[k]||{clues:k,n:0,counts:{singlesOnly:0,pointingClaiming:0,pairsTriples:0,quadsXwingXYwingSwordfish:0,chainsColoring:0,beyondGrader:0}}; byClue[k].n++; byClue[k].counts[cat(x)]++; }
const meanClues={}; for(const x of raw){ const c=cat(x); meanClues[c]=meanClues[c]||[]; meanClues[c].push(x.clues);} 
const meanByCat=Object.fromEntries(Object.entries(meanClues).map(([k,v])=>[k,{n:v.length,meanClues:+(v.reduce((a,b)=>a+b,0)/v.length).toFixed(1),min:Math.min(...v),max:Math.max(...v)}]));
fs.writeFileSync(OUT+'/clue-difficulty-analysis.json',JSON.stringify({
 method:'For each target clue count 22..40, 120 random solution grids (seeded mulberry32, seed 20261021) were generated with SudokuSolver.fillGrid; cells were removed in random order, keeping each removal only if the puzzle stayed uniquely solvable, until the target was reached or no cell could be removed. Each puzzle was graded with SudokuSolver.grade (easiest move first). Low targets often could not be reached, so bins use actual clue counts.',
 totalPuzzles:raw.length, categories:{singlesOnly:'naked + hidden singles only',pointingClaiming:'needs locked candidates (pointing/claiming), nothing harder',pairsTriples:'needs naked/hidden pair or triple',quadsXwingXYwingSwordfish:'needs quad, X-wing, XY-wing or swordfish',chainsColoring:'needs simple coloring or XY-chain',beyondGrader:'not finished by any technique the grader knows (needs harder chains, or guessing)'},
 binned:summary, byExactClueCount:Object.values(byClue), meanCluesByHardestCategory:meanByCat,
 caveats:['Randomly carved puzzles are not what publishers print; publishers select by difficulty.','forcedMoves counts steps with exactly one available move, including the final placement, so a puzzle that never stalls still scores about 1.','"Needs" is relative to the grader\'s technique set and order.']},null,2));
fs.writeFileSync(OUT+'/clue-difficulty-sample-puzzles.json',JSON.stringify(raw.map(x=>({puzzle:x.puzzle,solution:x.solution,clues:x.clues,target:x.target,solved:x.solved,hardest:x.hardest,label:x.label,steps:x.steps,stalls:x.stalls,forcedMoves:x.bottlenecks,filledAtFirstStall:x.filledAtFirstStall}))));
const c17={}; for(const x of r17){ c17[x.label]=(c17[x.label]||0)+1; }
fs.writeFileSync(OUT+'/clue-difficulty-royle17-sample.json',JSON.stringify({source:'Gordon Royle, collection of 17-clue Sudoku puzzles (49,158 puzzles), mirror: https://raw.githubusercontent.com/607011/RateMySudoku/master/collections/gordon-royle-17.txt',method:'5,000 lines drawn at random (seed 17017) without replacement; each verified to have 17 clues and exactly one solution, then graded with SudokuSolver.grade.',n:r17.length,countsByHardest:c17,pctByHardest:Object.fromEntries(Object.entries(c17).map(([k,v])=>[k,+(100*v/r17.length).toFixed(1)])),puzzles:r17.map(({ms,...x})=>x)},null,1));
console.log(JSON.stringify(ex.map(e=>[e.id,e.clues,e.grade.hardestTechnique,e.grade.techniqueSequence.join(','),e.grade.stalls,e.grade.forcedMoves,e.grade.filledAtFirstStall,e.puzzle]),null,0));
console.log(meanByCat); console.log(c17);
