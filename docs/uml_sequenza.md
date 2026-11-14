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


---

## 5. Sequenza 5: Acquisizione Firma Digitale Beneficiario su Canvas HTML5

Descrive il flusso con cui l'operatore fa apporre la firma autografa al beneficiario direttamente su schermo touch o con mouse/penna, procedendo al salvataggio in formato PNG trasparente nella cartella Drive personale e alla sincronizzazione con i fogli 'Beneficiari' e 'Documenti'.

```mermaid
sequenceDiagram
    autonumber
    actor Ben as Beneficiario
    actor Op as Operatore di Sportello
    participant UI as Frontend.html (Modal Firma Canvas)
    participant Ctrl as Backend.js
    participant DM as DriveManager
    participant GDrive as Google Drive (Folder Personale)
    participant BenRepo as BeneficiarioRepository
    participant DocRepo as DocumentoRepository
    participant SS as Google Sheets ("Beneficiari" & "Documenti")

    Op->>UI: Clicca su "✍️ Firma" nella scheda o nel nucleo
    UI->>UI: openSignatureModal(cf)
    UI->>Ben: Mostra Canvas HTML5 con linea base di firma
    
    Ben->>UI: Disegna firma con touch, penna o mouse (PointerEvents)
    Op->>UI: Clicca su "💾 Salva Firma nel Drive"
    
    UI->>UI: canvas.toDataURL("image/png") -> base64Data
    UI->>Ctrl: google.script.run.saveBeneficiarySignature(cf, base64Data)
    activate Ctrl

    Ctrl->>DM: saveBeneficiarySignature(cf, base64Data)
    activate DM

    DM->>DM: getOrCreateBeneficiarioFolder(cf)
    DM->>GDrive: Cerca sottocartella personale "<Nome Cognome>" nel nucleo
    GDrive-->>DM: Istanza Folder

    DM->>DM: Utilities.base64Decode(cleanBase64)
    DM->>GDrive: Rimuove eventuali file "Firma *.png" precedenti (anti-duplicati)
    DM->>GDrive: folder.createFile(blob, "Firma Franco Rossi.png", "image/png")
    GDrive-->>DM: newFile (fileId, fileUrl)

    %% Aggiornamento foglio Beneficiari
    DM->>BenRepo: updateDriveInfo(cf, { firma: fileId })
    activate BenRepo
    BenRepo->>SS: Scrive fileId nella colonna "Firma" del foglio "Beneficiari"
    deactivate BenRepo

    %% Sincronizzazione foglio Documenti
    DM->>DocRepo: add({ intestatario: cf, tipo: "Firma Autografa", idDrive: fileId })
    activate DocRepo
    DocRepo->>SS: Inserisce/aggiorna riga nel foglio "Documenti" (archetipo UNICO)
    deactivate DocRepo

    DM-->>Ctrl: { success: true, fileId: fileId, fileUrl: fileUrl }
    deactivate DM

    Ctrl-->>UI: { success: true, fileId: fileId, fileUrl: fileUrl }
    deactivate Ctrl

    UI->>UI: Aggiorna badge stato ("Archiviata 🟢"), anteprima e ricarica i dati
    UI->>Op: Mostra Toast: "Firma autografa salvata con successo!"
```

---

## 6. Sequenza 6: Smart Form-Filling Multi-File & Document Intelligence con Google Gemini Flash

