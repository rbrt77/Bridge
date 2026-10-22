# Plan: **OnRamp**: asistent AI de onboarding care adaptează firma la angajat
*AccessABILITY Hackathon 2026 · 22–23 oct · stop coding 23 oct 12:00 · nume de lucru (alternative: FirstStep, Bridge)*

---

## 0. Context

**Tema** este „First Job, Full Potential”. Ne cere un prototip funcțional, nu un chatbot generic. Prin el, persoanele cu dizabilități învață și lucrează autonom la primul job. Ideea-cheie din brief: *„adapt the workplace to the person”*.

**Ce avem.** Repo-ul `Accesibility` e gol (README + 2 fișiere test). Codul RAG de refolosit e în `~/Documents/GitHub/Internal_ai`; copia de pe Desktop are cod identic. E un RAG multi-tenant: React+Vite, Express, Supabase/pgvector și OpenAI.

**Decizii luate cu tine:**
- **Furnizori:** OpenAI + ElevenLabs, aleși pe cost și calitate (§5).
- **Frontend:** React+Vite din Internal_ai, refăcut accesibil.
- **Limba:** doar engleză (UI, corpus demo, legislație rezumată în EN).
- **Eroul demo-ului:** angajatul. Firma apare la final, ca model de business B2B.

**Rezultat urmărit:** un prototip live, cu 6 livrabile cerute de brief. Fiecare din cele 13 criterii de jurizare e acoperit explicit (§11).

---

## 1. Research: ce am aflat

### 1.1 Ce punctează juriul → cum răspundem
| Criteriu (1–5) | Răspunsul nostru |
|---|---|
| Impact + Theme adherence | Primele săptămâni la primul job: onboarding, proceduri, ședințe, adaptări. Acoperă toate cele 4 zone din slide-ul RDCC: Învățare, Productivitate, Comunicare, Acces |
| Accessibility & Inclusive design *(atenție specială)* | WCAG 2.2 AA nativ (nu overlay), 10 preseturi de nevoi, voce/tastatură, easy-read + pictograme |
| Innovation | AI care **transformă** conținutul firmei după profilul de nevoi, nu doar răspunde. Pe piață nu există combinația asta (§1.3) |
| Functionality / Performance / UX | 3 fluxuri end-to-end live; time-to-first-token < 2 s; flux în 3 pași, ca la Vocalio |
| Architectural complexity | Hybrid search (BM25 + vector, RRF) + reranker + Contextual Retrieval + glosar auto + eval măsurat |
| Meaningful AI | Adaptare de conținut, extragere structurată (pași, termene, sarcini), STT/TTS, diarizare, audit pe dovezi |
| Ethics/Privacy/Safety | Nevoi, nu diagnostic; mod anonim; k-anonimitate; fără emotion recognition (AI Act art. 5(1)(f)); citări + „nu știu” |
| Scalability/Feasibility | B2B SaaS + audit de incluziune; costuri pe utilizator calculate (§5); roadmap |
| Pitch | Demo scriptat de 3 min + număr de eval + citate din validarea de la Expo |

### 1.2 Câștigătorul anterior (Vocalio): ce preluăm
Vocalio (`vocalio.lovable.app`) a făcut un singur lucru, clar. Pacientul își spune povestea, AI-ul o structurează, iar rezultatul e agendă + întrebări + checklist pentru medic. Avea 3 pași, transformarea before→after, buton „Try Demo”, disclaimere de siguranță și mesajul „nu introduce date personale”.
→ **Preluăm:** flux în 3 pași, before/after vizibil (document dens → pași simpli), mod demo cu persona, disclaimere.
→ **Facem diferit:** AI ancorat în documentele firmei, cu citări, plus accesibilitate reală. Vocalio nu avea setări de accesibilitate.

### 1.3 Piața: ce există și ce lipsește
| Categorie | Exemple | Ce le lipsește |
|---|---|---|
| AI enterprise pe documente | M365 Copilot, Glean, Internal_ai | Nu adaptează conținutul pe nevoi; răspund din cunoștințe generale |
| Asistenți de ședință | Teams captions/recap, Otter, Fireflies, Ava | Nu sunt legați de cunoștințele firmei, nu adaptează output-ul; licențe scumpe |
| Productivitate neurodivergentă | Goblin Tools „Magic ToDo”, Tiimo | Generice: nu cunosc procedurile firmei, fără citări, fără remindere |
| Pașapoarte de adaptări | AXS Passport (UK), CloudRock/Workday, JobAccess (AU) | Centrate pe UK/AU; nu fac RAG pe politicile firmei; nu sunt legate de onboarding |
| Overlay-uri de accesibilitate | widget-ul RDCC, accessiBe, UserWay | Schimbă doar afișarea, nu sensul. FTC a amendat accessiBe cu $1M (2025) pentru promisiuni false de conformitate |
| Cercetare | TU Dortmund **KI-InnOMATiV** (2026–2028), AI adaptiv pentru onboarding în echipe mixte | E proiect de cercetare, nu produs. **Validează nevoia** |

**Gap-ul:** niciun produs nu leagă **documentația internă (RAG)** de **profilul funcțional** al angajatului. Nici nu închide bucla spre angajator, păstrând confidențialitatea.

### 1.4 Date pentru pitch (cu sursă)
- România: **~1 din 10** persoane cu dizabilități e angajată (TVR, feb. 2026). Avem **cel mai mare decalaj din UE** față de restul populației (~45 pp, Eurostat). 980.873 persoane cu certificat (ANPDPD, final 2025). Cota de 4% pentru firmele cu ≥50 angajați e adesea „plătită” la stat în loc de angajări.
- **Din 2025 (OUG 127/2024 + Ordinul 28/2025)**, angajatorii au obligații noi active: cerere scrisă către ONG-uri și raportare la ANPDPD/ANOFM. Firmele vor fi împinse să angajeze, deci au nevoie de onboarding incluziv.
- Deloitte (10.000 respondenți): **75%** dintre cei care și-au declarat dizabilitatea **nu au cerut niciodată o adaptare**. **74%** dintre cei care au cerut au primit cel puțin un refuz.
- Inclusively: **36%** nu știu ce resurse există, **28%** se tem pentru carieră, **18%** sunt intimidați de proces.
- Understood (2026): **78%** dintre angajații neurodivergenți folosesc deja AI la muncă. Dar AI-ul generic nu cunoaște firma și nu e sigur pentru datele ei.

