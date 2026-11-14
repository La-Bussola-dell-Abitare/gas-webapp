const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('Domain/CodiceFiscale.js - Calcolo, Validazione e Omocodie', () => {
  before(() => {
    global.CacheService = { getScriptCache: () => null };
    global.Logger = { log: () => {} };
    loadScript('src/Domain/CodiceFiscale.js');
  });

  describe('Validazione e Carattere di Controllo (CIN)', () => {
    it('riconosce un codice fiscale italiano valido standard', () => {
      // Mario Rossi nato a Milano (F205) il 01/01/1980
      const cf = new CodiceFiscale('RSSMRA80A01F205X');
      assert.strictEqual(cf.isValid(), true);
      assert.strictEqual(cf.getSesso(), 'M');
      const birth = cf.getBirthdate();
      assert.strictEqual(birth.getFullYear(), 1980);
      assert.strictEqual(birth.getMonth(), 0); // Gennaio (0-based)
      assert.strictEqual(birth.getDate(), 1);
    });

    it('riconosce sesso femminile e data corretta per giorno > 40', () => {
      // Giulia Bianchi nata il 15/05/1990 (giorno 55)
      const cin = CodiceFiscale._calcolaCarattereControllo('BNCGLI90E55H501');
      const cfF = new CodiceFiscale('BNCGLI90E55H501' + cin);
      assert.strictEqual(cfF.isValid(), true);
      assert.strictEqual(cfF.getSesso(), 'F');
      const birthF = cfF.getBirthdate();
      assert.strictEqual(birthF.getFullYear(), 1990);
      assert.strictEqual(birthF.getMonth(), 4); // Maggio (indice 4)
      assert.strictEqual(birthF.getDate(), 15);
    });

    it('rifiuta codici fiscali con carattere di controllo (CIN) errato o lunghezza invalida', () => {
      assert.strictEqual(CodiceFiscale.isValid('RSSMRA80A01F205Z'), false); // CIN errato
      assert.strictEqual(CodiceFiscale.isValid('RSSMRA80A01F20'), false); // Troppo corto
      assert.strictEqual(CodiceFiscale.isValid(''), false);
      assert.strictEqual(CodiceFiscale.isValid(null), false);
    });
  });

  describe('Gestione Omocodie', () => {
    it('decodifica correttamente un codice fiscale omocodico', () => {
      // In RSSMRA80A01F205X, la cifra '5' in posizione 14 sostituita con 'R' genera CIN 'S'
      const cfOmocodia = new CodiceFiscale('RSSMRA80A01F20RS');
      assert.strictEqual(cfOmocodia.isValid(), true);
      assert.strictEqual(cfOmocodia.normalizzato, 'RSSMRA80A01F205S');
      const birth = cfOmocodia.getBirthdate();
      assert.strictEqual(birth.getFullYear(), 1980);
      assert.strictEqual(birth.getDate(), 1);
    });
  });
});
