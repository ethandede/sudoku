import sys,re
for p in sys.argv[1:]:
    s=open(p).read()
    body=s.split('---',2)[2]
    main=body.split('## References')[0]
    print(p, 'total', len(s.split()), 'body(no front matter/refs)', len(main.split()))