### 1.5 Constrângeri legale și etice (folosite și ca argument)
- **GDPR art. 9:** dizabilitatea e dată de sănătate. Chiar și preferințele pot *dezvălui* sănătatea, deci le tratăm ca sensibile: owner-only, export/ștergere.
- **AI Act:**
  - art. 5(1)(f) interzice recunoașterea emoțiilor la locul de muncă, din feb. 2025;
  - art. 50 cere etichetarea conținutului AI, din aug. 2026;
  - Anexa III (AI pentru alocarea sarcinilor sau monitorizarea angajaților) e *high-risk*, cu termen mutat la **2 dec. 2027** prin AI Omnibus (Reg. 2026/1744).
  → **Nu facem monitorizare individuală, nici evaluare de performanță.** Dashboard-ul e strict agregat.
- **Adaptare rezonabilă:** Legea 448/2006, Directiva 2000/78/CE art. 5, CRPD art. 27. **EAA:** Legea 232/2022, în vigoare din 28 iun. 2025.

### 1.6 Widget-ul RDCC (de la care ai pornit)
Rulează pe `rdcc.ro` (`tool.negebu.com/businessdisability/.../accessi-widget.js`). Profilurile lui:
- Low Vision / Vedere slabă;
- Reading guide;
- Reading mask;
- Dyslexia (OpenDyslexic);
- Photosensitive epilepsy;
- 3× Color blindness;
- text-to-speech.

→ Le preluăm modelul mental, dar **etichetate pe nevoi** și **native** (§4.3).

---

## 2. Ce poți lua din Internal_ai: componentele RAG cu căi exacte
*(căi relative la `~/Documents/GitHub/Internal_ai/`)*

| Componentă | Unde | Ce face | Verdict |
|---|---|---|---|
| **Ingestie (upload admin)** | `server/routes/ingest.js:98-219` | PDF per pagină (`unpdf`, 129-142); DOCX (`mammoth.extractRawText`, 144-167) → PDF pentru preview (31-41); upload în Storage (177-187); zero-retention (199-203) | **Ia**. Schimbă DOCX pe `convertToHtml` + turndown, ca să păstrezi titlurile |
| Embedding în batch + rollback | `server/routes/ingest.js:44-95` (`processInBatches`) | Batch de 20, insert în `documents`, rollback la eroare | **Ia** |
| Ingestie din integrări | `server/sync/engine.js:31-173` (`runSync`), `notion.js`, `gdrive.js`, `confluence.js`, `scheduler.js` | Sync incremental pe `source_updated_at`, cron | **Nu** pentru hackathon (doar pe roadmap). Are bug-uri: șterge înainte de re-embed (71-79) și orfani la erori tranzitorii (114-127) |
| `sanitizeText` | `server/sync/engine.js:15-21` | Scoate null bytes și surogați | **Ia** |
| Ingestie Python | `scripts/ingest_files.py`, `ingest_confluence.py`, `ingest.py` | LangChain 1000/200; **un apel de embedding per chunk** (lent); ORG_ID hardcodat | **Nu** |
| **Chunking** | `server/utils/chunker.js:10-51` (`chunkWithOverlap`) | Pe paragrafe/propoziții, țintă 900 / max 1400 caractere. ⚠ **Nu face overlap**, deși așa se numește (`CHUNK_OVERLAP` din `ingest.js:24` e nefolosit) | **Ia + extinde** cu split pe titluri și overlap real |
| **Embeddings** | `chat.js:13,161-164`; `ingest.js:21,53-56`; `engine.js:8,24-27` | `text-embedding-3-small` (1536) | **Ia** |
| **Vector store** | tabela `documents` (`content`, `embedding`, `metadata` jsonb, `organization_id`, plus coloanele din `supabase/migrations/integrations.sql:37-43`) | pgvector. ⚠ **Schema `documents` și RPC-ul `match_documents` NU sunt în repo** (apar doar ca referință în `CLAUDE.md:197`) | **Rescrie** în migrarea nouă, cu FTS + HNSW |
| **Retrieval** | `server/routes/chat.js:139-184` | „Contextual query” = concatenarea ultimelor 3 ture, apoi vector-only `match_documents` (prag 0.5, top 5). Prag și număr configurabile per org | **Înlocuiește** cu hybrid + rerank (§6) |
| **Prompt** | `server/routes/chat.js:255-288` | Persona per org; citare `[Source: file]`. ⚠ La lipsă de context răspunde **din cunoștințe generale** (275-278) → halucinații. ⚠ Contextul stă în system prompt → prompt injection | **Rescrie** în mod strict, cu documentele marcate ca date nesigure |
| Bugete de tokeni / istoric | `server/routes/chat.js:22-28, 189-199, 242-253` | Trunchiere context 48k, fișiere 32k, istoric 16k caractere | **Ia** |
| Fișiere de sesiune + vision | `server/routes/upload.js:18-101` (extracție 59-79); `chat.js:201-240` (imagini prin signed URL, 208-230) | Upload PDF/DOCX/TXT/imagini per sesiune. ⚠ Trunchiat la 32k caractere, fără rezumare pe bucăți | **Ia** pentru „Understand a document” |
| **Streaming** | `server/routes/chat.js:166-173` (headere SSE), `290-307` (`{type:'content'}`), `351` (`[DONE]`); `server/index.js:34-41` (compresia ocolește SSE) | SSE cu evenimente JSON | **Ia** și adaugă evenimentele `status`, `enrich`, `done` |
| Parser SSE în client | `client/src/pages/ChatPage.jsx:220-261` | ⚠ **Bug:** face split pe `\n\n` per chunk de rețea, fără buffer, deci un eveniment tăiat se pierde. `[DONE]` iese doar din bucla internă | **Rescrie** (`lib/sse.js` cu buffer) |
| **Citarea surselor** | `server/routes/chat.js:309-350` (dedup pe nume, pagini agregate, path ascuns la zero-retention); `client/.../MessageBubble.jsx:50-94` (chip-uri de sursă cu `p.X`); `server/routes/documents.js:13-104` (signed URL cu verificare de org-path); `DocumentPreview.jsx` | Surse clicabile, cu preview | **Ia logica**; refă UI-ul accesibil |
| Infrastructură | `server/middleware/auth.js` (JWT Supabase), `utils/auth.js` (`getOrgForUser`), `utils/supabase.js` (client service + client user cu RLS), `middleware/rateLimiter.js`, `index.js` (helmet, CORS, shutdown), `routes/sessions.js`, `routes/chatTitle.js`, `supabase/migrations/add_rls_policies.sql` | Auth, multi-tenant, rate limit | **Ia aproape integral** |
| Admin | `server/routes/admin.js:55-99` (`/stats`), `AdminPage.jsx` | Carduri de statistici | **Ia `/stats` ca model.** ⚠ **NU porta** `admin.js:106-150` (`/users` = mesaje per utilizator + email). E monitorizare individuală, incompatibilă cu produsul |

