# Diagrammi UML di Sequenza (Sequence Diagrams)

Documentazione dei flussi di interazione temporale tra i componenti del sistema gestionale **"La Bussola dell'Abitare"**:
- **Client:** Interfaccia Web App Single Page (`Frontend.html`).
- **Server:** Controller di backend (`Backend.js`).
- **Domain e Models:** Modelli orientati agli oggetti (`CodiceFiscale`, `NucleoFamiliare`, `SchedaSegnalazione`).
- **Repository:** Strato di persistenza (`IncontroRepository`, `FoglioFirmeRepository`, `BeneficiarioRepository`, `OperatoreRepository`).
- **Servizi Google Workspace:** `SpreadsheetApp`, `DriveApp`, `DocumentApp`, `CacheService`.

---

## 1. Sequenza 1: Registrazione Incontro e Segnalazione al Secondo Livello

Descrive il flusso in cui un operatore di primo livello accoglie un beneficiario, registra l'incontro su Google Sheets e, riscontrando bisogni specialistici, genera la Scheda di Segnalazione per il secondo livello.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operatore Sociale (Front Office)
    participant UI as Frontend.html (Web App)
    participant Ctrl as Backend.js (Controller)
    participant IncRepo as IncontroRepository
    participant SS as Google Sheets ("Incontri")
    participant SchedaModel as SchedaSegnalazione
    participant GDrive as Google Drive / Docs

    Op->>UI: Compila form incontro (Beneficiario, Orari, Attività)
    Op->>UI: Imposta flag Segnalazione = "Sì"
    Op->>UI: Clicca su "Registra Incontro"
    
    UI->>Ctrl: google.script.run.submitMeeting(data)
    activate Ctrl

    Ctrl->>IncRepo: add(data)
    activate IncRepo
    IncRepo->>SS: getSheetByName("Incontri con operatore")
    IncRepo->>SS: appendRow([data, orari, beneficiario, attività, segnalazione="Sì", ...])
    SS-->>IncRepo: Conferma scrittura riga
    IncRepo-->>Ctrl: { success: true, message: "Incontro registrato" }
    deactivate IncRepo

    Ctrl-->>UI: { success: true, message: "Incontro registrato" }
    deactivate Ctrl

    UI->>Op: Mostra Toast: "Incontro salvato! Generazione Scheda in corso..."

    %% Generazione Scheda Segnalazione
    UI->>Ctrl: google.script.run.generateSchedaSegnalazioneDoc(schedaData)
    activate Ctrl

    Ctrl->>SchedaModel: create(schedaData)
    activate SchedaModel
    SchedaModel->>GDrive: DriveApp.getFileById(TEMPLATE_ID).makeCopy(docName, folder)
    GDrive-->>SchedaModel: newFile (Google Doc)
    
    SchedaModel->>GDrive: DocumentApp.openById(newFile.getId())
    SchedaModel->>GDrive: replaceText("{beneficiario_nome}", ...)
    SchedaModel->>GDrive: replaceText("{beneficiario_cf}", ...)
    SchedaModel->>GDrive: handleCheckboxSearchAndReplace(body, key, value)
    SchedaModel->>GDrive: replacePlaceholderWithImage("{firma}", imageBlob)
    SchedaModel->>GDrive: saveAndClose()
    
    SchedaModel-->>Ctrl: istanza SchedaSegnalazione (con URL Doc)
    deactivate SchedaModel

    Ctrl-->>UI: { success: true, url: docUrl }
    deactivate Ctrl

    UI->>Op: Mostra popup con link diretto al Google Doc e opzione download PDF
