# Dati

Ogni beneficiario ha: 

| Campo | Tipo di dato | Utilizzo | Obbligatorietà | Inserimento nel frontend |
| --- | --- | --- | --- |
| Rapporto con intestatario del nucleo familiare | Testo | Può essere intestatario, coniuge, figlio, parente, altro | Necessario | Tramite form con dropdown list |
| Nome | Testo |  | Necessario | Tramite form con input text |
| Cognome | Testo |  | Necessario | Tramite form con input text |
| Codice fiscale | Testo | da cui è possibile ricavare data di nascita, stato di nascita, luogo di nascita, genere, età | Necessario | Tramite form con input text che controlla validità del CF |
| Data di nascita | Data |  | Necessaria ma presa di default da CF | Tramite form con calendario che permette di selezionare solo date passate |
| Stato di nascita | Testo |  | Necessario ma presa di default da CF | Tramite form con dropdown list ma precompilato a partire dal CF e editabile solo su richiesta |
| Luogo di nascita | Testo |  | Necessario ma presa di default da CF | Tramite form con dropdown list ma precompilato a partire dal CF e editabile solo su richiesta |
| Email | Testo | Anagrafica | Opzionale | Tramite form con input text che controlla se il formato è una mail valida |
| Telefono | Testo | Scheda di segnalazione, anagrafica | Necessario | Tramite form con input text che controlla che sia un numero di telefono valido |
| Status lavorativo | Lista precompilata (occupato (irregolare, occasionale, stabile), disoccupato, studente, pensionato, inattivo, lavoratore autonomo/atipico, iscritto CPI, categoria protetta) | Per anagrafica e monitoraggio ufficiale | Tramite form con dropdown list |
| Titolo di studio | Lista precompilata (elementare, media, diploma, laureato, post-laurea, master, dottorato, nessun titolo) | Per anagrafica e monitoraggio ufficiale | Tramite form con dropdown list |
| Cittadinanza | Testo | Anagrafica | Obbligatorio | Tramite form con dropdown list |
| Residenza | Testo | Anagrafica | Autocompletato con dati del nucleo familiare e possibilità di cambiarlo su richiesta Tramite form separati per stato, comune, CAP, via, civico (preferibilmente con API di geolocalizzazione per suggerire indirizzi) |
| Domicilio | Testo | Anagrafica | Autocompletato con dati del nucleo familiare e possibilità di cambiarlo su richiesta Tramite form separati per stato, comune, CAP, via, civico (preferibilmente con API di geolocalizzazione per suggerire indirizzi) |
| Firma | File | Foglio firme, diario giornaliero | Preferibile | Firma autografa digitale (ad esempio tramite form con disegno) |
| Carta identità | Lista predefinita tra (Non posseduto, cartacea, elettronica) | Ritrovare scan del documento su GDrive cercando CIE e cognome e nome del beneficiario | Obbligatorio | Tramite form che permette il caricamento del documento dopo che è stato selezionato che il beneficiario lo possiede |
| Passaporto | Booleano per indicare se il beneficiario lo possiede | Ritrovare scan del documento su GDrive dal numero | Preferibile | Tramite form che permette il caricamento del documento dopo che è stato selezionato che il beneficiario lo possiede |
| Patente | Booleano per indicare se il beneficiario la possiede | Ritrovare scan del documento su GDrive dal numero | Preferibile | Tramite form che permette il caricamento del documento dopo che è stato selezionato che il beneficiario lo possiede |
| Permesso di soggiorno | Booleano per indicare se il beneficiario lo possiede | (se straniero) Preferibile | Tramite form che permette il caricamento del documento dopo che è stato selezionato che il beneficiario lo possiede |
| Tessera sanitaria | Booleano per indicare se il beneficiario la possiede |  | Tramite form che permette il caricamento del documento dopo che è stato selezionato che il beneficiario lo possiede |
| Stato civile | Lista predefinita tra: (singolo, coniugato, unito civilmente, separato, divorziato, vedovo) | Anagrafica |
| Anno arrivo in Italia | Anno | Anagrafica per il minore | Preferibile | Tramite form con calendario che permette di selezionare solo date passate |