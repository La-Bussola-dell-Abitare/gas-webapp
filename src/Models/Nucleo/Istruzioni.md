# Dati
| Campo | Tipo di dato | Utilizzo | Obbligatorietà | Inserimento nel frontend |
| --- | --- | --- | --- | --- |
| ID | Stringa | ID univoco del nucleo | Obbligatorio | Generato automaticamente con seriale succesivo a quello del nucleo con numero maggiore |
| Intestatario | CF di un Beneficiario | Beneficiario principale del nucleo | Obbligatorio | Tramite campo di ricerca beneficiario |
| ISEE | Numerico con 2 decimali | Valore ISEE del nucleo | Preferibile | Campo numerico con virgola decimale |
| Residenza | Testo | Indirizzo di residenza del nucleo | Obbligatorio | Tramite form separati per stato, comune, CAP, via, civico (preferibilmente con API di geolocalizzazione per suggerire indirizzi) |
| Domicilio | Testo | Indirizzo di domicilio del nucleo | Preferibile | Tramite form separati per stato, comune, CAP, via, civico (preferibilmente con API di geolocalizzazione per suggerire indirizzi) |
| Descrizione caso | Testo | Descrizione del caso | Obbligatorio | Campo di testo lungo |
| Obiettivi e progettualità | Testo | Obiettivi e progettualità del caso | Obbligatorio | Campo di testo lungo |
| Tipologia di richiesta | Testo | Tipologia di richiesta | Obbligatorio | Campo di testo lungo | 
| Orientamento e follow-up | Testo | Orientamento e follow-up del caso | Obbligatorio | Campo di testo lungo | 
| Tipologia abitazione | Testo | Tipologia di abitazione | Obbligatorio | Campo di testo lungo |
| Assistente sociale | Nome e cognome dell'assistente sociale oppure "Sconosciuto" oppure "No" | Operatore sociale di riferimento del nucleo | Obbligatorio | Selezionando prima se esiste l'assistente sociale e successivamente permettendo di inserire il nome |
| Medico di base | Nome e cognome del medico di base oppure "Sconosciuto" oppure "No" | Medico di base di riferimento del nucleo | Obbligatorio | Selezionando prima se esiste il medico di base e successivamente permettendo di inserire il nome |