```

---

## 2. Sequenza 2: Censimento Nucleo Familiare e Creazione Atomica dell'Intestatario

Illustra l'interazione tra la selezione Dual-Mode (creazione nuovo beneficiario intestatario vs selezione esistente), l'algoritmo di decodifica istantanea del Codice Fiscale e il salvataggio atomico tramite `submitNucleoCompleto` protetto da `LockService`.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operatore / Assistente Sociale
    participant UI as Frontend.html
    participant Ctrl as Backend.js
    participant Lock as LockService (Script Lock)
    participant ModelCF as CodiceFiscale
    participant Cache as CacheService (Script Cache)
    participant RemoteAPI as API Comuni / Belfiore
    participant BenRepo as BeneficiarioRepository
    participant Nucleo as NucleoFamiliare
    participant SS as Google Sheets ("Beneficiari" & "Nuclei Familiari")

    Op->>UI: Clicca su "+ Nuovo Nucleo Familiare"
    UI->>Op: Mostra Modal Dual-Mode (Default: Crea Nuovo Intestatario)
    
    alt Modalità Nuovo Intestatario: Inserimento CF
        Op->>UI: Inserisce Codice Fiscale dell'intestatario
        UI->>Ctrl: google.script.run.decodeCF(cf)
        activate Ctrl

        Ctrl->>ModelCF: new CodiceFiscale(cf)
        ModelCF->>ModelCF: _decodificaOmocodia(cf)
        ModelCF->>ModelCF: isValid() verifica carattere di controllo (CIN)
        
        alt Codice Fiscale non valido
            ModelCF-->>Ctrl: isValid() = false
            Ctrl-->>UI: { success: false }
            UI->>Op: Bordo rosso sul campo CF (formato errato)
        else Codice Fiscale valido
            ModelCF->>ModelCF: getBirthdate(), getSesso(), getCodiceComune()
            ModelCF->>Cache: get("BELFIORE_" + codiceComune)
            alt Trovato in Cache
                Cache-->>ModelCF: "Roma" (da cache)
            else Non presente in Cache
                ModelCF->>RemoteAPI: UrlFetchApp.fetch(comuni.json)
                RemoteAPI-->>ModelCF: Dati comune trovati
                ModelCF->>Cache: put("BELFIORE_H501", "Roma", 21600)
            end
            ModelCF-->>Ctrl: { success: true, sesso: "M", dataNascita: "1980-01-01", luogoNascita: "Roma" }
            Ctrl-->>UI: { success: true, sesso, dataNascita, luogoNascita }
            deactivate Ctrl
            UI->>Op: Autocompila i campi: Data di Nascita, Sesso e Comune
        end
    else Modalità Beneficiario Esistente
        Op->>UI: Seleziona tab "Esistente" e cerca da autocomplete
    end

    %% Invio del form nucleo e salvataggio atomico
    Op->>UI: Compila dati nucleo (residenza, richiesta, abitazione) e clicca "Salva Nucleo e Intestatario"
    UI->>Ctrl: google.script.run.submitNucleoCompleto(payload)
    activate Ctrl

    Ctrl->>Lock: waitLock(15000)
    activate Lock
    Lock-->>Ctrl: Lock acquisito (mutua esclusione)

    alt isNuovoIntestatario = true
        Ctrl->>Nucleo: generateNextId() -> es. "105"
        Ctrl->>BenRepo: add(benPayload con idNucleo="105", rapporto="Intestatario")
        activate BenRepo
        BenRepo->>SS: Scrittura riga nel foglio "Beneficiari"
        SS-->>BenRepo: OK
        BenRepo-->>Ctrl: { success: true }
        deactivate BenRepo

        Ctrl->>Nucleo: add(nucleoData con id="105", intestatario="Nome Cognome (CF)")
        activate Nucleo
        Nucleo->>SS: Scrittura riga nel foglio "Nuclei Familiari"
        SS-->>Nucleo: OK
        Nucleo-->>Ctrl: { success: true, id: "105" }
        deactivate Nucleo
    else isNuovoIntestatario = false (Beneficiario Esistente)
        Ctrl->>Nucleo: add(nucData)
        Ctrl->>SS: Aggiorna colonna idNucleo e rapportoIntestatario sul foglio "Beneficiari"
    end

    Ctrl->>Lock: releaseLock()
    deactivate Lock

    Ctrl-->>UI: { success: true, message: "Nucleo #105 e intestatario registrati!", id: "105" }
    deactivate Ctrl

    UI->>Op: Mostra Toast di successo e chiude il modale
    UI->>UI: Ricarica elenco nuclei e beneficiari con reloadData()
```

---

## 3. Sequenza 3: Generazione del Foglio Firme Individuale Mensile

Mostra come il sistema evita duplicazioni controllando l'esistenza del file prima di generarne uno nuovo dal template Google Docs predefinito.