Illustra l'interazione tra l'area di rilascio documenti (drag & drop multi-file), l'ottimizzazione grafica su Canvas client-side, il servizio multimodale Google Gemini (`gemini-flash-latest`, con fallback su `gemini-flash-lite-latest` e `gemini-pro-latest`), la normalizzazione deterministica Title Case e l'archiviazione automatica in Google Drive e foglio `Documenti`.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operatore di Sportello
    participant UI as Frontend.html (Dropzone IA & Canvas)
    participant Ctrl as Backend.js
    participant DI as DocumentIntelligence
    participant Gemini as Google Gemini API (gemini-flash-latest)
    participant DocDomain as Documents (SSOT)
    participant DM as DriveManager
    participant DocRepo as DocumentoRepository
    participant SS as Google Sheets ("Beneficiari" / "Documenti")

    Op->>UI: Trascina uno o più file/foto (es. CIE fronte/retro, ISEE, Tessera Sanitaria)
    activate UI
    UI->>UI: optimizeFileForUpload() verifica limite 10MB e ridimensiona via HTML5 Canvas (max 1400px, JPEG 0.78)
    Note over UI: Riduzione peso del ~50% per azzerare timeout e velocizzare trasferimento
    UI->>UI: Mostra spinner "Analisi visiva in corso con Gemini Flash..."
    
    UI->>Ctrl: google.script.run.smartClassifyDocuments(filesArray)
    deactivate UI
    activate Ctrl

    Ctrl->>DI: smartClassifyMultipleBase64(filesArray)
    activate DI

    DI->>DI: Prepara payload multimodale e lista modelli a cascata (primario + fallbacks)
    loop Tentativi e Cascata Modelli (HA)
        DI->>Gemini: UrlFetchApp.fetch(POST /models/{model}:generateContent)
        alt Risposta 200 OK
            Gemini-->>DI: JSON strutturato { tipoDocumento, datiPersona, datiDocumento, datiNucleo }
        else Errore 503 Overload / 429 / Timeout
            DI->>DI: Backoff esponenziale (Utilities.sleep) e fallback su modello alternativo
        end
    end
    
    DI->>DocDomain: findDocumentType(tipoDocumento)
    DocDomain-->>DI: Record di dominio (name, categoria, archetipo, icona, scope)
    DI->>DI: Post-processing deterministico (normalizeProperCase, normalizeCity, normalizeAddress, normalizeFiscalCode)
    
    DI-->>Ctrl: { success: true, data: { tipoDocumento, categoria, datiPersona, datiDocumento, datiNucleo } }
    deactivate DI

    Ctrl-->>UI: Risposta con dati strutturati e normalizzati
    deactivate Ctrl
    activate UI

    UI->>UI: Popola input form con Title Case (Nome, Cognome, Luogo nascita con PR maiuscola, CF, Indirizzo, ISEE)
    UI->>UI: Seleziona automaticamente Cittadinanza con bandierina SVG
    UI->>UI: renderPendingDocs() aggiunge i file al vassoio documenti pendenti con badge rimovibili
    UI->>Op: Toast: "✨ Documenti analizzati con successo! Dati compilati."
    deactivate UI

    %% Fase di Salvataggio
    Op->>UI: Verifica i dati e clicca su "Salva" (Beneficiario o Nucleo)
    activate UI
    UI->>Ctrl: google.script.run.submitBeneficiary / submitNucleoCompleto(payload con documents)
    deactivate UI
    activate Ctrl

    Ctrl->>SS: Scrive riga anagrafica (senza flag documento legacy obsoleti)
    
    loop Per ogni documento nel payload
        Ctrl->>DM: saveDocumentFile(cf, doc, nucleoId)
        activate DM
        DM->>DM: Determina destinazione in base a doc.scope (Cartella Personale o Cartella Nucleo)
        DM->>DM: Genera nome standard con buildDocumentFileName
        DM->>DM: Utilities.base64Decode() e folder.createFile()
        DM->>DocRepo: add({ intestatario: cf, tipo, categoria, valore, dataEmissione, dataScadenza, idDrive })
        activate DocRepo
        DocRepo->>SS: Registra riga nel foglio relazionale "Documenti"
        deactivate DocRepo
        DM-->>Ctrl: { success: true, fileId, fileUrl }
        deactivate DM
    end

    Ctrl-->>UI: { success: true, message: "Salvataggio completato e documenti archiviati!" }
    deactivate Ctrl
    activate UI
    UI->>UI: clearPendingDocs() e reloadData()
    UI->>Op: Notifica di successo e chiusura modale
    deactivate UI
