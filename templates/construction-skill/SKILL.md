---
name: harness-construction-template
description: Template for a domain construction package with shared recording, verification and publication.
---

# Construction package template

Replace this template with the domain's actual construction rules, references,
generator, renderer and verification adapter. Declare a completed package in
`skill.json` only after those artifacts and checks exist. Benchmark categories
describe the catalog; a skill may cover multiple reusable mechanism variants.

Before task-specific reads or construction, call the included bridge's `start`
with the exact task path, harness identity, skill directory and title. Record
reference delivery with `read`; record concise public goal, sources, change,
reason and expectedChecks with `note`. These notes are annotations, never private
internal reasoning. Preserve ordinary command arguments and exit behavior.

Use the same explicit run for revisions. Save immutable candidates, render,
verify, and record explicit visual reviews. A screenshot is not a visual review.
Use `resume` with the exact task and current session after interruptions. A sealed
run cannot reopen. Local unsaved edits, unwrapped commands and direct functions
are outside capture coverage and must not be described as automatically observed.

Finish with the exact delivered task, passing report and skill identity. The
bridge's `finish` seals the authoring interval and publishes the accepted task
to the authorized Spatial Harness Library repository and Pages site. Publication
is part of normal completion. Honor explicit `--local-only` or `--prepare-only`.
Return the task, skill and process URLs only with their actual deployment state.

The shared runtime preserves the caller's current model, reasoning settings and
client. Never launch another model to obtain usage. Missing usage stays unavailable
and does not invalidate independently established task correctness.
