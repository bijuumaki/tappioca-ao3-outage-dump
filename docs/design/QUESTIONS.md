# QUESTIONS: shared mailbox between Terminal Claude Code and Claude Design

Analogy: the repo is a shared mailbox. Terminal (builds the code) and Design (draws the canvas) never talk directly; they leave notes here. Bijuu only has to say "check the questions file" to either side.

## How it works

```
Terminal hits a gap while building
  -> writes it under "Open" (Q-number, date, what the canvas doesn't say)
  -> Bijuu tells Design: "answer the open questions"
  -> Design answers on the canvas, then writes the answer under that question
  -> Bijuu tells Terminal: "check the questions file"
  -> Terminal builds from the answer and moves the item to "Answered"
```

Rules:
- One question = one entry, numbered Q1, Q2, ... never renumbered.
- Entry format: `Q#: question` / `From:` (terminal, design or Bijuu) / `Asked:` date / `Status:` open or answered / `Answer:` (who, date, what).
- Bijuu's own decision beats both sides; the canvas beats the docs. If an answer changes the design, Design updates the canvas and DESIGN.md/HANDOFF.md too.
- Never invent fic details. Answers needing her text stay open until she supplies it.
- When answered and built, Terminal moves the entry to "Answered" with the commit message.

## Open

### Q1: Comment moderation
From: Design (HANDOFF section 6) · Asked: 2026-11-03 · Status: open
Comments is designed approve-first (and built that way). Confirm, or change to show immediately / report-only.
Answer:

### Q2: Hearts limit
From: Design · Asked: 2026-11-03 · Status: open
Per-browser is built (`fic-site-hearted`). Should one reader be limited to one heart per story across browsers (would need accounts or light protection), or is per-browser enough?
Answer:

### Q3: What should Contents do?
From: Design · Asked: 2026-11-03 · Status: open
Built today: scrolls to the top and focuses the Jump to chapter dropdown. Keep, open a chapter list, or go to the story page?
Answer:

### Q4: Admin Aa and Close
From: Design · Asked: 2026-11-03 · Status: open
Should Aa in Admin, Stories, Comments and Uploads match the reader's plain 10pt Aa, and should the word "Close" become an X like the reader?
Answer:

### Q5: Comment form Post button
From: Design · Asked: 2026-11-03 · Status: open
Does Post stay a box? (The bottom chapter row became links; Post was left alone.)
Answer:

### Q6: Anam Cara and MORIBUND status in the dashboard demo
From: Design · Asked: 2026-11-03 · Status: open
Do they stay marked "Published" in the demo? (Demo data only; real status comes from the database.)
Answer:

### Q7: Lagoon theme name
From: Design · Asked: 2026-11-03 · Status: open
"Lagoon" is a working name. Keep or rename?
Answer:

### Q8: Content notice wording
From: Design · Asked: 2026-11-03 · Status: open
Wording of the Mature/Explicit notice, and whether to ask readers to confirm they are adults.
Answer:

### Q9: Old paper texture
From: Design · Asked: 2026-11-03 · Status: open
Bring it back? (Not in the new canvas; currently gone.)
Answer:

### Q10: Day muted text on teal bars
From: Design · Asked: 2026-11-03 · Status: open
Measured 3.6:1 in an earlier audit, no instance found. Terminal to recheck once built, then report here.
Answer:

## Answered

(none yet)