```mermaid
sequenceDiagram
    autonumber
    actor Utente as Operatore o Assistente Sociale
    participant UI as Frontend.html
    participant Ctrl as Backend.js
    participant FFRepo as FoglioFirmeRepository
    participant Config as CONFIG.FOGLIFIRME
    participant GDrive as Google Drive API
    participant GDocs as Google Docs API

    Utente->>UI: Seleziona Operatore, Beneficiario e Mese (es. "2026-07")
    Utente->>UI: Clicca su "Genera Foglio Firme"
    
    UI->>Ctrl: google.script.run.generateFoglioFirmeDoc(operator, client, "2026-07")
    activate Ctrl

    Ctrl->>FFRepo: create(operator, client, date)
    activate FFRepo

    FFRepo->>Config: get TEMPLATE e get FOLDER
    Config-->>FFRepo: Template Google Doc e Folder Drive
    
    FFRepo->>GDrive: template.makeCopy("2026-07 Mario Rossi (Lorenzo Mazza)", folder)
    GDrive-->>FFRepo: newFile (istanza file creato)

    FFRepo->>GDrive: Drive.Properties.insert({ key: 'mese', value: '2026-07' })
    FFRepo->>GDrive: Drive.Properties.insert({ key: 'operatore', value: 'Lorenzo Mazza' })
    FFRepo->>GDrive: Drive.Properties.insert({ key: 'beneficiario', value: 'Mario Rossi' })

    FFRepo->>GDocs: DocumentApp.openById(newFile.getId())
    GDocs->>GDocs: body.replaceText("{data}", "2026-07")
    GDocs->>GDocs: body.replaceText("{operatore}", "Lorenzo Mazza")
    GDocs->>GDocs: body.replaceText("{cliente}", "Mario Rossi")
    GDocs->>GDocs: doc.saveAndClose()

    FFRepo-->>Ctrl: new FoglioFirme(id, fileName, fileUrl)
    deactivate FFRepo

    Ctrl-->>UI: { success: true, url: docUrl, name: fileName }
    deactivate Ctrl

    UI->>Utente: Mostra alert di successo con pulsante "Apri Foglio Firme"
    UI->>UI: Aggiunge il link nella sezione "Documenti Recenti"
```

---

## 4. Sequenza 4: Incrocio Dati e Compilazione Monitoraggio Ufficiale

Rappresenta l'automazione della riga del file di monitoraggio ministeriale/municipale mediante aggregazione asincrona tra le anagrafiche del beneficiario, i dati professionali dell'operatore e il calcolo dell'età.

```mermaid
sequenceDiagram
    autonumber
    actor Coord as Coordinatore / Operatore
    participant UI as Frontend.html
    participant Ctrl as Backend.js (addRigaMonitoraggio)
    participant OpRepo as OperatoreRepository
    participant BenRepo as BeneficiarioRepository
    participant ModelCF as CodiceFiscale
    participant SS as Google Sheets ("Monitoraggio Ufficiale")

    Coord->>UI: Seleziona incontro e clicca "Invia a Monitoraggio Ufficiale"
    UI->>Ctrl: google.script.run.addRigaMonitoraggio(data)
    activate Ctrl

    %% 1. Recupero Operatore
    Ctrl->>OpRepo: getAll()
    OpRepo-->>Ctrl: lista operatori
    Ctrl->>Ctrl: Trova operatore corrispondente (estrae qualifica="Operatore Sociale", ruolo="Accoglienza")

    %% 2. Recupero Beneficiario
    Ctrl->>BenRepo: getAll()
    BenRepo-->>Ctrl: lista beneficiari
    Ctrl->>Ctrl: Trova beneficiario per CF o nominativo
    
    %% 3. Calcolo Età e Sesso dal Codice Fiscale
    Ctrl->>ModelCF: getBirthdate(ben.cf)
    ModelCF-->>Ctrl: dataNascita (Date)
    Ctrl->>Ctrl: Calcolo esatto età anagrafica (anni compiuti)
    Ctrl->>ModelCF: getSesso(ben.cf)
    ModelCF-->>Ctrl: "M" o "F"

    %% 4. Inserimento nel foglio Monitoraggio
    Ctrl->>SS: getSheetByName("Monitoraggio Ufficiale")
    Ctrl->>SS: appendRow([Municipio XI, 2026, "La Bussola dell'Abitare", CIG, Op.nome, Op.qualifica, Ben.nome, Ben.cf, Sesso, Cittadinanza, Lavoro, TitoloStudio, Età, Timestamp])
    SS-->>Ctrl: Riga registrata con successo

    Ctrl-->>UI: { success: true, message: "Riga aggiunta al Monitoraggio Ufficiale!" }
    deactivate Ctrl

    UI->>Coord: Mostra notifica di conferma operazione eseguita
```
