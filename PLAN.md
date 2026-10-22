# Plan v2: **Bridge**, AI de onboarding pentru *Junior Software Developers* cu dizabilități
*AccessABILITY Hackathon 2026 · 22–23 oct · stop coding 23 oct 12:00 · v2 actualizat 22 oct 14:00*

---

## 0. Context și ce s-a schimbat în v2

**Tema** cere un prototip funcțional, nu un chatbot generic. Prin el, persoanele cu dizabilități devin autonome și productive la primul job: *„adapt the workplace to the person”*.

**Ce s-a schimbat față de v1:**
- **Un singur job: Junior Software Developer.** Acoperim primele 30 de zile, cu funcții concrete pe artefactele reale ale meseriei: tickete, PR-uri, documentația repo-ului, ședințe Scrum.
- **Lista de funcții e decisă cu echipa:**
  - MUST: F1–F9.
  - SHOULD, în ordinea **F11 → F12 → F10 → F13**.
- **Modificările cerute:**
  - când asistentul nu știe răspunsul, deschide un **chat cu managerul**, cu întrebarea deja scrisă (F5);
  - conversia **text → diagramă** (F8);
  - **auditul e specific pentru junior developers** (F9).
- **Notele din `suggestions/plan-initial.txt` sunt integrate:**
  - Robert cere să nu semănăm cu widget-ul RDCC (§5);
  - deploy de probă din primele ore;
  - seed declarat pentru insights;
  - anonimat formulat onest;
  - Plan B înregistrat devreme;
  - responsabil pentru golden set;
  - navigare de maximum 5 secțiuni;
  - planul salvat în repo ca `PLAN.md`.

**Decizii confirmate:**
- **Furnizori:** OpenAI + ElevenLabs, optimizați pe cost și calitate (§6).
- **Frontend:** React+Vite din Internal_ai, refăcut accesibil.
- **Limba:** UI și conținut doar în engleză.
- **Eroul demo-ului:** angajatul (personas Andrei și Maria).
- **Integrări:** GitHub; ședințele online (Meet, Teams) se ascultă din tab-ul browserului.

**Codul RAG refolosit** e în `~/Documents/GitHub/Internal_ai` (§3). Repo-ul `Accesibility` conține doar planul, `suggestions/`, `.gitignore` și fișiere de test.

---

## 1. De ce Junior Software Developer

- **E un prim job foarte comun pentru absolvenți.** Juriul și publicul (LSAC, Politehnica) îl înțeleg instant. Firmele IT sunt clienții B2B naturali, fiind membri RDCC cu hub-uri în București.
- **Ponderea neurodivergenților e mare.** În Stack Overflow Survey 2022: ~10,6% ADHD/concentrare, ~4,3% autism, ~2,7% dislexie. O analiză din 2025 pe aceleași date arată că întâmpină mai multe dificultăți decât colegii neurotipici.
- **Barierele sunt documentate:**
  - **Developerii nevăzători** găsesc greu codul în codebase-uri mari, pentru că screen reader-ul le parcurge linear. Debugging-ul e cel mai raportat obstacol. Diagramele și tool-urile de task-management sunt adesea inaccesibile. Pair programming-ul e greu, pentru că tehnologia lor asistivă nu e pe calculatorul colegului.
  - **Developerii autiști** au probleme cu review-uri nestructurate sau ambigue și cu interpretarea tonului din feedback. Preferă comunicarea scrisă.
- **Toată munca e scrisă** (tickete, PR-uri, docs, CODEOWNERS). RAG-ul are material bogat, iar integrările sunt reale (GitHub API, audio din tab-ul ședinței). Asta punctează la *Meaningful AI*.

---

## 2. Research (condensat)

### 2.1 Grila de jurizare → răspunsul nostru
| Criteriu | Cum punctăm |
|---|---|
| Impact + Theme | Primele 30 de zile ale unui junior dev. Acoperim toate cele 4 zone RDCC: Învățare (F6, F11), Productivitate (F2, F4, F10), Comunicare (F3, F5, F12), Acces (F7, F9) |
| Accessibility & Inclusive design | WCAG 2.2 AA nativ; profil de *stil de lucru* (nu de diagnostic); voce și tastatură peste tot; imagine ↔ text ↔ diagramă ↔ audio |
| Innovation | AI care transformă tichetele, review-urile și ședințele firmei după nevoi. Bucla „nu știu → manager → devine documentație” |
| Functionality / UX / Performance | 4 fluxuri live; TTFT < 2 s; navigare de 5 secțiuni |
| Architectural complexity | Hybrid search (BM25 + vector, RRF) + reranker + Contextual Retrieval + GitHub API + Realtime + eval măsurat |
| Meaningful AI | Extragere structurată (pași, sarcini, required/optional), vision, diarizare, text→diagramă, audit pe dovezi |
| Ethics / Privacy | Nevoi, nu diagnostic; anonimat onest; k ≥ 5; fără emotion recognition; citări + abstain + handoff uman |
| Scalability / Feasibility | B2B SaaS + audit „Junior-ready”; costuri pe utilizator calculate; roadmap |
| Pitch | Demo de 3 min cu 4 momente live + numere de eval + citate de la Expo |

### 2.2 Câștigătorul anterior (Vocalio)
A făcut un singur lucru, clar: povestea pacientului → AI structurează → agendă, întrebări și checklist pentru medic. Avea un flux în 3 pași, un before/after vizibil, buton „Try Demo” și disclaimere.
→ **Preluăm** fluxul în 3 pași și before/after-ul: un ticket ambiguu devine pași clari.

### 2.3 Piața, din perspectiva unui junior dev
| Ce există | Ce le lipsește |
|---|---|
| GitHub Copilot (cod, rezumate de PR), ChatGPT | Nu cunosc echipa: DoD, convențiile de review, numele de cod, cine pe ce răspunde. Nu adaptează nimic după nevoi. Nu acoperă ședințele sau adaptările |
| M365 Copilot / Teams recap, Otter, Glean | Nu sunt legate de repo și tickete; nu adaptează output-ul; licențe scumpe |
| Goblin Tools „Magic ToDo”, Tiimo | Generice: nu cunosc ticketele și procedurile firmei; fără citări |
| Pașapoarte de adaptări (AXS, CloudRock/Workday) | Centrate pe UK/AU; neconectate la onboarding sau la meseria de developer |
| Overlay-uri (widget-ul RDCC, accessiBe) | Schimbă doar afișarea. FTC a amendat accessiBe cu $1M (2025) |
| TU Dortmund KI-InnOMATiV (2026–2028) | E cercetare, nu produs. **Validează nevoia** |

