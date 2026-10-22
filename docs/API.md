# API contract (client ↔ server)

> **Source of truth for parallel work.** Frontend (B) builds against these shapes using `MOCK=1`;
> backend (A, C) must return exactly these shapes. Changing a shape = PR that updates this file
> **and** the matching file in `server/src/mocks/`, announced in the team chat.

Base URL: `VITE_API_URL` (default `http://localhost:3001`). All routes under `/api`.
Auth: `Authorization: Bearer <supabase access token>` (ignored when `MOCK=1`).
Errors: `{ "error": { "code": "string", "message": "human readable" } }` with a proper HTTP status.

## SSE format (used by `/api/ask`, `/api/convert/*` streaming)

```
event: status   data: {"message":"Searching team docs…"}
event: token    data: {"text":"partial answer "}
event: sources  data: {"sources":[Source]}
event: enrich   data: {"tldr":"…","steps":["…"],"deadlines":[{"what":"…","date":"2026-10-30"}],"glossary_terms_used":["Hermes"]}
event: handoff  data: {"helper":{"id":"uuid","name":"Ana","role":"Engineering Manager"},"topic_owner":"Ana owns billing"|null,"draft":"…"}
event: done     data: {"answer_id":"uuid"}
event: error    data: {"code":"…","message":"…"}
```
`Source = { "id":"S1", "title":"Engineering Handbook", "section_path":"Process > DoD", "page":3|null, "url":"…"|null, "doc_type":"handbook|procedure|repo_doc|adr|faq|legal|code_map", "approved_by":"Ana"|null }`

## Profile (F1) — Track B
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/profile/parse` | `{ "text": "free text" }` | `{ "prefs": Prefs }` with `null` = not mentioned (text is NOT stored) |
| GET | `/api/profile` | – | `{ "prefs": Prefs \| null }` |
| PUT | `/api/profile` | `{ "prefs": Prefs }` | `{ "ok": true }` |
| DELETE | `/api/profile` | – | `{ "ok": true }` |

`Prefs = { preset:[...], display:{ textSize:"m|l|xl", contrast:"normal|high", font:"default|readable", spacing:"normal|wide", motion:"full|reduced" }, output:{ length:"short|normal|detailed", steps:bool, tldr:bool, audio:bool, literal:bool, screenReader:bool, diagrams:bool }, input:{ voice:bool } }`

## Ask + handoff (F5, F6) — Track A
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/ask` | `{ "question", "history":[{role,content}], "prefs":Prefs, "mode":"normal\|shorter\|simpler\|more\|steps", "answer_id"?: "reuse retrieval" }` | **SSE** (see above) |
| GET | `/api/glossary` | – | `{ "terms":[{ "term":"Hermes","definition":"…","source":Source }] }` |
| GET | `/api/glossary/:term` | – | one term |