**Nu copia:**
- `scripts/client_documents/` (conține un document real de client: `cerere pretentii 2026.docx`);
- ORG_ID-urile hardcodate;
- componentele UI ca atare. `ChatInput.jsx:40,59` are butoane-icon fără `aria-label`; `DocumentPreview.jsx:29` are butonul de închidere fără etichetă; `text-[10px]` și `text-slate-300` pe alb apar în ~15 fișiere; nu există `aria-live`; framer-motion rulează fără reduced-motion.

**Transparență:** în README declarăm ce e adaptat din proiectul anterior al echipei. Istoricul de commit-uri poate fi verificat de juriu.

---

## 3. Ideile voastre: ce le susține și ce lipsește

| # | Idee | Ce există în Internal_ai | Ce trebuie construit | Nivel |
|---|---|---|---|---|
| 1 | Asistent de onboarding adaptat profilului (easy-read, pași, audio, scurt/detaliat) | Pipeline-ul `chat.js` (auth/org 62-80, interogări paralele 82-121, SSE, surse), ingestie, chunker, sesiuni | `user_profiles` + wizard; `adapt.js` (profil → reguli + `verbosity`); hybrid+rerank+abstain; TTS; UI accesibil | **MUST** |
| 2 | Proceduri lungi → checklist cu pași mici | Retrieval; extracția din `upload.js` | Filtru `doc_type=procedure`; JSON structurat (pas, de ce, minute estimate, sursă); tabelele `checklists`; export `.ics` | **MUST** |
| 3 | Întrebări anonime „fără jenă”, cu sursa citată | Chat + citări | Cale fără log (azi `chat.js:187,358` salvează mereu); `anonymous_questions` **fără user_id**; redactare PII; săptămâna în loc de timestamp; coadă HR pentru întrebările fără răspuns | **MUST** |
| 4 | Glosar automat de jargon/acronime | Bucla de batch din ingestie | Prompt de extracție; tabela `glossary_terms`; pagina Glossary; chip-uri inline accesibile; expansiune de acronime în query | **SHOULD** |
| 5 | Rezumat accesibil + întrebări de verificare | `upload.js:59-79`, `session_documents`, vision | Rezumare map-reduce (fără trunchiere la 32k); quiz JSON; UI de quiz accesibil (fără timer) | **SHOULD** |
| 6 | Ghid de adaptări (politica firmei + lege) + mesaj către manager/HR | Retrieval | Corpus legal în EN (CRPD 27, Dir. 2000/78 art. 5, Legea 448/2006 + OUG 127/2024, GDPR 9); retrieval dublu (firmă + lege); scrisoare **doar cu nevoi**, editabilă, niciodată trimisă automat; disclaimer | **MUST** *(e exemplul explicit din brief)* |
| 7 | Pregătire pentru ședințe din documente | Retrieval | Agendă → multi-query pe fiecare punct → brief (termeni, ce se așteaptă de la tine, reguli nescrise) | COULD |
| 8 | Quiz-uri personalizate din training | Generatorul de la #5 | `doc_type=training`; repetiție spațiată locală | COULD |
| 9 | Q&A prin voce (STT/TTS) | Nimic (doar config-ul `multer` din `upload.js`) | Microfon prin Web Speech API; `/api/voice/transcribe`, `/api/voice/tts`; player accesibil | **MUST** |
| 10 | Dashboard anonimizat pentru manageri | Modelul `admin.js:55-99` `/stats`, `AdminPage.jsx` | Etichetare pe teme; RPC cu **k ≥ 5**; goluri de conținut; scor de lizibilitate pe document; zero metrici per persoană | **SHOULD** |
| C1 | *(coleg)* To-do personal după ședință, confidențial | `multer` | ElevenLabs Scribe v2 (diarizare); identificarea lui „eu” (nume/rol/alias); sarcini + citat + termen; rezumat easy-read; jargon explicat prin RAG; `.ics`; transcriptul procesat **tranzitoriu** | **MUST** |
| C2 | *(coleg)* Ranking: ce trebuie implementat în firmă | Baza de cunoștințe (`documents`) + retrieval | Catalog de ~12 criterii cu temei legal; retrieval pe criteriu + LLM-judge pe dovezi (citate); scor și ranking; raport | **MUST v1 (10 criterii)** |
| N1 | *(caiet)* „input user → AI → JSON” | — | Text liber opțional în wizard → JSON de preferințe (Structured Outputs). Diagnosticul eventual menționat **e ignorat și nu e stocat**. Utilizatorul confirmă | **MUST** |
| N2 | *(caiet)* „visual output for learning”, onboarding specific | Generatorul de checklist | „Your first week”: plan vizual (carduri pe zile + pictograme), generat din ghidul de onboarding și rol | SHOULD |
| N3 | *(caiet)* coleg surd în ședințe online | — | Pagină cu subtitrare live (Web Speech API), „What did I miss?” (rezumă ultimele N minute), apoi „Generate my tasks” | SHOULD (type-to-speak = COULD) |

---

