"""Verify printed geometry independently, then bind every visible label and source panel."""
import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont
from evidence import HERE, answer, check_native, coverage, effects, original_signatures, physical_signature, solve_image
sys.path.insert(0,str(HERE.parent/'official-folding'))
from artwork import decode, footer, FONT


def require(condition,message):
    if not condition:
        raise ValueError(message)


def verify_composition(fig,names,hashes):
    # Upstream panels are equal squares. Its documented padding, gap and header
    # size determine every crop without referring to detector coordinates.
    side,rem=divmod(fig.width-200-3*70,4)
    require(rem==0 and fig.height==2*side+420,'Unexpected composite dimensions')
    mask=fig.copy()
    drawn=ImageDraw.Draw(mask)
    labels=Image.new('RGB',fig.size,'white')
    labeldraw=ImageDraw.Draw(labels)
    font=ImageFont.truetype(str(FONT),60)
    for y,entries in [(160,names[0]),(320+side,names[1])]:
        x=(fig.width-len(entries)*side-(len(entries)-1)*70)//2
        for name,caption in entries:
            box=(x,y,x+side,y+side)
            actual=hashlib.sha256(fig.crop(box).tobytes()).hexdigest()
            require(actual==hashes.get(name),'Changed or misplaced source panel '+name)
            drawn.rectangle((x,y,x+side-1,y+side-1),fill='white')
            left,_,right,_=labeldraw.textbbox((0,0),caption,font=font)
            labeldraw.text((x+side//2-(right-left)//2,y-70),caption,fill='black',font=font)
            x+=side+70
    require(np.array_equal(mask,labels),'Operation, punch or option caption differs from its slot')


def audit(s):
    final=decode(s['rendering']['image'])
    p=s['geometry']
    pipeline=s['pipeline']
    size=p['size']
    steps=len(p['axes'])+1
    dims=pipeline['figureDimensions']
    require(3<=size<=5 and size==p['level']+3 and steps==(3 if size==5 else 2),'Level or fold count differs')
    separate = s['rendering'].get('presentation') == 'diagram-only'
    require((final.size == tuple(dims)) if separate else (final.width==dims[0] and final.height>dims[1]>0),'Wrong printed figure dimensions')
    figure=final.crop((0,0,*dims))
    result=solve_image(figure,size,steps)
    solved=answer(result)
    require(json.loads(json.dumps(result))==s['visualStructure'] and solved==s['answer'],'Image-derived holes, option labels or answer differ')
    h=result['exactFoldHistories'][0]
    check_native(p,h,result['punches'])
    require(len(result['punches'])==size-2,'Punch count differs from supported profile')
    require(physical_signature(size,h['folds'],result['punches']) not in original_signatures(),'Released stem reused')
    require([k for _,k in sorted(zip(p['punches'],p['effects'],strict=True))]==effects(result),'Punch mechanism differs from visible marks')
    label='ABCD'[solved['index']]
    a=pipeline['annotation']
    require(a['Choices']==list('ABCD') and a['Answer']==label and a['Task']=='PaperFolding' and a['Category']=='MentalFolding','Official answer dispatch disagrees')
    prompt=(f'The original paper is a {size}x{size} grid. The top row of images shows the effect of folding the grid paper {steps} times. '
            'Folds may be horizontal, vertical, or diagonal. The rightmost image in the top row shows the result after punching the marked cells. '
            'Which image shows the paper after it is unfolded? Black solid circles represent holes in the grid squares. Please choose from options A, B, C, or D.')
    require(s['question']==a['Question']==prompt and s['options']==[dict(label=k,type='figure') for k in 'ABCD'],'Prompt, count or option form differs')
    native=pipeline['nativeInfo']['folds']
    expected_axes=['horizontal' if ch=='H' else 'vertical' for ch in p['axes']]
    expected_axes+=['diagonal','punch']
    require([op[0] for op in native]==expected_axes and [op[1] for op in native]==p['lines']+[p['diagonal'],p['punches']],'Upstream operation receipt differs')
    chosen='strip' if steps==2 else ('parallel' if p['axes'][0]==p['axes'][1] else 'crossed')
    requested=s['parameters']
    for field in ('level','mechanism','axes','lines','diagonal','punches','distractor'):
        if field in requested:
            require(requested[field]==p[field],'Explicit input was not applied: '+field)
    require(chosen==p['mechanism'],'Incorrect sequence family')
    requested_effect=requested.get('effect','any')
    require(requested_effect=='any' or (len(set(p['effects']))>1 if requested_effect=='mixed' else requested_effect in p['effects']),'Requested effect is absent')
    expected=set(map(tuple,h['unfoldedHoles']))
    idx={'row':0,'col':1}[p['distractor']]
    differences=[]
    for k,points in result['readOptions'].items():
        if k==label:
            continue
        shown=set(map(tuple,points))
        remove,extra=expected-shown,shown-expected
        differences.append((remove,extra))
    erased,=[a for a,b in differences if a and not b]
    added,=[b for a,b in differences if b and not a]
    require((erased,added) in differences and len({v[idx] for v in erased})==len({v[idx] for v in added})==1
            and {v[1-idx] for v in erased}=={v[1-idx] for v in added},'Printed distractors must omit, copy and relocate the same band')
    require(s['coverage']==coverage(result,p['distractor']),'Published mechanism tags differ')
    hashes=pipeline['panels']
    top=[(f'{i}_{axis}.png','Punch Holes' if axis=='punch' else f'Operation {i}') for i,axis in enumerate(expected_axes,1)]
    lower=[('unfold_'+('correct_' if k==label else 'incorrect_')+k+'.png',k) for k in 'ABCD']
    verify_composition(figure,(top,lower),hashes)
    require(hashlib.sha256(figure.tobytes()).hexdigest()==pipeline['figureDigest'],'Source composite changed')
    if not separate:
        require(np.array_equal(final,footer(figure,prompt,s['options'])),'Archived worksheet footer differs')
    return ['Independent image-only reconstruction, unique physical history and unique printed choice',
            'Original cell transport, local creases, changing offsets, punch layers and physical novelty',
            'Four visibly distinct options with row or column deletion, duplication and relocation',
            'Pinned native panel sequence, hole locations, option letters, font labels and printed prompt']


if __name__=='__main__':
    file,version,fingerprints,output=sys.argv[1:]
    s=json.loads(Path(file).read_bytes())
    try:
        require(s['rendering'].get('presentation') == 'diagram-only', 'Output a separate diagram for this candidate')
        checks=[dict(name=c,verdict='passed') for c in audit(s)]
        verdict='passed'
    except Exception as exc:
        verdict='failed'
        checks=[dict(name='Paper folding image and structure audit',verdict=verdict,detail=str(exc))]
    report=dict(schemaVersion=1,candidateId=version,testedFingerprints=json.loads(Path(fingerprints).read_bytes()),
                verifier=s['verifier'],checks=checks,verdict=verdict,scope='Visible blue fold outlines, red punch centers, unfolded answer pixels, prompt and labels.')
    Path(output).write_text(json.dumps(report),encoding='utf8')
    print(json.dumps(checks))
    sys.exit(int(verdict!='passed'))

