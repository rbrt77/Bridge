# Roluri și taskuri: OnRamp (4 oameni)

> Fiecare om are **fișierele lui** (marcate cu `// Owner: Track X` în cod), ca să nu vă călcați pe picioare la merge.
> Contractul dintre voi e în [`docs/API.md`](API.md), iar datele de test sunt în `server/src/mocks/*.json`.
> Cu `MOCK=1`, toată aplicația merge fără chei, deci frontend-ul **nu așteaptă** backend-ul.

| Track | Cine | Rol pe scurt |
|---|---|---|
| **A · RAG / backend core** | `______` | Baza de date, ingestie, căutare hibridă, Ask + handoff, glosar, audit, eval |
| **B · Frontend / accesibilitate** | `______` | Shell-ul aplicației, profilul (F1), UI-ul Ask + chat cu managerul, diagrame, a11y |
| **C · Funcții AI pe artefacte** | `______` | Ticket Decoder (F2), Code Review (F4), Meetings (F3), Adjustments (F7), voce |
| **D · Produs / corpus / pitch** | `______` | Repo-ul demo + documente + ședință + golden set + catalog audit + deck + video |

---

## Reguli de lucru (pentru toți)

1. **Branch per track:** `a/...`, `b/...`, `c/...`, `d/...` → PR mic în `main`, merge des (minimum o dată la 2 ore). Commit-uri mici: juriul se uită la istoric.
2. **Nu modifici fișierele altui track** fără să-i spui. Excepție: fișierele comune `lib/api.js`, `lib/sse.js`, `index.js`, unde anunți pe chat înainte.
3. **Schimbi un shape din API?** Atunci modifici în același PR `docs/API.md` + mock-ul din `server/src/mocks/`, și anunți.
4. **Prompturile** stau în `server/src/prompts/`, nu inline în servicii.
5. **Accesibilitatea nu e un pas de la final:** orice buton are text sau `aria-label`, orice input are `<label>`, iar statusurile trec prin `useAnnounce()`. `npm run lint` (jsx-a11y strict) trebuie să treacă înainte de PR.
6. **Ce nu stocăm niciodată:** diagnosticul, transcriptul ședinței, `user_id` la întrebările anonime, textul liber din profil.

## Start (toți, 10 minute)

```bash
npm install
cp .env.example .env     # MOCK=1 implicit
npm run dev              # server :3001 + client :5173
```

---

## Track A: RAG / backend core

**Fișierele tale:** `server/src/{index,env}.js`, `middleware/*`, `utils/*`, `services/{llm,embeddings,chunker,contextualize,retrieval,rerank,adapt,ingest,glossary,diagrams,privacy,audit,insights}.js`, `routes/{ask,help,anon,glossary,convert,company,code-where,health}.js`, `integrations/github.js` (partea de docs/tree/CODEOWNERS), `supabase/migrations/*`, `server/eval/run.js`.

| # | Task | Până la |
|---|---|---|
| A1 | Proiect Supabase (Frankfurt) + rulează `001–003` + pune cheile în `.env` și le dă echipei | 15:30 |
| A2 | **Deploy de probă:** server pe Render + client pe Vercel; verifică `/api/health/sse` din browser (CORS, SSE, cold start) | 16:30 |
| A3 | `auth.js`: verificare JWT Supabase + org + rol (portat din Internal_ai) | 17:00 |
| A4 | Ingestie: PDF/DOCX/MD → `chunkMarkdown` → embed → `documents`; `ingestRepo` din GitHub + CODEOWNERS → `topic_owners` | 18:00 |
| A5 | RPC `hybrid_search` (FTS + vector + RRF) + `rerank` (Cohere + fallback **testat**) | 18:30 |
| A6 | `answerQuestion`: mod strict, streaming, citări validate, `enrich`, **abstain → `handoff`** | **19:00 · M1** |
| A7 | F5 backend: `help` threads/messages + `publish-faq` (FAQ intră în RAG) + `anon` (fără user_id) + ping Slack fără text | 21:00 |
| A8 | F6 glosar la ingestie + expansiunea acronimelor în query | 22:00 |
| A9 | F8 backend: `textToDiagram`, `describeImage`, `simplify` (C le folosește și el) | 22:30 |
| A10 | Contextual Retrieval + `eval/run.js` (tabelul pentru pitch, cu golden set-ul de la D) | 23:30 |
| A11 | F9 audit (cu D): 6 verificări pe repo + 6 criterii LLM-judge | **24:00 · M2** |
| A12 | SHOULD: **F11** code-where → **F13** insights (k ≥ 5) | 05:00 |
| A13 | TTFT < 2 s, cache pentru întrebările din demo, deploy final | 08:00 |

