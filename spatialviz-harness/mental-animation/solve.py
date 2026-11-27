"""Replay only printed inventories, instructions and choices. No generator imports."""
import re

HEADINGS = 'NESW'
OFFSETS = [(0, 1), (1, 0), (0, -1), (-1, 0)]
TURN = {'Forward': 0, 'Right': 1, 'Backward': 2, 'Left': -1}


def unpack(board, block):
    count = 3 if block else 2
    result = {tuple(row[:count]): tuple(row[count:]) for row in board}
    if len(result) != len(board):
        raise ValueError('Overlapping objects')
    return result


def target_text(board, pos):
    return ' '.join(board.get(pos, ('empty',)))


def advance(board, step, size):
    block = len(size) == 3
    fields = re.fullmatch(r'\((\d+),(\d+),(\d+)\) ([xyz])([+-])', step) if block else re.fullmatch(
        r'(?:\((\d+),(\d+)\) )?(Left|Right|Backward|Forward) ([1-9]\d*)', step)
    if not fields:
        raise ValueError('Unreadable command ' + step)
    if block:
        x, y, z, axis, sign = fields.groups()
        src = tuple(map(int, (x, y, z)))
        delta = [0, 0, 0]
        delta['xyz'.index(axis)] = 1 if sign == '+' else -1
    else:
        x, y, turn, distance = fields.groups()
        if x is None and len(board) != 1:
            raise ValueError('Missing source coordinate')
        src = next(iter(board)) if x is None else (int(x), int(y))
        if src not in board:
            raise ValueError(f'No arrow at {src}')
        facing = (HEADINGS.index(board[src][1]) + TURN[turn]) % 4
        delta = [v * int(distance) for v in OFFSETS[facing]]
    dst = tuple(a+b for a, b in zip(src, delta))
    if src not in board or any(v < 0 or v >= limit for v, limit in zip(dst, size)):
        raise ValueError(f'Illegal move from {src} to {dst}')
    moving = board[src]
    other = board.get(dst)
    if block and not other and dst[2] and (*dst[:2], dst[2]-1) not in board:
        raise ValueError(f'No support below {dst}')
    del board[src]
    board[dst] = moving if block else (moving[0], HEADINGS[facing])
    detail = f'{moving[0]} {src} to {dst}'
    if not block:
        detail += ' facing ' + HEADINGS[facing]
    if other:
        board[src] = other if block else (other[0], HEADINGS[(facing+2)%4])
        detail += f', exchanging with {other[0]}' + ('' if block else ' facing '+board[src][1])
    if block:
        for column in sorted({src[:2],dst[:2]}):
            cubes = sorted((pos,val) for pos,val in board.items() if pos[:2]==column)
            for height,(pos,val) in enumerate(cubes):
                if pos[2] != height:
                    del board[pos]
                    board[(*column,height)] = val
                    detail += f', {val[0]} falls from {pos} to {(*column,height)}'
    return detail


def solve(face):
    """face is the complete published problem. Options and given moves are printed verbatim."""
    mode = face['mode']
    block = len(face['size']) == 3
    panels = {name:unpack(rows,block) for name,rows in face['panels'].items()}
    options = face['choices']
    if len(options)!=4 or len(set(options))!=4:
        raise ValueError('Expected four distinct choices')
    if mode in ('fleet-state','predecessor') and len({tuple(sorted(panels[k].items())) for k in 'ABCD'})!=4:
        raise ValueError('Equivalent printed diagrams')
    matches, reasons = [], []
    signatures = set()
    for i,choice in enumerate(options):
        letter = 'ABCD'[i]
        start = panels[letter if mode=='predecessor' else 'Initial'].copy()
        goal = panels[letter if mode=='fleet-state' else 'Final']
        steps = (face['given'] if mode in ('predecessor','fleet-state') else choice)
        if mode=='missing':
            steps = choice + ' / ' + face['given']
        trace, mismatch = [], None
        observations = []
        try:
            for j,command in enumerate(steps.split(' / ')):
                trace.append(advance(start,command,face['size']))
                expect = panels.get('After step 1') if j==0 else None
                if j==len(steps.split(' / '))-1:
                    expect = goal
                if expect is not None:
                    observations.append(tuple(sorted(start.items())))
                if expect is not None and start!=expect and mismatch is None:
                    pos = next(p for p in sorted(set(start)|set(expect)) if start.get(p)!=expect.get(p))
                    mismatch = f'Step {j+1}, cell {pos} contains {target_text(start,pos)}. The panel requires {target_text(expect,pos)}.'
        except ValueError as err:
            mismatch = str(err)+'.'
        if mode not in ('predecessor','fleet-state'):
            signature=tuple(observations)
            if signature in signatures:
                raise ValueError('Two paths have equivalent displayed outcomes')
            signatures.add(signature)
        if mismatch is None:
            matches.append(i)
        reasons.append(dict(label=letter,explanation='. Then '.join(trace)+'. '+(mismatch or 'Every displayed constraint matches.')))
    if len(matches)!=1:
        raise ValueError('Visible matches: '+str(['ABCD'[i] for i in matches]))
    return dict(index=matches[0],explanation=reasons[matches[0]]['explanation'],options=reasons)