### 2.4 Date pentru pitch
- România: ~**1 din 10** persoane cu dizabilități e angajată; **cel mai mare decalaj din UE**. 980.873 persoane cu certificat. Cota de 4% e des plătită la stat în loc de angajări. Din 2025, OUG 127/2024 aduce obligații active.
- Deloitte: **75%** dintre cei care și-au declarat dizabilitatea **n-au cerut niciodată o adaptare**. Inclusively: **36%** nu știu ce resurse există.
- JAN (2019–2024): **61% dintre adaptări nu costă nimic**. Cele cu cost unic au mediana de **$300**.
- Understood (2026): **78%** dintre angajații neurodivergenți folosesc deja AI la muncă.

### 2.5 Legal și etic
- **GDPR art. 9:** dizabilitatea e dată de sănătate. Chiar și preferințele o pot dezvălui, deci sunt owner-only, cu export și ștergere.
- **AI Act:**
  - art. 5(1)(f) interzice recunoașterea emoțiilor la locul de muncă;
  - art. 50 cere etichetarea conținutului generat de AI;
  - Anexa III (monitorizare, alocare de sarcini) e high-risk de la 2 dec. 2027.
  - → **Fără monitorizare individuală.** F3/F12 extrag doar ce i s-a cerut persoanei, la cererea ei. F4 explică convenții, nu emoții.
- **Adaptare rezonabilă:** Legea 448/2006, Directiva 2000/78 art. 5, CRPD art. 27. **EAA:** Legea 232/2022.

---

## 3. Ce refolosim din Internal_ai (căi exacte)
*(căi relative la `~/Documents/GitHub/Internal_ai/`)*

| Componentă | Unde | Verdict |
|---|---|---|
| Ingestie (upload) | `server/routes/ingest.js:98-219`: PDF per pagină (129-142), DOCX (144-167), storage (177-187), zero-retention (199-203) | **Ia**. DOCX → `convertToHtml` + turndown, ca să păstrezi titlurile |
| Batch embed + rollback | `ingest.js:44-95` (`processInBatches`) | **Ia** |
| Interfața de sync | `server/sync/engine.js:31-173` (`runSync(items{sourceId,title,url,updatedAt,content})`), `sanitizeText` 15-21 | **Ia pentru GitHub-ul nou** (`sync/github.js`). Repară ordinea: inserează noul, abia apoi șterge vechiul (azi 71-79) |
| Chunking | `server/utils/chunker.js:10-51` (`chunkWithOverlap`). ⚠ Nu face overlap, deși așa se numește | **Ia + extinde** (titluri + overlap) |
| Embeddings | `chat.js:161-164`, `ingest.js:53-56`, `engine.js:24-27` (`text-embedding-3-small`) | **Ia** |
| Vector store | `documents` (+ `integrations.sql:37-43`). ⚠ Schema și `match_documents` lipsesc din repo | **Rescrie** (FTS + HNSW) |
| Retrieval | `chat.js:139-184`: vector-only, prag 0.5, top 5 | **Înlocuiește** (§7) |
| Prompt | `chat.js:255-288`. ⚠ Când n-are context, răspunde din cunoștințe generale (275-278); contextul stă în system prompt | **Rescrie** în mod strict |
| Bugete și istoric | `chat.js:22-28, 189-199, 242-253` | **Ia** |
| Fișiere și vision | `upload.js:18-101`; `chat.js:208-230` (imagini prin signed URL) | **Ia** |
| Streaming SSE | `chat.js:166-173, 290-307, 351`; `index.js:34-41` (compresia ocolește SSE) | **Ia** și adaugă evenimentele `status`, `enrich`, `handoff`, `done` |
| Parser SSE client | `ChatPage.jsx:220-261`. ⚠ Split fără buffer, deci se pierd evenimente tăiate | **Rescrie** (`lib/sse.js`) |
| Citări | `chat.js:309-350`, `MessageBubble.jsx:50-94`, `documents.js:13-104`, `DocumentPreview.jsx` | **Ia logica**; refă UI-ul accesibil |
| Infrastructură | `middleware/auth.js`, `utils/{auth,supabase,logger}.js`, `rateLimiter.js`, `index.js`, `routes/sessions.js`, `add_rls_policies.sql` | **Ia** |
| Admin | `admin.js:55-99` (`/stats`) | **Ia ca model**. ⚠ **NU porta** `admin.js:106-150` (mesaje per utilizator + email = monitorizare) |

**Nu copia:**
- `scripts/client_documents/` (conține un document real de client);
- ORG_ID-urile hardcodate;
- componentele UI. Au butoane-icon fără `aria-label` (`ChatInput.jsx:40,59`, `DocumentPreview.jsx:29`), text de 10–11px și `text-slate-300` în ~15 fișiere, și nu au `aria-live`.

**Transparență:** README-ul declară ce e adaptat din proiectul anterior al echipei.

---

## 4. Funcțiile: ce primește concret junior developerul

### 4.0 Patru motoare comune (de construit primele)
| Motor | Ce face | Funcții servite |
|---|---|---|
| **E1 RAG Q&A** | hybrid + rerank + abstain + citări + adaptare pe profil | F5, F7, F9, F11, F10 |
| **E2 Extragere structurată** | artefact (issue, PR, transcript, ghid) + context RAG → JSON strict | F2, F3, F4, F12, F10 |
| **E3 Adaptare și conversii** | profil → reguli de output și randare; text ↔ audio ↔ diagramă ↔ imagine | F1, F8 (folosit peste tot) |
| **E4 Generatoare** | mesaje, scrisori, rapoarte cu dovezi | F5 (draft către manager), F7, F9 |

### 4.1 MUST (F1–F9)

**F1 · Work-style profile** *(Track B)*
- **Ce primește:**
  - **5 întrebări despre cum lucrează, nicio întrebare despre diagnostic:**
    - task-uri noi;
    - ședințe;
    - code review;
    - comunicarea cu echipa;
    - afișare și input.
  - **Text liber opțional**, transformat în JSON de preferințe (Structured Outputs). Cuvintele medicale sunt ignorate și textul nu se salvează. Utilizatorul confirmă setările propuse.
  - **Quick starts, fără nume de dizabilități:** Written-first, Step-by-step, Listen-first, Visual-first, Screen-reader mode, Calm mode, Keyboard & voice.
