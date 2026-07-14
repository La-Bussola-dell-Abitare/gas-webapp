/**
 * Suite di test per la validazione automatica dei Modelli e dei Repository del progetto.
 */
function runSystemTests() {
  Logger.log("=== INIZIO TEST DI SISTEMA ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      Logger.log("[OK] " + message);
      passed++;
    } else {
      Logger.log("[FAIL] " + message);
      failed++;
    }
  }

  // ---------------------------------------------------------
  // 1. TEST CODICE FISCALE
  // ---------------------------------------------------------
  Logger.log("\n--- Test CodiceFiscale ---");
  try {
    const cfIt = new CodiceFiscale("RSSMRA80A01F205H"); // Roma (F205), Maschio, Nato il 01/01/1980
    assert(cfIt.isValid(), "CF Italiano valido riconosciuto");
    assert(cfIt.getSesso() === "M", "Sesso Maschio estratto correttamente");
    assert(cfIt.getBirthplaceCountry() === "Italia", "Stato di nascita Italia riconosciuto");
    
    const birthDate = cfIt.getBirthdate();
    assert(birthDate.getFullYear() === 1980 && birthDate.getMonth() === 0 && birthDate.getDate() === 1, "Data di nascita 01/01/1980 estratta correttamente");

    // Test omocodia
    const cfOmocodia = new CodiceFiscale("RSSMRA80A01F20LH"); // Con omocodia su ultima cifra giorno (5 -> L)
    assert(cfOmocodia.isValid(), "CF con omocodia riconosciuto valido");
    assert(cfOmocodia.getBirthdate().getDate() === 1, "Data decodificata con omocodia corretta");
  } catch (e) {
    assert(false, "Errore durante i test di CodiceFiscale: " + e.message);
  }

  // ---------------------------------------------------------
  // 2. TEST CITY (GEOGRAFIA E API PUBBLICHE)
  // ---------------------------------------------------------
  Logger.log("\n--- Test City ---");
  try {
    const roma = new City("Roma");
    assert(roma.country === "Italia", "Nazione di Roma riconosciuta come Italia");
    assert(roma.province === "RM", "Provincia di Roma riconosciuta come RM");
    assert(roma.codiceCatastale === "H501", "Codice Catastale di Roma riconosciuto come H501");
    assert(roma.cap.includes("00118") || roma.cap.includes("00100") || roma.cap.length > 0, "Lista dei CAP di Roma recuperata");

    // Test città estera
    const parigi = new City("Paris");
    assert(parigi.country !== "Italia" && parigi.country !== "", "Città estera Parigi localizzata (" + parigi.country + ")");
  } catch (e) {
    assert(false, "Errore durante i test di City: " + e.message);
  }

  // ---------------------------------------------------------
  // 3. TEST PERSON E OPERATORE (OOP)
  // ---------------------------------------------------------
  Logger.log("\n--- Test Operatore ---");
  try {
    const cfOp = new CodiceFiscale("RSSMRA80A01F205H");
    const op = new Operatore({
      name: "Mario",
      surname: "Rossi",
      birthDate: new Date(1980, 0, 1),
      birthPlace: new City("Roma"),
      taxCode: cfOp,
      operatore: "mrossi",
      qualifica: "Operatore Sociale",
      ruolo: "Accoglienza"
    });

    assert(op.name === "Mario", "Name impostato correttamente");
    assert(op.nome === "Mario", "Alias retrocompatibile 'nome' funzionante");
    assert(op.cf === "RSSMRA80A01F205H", "Alias retrocompatibile 'cf' funzionante");
    assert(op.operatore === "mrossi", "Proprietà operatore impostata correttamente");
  } catch (e) {
    assert(false, "Errore durante i test di Operatore: " + e.message);
  }

  // ---------------------------------------------------------
  // 4. TEST BENEFICIARIO E GROUPING DOCUMENTI
  // ---------------------------------------------------------
  Logger.log("\n--- Test Beneficiario ---");
  try {
    const cfBen = new CodiceFiscale("RSSMRA80A01F205H");
    const ben = new Beneficiario({
      name: "Luca",
      surname: "Bianchi",
      taxCode: cfBen,
      birthDate: new Date(1980, 0, 1),
      birthPlace: new City("Roma"),
      statoLavorativo: "occupato",
      titoloStudio: "diploma",
      documents: {
        cartaIdentita: "elettronica",
        passaporto: true,
        patente: false
      }
    });

    assert(ben.documents.cartaIdentita === "elettronica", "Carta identità memorizzata nell'oggetto documents");
    assert(ben.cartaIdentita === "elettronica", "Getter alias 'cartaIdentita' funzionante per retrocompatibilità");
    assert(ben.documents.passaporto === true, "Passaporto memorizzato correttamente");
    assert(ben.passaporto === true, "Getter alias 'passaporto' funzionante");
    assert(ben.patente === false, "Getter alias 'patente' funzionante");
  } catch (e) {
    assert(false, "Errore durante i test di Beneficiario: " + e.message);
  }

  // ---------------------------------------------------------
  // 5. TEST REPOSITORY (INTEGRAZIONE SHEET SE ESISTENTI)
  // ---------------------------------------------------------
  Logger.log("\n--- Test Repository ---");
  try {
    const operatori = OperatoreRepository.getAll();
    Logger.log("Operatori trovati nel foglio: " + operatori.length);
    assert(Array.isArray(operatori), "OperatoreRepository.getAll() restituisce un array");

    const beneficiari = BeneficiarioRepository.getAll();
    Logger.log("Beneficiari trovati nel foglio: " + beneficiari.length);
    assert(Array.isArray(beneficiari), "BeneficiarioRepository.getAll() restituisce un array");
  } catch (e) {
    Logger.log("Avviso: Impossibile testare la connettività ai fogli in questo contesto o foglio non configurato: " + e.message);
  }

  Logger.log("\n=== FINE TEST DI SISTEMA ===");
  Logger.log("RISULTATI: passed=" + passed + ", failed=" + failed);
  return { passed, failed };
}
