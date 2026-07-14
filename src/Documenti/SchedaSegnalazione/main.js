function testCreaDocumento() {
    const templateId = "1d8lSB1b40QGmZ5yC7ILh7fljzUHuqpllZnDjA0URnx0";
    const folderId = "1RJ_GC2VpCN8tBwsa48jV6sWo6szrqYRs";
    const nomeDocumento = "Scheda Beneficiario - Mario Rossi";

    const dati = {
        //        operatore_nome: "Lorenzo Mazza",
        operatore_contatto: "info@mazzalorenzo.com",
        beneficiario_nome: "Mario",
        beneficiario_cognome: "Rossi",
        beneficiario_datanascita: "10/07/2000",
        beneficiario_luogonascita: "Roma",
        beneficiario_cf: "1234567890123456",
        beneficiario_tel: "1234567890",
        Iscrizione: true,
        beneficiario_descrizione: "Descrizione del caso",
        luogo: "Roma",
        data: "01/01/2000",
        firma: { id: "1-xW-ubGHnTT5rwrdH21vFb5ja6KJVOaV", width: 100, height: 25 }
    };

    const nuovoId = createGoogleDocFromTemplate(templateId, folderId, nomeDocumento, dati);
    Logger.log("Creato documento con ID: " + nuovoId);
}

// Esempio di utilizzo pratico e pulito
function testAutomatico() {

    // Dati per la TABELLA 0 (la prima nel documento)
    var datiPrimaTabella = [
        ["Mario", "Rossi", "Roma", "C"],
        ["Luigi", "Verdi", "Milano"]
    ];

    // Dati per la TABELLA 1 (la seconda nel documento)
    var datiSecondaTabella = [
        ["Prodotto A", "10€"],
        ["Prodotto B", "20€"],
        ["Prodotto C", "30€"]
    ];

    // Passi direttamente le liste: la prima va nella prima tabella, la seconda nella seconda
    addDataToGoogleDocTables("1LLGvRa8sQazBSDgicbzbNn0Yz_eew5zIz1pjbbl8d10", datiPrimaTabella, datiSecondaTabella);
}
