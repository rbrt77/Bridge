# Track-uri detaliate: OnRamp

Document complementar la [`ROLES.md`](ROLES.md). Aici e pentru fiecare track: ce construiește, fișierele exacte, endpoint-urile, cum testezi local și cum arată „gata".
Contractul dintre track-uri e în [`API.md`](API.md). Datele de test sunt în `server/src/mocks/*.json`.

## Cum se leagă track-urile

```
D (corpus, golden set) ──► A (ingestie, RAG, Ask) ──► B (UI Ask, HelpChat)
                              │
                              └─► C (folosește llm.js, retrieval, github.js)
B ◄── C (componentele comune Checklist, Diagram; shape-urile JSON din mocks)
```

- Cu `MOCK=1` nimeni nu așteaptă pe nimeni: fiecare lucrează pe mock-uri.
- **Pe drumul critic:** A scoate `services/llm.js` funcțional în prima oră, iar D scoate corpusul (D1–D3) cât mai repede.

## Reguli comune

1. Un branch per track (`a/...`, `b/...`, `c/...`, `d/...`), PR mici în `main`, merge la maximum 2 ore.
2. Nu editezi fișierele altui track fără să anunți. Fișierele comune (`lib/api.js`, `lib/sse.js`, `server/src/index.js`) se modifică doar după anunț în chat.
3. Schimbi un shape de API: același PR actualizează `docs/API.md` și mock-ul din `server/src/mocks/`.
4. Prompturile stau în `server/src/prompts/`, nu inline.
5. Accesibilitate de la început: buton cu text sau `aria-label`, input cu `<label>`, statusuri prin `useAnnounce()`. `npm run lint` trebuie să treacă înainte de PR.
6. Nu stocăm niciodată: diagnosticul, transcriptul ședinței, `user_id` la întrebările anonime, textul liber din profil.

---

## Track A: RAG / backend core

**Misiune:** să existe un backend care răspunde la întrebări doar pe baza documentelor firmei, cu citări, și care spune „nu știu" și predă la un om când nu are sursă.

### Fișiere
| Zonă | Fișiere |
|---|---|
| Server | `server/src/index.js`, `env.js` |
| Middleware / utils | `middleware/auth.js`, `middleware/errors.js`, `utils/{logger,mock,sse,supabase}.js` |
| Servicii | `services/{llm,embeddings,chunker,contextualize,retrieval,rerank,adapt,ingest,glossary,diagrams,privacy,audit,insights}.js` |
| Rute | `routes/{ask,help,anon,glossary,convert,company,code-where,health}.js` |
| Integrări | `integrations/github.js` (doar docs, tree, CODEOWNERS) |
| Prompturi | `prompts/{ask,diagram,audit}.js` |
| Date | `supabase/migrations/001–003`, `server/eval/run.js` |

### Endpoint-uri
`POST /api/ask` (SSE), `GET /api/glossary[/:term]`, `/api/help/threads*`, `POST /api/anon`, `GET /api/anon/:claim_token`, `/api/convert/{diagram,describe-image,simplify}`, `/api/company/{ingest,ingest-repo,audit,insights}`, `POST /api/code-where`, `/api/health/sse`.

