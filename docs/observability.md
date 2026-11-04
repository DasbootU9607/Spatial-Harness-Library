# Automatic construction records and publication

Use Node 20+ and Python 3 for the existing Maze tools. Clone this repository, then
install a completed package with the command shown on its exhibition page:

```text
node tools/install.cjs --harness spatialviz-harness --destination YOUR_SKILLS_DIRECTORY
```

Keep the checkout available: a private installation binding points to its shared
runtime. Installation refuses to overwrite existing packages. Existing Maze users
can update only the observer integration with
`maze-harness/scripts/install-authoring-observer.cjs`, using a fresh backup folder
and this checkout's `maze-harness/tools/authoring-observatory` runtime.

Invoke an installed construction skill normally. Its bridge starts the recorder
before reference reads, saves versions, records commands and tests, seals the run,
and invokes publication. No model call, model switch or delegation is introduced.
The owner authorizes routine publication to this repository and its Pages site;
explicit local-only and prepare-only instructions take precedence.

## Shared interfaces

`tools/construct.cjs` supplies start, resume, read, note, generate, save, render,
verify, exec, review and finish. Every command after start takes the returned
`--run` directory. Every independent task creates a new run. Revisions retain the
same run; resume requires its exact task and client-session identity. Sealed runs
cannot accept further events. An interrupted run stays visibly unfinished.

`tools/observatory/runtime.cjs` is the programmatic interface. It uses the same
journal, lock and passive collector as the existing Maze adapters; their canonical
implementation remains in `maze-harness/tools/authoring-observatory/lib` for
compatibility with distributed packages. This is one recorder, not an independently
forked recorder for each harness. The Maze CLI retains its mature domain-specific
capture and publication adapters. New harnesses supply a representation,
renderer and verifier adapter plus harness configuration and completed skill
metadata. The demonstration adapter is intentionally restricted to discrete
quarter-turn questions and is not a general SpatialViz verifier.

Private evidence lives under `.harness/runs/<id>/`: manifest, append-only events,
index, usage-session, token-usage JSON/Markdown, candidates, commands and artifacts.
Candidate bytes and reports are immutable. A report must be fresh, passed and bound
to the exact candidate fingerprints; a zero process exit is insufficient. An old
report is archived before the next invocation. A changed delivered task, changed
report or changed preview fails the publication audit.

The read-only loopback viewer starts or is reused automatically. Its address is
in `.harness/runs/viewer.json`. It uses the same process component as the public
site and exposes an allowlisted projection, not raw transcripts or command logs.
For existing Maze runs, the established local viewer retains its domain player.

## Capture and usage coverage

Automatic capture applies to the supplied CLI boundaries and runtime calls.
Direct imported functions, unwrapped commands and unsaved editor changes are
outside coverage. A delivered reference range is one read, not proof of
comprehension. A design annotation is an explicit public note. A verification is
one execution containing individual checks. A screenshot and explicit visual
review are separate events. Browser attempts retain their own candidate/input
binding. No private internal reasoning is requested or reconstructed.

Codex Desktop/CLI is verified against the exact current rollout's session metadata
and cumulative token records. The collector subtracts a start baseline, refreshes
at operation boundaries and seals at finish. Provider, model and reasoning effort
come from runtime metadata. Repeated request snapshots, resets, missing fields,
identity conflicts and truncated logs are covered by protocol tests. Claude Code
and Gemini adapters retain their existing hook contracts and synthetic protocol
tests; this implementation did not make live model requests through those clients.
Closed clients without accessible usage remain unavailable.

Other clients may provide newline-terminated normalized JSON records with `type:
"usage"`, `sessionId`, stable `requestId`, `timestamp`, `model`, `provider`, optional
`reasoningEffort`, and `usage`. Bind explicitly with `MAZEBENCH_USAGE_LOG`,
`MAZEBENCH_SESSION_ID` and `MAZEBENCH_USAGE_RUNTIME=usage-jsonl`. These legacy
environment names are shared compatibility interfaces. Token fields are
input_tokens, cached_input_tokens, cache_write_input_tokens, output_tokens,
reasoning_output_tokens and total_tokens. Missing values are null; zero needs an
actual measurement. Cached input and reasoning output are subsets where reported
as such; provider totals are preserved. Never estimate from text, files or time.

All passive reports have `scopeComplete=false`. Measured values live in
`observedTokens`; complete-task `tokens` remain null. Earlier conversation, other
agents, delayed reports and the in-flight final response are excluded. Wall time
includes tools and waiting. It is not inference time. The published smoke interval
also includes interleaved infrastructure validation in the same client, disclosed
as partial coverage. No stage-exclusive or complete billed-task total is claimed.
OpenAI's [usage documentation](https://developers.openai.com/api/docs/guides/agents-api/observability)
also distinguishes best-effort observations from final billing. Local Codex
rollout support is grounded in the inspected runtime schema, not the Agents API.

## Publication and recovery

```text
node tools/publish.cjs --run RUN --task TASK.json --skill SKILL_DIRECTORY --prepare-only
node tools/publish.cjs --run RUN --task TASK.json --skill SKILL_DIRECTORY
```

Preparation requires a sealed accepted run and matching delivered task. It audits
the journal, report and input fingerprints, exports allowlisted public evidence,
renders missing version previews, and registers immutable content identities.
Repeated preparation of the same accepted task returns the existing case. One
recorded interval contributes usage once even when it produced several tasks.
Intermediate versions remain inside their process history. Ephemeral practice
rounds are never registered. Missing token usage does not block correct evidence.

Public data excludes session IDs, private transcript data, absolute source paths,
unrestricted command arguments and logs. Public notes are intentionally authored
fields; authors must not put private information in public notes or task payloads.
Hashes of private evidence establish consistency, not public access to its bytes.
The audit is not cryptographic authentication against a malicious local rewriter.

The publisher checks the expected remote, synchronizes with origin/main, validates,
commits intended paths and pushes without force. It preserves unrelated working
files and staged work. Preparation, push and deployment are separate states.
Delivery receipts stay outside the sealed authoring run in `.harness/deliveries`.
When origin/main advances, the publisher uses a separate checkout and merges
case registrations by immutable identity without dropping upstream records.
Overlapping non-catalog changes or authentication failures retain prepared
artifacts and return a concrete blocker; resolve that conflict and restart. Deployment observation is bounded and tied to the commit.

## Presentation and checks

`catalog/harnesses.json` supplies identity, navigation and capabilities. Completed
`skill.json` packages and case records drive one exhibition system in `shared/`.
The Pages assembler generates all four home/skill entrypoints and retains original
question URLs, Maze gameplay, historical process routes and source assets. Fonts
are served locally with the existing Geist license. Shared assets are versioned by
content. The official collections remain 1,180 SpatialViz questions, 388 BabyVision
visual questions and 280 image tasks. Generated spatialbench practice remains
separate from its official leaderboard set.

```text
node --test tools/observatory/tests/*.test.cjs
node --test maze-harness/tools/authoring-observatory/tests/*.test.cjs
node tools/check.cjs
node .github/scripts/build-pages.cjs .harness/preview/Spatial-Harness-Library
node tools/browser-check.cjs --root .harness/preview
```

The browser checker uses installed Playwright (or the existing engine's
playwright-core locally), headless Chrome on Windows and Playwright Chromium in
CI. It checks desktop/mobile layouts, the real repository subpath, navigation,
official filters and answers, practice modes, skill associations, authored tasks,
process versions and downloads. It is not a complete WCAG certification.