## 4. Produsul

### 4.1 Concept
**„The workplace adapts to you.”** Angajatul își setează un **profil de nevoi**, nu un diagnostic. Orice informație a firmei trece printr-un **Adaptation Engine**: RAG hibrid → transformare după profil → randare accesibilă (text, pași, pictograme, audio).

Bucla se închide spre angajator anonim:
- întrebări fără răspuns → goluri de conținut;
- audit → priorități.

### 4.2 Fluxul principal (3 pași, ca Vocalio)
1. **Tell us how you work best.** Wizard de 5 ecrane plus text liber opțional → JSON de preferințe, confirmat de utilizator.
2. **Ask or upload anything.** Întrebare, procedură, document sau înregistrare de ședință.
3. **Get it your way.** Pași, pictograme, audio, to-do și remindere, cu sursele citate.

### 4.3 Preseturi de accesibilitate (pe nevoi; combinabile; se salvează doar setările)
| Preset (etichetă UI) | Indiciu opțional în UI (nu se salvează) | Afișare | Output AI | Interacțiune |
|---|---|---|---|---|
| Bigger & higher contrast | low vision | text 150%, temă de contrast mare, focus gros, fără animații | blocuri scurte, titluri | — |
| I use a screen reader | blind | layout curat, fără conținut doar la hover | structură înainte de toate (titluri, liste, fără tabele), anunț la final | auto-read, scurtături |
| Captions & visuals | Deaf / HoH | alerte vizuale, subtitrări implicite | engleză literală, fără idiomuri; cuvinte-cheie + pictograme | live captions, transcript, type-to-speak |
| Keyboard / voice only | motor | ținte ≥ 44px, focus vizibil | — | voice input, scurtături, fără limite de timp |
| Reading support | dyslexia | OpenDyslexic sau Atkinson, spațiere, riglă/mască de citire, fără italice | paragrafe scurte, info-cheie bold | TTS cu evidențierea cuvântului |
| Focus & reminders | ADHD | focus mode | TL;DR primul, micro-pași cu minute estimate | `.ics`, o sarcină pe rând |
| Clear & predictable | autism | paletă calmă, layout constant | limbaj literal, „ce urmează”, reguli nescrise explicate | fără pop-up-uri surpriză |
| Plain language + pictures | cognitive / intellectual | text mare, pictograme | reguli Easy Read (≤ 15 cuvinte/propoziție, o idee/propoziție, cuvinte grele explicate) | audio peste tot, simple mode |
| No flashing | photosensitive epilepsy | oprește orice animație/autoplay | — | — |
| Color-safe | color blindness | paleta Okabe-Ito, iconițe + modele, nu doar culoare | — | — |

**Fine-tune:**
- mărime text (100–200%), line/letter spacing, font (Atkinson Hyperlegible implicit, OpenDyslexic, Lexend);
- temă (light/dark/high-contrast/galben pe negru), reduce motion, reading ruler;
- lungime (scurt/normal/detaliat → `verbosity`), nivel de limbaj, pictograme on/off, TTS automat.

Panoul e accesibil de pe orice pagină: buton fix plus `Alt+A`. Butoanele **Export / Delete my profile** acoperă drepturile GDPR.

### 4.4 Pagini (≤ 5 în navigația principală)
- `/start` (wizard + „Try demo persona”);
- `/` Today (planul „Your first week”, sarcini, remindere);
- `/ask` (chat adaptiv + comutator **Ask anonymously**);
- `/procedures`;
- `/meetings` (live captions, upload înregistrare → My tasks);
- `/adjustments` (ghid + scrisoare);
- `/glossary`, `/understand` (upload document → rezumat + verificare), `/settings`;
- `/about-ai` (transparență, AI Act art. 50);
- admin: `/company/documents`, `/company/audit`, `/company/insights`.

---

## 5. Arhitectură și furnizori (cost/calitate verificate oct. 2026)

```
client (React 19 + Vite + Tailwind + react-aria-components)
   │  HTTPS + SSE (fetch streaming, parser cu buffer)
server (Express 5; refolosit din Internal_ai)
   ├─ routes: ask(SSE) · ingest · upload · documents · procedures · understand · meetings · adjustments · audit · insights · voice · glossary · profile
   ├─ services: retrieval (hybrid+rerank+abstain) · adapt (profil→reguli) · llm · embeddings · rerank · contextualize · glossary · pictograms(ARASAAC) · privacy(PII, k-anon) · ics
   └─ prompts/*.js (versionate) · data/(audit_criteria.json, legal/*.md) · eval/(golden.json, run.js)
Supabase (Frankfurt): Postgres + pgvector(HNSW) + FTS('english') + RLS + Auth + Storage
Externe: OpenAI · Cohere Rerank · ElevenLabs Scribe · ARASAAC · Web Speech API (browser)
```