### Task-uri în ordine
1. **A1:** proiect Supabase (Frankfurt), rulezi migrațiile `001–003`, pui cheile în `.env` și le dai echipei.
2. **`llm.js` funcțional** cu cheia reală, în prima oră (C depinde de el).
3. **A2:** deploy de probă (Render pentru server, Vercel pentru client). Verifici `/api/health/sse` din browser: CORS, SSE, cold start.
4. **A3:** `auth.js`, verificare JWT Supabase + org + rol.
5. **A4:** ingestie PDF/DOCX/MD → `chunkMarkdown` → embed → `documents`. `ingestRepo` din GitHub + CODEOWNERS → `topic_owners`.
6. **A5:** RPC `hybrid_search` (FTS + vector + RRF) și `rerank` (Cohere, cu fallback testat).
7. **A6 (M1):** `answerQuestion` în mod strict, cu streaming, citări validate, `enrich`, abstain → `handoff`.
8. **A7:** F5 backend: threads/messages, `publish-faq` (FAQ-ul intră în RAG), `anon` fără `user_id`, ping Slack fără text.
9. **A8:** glosar la ingestie + expansiunea acronimelor în query.
10. **A9:** `textToDiagram`, `describeImage`, `simplify` (le folosește și C).
11. **A10:** Contextual Retrieval + `eval/run.js` (tabelul pentru pitch, pe golden set-ul de la D).
12. **A11 (M2):** F9 audit, 6 verificări pe repo + 6 criterii LLM-judge (împreună cu D).
13. **A12 (SHOULD):** F11 code-where, apoi F13 insights (k ≥ 5).
14. **A13:** TTFT < 2 s, cache pentru întrebările din demo, deploy final.

### Cum testezi
```bash
npm run dev -w server
curl -N -X POST localhost:3001/api/ask -H 'content-type: application/json' \
  -d '{"question":"Ce este Hermes?","history":[],"prefs":null,"mode":"normal"}'
npm run eval -w server        # rulează golden set-ul
```

### Gata când
- Ask returnează citări valide pe URL-ul deployat și face abstain cu handoff când nu are sursă.
- Întrebările anonime nu lasă `user_id` în DB.
- `eval` produce tabelul cu rezultate.

**Depinzi de:** D (corpus la 18:00, golden.json la 19:00). **Te așteaptă:** B (Ask real), C (`llm.js`, `retrieve()`, `github.js`).

---

## Track B: Frontend / accesibilitate

**Misiune:** interfața pe care o folosește efectiv un dev cu dizabilități. Fiecare setare din profil (text, contrast, font, mișcare, lungime răspuns) se vede imediat în toată aplicația.

### Fișiere
| Zonă | Fișiere |
|---|---|
| Aplicație | `client/src/{App,main}.jsx`, `styles.css` |
| Accesibilitate | `a11y/{Announcer,ProfileProvider}.jsx`, `a11y/useShortcuts.js` |
| Lib | `lib/{api,sse,supabaseClient}.js` |
| Componente | `components/{Layout,WorkTabs,SourceList,AdaptiveAnswer,HelpChat,Diagram,GlossaryTerm,Checklist,Todo}.jsx` |
| Pagini | `pages/{Ask,WorkStyle,Today,Glossary,AboutAi,Insights,Company}.jsx` |
| Backend profil | `routes/profile.js`, `services/profile.js`, `prompts/profile.js` |

### Task-uri în ordine
1. **B1:** design tokens (contrast ≥ 4.5:1, high-contrast 7:1), header/nav responsive la 320px, login cu magic link + `SessionGuard`.
2. **B2 (M1):** **F1 Work style:** wizard de 5 întrebări + quick starts → `prefs`, toate setările de afișare și output, Export/Delete, parsarea textului liber (`POST /api/profile/parse`, fără stocare).
3. **B3:** pagina Ask pe API-ul real (SSE deja legat), istoric de conversație.
4. **B4:** **HelpChat** complet: Realtime pe `help_messages` (fallback polling la 2 s), inbox pentru manager, *Save to team docs*, opțiunea anonimă.
5. **B5:** UI pentru F2 (Tickets): checklist, Unclear → *Ask my manager* (deschide HelpChat), *Show as diagram*.
6. **B6:** **Diagram (F8):** temă high-contrast, `<title>/<desc>`, download SVG, fallback pe outline.
7. **B7 (M2):** `GlossaryTerm` popover, pagina Glossary, Today (checklist-uri + sarcini din ședințe).
8. **B8:** prima trecere a11y: axe fără erori, Lighthouse ≥ 95, keyboard-only pe tot demo-ul.
9. **B9:** a doua trecere: VoiceOver/NVDA, zoom 200%, reflow 320px, `prefers-reduced-motion`.

