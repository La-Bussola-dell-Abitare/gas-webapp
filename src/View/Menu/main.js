/**
 * @file main.js
 * @description Modulo per l'integrazione dell'interfaccia utente all'interno di Google Sheets.
 * Inietta all'evento `onOpen()` il menu contestuale personalizzato "Bussola dell'Abitare"
 * e fornisce la funzione per l'apertura della Web App all'interno della barra laterale (Sidebar).
 * @module View/Menu
 */

/**
 * Trigger semplice di Google Apps Script eseguito all'apertura del foglio di calcolo.
 * Costruisce e visualizza il menu personalizzato "Bussola dell'Abitare" con sottomenu
 * per Beneficiari, Incontri e Documenti.
 * 
 * @param {GoogleAppsScript.Events.SheetsOnOpen} [e] - L'evento di apertura del foglio.
 * @return {void}
 */
function onOpen(e) {
    ui.createMenu("Bussola dell'Abitare")
        .addItem("Apri Sportello (Web App)", "showWebAppSidebar")
        .addSubMenu(ui.createMenu("Beneficiari")
            .addItem("Aggiungi nucleo familiare", "Beneficiario.add()")
            .addItem("Modifica nucleo familiare", "showWebAppSidebar")
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
 * Mostra la Web App dello sportello all'interno della barra laterale (Sidebar) di Google Sheets.
 * Renderizza il template HTML "View/WebApp/Frontend" con titolo dedicato.
 * 
 * @return {void}
 */
function showWebAppSidebar() {
    const html = HtmlService.createTemplateFromFile("View/WebApp/Frontend")
        .evaluate()
        .setTitle("Sportello - Bussola dell'Abitare");
    SpreadsheetApp.getUi().showSidebar(html);
}
