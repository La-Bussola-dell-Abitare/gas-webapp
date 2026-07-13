function onOpen() {
    ui.createMenu("Bussola dell'Abitare")
        .addItem("Apri Sportello (Web App)", "showWebAppSidebar")
        .addSubMenu(ui.createMenu("Beneficiari")
            .addItem("Aggiungi nucleo familiare", "Beneficiario.add")
            .addItem("Modifica nucleo familiare", "")
        )
        .addSubMenu(ui.createMenu('Incontri')
            .addItem("Nuovo incontro", "showWebAppSidebar")
            .addItem("Modifica incontro", "showWebAppSidebar")
        )
        .addSubMenu(ui.createMenu('Documenti')
            .addItem("Foglio firme", "showWebAppSidebar")
            .addItem("Scheda di segnalazione", "showWebAppSidebar")
            .addItem("Diario giornaliero", "showWebAppSidebar")
            .addItem("Scheda Anagrafica", "showWebAppSidebar")
            .addItem("Monitoraggio ufficiale", "showWebAppSidebar")
        )
        .addToUi();
}


/**
 * Mostra la Web App dello sportello all'interno della barra laterale di Google Sheets.
 */
function showWebAppSidebar() {
    const html = HtmlService.createTemplateFromFile("WebApp/Frontend")
        .evaluate()
        .setTitle("Sportello - Bussola dell'Abitare");
    SpreadsheetApp.getUi().showSidebar(html);
}