### Cum testezi
```bash
npm run dev            # deschizi http://localhost:5173
npm run lint -w client # jsx-a11y strict, trebuie să treacă
```
Navighezi doar cu tastatura (Tab, Enter, Esc) și cu zoom 200%.

### Gata când
- Se poate parcurge tot demo-ul doar cu tastatura.
- axe nu raportează erori, Lighthouse ≥ 95.
- Schimbarea unei setări din profil se vede imediat peste tot.

**Depinzi de:** nimic la început (mock-uri); de A pentru Ask real și Realtime. **Te așteaptă:** C (`Checklist`, `Diagram`), D (screenshot-uri pentru deck).

---

## Track C: Funcții AI pe artefacte

**Misiune:** transformă lucrurile cu care se luptă un junior (issue-uri ambigue, PR-uri cu feedback, ședințe, adaptări la locul de muncă) în pași clari.

### Fișiere
| Zonă | Fișiere |
|---|---|
| Servicii | `services/{tickets,reviews,meetings,adjustments,voice,standup,ics}.js` |
| Rute | `routes/{tickets,reviews,checklists,meetings,adjustments,voice,standup,setup}.js` |
| Integrări | `integrations/{elevenlabs,slack}.js`, `github.js` (issues/PR) |
| Prompturi | `prompts/{ticket,review,meeting,adjustments}.js` |
| Client | `pages/{Tickets,Reviews,Meetings,Support,Setup}.jsx`, `components/{ReviewList,AudioButton,VoiceInput,Captions}.jsx`, `lib/{ics,speech}.js` |

### Endpoint-uri
`POST /api/tickets/decode`, `POST /api/reviews/explain`, `/api/checklists*`, `POST /api/meetings/transcribe`, `POST /api/meetings/catch-up`, `/api/adjustments/{needs,advise}`, `/api/voice/{tts,stt}`, `/api/standup/*`, `POST /api/setup/step`.

### Task-uri în ordine
1. **C1 (M1):** **F2 backend:** issue GitHub + comentarii → imagini prin vision → RAG pe DoD/CONTRIBUTING + potrivire pe arborele repo → JSON identic cu `mocks/ticket.json`. Până apare `retrieve()` de la A, pui contextul hardcodat în prompt.
2. **C2:** `checklists` CRUD (din F2 spre Today) + `.ics`.
3. **C3:** **F3:** ElevenLabs Scribe (diarizare) → maparea vorbitorilor → My tasks / decizii / rezumat. Transcriptul nu intră în DB. UI cu banner de consimțământ.
4. **C4:** **F4:** comentarii PR + reviews → clasificare required/optional/question după CONTRIBUTING (`nit:` / `blocking:`) → `ReviewList` + *Copy reply*.
5. **C5 (M2):** **F7 (cu D):** needs → adaptări din catalog + politică + lege → scrisoare editabilă (doar nevoi, fără diagnostic).
6. **C6:** voce peste tot: `AudioButton` + `VoiceInput` pe Ask/Tickets/Meetings + fallback TTS/STT pe server.
7. **C7 (SHOULD):** **F12** standup + Slack, apoi **F10** setup pas cu pas.
8. **C8:** live captions + *What did I miss?* (doar dacă rămâne timp).

### Cum testezi
Cu `MOCK=1` primești JSON-ul din `server/src/mocks/`. Cu `MOCK=0` și cheile reale:
```bash
curl -X POST localhost:3001/api/tickets/decode -H 'content-type: application/json' \
  -d '{"issue_url":"https://github.com/<org>/invoicing-service/issues/142"}'
```
Răspunsul trebuie să aibă exact aceleași câmpuri ca `mocks/ticket.json`, altfel UI-ul lui B se strică.

### Gata când
- Issue #142 produce un checklist cu pașii, estimări și o secțiune „Unclear".
- Înregistrarea de sprint planning produce My tasks corecte pentru persoana aleasă.
- Niciun transcript și nicio descriere de diagnostic nu ajunge în DB.

