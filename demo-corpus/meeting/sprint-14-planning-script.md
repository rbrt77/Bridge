# Sprint 14 planning · recording script (D5)

Fictional meeting of the Brightline **Invoicing** team, Monday **26 October 2026**, 10:00.
Read it out loud and record it (2:30–3:00). The recording goes to Track C for F3 (Meeting → My tasks).

## Cast

| Role | Who in Brightline | Read by |
|---|---|---|
| **Ana** | Engineering Manager, runs the meeting | ______ |
| **Radu** | Senior engineer (Hermes, DB) | ______ |
| **Ioana** | Senior engineer (Atlas, web) | ______ |
| **Andrei** | Junior backend engineer | ______ |
| *Maria* | Junior frontend engineer, deaf. She types in the meeting chat; **Ana reads her messages out loud.** | (no voice) |

Four voices, so diarization has four speakers. Maria's lines are spoken by Ana as "Maria writes: …".

## Generated recording (ready now)

`sprint-14-planning.m4a` (2:54) was generated with ElevenLabs Text to Dialogue (`eleven_v3`) so Track C can test F3 today.
Voices: Ana = Sarah, Radu = George, Ioana = Alice, Andrei = Liam (ElevenLabs default voices).
Checked with Scribe v2 (`diarize=true`): 4 speakers, every line attributed to the right person:
`speaker_0` = Ana (also reads Maria's chat messages), `speaker_1` = Radu, `speaker_2` = Andrei, `speaker_3` = Ioana.

A recording played by the team (below) sounds more authentic for the pitch; if you make one, save it under the same name.

## Recording tips

- One laptop in a quiet room, everyone within 1 m of the mic. Phone voice memo works too.
- Do not talk over each other. Leave half a second between lines.
- Say names exactly as written. Say "Hermes" and "Atlas" clearly.
- Export as `.m4a` or `.mp3`, under 25 MB, and save it as `demo-corpus/meeting/sprint-14-planning.m4a`.
- Two takes are fine. Keep the better one.

## Script

**Ana:** Good morning, everyone. This is sprint fourteen planning for the invoicing team. Maria is with us in the chat, and I'll read her messages out loud. We have three things today: the CSV export for finance, the Hermes retries, and the Atlas rate limits.

**Ana:** Let's start with the export. Finance asked for it in ticket one forty-two. They want to download invoices from the Invoices page as a CSV file.

**Radu:** We already stream the monthly order export in OrderExport. The invoice export should reuse that, not load everything into memory.

**Ana:** Agreed. Andrei, can you take the backend part of the CSV export? Please start from OrderExport.

**Andrei:** Yes, I'll take it. When do you need it?

**Ana:** Please have a pull request ready by Thursday, the twenty-ninth of October.

**Andrei:** Okay. One question: which date format do they want in the file? The issue doesn't say.

**Ana:** Good question. I don't know yet. I'll ask finance and come back to you by Wednesday.

**Ana:** Maria, can you take the Export button on the Invoices page? Only finance users should see it.

**Ana:** Maria writes: "Yes, I'll take it. Should support see the button too?"

**Ioana:** No. Only the finance role, and admin. You can use requireRole from the Atlas middleware as an example.

**Ana:** So we decide: the Export button is visible only for finance and admin. Maria, the button should be done by Wednesday, the twenty-eighth, so Andrei can test with it.

**Ana:** Maria writes: "Okay, Wednesday the twenty-eighth."

**Ana:** Next, Hermes. Radu, the retries.

**Radu:** The dunning jobs on Hermes retry too fast when the mailer is down. I want to change the backoff, but it touches the worker and the runbook. It's too big for this sprint.

**Ana:** Then we move the Hermes retries to sprint fifteen. Decision made.

**Ana:** Last one: Atlas rate limits. Ioana?

**Ioana:** The platform team asked if we need higher limits on Atlas for the export. We don't. Exports are small for now, and any change to Atlas routing has to go through the CAB anyway.

**Ana:** Then the Atlas rate limits stay as they are.

**Ana:** One more small task for Maria. Three images in our docs have no alt text: one in ARCHITECTURE and two in the setup guide. Maria, can you add alt text to those three images by Friday, the thirtieth?

**Ana:** Maria writes: "Sure, by Friday."

**Ana:** Andrei, please also fix issue one forty-six, the missing link in step twelve of the setup guide. It's small, so whenever you have time this sprint.

**Andrei:** Will do.

**Ana:** Great. To sum up: CSV export is our top priority, Hermes retries move to next sprint, Atlas rate limits stay as they are, and we demo on Friday at two. Thanks, everyone.

## Answer key for Track C (expected F3 output)

**Maria → My tasks**
| Task | Quote | Due |
|---|---|---|
| Export button on the Invoices page, finance + admin only (#142) | "Maria, can you take the Export button on the Invoices page?" | 2026-10-28 |
| Add alt text to the 3 images (ARCHITECTURE.md, docs/setup.md) | "Maria, can you add alt text to those three images by Friday, the thirtieth?" | 2026-10-30 |

**Andrei → My tasks**
| Task | Quote | Due |
|---|---|---|
| Backend for the invoice CSV export, reuse OrderExport (#142) | "Andrei, can you take the backend part of the CSV export?" | 2026-10-29 |
| Fix #146 (missing link in setup step 12) | "Andrei, please also fix issue one forty-six" | none (this sprint) |

**Decisions**
- Export button visible only for finance and admin (affects Maria).
- Hermes retries move to sprint 15.
- Atlas rate limits stay as they are.
- Demo on Friday at 14:00.

**Open question (not a decision):** CSV date format. Ana will ask finance and answer by Wednesday. This keeps the #142 "Unclear: date format" in the Ticket Decoder demo honest.

**Glossary terms:** Hermes, Atlas, CAB, OrderExport (code), dunning.

The transcript is never stored (PLAN F3): only the extracted tasks and decisions go into `meeting_notes`.
