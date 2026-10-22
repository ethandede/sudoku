import sys, itertools
sys.path.insert(0,'/workspace/nyt')
from solver import *
def rc(i): return f"r{i//9+1}c{i%9+1}"
def run(s):
    p=[int(c) for c in s]; st=S(p); log=[]
    while 0 in st.v:
        nk,hd=singles(st)
        opts={}
        for i,d in nk: opts[i]=d
        for i,d in hd: opts.setdefault(i,d)
        if opts:
            i=next(iter(opts)); st.place(i,opts[i]); continue
        filled=sum(1 for x in st.v if x)
        # detailed technique report
        before=[set(c) for c in st.c]
        for name,f in ADV:
            if f(st):
                changes=[(rc(i),sorted(before[i]-st.c[i])) for i in range(81) if before[i]!=st.c[i]]
                bv={rc(i):sorted(before[i]) for i in range(81) if not st.v[i] and len(before[i])==2}
                log.append((filled,name,changes))
                print(f"after {filled} filled: {name} removes {changes}")
                if name in('xywing','xwing'):
                    print('  bivalue cells:',bv)
                    for d in range(1,10):
                        rows=[(r+1,[c+1 for c in range(9) if d in before[r*9+c]]) for r in range(9)]
                        r2=[x for x in rows if len(x[1])==2]
                        cols=[(c+1,[r+1 for r in range(9) if d in before[r*9+c]]) for c in range(9)]
                        c2=[x for x in cols if len(x[1])==2]
                        if any(set(sorted(a[1]))==set(b[1]) for a,b in itertools.combinations(r2,2)) or any(set(a[1])==set(b[1]) for a,b in itertools.combinations(c2,2)):
                            print('  digit',d,'rows w/2:',r2,'cols w/2:',c2)
                break
    return log
for s in sys.argv[1:]:
    print('==',s); run(s)