- **Cum:** profilul se aplică în UI prin variabile CSS / `data-*` și în AI prin `adapt.js` (reguli + `verbosity`). Se salvează pe dispozitiv; sincronizarea în `user_profiles` (owner-only) e opțională. Butoane Export și Delete.
- **v1:** wizard + 4 quick starts + setări de afișare (mărime, contrast, font, spațiere, mișcare) + setări de output (lungime, pași, TL;DR, audio).

**F2 · Ticket Decoder** *(Track C)*
- **Ce primește:** din link-ul de GitHub issue sau din textul unui ticket Jira:
  - ce se cere, în 2–3 propoziții simple;
  - criteriile de acceptare ca checklist testabil;
  - micro-pași cu minute estimate;
  - fișierele relevante, cu motivul pentru fiecare;
  - **punctele neclare, cu întrebarea gata scrisă**. Butonul *Ask my manager* o trimite în chatul din F5;
  - Definition of Done al echipei;
  - screenshot-urile descrise ca text;
  - *Show as diagram*.
- **Cum:**
  1. GitHub API: `issues/{n}` + comentarii;
  2. imagini → vision (F8);
  3. RAG pe DoD, CONTRIBUTING, ARCHITECTURE și ADR + potrivire de cuvinte-cheie pe arborele repo (`git/trees?recursive=1`);
  4. `gpt-5-mini` cu schemă JSON;
  5. rezultatul devine checklist (`checklists`), apare în Today, cu `.ics`.
- **v1:** issue public + text lipit. Fără Jira API.

**F3 · Meeting → My tasks** *(Track C)*
- **Ce primește:** din înregistrarea unei ședințe (sprint planning, refinement, standup), **doar ce îl privește**:
  - sarcinile lui: citat, cine, minutul, ticketul, termenul;
  - deciziile care îl afectează;
  - termenii necunoscuți (F6);
  - un rezumat de 5 rânduri;
  - termenele în calendar.
  - Live, la nevoie: subtitrare mare + *What did I miss?* (rezumatul ultimelor 3 minute).
- **Cum:** ElevenLabs Scribe v2 (`diarize=true`, `timestamps_granularity=word`). Vorbitorii sunt mapați la nume de LLM, cu posibilitate de corectare manuală. Extragerea o face `gpt-5-mini`, iar rezultatul intră în `meeting_notes`. Live: Web Speech API (Chrome).
- **Confidențialitate:**
  - transcriptul rămâne doar în memorie;
  - banner de consimțământ pentru participanți;
  - fără emoții și fără performanță.
- **v1:** upload + My tasks + glosar. Live captions + catch-up doar dacă timpul permite în fereastra MUST.

**F4 · Code Review Helper** *(Track C)*
- **Ce primește:** din link-ul de PR, pentru fiecare comentariu:
  - ce anume trebuie schimbat;
  - **Required / Optional / Question**, după convențiile echipei: `nit:` = opțional, `blocking:` = obligatoriu;
  - motivul, cu sursa din CONTRIBUTING;
  - un răspuns scurt propus.
  - Thread-urile lungi devin „N things to do”.
- **Cum:** GitHub API (`pulls/{n}/comments`, `pulls/{n}/reviews`, `issues/{n}/comments`) → RAG pe ghidul de review → `gpt-5-mini` JSON per comentariu. UI-ul grupează pe fișiere și filtrează *Required*.
- **Limită:** explică intenția și convenția, nu „citește emoțiile” recenzentului.
- **v1:** butonul *copy reply*. Postarea răspunsului pe GitHub e COULD.

**F5 · Ask the company + „Ask my manager”** *(Track A pentru backend + B pentru UI)*
- **Ce primește:** răspuns adaptat profilului, din documentele echipei, cu citări `[S#]` și pagini. Butoane: *Shorter / Simpler / More detail / As steps / Listen*.
- **Când nu găsește (abstain):**
  - *„I couldn't find this in the team's documents.”*
  - Buton **Ask Ana (your manager)**. Deschide un chat în aplicație cu mesajul deja scris: întrebarea + „What I already checked: Handbook, CONTRIBUTING, no answer” + link la ticket, dacă există.
  - Utilizatorul editează și apasă **Send**. Nu se trimite nimic automat.
  - Dacă CODEOWNERS indică un owner al subiectului, apare și sugestia „Ana owns billing”.
- **Managerul:**
  - primește notificare live (Supabase Realtime);
  - răspunde în chat;
  - apasă **Save to team docs**. Răspunsul devine un FAQ aprobat, intră în RAG, iar data viitoare vine cu citarea „Team FAQ, answered by Ana”. **Bucla de cunoaștere se închide.**
- **Mod anonim:** textul din UI spune onest *„Your team sees the question, never who asked.”*. La abstain, utilizatorul alege:
  - (a) *Send anonymously to the team FAQ*. Răspunsul se urmărește printr-un token păstrat doar în browser;
  - (b) *Ask my manager directly, your name will be visible*.
- **Cum:**
  - retrieval: §7;
  - chat: `help_threads` / `help_messages`, RLS doar pentru cei doi participanți, Realtime;
  - FAQ-uri: `kb_documents(doc_type='faq', approved_by)`.
- **v1:** abstain + chat 1-la-1 + Save to team docs + coada anonimă.

**F6 · Automatic glossary** *(Track A)*
- **Ce primește:** acronime și nume de cod interne (Hermes, Atlas, DoD, CAB…) explicate simplu, cu sursă. Apar ca termeni apăsabili, cu audio, în F2–F5. Există și o pagină de glosar.
- **Cum:** extragere la ingestie (`gpt-5-nano`, JSON strict) → `glossary_terms`. Glosarul servește și la expansiunea acronimelor în query.

**F7 · Adjustments advisor for developers** *(Track C + D)*
- **Ce primește:** alege nevoi concrete:
  - standup-uri vorbite rapid;
  - folosesc screen reader;
  - mă copleșesc notificările;
  - tastatul mă obosește;
  - tickete neclare.

  **Primește** adaptări specifice developerilor, fiecare cu sursa (politica firmei + lege) și cu „how to ask”:
  - standup scris async; captions / transcript; agendă din timp;
  - acceptance criteria scrise;
  - VS Code + NVDA/VoiceOver; pair programming prin **Live Share**;
  - descrieri text pentru diagrame;
  - focus blocks;
  - voice coding + hardware ergonomic;
  - un singur buddy; review turnaround extins; on-call amânat.