**Depinzi de:** D (corpus până la 18:00, golden.json până la 19:00).
**Te așteaptă:** B (Ask real), C (`llm.js`, `retrieval`, `github.js`).
➡ **Primul lucru, în prima oră:** `services/llm.js` funcțional cu cheia reală, ca să-l poată folosi C.

---

## Track B: Frontend / accesibilitate

**Fișierele tale:** `client/src/{App,main}.jsx`, `styles.css`, `a11y/*`, `lib/{api,sse,supabaseClient}.js`, `components/{Layout,WorkTabs,SourceList,AdaptiveAnswer,HelpChat,Diagram,GlossaryTerm,Checklist}.jsx`, `pages/{Ask,WorkStyle,Today,Glossary}.jsx`, `routes/profile.js` + `services/profile.js`.

| # | Task | Până la |
|---|---|---|
| B1 | Design tokens (contrast ≥ 4.5:1, high-contrast 7:1), header/nav responsive la 320px, login cu magic link + SessionGuard | 17:00 |
| B2 | **F1 Work style:** wizard de 5 întrebări + quick starts → prefs + toate setările de afișare și output + Export/Delete + parsarea textului liber | **19:00 · M1** |
| B3 | Pagina Ask finisată pe API-ul real (e deja legată de SSE), istoric de conversație | 19:00 |
| B4 | **HelpChat** complet: Realtime (fallback polling 2 s), inbox pentru manager, butonul *Save to team docs*, opțiunea anonimă | 21:30 |
| B5 | UI-ul pentru F2 (Tickets): checklist, Unclear → *Ask my manager* (deschide HelpChat), *Show as diagram* | 22:30 |
| B6 | **Diagram (F8):** temă high-contrast, `<title>/<desc>`, download SVG, fallback pe outline | 23:30 |
| B7 | GlossaryTerm popover + pagina Glossary + Today (checklist-uri + sarcini din ședințe) | **24:00 · M2** |
| B8 | Prima trecere a11y: axe fără erori, Lighthouse ≥ 95, keyboard-only pe tot demo-ul | 03:00 |
| B9 | A doua trecere: VoiceOver/NVDA, zoom 200%, reflow 320px, `prefers-reduced-motion` | 07:00 |

**Depinzi de:** nimic la început (mock-uri); de A pentru Ask real și Realtime.
**Te așteaptă:** C (componentele comune `Checklist`, `Diagram`), D (screenshot-uri pentru deck).

---

## Track C: Funcții AI pe artefacte

**Fișierele tale:** `services/{tickets,reviews,meetings,adjustments,voice,standup,ics}.js`, `routes/{tickets,reviews,checklists,meetings,adjustments,voice,standup,setup}.js`, `integrations/{elevenlabs,slack}.js`, `github.js` (issues/PR), `prompts/{ticket,review,meeting,adjustments}.js`, `pages/{Tickets,Reviews,Meetings,Support,Setup}.jsx`, `components/{ReviewList,AudioButton,VoiceInput,Captions}.jsx`, `lib/{ics,speech}.js`.

