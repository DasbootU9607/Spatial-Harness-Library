"""Create a reproducible official Paper Folding figure and independently solve its pixels."""
import base64
from contextlib import redirect_stdout
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image

from evidence import answer, check_native, coverage, original_signatures, physical_signature, solve_image
from source import HERE, build
sys.path.insert(0,str(HERE.parent/'official-folding'))
from artwork import record

METHOD='SpatialViz-Bench official Paper Folding Matplotlib/Pillow pipeline'


def generate(seed,params,out):
    out.mkdir(parents=True)
    known=original_signatures()
    for attempt in range(32):
        work=out/f'attempt-{attempt+1:02}'
        effective=seed+attempt*1000003
        work.mkdir()
        with (work/'upstream.log').open('w',encoding='utf8') as log, redirect_stdout(log):
            plan,folder,receipt=build(effective,params,work)
        figure=Image.open(folder/(folder.name+'.png')).convert('RGB')
        result=solve_image(figure,plan['size'],len(plan['axes'])+1)
        solved=answer(result)
        history=result['exactFoldHistories'][0]
        check_native(plan,history,result['punches'])
        if physical_signature(plan['size'],history['folds'],result['punches']) not in known:
            break
        (work/'rejected.txt').write_text('The visible folding history and punches already occur in the released figures.')
        if {'axes','lines','diagonal','punches'}<=params.keys():
            raise ValueError('Explicit geometry reproduces a released stem')
    else:
        raise ValueError('Could not find a novel physical stem within 32 attempts')
    annotation=json.loads((folder/'data.json').read_bytes())[0]
    if annotation['Answer']!='ABCD'[solved['index']]:
        raise ValueError('Official answer differs from the image-only result')
    question=annotation['Question']
    options=[dict(label=l,type='figure') for l in 'ABCD']
    image=record(figure)
    (out/'question.png').write_bytes(base64.b64decode(image['pngBase64']))
    keys=coverage(result,plan['distractor'])
    native=json.loads((folder/'info.json').read_bytes())
    receipt.update(nativeInfo=native,annotation=annotation,figureDimensions=figure.size,realizedSeed=effective,
                   figureDigest=hashlib.sha256(figure.tobytes()).hexdigest(),attempt=attempt+1)
    panels={}
    for file in sorted(folder.glob('*.png')):
        if file.stem!=folder.name:
            panels[file.name]=hashlib.sha256(Image.open(file).convert('RGB').tobytes()).hexdigest()
    receipt['panels']=panels
    spec=dict(schemaVersion=1,title=f"Paper Folding / {plan['size']} by {plan['size']} / {plan['mechanism']}",
              description='Trace the blue fold outlines and unfold the red punch sites onto the original grid.',
              category='MentalFolding',taskType='PaperFolding',seed=seed,parameters=params,geometry=plan,
              difficulty=dict(label='Uncalibrated',basis=f"Follow {plan['axes']} then a finite diagonal fold. Track {len(plan['punches'])} punch sites through stacks of {history['layersPerPunch']} layers."),
              question=question,options=options,answer=solved,coverage=keys,visualStructure=result,pipeline=receipt,
              rendering=dict(image=image,presentation="diagram-only"),provenance=dict(sourceKind='agent-authored',sourceRevision=receipt['revision'],
                  generationMethod=METHOD,manifest=json.loads((HERE/'source.json').read_bytes())))
    (out/'task.json').write_text(json.dumps(spec),encoding='utf8')


if __name__=='__main__':
    seed,params,out=sys.argv[1:]
    generate(int(seed),json.loads(Path(params).read_text('utf-8-sig')),Path(out).resolve())

