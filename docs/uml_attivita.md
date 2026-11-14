# Diagrammi UML di Attività (Activity Diagrams)

Documentazione dei processi operativi e dei flussi di lavoro (workflow) dello sportello sociale **"La Bussola dell'Abitare"** (Municipio XI di Roma - Azzurra84), conformi alle direttive illustrate in [`funzionamentoSportello.md`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/docs/funzionamentoSportello.md) e [`automazione.md`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/docs/automazione.md).

---

## 1. Attività 1: Processo di Accoglienza e Smistamento a Sportello

Rappresenta l'intero ciclo operativo che si innesca quando un cittadino accede fisicamente allo sportello, con biforcazione tra accesso libero (1° livello) e colloquio specialistico su appuntamento (2° livello).

```mermaid
flowchart TD
    Start([Inizio: Cittadino accede allo Sportello]) --> CheckApp{Ha un appuntamento fissato<br/>con le Assistenti Sociali?}

    %% RAMO SECONDO LIVELLO
    CheckApp -- "Sì (Secondo Livello)" --> Accoglienza2[Accoglienza da parte dell'Assistente Sociale<br/>Valentina o Kristina/Rachele]
    Accoglienza2 --> Esegui2[Colloquio specialistico di presa in carico]
    Esegui2 --> RegInc2[Registrazione incontro su<br/>'Incontri con assistente sociale']
    RegInc2 --> ScanDoc[Scansione documenti d'identità / soggiorno<br/>e upload nella cartella Drive]
    ScanDoc --> FirmaDoc2[Firma Diario Giornaliero e Foglio Firme]
    FirmaDoc2 --> RegMon2[Registrazione nel Monitoraggio Ufficiale]
    RegMon2 --> End([Fine Intervento])

    %% RAMO PRIMO LIVELLO
    CheckApp -- "No (Primo Livello - Accesso Libero)" --> Accoglienza1[Accoglienza da parte dell'Operatore Sociale<br/>Lorenzo o Carlotta/Luana]
    Accoglienza1 --> Ascolto[Ascolto e rilevazione del bisogno abitativo]
    
    Ascolto --> CheckAnag{Beneficiario presente<br/>nel gestionale?}
    CheckAnag -- "No (Nuovo Accesso)" --> RegBen[Censimento Anagrafica e Nucleo Familiare<br/>con decodifica automatica CF]
    CheckAnag -- "Sì (Già Censito)" --> VerificaDati[Verifica / aggiornamento recapiti e situazione]
    
    RegBen --> Esegui1[Erogazione supporto di primo contatto<br/>orientamento, bando ERP, supporto burocratico]
    VerificaDati --> Esegui1

    Esegui1 --> SalvaInc1[Salvataggio incontro su<br/>'Incontri con operatore']
    SalvaInc1 --> Firme1[Firma del Foglio Firme e Diario Giornaliero]

    Firme1 --> CheckSegnalazione{Il caso richiede presa in carico<br/>di Secondo Livello?}
    
    CheckSegnalazione -- "Sì (Bisogno Complesso)" --> CompilaSegn[Compilazione Scheda di Segnalazione<br/>nella Web App]
    CompilaSegn --> GenDocSegn[Generazione automatica Google Doc da Template<br/>e archiviazione in cartella Drive]
    GenDocSegn --> InoltroSegn[Inoltro scheda alle Assistenti Sociali<br/>cartellina interna o email a info@labussoladellabitare.com]
    InoltroSegn --> FissaApp2[Pianificazione appuntamento di secondo livello]
    FissaApp2 --> RegMon1[Registrazione nel Monitoraggio Ufficiale]

    CheckSegnalazione -- "No (Risolto al 1° Livello)" --> RegMon1
    RegMon1 --> End
```

---

## 2. Attività 2: Processo di Presa in Carico e Gestione del Fascicolo (Secondo Livello)

Descrive le attività svolte dalle assistenti sociali a partire dalla ricezione di una Scheda di Segnalazione proveniente dagli operatori interni o da servizi terzi (Municipio XI, associazioni di territorio).

