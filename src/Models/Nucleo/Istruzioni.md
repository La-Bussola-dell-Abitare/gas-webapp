# Modello del Nucleo Familiare (`src/Models/Nucleo`)

## 1. Descrizione e Responsabilità

Il modulo `NucleoFamiliare` rappresenta l'aggregazione anagrafica e sociale dei nuclei familiari seguiti dallo sportello sociale "La Bussola dell'Abitare" (Municipio XI di Roma).
Ciascun nucleo possiede:
1. Un identificativo univoco progressivo (`id`), es. `1`, `2`, `3...`.
2. Un beneficiario designato come **Intestatario** (titolare della scheda e firmatario ufficiale del Diario e Foglio Firme).
3. Una cartella dedicata su Google Drive denominata secondo la convenzione `<id> - <Nome Cognome Intestatario>`.
4. Una relazione **1 a Molti (1:N)** con i singoli componenti (`Beneficiari`), collegati tramite il campo `idNucleo`.

---

## 2. Struttura del Foglio Google `Nuclei Familiari`

| Indice | Intestazione Colonna | Tipo Dato | Descrizione |
| :---: | :--- | :--- | :--- |
| **A** | **`ID`** | Stringa / Intero | Identificativo univoco del nucleo (generato progressivamente) |
| **B** | **`Intestatario`** | Testo | Riferimento all'intestatario nel formato `Nome Cognome (Codice Fiscale)` |
| **C** | **`ISEE`** | Numerico (€) | Valore economico dell'attestazione ISEE del nucleo |
| **D** | **`Residenza`** | Testo | Indirizzo di residenza anagrafica del nucleo familiare |
| **E** | **`Domicilio`** | Testo | Indirizzo di domicilio effettivo (se differente dalla residenza) |
| **F** | **`Descrizione caso`** | Testo lungo | Quadro generale e sintesi della situazione socio-abitativa |
| **G** | **`Obiettivi e progettualità`**| Testo lungo | Obiettivi concordati nel percorso di accompagnamento |
| **H** | **`Tipologia di richiesta`** | Testo | Ambito prevalente (emergenza abitativa, bando ERP, consulenza legale...) |
| **I** | **`Orientamento e follow-up`** | Testo | Esiti delle indicazioni fornite e appuntamenti di verifica |
| **J** | **`Tipologia abitazione`** | Testo | Condizione alloggiativa attuale (proprietà, locazione, occupazione, ospite...) |
| **K** | **`Assistente sociale`** | Testo | Servizio sociale o nominativo dell'assistente sociale di presa in carico |
| **L** | **`Medico di base`** | Testo | Indicazione medico di famiglia di riferimento |
| **M** | **`idCartella`** | Testo (33 car.) | Identificativo univoco della cartella del nucleo su Google Drive |

---

## 3. Gestione della Cartella su Google Drive

La cartella del nucleo risiede all'interno della cartella radice `CONFIG.FOLDER_BENEFICIARI_ROOT_ID` (`1cBAWWPnRZNhj1xubIM89inMehvB-sFiE`).

### Regole di Denominazione:
- Il nome della cartella segue la struttura:
  ```text
  [idNucleo] - [Nome Cognome Intestatario]
  ```
  *Esempio:* `12 - Franco Rossi`, `105 - Ahmed Ben Ali`.
- La ricerca della cartella è resiliente: la regex `^\s*<id>([\s\-–—]|$)` garantisce l'individuazione anche se il nome dell'intestatario ha leggeri disallineamenti di spaziatura o trattini.
- All'interno della cartella del nucleo risiedono:
  - I documenti di pertinenza del nucleo (es. `Attestazione ISEE 2026 - Franco Rossi.pdf`, `Contratto Locazione 2024 - Nucleo #12.pdf`).
  - Le **sottocartelle personali** di ciascun componente del nucleo, denominate `<Nome Cognome>` (es. `Franco Rossi`, `Maria Bianchi`).

---

## 4. Modalità di Creazione del Nucleo (Dual-Mode)

Il metodo `submitNucleoCompleto` gestisce la creazione del nucleo secondo due modalità operative protette da `LockService`:

1. **Creazione Atomica con Nuovo Intestatario (`isNuovoIntestatario: true`)**:
   - Genera il nuovo `id` nucleo tramite `NucleoFamiliare.generateNextId()`.
   - Registra contestualmente il nuovo beneficiario nel foglio `Beneficiari` associandolo con `rapportoIntestatario = "Intestatario"`.
   - Crea il record nel foglio `Nuclei Familiari`.
   - Se una delle due operazioni fallisce, l'intero flusso viene interrotto prevenendo record orfani.
2. **Associazione a Beneficiario Esistente (`isNuovoIntestatario: false`)**:
   - Collega un beneficiario già censito, aggiornando il suo `idNucleo` e impostando il ruolo a *"Intestatario"*.

---

## 5. Metodi Statici Principali (`NucleoFamiliare.js`)

- **`getAll()`**: restituisce l'elenco di tutte le istanze `NucleoFamiliare` lette dal foglio.
- **`generateNextId()`**: scansiona la colonna `ID`, individua il massimo intero esistente e restituisce `max + 1`.
- **`add(data)`**: inserisce o aggiorna un nucleo gestendo la mappatura dinamica delle colonne.
- **`updateDriveInfo(id, { idCartella })`**: memorizza l'ID della cartella Google Drive nel foglio.
