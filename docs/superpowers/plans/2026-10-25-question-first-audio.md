# Question-first audio implementation plan

> Execute inline using superpowers:executing-plans. This continues the user-authorized classroom upgrade; no intermediate design approval is needed.

**Goal:** Read each new question automatically, then let Khaled choose whether to hear the answer after selecting an option. Keep the complete lesson usable on a phone in portrait, landscape, fullscreen, and enlarged text.

**Architecture:** Preserve the existing vanilla JavaScript/CSS sources, 30 reviewed questions, 81 embedded Arabic recordings, and original instructor video. Build the self-contained HTML from these sources. GitHub is authoritative; keep all remote changes atomic against the current main commit.

**Constraints:** Arabic RTL; Samsung S24 Ultra and iPhone 16 Pro Max layouts; no runtime network dependency; no automatic answer narration; one locked first answer; persistent explanations; explicit replay and mute controls; readable, reachable settings and share fallback.

## Tasks

- [x] 1. Reproduce voice behavior and cramped landscape layout. Add browser regressions for automatic questions, optional answers, rapid navigation/muting, the timer, and the visible download fallback. Confirm failures before changes.
- [x] 2. Separate question narration, lesson narration, and short feedback effects. Persist independent question/effect preferences. Automatically read unanswered questions on start/next/retry, stop playback on answer or navigation, and speak explanations only from an explicit button. Route the bottom navigation through the active quiz.
- [x] 3. Improve the presentation copy, clear answer card, progress steps, discussion prompt, and small landscape layout. Leave spoken transcripts unchanged where recordings already exist. Keep subtitles available until closed. Repair timer cleanup and share/download placement.
- [ ] 4. Build and run the complete content/offline and Chromium/WebKit suites. Inspect rendered phone and desktop views, decode all recordings and video, complete the quiz and sentence activity, and reopen an exported HTML.
- [ ] 5. Review the final change, fix material findings, push source and compiled HTML to GitHub, verify the updated branch, and return the downloadable HTML.

## Review focus

- A question is answered while its recording is playing: the recording must stop, with no spoken answer until requested.
- A previously answered question is revisited: retain its result without automatically replaying the solution.
- Global mute, disabled automatic narration, and unavailable OS Arabic voices: embedded manual playback remains predictable.
- Small landscape with both docks, enlarged text, fullscreen settings: preserve a usable scrollable stage and reachable actions.
- Export/share from the main lesson: the fallback link stays in the visible stage and the reopened file retains every embedded asset.

## Decisions and evidence

- Recovered the current main workflow artifact to retain all 81 recordings and the instructor video; the repository HTML alone contained fewer recordings because the previous session stopped before delivery.
- Baseline content/offline suite: 8 passing. Prior browser results identify a 34px stage at 667x320, a timer cleanup bug, an invisible download fallback, and a test that incorrectly tries to click an aria-disabled answer.

- Source review found two delivery issues (320px zen footer and rejected native sharing). Both were reproduced by new browser checks and fixed. Existing embedded recordings are now preserved byte for byte, proved by a failing-then-passing media rebuild test.
