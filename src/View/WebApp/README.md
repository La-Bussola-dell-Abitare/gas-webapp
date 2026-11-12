# Modulo View WebApp (`src/View/WebApp`)

## 1. Responsabilità del Modulo
Il modulo `src/View/WebApp` costituisce il livello di presentazione (View nell'architettura MVC) del gestionale **"La Bussola dell'Abitare"**.
Rappresenta una **Single Page Application (SPA)** eseguita all'interno dell'infrastruttura Google Apps Script (`HtmlService`), incapsulata nel file [Frontend.html](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/View/WebApp/Frontend.html).

---

## 2. File del Modulo
- **[Frontend.html](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/View/WebApp/Frontend.html)**: Template unificato contenente fogli di stile (CSS Material 3 / Roma Capitale), struttura markup HTML5 e logica interattiva client-side JavaScript.
- **[logo.svg](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/View/WebApp/logo.svg)**: Grafica vettoriale ufficiale con il logo del Municipio XI e la bussola simbolica.
- **[webapp.md](file:///d:/Lorenzo/Public/#Work/Azzurra84/Bussola%20dell'Abitare/gas-webapp/src/View/WebApp/webapp.md)**: Specifica funzionale e manuale operativo delle viste, delle modali e dei controller client.

---

## 3. Scelte Architetturali Adottate e Alternative Scartate

### 3.1 Navigazione a Schede con Elementi Nativi `<button type="button">`
- **Soluzione Adottata**: I tab di navigazione principale (`menu-incontri`, `menu-nuclei`, `menu-documenti`, `menu-appuntamenti`) sono stati implementati con elementi semantici nativi `<button type="button" class="nav-link">`, associando sia `onclick="showTab('...')"` che un event listener su `initNavigation()`.
- **Motivazione**: All'interno del container iframe di Apps Script (`userCodeAppPanel`), ancore `<a>` con `href="javascript:void(0)"` o `href="#"` sono soggette a blocchi e warning delle Content Security Policy (CSP) dei browser moderni. L'elemento button è nativamente privo di navigazione e gestisce gli eventi di click con totale affidabilità.
- **Alternative Scartate**:
  - `<a> con href="javascript:void(0)"`: Scartato per incompatibilità CSP in specifici ambienti browser sandboxati.
  - Componenti Bootstrap Tab con `data-bs-toggle="tab"`: Scartato perché i pannelli necessitano di funzioni di rendering dedicate all'attivazione (`renderNucleiList`, `renderAllDocumentiTable`, ecc.) e richiedono un controllo programmatico dello stato.

### 3.2 Scoping Rigoroso della Classe `.active`
- **Soluzione Adottata**: In `showTab(tabId)`, la rimozione della classe `.active` è limitata al selettore `.app-header .app-top-nav .nav-link`.
- **Motivazione**: Un selettore generico `.nav-link` azzerava anche le classi attive delle sottoschede interne alle finestre modali (es. le 4 schede di `#modal-diagnostica-drive`), provocando anomalie grafiche e la mancata evidenziazione della tab corrente.

### 3.3 Accesso Rapido alla Diagnostica Drive per il Nucleo di Test (#3 Lorenzo Mazza)
- **Soluzione Adottata**: Inserimento di pulsanti diretti ad alta visibilità sia nella navbar superiore che nell'intestazione della scheda *Nuclei e Persone* (`🔍 Diagnostica #3`).
- **Motivazione**: Consente a sviluppatori e collaudatori di eseguire istantaneamente l'audit diagnostico e la riconciliazione granulare sul nucleo designato dal protocollo SSOT (`Nucleo #3: Lorenzo Mazza`) con un singolo click, senza dover navigare tra le liste.

### 3.4 Vincolo Critico Google Apps Script: Divieto di `//` nei Template Literals (Backtick)
- **Problema Riscontrato**: Il pre-processore di `HtmlService.createTemplateFromFile().evaluate()` esegue una rimozione dei commenti di riga basata su regex. Se una stringa letterale ES6 con backtick contiene il doppio slash (es. ``const url = `https://drive.google.com/...`;`` o ``<a href="https://drive.google.com/file/d/${id}/view">``), il parser considera `//` come l'inizio di un commento JavaScript ed elimina arbitrariamente tutto il resto della riga fino al newline. Questo generava una stringa monca (``<a href="https:``) e scatenava un fatale `SyntaxError: Unexpected identifier 'https'` a runtime, bloccando l'intero script del browser prima che qualsiasi funzione (inclusa `showTab` o `window.onload`) venisse registrata.
- **Soluzione Adottata**: Introdotta la funzione helper globale `getDriveFileUrl(fileId)` con stringhe ad apici singoli `'https://drive.google.com/file/d/' + ...` (gli apici singoli/doppi sono protetti dal parser GAS). Nei template letterali backtick HTML viene richiamato `${getDriveFileUrl(fileId)}`, garantendo zero occorrenze di `//` all'interno di backtick.
- **Gestione Asincrona Iframe Preview**: Rimosso l'attributo inline `onload="onPreviewIframeLoaded()"` dal markup del modal per evitare `ReferenceError` all'avvio della pagina su `about:blank`, delegando il listener a `iframe.onload` programmatico al momento del popolamento di `src`.

### 3.5 Bonifica Blocchi Sporchi e Concorrenza Client/Server
- **Problema Riscontrato**: A seguito di una sostituzione massiva involontaria, il blocco di validazione client-side dell'intestatario (`if (data.rapportoIntestatario && ...)`) era stato iniettato immediatamente prima di ogni occorrenza di `google.script.run` (31 funzioni diverse), dove la variabile `data` non era definita. Ciò causava un immediato `ReferenceError: data is not defined` su ogni chiamata RPC, inclusa l'inizializzazione `getInitialAppData` e `reloadData`.
- **Soluzione Adottata**: Rimossi i 31 blocchi orfani e confinata la validazione client-side esclusivamente al form submission `handleModalBenSubmit(e)`, dove l'oggetto `data` è legittimamente instanziato e popolato dai campi del form.

### 3.6 Sistema di Notifiche Toast Sovraordinato ai Modali (`z-index: 10050`) e Allineamento 24px
- **Problema Riscontrato**: Quando una finestra modale era aperta (es. inserimento o modifica nucleo familiare `#modal-nucleo`), i messaggi di errore o notifica generati da `showToast()` venivano oscurati. Inoltre, a causa della larghezza fissa del toast Bootstrap (`350px`) e del mancato allineamento flexbox a destra all'interno del contenitore (`440px`), il toast appariva visivamente distante 129px dal margine destro dello schermo invece dei 24px previsti.
- **Soluzione Adottata**:
  - Elevato lo `z-index` del container a `10050`, rendendolo rigorosamente sovraordinato a qualsiasi modale, backdrop, offcanvas o drawer.
  - Spostato il posizionamento in alto a destra (`top: 24px; right: 24px;` su desktop, `top: 16px; left: 16px; right: 16px;` su mobile) con `align-items: flex-end`, `width: auto` e `max-width: calc(100vw - 48px)`. Questo allinea i toast perfettamente a filo destro a esattamente **24px reali** dal limite della finestra.
  - Arricchito il rendering con icone contestuali vettoriali Bootstrap Icons (es. `bi-exclamation-octagon-fill` per errori, `bi-check-circle-fill` per successi), pulsante di chiusura esplicito e durata prolungata a 6,5 secondi per gli errori critici.

---

## 4. Esempi di Utilizzo

```javascript
// Navigazione programmatica affidabile tra le sezioni principali
showTab('tab-nuclei');

// Apertura sicura dell'URL file Drive
const viewUrl = getDriveFileUrl(fileId);

// Avvio diretto della suite diagnostica e riconciliazione sul Nucleo di Test
runNucleoHealthCheck('3', buttonElement);
```