```mermaid
flowchart TD
    Start([Inizio: Ricezione Scheda di Segnalazione]) --> CheckProvenienza{Canale di invio?}
    
    CheckProvenienza -- "Operatore Interno" --> RiceviInterna[Apertura scheda da cartellina interna Drive]
    CheckProvenienza -- "Ente Terzo / Municipio" --> RiceviMail[Ricezione via email info@labussoladellabitare.com]
    
    RiceviMail --> CheckCompletezza{Scheda completa<br/>dei dati obbligatori?}
    CheckCompletezza -- "No" --> RichiediIntegrazione[Risposta all'ente richiedendo integrazione<br/>o ricordando che il 1° livello è libero]
    RichiediIntegrazione --> AttesaScheda[Attesa scheda corretta]
    AttesaScheda --> CheckCompletezza
    CheckCompletezza -- "Sì" --> ContattoPersona

    RiceviInterna --> ContattoPersona[Contatto con la persona via Telefono o WhatsApp]
    ContattoPersona --> FissaData[Concordata data e ora dell'appuntamento]
    FissaData --> RegistraApp[Registrazione appuntamento nella Web App]

    RegistraApp --> IncontroPresenza[Giorno del colloquio: Accoglienza in sede]
    IncontroPresenza --> CheckDrive{Esiste cartella Drive<br/>'ID - Nome Cognome'?}
    
    CheckDrive -- "No" --> CreaCartella[Creazione cartella su Google Drive]
    CheckDrive -- "Sì" --> ApriCartella[Apertura cartella esistente]
    
    CreaCartella --> UploadDoc[Caricamento scansioni CIE, PdS, ISEE, Scheda Segnalazione]
    ApriCartella --> UploadDoc

    UploadDoc --> StesuraPiano[Compilazione Scheda Anagrafica Beneficiari<br/>e definizione obiettivi progettualità]
    StesuraPiano --> FirmaPresenza[Firma Diario Giornaliero e Foglio Firme]
    FirmaPresenza --> SaveMeeting[Salvataggio incontro nel foglio<br/>'Incontri con assistente sociale']
    SaveMeeting --> SyncMonitoraggio[Aggiunta riga al foglio Monitoraggio Ufficiale]
    SyncMonitoraggio --> End([Fine Presa in Carico])
```

---

## 3. Attività 3: Flusso delle Routine Ricorrenti (Giornaliera e Mensile)

Rappresenta le procedure periodiche di apertura/chiusura giornata e rendicontazione mensile previste dal capitolato del servizio.

```mermaid
flowchart TD
    subgraph RoutineGiornaliera ["Routine Giornaliera (Ogni Giorno di Sportello)"]
        direction TB
        OpenDay([Inizio Giornata]) --> GenDiario[Avvio Web App: Genera Diario Giornaliero Google Doc]
        GenDiario --> CompilaTestata[Inserimento data, nomi operatori presenti e orario apertura]
        
        CompilaTestata --> DuranteGiornata[Svolgimento attività di sportello:<br/>registrazione accessi e raccolta firme]
        
        DuranteGiornata --> CloseDay{Termine orario sportello}
        CloseDay -- "Chiusura" --> CalcolaTotali[Calcolo numero totale beneficiari accolti nel giorno]
        CalcolaTotali --> AppendiChiusura[Inserimento sintesi lavoro svolto e firme operatori nel Diario]
        AppendiChiusura --> Timesheet[Compilazione riga Timesheet front/back office operatore]
        Timesheet --> EndDay([Fine Giornata])
    end

    subgraph RoutineMensile ["Routine Mensile (Chiusura di Fine Mese)"]
        direction TB
        OpenMonth([Fine Mese]) --> RaccogliFF[Raccolta di tutti i Fogli Firme Individuali del mese da Drive]
        RaccogliFF --> CalcolaOre[Calcolo e inserimento totale ore mensili in ciascun foglio firme]
        CalcolaOre --> CrossCheck{Le ore coincidono con<br/>il Timesheet mensile?}
        
        CrossCheck -- "Discrepanza" --> Rettifica[Verifica registri incontri e riconciliazione orari]
        Rettifica --> CrossCheck
        
        CrossCheck -- "Conforme" --> RedigiRelazione[Redazione Relazione Individuale coordinatore-operatore]
        RedigiRelazione --> VerificaMonit[Controllo completezza righe Monitoraggio Ufficiale]
        VerificaMonit --> ExportReport[Esportazione prospetto mensile per Municipio XI / Azzurra84]
        ExportReport --> EndMonth([Archiviazione Mese])
    end
```


---

## 4. Attività 4: Processo di Onboarding e Compilazione Rapida con Smart Document Intelligence (IA)

Descrive il flusso operatore supportato dall'Intelligenza Artificiale multimodale (`gemini-flash-latest`, con fallback su `gemini-flash-lite-latest` e `gemini-pro-latest`) per l'estrazione batch, l'ottimizzazione client-side su Canvas, il popolamento istantaneo dell'anagrafica con normalizzazione Title Case e l'archiviazione automatica dei file su Google Drive e foglio `Documenti`.