| Nevoie | Alegere | Preț | De ce |
|---|---|---|---|
| Generare și adaptare (user-facing) | **OpenAI `gpt-5-mini`**, Responses API, `reasoning.effort:'minimal'`, `text.verbosity` = low/medium/high (= scurt/normal/detaliat) | $0.25 in / $2.00 out per 1M | Calitate peste `gpt-4.1-mini` la input mai ieftin; `verbosity` se mapează direct pe profil. Fallback prin `CHAT_MODEL=gpt-4.1-mini` dacă TTFT e prea mare |
| Taskuri de fundal (context pe chunk, glosar, query rewrite, enrich, teme, fallback de rerank) | **`gpt-5-nano`** | $0.05 / $0.40 (input din cache $0.005) | De 5× mai ieftin; prompt caching automat (documentul pus primul) |
| Embeddings | **`text-embedding-3-small`** (1536) | $0.02 / 1M | Cod refolosit; foarte bun pe engleză. Comparăm cu `3-large@1536` în eval (10 min) |
| Reranker | **Cohere Rerank 4 Fast** (cheie trial, fără card; `rerank-v3.5` e redirecționat automat), fallback `gpt-5-nano` listwise | trial gratuit, apoi ~$0.002/căutare | Un cross-encoder dă cel mai mare câștig de precizie; multilingv pentru roadmap-ul în română |
| Întrebări vocale (STT) | **Web Speech API** (Chrome/Safari), fallback `gpt-4o-mini-transcribe` | gratuit / $0.003/min | Latență zero, cost zero |
| Înregistrări de ședință (STT + cine a vorbit) | **ElevenLabs Scribe v2** (`diarize=true`, timestamps pe cuvânt; până la 32 de vorbitori) | $0.22/oră | Diarizarea e esențială pentru „sarcinile mele”; cea mai ieftină opțiune cu diarizare |
| Subtitrare live | Demo: **Web Speech API**. Producție: ElevenLabs Scribe v2 Realtime | gratuit / $0.39/oră (~150 ms) | Cel mai ieftin streaming plătit (OpenAI realtime $1.02/h, Deepgram ~$0.46/h) |
| Citire cu voce (TTS) | **`speechSynthesis`** din browser (implicit) + **OpenAI `gpt-4o-mini-tts`** cu `instructions` („speak slowly, pause between steps”) pentru profilurile cognitive | gratuit / ~$0.015/min | Ritmul controlabil e un plus de accesibilitate și costă ~2,5× mai puțin decât ElevenLabs |
| Type-to-speak (COULD) | ElevenLabs Flash | $0.04 / 1K caractere, ~75 ms | Doar unde contează latența |
| Pictograme | **ARASAAC API** (`/api/pictograms/en/bestsearch/{kw}` → `static.arasaac.org/pictograms/{id}/{id}_300.png`, testat) | gratuit, CC BY-NC-SA (atribuire obligatorie; pentru uz comercial e nevoie de acord, pe roadmap) | Pictograme validate în AAC |

**Unit economics (pentru pitch):**
- Q&A + rerank ≈ **$0.6 / utilizator activ / lună** (150 întrebări);
- ședințe ≈ **$0.22 / oră** transcrisă.
→ Lasă loc pentru un preț B2B de **€5–10 / angajat / lună**, ipoteză de validat.

**Chei:** `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`, `COHERE_API_KEY`, Supabase (URL, anon, service).

---

## 6. RAG v2: tehnicile cele mai bune, concret

**Ingestie** (`server/services/ingest.js`, adaptat din `ingest.js` + `chunker.js`):
1. **Parsare cu structură.** PDF per pagină (refolosit). DOCX → HTML → Markdown (`mammoth.convertToHtml` + `turndown`), ca să păstrezi titlurile, listele și tabelele.
2. **Curățare.** `sanitizeText` (refolosit).
3. **Chunking pe titluri.** Split pe headings, apoi `chunkWithOverlap` pe fiecare secțiune. Adaugă **overlap real**: ultima propoziție, ~150 caractere. Salvează `section_path` („Handbook › Leave › Sick leave”), `page` și `chunk_index`.
4. **Contextual Retrieval (Anthropic).** `gpt-5-nano` primește documentul întreg (prefix în cache) plus chunk-ul și scrie 1–2 propoziții de context, salvate în `context`. Studiul Anthropic: −49% eșecuri de retrieval cu context + BM25; **−67%** adăugând reranking.
5. **Embedding** pe `context + content`, cu batch și rollback (refolosit).
6. **FTS.** Coloană generată `to_tsvector('english', context || ' ' || content)` + index GIN.
7. **Glosar.** `gpt-5-nano` scoate termeni și acronime (JSON strict) → `glossary_terms`, cu chunk-ul sursă.
8. **Metadate pe document.** `doc_type` (policy/procedure/training/meeting/legal) și scor de lizibilitate (lungimea propozițiilor, % cuvinte lungi). Scorul alimentează dashboard-ul.

**Retrieval** (`server/services/retrieval.js`):
1. **Query rewrite.** `gpt-5-nano` face întrebarea de sine stătătoare din istoric (înlocuiește concatenarea din `chat.js:142-159`). Plus expansiune de acronime din `glossary_terms`.
2. **RPC `hybrid_search`** după modelul Supabase: FTS (`websearch_to_tsquery('english')`) top 40 + vector (HNSW cosine) top 40 → **RRF (k=60)** → top 30. Filtre: org, `access_group`, `doc_type`.
3. **Rerank.** Cohere top 30 → **top 6** cu `relevance_score`. Fallback: LLM; apoi ordinea RRF.
4. **Abstain.** Dacă scorul maxim < τ (calibrat pe eval; start 0.25), răspunsul e *„I couldn't find this in company documents”*, cu butonul **Ask HR anonymously**.
5. **Context.** Vecinii (`chunk_index ± 1`) pentru top 3, dedup, buget ~12k tokeni (logica din `chat.js:189-199`). Etichete `[S1]…[S6]` cu titlu, secțiune și pagină.

**Generare** (`server/services/adapt.js` + `server/prompts/`):
- `gpt-5-mini` streamed prin SSE. Evenimente: `status` (pentru anunțuri a11y), `content`, `sources`, `enrich`, `error`, `done`.
- **Mod strict:**
  - răspunde doar din `<documents>`, marcate ca date nesigure și mutate **din system prompt în mesajul user**;
  - citări `[S#]`; validare post-stream (citările inexistente se șterg);
  - nu deduce și nu menționează nicio dizabilitate;
  - informația legală e marcată „informational, not legal advice”.
- **Regulile de profil**, generate din preferințe: Easy Read, pași numerotați, TL;DR primul, limbaj literal, structură pentru screen reader, `verbosity`.
- **Enrich în paralel** (`gpt-5-nano`, JSON strict): `{tldr, steps[], deadlines[], glossary_terms_used[], pictogram_keywords[]}`. UI-ul afișează din ele checklist, remindere, pictograme și chip-uri de glosar.
- **Re-adaptare** (Shorter / Simpler / More detail / As steps) pe retrieval-ul din cache. Nu repetă căutarea, deci e rapidă.

**Eval** (`server/eval/golden.json` + `run.js`). 25 de întrebări pe corpusul demo (document și secțiune așteptate) + 5 în afara corpusului.
- Comparăm hit@1, hit@5 și MRR pentru: vector-only (≈ Internal_ai) vs hybrid vs hybrid + rerank vs + context.
- Măsurăm și acuratețea abstain-ului, plus metrici easy-read înainte/după.
- **Tabelul rezultat intră în pitch.**

