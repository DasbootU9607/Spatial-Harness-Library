"""Run the upstream routine, its Matplotlib figures and its official compositor."""
import os
import sys
import json
import random
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[1]
sys.path.insert(0,str(HERE.parent/'official-rotation'))
import upstream

MODEL='create_freecad/create_mental_folding/create_paper_folding.py'
UTIL='create_freecad/metal_folding_tasks_utils.py'
DISPATCH='create_freecad/generate_data.py'
FONT=HERE.parent/'official-rotation/assets/DejaVuSans-Bold.ttf'


def build(seed, params, work):
    os.environ['MPLBACKEND']='Agg'
    os.environ['MPLCONFIGDIR']=str(work/'matplotlib')
    import matplotlib
    matplotlib.use('Agg')
    from plan import select
    base, baseline=upstream.load(MODEL)
    plan,attempts=select(seed,params,base)
    steps=len(plan['axes'])+1
    size=plan['size']
    name=f'0-{size}-{size}-{steps}-{len(plan["punches"])}'
    folder=work/'MentalFolding'/'PaperFolding'/('Level'+str(plan['level']))/name
    folder.mkdir(parents=True)
    updates=[
        ('random.choice(["horizontal", "vertical"])', 'axis_names[plan["axes"][step]]', 'Supply the chosen axial order.'),
        ('random.randint(1, paper.current_rows - 1)', 'plan["lines"][step]', 'Supply the selected horizontal crease.'),
        ('random.randint(1, paper.current_cols - 1)', 'plan["lines"][step]', 'Supply the selected vertical crease.'),
        ('random.choice(find_45_degree_fold_endpoints(paper.current_rows, paper.current_cols))', 'plan["diagonal"]','Supply the validated terminal diagonal.'),
        ('random.sample(zero_positions, punches)', 'plan["punches"]','Supply distinct retained punch cells.'),
        ("random.choice(['row', 'col'])", 'plan["distractor"]','Choose an axis with an available empty band.')]
    model,source=upstream.load(MODEL,dict(plan=plan,axis_names={'H':'horizontal','V':'vertical'}),updates)
    random.seed(seed)
    model.random_generate_data(size,size,steps,len(plan['punches']),str(folder))
    utils,utility=upstream.load('create_freecad/utils.py')
    sys.modules['utils']=utils
    compositor,composition=upstream.load(UTIL,dict(bound_font=str(FONT)),[
        ('ImageFont.truetype("DejaVuSans-Bold.ttf", font_size)','ImageFont.truetype(bound_font, font_size)','Use the bundled DejaVu typeface.'),
        ('if "correct" in f','if f.startswith("unfold_correct_")','Prevent an incorrect filename from supplying the answer.'),
        ('Folding operations include horizontal, vertical, and diagonal folds.', 'Folds may be horizontal, vertical, or diagonal.', 'Describe the allowed directions without implying all occur in each item.'),
        ('after punching a hole.', 'after punching the marked cells.', 'Describe any released punch count accurately.')])
    namespace=dict(save_root=str(folder.parent),prepare_composite_image_PaperFolding=compositor.prepare_composite_image_PaperFolding,os=os)
    patches=[(line,'# Domain functions are bound by the launcher.','Load only the selected task family.') for line in
             ['from mental_rotation_tasks_utils import *','from metal_folding_tasks_utils import *','from visual_penetration_tasks_utils import *','from mental_animation_tasks_utils import *']]
    patches += [('save_folder = "path/to/save"', 'save_folder = save_root','Use the private run folder.'),
                ('f"{save_folder}/{dir_name}"','os.path.join(save_folder, dir_name)','Keep native path components for metadata.'),
                ('# prepare_composite_image_PaperFolding(dir_path)','prepare_composite_image_PaperFolding(dir_path)','Enable the published Paper Folding dispatch.')]
    _,driver=upstream.load(DISPATCH,namespace,patches)
    return plan,folder,dict(revision=upstream.REVISION,sources=[source,composition,utility,driver],
                            plannerAttempts=attempts,backend='Agg',matplotlib=matplotlib.__version__,
                            sourceParameters=dict(rows=size,cols=size,steps=steps,punches=len(plan['punches'])))