```mermaid
flowchart TD
    Start([Inizio: Nuovo Beneficiario o Nucleo allo Sportello]) --> OpenModal[Operatore apre Modale 'Crea Nucleo' o 'Aggiungi / Modifica Membro']
    OpenModal --> Choice{L'operatore ha a disposizione<br/>uno o più documenti/foto?}
    
    %% Flusso Manuale
    Choice -- "No (Inserimento Manuale)" --> ManualInput[Digitazione manuale Codice Fiscale, Nome, Cognome, Dati Nascita]
    ManualInput --> DecodeCF[Decodifica deterministica automatica CF]
    
    %% Flusso con IA
    Choice -- "Sì (CIE, PdS, ISEE, Patente, TS)" --> DragDrop[Operatore trascina uno o più file nella dropzone IA ✨]
    DragDrop --> Compress[Verifica limite 10MB e compressione client Canvas<br/>max 1400px, JPEG 0.78]
    Compress --> CallGemini[Chiamata RPC: smartClassifyDocuments]
    CallGemini --> RetryCascade{Gemini risponde 200 OK<br/>o errore 503 / Timeout?}
    RetryCascade -- "200 OK" --> BatchVision[Analisi multimodale unificata con Schema JSON forzato]
    RetryCascade -- "503 / 429 / Timeout" --> FallbackLoop[Backoff esponenziale e switch automatico<br/>su modello a cascata fallback]
    FallbackLoop --> CallGemini
    BatchVision --> Normalize[Normalizzazione deterministica Title Case & Toponomastica<br/>es. D'Angelo, Reggio nell'Emilia PR]
    Normalize --> Autofill[Autocompilazione campi anagrafici, ISEE, residenza e bandierina]
    Autofill --> AddQueue[Aggiunta file al vassoio documenti pendenti con badge rimovibili]
    
    DecodeCF --> CheckData
    AddQueue --> CheckData[Operatore controlla a colpo d'occhio l'accuratezza dei dati]
    
    CheckData --> SignRequired{È richiesta l'acquisizione<br/>della firma autografa?}
    SignRequired -- "Sì" --> OpenCanvas[Apertura Canvas HTML5 W3C PointerEvents]
    OpenCanvas --> SignDraw[Beneficiario firma su schermo touch o penna stylus]
    SignDraw --> SaveSig[Salvataggio PNG trasparente nella cartella personale Drive]
    SaveSig --> SaveAction
    SignRequired -- "No / Già Acquisita" --> SaveAction
    
    SaveAction[Operatore clicca 'Salva Nucleo' o 'Salva Membro'] --> SaveRecord[Salvataggio record nel foglio 'Beneficiari' o 'Nuclei']
    SaveRecord --> UploadDrive[Salvataggio automatico file pendenti in Google Drive<br/>cartella nucleo o personale in base allo scope]
    UploadDrive --> SyncDoc[Censimento righe nel foglio relazionale 'Documenti']
    SyncDoc --> End([Fine Onboarding con Fascicolo Aggiornato])
```

---

## 5. Attività 5: Ciclo di Diagnostica Avanzata, Bonifica e Riconciliazione Drive con IA

Rappresenta il processo di auto-riparazione (Auto-Healing) e riconciliazione controllata con cui il sistema analizza il file system Drive, rileva duplicati, corregge cartelle errate o invertite tramite fuzzy matching, sincronizza il foglio 'Documenti' e allinea l'anagrafica con Google Gemini Flash.

