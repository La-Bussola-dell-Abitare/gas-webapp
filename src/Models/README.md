# Modello a Oggetti del Dominio (`src/Models`)

## 1. Responsabilità Architetturale

La cartella `src/Models` contiene le classi di dominio orientate agli oggetti (OOP) che rappresentano le entità fondamentali del servizio "La Bussola dell'Abitare":
- Persone (Beneficiari, Operatori)
- Nuclei Familiari
- Fascicolo Documentale e Scadenze
- Incontri e Colloqui
- Indirizzi, Città e Codici Fiscali

### Scelte Architetturali Chiave:
1. **Disaccoppiamento da Google Sheets**: I modelli rappresentano entità pure di memoria. Non effettuano chiamate dirette a `SpreadsheetApp` (responsabilità demandata ai rispettivi `Repository`), ma espongono metodi statici di idratazione (`fromRow(row, idx)`) e metodi di serializzazione (`toObject()`).
2. **Ereditarietà Strutturata**: La classe base astratta [`0_Person`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Person/0_Person.js) incapsula tutti i dati anagrafici universali (nome, cognome, data di nascita, codice fiscale, contatti, cittadinanza), venendo estesa da [`Beneficiario`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Person/Beneficiari/Beneficiario.js) e [`Operatore`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Person/Operatori/Operatore.js).
3. **Value Objects per la Validità dei Dati**: [`CodiceFiscale`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/CodiceFiscale.js) e [`Address`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Places/Address.js) agiscono come value object immutabili che validano, formattano e deducono informazioni a partire da input grezzi.

---

## 2. Struttura delle Sottocartelle

```text
src/Models/
├── CodiceFiscale.js           # Value Object per validazione, decodifica ed estrazione dati da CF
├── Documenti/                 # Modello Documento (Fascicolo relazionale) e templating Google Docs
│   ├── Documento.js           # Record del foglio 'Documenti' con calcolo scadenze semaforiche
│   ├── main.js                # Motore di clonazione template e sostituzione testi/immagini/checkbox
│   ├── FoglioFirme/           # Modello di gestione del Foglio Firme Individuale
│   ├── DiarioGiornaliero/     # Modello di gestione del Diario Giornaliero dello sportello
│   └── SchedaSegnalazione/    # Modello per la Scheda di Segnalazione al Secondo Livello
├── Meeting/                   # Modello degli incontri (1° e 2° livello)
│   └── Incontro.js            # Incontro con operatore o assistente sociale
├── Nucleo/                    # Modello del Nucleo Familiare
│   ├── NucleoFamiliare.js     # Entità nucleo (ID progressivo, intestatario, ISEE, cartella Drive)
│   └── Istruzioni.md          # Specifiche del foglio 'Nuclei Familiari'
├── Person/                    # Gerarchia delle entità umane
│   ├── 0_Person.js            # Classe base universale (anagrafica, contatti, CF)
│   ├── Beneficiari/           # Beneficiario accolto (idNucleo, cartella, firma, documenti)
│   └── Operatori/             # Operatore dello staff (qualifica, ruolo)
└── Places/                    # Normalizzazione geografica
    ├── 0_City.js              # Rappresentazione comune italiano o stato estero
    ├── Address.js             # Indirizzo strutturato (via, civico, CAP, città)
    └── Elenco-comuni-italiani.csv # Database Belfiore dei comuni italiani
```
