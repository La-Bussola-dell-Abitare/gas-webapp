# Funzionamento dello Sportello – La Bussola dell’Abitare

## Missione dello Sportello
Lo sportello La Bussola dell’Abitare supporta persone con difficoltà abitative nel Municipio XI, offrendo:
- orientamento immediato
- ascolto e prima accoglienza
- accompagnamento ai servizi sociali
- supporto nella gestione documentale
- monitoraggio dei percorsi

Il servizio è organizzato su due livelli di accesso, con procedure distinte e integrate.

## Servizi dello sportello
- colloqui di assistenza sociale
- domande ERP
- residenza fittizia
- prenotazione CIE?
- consultazione graduatoria ERP?

---

## Modalità di Accesso allo sportello

### Accesso diretto
Accesso diretto allo sportello senza appuntamento.
È il livello di accoglienza iniziale, ascolto e raccolta dei bisogni.

### Contatto a distanza (telefono, whatsapp, social)


### Su appuntamento
Appuntamento preso online direttamente dalla pagina di prenotazione che permette di scegliere anche il servizio richiesto e di autocompilare i propri dati personali. In futuro forse prevediamo di creare un form che permette ai cittadini di caricare anche i propri documenti.
L’accesso avviene solo tramite scheda di segnalazione compilata dall’ente inviante o da operatore.

---

## Gestione interna

### Compiti
#### Compiti comuni
- Rispondere al telefono
- Prenotare appuntamenti
- Scansionare documenti
- Creare e gestire cartelle Drive beneficiari
- Compilare diari giornalieri
- Aggiungere righe a monitoraggio ufficiale
#### Compiti esclusivi operatori
- Compilare scheda di segnalazione quando necessario
#### Compiti esclusivi assistenti sociali
- Compilare scheda intervento individuale
- Compilare scheda anagrafica
- Fare colloqui di assistenza sociale
- Dialogare con altri assistenti sociali?

### Gestione ingressi
#### Fisicamente senza appuntamento
Viene accolto da operatore che, dopo aver analizzato i suoi bisogni:
- fa firmare diario giornaliero
- lo aggiunge al gestionale

In caso ci sia bisogno di passare beneficiario a secondo livello con assistente sociale:
- compila scheda di segnalazione
- prende appuntamento

#### Con appuntamento
#### Con scheda di segnalazione

#### Chi può inviare
- Operatori sociali interni
- Municipio XI  
- Servizi esterni (associazioni, enti, sportelli)

### Come avviene l’invio
1. L’ente compila la scheda di segnalazione (obbligatoria e completa).
2. La invia:
   - tramite cartellina interna (operatori sociali)
   - via email a info@labussoladellabitare.com

### Se un ente scrive chiedendo un appuntamento
- Si risponde inoltrando la scheda di segnalazione.  
- Si attende la scheda compilata.  
- Se non viene inviata → si ricorda che il primo livello è libero.

---

## Contatto con la persona
Le assistenti sociali:
- ricevono la scheda
- contattano la persona via telefono o WhatsApp

---

### Gestione della Documentazione e Google Drive

Per ogni nucleo beneficiario viene creata una cartella Drive all'interno della radice `CONFIG.FOLDER_BENEFICIARI_ROOT_ID` con denominazione standardizzata:

```text
[idNucleo] - [Nome Cognome Intestatario]
(es. 12 - Franco Rossi, 105 - Ahmed Ben Ali)
```

All'interno della cartella del nucleo:
- Risiedono i documenti di pertinenza del nucleo (es. `Attestazione ISEE 2026 - Franco Rossi.pdf`, `Contratto Locazione 2024 - Nucleo #12 Rossi.pdf`).
- Viene creata una **sottocartella personale** per ogni componente censito, denominata `<Nome Cognome>` (es. `Franco Rossi`, `Maria Bianchi`).
- Nella sottocartella personale risiedono:
  - `Firma [Nome] [Cognome].png` (firma autografa acquisita digitalmente)
  - Documenti individuali con naming standard: `Carta d'Identità (scad. 2034) - Franco Rossi.pdf`, `Permesso Soggiorno (scad. 2027) - Ahmed Ben Ali.pdf`.
- Tutti i documenti sono censiti nel foglio Google relazionale **`Documenti`** con calcolo automatico dello stato di validità semaforico (🔴 Scaduto, 🟡 In Scadenza, 🟢 Valido, ⚪ Permanente).

### Acquisizione della Firma e Smart Onboarding con IA:
- **Firma Autografa Digitale**: acquisita direttamente su tablet o touchscreen tramite il Canvas W3C PointerEvents nella Web App, salvata come PNG trasparente in Drive e riutilizzata per compilare automaticamente Fogli Firme e Diari.
- **Smart Form-Filling con IA (Gemini Flash)**: caricando la foto o il PDF della Carta d'Identità, Permesso di Soggiorno o ISEE, il sistema estrae in ~1 secondo tutti i dati anagrafici e del documento, precompilando la scheda per la verifica dell'operatore.
- **Motore di Riconciliazione (Drive Reconciler)**: rileva automaticamente eventuali file caricati a mano fuori posto, li sposta nella cartella corretta del membro, li rinomina secondo lo standard e li registra nel foglio `Documenti`.

---

## 5. Funzionamento del Primo Livello

Operatori sociali svolgono:

- Aggiunta della persona al Foglio firme individuale (ora non più)
- Firma del Diario giornaliero  
- Compilazione della Scheda di segnalazione
- Registrazione nel file MONITORAGGIO UFFICIALE ACCESSI GIORNALIERI
- Registrano solo chi accede al primo livello

---

## 6. Funzionamento del Secondo Livello

Assistenti sociali svolgono:

- Fissano appuntamenti e ricevono le persone
- Aggiungono la persona al Foglio firme individuale
- Fanno firmare il Diario giornaliero
- Scansionano i documenti e li caricano nella cartella Drive
- Compilano il MONITORAGGIO UFFICIALE ACCESSI GIORNALIERI
- Compilano la Scheda anagrafica beneficiari (opzionale ma consigliata)

---

## 7. Attività da svolgere per ogni beneficiario

- Compilare Foglio firme intervento individuale
- Far firmare Diario giornaliero
- Compilare Scheda di segnalazione
- Compilare Monitoraggio ufficiale
- Fotografare/scansionare documenti e caricarli nel Drive
- Compilare anagrafica

---

## 📅 8. Attività ricorrenti

### Ogni giorno
- Compilare Diario giornaliero  
- Compilare riga del Timesheet  
- Compilare riga del Foglio firme

### Ogni mese
- Redigere Relazione individuale per ogni beneficiario seguito

## Domande aperte
- I cittadini possono richiedere autonomamente appuntamento da pagina web? 
- I servizi esterni (segretariato...) possono richiedere appuntamento per un cittadino da pagina web?
- Regole di compilazione di monitoraggio ufficiale: inizialmente veniva compilato da operatore e assistente sociale, poi abbiamo cambiato in modo che se veniva accolto e faceva colloquio lo stesso giorno veniva compilato solo da assistente sociale.
- scheda di segnalazione viene compilata sempre e comunque da operatore anche in caso non ci sia bisogno di passare beneficiario a assistente sociale?