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

Realtime: client subscribes to `help_messages` inserts filtered by `thread_id`. Fallback: poll every 2 s.

## Work (F2, F4, F10, F11) — Track C
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/tickets/decode` | `{ "issue_url"? , "text"? }` | `TicketDecoded` (see mocks/ticket.json) |
| POST | `/api/reviews/explain` | `{ "pr_url" }` | `ReviewExplained` (see mocks/review.json) |
| POST | `/api/setup/step` (SHOULD F10) | `{ "step_index", "error_text"? }` | `{ step, fix? }` |
| POST | `/api/code-where` (SHOULD F11) | `{ "question" }` | `{ path, symbol, flow, adr? , sources }` |
| POST | `/api/checklists` | `{ "title","source_url","items":[{text,minutes}] }` | `{ "checklist" }` |
| GET | `/api/checklists` | – | `{ "checklists":[...] }` |
| PATCH | `/api/checklists/:id/items/:itemId` | `{ "done": bool }` | `{ "ok":true }` |
| DELETE | `/api/checklists/:id` | – | `204` |
| GET | `/api/checklists/:id/ics` | `?start=ISO` (default: next full hour) | `text/calendar`: open steps as back-to-back blocks; items with `due` → all-day |

## Meetings (F3) — Track C
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/meetings/transcribe` | multipart `audio` + `me` (name) | `MeetingResult` (see mocks/meeting.json). Transcript NOT stored |
| POST | `/api/meetings/catch-up` | `{ "last_minutes_text" }` | `{ "summary" }` |

## Support (F7) — Track C + D
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/adjustments/needs` | – | `{ "needs":[{id,label}] }` |
| POST | `/api/adjustments/advise` | `{ "need_ids":[...] }` | `{ "adjustments":[...], "letter":"…", "disclaimer":"…" }` |

## Conversions (F8) — Track B (UI) + A (backend)
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/convert/diagram` | `{ "text" , "kind":"flowchart\|sequence\|graph" }` | `{ "title","summary","mermaid","outline":[...] }` |
| POST | `/api/convert/describe-image` | `{ "image_url" }` | `{ "description" }` |
| POST | `/api/convert/simplify` | `{ "text","mode":"shorter\|steps\|plain" }` | `{ "text" }` |
| POST | `/api/voice/tts` | `{ "text","pace":"normal\|slow" }` | `audio/mpeg` |
| POST | `/api/voice/stt` | multipart `audio` | `{ "text" }` |

## Company (F9, F13, ingest) — Track A + D
| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/company/ingest` | multipart `files[]` | `{ "documents":[{id,title,chunks}] }` |
| POST | `/api/company/ingest-repo` | `{ "repo":"owner/name" }` | `{ "synced":n, "glossary_terms":n, "topic_owners":n }` |
| POST | `/api/company/audit` | `{ "repo" }` | `AuditResult` (see mocks/audit.json) |

`AuditResult = { repo, score:0-100, run_id?, findings:[Finding] (status partial|missing, sorted by priority desc), passed:[{id,title,evidence}], quick_wins:[string] }`
`Finding = { id, title, status:"partial|missing", mandatory, impact, effort, layer:"repo|docs", evidence, first_step, priority }`. `evidence` is a file/check result for `repo`, or `Doc > Section, p.N: "exact quote" · gap` for `docs`.
| GET | `/api/company/insights` (SHOULD F13) | – | `{ "themes":[{topic,count}], "gaps":[...], "k":5 }` |

## Standup (F12, SHOULD) — Track C
| POST | `/api/standup/draft` | `{ "voice_note_text"? }` | `{ "yesterday","today","blockers" }` |
| POST | `/api/standup/post-slack` | `{ "text" }` | `{ "ok":true }` |
