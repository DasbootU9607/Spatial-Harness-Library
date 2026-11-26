import hashlib,json,re,sys
from pathlib import Path
from PIL import Image
from design import design
from pipeline import launch,compose,HERE
from answer import solve,view
from artwork import record,footer
from geometry import fold
from motifs import FAMILIES

CONVENTION='The net is shown from the printed side. Place that side down before folding upward, so the markings face outward.'
def generate(task,seed,params,folder):
    folder.mkdir(parents=True)
    job=design(task,seed,params)
    work=launch(job,folder)
    out,receipts=compose(job,work)
    return assemble(job,out,work,receipts,folder)

def assemble(job,out,work,receipts,folder):
    a=json.loads((out/'data.json').read_text())[0]
    unfold=job['task']=='CubeUnfolding'
    text=job['mode']=='opposite'
    options=[dict(type='figure',label=l) if l==v else dict(type='text',label=l,text=v) for l,v in zip('ABCD',a['Choices'])]
    question=CONVENTION+' '+a['Question']
    g={}
    if unfold:
        g['view']=view(job['cubes']['target'])
    else:
        g['net']=job['nets']['target']
    panels={}
    if text:
        g['askedColor']=re.search(r'opposite the (\w+) face',question).group(1).lower()
        panels['reference']=record(Image.open(out/'0.png'))
    else:
        g['options']=[]
        ref=next(out.glob('*_cube.png')) if unfold else out/'0_unfold.png'
        panels['reference']=record(Image.open(ref))
        for o in options:
            if o['type']=='text':
                continue
            label=o['label']
            f,=out.glob('*_'+label+'.png')
            panels[label]=record(Image.open(f))
            key=f.stem.rsplit('_',1)[0]
            if unfold:
                key=re.search(r'(incorrect|correct)_\d+',key)[0]
                g['options'].append(job['nets'][key])
            else:
                mirrored=key.endswith('_incorrect')
                key=key.removesuffix('_incorrect') if mirrored else key
                g['options'].append(view(job['cubes'][key],mirrored))
    fig=Image.open(out/'0.png').convert('RGB')
    final=footer(fig,question,options)
    final.save(folder/'question.png')
    spec=dict(schemaVersion=1,title=job['task'].replace('Cube','Cube ')+' / '+job['family']+' / '+job['mode'],
              description='Fold the six exterior faces and compare the printed markings.',category='MentalFolding',
              taskType=job['task'],seed=job['seed'],parameters={k:job[k] for k in ('family','layout','mode')},
              difficulty=dict(label='Uncalibrated',basis={'opposite':'Track an opposite normal across the net.',
                        'color':'Track face identities and the cyclic order at a vertex.'}.get('opposite' if text else job['family'],
                        'Track an ordered corner and transport the orientation of individual motifs.')),
              geometry=g,question=question,options=options,rendering=dict(image=record(final)),
              pipeline=dict(annotation=a,panels=panels,composition=receipts,model=json.loads((work/'receipt.json').read_text())),
              provenance=dict(sourceKind='agent-authored',sourceRevision='c27f9111a2674f2ea03e2ca1f5833326cf1eec1a',
                    generationMethod='SpatialViz-Bench official FreeCAD + OpenCV/Pillow pipeline',manifest=json.loads((HERE/'source.json').read_text())))
    spec['contract']=dict(paper='x right, y up, printed side facing reader; fold away from reader',turn='quarter turns counterclockwise from the printed side',visibleSlots=['top','left','right'],properRotations=24)
    for cells in (g['options'] if unfold else [g['net']]):
        frames=fold(cells)
        for cell in cells:
            r,u,n=frames[tuple(cell['xy'])]
            cell['foldedFrame']=dict(right=r,up=u,outward=n)
    spec['pipeline']['assets']={f.name:hashlib.sha256(f.read_bytes()).hexdigest() for f in sorted((work/'assets').glob('*.png'))}
    spec['pipeline']['model']['compatibility']=['Supply App and FreeCADGui in the macro namespace','Render the net from its printed side and the cube from the standard isometric camera','Use explicit outward UV placements on ImagePlanes']
    spec['answer']=solve(spec)
    (folder/'task.json').write_text(json.dumps(spec),encoding='utf8')
    return spec

if __name__=='__main__':
    task,seed,params,out=sys.argv[1:]
    generate(task,int(seed),json.loads(Path(params).read_text('utf-8-sig')),Path(out).resolve())

