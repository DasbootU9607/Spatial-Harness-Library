"""Generate a printed problem or audit it from the public coordinate key and instructions."""
import hashlib
import json
import os
import sys
from pathlib import Path
from print_face import HERE, diagram, prompt, sheet
from solve import solve

sys.path.append(str(HERE.parent/'official-folding'))
from artwork import record,decode


def options(face):
    return [dict(label=l,type='figure') if face['choices']==list('ABCD') else
            dict(label=l,type='text',text=c) for l,c in zip('ABCD',face['choices'])]


def generate(kind,seed,params,work):
    work.mkdir()
    os.environ['MPLCONFIGDIR']=str(work/'mpl')
    os.environ['MPLBACKEND']='Agg'
    from design import design,METHOD
    face,index=design(kind,seed,params)
    answer=solve(face)
    if answer['index']!=index:
        raise ValueError('Printed solution conflicts with construction')
    artwork=diagram(face,work)
    final=sheet(face,artwork)
    final.save(work/'question.png')
    spec=dict(schemaVersion=1,category='MentalAnimation',taskType=kind.title()+'Moving',
              title=f"{kind.title()} Movement / {face['mode']} / {seed}",
              description=prompt(face).split('. ')[-1],difficulty=dict(label='Uncalibrated',basis='Coordinate replay with four alternatives.'),
              question=prompt(face),options=options(face),geometry=face,answer=answer,
              rendering=dict(image=record(final),diagramHeight=artwork.height,diagramSha256=hashlib.sha256(artwork.tobytes()).hexdigest()),
              provenance=dict(sourceKind='agent-authored',sourceRevision=json.loads((HERE/'source.json').read_bytes())['revision'],generationMethod=METHOD[kind]))
    (work/'task.json').write_text(json.dumps(spec),encoding='utf8')


def verify(s,kind):
    from PIL import ImageChops
    f=s['geometry']
    if (len(f['size'])==3)!=(kind=='block') or s['question']!=prompt(f) or s['options']!=options(f):
        raise ValueError('Public question or option mismatch')
    img=decode(s['rendering']['image'])
    top=img.crop((0,0,img.width,s['rendering']['diagramHeight']))
    rebuilt=sheet(f,top)
    if rebuilt.size!=img.size or ImageChops.difference(img,rebuilt).getbbox() or hashlib.sha256(top.tobytes()).hexdigest()!=s['rendering']['diagramSha256']:
        raise ValueError('Changed diagram, caption, coordinate key or printed choices')
    ans=solve(f)
    if ans!=s['answer']:raise ValueError('Published answer disagrees with visible-state replay')
    return [dict(name='Printed coordinate key, question and four option labels match the final sheet',verdict='passed')]+[
        dict(name='Option '+r['label'],detail=r['explanation'],verdict='passed') for r in ans['options']]


if __name__=='__main__':
    op,kind,*args=sys.argv[1:]
    if op=='generate':
        seed,params,work=args
        generate(kind,int(seed),json.loads(Path(params).read_bytes()),Path(work).resolve())
    elif op=='verify':
        file,version,fp,out=args
        spec=json.loads(Path(file).read_bytes())
        try:
            checks=verify(spec,kind)
            verdict='passed'
        except Exception as exc:
            verdict='failed'
            checks=[dict(name='Visible problem replay',verdict=verdict,detail=str(exc))]
        Path(out).write_text(json.dumps(dict(schemaVersion=1,candidateId=version,testedFingerprints=json.loads(Path(fp).read_bytes()),verifier=spec['verifier'],checks=checks,verdict=verdict,scope='Printed state keys, commands, labeled diagrams and all four alternatives.')),encoding='utf8')
        sys.exit(int(verdict!='passed'))
