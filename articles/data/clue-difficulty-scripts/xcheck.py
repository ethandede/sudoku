import sys,json
sys.path.insert(0,'/workspace/nyt')
from solver import grade
for s in sys.argv[1:]:
    p=[int(c) for c in s]
    g=grade(p)
    print(sum(1 for x in p if x), g['solved'], g['hardest'], g['used'], 'adv',g['adv'])