| # | Task | Până la |
|---|---|---|
| C1 | **F2 backend:** issue GitHub + comentarii → imagini prin vision → RAG pe DoD/CONTRIBUTING + potrivire pe arborele repo → JSON ca `mocks/ticket.json` | **19:00 · M1** |
| C2 | `checklists` CRUD (din F2 → Today) + `.ics` | 20:00 |
| C3 | **F3:** ElevenLabs Scribe (diarizare) → maparea vorbitorilor → My tasks / decizii / rezumat (fără transcript în DB) + UI cu banner de consimțământ | 22:00 |
| C4 | **F4:** comentarii PR + reviews → clasificare required/optional/question după CONTRIBUTING → UI cu `ReviewList` + *Copy reply* | 23:00 |
| C5 | **F7 (cu D):** needs → adaptări din catalog + politică + lege → scrisoare editabilă (doar nevoi) | **24:00 · M2** |
| C6 | Voce peste tot: `AudioButton` + `VoiceInput` pe Ask/Tickets/Meetings + fallback TTS/STT pe server | 01:30 |
| C7 | SHOULD: **F12** standup + Slack → **F10** setup pas cu pas | 05:00 |
| C8 | Live captions + *What did I miss?* (doar dacă e timp) | 06:00 |

**Depinzi de:** A (`llm.js` în prima oră, `retrieve()` după M1; până atunci pui contextul hardcodat în prompt), D (issue #142 și PR #57 pe GitHub până la 18:00, înregistrarea până la 19:00).
**Te așteaptă:** B (shape-urile JSON trebuie să rămână ca în mock-uri).

---

## Track D: Produs / corpus / pitch

**Fișierele tale:** `demo-corpus/**`, `server/data/{dev_adjustments,audit_criteria.dev}.json`, `server/data/legal/*.md`, `server/eval/golden.json`, `supabase/seed/*`, `pages/AboutAi.jsx` (conținut), `README.md`, deck, video.

| # | Task | Până la |
|---|---|---|
| D1 | Repo GitHub public `invoicing-service`: ~20 de fișiere TS, README, ARCHITECTURE.md (cu PNG), ADR-007, CONTRIBUTING (`nit:`/`blocking:`), CODEOWNERS, `docs/setup.md` + `known-issues.md`, **golurile plantate** | 17:00 |
| D2 | Issue **#142** (ambiguu, cu screenshot) + 4–5 issue-uri + **PR #57** cu 6 comentarii de review | 18:00 |
| D3 | Documentele firmei: Engineering Handbook, Workplace Adjustments Policy (**incompletă**), Security training. Folosește Hermes/Atlas recurent | 18:00 |
| D4 | **golden.json** (25 + 5 întrebări) + catalogul de audit + `dev_adjustments.json` complet | **19:00 · M1** |
| D5 | Înregistrarea de sprint planning (2–3 min, jucată de echipă) → dată lui C | 19:00 |
| D6 | `legal/*.md` (6 rezumate) + seed: 12 întrebări anonime + userii demo (Andrei, Maria, Ana, admin) | 21:00 |
| D7 | Deck v1 + scriptul demo-ului de 3:00 (§12) | **24:00 · M2** |
| D8 | **Video de backup v1** (Plan B), imediat după M2 | 01:00 |
| D9 | Bug bash pe personas Andrei și Maria; conținutul `/about-ai` | 06:00 |
| D10 | Expo: 2–3 teste de utilizare + citate → deck | 10:00 |
| D11 | Video final, README cu livrabilele (inclusiv ce e adaptat din Internal_ai), 3 repetiții de pitch | 12:00 |

**Depinzi de:** nimic la început.
**Te așteaptă:** toată lumea. Corpusul e pe drumul critic, deci **D1–D3 sunt prioritatea absolută**.

---

## Puncte de sincronizare

| Oră | Ce |
|---|---|
| **16:30** | Deploy de probă merge (A) · corpusul e pe drum (D) |
| **19:00 · M1** | Ask cu citări + abstain pe URL-ul deployat · F1 schimbă UI-ul · F2 returnează JSON real |
| **24:00 · M2** | Toate funcțiile MUST v1 merg end-to-end, fără mock-uri → **video de backup** |
| **05:00** | Feature freeze pe SHOULD → doar a11y, bugfix-uri, performanță |
| **10:00** | Freeze total |

**Dacă rămânem în urmă:** tăiem din adâncime, nu din funcții. F1, F5, F2 și F3 nu se taie niciodată.
