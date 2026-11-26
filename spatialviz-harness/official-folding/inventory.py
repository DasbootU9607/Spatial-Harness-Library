"""Fit all net silhouettes against the released 11 layouts in an affine paper basis."""
import json,cv2,numpy as np
from collections import Counter
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
from design import LAYOUTS
from PIL import Image
def fit(mask):
    contours,_=cv2.findContours(mask,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
    pts=np.concatenate(contours).reshape(-1,2)
    edge=[]
    for cnt in contours:
        poly=cv2.approxPolyDP(cnt,2.3,True).reshape(-1,2)
        for vec in np.roll(poly,-1,axis=0)-poly:
            if vec[0]<0:vec=-vec
            if vec[0]>8 and abs(vec[1])>3:
                edge.append(vec)
    try:
        dirs=[max((v for v in edge if np.sign(v[1])==s),key=lambda v:np.linalg.norm(v)) for s in (1,-1)]
        dirs=np.array(dirs,dtype=float)
        dirs/=np.linalg.norm(dirs,axis=1)[:,None]
        uv=pts@np.linalg.inv(dirs)
        low=uv.min(axis=0);high=uv.max(axis=0)
        best=(0,None)
        for i,layout in enumerate(LAYOUTS):
            grid=np.array([[int(v) for v in row] for row in layout.split('/')][::-1])
            ny,nx=grid.shape
            cell=(high-low)/[nx,ny]
            projection=np.zeros_like(mask)
            for yy,xx in zip(*np.where(grid)):
                quad=low+(np.array([[0,0],[1,0],[1,1],[0,1]])+[xx,yy])*cell
                cv2.fillConvexPoly(projection,np.round(quad@dirs).astype('int32'),255)
            score=np.count_nonzero(projection&mask)/np.count_nonzero(projection|mask)
            if score>best[0]:best=score,i
        return dict(layout=best[1] if best[0]>.90 else None,iou=round(best[0],3))
    except (ValueError,np.linalg.LinAlgError):
        return dict(layout=None,iou=0)
def main():
    import argparse,re
    parser=argparse.ArgumentParser(description='Re-audit released net silhouettes and attributed distractor operations')
    parser.add_argument('--output',required=True,type=Path)
    output=parser.parse_args().output
    output.mkdir(parents=True,exist_ok=True)
    for slug in ['unfolding','reconstruction']:
        refs=ROOT/'spatialviz-harness/skills'/('spatialviz-cube-'+slug)/'references'
        rows=json.loads((refs/'official.json').read_text('utf8'))
        results=[]
        for row in rows:
            im=Image.open(refs/row['packagedImage']).convert('RGB')
            text='opposite' in row['question']
            w,h=im.size
            im.thumbnail((1500,600))
            a=np.asarray(im)
            if not text:
                a=a[round(158*im.height/h):]
            mask=(a.min(axis=2)<225).astype('uint8')*255
            xs=np.where(mask.any(axis=0))[0]
            groups=np.split(xs,np.where(np.diff(xs)>4)[0]+1)
            groups=groups[1:] if slug=='unfolding' else groups[:1]
            layouts=[fit(mask[:,g[0]:g[-1]+1].copy()) for g in groups]
            family={'Level0':'color','Level2':'mosaic'}.get(row['level'],'pips' if int(row['sourceId'].split('/')[-1])<20 else 'lines')
            exp=row['explanation'].splitlines()
            operations={op:[line for line in exp if re.search(regex,line,re.I)] for op,regex in
                        [('faceTurn','rotated'),('wholeViewMirror','mirrored'),('faceExchange','swap')]}
            results.append(dict(sourceId=row['sourceId'],family=family,layouts=layouts,annotatedOperations=operations))
        (output/(slug+'.json')).write_text(json.dumps(results,indent=2)+'\n',encoding='utf8')
        print(slug,len(rows),Counter(v['layout'] for r in results for v in r['layouts']))

if __name__=='__main__':
    main()
