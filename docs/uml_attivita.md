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