- **Mesajul către manager** conține doar nevoi și propuneri, fără diagnostic. E editabil și îl trimite utilizatorul: prin chatul din F5, copy sau email.
- **Argument:** 61% dintre adaptări costă $0 (JAN).
- **Cum:** `data/dev_adjustments.json` + RAG pe politica firmei + `legal/`. Disclaimer: *informational, not legal advice*.

**F8 · Format conversions (inclusiv text → diagram)** *(Track B + A)*
- **Ce primește, oriunde în aplicație:**
  - imagine/diagramă → text;
  - **text → diagramă**:
    - procedură sau setup → flowchart;
    - „cum circulă o factură” → sequence;
    - arhitectură → graf.

    Mereu cu **echivalentul text** dedesubt;
  - text → audio, în ritm normal sau lent;
  - voce → text;
  - lung → scurt sau pași;
  - jargon → limbaj simplu.
- **Cum (diagramă):**
  - pornește de la contextul RAG;
  - `gpt-5-mini` produce `{title, summary, mermaid, outline[]}`;
  - validare cu `mermaid.parse`; dacă eșuează, 1 retry cu eroarea;
  - randare SVG cu `role="img"`, `<title>`/`<desc>`, temă high-contrast, listă text navigabilă, download SVG;
  - fallback: doar outline-ul.
- Vision rulează pe `gpt-5-mini`. TTS și STT: §6.

**F9 · Junior-ready audit** (pentru firmă, specific junior developerilor) *(Track A + D)*
- **Ce primește firma:**
  - scor **Junior-ready 0–100**;
  - ranking de goluri, cu dovezi (citat sau fișier);
  - primul pas concret pentru fiecare gol;
  - quick wins.
- **Strat 1, verificări automate pe repo** (GitHub API):
  1. README cu „Getting started”;
  2. ghid de setup + known issues;
  3. CONTRIBUTING cu convenții de review;
  4. PR template cu „How to test”;
  5. issue templates cu acceptance criteria;
  6. % din ultimele 30 de issue-uri care au acceptance criteria;
  7. cel puțin 3 „good first issue”;
  8. CODEOWNERS;
  9. imagini Markdown fără alt text;
  10. ARCHITECTURE / ADR;
  11. lizibilitatea README și a ghidului de setup.
- **Strat 2, LLM-judge pe documente** (RAG + citate):
  1. DoD scris;
  2. buddy pentru juniori;
  3. standup async permis;
  4. captions și transcript la ceremonii și training-uri;
  5. agendă din timp + follow-up scris;
  6. norme de focus și notificări;
  7. proces de adaptări, inclusiv tehnologie asistivă și hardware;
  8. tooling accesibil (WCAG 2.2 / EN 301 549);
  9. pair programming accesibil;
  10. on-call amânat + runbook-uri accesibile;
  11. confidențialitatea datelor de sănătate (GDPR art. 9);
  12. obligațiile RO de la 50 de angajați în sus (cota 4%, OUG 127/2024).
- **Prioritate:** `impact × (mandatory ? 1.5 : 1) × {missing:1, partial:0.5} / effort`.
- **Formulare onestă:** „no evidence found in the repo/docs”.
- **v1:** 6 verificări de repo + 6 criterii de proces. Catalogul complet e SHOULD.

### 4.2 SHOULD, în ordinea de execuție

1. **F11 · „Where is the code that…?” + arhitectura explicată.**
   - Index de cod: arborele repo + rezumate scurte (`gpt-5-nano`) pentru ~150 de fișiere-cheie, în același index hibrid (`doc_type='code_map'`).
   - Răspunsul conține: cale, funcție, flux în 3 propoziții, ADR.
   - Arhitectura e explicată pe 3 niveluri, plus *Draw it* (F8).
2. **F12 · Standup draft.**
   - Pornește de la progresul pe checklist (F2), sarcinile din ședințe (F3) și o notă vocală.
   - Produce *Yesterday / Today / Blockers* în cel mult 3 rânduri, în formatul echipei.
   - Opțiuni: citit, TTS sau copiat. Plus *Phrase my blocker*.
3. **F10 · Setup local pas cu pas.**
   - Un pas pe ecran: comandă (copy + audio), ce trebuie să vezi, ce faci dacă nu merge.
   - Lipești eroarea → căutare hibridă în known issues → fix cu sursă.
4. **F13 · Insights anonime pentru engineering manager.**
   - Teme ale întrebărilor (anonime și abstain-uri), goluri de conținut, termeni căutați des, documente greu de citit.
   - Doar grupuri de minimum 5; zero date per persoană.
   - **Seed cu întrebări fictive pentru demo, declarat onest.**

### 4.3 COULD
- PR și commit din voce sau notițe, pe template-ul echipei;
- postarea răspunsurilor de review pe GitHub;
- quiz-uri (Git workflow, securitate);
- pictograme ARASAAC (licență necomercială, doar pentru demo);
- type-to-speak în ședințe (ElevenLabs Flash);
- pregătirea ședințelor din documente.

### 4.4 Acoperire pe tipuri de dizabilitate
*Pentru pitch. Produsul nu stochează niciodată asta.*

| Tip | Ce îl ajută |
|---|---|
| Vizual | Screen-reader mode; imagine/diagramă → text; răspunsuri structurate; text mare și contrast; tastatură; TTS |
| Auz | Written-first; captions + catch-up; Meeting → My tasks; standup async; chat scris cu managerul |
| Motor | Keyboard & voice; dictare peste tot; ținte ≥ 44px; fără limite de timp |
| Neurodivergent / cognitiv | Step-by-step; Ticket Decoder (ambiguitate → întrebări); Review Helper (required vs optional); Listen-first; fonturi și spațiere; Calm mode; remindere |

---

## 5. UX și diferențierea față de widget-ul RDCC (nota lui Robert)

- **Navigare (5 secțiuni):**
  1. **Today** (sarcini, checklist-uri, remindere, draft de standup);
  2. **Ask** (Q&A + chaturile cu managerul);
  3. **Work** (Tickets, Reviews, Setup);
  4. **Meetings**;
  5. **Support** (Adjustments).

  Buton fix **Work style** (`Alt+A`); Glossary în header; `/about-ai` în footer.
