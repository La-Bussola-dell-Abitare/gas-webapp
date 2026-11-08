# Modulo di Script Operativi e Deployment (scripts/)

Script ausiliari per la gestione del ciclo di vita, configurazione e deployment automatizzato del gestionale **"La Bussola dell'Abitare"** tramite `@google/clasp`.

---

## 1. Responsabilità e Ruolo nel Sistema

Google Apps Script non consente a un browser o client non autenticato di visualizzare o testare la WebApp se il file manifest (`src/appsscript.json`) ha `webapp.access` impostato su `MYSELF`. D'altro canto, lasciare la WebApp perennemente esposta su internet (`ANYONE_ANONYMOUS`) comprometterebbe la riservatezza e la sicurezza dei dati gestionali.

Il modulo `scripts/` fornisce lo strumento automatizzato `deploy.js` per:
- **Aprire temporaneamente l'accesso** per il tempo strettamente necessario al collaudo interattivo o di milestone.
- **Chiudere immediatamente l'accesso** e ripristinare lo stato di massima protezione prima del commit o al termine dei test.
- Mantenere stabile l'URL della WebApp aggiornando sempre lo stesso **Deployment ID fisso**.

---

## 2. Struttura dei File

```
scripts/
├── deploy.js   # Script di commutazione accesso (open / close) e deploy clasp
└── README.md   # Questo documento
```

---

## 3. Scelte Architetturali Adottate

### 3.1 Aggiornamento Atomico del Manifest `src/appsscript.json`
Lo script legge il manifest in memoria, aggiorna le proprietà del blocco `webapp`:
- Modalità `open`:
  - `access`: `"ANYONE_ANONYMOUS"`
  - `executeAs`: `"USER_DEPLOYING"`
- Modalità `close`:
  - `access`: `"MYSELF"`
  - `executeAs`: `"USER_DEPLOYING"`
e riscrive il file formattato.

### 3.2 Conservazione dell'URL tramite Deployment ID Fisso
Invece di creare un nuovo deployment con un nuovo URL a ogni release, lo script invoca:
```bash
clasp push && clasp deploy -i AKfycbzkY426RSsiBF19i2GRLd69idx3GbMKj4fZQIcg2G3INwXVSjTiRd-4MEtmp9IA0MFwMw
```
Ciò garantisce che l'URL di collaudo rimanga sempre lo stesso:
`https://script.google.com/macros/s/AKfycbzkY426RSsiBF19i2GRLd69idx3GbMKj4fZQIcg2G3INwXVSjTiRd-4MEtmp9IA0MFwMw/exec`

---

## 4. Motivazioni e Alternative Scartate

1. **Modifica Manuale di `appsscript.json` (Scartata)**:
   - Troppo incline all'errore umano: rischio concreto di dimenticare l'accesso pubblico aperto prima del commit Git o di committare file non formattati.

2. **Creazione continua di nuovi Deployment (Scartata)**:
   - Inquinamento della lista deployment di Google Apps Script (che ha limiti di quota).
   - Cambio continuo di URL che costringerebbe a riconfigurare browser e bookmark a ogni iterazione.

---

## 5. Esempi di Utilizzo

### Apertura Accesso per Collaudo
```bash
npm run deploy:open
```
Esegue:
1. Impostazione di `access: "ANYONE_ANONYMOUS"` in `src/appsscript.json`.
2. `npx clasp push`.
3. `npx clasp deploy -i <DEPLOYMENT_ID> -d "Collaudo aperto..."`.

### Chiusura Accesso e Ritiro WebApp (Sicurezza)
```bash
npm run deploy:close
```
Esegue:
1. Impostazione di `access: "MYSELF"` in `src/appsscript.json`.
2. `npx clasp push`.
3. `npx clasp deploy -i <DEPLOYMENT_ID> -d "Deployment chiuso (MYSELF)"`.
