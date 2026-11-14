# Modulo Geografico e Indirizzi (`src/Models/Places`)

## 1. Responsabilità Architetturale

La cartella `src/Models/Places` si occupa della normalizzazione geografica, della validazione degli indirizzi di residenza/domicilio e della decodifica dei codici catastali (codici Belfiore) utilizzati nel calcolo del Codice Fiscale.

---

## 2. File Presenti

### `0_City.js` — Rappresentazione di Comuni e Stati
Rappresenta un comune italiano o uno stato estero:
- `name`: denominazione ufficiale (es. "Roma", "Napoli").
- `province`: sigla provincia a due lettere (es. "RM", "NA") o `EE` per estero.
- `codiceCatastale`: codice catastale a 4 caratteri (es. `H501` per Roma).
- `cap`: array dei CAP associati al comune.
- Gestisce una cache locale per evitare scansioni ripetute del database dei comuni.

### `Address.js` — Value Object Indirizzo
Rappresenta un indirizzo fisico strutturato:
- `street`: via/piazza e numero civico (es. "Via del Corso, 12").
- `city`: istanza di `City`.
- `postalCode`: codice di avviamento postale (CAP).
- Fornisce metodi per la serializzazione formattata in riga singola (es. *"Via del Corso 12, 00186 Roma (RM)"*).

### `Elenco-comuni-italiani.csv` — Database dei Comuni Italiani
Tabella di lookup contenente tutti i comuni d'Italia con codici ISTAT, codici catastali Belfiore e province, utilizzata dal decodificatore del Codice Fiscale e dai suggeritori di testo.