```mermaid
flowchart TD
    Start([Inizio: Apertura Tab Nuclei o Richiesta Operatore]) --> ClickDiag[Click su '🔍 Diagnostica' nella card del Nucleo]
    ClickDiag --> ExecAudit[Esecuzione auditNucleoDrive sul backend con opzionale Deep AI Scan]
    
    subgraph AuditEngine ["Motore di Ispezione (DriveReconciler.auditNucleo)"]
        direction TB
        InspectRoot[Scansione file e cartelle radice nucleo e sottocartelle membri]
        FuzzyCheck[Fuzzy Matching analyzeFolderName: rileva cartelle invertite, refusi, parziali]
        DupCheck[Deduplicazione Two-Tier MD5 Drive REST API e semantica tipo/anno]
        InspectSheets[Cross-check bidirezionale con il foglio 'Documenti': non censiti e righe orfane]
        AICheck[Analisi OCR multimodale Gemini Flash: estrazione metadati e diff anagrafica]
        
        InspectRoot --> EvaluateIssues{Rilevate anomalie o disallineamenti?}
        FuzzyCheck --> EvaluateIssues
        DupCheck --> EvaluateIssues
        InspectSheets --> EvaluateIssues
        AICheck --> EvaluateIssues
    end
    
    ExecAudit --> AuditEngine
    
    EvaluateIssues -- "Nessuna anomalia" --> StatusGreen[Stato: 🟢 Conforme - File e Cartelle allineati]
    StatusGreen --> CloseModal[Chiusura rapporto]
    
    EvaluateIssues -- "Anomalie rilevate" --> StatusIssues[Stato: 🟡 Warning o 🔴 Critico]
    StatusIssues --> DashboardTabs[Apertura Dashboard a 4 Schede Interattive]
    
    subgraph UserReview ["Revisione Interattiva dell'Operatore"]
        direction TB
        Tab1[1. File & Cartelle: Spostamenti e Nomi Standard tipi noti; file sconosciuti preservati]
        Tab2[2. Duplicati: Confronto visivo anteprime + Scelta Cestina/Archivia/Mantieni]
        Tab3[3. Foglio Documenti: Campi editabili, anteprima file e rimozione orfane]
        Tab4[4. Anagrafica IA: Anteprima diff editabile e documento sorgente]
        
        Tab1 --> BuildPlan[Composizione Piano: Singolo Caso, Categoria o Globale]
        Tab2 --> BuildPlan
        Tab3 --> BuildPlan
        Tab4 --> BuildPlan
    end
    
    DashboardTabs --> UserReview
    BuildPlan --> UserConfirm{Modalità di Applicazione Scelta dall'Operatore?}
    
    UserConfirm -- "Annulla" --> CloseModal
    UserConfirm -- "Singolo Caso (es. ⚡ Sposta / ⚡ Rinomina)" --> RunSingle[Esecuzione piano puntuale]
    UserConfirm -- "Categoria (es. ⚡ Applica Duplicati)" --> RunCategory[Esecuzione piano di tipologia]
    UserConfirm -- "Globale (⚡ Applica Tutte Selezioni)" --> RunGlobal[Esecuzione piano completo]
    
    RunSingle --> RunReconcile[Invocazione RPC executeDriveReconciliation sul backend]
    RunCategory --> RunReconcile
    RunGlobal --> RunReconcile
    
    subgraph HealingEngine ["Motore di Esecuzione Atomica (DriveReconciler.executeApprovedPlan)"]
        direction TB
        CreateMissing[Creazione sottocartelle personali mancanti]
        RenameFolders[Ridenominazione cartelle con nome canonico]
        MoveFiles[Spostamento file con file.moveTo nella cartella corretta]
        RenameFiles[Ridenominazione standard secondo buildDocumentFileName]
        HandleDups[Cestinamento o archiviazione duplicati]
        SyncSheets[Inserimento nuovi documenti e cancellazione righe orfane]
        UpdateAnagrafica[Aggiornamento anagrafico beneficiario e nucleo]
        
        CreateMissing --> RenameFolders
        RenameFolders --> MoveFiles
        MoveFiles --> RenameFiles
        RenameFiles --> HandleDups
        HandleDups --> SyncSheets
        SyncSheets --> UpdateAnagrafica
    end
    
    RunReconcile --> HealingEngine
    HealingEngine --> ReAudit[Rilancio audit automatico di verifica]
    ReAudit --> NotifySuccess[Notifica Toast con riassunto delle azioni applicate]
    NotifySuccess --> End([Cartelle, File, Fogli e Anagrafiche Perfettamente Sincronizzati])
```

---

## 5. Attività 5: Algoritmo di Deduplicazione File Ibrido a Due Livelli (Two-Tier MD5 & Semantico)

Descrive la logica di deduplicazione a due livelli implementata in [`DriveReconciler.js`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/GDrive/DriveReconciler.js). La strategia combina velocità in memoria (Tier 1 su dimensione byte) con la precisione crittografica (Tier 2 su `md5Checksum` da Drive API v3) senza scaricare i blob dal cloud, azzerando i falsi positivi.