```

---

## 7. Sequenza 7: Diagnostica Avanzata e Riconciliazione Interattiva Drive con IA

Descrive la procedura di audit approfondito e bonifica controllata eseguita da `DriveReconciler` con supporto di Google Gemini Flash: individuazione di cartelle invertite (`Cognome Nome`), refusi, file fuori posto, duplicati esatti/semantici, righe orfane e allineamento anagrafico con anteprima diff prima dell'esecuzione selettiva.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operatore Sociale
    participant UI as Frontend.html (Modal Diagnostica & 4 Tabs)
    participant Ctrl as Backend.js
    participant DR as DriveReconciler
    participant AI as DocumentIntelligence (Gemini Flash)
    participant Utils as Utils (analyzeFolderName, computeMd5)
    participant GDrive as Google Drive
    participant DocDomain as Documents (buildDocumentFileName)
    participant Repos as Documento / Beneficiario Repository

    Op->>UI: Clicca su "🔍 Diagnostica" nella card del Nucleo
    UI->>UI: Apre modal diagnostica ed esegue audit (opzionale switch Deep AI Scan)
    
    UI->>Ctrl: google.script.run.auditNucleoDrive(nucleoId, { deepAIScan })
    activate Ctrl
    Ctrl->>DR: auditNucleo(nucleoId, options)
    activate DR

    DR->>GDrive: Scansiona cartella radice nucleo e sottocartelle membri
    DR->>Utils: analyzeFolderName(folderName, nome, cognome) -> rileva inversioni / refusi
    DR->>GDrive: Raggruppamento preliminare per dimensione in byte
    opt Se 2+ file hanno identica dimensione (Tier 2)
        DR->>GDrive: UrlFetchApp Drive API v3 metadati (fields: md5Checksum) -> verifica clone bit-a-bit (EXACT_HASH)
    end
    DR->>DR: Rileva duplicati semantici (stesso soggetto + tipo documento + anno)
    
    opt Se Deep Scan IA attivo o su richiesta
        DR->>AI: analyzeBlobs([file.getBlob()])
        AI-->>DR: { tipoDocumento, datiPersona, valoreISEE, date }
        DR->>DR: Calcola discrepanze anagrafiche (ANAGRAFICA_DIFF)
    end

    DR->>DR: Rileva UNTRACKED_FILE e ORPHAN_SHEET_ROW nel foglio 'Documenti'
    DR-->>Ctrl: NucleoAuditReport (issues, duplicateGroups, untrackedList, orphanList, diffList)
    deactivate DR
    Ctrl-->>UI: { success: true, report: auditReport }
    deactivate Ctrl

    UI->>Op: Visualizza Dashboard a 4 schede con anteprima file e controlli granulari
    opt Anteprima File o Documento (In-App o Tab Esterno)
        Op->>UI: Clicca su icona "👁️ Anteprima" o link "↗️ Apri in Drive"
        UI->>UI: Apre modal "#modal-preview-file" (iframe /preview) o nuova scheda (/view)
    end
    Op->>UI: Modifica/conferma azioni (es. cestina duplicato, rinomina cartella, correggi CF)
    alt Applicazione Singolo Caso
        Op->>UI: Clicca su pulsante singolo (es. "⚡ Sposta", "⚡ Rinomina", "⚡ Censisci")
        UI->>Ctrl: executeDriveReconciliation(nucleoId, singleItemPlan)
    else Applicazione per Categoria / Tipologia
        Op->>UI: Clicca su pulsante di testata (es. "⚡ Sposta Tutti", "⚡ Applica Duplicati")
        UI->>Ctrl: executeDriveReconciliation(nucleoId, categoryPlan)
    else Applicazione Globale Selezioni
        Op->>UI: Clicca su "⚡ Applica Azioni Selezionate (Totale)"
        UI->>Ctrl: executeDriveReconciliation(nucleoId, approvedPlan)
    end
    activate Ctrl
    Ctrl->>DR: executeApprovedPlan(nucleoId, plan)
    activate DR

    %% Esecuzione transazionale delle sole azioni approvate
    DR->>GDrive: folder.setName(canonicalName) [Ridenominazione cartelle]
    DR->>GDrive: file.moveTo(targetFolder) [Spostamento file fuori posto]
    DR->>GDrive: file.setName(standardName) [Ridenominazione standard]
    DR->>GDrive: file.setTrashed(true) [Cestinamento duplicati selezionati]
    DR->>Repos: DocumentoRepository.add(...) [Censimento nuovi documenti]
    DR->>Repos: DocumentoRepository.removeById(...) [Eliminazione righe orfane]
    DR->>Repos: BeneficiarioRepository.updateDriveInfo(...) [Allineamento anagrafico]

    DR-->>Ctrl: { success: true, actionsApplied: [...azioni] }
    deactivate DR
    Ctrl-->>UI: { success: true, actionsApplied: [...azioni] }
    deactivate Ctrl

    UI->>Op: Toast successo: "⚡ Bonifica applicata con successo! (N azioni eseguite)"
    UI->>UI: Ricarica lo stato della cartella e aggiorna il database locale
```

---

## 8. Sequenza 8: Gestione del Fascicolo Documentale e Tracciamento Scadenze Relazionale

