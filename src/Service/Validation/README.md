# Modulo di Validazione e Integrità Dati (`src/Service/Validation`)

## 1. Responsabilità Architetturale

La cartella `src/Service/Validation` incapsula la business logic per la verifica di coerenza relazionale, la qualità del dato e le procedure di **Auto-Healing automatico** del database di Google Sheets ("La Bussola dell'Abitare").

Interagisce trasversalmente con le entità `Beneficiari`, `Nuclei familiari` e con l'alberatura file di `Google Drive`.

---

## 2. File del Modulo

### `DataIntegrityService.js` — Motore di Integrità Relazionale & Auto-Healing
Analizza le tabelle relazionali e individua 5 categorie critiche di anomalie:
1. **`DUPLICATE_INTESTATARI` (Errore)**:
   Rileva nuclei familiari che presentano contemporaneamente più di un beneficiario con ruolo di "Intestatario".
   - *Auto-Healing*: Mantiene il primo intestatario censito e declassa automaticamente i successivi ad "Altro componente".
2. **`ORPHAN_BENEFICIARY` (Attenzione)**:
   Beneficiari collegati a un `idNucleo` che non trova corrispondenza nella tabella *Nuclei familiari*.
   - *Auto-Healing*: Creazione della scheda nucleo o rimozione del puntatore orfano.
3. **`MISSING_FOLDER` (Attenzione / Info)**:
   Beneficiari con cella `idCartella` vuota oppure con ID che punta a cartelle inesistenti, rimosse o nel cestino di Google Drive.
   - *Auto-Healing*: Creazione automatica della sottocartella personale `<Nome Cognome>` all'interno della cartella del nucleo e salvataggio del nuovo ID nella cella.
4. **`DUPLICATE_FOLDER` (Errore)**:
   Due o più beneficiari distinti che condividono erroneamente lo stesso `idCartella` Drive personale.
   - *Auto-Healing*: Mantiene la cartella per la prima persona e crea nuove cartelle isolate per le altre.
5. **`ANAGRAFICA_CONFLICT` (Errore / Attenzione)**:
   - Stesso Codice Fiscale attribuito a persone con nomi o cognomi diversi;
   - Codice Fiscale formalmente non conforme (lunghezza $\ne 16$ o carattere di controllo CIN errato);
   - Discrepanza tra il genere (M/F) memorizzato nel foglio e la decodifica del Codice Fiscale (es. sesso F con giorno di nascita $< 40$).
   - *Auto-Healing*: Allineamento del campo sesso in base al CF decodificato deterministico.

---

## 3. Scelte Architetturali e Alternative Scartate

- **Perché un servizio disaccoppiato da UI e Google Sheets**:
  `DataIntegrityService` accetta matrici di dati raw opzionali (`beneficiariData`, `nucleiData`) e un flag `skipDriveCheck`. Questo permette di testare la logica al 100% in locale con la suite Node.js nativa (`npm test`) senza dipendenze lente da Google Apps Script.
- **Alternative Scartate (Trigger `onEdit` real-time)**:
  È stato escluso l'uso di controlli su `onEdit` ad ogni digitazione di cella: l'interrogazione continua di Drive o il ricalcolo relazionale globale provocherebbero un rallentamento inaccettabile del foglio durante il normale data-entry degli operatori. I controlli vengono quindi eseguiti on-demand da menu o dalla sidebar contestuale.

---

## 4. Esempio di Utilizzo

```javascript
// Esecuzione dell'audit completo
const audit = DataIntegrityService.auditBeneficiari();
Logger.log(`Trovate ${audit.totalIssues} anomalie.`);

// Applicazione dell'Auto-Healing in blocco
if (audit.totalIssues > 0) {
  const result = DataIntegrityService.autoHeal();
  Logger.log(`Risolte automaticamente ${result.healedCount} anomalie.`);
}
```
