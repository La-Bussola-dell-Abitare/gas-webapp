# Modulo Documenti e Fascicolo Digitale (`src/Models/Documenti`)

## 1. Responsabilità Architetturale

La cartella `src/Models/Documenti` modella l'entità di persistenza relazionale del fascicolo documentale:
- **Fascicolo Relazionale e Gestione Scadenze** ([`Documento.js`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Documenti/Documento.js)): Modella i singoli documenti posseduti o presentati dai beneficiari (CIE, Permessi di Soggiorno, ISEE, Patenti, Buste Paga, Firme), tracciando date di scadenza, valori economici (€) e collegamenti a Google Drive.
- I motori di generazione e compilazione template Google Docs risiedono invece nel modulo dedicato applicativo [`src/Service/Template/`](file:///d:/@Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/Template/README.md).

---

## 2. Modello `Documento.js` (Fascicolo Relazionale)

Rappresenta un singolo record del foglio Google **`Documenti`**, collegato all'anagrafica del beneficiario tramite la chiave esterna **`Intestatario`** (Codice Fiscale).

### Proprietà del Record:
- **`id`**: progressivo intero univoco che parte da `1` (`1, 2, 3...`).
- **`intestatario`**: Codice Fiscale normalizzato (16 caratteri alfanumerici maiuscoli).
- **`tipo`**: nome ufficiale della tipologia documentale (risolto dal catalogo SSOT `Documents`).
- **`categoria`**: categoria tematica (*"Anagrafica"*, *"Soggiorno"*, *"Economica"*, *"Abitativa"*, *"Sanitaria"*, *"Lavoro"*, *"Legale"*, *"Altro"*).
- **`valore`**: importo economico numerico in € (es. valore attestazione ISEE o canone di locazione).
- **`dataEmissione`**: data di rilascio normalizzata nel formato standard `YYYY-MM-DD`.
- **`dataScadenza`**: data di scadenza normalizzata nel formato standard `YYYY-MM-DD`.
- **`idDrive`**: ID univoco del file su Google Drive (opzionale se registrato solo cartaceo).
- **`note`**: annotazioni libere o indicazione dell'ente emittente (Questura, INPS, Comune).
- **`dataInserimento`**: data di registrazione nel sistema.

### Calcolo Automatico dello Stato di Scadenza (Semaforo)
Il metodo `getStatoScadenza(referenceDate = new Date())` applica la seguente logica:
- 🔴 **`SCADUTO`**: se `dataScadenza < referenceDate` (scadenza già trascorsa).
- 🟡 **`IN_SCADENZA`**: se la scadenza ricade tra oggi e i prossimi **60 giorni** inclusi.
- 🟢 **`VALIDO`**: se la scadenza è superiore a 60 giorni da oggi.
- ⚪ **`PERMANENTE`**: se il documento non ha scadenza (`dataScadenza` vuota o `hasExpiration: false` da catalogo, es. *Firma Autografa*, *Codice Fiscale*).

Il metodo `getGiorniAllaScadenza()` restituisce il numero di giorni mancanti (o negativi se già scaduto).

---

## 3. Motore di Templating Google Docs (`main.js`)

Fornisce le funzioni di manipolazione avanzata del corpo di documenti Google Docs (`DocumentApp`):

- **`createGoogleDocFromTemplate(templateId, folderId, newDocName, params)`**:
  Clona il file template specificato nella cartella di destinazione e sostituisce tutti i segnaposto `{chiave}` definiti nell'oggetto `params`.
- **Sostituzione Avanzata**:
  - **Testo**: sostituisce direttamente `{chiave}` con la stringa corrispondente.
  - **Checkbox (`handleCheckboxSearchAndReplace`)**: riconosce se il parametro è un booleano o un oggetto checkbox, sostituendo il segnaposto con il carattere spuntato (☑ o ☒) o deselezionato (☐).
  - **Immagini e Firme (`replacePlaceholderWithImage`)**: individua il segnaposto `{firma}`, lo elimina e inserisce al suo posto l'immagine inline (es. firma autografa PNG decodificata da Base64) ridimensionata opportunamente.
  - **Tabelle Dinamiche**: popolamento di righe per registri accessi o elenchi presenze.