Mostra il ciclo di registrazione e monitoraggio dei documenti e delle relative scadenze (ISEE con valore in €, titoli di soggiorno con data scadenza, permessi).

```mermaid
sequenceDiagram
    autonumber
    actor Op as Operatore di Sportello
    participant UI as Frontend.html (Tab Documenti / Modal Ben)
    participant Ctrl as Backend.js
    participant DocRepo as DocumentoRepository
    participant DocModel as Documento
    participant SS as Google Sheets ("Documenti")

    Op->>UI: Clicca su "+ Registra Documento"
    UI->>UI: openDocumentoModal(cf, docId)
    UI->>UI: Popola dropdown tipologie da catalogo SSOT Documents
    
    Op->>UI: Seleziona tipo (es. "Attestazione ISEE"), inserisce Valore = 8500.50 e Scadenza = "2026-12-31"
    Op->>UI: Clicca su "Salva Documento"
    
    UI->>Ctrl: google.script.run.submitDocumento(payload)
    activate Ctrl

    Ctrl->>DocRepo: add(payload)
    activate DocRepo

    DocRepo->>DocRepo: generateNextId() (se nuovo record -> progressivo 1..N)
    DocRepo->>DocModel: new Documento(data)
    DocModel->>DocModel: getStatoScadenza() -> calcola "VALIDO", "IN_SCADENZA" o "SCADUTO"
    
    DocRepo->>SS: appendRow([id, intestatario, tipo, categoria, valore, dataEmissione, dataScadenza, idDrive, note, dataInserimento])
    SS-->>DocRepo: Conferma scrittura riga
    
    DocRepo-->>Ctrl: { success: true, data: docModel.toObject() }
    deactivate DocRepo

    Ctrl-->>UI: { success: true, data: savedDoc }
    deactivate Ctrl

    UI->>UI: Aggiorna tabella documenti con badge semaforico colorato (🟢 / 🟡 / 🔴)
    UI->>Op: Mostra Toast: "Documento registrato con successo!"
```

---

## 9. Sequenza 9: Modalità Debug Real-Time, Intercettazione RPC e Diagnostica di Sistema

Descrive il ciclo di vita della modalità di debug: attivazione con scorciatoia `Ctrl + Shift + D` o da interfaccia, intercettazione a bassa invasività delle chiamate RPC tramite JavaScript `Proxy`, monitoraggio delle latenze di rete, ping diagnostico verso `pingBackend()` e generazione del report completo per il supporto tecnico.

```mermaid
sequenceDiagram
    autonumber
    actor Op as Sviluppatore / Operatore
    participant UI as Frontend.html (DOM)
    participant Dbg as DebugManager (Proxy & State)
    participant GAS as google.script.run (Runtime Engine)
    participant Ctrl as Backend.js (Controller)
    participant Session as Google Apps Script Session

    Note over Op,Dbg: 1. Attivazione Modalità Debug (Ctrl + Shift + D o Navbar)
    Op->>UI: Premi Ctrl + Shift + D (oppure click su ⚙️ Impostazioni / 🐞 Debug)
    UI->>Dbg: toggle()
    Dbg->>UI: Mostra Badge Flottante (#debug-floating-badge) & Cassetto (#debug-drawer)
    Dbg->>UI: Salva stato su localStorage ('bussola_debug_mode' = 'true')

    Note over UI,Ctrl: 2. Intercettazione Trasparente delle Chiamate RPC
    UI->>Dbg: Invocazione google.script.run.getInitialAppData()
    activate Dbg
    Dbg->>Dbg: Registra t0 = performance.now()
    Dbg->>GAS: Delega chiamata al runtime Apps Script
    activate GAS
    GAS->>Ctrl: getInitialAppData()
    activate Ctrl
    Ctrl-->>GAS: Ritorna payload { lookups, beneficiari, nuclei, ... }
    deactivate Ctrl
    GAS-->>Dbg: Trigger withSuccessHandler(result)
    deactivate GAS
    Dbg->>Dbg: Calcola latenza = performance.now() - t0
    Dbg->>Dbg: logRPC('getInitialAppData', args, 'SUCCESS', latenza)
    Dbg->>UI: Aggiorna contatore badge, latenza media e lista log tab RPC
    Dbg-->>UI: Inoltra result al callback originale della UI
    deactivate Dbg

    Note over Op,Session: 3. Benchmark Server (Ping Diagnostico)
    Op->>UI: Clicca su "Esegui Ping Server" (#modal-settings o drawer)
    UI->>Dbg: pingServer()
    activate Dbg
    Dbg->>Ctrl: google.script.run.pingBackend()
    activate Ctrl
    Ctrl->>Session: Session.getActiveUser().getEmail()
    Ctrl->>Session: Session.getScriptTimeZone()
    Ctrl-->>Dbg: { success: true, timestamp, serverExecutionMs, userEmail, geminiStatus }
    deactivate Ctrl
    Dbg->>UI: Mostra risultato ping (Latenza Round-Trip, Tempo Server, Account, Modello Gemini)
    deactivate Dbg

    Note over Op,Dbg: 4. Copia Report Diagnostico per Assistenza
    Op->>UI: Clicca su "📋 Copia Report"
    UI->>Dbg: copyDiagnosticsReport()
    Dbg->>Dbg: Raccoglie statistiche RPC, stato DB, log errori e specifiche browser/OS
    Dbg->>UI: navigator.clipboard.writeText(reportMarkdown)
    UI->>Op: Mostra Toast: "Report diagnostico copiato negli appunti!"
```