**Depinzi de:** A (`llm.js` în prima oră, `retrieve()` după M1), D (issue #142 și PR #57 pe GitHub la 18:00, înregistrarea la 19:00). **Te așteaptă:** B (shape-urile JSON rămân ca în mock-uri).

---

## Track D: Produs / corpus / pitch

**Misiune:** tot ce face demo-ul credibil: compania fictivă Brightline Software, repo-ul demo, documentele, golden set-ul, deck-ul și video-ul. Fără corpusul tău, A și C nu au ce testa, deci **D1–D3 sunt prioritatea absolută**.

### Fișiere
| Zonă | Fișiere |
|---|---|
| Corpus | `demo-corpus/**` |
| Date | `server/data/{dev_adjustments,audit_criteria.dev}.json`, `server/data/legal/*.md` |
| Eval | `server/eval/golden.json` |
| Seed | `supabase/seed/*` |
| Conținut | `pages/AboutAi.jsx` (textul), `README.md`, deck, video |

### Task-uri în ordine
1. **D1:** repo GitHub public `invoicing-service`: ~20 de fișiere TS, README, `ARCHITECTURE.md` (cu PNG), ADR-007, CONTRIBUTING, CODEOWNERS, `docs/setup.md`, `known-issues.md` și **golurile plantate** (lucruri lipsă intenționat, ca să demonstrezi abstain).
2. **D2:** issue **#142** (ambiguu, cu screenshot), încă 4–5 issue-uri și **PR #57** cu 6 comentarii de review.
3. **D3:** documentele firmei: Engineering Handbook, Workplace Adjustments Policy (**incompletă intenționat**), Security training. Folosește Hermes/Atlas recurent, pentru glosar.
4. **D4 (M1):** **golden.json** (25 întrebări + 5 fără răspuns), catalogul de audit și `dev_adjustments.json` complet.
5. **D5:** înregistrarea de sprint planning (2–3 min, jucată de echipă), dată lui C.
6. **D6:** `legal/*.md` (6 rezumate) + seed: 12 întrebări anonime și userii demo (Andrei, Maria, Ana, admin).
7. **D7 (M2):** deck v1 + scriptul demo-ului de 3:00.
8. **D8:** video de backup v1 (Plan B), imediat după M2.
9. **D9:** bug bash pe personas Andrei și Maria, conținutul `/about-ai`.
10. **D10:** expo: 2–3 teste de utilizare cu citate pentru deck.
11. **D11:** video final, README cu livrabilele (inclusiv ce e adaptat din Internal_ai), 3 repetiții de pitch.

### Gata când
- A poate ingera repo-ul și documentele fără erori.
- `golden.json` are întrebări cu răspunsul așteptat și sursa, plus cele 5 la care răspunsul corect e „nu știu".
- Demo-ul de 3 minute rulează cap-coadă fără mock-uri.

**Depinzi de:** nimic la început. **Te așteaptă:** toată lumea.

---

## Puncte de sincronizare

| Oră | Ce |
|---|---|
| 16:30 | Deploy de probă merge (A), corpusul e pe drum (D) |
| 19:00 · M1 | Ask cu citări + abstain pe URL-ul deployat · F1 schimbă UI-ul · F2 returnează JSON real |
| 24:00 · M2 | Toate funcțiile MUST v1 merg end-to-end, fără mock-uri → video de backup |
| 05:00 | Feature freeze pe SHOULD, doar a11y, bugfix-uri, performanță |
| 10:00 | Freeze total |

Dacă rămânem în urmă, tăiem din adâncime, nu din funcții. F1, F5, F2 și F3 nu se taie niciodată.

## Flux git (copy-paste)

```bash
git checkout main && git pull
git checkout -b c/ticket-decoder       # prefix = track-ul tău
# lucrezi, commit-uri mici
npm run lint
git pull --rebase origin main
git push -u origin c/ticket-decoder    # deschizi PR în main
```
