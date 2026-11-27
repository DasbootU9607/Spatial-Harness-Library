"""Compare every published distractor explanation to the printed difference."""
from pathlib import Path
import json
import re


def compare(annotation,reading):
    expected=set(map(tuple,reading['exactFoldHistories'][0]['unfoldedHoles']))
    rows={}
    for sentence in annotation['explanation'].splitlines():
        label=re.search(r'Option ([A-D])',sentence)[1]
        bands=re.findall(r'(row|column) (\d+)',sentence)
        axis,num=bands[0]
        d=0 if axis=='row' else 1
        source=int(num)-1
        seen=set(map(tuple,reading['readOptions'][label]))
        missing,extra=expected-seen,seen-expected
        if 'extra' in sentence:
            matches=not missing and bool(extra) and all(c[d]==source for c in extra)
        elif 'missing' in sentence:
            matches=bool(missing) and not extra and all(c[d]==source for c in missing)
        else:
            dest=int(bands[1][1])-1
            matches=(bool(missing) and bool(extra) and all(c[d]==source for c in missing) and
                     all(c[d]==dest for c in extra) and {c[1-d] for c in extra}=={c[1-d] for c in missing})
        rows[label]=dict(publishedExplanation=sentence,missing=sorted(missing),extra=sorted(extra),agrees=matches)
    return dict(sourceId=annotation['sourceId'],given=f"{reading['grid']}-by-{reading['grid']} sheet with operation panels followed by red punch rings.",
                requested='Select the unfolded hole matrix from the four drawings A through D.',
                matchingLabel=reading['predictedLabels'][0],differences=rows)


if __name__=='__main__':
    refs=Path(__file__).resolve().parent
    ann={x['sourceId']:x for x in json.loads((refs/'official.json').read_bytes())}
    rows=[compare(ann[x['sourceId']],x) for x in json.loads((refs/'observations.json').read_bytes())['items']]
    (refs/'option-audit.json').write_bytes((json.dumps(rows,indent=2)+'\n').encode())
    print('Matches per explanation:',sum(v['agrees'] for r in rows for v in r['differences'].values()),'of',sum(len(r['differences']) for r in rows))