```mermaid
flowchart TD
    Start([Inizio Rilevamento Duplicati]) --> Tier1[Tier 1: Raggruppamento file per size in memoria]
    Tier1 --> CheckSizeCount{Numero di file con<br/>identica dimensione > 1?}

    %% RAMO DIMENSIONE UNIVOCA
    CheckSizeCount -- "No (Dimensione univoca)" --> SingleSize[Nessun duplicato per dimensione<br/>Zero chiamate HTTP effettuate]
    SingleSize --> SemanticCheck

    %% RAMO CANDIDATI DUPLICATI
    CheckSizeCount -- "Sì (Gruppo candidato)" --> Tier2[Tier 2: Invocazione getDriveFileMetadata<br/>Recupero md5Checksum via REST API v3]
    Tier2 --> CheckMD5Available{md5Checksum disponibile<br/>per i file del gruppo?}

    %% SOTTO-RAMO NATIVO O SPECIALE SENZA MD5
    CheckMD5Available -- "No (Google Docs nativi o offline)" --> CheckDocName{Nomi file normalizzati<br/>sono identici?}
    CheckDocName -- "Sì" --> FlagExactDoc[Segnalazione duplicato EXACT<br/>Stessa dimensione e stesso nome]
    CheckDocName -- "No" --> DiscardNoMD5[Nessun duplicato: contenuti presumibilmente diversi]
    FlagExactDoc --> SemanticCheck
    DiscardNoMD5 --> SemanticCheck

    %% SOTTO-RAMO FILE BINARI CON MD5
    CheckMD5Available -- "Sì (File binari: PDF, immagini, scansioni)" --> CompareMD5{Gli hash MD5 coincidono?<br/>md5_A === md5_B}
    CompareMD5 -- "Sì (Match 100%)" --> FlagExactHash[Segnalazione duplicato EXACT_HASH<br/>Clone bit-a-bit matematico con certezza 1.0]
    CompareMD5 -- "No (MD5 differenti)" --> DiscardHash[Scartati: Stessa dimensione ma contenuto diverso<br/>Falso positivo evitato con successo!]

    FlagExactHash --> SemanticCheck
    DiscardHash --> SemanticCheck

    %% ANALISI SEMANTICA AGGIUNTIVA
    SemanticCheck[Verifica Semantica: stesso soggetto + tipo documento + anno] --> CheckSemMatch{Doppione semantico<br/>non già flaggato come esatto?}
    CheckSemMatch -- "Sì" --> FlagSemantic[Segnalazione duplicato SEMANTIC<br/>Stesso documento per lo stesso periodo]
    CheckSemMatch -- "No" --> EndAudit([Fine Rilevamento Duplicati])
    FlagSemantic --> EndAudit
```

---

## 7. Attività 7: Processo di Discovery, Estrazione Multimodale IA e Importazione Controllata (Drive &rarr; Sheets)

Descrive il flusso decisionale e operativo con cui le cartelle presenti su Google Drive non ancora catalogate nei fogli di calcolo vengono scoperte, ispezionate con Google Gemini Flash multimodale, normalizzate secondo le regole grammaticali italiane e importate in modo sicuro e atomico.

```mermaid
flowchart TD
    Start([Operatore clicca 'Importa da Drive']) --> SelectMode{Attivare scansione profonda IA?<br/>deepAIScan}
    
    SelectMode -- "Sì" --> SetDeepAI[Flag deepAIScan = true]
    SelectMode -- "No" --> SetFastScan[Flag deepAIScan = false<br/>Solo nomi cartelle e metadati file]
    
    SetDeepAI --> ScanFolders[Scansione cartelle radice in CONFIG.FOLDER_BENEFICIARI_ROOT_ID]
    SetFastScan --> ScanFolders

    ScanFolders --> FilterSystem{Cartella di sistema o già catalogata?<br/>_Archivio, _Template o ID presente}
    FilterSystem -- "Sì" --> SkipFolder[Ignora cartella]
    FilterSystem -- "No" --> ParseFolder[Estrazione intestatario e componenti da sottocartelle]

    ParseFolder --> NormNames[Applicazione Title Case / Proper Case<br/>normalizeProperCase su intestatario e componenti]
    
    NormNames --> CheckAIScan{deepAIScan attivo?}
    CheckAIScan -- "Sì" --> InspectDocs[OCR Multimodale Gemini Flash su file di radice e sottocartelle]
    InspectDocs --> ExtractFullBio[Estrazione CF, data/luogo nascita, residenza, cittadinanza, ISEE, scadenze]
    ExtractFullBio --> NormGeo[Normalizzazione luoghi e indirizzi con normalizeCity e normalizeAddress]
    NormGeo --> RenderUI[Presentazione fascicoli nella modale interattiva]
    CheckAIScan -- "No" --> RenderUI

    RenderUI --> InitCheckboxes[Inizializzazione checkbox: tutte DESELEZIONATE per sicurezza]
    InitCheckboxes --> UserChoice{Modalità di importazione scelta}

    UserChoice -- "Click 'Importa' su singola riga" --> SingleImport[Isolamento record per data-folder-id<br/>Importazione immediata del solo fascicolo selezionato]
    UserChoice -- "Spunta caselle + 'Importa Selezionati'" --> BatchImport[Rilevamento delle sole righe spuntate manualmente]

    SingleImport --> StartLock[Acquisizione LockService.getScriptLock]
    BatchImport --> StartLock

    StartLock --> SaveNucleo[Inserimento/aggiornamento riga in 'Nuclei Familiari' con idCartella]
    SaveNucleo --> SaveMembers[Inserimento/collegamento beneficiari in 'Beneficiari' con anagrafica completa]
    SaveMembers --> SaveDocs[Inserimento file in 'Documenti' con ID Drive e scadenze]
    SaveDocs --> RenameDrive[Ridenominazione cartella Drive nel formato canonico '<ID> - <Nome Intestatario>']
    RenameDrive --> ReleaseLock[Rilascio LockService]

    ReleaseLock --> UpdateUI[Rimozione visiva delle righe importate dalla tabella e notifica Toast]
    UpdateUI --> End([Fine Importazione Fascicoli])
```