---

## 11. Sequenza 11: Architettura a Doppio Canale per Valori di Convalida (Lookups) e Sincronizzazione onEdit

Descrive il flusso ad altissima reattività:
1. All'avvio della WebApp (`getInitialAppData`), i dati generali universali sono letti direttamente in RAM dai moduli `Domain/` (**0 ms**), mentre i dati di sportello sono recuperati da `CacheService` / `ScriptProperties` (**2-15 ms**), senza alcuna chiamata a `SpreadsheetApp`.
2. Alle modifiche manuali sui fogli `_Dati*`, il trigger `onEdit(e)` esegue la sincronizzazione chirurgica aggiornando ScriptProperties, Cache RAM e ridimensionando automaticamente i Named Ranges.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Operatore / Admin
    actor Utente as Beneficiario / Operatore WebApp
    participant Sheet as Fogli Nascosti (_Dati*)
    participant Trigger as Menu/main.js (onEdit)
    participant Sync as DomainSyncService
    participant Props as ScriptProperties (L2) & Cache (L1)
    participant WebApp as Frontend.html (SPA)
    participant Ctrl as Backend.js (getInitialAppData)
    participant LookupRepo as LookupRepository
    participant Domain as Domain Static Memory

    %% FASE 1: AVVIO WEBAPP (0 CHIAMATE SPREADSHEETAPP)
    Note over Utente,Domain: FASE 1: Bootstrap Reattivo WebApp
    Utente->>WebApp: Apertura Web App
    WebApp->>Ctrl: google.script.run.getInitialAppData()
    activate Ctrl
    Ctrl->>LookupRepo: getAll()
    activate LookupRepo

    LookupRepo->>Props: Cache.get("DATI_BUNDLE") / Props.getProperty("DATI_BUNDLE")
    Props-->>LookupRepo: JSON string { abitazione, servizi, criticita, ... }
    
    LookupRepo->>Domain: Lettura in memoria (Stati, ISO, Prefissi, Titoli Studio)
    Domain-->>LookupRepo: Array statici congelati (0 ms)

    LookupRepo-->>Ctrl: lookups combinati (RAM + Two-Tier)
    deactivate LookupRepo
    Ctrl-->>WebApp: payload iniziale con dbLookups (nessuna lettura da celle)
    deactivate Ctrl
    WebApp->>Utente: Rendering istantaneo form e dropdown

    %% FASE 2: AGGIORNAMENTO FOGLIO E SYNC AUTOMATICO
    Note over Admin,Sheet: FASE 2: Modifica Configurazione nei Fogli Nascosti
    Admin->>Sheet: Inserisce nuova riga in _DatiBeneficiari o _DatiDocumenti
    Sheet->>Trigger: onEdit(e)
    activate Trigger
    Trigger->>Sync: handleEdit(e)
    activate Sync
    Sync->>Sheet: Legge dati aggiornati dal foglio modificato
    Sync->>Sync: autoAdjustNamedRange(sheet, rangeName, colIndex)
    Sync->>Props: Aggiorna chiave granulare (es. DATI_BENEFICIARI)
    Sync->>Props: Aggiorna chiave aggregata DATI_BUNDLE & DATI_LAST_SYNC
    deactivate Sync
    deactivate Trigger
    Note over Sync,Props: Named Range ridimensionato e Storage Two-Tier allineato
```
