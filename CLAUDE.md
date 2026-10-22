# OnRamp: instrucțiuni pentru Claude Code

Planul e în [PLAN.md](PLAN.md), împărțirea pe track-uri în [docs/TRACKS.md](docs/TRACKS.md), contractul API în [docs/API.md](docs/API.md).

## Tracking task-uri (Google Sheet)

Echipa ține evidența task-urilor în sheet-ul **OnRamp checklist**:
https://docs.google.com/spreadsheets/d/1kDsLvu0M_iSz9_8_xBRAYz-h2QAwJZK9ITNdLFuydAk/edit

| Tab | Cine | Branch |
|---|---|---|
| `A - Stan Alexandru` | Stan Alexandru, RAG / backend core | `a/...` |
| `B - Tudorache Robert` | Tudorache Robert, frontend / accesibilitate | `b/...` |
| `C - David Nedelcu` | David Nedelcu, funcții AI pe artefacte | `c/...` |
| `D - Onete Alexandru` | Onete Alexandru, corpus, date + cod (F7, F9, F10, F13) | `d/...` |
| `Pitch - toți` | toată echipa | — |
| `Rezumat` | calculat automat, **nu se editează** | — |

Sheet-ul are prioritate față de TRACKS.md la împărțirea task-urilor (pitch-ul e al tuturor, iar F7, F9, F10 și F13 sunt la D).

### Când actualizezi sheet-ul

După fiecare `git push` (și oricând un task e terminat sau blocat), actualizezi sheet-ul **înainte să răspunzi** utilizatorului:

1. **Află tab-ul persoanei** după prefixul branch-ului (`a/`, `b/`, `c/`, `d/`) sau după `git config user.name`. Dacă tot nu e clar, întreabă o dată.
2. **Află task-ul** după ID-ul din mesajele de commit (ex. `[A5]`), altfel după fișierele modificate (`git log origin/main..HEAD --stat` sau ultimele commit-uri împinse), comparate cu coloana „Unde (fișiere)”. Citește tab-ul înainte (`get_values` pe `'<tab>'!A3:L`).
3. **Scrie pe rândul task-ului:**
   - `Status` (coloana F): `Gata` dacă criteriul din „Gata când” (coloana E) e îndeplinit, altfel `În lucru` sau `Blocat`;
   - `Început` (G): dacă e gol, ora primului commit pe task;
   - `Terminat` (H): ora push-ului, doar când Status = `Gata`;
   - `Note` (L): 1 rând cu ce s-a făcut + hash-ul scurt al commit-ului. Păstrezi nota existentă și adaugi după `; `.
   - Datele se scriu ca `2026-10-22 16:30`.
4. **Nu atinge** coloanele J și K (formule), coloana I (estimarea o schimbă doar persoana) și tab-ul `Rezumat`.
5. **Task nou, care nu e în listă:** îl adaugi la finalul tab-ului cu următorul ID liber și copiezi formulele din J și K de pe rândul de deasupra, cu numărul rândului actualizat.
6. **La final** spui într-un rând ce ai actualizat (tab, ID, status).

Sheet-ul e pe locale `ro_RO`: în formule, argumentele se separă cu `;`, nu cu `,`. Altfel apare `#ERROR!`.

Dacă conectorul **Google Sheets** nu e disponibil în sesiune, nu sări pasul în tăcere. Spune-i utilizatorului să-l activeze din setările de conectori claude.ai și arată-i ce trebuie completat (tab, rând, valori), ca să-l poată pune de mână.

### Convenție commit

Pune ID-ul task-ului în mesajul de commit, ex. `[A5] ingest PDF/DOCX → chunks + embeddings`. Așa task-ul se găsește sigur.