---

## 8. Attività 8: Standardizzazione Documenti, Ritaglio Avatar Canvas ed Unione Fronte/Retro

Rappresenta il flusso decisionale e operativo per garantire che ogni documento d'identità caricato nel sistema rispetti gli standard grafici: ritaglio automatico della fototessera per l'avatar del beneficiario, ricomposizione di Fronte e Retro su singola pagina verticale $1024 \times 1312$ px, e tracciamento qualitativo del fascicolo.

```mermaid
flowchart TD
    Start([Caricamento Documento d'Identità]) --> CheckInput{Canale di acquisizione?}

    CheckInput -- "Smart Fill IA (Dropzone)" --> ProcessAI[Analisi multimodale con Gemini Flash]
    CheckInput -- "Pulsante 'Foto' o Manuale" --> ManualCrop[Ritaglio quadrato manuale su Canvas]
    CheckInput -- "Fascicolo Documentale" --> AuditFrag{Rilevati Fronte e Retro separati?}

    ProcessAI --> CheckFace{Rilevato volto con bounding box?<br/>fotoVisoBox}
    CheckFace -- "Sì" --> CropAvatar[Ritaglio Canvas 256x256 px del volto]
    CheckFace -- "No" --> CheckSides
    ManualCrop --> SavePhotoDrive[Salvataggio 'Foto Profilo - Nome.jpg' in cartella personale]
    CropAvatar --> SavePhotoDrive
    SavePhotoDrive --> UpdateBenPhoto[Aggiornamento colonna Foto in 'Beneficiari']

    ProcessAI --> CheckSides{Fronte e Retro in immagini distinte o accoppiate?}
    CheckSides -- "2 File o Fronte+Retro rilevati" --> StitchCanvas[Unione Canvas Verticale 1024x1312 px<br/>Fronte in alto, Retro in basso]
    CheckSides -- "File singolo o già completo" --> CheckMulti{Più documenti nella stessa foto?}

    AuditFrag -- "Sì" --> PromptMerge[Pulsante '🪄 Unisci Fronte/Retro' in tabella documenti]
    PromptMerge --> StitchCanvas

    StitchCanvas --> SaveMerged[Salvataggio documento unico su Drive<br/>Cestinamento file frammentati originali]
    SaveMerged --> SetQualityOptimal[Assegnazione Qualità: '🟢 OTTIMALE']

    CheckMulti -- "Sì" --> SetQualityMulti[Assegnazione Qualità: '🔴 MULTIPLO / DA SEPARARE']
    CheckMulti -- "No (Foto grezza da ritagliare)" --> SetQualityRaw[Assegnazione Qualità: '🟡 FOTO GREZZA']

    SetQualityOptimal --> EvalDocQuality[Calcolo dinamico evaluateBeneficiaryDocQuality]
    SetQualityMulti --> EvalDocQuality
    SetQualityRaw --> EvalDocQuality

    EvalDocQuality --> UpdateSheetQual[Aggiornamento colonna 'Qualità Documenti' nel foglio 'Beneficiari']
    UpdateSheetQual --> End([Fascicolo Standardizzato])
```