---

## 7. Date și confidențialitate

**Migrarea `supabase/migrations/001_init.sql`** (+ `002_rls.sql`). Tabelele:
- `organizations`, `organization_members` (preluate, simplificate);
- `kb_documents`;
- `documents` (chunk-uri: `context`, `fts`, `embedding vector(1536)` HNSW, `section_path`, `page`, `chunk_index`, `doc_type`, `access_group`);
- `glossary_terms`, `user_profiles` (`prefs jsonb`, **fără câmp de diagnostic**);
- `sessions`, `chat_messages`, `anonymous_questions` (**fără user_id**: `question_redacted`, `topic`, `answered`, `week`);
- `checklists`, `checklist_items`, `meeting_notes` (doar sarcinile mele + rezumat, fără transcript);
- `audit_criteria`, `audit_runs`, `audit_findings`.

RPC-uri: `hybrid_search(...)`, `insights_topics(org, k_min=5)`, `insights_gaps(org, k_min=5)`.

**Reguli:**
- RLS owner-only pe toate tabelele personale.
- Pe `documents` nu se citește direct prin PostgREST; accesul trece doar prin RPC sau server.
- `anonymous_questions` se scrie doar de server; adminul citește doar agregatele cu k ≥ 5.
- Pentru `/api/anon` nu se loghează IP-ul (redact în pino).
- Ședințe: banner de consimțământ pentru participanți; fără sentiment/emotion; fără scoruri de performanță.
- Orice text către manager pleacă doar după ce utilizatorul îl editează și aprobă (copy / mailto). Nu există trimitere automată.
- Opțiunea zero-retention e preluată (`allow_view`).
- Datele stau în UE (Frankfurt). OpenAI, ElevenLabs și Cohere sunt procesatori; DPA și rezidența datelor sunt pe roadmap.

---

## 8. Accessibility by design (checklist de implementare)

**Structură și tastatură:**
- landmarks, un singur `h1`, skip link, `lang="en"`;
- totul operabil din tastatură, cu focus vizibil (3px, contrast ≥ 3:1);
- scurtături documentate (`Alt+A`, `Alt+Q`, `Esc`);
- focus mutat la schimbarea de rută și în dialoguri (react-aria);
- ținte ≥ 44px.

**Screen reader:**
- regiune `aria-live="polite"` cu statusuri: *Searching documents… / Writing… / Answer ready*;
- răspunsul se anunță **o dată, la final**, nu token cu token; există buton „Read answer”;
- toate butoanele-icon au etichetă;
- sursele sunt listă cu pagini;
- pictogramele au `alt` = cuvântul-cheie; sunt decorative (`alt=""`) când textul e deja lângă.

**Vizual:**
- contrast ≥ 4.5:1 (7:1 în high-contrast); reflow la 320px și la 200% zoom; text-spacing (1.4.12);
- niciodată doar culoarea ca semnal; fără text justificat;
- `prefers-reduced-motion` plus oprire manuală; nimic nu clipește.

**Cognitiv:**
- navigare și ajutor consistente (3.2.3, 3.2.6); autentificare accesibilă (3.3.8: magic link, fără CAPTCHA);
- microcopy simplu; focus mode; undo.

**Auz:** subtitrări și transcript pentru orice audio; notificări vizuale.

**Unelte:** `eslint-plugin-jsx-a11y`, `@axe-core/react` în dev, Lighthouse a11y ≥ 95, testare manuală cu **VoiceOver** (macOS), **NVDA** (dacă aveți Windows) și **keyboard-only**.

---

## 9. Structura repo-ului (`Accesibility/`): copiat / adaptat / nou

**Copiat (aproape neschimbat) din Internal_ai:**
- `server/{index.js, env.js}`;
- `server/middleware/{auth,rateLimiter}.js`;
- `server/utils/{supabase,auth,logger}.js`;
- `server/routes/{documents,upload,sessions}.js`;
- configurările client (`vite`, `tailwind`, `postcss`, `eslint`), `client/src/supabaseClient.jsx`, plus pattern-ul de auth și SessionGuard din `App.jsx`.

**Adaptat:**
- `server/utils/chunker.js` (titluri + overlap);
- `server/routes/ingest.js` → `services/ingest.js`;
- `server/routes/chat.js` → `routes/ask.js`, care deleagă către `services/retrieval.js` + `services/adapt.js`;
- logica de surse din `MessageBubble.jsx` → `components/SourceList.jsx` accesibil.

**Nou:**
- `client/src/a11y/` (`SettingsProvider`, `presets.js`, `AccessibilityPanel`, `ReadingRuler`, `LiveAnnouncer`, `SkipLink`);
- `client/src/components/` (`AdaptiveAnswer`, `PictogramStrip`, `GlossaryTerm`, `Checklist`, `AudioButton`, `VoiceInput`, `Quiz`, `Captions`);
- `client/src/lib/` (`sse.js` cu buffer, `api.js`, `ics.js`, `speech.js`);
- pagini (§4.4);
- `server/services/*`, `server/prompts/*`, `server/routes/{procedures,understand,meetings,adjustments,audit,insights,voice,glossary,profile}.js`;
- `server/data/audit_criteria.json`, `server/data/legal/*.md`, `server/eval/*`;
- `supabase/migrations/*`;
- `demo-corpus/`;
- `README.md` (livrabilele 2–4 și 6).

**Corpusul demo** e o firmă fictivă, *Brightline Software SRL*, în EN:
- Employee Handbook (dens, plin de acronime: PTO, HRIS, OKR, CAB, SLA, RACI);
- New Joiner Guide;
- Expense Reimbursement Procedure (18 pași cu termene);
- IT Security Training;
- Workplace Adjustments Policy, **intenționat incompletă**: fără termene și fără clauză de confidențialitate, ca auditul să găsească goluri reale;
- o înregistrare de sprint planning de 2–3 min, jucată de voi (autentică, gratuită);
- `legal/`: rezumate EN pentru CRPD art. 27, Dir. 2000/78 art. 5, Legea 448/2006 (adaptare rezonabilă, cota de 4%, art. 78), OUG 127/2024 + Ordinul 28/2025, GDPR art. 9, AI Act art. 4/5/50, EAA / Legea 232/2022.

