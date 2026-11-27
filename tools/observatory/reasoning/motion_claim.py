"""Test reasoning claims against the same visible coordinates used by the independent solvers."""
import json
from pathlib import Path
import re
import sys

SPATIAL = Path(__file__).resolve().parents[3] / 'spatialviz-harness'
sys.path.insert(0, str(SPATIAL / 'mental-animation'))
from solve import advance, solve, unpack, HEADINGS, TURN, OFFSETS


def result(passed, evidence, feedback=''):
    return dict(passed=passed, evidence=evidence, feedback=feedback)


def cell_tracks(size, folds, punches, transport):
    tracks = {}
    for row in range(size):
        for col in range(size):
            path = [(row, col)]
            for fold in folds:
                path.append(transport(path[-1], fold))
            if path[-1] in punches:
                tracks[path[0]] = path
    return tracks


def paper(q):
    sys.path.insert(0, str(SPATIAL / 'paper-folding'))
    from evidence import transport
    visible = q['visualStructure']
    history, = visible['exactFoldHistories']
    folds = history['folds']
    punches = set(map(tuple, visible['punches']))
    grid = visible['grid']
    tracks = cell_tracks(grid, folds, punches, transport)
    full = set(tracks)
    options = {k: set(map(tuple, cells)) for k, cells in visible['readOptions'].items()}
    label = 'ABCD'[q['index']]
    matches = [k for k, cells in options.items() if cells == full]
    if matches != [label]:
        return result(False, {'matches': matches},
                      f'Printed option {label} must uniquely match transported holes {sorted(full)}. Revise the duplicate or misplaced hole.')
    nearest = min((k for k in options if k != label), key=lambda k: len(options[k] ^ full))
    target = q['target']
    if target not in ('diagonal-partner', 'fold-layers'):
        raise ValueError('Choose diagonal-partner or fold-layers for paper folding.')
    evidence = dict(answer=label, closestFoil=nearest, differingCells=sorted(full ^ options[nearest]), punches=sorted(punches))
    if target == 'diagonal-partner':
        alternate = set(cell_tracks(grid, folds[:-1], punches, transport))
        if alternate != full:
            evidence.update(omittedStep=len(folds), crease=folds[-1], changedHoles=sorted(full ^ alternate),
                            matchesWithoutFold=[k for k, cells in options.items() if cells == alternate])
            return result(True, evidence)
        return result(False, evidence, f'Punches {sorted(punches)} give the same holes when the diagonal is omitted. Keep the axial folds; move a punch into the folded-over triangle, away from its diagonal crease.')
    # Later crease coordinates belong to the retained strip. Withholding an
    # earlier fold could make those coordinates physically impossible. Instead
    # trace two distinct punched cells merging on a real axial step.
    for i, fold in enumerate(folds[:-1]):
        arrived = {}
        for origin, path in tracks.items():
            others = arrived.setdefault(path[i+1], {})
            for prior, other in others.items():
                if prior != path[i]:
                    evidence.update(step=i+1, crease=fold, mergedAt=path[i+1], punch=path[-1],
                                    originalCells=[other, origin], paths=[tracks[other], path])
                    return result(True, evidence)
            others[path[i]] = origin
    return result(False, evidence, f'Punches {sorted(punches)} cover no pair of layers joined by an axial fold. Keep the frame; position a punch over a strip that brings in another original layer.')


def motion_steps(face, i):
    mode = face['mode']
    letter = 'ABCD'[i]
    block = len(face['size']) == 3
    panels = face['panels']
    start = unpack(panels[letter if mode == 'predecessor' else 'Initial'], block)
    goal = unpack(panels[letter if mode == 'fleet-state' else 'Final'], block)
    text = face['given'] if mode in ('fleet-state', 'predecessor') else face['choices'][i]
    if mode == 'missing':
        text += ' / ' + face['given']
    return start, goal, text.split(' / ')


def observations(face, goal, step, length):
    if step == length:
        return goal
    if step == 1 and 'After step 1' in face['panels']:
        return unpack(face['panels']['After step 1'], len(face['size']) == 3)
    return None


def differences(actual, expected):
    return [p for p in sorted(set(actual) | set(expected)) if actual.get(p) != expected.get(p)]


def replay(face, i):
    board, goal, commands = motion_steps(face, i)
    states = [dict(board)]
    mismatch = []
    for j, command in enumerate(commands, 1):
        try:
            advance(board, command, face['size'])
        except ValueError as err:
            return states, goal, commands, mismatch + [dict(step=j, violation=str(err))]
        states.append(dict(board))
        expected = observations(face, goal, j, len(commands))
        if expected is not None:
            mismatch.extend(dict(step=j, cell=p, observed=board.get(p), required=expected.get(p)) for p in differences(board, expected))
    return states, goal, commands, mismatch


def pose(command, before, block):
    if block:
        coord, axis, sign = re.fullmatch(r'\((\d+,\d+,\d+)\) ([xyz])([+-])', command).groups()
        src = tuple(map(int, coord.split(',')))
        dst = list(src)
        dst['xyz'.index(axis)] += 1 if sign == '+' else -1
    else:
        coord, turn, length = re.fullmatch(r'(?:\((\d+,\d+)\) )?(\w+) (\d+)', command).groups()
        src = tuple(map(int, coord.split(','))) if coord else next(iter(before))
        heading = (HEADINGS.index(before[src][1]) + TURN[turn]) % 4
        dst = [a + b * int(length) for a, b in zip(src, OFFSETS[heading])]
    return src, tuple(dst)


