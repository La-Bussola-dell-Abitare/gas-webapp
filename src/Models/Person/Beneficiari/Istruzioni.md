# Modello del Beneficiario (`src/Models/Person/Beneficiari`)

## 1. Descrizione e Responsabilità

La classe `Beneficiario` rappresenta l'utente o cittadino accolto dallo sportello sociale "La Bussola dell'Abitare" (Municipio XI di Roma).
Estende la classe base [`Person`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Models/Person/0_Person.js) aggiungendo le dimensioni sociali, abitative e amministrative specifiche del servizio:
- Appartenenza al nucleo familiare (`idNucleo`) e relazione di parentela con l'intestatario (`rapportoIntestatario`).
- Stato occupazionale (`statoLavorativo`) e livello di istruzione (`titoloStudio`).
- Residenza e domicilio anagrafico.
- Presa in carico dei servizi sociali territoriali (`assistenteSociale`).
- Inventario dei documenti posseduti (`cartaIdentita`, `passaporto`, `patente`, `permessoSoggiorno`, `tesseraSanitaria`).
- Riferimenti a Google Drive: ID della sottocartella personale (`idCartella`) e ID del file della firma autografa (`firma`).

---

## 2. Struttura del Foglio Google `Beneficiari`

| Indice Colonna | Nome Intestazione | Tipo Dato | Descrizione |
| :---: | :--- | :--- | :--- |
| **A** | **`ID Nucleo`** | Stringa / Intero | Riferimento al nucleo familiare di appartenenza |
| **B** | **`Rapporto Intestatario`** | Testo (Enum) | *Intestatario*, *Coniuge*, *Figlio/a*, *Genitore*, *Parente*, *Altro* |
| **C** | **`Nome`** | Testo | Nome di battesimo del beneficiario |
| **D** | **`Cognome`** | Testo | Cognome del beneficiario |
| **E** | **`Codice Fiscale`** | Testo (16 car.) | Codice Fiscale italiano (Primary Key logica per unicità) |
| **F** | **`Data di Nascita`** | Data (`YYYY-MM-DD`) | Data di nascita (deducibile automaticamente dal CF) |
| **G** | **`Luogo di Nascita`** | Testo | Comune italiano di nascita o Stato estero di nascita |
| **H** | **`Sesso`** | Testo (Enum) | *M* oppure *F* (deducibile dal CF) |
| **I** | **`Telefono`** | Testo | Numero con prefisso internazionale (es. `+39 333 1234567`) |
| **J** | **`Email`** | Testo | Indirizzo di posta elettronica |
| **K** | **`Cittadinanza`** | Testo | Cittadinanza (risolta tramite modello SSOT `Countries`) |
| **L** | **`Residenza`** | Testo | Indirizzo di residenza anagrafica |
| **H** | **`Domicilio`** | Testo | Domicilio effettivo (se diverso dalla residenza) |
| **N** | **`Stato Civile`** | Testo (Enum) | *Celibe/Nubile*, *Coniugato/a*, *Separato/a*, *Divorziato/a*, *Vedovo/a* |
| **O** | **`Anno Arrivo Italia`** | Intero (YYYY) | Anno di immigrazione in Italia (solo per cittadini non italiani) |
| **P** | **`Stato Lavorativo`** | Testo (Enum) | *Occupato*, *Disoccupato*, *Inattivo*, *Pensionato*, *Studente*... |
| **Q** | **`Titolo di Studio`** | Testo (Enum) | *Nessun titolo*, *Licenza Elementare*, *Licenza Media*, *Diploma*, *Laurea* |
| **R** | **`Assistente Sociale`** | Testo | Indicazione se in carico ai servizi sociali (*Sì / No / Nominativo*) |
| **S**-**W** | *(Legacy Documenti)* | - | *(Colonne storiche non più alimentate: tutti i documenti risiedono nel foglio relazionale `Documenti`)* |
| **X** | **`idCartella`** | Testo (33 car.) | ID della sottocartella personale del beneficiario su Google Drive |
| **Y** | **`Firma`** | Testo (33 car.) | ID del file immagine PNG della firma autografa su Google Drive |

---

## 3. Gestione su Google Drive e Firma Autografa

### Sottocartella Personale del Beneficiario:
- Ciascun beneficiario possiede una sottocartella personale denominata con il suo **Nome Completo** (`<Nome Cognome>`), posizionata all'interno della cartella del nucleo familiare (`<id> - <Intestatario>`).
- L'ID della cartella viene generato da [`DriveManager.getOrCreateBeneficiarioFolder(cf)`](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/Service/GDrive/DriveManager.js) e memorizzato nella colonna `idCartella`.

### Firma Autografa Digitale:
- Viene acquisita tramite l'interfaccia HTML5 Canvas (con supporto a mouse, touchscreen e penne stylus).
- Salvata come immagine PNG a sfondo trasparente denominata:
  ```text
  Firma [Nome] [Cognome].png
  ```
- L'ID file risultante viene:
  1. Memorizzato nella colonna **`Firma`** del foglio `Beneficiari`.
  2. Registrato contestualmente nel foglio relazionale **`Documenti`** come tipologia *"Firma Autografa"* (archetipo `UNICO`).
  3. Utilizzato dal motore di templating per sostituire il segnaposto `{firma}` nel *Foglio Firme* e nel *Diario Giornaliero*.

---

## 4. Validazioni Speciali

1. **Codice Fiscale**: validazione formale e sintattica (16 caratteri, codice di controllo cin) con decodifica automatica di data di nascita, sesso e comune/stato di nascita estero.
2. **Anno Arrivo in Italia**:
   - Abilitato se la cittadinanza non è italiana.
   - Vincolato: non può essere antecedente all'anno di nascita del beneficiario né successivo all'anno corrente.