**Criteriile de audit (v1, 10–12):**
- proces scris de adaptări (cine, cum, în cât timp, confidențialitate);
- confidențialitatea datelor de sănătate;
- recrutare accesibilă;
- materiale de onboarding accesibile;
- norme pentru ședințe (agendă înainte, subtitrări, follow-up scris);
- muncă flexibilă ca adaptare;
- achiziții IT cu WCAG 2.2 / EN 301 549;
- training pentru manageri;
- persoană de contact / ERG / canal anonim;
- plan de evacuare personalizat (PEEP);
- AI în HR fără emotion recognition;
- obligațiile de cotă și raportare (≥ 50 angajați).

Fiecare criteriu are `impact`, `effort`, `mandatory`, `query_hints`, `legal_basis`.
- **Formula de prioritate:** `impact × (mandatory ? 1.5 : 1) × {missing:1, partial:0.5, present:0} / effort`.
- **Formularea onestă:** *„no evidence found in uploaded documents”*, nu „firma nu are”.

---

## 10. Execuția în ~22h (4 oameni + eu)

**Track-uri:**
- **A. RAG/backend:** schema, ingestie, hybrid, rerank, `/ask`, eval, audit, glosar. Lucrez în pereche cu A.
- **B. Frontend/a11y:** shell, setări/preseturi, wizard, AdaptiveAnswer, keyboard/screen reader.
- **C. Funcții AI:** proceduri, ședințe (Scribe), adaptări + scrisoare, voce, understand/quiz.
- **D. Produs/validare/pitch:** corpus demo + legal + criterii; Expo; deck; README; video de backup; UI de insights cu ajutorul meu.

| Interval | Livrabil |
|---|---|
| 22 oct 13:30–15:00 | Repo bootstrap (copierea din §9), proiect Supabase EU + `001_init.sql`, `.env`, corpus v1. **D:** workshopul „Disability Inclusion at Work” (13:30–14:30, 25 de locuri) și primele interviuri la Expo |
| 15:00–19:00 | **A:** ingestie v2 + `hybrid_search` + rerank + `/ask` cu surse și abstain. **B:** shell + preseturi + wizard + pagina Ask cu `sse.js`. **C:** procedures + understand (JSON structurat). **D:** corpus complet + criterii + interviuri |
| **19:00 · Milestone 1** | *Ask → răspuns adaptat cu citări*, end-to-end |
| 19:00–24:00 | **A:** contextual retrieval + glosar + eval. **B:** AdaptiveAnswer (pictograme, chip-uri de glosar, TTS, re-adaptare), UI pentru checklist. **C:** meetings (Scribe → My tasks), adjustments (ghid + scrisoare), voce. **D:** audit v1 + deck v1 |
| **24:00 · Milestone 2** | Toate funcțiile MUST merg |
| 00:00–05:00 | SHOULD: insights k-anon, live captions + „What did I miss?”, „Your first week”, quiz; **prima trecere a11y** (axe, Lighthouse, tastatură) |
| 05:00–08:00 | Deploy: client pe Vercel, Express pe Render/Railway (SSE ok); seed; bug bash pe fiecare persona; **a doua trecere a11y** (VoiceOver/NVDA); TTFT < 2 s |
| 08:00–10:00 | **Test de utilizare la Expo** cu 2–3 persoane cu dizabilități / ONG-uri; integrăm citatele. **Feature freeze la 10:00** |
| 10:00–12:00 | Video de backup al demo-ului, README cu livrabilele, deck final, 3 repetiții de pitch. **12:00 stop** |

**Cut-line:** dacă Milestone 2 nu e atins la 24:00, renunțăm la tot ce e COULD, apoi la insights și la pictograme.
**Commit-uri:** mici, frecvente, cu mesaje clare. Juriul poate verifica istoricul.

---

## 11. Validare, livrabile, pitch

**Validare (criteriul „Validation”).** Expo-ul are loc **în aceeași clădire** și se adresează a 3.000+ vizitatori, cu peste 100 de expozanți (ONG-uri, angajatori).

Pentru oameni, folosim un script de 5 întrebări:
1. Ce a fost cel mai greu în primele săptămâni?
2. Ce document sau procedură n-ai înțeles?
3. Ai evitat să întrebi ceva? De ce?
4. Ce te-ar fi ajutat în ședințe?
5. Ai cerut vreodată o adaptare? Ce te-a oprit?

Pentru angajatori și HR:
- Cum faceți onboarding acum?
- Ce vă oprește să angajați?
- Ați plăti pentru asta?

Notăm citate anonimizate, cu acord. ONG-urile de căutat la Expo (de verificat pe loc): asociațiile nevăzătorilor și surzilor, Fundația Motivation, Fundația Pentru Voi (easy-read), organizații de autism.

**Cele 6 livrabile:**
1. Repo cu istoric;
2. Descriere scurtă, în README;
3. Nevoia + validarea (README + slide);
4. Accesibilitatea (README: checklist §8 + scoruri Lighthouse/axe);
5. Deck + demo live, plus video de backup;
6. Next steps (roadmap).

**Pitch de 6 min:**
1. Hook cu persona + 2 statistici (0:30).
2. Problemă + validare (0:45).
3. **Demo live (3:00):**
   - wizard;
   - aceeași întrebare pe două profiluri (*Plain language + pictures*, cu audio lent, vs *Screen reader*);
   - procedura de 18 pași → checklist + `.ics`;
   - înregistrarea de ședință → **My tasks**, cu jargonul explicat din glosar;
   - nevoia „captions + written instructions” → ghid (politica firmei + lege) → mesaj către manager doar cu nevoi;
   - 20 s pe partea de firmă: ranking-ul de audit + insights anonime.
4. Tehnic și Responsible AI, cu tabelul de eval (0:45).
5. Business + roadmap (0:30).