- **Pentru manager:** Help inbox (în Ask) + Insights. **Pentru admin:** zona Company (Documents & repo, Audit).
- **Cum ne diferențiem de widget-ul RDCC:**
  1. Nu e un overlay de afișare. Schimbă **cum primești munca** (tickete, review-uri, ședințe); afișarea e doar o parte mică.
  2. **Nicio etichetă de dizabilitate**, nici măcar ca indiciu.
  3. Setările sunt legate de sarcini de developer.
  4. E privat implicit (pe dispozitiv), cu sincronizare opțională.
  5. E nativ (WCAG), nu un script injectat.

---

## 6. Arhitectură și furnizori (cost/calitate verificate, oct. 2026)

```
client: React 19 + Vite + Tailwind + react-aria-components + mermaid (lazy)
   │ HTTPS + SSE (parser cu buffer) + Supabase Realtime (chat cu managerul)
server: Express 5 (refolosit)
   ├─ routes: ask · help (threads/messages/publish-faq) · anon · tickets · reviews · meetings · adjustments
   │          convert (diagram/describe-image) · voice · glossary · profile · company (ingest, ingest-repo, audit, insights)
   │          SHOULD: code-where · standup · setup
   ├─ services: retrieval · rerank · adapt · llm · embeddings · contextualize · glossary · diagrams · privacy · ics
   ├─ integrations: github.js (issues, PR-uri, review-uri, tree, contents, CODEOWNERS) · elevenlabs.js (Scribe)
   └─ prompts/* · data/(audit_criteria.dev.json, dev_adjustments.json, legal/*.md) · eval/(golden.json, run.js)
Supabase (Frankfurt): Postgres + pgvector(HNSW) + FTS('english') + RLS + Auth + Storage + Realtime
```

| Nevoie | Alegere | Preț |
|---|---|---|
| Generare, adaptare, extragere, vision | **`gpt-5-mini`** (Responses API, `reasoning.effort:'minimal'`, `text.verbosity` = scurt/normal/detaliat). Fallback: `CHAT_MODEL=gpt-4.1-mini` dacă TTFT e prea mare | $0.25 in / $2.00 out per 1M |
| Taskuri de fundal (context pe chunk, glosar, query rewrite, enrich, rezumate de cod, teme) | **`gpt-5-nano`** | $0.05 / $0.40 per 1M (input din cache $0.005) |
| Embeddings | **`text-embedding-3-small`** | $0.02 per 1M |
| Rerank | **`gpt-4.1-mini`** (top 15, timeout 4 s; `RERANK_MODEL`) + fallback ordinea RRF | ~$0.0002/căutare |
| Ședințe înregistrate | **ElevenLabs Scribe v2** (diarizare, până la 32 de vorbitori) | $0.22/oră |
| Live captions / întrebări vocale | **Web Speech API** (Chrome); fallback `gpt-4o-mini-transcribe`. În producție: Scribe v2 Realtime | gratuit / $0.003/min / $0.39/oră |
| TTS | `speechSynthesis` din browser + **`gpt-4o-mini-tts`** cu `instructions` (ritm lent) | gratuit / ~$0.015/min |
| GitHub | REST API cu token fine-grained read-only (contents, issues, pull requests) | gratuit (5.000 req/h) |

**Unit economics:** ~$0.6 / utilizator activ / lună pentru Q&A + rerank, plus $0.22 / oră de ședință transcrisă. Lasă loc pentru un preț B2B de **€5–10 / angajat / lună** (ipoteză).