## Help chat with manager (F5) — Track A (backend) / B (UI)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/help/threads` | `{ "question", "draft", "ticket_url"? }` | `{ "thread": Thread }` |
| GET | `/api/help/threads` | – | `{ "threads":[Thread] }` (mine + where I'm helper) |
| GET | `/api/help/threads/:id/messages` | – | `{ "messages":[Message] }` |
| POST | `/api/help/threads/:id/messages` | `{ "body" }` | `{ "message": Message }` |
| POST | `/api/help/threads/:id/publish-faq` | `{ "question","answer" }` | `{ "faq_id" }` (manager only) |
| POST | `/api/anon` | `{ "question" }` | `{ "claim_token" }` (keep in browser only) |
| GET | `/api/anon/:claim_token` | – | `{ "status":"open\|answered", "answer"?, "faq_id"? }` |
| GET | `/api/anon/queue` | – | `{ "questions":[{ "id","question","topic","week" }] }` (manager/admin; open, non-seed) |
| POST | `/api/anon/:id/answer` | `{ "answer", "question"? }` | `{ "faq_id" }` (manager/admin; becomes a Team FAQ, re-answer replaces it) |

Realtime: client subscribes to `help_messages` inserts filtered by `thread_id`. Fallback: poll every 2 s.

## Work (F2, F4, F10, F11) — Track C
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/tickets/decode` | `{ "issue_url"? , "text"? }` | `TicketDecoded` (see mocks/ticket.json) |
| POST | `/api/reviews/explain` | `{ "pr_url" }` | `ReviewExplained` (see mocks/review.json) |
| POST | `/api/setup/step` (SHOULD F10) | `{ "step_index", "error_text"? }` | `{ step:{index,total,title,text,command\|null,expect\|null,if_fails}, fix:null\|{found,issue\|null,why,fix,source:Source\|null} }`; steps come from docs/setup.md, fixes from docs/known-issues.md first (see mocks/setup.json) |
| POST | `/api/code-where` (SHOULD F11, Track A) | `{ "question" }` | `{ found, path\|null, symbol\|null, flow, adr:"ADR-007"\|null, owners:[{login,name}], url\|null, sources:[Source] }`: path is always an indexed file, symbol is from that file; `found:false` → path null and `flow` says so. Index is built by `ingest-repo` |
| POST | `/api/checklists` | `{ "title","source_url","items":[{text,minutes}] }` | `{ "checklist" }` |
| GET | `/api/checklists` | – | `{ "checklists":[...] }` |
| PATCH | `/api/checklists/:id/items/:itemId` | `{ "done": bool }` | `{ "ok":true }` |
| DELETE | `/api/checklists/:id` | – | `204` |
| GET | `/api/checklists/:id/ics` | `?start=ISO` (default: next full hour) | `text/calendar`: open steps as back-to-back blocks; items with `due` → all-day |

## Meetings (F3) — Track C
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/meetings/transcribe` | multipart `audio` (audio or video file: mp3, m4a, wav, mp4, mov, webm; ≤ 500 MB) + `me` (name) + `consent=true`; optional `speakers` (JSON `[{label,name}]`, manual fix), `meeting_date` (YYYY-MM-DD) and `note_id` (from `/live`, updates that row) | `MeetingResult` (see mocks/meeting.json) + `note_id`. Transcript NOT stored |
| POST | `/api/meetings/live` | `{ "text" (captions so far, "[mm:ss] …" lines), "me", "meeting_date"?, "note_id"? }` | `MeetingResult` without `speakers`, plus `note_id`. Upserts one `meeting_notes` row per meeting (no captions stored); pass the `note_id` back on the next call and on `/transcribe` at the end |
| POST | `/api/meetings/catch-up` | `{ "last_minutes_text" }` | `{ "summary" }` |

## Support (F7) — Track C + D
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/adjustments/needs` | – | `{ "needs":[{id,label}] }` |
| POST | `/api/adjustments/advise` | `{ "need_ids":[...] }` | `{ "adjustments":[...], "letter":"…", "disclaimer":"…" }` |

`Adjustment = { id, need_id, need_ids:[...], title, what, how_to_ask, cost, company_source|null, company_gap|null, sources:[string] }`. The response also has `to: { name, role } | null` (the manager). The letter never names a condition; nothing is stored. Send it with `POST /api/help/threads` only when the person clicks Send.

## Conversions (F8) — Track B (UI) + A (backend)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/convert/diagram` | `{ "text" , "kind":"flowchart\|sequence\|graph" }` | `{ "title","summary","mermaid","outline":[...] }` |
| POST | `/api/convert/describe-image` | `{ "image_url" }` | `{ "description" }` |
| POST | `/api/convert/simplify` | `{ "text","mode":"shorter\|steps\|plain" }` | `{ "text" }` |
| POST | `/api/voice/tts` | `{ "text","pace":"normal\|slow" }` | `audio/mpeg` |
| POST | `/api/voice/stt` | multipart `audio`; optional `prompt` (text said just before, for live captions) | `{ "text" }` |

## Company (F9, F13, ingest) — Track A + D
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/company/ingest` | multipart `files[]` | `{ "documents":[{id,title,chunks}] }` |
| POST | `/api/company/ingest-repo` | `{ "repo":"owner/name" }` | `{ "synced":n, "glossary_terms":n, "topic_owners":n, "code_files":n }` (docs + CODEOWNERS + code map for F11) |
| POST | `/api/company/audit` | `{ "repo" }` | `AuditResult` (see mocks/audit.json) |

`AuditResult = { repo, score:0-100, run_id?, findings:[Finding] (status partial|missing, sorted by priority desc), passed:[{id,title,evidence}], quick_wins:[string] }`
`Finding = { id, title, status:"partial|missing", mandatory, impact, effort, layer:"repo|docs", evidence, first_step, priority }`. `evidence` is a file/check result for `repo`, or `Doc > Section, p.N: "exact quote" · gap` for `docs`.
| GET | `/api/company/insights` (SHOULD F13) | – | `{ "k":5, "seeded":bool, "period":{from,to}\|null, "total_questions":n, "themes":[{topic,count,unanswered}], "hidden_topics":n, "gaps":[string] }`: only topics with ≥ k questions; hidden topics are counted, never named; gaps never quote a question |

## Standup (F12, SHOULD) — Track C
| POST | `/api/standup/draft` | `{ "voice_note_text"? }` | `{ "yesterday","today","blockers" }` |
| POST | `/api/standup/post-slack` | `{ "text" }` or `{ "yesterday","today","blockers" }` (formatted server-side) | `{ "ok":true }`; `503 slack_not_configured` when `SLACK_WEBHOOK_URL` is empty |
