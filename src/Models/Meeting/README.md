# Modello degli Incontri e Colloqui (`src/Models/Meeting`)

## 1. Responsabilità Architetturale

La classe `Incontro` modella i colloqui e le attività di sportello svolte con i beneficiari. 
Il sistema gestisce due canali operativi distinti attraverso due fogli Google dedicati:
1. **`Incontri con operatore` (1° Livello - Front Office)**: accoglienza a libero accesso, orientamento ai servizi, supporto alla compilazione di bandi ERP e morosità incolpevole, rilevazione dei bisogni.
2. **`Incontri con assistente sociale` (2° Livello - Specialistico)**: colloqui su appuntamento per casi complessi con presa in carico sociale continuativa e piani di accompagnamento all'abitare.

---

## 2. Struttura del Modello (`Incontro.js`)

- **`beneficiario`**: nominativo e/o Codice Fiscale del beneficiario accolto.
- **`operatore`**: nome completo dell'operatore o assistente sociale che ha condotto il colloquio.
- **`data`**: data dell'incontro (formato `YYYY-MM-DD`).
- **`oraInizio`** e **`oraFine`**: orari del colloquio nel formato `HH:mm`.
- **`attivita`**: tipologia di intervento erogato (es. *Accoglienza*, *Consulenza Legale*, *Compilazione Bando ERP*, *Mediazione Abitativa*).
- **`descrizione`**: note di sintesi del colloquio e bisogni emersi.
- **`segnalazione`**: booleano o testo (*"Sì" / "No"*). Se "Sì", indica che il caso richiede la generazione di una **Scheda di Segnalazione** e il passaggio al 2° livello.
- **`statoElaborazione`**: tracciamento dello stato di lavorazione (es. *Elaborato*, *In attesa*).
- **`erroriValidazione`**: eventuali anomalie o dati mancanti rilevati durante i controlli di integrità.
- **`tipoIncontro`**: identificatore del livello (*"operatore"* oppure *"assistente_sociale"*).

---

## 3. Interazione con i Fogli di Calcolo

L'accesso e la persistenza degli incontri sono gestiti da [`IncontroRepository`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Repository/Incontro.js) (situato in `src/Models/Meeting/Incontro.js` o nel repository layer):
- Mappatura dinamica delle colonne per entrambi i fogli.
- Filtraggio per tipologia (`tipoIncontro`).
- Inserimento riga (`add`) con timestamp automatico.
- Aggiornamento riga (`update`) basato su chiave univoca composita `(beneficiario + data + oraInizio)`.