**Chei necesare:** `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `GITHUB_TOKEN`, Supabase (URL, anon, service).

---

## 7. RAG v2

**Ingestie** (`services/ingest.js` + `integrations/github.js` → interfața `runSync`):
1. **Surse:** fișierele încărcate (PDF/DOCX/MD) + **repo-ul demo prin GitHub API** (`*.md` din root, `docs/`, `.github/`, CODEOWNERS parsat în `topic_owners`) + FAQ-urile aprobate din F5.
2. **Parsare cu structură:** DOCX → Markdown; PDF per pagină. Apoi `sanitizeText`.
3. **Chunking pe titluri** + `chunkWithOverlap` + overlap real de ~150 de caractere. Se salvează `section_path`, `page`, `chunk_index`, `doc_type` (handbook / procedure / repo_doc / adr / faq / legal / code_map).
4. **Contextual Retrieval:** `gpt-5-nano` scrie 1–2 propoziții de context per chunk, cu documentul ca prefix în cache. Rezultat raportat de Anthropic: −49% eșecuri de retrieval; **−67%** cu rerank.
5. **Embedding** pe `context + content`; **FTS** generat (`english`) + GIN; **HNSW** pe cosine.
6. **Glosar** (F6) și **scor de lizibilitate** per document (pentru F9 și F13).

**Retrieval** (`services/retrieval.js`):
1. **Query rewrite** pe baza istoricului (înlocuiește `chat.js:142-159`) + expansiune de acronime.
2. **RPC `hybrid_search`:** FTS top 40 + vector top 40 → **RRF (k=60)** → top 30. Filtre: org, `access_group`, `doc_type`.
3. **Rerank** cu `gpt-4.1-mini`: top 15 → top 6. Fallback: ordinea RRF (eroare sau timeout 4 s).
4. **Abstain** dacă scorul maxim < τ (calibrat pe eval, start 0.25). Atunci serverul trimite evenimentul SSE `handoff`: `{helper:{id,name,role}, topic_owner?, draft}`, cu draft-ul pre-scris pentru F5.
5. **Context:** vecini (`chunk_index ± 1`), dedup, buget de ~12k tokeni, etichete `[S1..S6]`.

**Generare** (`services/adapt.js`):
- `gpt-5-mini` streamat.
- **Mod strict:** documentele stau în blocul `<documents>`, marcate ca date nesigure, **în afara system prompt-ului**. Citările care nu corespund unui chunk se șterg. Nu se deduce nicio dizabilitate. Informația legală e marcată „informational”.
- **Reguli din profil:** pași, TL;DR, limbaj literal, structură pentru screen reader, `verbosity`.
- **Enrich în paralel** (`gpt-5-nano`): `{tldr, steps[], deadlines[], glossary_terms_used[]}`.
- **Re-adaptarea** refolosește retrieval-ul din cache.

**Eval** (`server/eval/`):
- 25 de întrebări pe corpus + 5 în afara lui. **Owner: D, gata până la 19:00.**
- Măsurăm hit@1, hit@5 și MRR pentru vector-only vs hybrid vs hybrid + rerank vs + context, plus acuratețea abstain-ului.
- **Tabelul intră în pitch.**

---

## 8. Date și confidențialitate

**Migrări:** `001_init.sql`, `002_rls.sql`, `003_realtime.sql`.

| Tabel | Note |
|---|---|
| `organizations`, `organization_members` | + `role` (admin / manager / member), **`manager_id`**, `github_login` |
| `kb_documents`, `documents` (chunk-uri) | `context`, `fts`, `embedding vector(1536)`, `section_path`, `page`, `chunk_index`, `doc_type`, `access_group`, `approved_by` (pentru FAQ) |
| `glossary_terms`, `topic_owners` | din ingestie / CODEOWNERS |
| `user_profiles` | `prefs jsonb`. **Fără câmp de diagnostic.** Owner-only |
| `help_threads`, `help_messages` | RLS: doar requester și helper; publicate în Realtime |
| `anonymous_questions` | **fără user_id**: `question_redacted`, `topic`, `week`, `claim_token_hash`, `faq_id` |
| `checklists`, `checklist_items`, `meeting_notes` | owner-only; **fără transcript** |
| `audit_runs`, `audit_findings` | per org; criteriile stau în JSON |

**Reguli:**
- Pe `documents` nu se citește direct prin PostgREST; accesul trece doar prin RPC sau server.
- Insights expune numai RPC-uri cu k ≥ 5.
- Nu se loghează IP-ul pe `/api/anon`.
- Profilul și nevoile nu ajung **niciodată automat** la manager. Orice mesaj trece prin edit + Send făcute de utilizator.
- Banner de consimțământ la ședințe; fără emoții și fără scoruri.
- Etichetă „AI-generated” pe output (AI Act art. 50); pagina `/about-ai`.
- Datele stau în UE (Frankfurt).

---

## 9. Accessibility by design

**Bază:**
- landmarks, skip link, un singur `h1`;
- totul din tastatură, cu focus vizibil (3px, contrast ≥ 3:1);
- scurtături (`Alt+A`, `Alt+Q`, `Esc`); ținte ≥ 44px;
- contrast ≥ 4.5:1 (7:1 în high-contrast); reflow la 320px și 200%; text-spacing;
- `prefers-reduced-motion`; nimic nu clipește; culoarea nu e niciodată singurul semnal;
- autentificare fără CAPTCHA (magic link).

**Screen reader:**
- `aria-live` pentru statusuri (*Searching… / Answer ready*); răspunsul se anunță o dată, la final, nu token cu token;
- **chat:** mesajele noi se anunță politicos, fără să fure focusul;
- **diagrame:** text echivalent navigabil;
- **tickete și review-uri:** liste grupate, cu titluri.

**Unelte:**
- `eslint-plugin-jsx-a11y`, `@axe-core/react`, Lighthouse ≥ 95;
- **VoiceOver** pe Mac-ul tău;
- **NVDA** dacă cineva are Windows;
- test keyboard-only.

---

## 10. Repo și corpus demo

**Pasul 0:**
- copiază planul în repo ca **`PLAN.md`** (înlocuiește copia cu nume lung) și păstrează `suggestions/`;
- șterge `test1.txt` și `status.txt`, dacă echipa e de acord.

**Ce copiem, ce adaptăm, ce e nou:**
- **Copiat din Internal_ai:**
  - `server/{index,env}.js`, `middleware/*`, `utils/{supabase,auth,logger}.js`;
  - `routes/{documents,upload,sessions}.js`;
  - configurările client, `supabaseClient.jsx`, auth și SessionGuard din `App.jsx`.
- **Adaptat:**
  - `chunker.js`;
  - `ingest.js` → `services/ingest.js`;
  - `chat.js` → `routes/ask.js` + `services/{retrieval,adapt}.js`;
  - `sync/engine.js` → `runSync` pentru `integrations/github.js`;
  - logica de surse din `MessageBubble` → `SourceList`.
- **Nou:**
  - `client/src/a11y/*`;
  - componentele `AdaptiveAnswer`, `HelpChat`, `Diagram`, `GlossaryTerm`, `Checklist`, `ReviewList`, `Captions`, `AudioButton`, `VoiceInput`;
  - `lib/{sse,ics,speech}.js`;
  - `server/{services,integrations,prompts,data,eval}`;
  - `supabase/migrations/*`;
  - `demo-corpus/`;
  - README cu livrabilele.

**Corpusul demo** (firmă fictivă *Brightline Software*, EN):
- **Repo GitHub public `invoicing-service`:**
  - schelet TypeScript de ~20 de fișiere: `services/billing/notify.ts`, `invoice.cron.ts`, `OrderExport.ts`…;
  - README, ARCHITECTURE.md (cu o diagramă PNG), `docs/adr/ADR-007`;
  - CONTRIBUTING cu convențiile `nit:` / `blocking:`;
  - CODEOWNERS;
  - PR template **fără** secțiunea „How to test” (gol plantat);
  - **fără issue templates** (gol plantat);
  - `docs/setup.md` (12 pași) + `docs/known-issues.md`;
  - 3 imagini fără alt text (gol plantat).
- **Issues:**
  - **#142 „Export invoices as CSV”**, ambiguu intenționat, cu screenshot;
  - 4–5 alte issue-uri, unele fără acceptance criteria.

  **PR #57:** 6 comentarii de review (nit, blocking, question, un „why?” sec).
- **Documente de firmă:**
  - Engineering Handbook: DoD, format de standup, norme Slack, cameră, on-call;
  - Workplace Adjustments Policy, **incompletă**: fără termene și fără confidențialitate;
  - Security training.

  **Recurent:** nume de cod (Hermes = coada de facturare, Atlas = gateway).
- **Ședință:** înregistrare de 2–3 min de sprint planning, jucată de voi. Atribuie sarcini lui Andrei și Mariei și folosește numele de cod.
- **`legal/`:** rezumate EN pentru CRPD 27, Dir. 2000/78 art. 5, Legea 448/2006 + OUG 127/2024, GDPR 9, AI Act 4/5/50, EAA / Legea 232/2022.
- **Seed:** 12 întrebări anonime fictive (pentru F13) + `golden.json` (25 + 5).

---

## 11. Execuția (acum 14:00 → 23 oct 12:00)

**Track-uri** (completați numele):
- **A. RAG/backend** (___ + Claude): schema, ingestie + GitHub, hybrid/rerank, Ask + handoff, glosar, eval, audit.
- **B. Frontend/a11y** (___): shell, F1, UI-ul Ask + HelpChat (Realtime), AdaptiveAnswer, Diagram, keyboard/SR.
- **C. Funcții AI** (___): F2, F4, F3 (Scribe + captions), F7, voce; apoi F12, F10.
- **D. Produs/corpus/pitch** (___): repo demo + issues + PR + înregistrare + documente + legal + catalog de audit + golden set + seed; Expo; deck; README; video.

| Interval | Livrabil |
|---|---|
| 14:00–15:30 | Pasul 0 (`PLAN.md`); bootstrap repo (copiere §10); proiect Supabase EU + migrări; chei; **D** creează repo-ul demo și începe corpusul; dacă se mai poate, cineva ajunge la workshop sau la standuri de la Expo |
| 15:30–16:30 | **Deploy de probă:** Vercel + Render cu un endpoint SSE de test, ca CORS, SSE și cold start să iasă devreme |
| 16:30–19:00 | **A:** ingestie v2 + `hybrid_search` + rerank + `/ask` cu citări și abstain. **B:** shell + F1 + pagina Ask (`sse.js`). **C:** backend-ul F2 (GitHub + JSON). **D:** corpus complet + **golden.json** + catalogul de audit + înregistrarea ședinței |
| **19:00 · M1** | Ask cu citări + abstain pe URL-ul deployat; F1 schimbă UI-ul; F2 returnează JSON |
| 19:00–24:00 | **A:** handoff + Realtime + Save-to-FAQ (F5), F6, contextual retrieval, eval. **B:** UI pentru F2, HelpChat, Diagram (F8), AdaptiveAnswer. **C:** F3 (Scribe) + F4. **D + C:** F7. **A + D:** F9 v1. **D:** deck v1 |
| **24:00 · M2** | Toate funcțiile MUST v1 merg. **Imediat după: video de backup v1** (Plan B) |
| 00:30–05:00 | SHOULD, în ordine: **F11 → F12 → F10 → F13**; prima trecere a11y (axe, Lighthouse, tastatură); voce în toate fluxurile |
| 05:00–08:00 | A doua trecere a11y (VoiceOver, NVDA); TTFT < 2 s; bug bash pe Andrei și Maria; deploy final |
| 08:00–10:00 | Test de utilizare la Expo (2–3 persoane: juniori sau ONG-uri + 1–2 engineering manageri pentru F9/F13); integrăm citatele. **Freeze la 10:00** |
| 10:00–12:00 | Video final, README cu livrabilele, deck final, 3 repetiții de pitch. **12:00 stop** |

**Ordinea de construcție MUST:** motoarele E1–E4 → F1 → F5 → F2 → F6 → F8 → F3 → F4 → F7 → F9.
**Dacă rămânem în urmă la 24:00:** tăiem din adâncime (versiunile v1), nu din funcții. F1, F5, F2 și F3 nu se taie niciodată.
**Commit-uri:** mici și frecvente; juriul poate verifica istoricul.

---

## 12. Demo, validare, pitch

**Personas:**
- **Andrei**, junior backend: *Step-by-step + Listen-first*.
- **Maria**, junior frontend, surdă: *Written-first + captions*.
- Suportul pentru nevăzători apare într-un clip VoiceOver de 20 s în video.

**Demo de 3:00 (4 momente live + 2 cadre rapide):**
1. **Andrei (0:50):** profil → Ticket Decoder pe #142: pași cu minute, fișiere, „Unclear: date format → question ready”, DoD → *Show as diagram* → *Listen*.
2. **Handoff (0:40):** „Who approves DB migrations?” → nu găsește → **Ask Ana** → chat pre-completat → Ana răspunde live pe al doilea laptop → *Save to team docs* → Andrei întreabă din nou și primește răspuns cu citarea „Team FAQ”.
3. **Maria (0:45):** înregistrarea de sprint planning → **My tasks** (citat + termen) → chip de glosar „Hermes” → `.ics`.
4. **Code review (0:30):** PR #57 → „2 required, 3 optional” + răspunsuri propuse.
5. **Cadre rapide (0:15):** scrisoarea de adaptare (doar nevoi) + scorul Junior-ready cu top 3 goluri.

**Pitch de 6 min:**
1. Hook cu Andrei + 2 statistici (0:30).
2. Problemă + validare: citate de la Expo + studiile despre developeri (0:45).
3. Demo (3:00).
4. Tehnic și Responsible AI: tabelul de eval, abstain + handoff uman, privacy (0:45).
5. Business (audit + seat, €5–10/lună) + roadmap (0:45):
   - limba română (FTS `romanian`);
   - Jira/Teams/Slack bot;
   - Scribe Realtime;
   - SSO;
   - pilot cu un membru RDCC.

**Validare la Expo:**
- **Pentru juniori și oameni cu dizabilități:**
  1. Ce a fost greu în primele săptămâni?
  2. Un ticket sau feedback pe care nu l-ai înțeles?
  3. Ai evitat să întrebi ceva?
  4. Ce te-a ajutat la ședințe?
  5. Ai cerut vreodată o adaptare?
- **Pentru firmele IT:**
  - Cum faceți onboarding-ul juniorilor?
  - Ați folosi un scor Junior-ready?

**Q&A pregătit:**
- De ce nu Copilot sau ChatGPT? *(Nu cunosc echipa și nu adaptează nimic.)*
- Chatul cu managerul nu e doar Slack? *(Răspunsurile devin documentație citată, totul e accesibil, iar profilul nu ajunge la manager.)*
- Halucinații? *(Abstain + handoff.)*
- Unde stau datele?
- Ce faceți cu diagnosticul? *(Nu îl colectăm.)*
- Prin ce diferă de un overlay?
- Licența ARASAAC? *(Pictogramele sunt doar COULD, cu acord comercial pe roadmap.)*

---

## 13. Riscuri și Plan B

| Risc | Măsură |
|---|---|
| Rerank-ul LLM e lent sau pică | Timeout 4 s → ordinea RRF; cache pentru întrebările din demo |
| Web Speech API merge doar în Chrome/Safari | Demo-ul se face pe Chrome; înregistrările trec prin Scribe |
| Limita GitHub API (60/h fără token) | Token (5.000/h); cache pentru issue/PR |
| Realtime nu merge | Fallback polling la 2 s |
| Wi-Fi-ul din sală | Hotspot mobil; **video de backup v1 la ~00:30**, versiunea finală la 10:00–11:00 |
| Mermaid invalid | `parse` + retry + fallback pe outline |
| Latența LLM | `gpt-5-mini` cu reasoning minim; `CHAT_MODEL=gpt-4.1-mini` |
| Scope mare (9 MUST) | Motoare comune + v1 per funcție + ordinea de construcție/tăiere de mai sus |

---

## 14. Decizii deschise (pentru echipă, nu blochează startul)
1. Numele pe track-urile A, B, C, D.
2. Limba pitch-ului: recomand engleză (ca UI-ul și brief-ul) + un slide cu roadmap-ul RO. Verificați cu organizatorii.
3. Ștergem `test1.txt` și `status.txt` la bootstrap?
4. Cine are Windows pentru NVDA?
5. Organizația GitHub pentru repo-ul demo.

---

## 15. Verificare end-to-end

- **Pornire și ingestie:**
  - `npm run dev`;
  - ingest corpus + repo (`/company`): `fts`, `context` și `embedding` sunt populate;
  - glosarul are ≥ 15 termeni, inclusiv Hermes și Atlas;
  - `topic_owners` e populat din CODEOWNERS.
- **Eval:** `node server/eval/run.js` arată hybrid + rerank peste vector-only, iar întrebările din afara corpusului primesc abstain.
- **F5:**
  - întrebarea fără răspuns duce la handoff → chatul se deschide pre-completat → managerul (al doilea browser) primește live → *Save to team docs* → aceeași întrebare primește răspuns cu citarea „Team FAQ”;
  - în modul anonim, `anonymous_questions` nu are `user_id` și `help_threads` nu are niciun rând.
- **F2 / F4:** #142 dă pași, întrebări și DoD cu surse; PR #57 clasifică corect nit / blocking / question.
- **F3:**
  - înregistrarea dă sarcinile corecte pentru Andrei și Maria (diarizare);
  - `meeting_notes` nu conține transcript.
- **F8:** diagrama se randează; outline-ul e citit de VoiceOver; un Mermaid invalid cade pe outline.
- **F9:** găsește golurile plantate (issue templates, „How to test”, alt text, politica de adaptări), cu dovezi.
- **F13:** gol sub 5 întrebări; afișat cu seed.
- **Siguranță:** un document cu „ignore previous instructions” nu are efect; citările duc la pagina corectă.
- **A11y:**
  - Lighthouse ≥ 95, axe fără erori critice;
  - demo-ul rulat doar din tastatură și cu VoiceOver;
  - 200% / 320px fără scroll orizontal.

---

## Surse
- Brief și grilă: documentele AA Hackathon (Google Doc + PDF RDCC) · [AccessABILITY Expo](https://www.rdcc.ro/event/accessability-expo/) · [Vocalio](https://vocalio.lovable.app/)
- Developeri: [SO Survey 2022, neurodivergenți (arXiv)](https://arxiv.org/pdf/2506.03840) · [Developeri nevăzători, provocări](https://wecount.inclusivedesign.ca/uploads/eliciting-programming-challenges-faced-by-developers-with-visual-impairments_exploratory-study.pdf) · [BLV software professionals (arXiv 2025)](https://arxiv.org/html/2501.19380v1) · [Autiști în SE (arXiv 2025)](https://arxiv.org/pdf/2511.02736) · [Dislexici în SE (arXiv 2025)](https://arxiv.org/pdf/2511.00706)
- Piață: [KI-InnOMATiV](https://ait.reha.tu-dortmund.de/en/research/current-projects/ki-innomativ/) · [78% neurodivergenți folosesc AI](https://allwork.space/2026/05/78-of-neurodivergent-employees-use-ai-at-work/) · [AXS Passport](https://www.verdantix.com/insights/blogs/diversity-and-ability-s-axs-passport-makes-reasonable-adjustments-smart-and-user-friendly) · [Goblin Tools](https://warwick.ac.uk/services/library/using/productivity-tools/magic-todo-gobin-tools) · [FTC vs accessiBe](https://techcrunch.com/2025/01/03/ftc-orders-ai-accessibility-startup-accessibe-to-pay-1m-for-misleading-advertising)
- Statistici: [TVR 1 din 10](https://tvrinfo.ro/doar-una-din-zece-persoane-din-romania-care-au-dizabilitati-este-angajata/) · [Newsweek 980.873](https://newsweek.ro/social/1000000-de-romani-au-certificat-de-handicap-care-e-handicapul-pentru-care-se-emit-cele-mai-multe-incadrari) · [Deloitte](https://www.supplychaindive.com/news/workers-are-willing-to-disclose-disability-but-dont-ask-for-accommodation/734878/) · [Inclusively](https://www.inclusively.com/press-release-new-inclusively-research-the-disclosure-gap-is-real/) · [JAN, costul adaptărilor](https://askjan.org/topics/costs.htm)
- Legal: [OUG 127/2024](https://mail.ceelegalmatters.com/dentons/28807-new-obligations-for-romanian-employers-regarding-the-hiring-of-persons-with-disabilities) · [AI Act, emotion recognition (FPF)](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/) · [AI Omnibus → dec. 2027](https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-omnibus-vii-deadline-delay-20260/) · [Legea 232/2022](https://www.amcham.ro/business-intelligence/new-accessibility-obligations-how-law-no-2322022-will-affect-economic-operators-starting-june-28-2025)
- Tehnic: [Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search) · [Contextual Retrieval](https://www.maginative.com/article/anthropics-contextual-retrieval-technique-enhances-rag-accuracy-by-67) · [Cohere Rerank 4](https://docs.pinecone.io/models/cohere-rerank-4-fast) · [OpenAI pricing](https://developers.openai.com/api/docs/pricing) · [GPT-5 params](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_new_params_and_tools) · [ElevenLabs pricing](https://elevenlabs.io/pricing/api) · [Scribe v2](https://www.mindstudio.ai/models/elevenlabs-scribe-v2)
