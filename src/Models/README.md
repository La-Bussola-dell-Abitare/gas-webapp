# Modello a Oggetti delle Entità Database (`src/Models`)

## 1. Responsabilità Architetturale

La cartella `src/Models` contiene le classi di dominio orientate agli oggetti (OOP) che rappresentano esclusivamente le **entità persistenti del database relazionale** memorizzate nei fogli Google dello sportello "La Bussola dell'Abitare":
- **Persone** (`Person/`): `Person.js`, `Beneficiario.js`, `Operatore.js`
- **Nuclei Familiari** (`Nucleo/`): `NucleoFamiliare.js`
- **Fascicolo Documentale** (`Documenti/`): `Documento.js` (semafori scadenza, metadati relazionali)
- **Incontri e Colloqui** (`Meeting/`): `Incontro.js`

### Scelte Architetturali Chiave:
1. **Disaccoppiamento da Google Sheets**: I modelli rappresentano entità pure di memoria. Non effettuano chiamate dirette a `SpreadsheetApp` (responsabilità demandata ai rispettivi `Repository`), ma espongono metodi statici di idratazione (`fromRow(row, idx)`) e metodi di serializzazione (`toObject()`).
2. **Ereditarietà Strutturata**: La classe base astratta [`Person`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Person/Person.js) incapsula tutti i dati anagrafici universali (nome, cognome, data di nascita, codice fiscale, contatti, cittadinanza), venendo estesa da [`Beneficiario`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Person/Beneficiari/Beneficiario.js) e [`Operatore`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Person/Operatori/Operatore.js).
3. **Separazione DDD tra Modelli, Dominio e Servizi**:
   - I value objects universali e matematici ([`CodiceFiscale.js`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Domain/CodiceFiscale.js) e [`Places/`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Domain/Places/)) risiedono ora nel modulo standard [`src/Domain/`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Domain/README.md).
   - I motori di generazione template Google Docs risiedono nel modulo applicativo [`src/Service/Template/`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/Template/README.md).

---

## 2. Struttura delle Sottocartelle

```text
src/Models/
├── Documenti/                 # Fascicolo documentale e gestione scadenze
│   ├── Documento.js           # Record del foglio 'Documenti' con calcolo scadenze semaforiche
│   └── README.md              # Documentazione del modello relazionale
├── Meeting/                   # Modello degli incontri (1° e 2° livello)
│   ├── Incontro.js            # Incontro con operatore o assistente sociale
│   └── README.md
├── Nucleo/                    # Modello del Nucleo Familiare
│   ├── NucleoFamiliare.js     # Entità nucleo (ID progressivo, intestatario, ISEE, cartella Drive)
│   └── Istruzioni.md          # Specifiche del foglio 'Nuclei Familiari'
└── Person/                    # Gerarchia delle entità anagrafiche
    ├── Person.js              # Classe base universale (anagrafica, contatti, CF)
    ├── Beneficiari/           # Beneficiario accolto (idNucleo, cartella, firma, documenti)
    │   ├── Beneficiario.js
    │   └── Istruzioni.md
    └── Operatori/             # Operatore dello staff (qualifica, ruolo)
        └── Operatore.js
```
