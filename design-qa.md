# Design QA — OpenSpec Pipeline workspace

## Evidence

- Visual target: `C:\Users\Ale\.codex\generated_images\019fa5e3-7e59-7361-b45a-9034f9bae3d5\exec-5a3ed7a1-75b0-40b5-83ba-155b4fd521fc.png` (1512 × 1040, 1,380,992 bytes).
- Final implementation capture: `C:\Users\Ale\AppData\Local\Temp\gitcron-openspec-pipeline-actual-final.png` (1488 × 979, 117,637 bytes).
- Browser viewport: 1488 × 1024. The capture excludes the in-app browser chrome.
- State: development-only `running` fixture, active change `add-dark-mode`, both side panels open.
- Clean-console confirmation: fresh 1280 px tab at `/?pipelineFixture=running`, with the Pipeline route opened after load.
- The target and final capture were inspected together at original resolution. A separate crop was unnecessary: the complete three-column workspace remained legible, and text/control behavior was also checked against the live DOM.

## Comparison

- Information architecture: passed. Summary, OpenSpec changes/specifications, active change lifecycle, work/activity tabs, current task, evidence strip and independent activity rail match the approved composition.
- Hierarchy and density: passed. The left navigator is wider than the activity rail; the work area owns the remaining width. Secondary labels use smaller type without displacing primary task and change labels.
- Shell boundary: passed. Only Pipeline content changed. The GitCron topbar, navigation labels and existing sidebar icons remain the application shell.
- Responsive desktop behavior: passed. The dashboard measures its own container, has no hard three-track minimum and reported zero horizontal overflow at 1488 and 1150 px. The right rail becomes an opaque overlay at the medium tier; the navigator does the same at the narrow tier.
- Sidebar controls: passed. The existing topbar buttons independently set `data-left-open` and `data-right-open`; both closed and reopened correctly. Both rails expose vertical resize separators.
- Interaction: passed. Work/Activity switching, change/archive selection, Continue, evidence toggle and no-active/new-change states were exercised. In a browser without Electron IPC the launcher reports that no runtime is available instead of pretending to start work.
- Motion and accessibility: passed. State transitions are short and scoped; semantic tabs, buttons, ordered task/lifecycle lists and resize separators remain keyboard/screen-reader discoverable.
- Activity truthfulness: passed. Development data is labelled `Datos de vista previa`; production has an honest `Sin sesión` state and a session selector only when persisted executions exist.
- Console: passed. No browser warnings or errors in the fresh-tab verification; only the informational React DevTools development message was present.

## Findings and fixes

- P2 fixed — the medium-width activity overlay initially allowed underlying center text to show through. It now uses an opaque surface and stronger separation shadow.
- P2 fixed — legacy LCARS panels and control surfaces remained in the production tree after the replacement. Components with no production consumer were removed; runtime, activity, decision and evidence primitives that still power the new screen were retained.
- P3 accepted — the target contains richer invented per-task file/diff detail. Production only renders evidence GitCron actually observes; it does not manufacture filenames, token counts or completion states.
- P2 fixed — activity previously represented only the current in-memory projection. Runtime sessions now persist in SQLite, retain their final outcome and can be selected independently after restart.

final result: passed