def alternative(target, command, before, after, block):
    src, dst = pose(command, before, block)
    if target == 'moving-occupant' and dst in before and before != after:
        # Common wrong rule: treat an occupied target as blocking the command.
        yield before.copy(), f'treat occupied {dst} as blocking the exchange from {src}'
    if target == 'support-drop' and block:
        # Reconstruct the actual move immediately before settling; the domain
        # solver has already certified it legal and performed full gravity.
        unfallen = before.copy()
        moving = unfallen.pop(src)
        if dst in unfallen:
            unfallen[src] = unfallen[dst]
        unfallen[dst] = moving
        if unfallen != after:
            yield unfallen, f'leave displaced support column {src[:2]} unsettled after {command}'


def heading_witness(face, states, commands, goal):
    """Substitute the old heading specifically when another command consults it."""
    for step, command in enumerate(commands[:-1]):
        before, after = states[step:step+2]
        src, dst = pose(command, before, False)
        for pos, old in ((dst, before[src]), (src, before.get(dst))):
            if old is None or old[1] == after[pos][1]:
                continue
            for later in range(step+1, len(commands)):
                named, landing = pose(commands[later], states[later], False)
                if named == pos:
                    alt = states[later].copy()
                    alt[pos] = (alt[pos][0], old[1])
                    try:
                        advance(alt, commands[later], face['size'])
                        delta = altered_outcome(face, alt, goal, commands, later+1)
                    except ValueError as exc:
                        delta = dict(step=later+1, violation=str(exc))
                    if delta:
                        return dict(changedStep=step+1, reusedAt=later+1, cell=pos,
                                    formerHeading=old[1], displayedHeading=after[pos][1], counterfactual=delta)
                    break
                if landing == pos:
                    break
    return None


def altered_outcome(face, alt, goal, commands, changed_step):
    # Compare only the observations actually printed on the sheet.
    for k in range(changed_step, len(commands)+1):
        if k > changed_step:
            try:
                advance(alt, commands[k-1], face['size'])
            except ValueError as err:
                return dict(step=k, violation=str(err))
        expected = observations(face, goal, k, len(commands))
        if expected is not None:
            cells = differences(alt, expected)
            if cells:
                p = cells[0]
                return dict(step=k, cell=p, observed=alt.get(p), required=expected.get(p))
    return None


def motion(q):
    face, target = q['geometry'], q['target']
    block = q['taskType'] == 'BlockMoving'
    allowed = ('checkpoint', 'moving-occupant', 'state-replay', 'support-drop' if block else 'relative-heading')
    if target not in allowed:
        raise ValueError('Choose a mechanism available in this motion task: ' + ', '.join(allowed))
    solution = solve(face)
    i = solution['index']
    if q['index'] != i:
        return result(False, dict(computed='ABCD'[i]), 'Recompute the labeled answer from the printed choices.')
    records = [replay(face, n) for n in range(4)]
    # Prefer a completed legal foil over an illegal command when available.
    near = min((n for n in range(4) if n != i),
               key=lambda n: (any('violation' in x for x in records[n][3]), len(records[n][3])))
    states, goal, commands, _ = records[i]
    evidence = dict(answer='ABCD'[i], closestFoil='ABCD'[near], foilMismatch=records[near][3][0],
                    commands=commands, stepsReplayed=len(commands))
    if target == 'state-replay':
        evidence['foilWitnesses'] = {'ABCD'[n]: records[n][3][0] for n in range(4) if n != i}
        return result(True, evidence)
    if target == 'checkpoint':
        winners = ['ABCD'[n] for n, (s, end, ops, _) in enumerate(records) if len(s)==len(ops)+1 and s[-1]==end]
        evidence['matchesWithoutCheckpoint'] = winners
        if 'After step 1' in face['panels'] and len(winners) > 1:
            return result(True, evidence)
        return result(False, evidence, f'Using only the final panel yields {winners}. Keep the final board; provide another legal path ending there with a different board at step 1, and show the checkpoint.')
    if target == 'relative-heading':
        changed = heading_witness(face, states, commands, goal)
        if changed:
            return result(True, {**evidence, **changed})
    for step, command in enumerate(commands, 1):
        for alt, change in alternative(target, command, states[step-1], states[step], block):
            delta = altered_outcome(face, alt, goal, commands, step)
            if delta:
                evidence.update(changedStep=step, changedRule=change, counterfactual=delta)
                return result(True, evidence)
    repair = {
        'relative-heading':'At the next instruction address an arrow whose heading changed; preserve the initial layout and compare the two resulting destinations.',
        'moving-occupant':'Move onto an occupied cell, then reuse the exchanged arrow or color in a visible constraint.',
        'support-drop':'Withdraw support under a cube and expose its settled position in the next address or final view.'
    }[target]
    return result(False, evidence, f"Option {'ABCD'[i]} reaches the required observations without a decisive {target} event. Keep the panel axes and revise one of {commands}. {repair}")


if __name__ == '__main__':
    request = json.load(sys.stdin)
    try:
        report = paper(request) if request['taskType'] == 'PaperFolding' else motion(request)
    except (ValueError, KeyError, IndexError, TypeError) as error:
        report = result(False, {}, str(error))
    print(json.dumps(report))