**Roadmap:**
- limba română (FTS `romanian` + `unaccent`; ARASAAC are deja RO);
- integrări Teams/Slack/Google Calendar;
- Scribe Realtime;
- avatar LSR;
- SSO, nod on-prem;
- pilot cu un membru RDCC și cu AJOFM.

**Q&A pregătit:** De ce nu Copilot? Halucinații? Unde stau datele? Cum ați validat? Cost per angajat? Diferența față de un overlay? Ce faceți cu diagnosticul? *(Nu îl colectăm.)*

---

## 12. Verificare (end-to-end)

- `npm run dev` (root: client :5173 + server :3000).
- Ingestia `demo-corpus/` prin `/company/documents`. Verifică în SQL: `fts`, `context` și `embedding` sunt populate; glosarul are ≥ 15 termeni.
- `node server/eval/run.js` afișează tabelul hit@5 / MRR pentru vector vs hybrid vs hybrid+rerank. Ținta: hybrid+rerank peste vector-only, iar întrebările din afara corpusului primesc abstain.
- **Siguranță:**
  - un document cu „ignore previous instructions” nu are niciun efect;
  - la o întrebare din afara corpusului, sistemul răspunde „couldn't find” și nu inventează;
  - citările `[S#]` duc la pagina corectă.
- **Confidențialitate:**
  - după o întrebare anonimă, `anonymous_questions` nu are `user_id`, iar `chat_messages` nu are niciun rând nou;
  - insights e gol pentru grupuri < 5;
  - tabela `meeting_notes` nu conține transcriptul.
- **Accesibilitate:**
  - Lighthouse a11y ≥ 95 pe toate paginile, axe fără erori critice;
  - scriptul de demo rulat **doar din tastatură** și **cu VoiceOver**;
  - zoom 200% și lățime 320px fără scroll orizontal;
  - preseturile schimbă vizibil UI-ul și output-ul.
- **Voce:** mic → întrebare (Chrome); TTS lent pe profilul cognitiv; înregistrarea de ședință → sarcini atribuite corect persoanei „me” (diarizare).
- Audit v1 pe corpusul demo: găsește cel puțin golurile plantate în Workplace Adjustments Policy, cu citate.

---

## Surse
- Brief și grilă: documentele AA Hackathon (Google Doc + PDF RDCC); [AccessABILITY Expo](https://www.rdcc.ro/event/accessability-expo/); [Vocalio](https://vocalio.lovable.app/)
- Piață: [KI-InnOMATiV (TU Dortmund)](https://ait.reha.tu-dortmund.de/en/research/current-projects/ki-innomativ/) · [78% neurodivergenți folosesc AI](https://allwork.space/2026/05/78-of-neurodivergent-employees-use-ai-at-work/) · [AXS Passport](https://www.verdantix.com/insights/blogs/diversity-and-ability-s-axs-passport-makes-reasonable-adjustments-smart-and-user-friendly) · [CloudRock/Workday](https://erp.today/cloudrock-unveils-a-built-on-workday-solution-for-inclusive-workplaces) · [Goblin Tools](https://warwick.ac.uk/services/library/using/productivity-tools/magic-todo-gobin-tools) · [Teams sign-language pop-out](https://windowsreport.com/microsoft-teams-to-soon-make-meetings-more-accessible-with-persistent-pop-out-interpreter-video/) · [FTC vs accessiBe](https://techcrunch.com/2025/01/03/ftc-orders-ai-accessibility-startup-accessibe-to-pay-1m-for-misleading-advertising)
- Statistici: [TVR 1 din 10](https://tvrinfo.ro/doar-una-din-zece-persoane-din-romania-care-au-dizabilitati-este-angajata/) · [Newsweek 980.873](https://newsweek.ro/social/1000000-de-romani-au-certificat-de-handicap-care-e-handicapul-pentru-care-se-emit-cele-mai-multe-incadrari) · [Deloitte via SupplyChainDive](https://www.supplychaindive.com/news/workers-are-willing-to-disclose-disability-but-dont-ask-for-accommodation/734878/) · [Inclusively](https://www.inclusively.com/press-release-new-inclusively-research-the-disclosure-gap-is-real/) · [Conference Board of Canada](https://www.signal49.ca/in-fact/insights-on-disclosure-and-accommodations-for-employees_oct2025/)
- Legal: [OUG 127/2024 (Dentons)](https://mail.ceelegalmatters.com/dentons/28807-new-obligations-for-romanian-employers-regarding-the-hiring-of-persons-with-disabilities) · [ANOFM 2026, cota 4%](https://www.anofm.ro/valcea/wp-content/uploads/sites/41/2026/04/Comunicat-facilitati-persoane-cu-dizabilitati-SITE.pdf) · [AI Act emotion recognition (FPF)](https://fpf.org/blog/red-lines-under-eu-ai-act-unpacking-the-prohibition-of-emotion-recognition-in-the-workplace-and-education-institutions/) · [AI Omnibus → dec. 2027](https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-omnibus-vii-deadline-delay-20260/) · [Legea 232/2022 (AmCham)](https://www.amcham.ro/business-intelligence/new-accessibility-obligations-how-law-no-2322022-will-affect-economic-operators-starting-june-28-2025)
- Tehnic: [Supabase hybrid search](https://supabase.com/docs/guides/ai/hybrid-search) · [Contextual Retrieval (rezumat)](https://www.maginative.com/article/anthropics-contextual-retrieval-technique-enhances-rag-accuracy-by-67) · [Cohere Rerank 4](https://docs.pinecone.io/models/cohere-rerank-4-fast) · [OpenAI pricing](https://developers.openai.com/api/docs/pricing) · [GPT-5 params](https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_new_params_and_tools) · [ElevenLabs API pricing](https://elevenlabs.io/pricing/api) · [Scribe v2 diarizare](https://www.mindstudio.ai/models/elevenlabs-scribe-v2) · [Deepgram pricing](https://diyai.io/ai-tools/speech-to-text/deepgram-pricing-2026/) · [Soniox RO](https://soniox.com/speech-to-text/use-cases/voice-agents/romanian) · ARASAAC API (testat live: `api.arasaac.org/api/pictograms/en/bestsearch/meeting`)
