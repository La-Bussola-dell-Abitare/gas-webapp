# Modulo di Dominio (`src/Domain`)

## 1. Responsabilità Architetturale

La cartella `src/Domain` implementa il pattern **Single Source of Truth (SSOT)** per il sistema gestionale "La Bussola dell'Abitare". 
Contiene definizioni immutabili, regole di business, cataloghi di riferimento e funzioni pure di utilità relative ai concetti centrali del servizio (geografia, cittadinanze, documenti, permessi di soggiorno).

### Perché questo modulo?
In sistemi basati su Google Apps Script e Google Sheets, un errore frequente è quello di disperdere definizioni (come liste di paesi, regex per i documenti o formati di file) tra formule di foglio, script di backend e codice HTML client-side. 
Il modulo `Domain`:
1. **Centralizza le regole**: una modifica a un prefisso o alla scadenza di un documento ha effetto immediato su tutta l'applicazione.
2. **Garantisce l'immutabilità**: tutte le collezioni sono congelate tramite `Object.freeze()`, proteggendole da mutazioni accidentali a runtime.
3. **Fornisce ricerche indicizzate O(1)** tramite mappe per ID, ISO o Nomi, oltre a matching resiliente tramite espressioni regolari.

---

## 2. File Presenti

### `country.js` — Catalogo Geografico e Prefissi Internazionali
Fornisce l'inventario completo e standardizzato di **196 nazioni del mondo**, unificando la gestione di stati di nascita, cittadinanze, codici ISO, prefissi telefonici internazionali e bandiere grafiche.

- **Struttura Dati (`CountryRecord`)**:
  ```typescript
  {
    name: string;        // Nome italiano ufficiale dello Stato (es. "Italia", "Marocco")
    citizenship: string; // Cittadinanza/Nazionalità al singolare (es. "Italiana", "Marocchina")
    iso: string;         // Codice ISO 3166-1 alpha-2 a due lettere (es. "IT", "MA")
    phone: string;       // Prefisso telefonico internazionale con '+' (es. "+39", "+212")
    flag: string;        // Emoji della bandiera nazionale (es. "🇮🇹", "🇲🇦")
  }
  ```
- **Dizionari O(1)**: `CountryByName`, `CountryByISO`, `CountryByPhone`.
- **Funzioni di Utilità Esposte**:
  - `findCountry(query)`: ricerca tollerante a cascata (per ISO esatto, nome esatto, cittadinanza esatta, matching case-insensitive o parziale).
  - `findCountryByPhone(phone)`: estrae lo stato di appartenenza analizzando il prefisso telefonico (anche in caso di prefissi condivisi come `+1` o `+7`).
  - `normalizeCountryName(input)`: normalizza varianti testuali o refusi nel nome ufficiale dello stato.
  - `filterCountries(query)`: supporta la ricerca predittiva (autocompletamento) nei dropdown della Web App.

---

### `documents.js` — Catalogo Documentale, Archetipi e Naming Engine
Costituisce l'autorità unica per tutte le tipologie di documenti gestite dallo sportello sociale (anagrafici, soggiorno, economici, abitativi, lavorativi, sanitari e legali).

- **Archetipi di Dominio (`DocumentArchetype`)**:
  I documenti si comportano temporalmente secondo 5 modelli precisi:
  1. `SCADENZA`: documenti soggetti a scadenza temporale fissa (Carta d'Identità, Permesso di Soggiorno, Patente, Passaporto, Tessera Sanitaria). Nomenclatura file: `Tipo (scad. YYYY) - Persona.ext`.
  2. `ANNUALE`: documenti validi per una specifica annualità fiscale/economica (Attestazione ISEE, CUD/CU). Nomenclatura: `Tipo YYYY - Persona.ext`.
  3. `PERIODICO`: documenti a cadenza mensile o periodica (Buste Paga). Nomenclatura: `Tipo YYYY-MM - Persona.ext`.
  4. `CONTRATTO`: atti contrattuali o legali con decorrenza (Contratto di Locazione, Atti di Sfratto). Nomenclatura: `Tipo YYYY - Nucleo/Persona.ext`.
  5. `UNICO`: documenti identitari unici o a-temporali (Firma Autografa, Certificato Codice Fiscale). Nomenclatura: `Tipo - Persona.ext`.

- **Struttura Dati (`DocumentRecord`)**:
  ```typescript
  {
    id: string;             // Costante identificativa (es. "CARTA_IDENTITA", "ISEE", "FIRMA")
    name: string;           // Nome ufficiale visualizzato (es. "Carta d'Identità")
    categoria: string;      // Raggruppamento ("Anagrafica", "Soggiorno", "Economica", "Abitativa", ...)
    archetipo: string;      // Comportamento ("SCADENZA", "ANNUALE", "PERIODICO", "CONTRATTO", "UNICO")
    icona: string;          // Classe Bootstrap Icons (es. "bi-person-badge", "bi-cash-coin")
    emoji: string;          // Emoji rappresentativa (es. "🪪", "💶", "✍️")
    hasValue: boolean;      // Indica se comporta un importo monetario in € (ISEE, affitto)
    hasExpiration: boolean; // Indica se soggetto a data di scadenza
    regex: RegExp;          // Espressione regolare per riconoscimento automatico da nomi file o OCR
    scope: "persona" | "nucleo" | "entrambi";
    description?: string;
  }
  ```

- **Naming Engine (`buildDocumentFileName`)**:
  Genera nomi di file standardizzati, leggibili e naturalmente ordinabili alfabeticamente su Google Drive:
  - *Esempio:* `buildDocumentFileName({ tipo: "CARTA_IDENTITA", dataScadenza: "2034-05-10" }, "Mario Rossi", "pdf")`
    $\rightarrow$ `"Carta d'Identità (scad. 2034) - Mario Rossi.pdf"`
  - *Esempio:* `buildDocumentFileName({ tipo: "ISEE", anno: 2026 }, "Franco Rossi", "pdf")`
    $\rightarrow$ `"Attestazione ISEE 2026 - Franco Rossi.pdf"`

- **Funzioni di Matching Esposte**:
  - `findDocumentType(query)`: individua il record di dominio anche da testi sporchi o nomi di file arbitrari (es. `scan_ci_mario.pdf` $\rightarrow$ `CARTA_IDENTITA`).
  - `getDocumentCategories()`: restituisce le categorie distinte per i filtri della UI.
  - `getDocumentsByCategory(cat)`: elenca i documenti appartenenti a una categoria.
