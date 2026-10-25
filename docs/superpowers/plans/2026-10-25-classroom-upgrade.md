# Classroom lesson upgrade

Goal: improve Khaled's existing Arabic grammar presentation, preserve the instructor's video, and deliver a self-contained HTML plus maintainable GitHub sources.

Design: retain the cream, teal, and violet identity, strengthen cards and typography, use a scrollable lesson with reachable controls in portrait/landscape, and make the settings dialog one bounded flex layout. Use recorded Arabic narration embedded in the final HTML. Keep narration subtitles visible until dismissed; notices last 12 seconds by default and can be paused or dismissed. Never speak an answer before a student selects it.

Architecture: src/index.template.html, styles.css, core.js, storage.js, app.js; content/lesson.json; content/media.json; assets/video and audio; scripts/build.py produces both index.html and khaled-nahw-interactive.html with no runtime requests.

Review focus: small landscape and enlarged text; dialogs opened while fullscreen; no Arabic OS voice and no network; repeated answers and activity navigation; exporting/sharing retains embedded media and starts cleanly.

- [ ] Reproduce original bugs and add focused regression tests.
- [ ] Expand and review question bank and narration; acquire recordings in repository CI and download its artifact.
- [ ] Fix layout, audio routing/interaction, subtitles/notices, and sharing. Improve visual presentation.
- [ ] Build and run offline Chromium/WebKit flows, fullscreen/resizing, complete quiz/build, media decoding, export/reopen.
- [ ] Review final change, push maintainable sources and compiled HTML, return tested HTML.

Implementation decisions are authorized by the user's detailed request. Continue inline without intermediate approval gates. The repository is the source of truth; the existing Library item is the downloadable artifact identity.
