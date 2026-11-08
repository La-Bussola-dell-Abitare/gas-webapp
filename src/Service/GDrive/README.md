# Servizio Google Drive & Riconciliazione File System (`src/Service/GDrive`)

## 1. Responsabilità Architetturale

La cartella `src/Service/GDrive` governa l'alberatura, la catalogazione, l'archiviazione e la bonifica automatica dei file e delle cartelle su Google Drive.

### Struttura dell'Alberatura su Google Drive:
Tutti i file risiedono all'interno della cartella radice ufficiale configurata in `CONFIG.FOLDER_BENEFICIARI_ROOT_ID` (`1cBAWWPnRZNhj1xubIM89inMehvB-sFiE`):

```text
📁 Cartella Radice Beneficiari (CONFIG.FOLDER_BENEFICIARI_ROOT_ID)
│
├── 📁 12 - Franco Rossi (Cartella Nucleo Familiare #12)
│   ├── 📄 Attestazione ISEE 2026 - Franco Rossi.pdf (Documento Nucleo)
│   ├── 📄 Contratto Locazione 2024 - Nucleo #12 Rossi.pdf (Documento Nucleo)
│   │
│   ├── 📁 Franco Rossi (Sottocartella Personale Intestatario)
│   │   ├── 🖼️ Firma Franco Rossi.png
│   │   ├── 📄 Carta d'Identità (scad. 2034) - Franco Rossi.pdf
│   │   └── 📄 Patente di Guida (scad. 2030) - Franco Rossi.pdf
│   │
│   └── 📁 Maria Bianchi (Sottocartella Personale Coniuge)
│       ├── 📄 Carta d'Identità (scad. 2031) - Maria Bianchi.pdf
│       └── 📄 Permesso di Soggiorno (scad. 2027) - Maria Bianchi.pdf
│
└── 📁 105 - Ahmed Ben Ali (Cartella Nucleo Familiare #105)
    └── ...
```

---

## 2. File Presenti

### `DriveManager.js` — Gestione Strutturata di Cartelle e File
- **`getOrCreateNucleoFolder(nucleoId, intestatarioNome)`**:
  Individua la cartella del nucleo tramite regex resiliente (`^\s*<id>([\s\-–—]|$)`). Se non esiste, la crea nella root con il nome standard `[id] - [Nome Cognome Intestatario]` e restituisce `{ id, url, name }`.
- **`getOrCreateBeneficiarioFolder(cf)`**:
  Individua il nucleo di appartenenza del beneficiario, apre la cartella del nucleo e verifica l'esistenza della sottocartella personale `<Nome Cognome>`. Se assente, la crea e ne aggiorna l'ID nel foglio `Beneficiari`.
- **`saveBeneficiarySignature(cf, base64Data)`**:
  1. Decodifica la stringa Base64 in blob immagine PNG trasparente.
  2. Rimuove eventuali file di firma obsoleti presenti nella cartella personale per evitare duplicazioni.
  3. Crea il nuovo file `Firma <Nome> <Cognome>.png`.
  4. Memorizza l'ID del file nella colonna `Firma` di `Beneficiari`.
  5. Sincronizza o inserisce contestualmente il record nel foglio relazionale `Documenti` (tipologia *"Firma Autografa"*, archetipo `UNICO`).
- **`scanBeneficiarioDocuments(cf)`** e **`scanNucleoDocuments(nucleoId)`**:
  Scansionano in tempo reale i file archiviati nella cartella, categorizzandoli tramite il catalogo SSOT `findDocumentType` e arricchendoli con icone, emoji, scadenze e flag economici.

---

### `DriveReconciler.js` — Motore di Diagnostica e Bonifica Automatica (Auto-Healing)
Risolve il debito informativo accumulato a causa di inserimenti o caricamenti manuali diretti su Google Drive senza passare dal gestionale.

- **`auditNucleo(nucleoId)` (Diagnosi)**:
  Esegue un'ispezione approfondita della cartella del nucleo e segnala:
  - `MISPLACED_FILE`: file di singoli membri (es. `Carta Identita Franco.pdf` o `Firma Franco.png`) caricati erroneamente nella radice del nucleo anziché nella cartella personale.
  - `MISSING_MEMBER_FOLDER`: componenti registrati nel nucleo privi della rispettiva sottocartella personale.
  - `UNTRACKED_FILE`: file presenti su Drive ma non registrati nel foglio `Documenti`.
  - `EXPIRED_DOCUMENT`: documenti scaduti o in scadenza entro 60 giorni.
  - Assegna uno stato diagnostico al nucleo: `HEALTHY` (🟢), `WARNING` (🟡) o `CRITICAL` (🔴).

- **`reconcileNucleo(nucleoId, options)` (Bonifica ed Esecuzione)**:
  1. **Crea le cartelle mancanti** per ciascun membro.
  2. **Sposta i file fuori posto** dalla radice del nucleo alla cartella del membro legittimo (utilizzando l'API nativa `file.moveTo`).
  3. **Rinomina i file** applicando la convenzione ufficiale `buildDocumentFileName` (es. da `scan01.pdf` a `Carta d'Identità (scad. 2034) - Franco Rossi.pdf`).
  4. **Registra automaticamente** i file non tracciati nel foglio `Documenti`.

- **`auditArchive()`**:
  Esegue l'audit diagnostico massivo su tutti i nuclei censiti per il cruscotto di conformità generale.
