const { describe, it, before } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('Utils.js - Funzioni di Utilità e Fuzzy Matching', () => {
  before(() => {
    global.Logger = { log: () => {} };
    loadScript('src/Utils/Utils.js');
  });

  describe('calculateLevenshteinDistance', () => {
    it('restituisce 0 per stringhe identiche', () => {
      assert.strictEqual(calculateLevenshteinDistance('mario', 'mario'), 0);
      assert.strictEqual(calculateLevenshteinDistance('', ''), 0);
    });

    it('calcola correttamente sostituzioni, inserimenti e cancellazioni', () => {
      assert.strictEqual(calculateLevenshteinDistance('mario', 'mairo'), 2);
      assert.strictEqual(calculateLevenshteinDistance('casa', 'cassa'), 1);
      assert.strictEqual(calculateLevenshteinDistance('roma', ''), 4);
    });
  });

  describe('calculateStringSimilarity', () => {
    it('restituisce 1.0 per stringhe identiche', () => {
      assert.strictEqual(calculateStringSimilarity('Mario Rossi', 'Mario Rossi'), 1.0);
    });

    it('restituisce valori compresi tra 0 e 1 per stringhe simili', () => {
      const sim = calculateStringSimilarity('Mario Rossi', 'Mairo Rossi');
      assert.ok(sim > 0.75);
      assert.ok(sim < 1.0);
    });
  });

  describe('analyzeFolderName', () => {
    it('riconosce la conformità esatta (EXACT)', () => {
      const res = analyzeFolderName('Mario Rossi', 'Mario', 'Rossi');
      assert.strictEqual(res.status, 'EXACT');
      assert.strictEqual(res.isMismatch, false);
      assert.strictEqual(res.canonicalName, 'Mario Rossi');
    });

    it('rileva il nominativo invertito (INVERTED)', () => {
      const res = analyzeFolderName('Rossi Mario', 'Mario', 'Rossi');
      assert.strictEqual(res.status, 'INVERTED');
      assert.strictEqual(res.isMismatch, true);
      assert.strictEqual(res.canonicalName, 'Mario Rossi');
    });

    it('rileva refusi di battitura (TYPO)', () => {
      const res = analyzeFolderName('Mairo Rossi', 'Mario', 'Rossi');
      assert.strictEqual(res.status, 'TYPO');
      assert.strictEqual(res.isMismatch, true);
      assert.strictEqual(res.canonicalName, 'Mario Rossi');
    });

    it('rileva nominativo parziale mancante (PARTIAL)', () => {
      const res = analyzeFolderName('Rossi', 'Mario', 'Rossi');
      assert.strictEqual(res.status, 'PARTIAL');
      assert.strictEqual(res.isMismatch, true);
      assert.strictEqual(res.canonicalName, 'Mario Rossi');
    });

    it('analizza correttamente il formato cartella nucleo con prefisso ID', () => {
      const exactNuc = analyzeFolderName('12 - Mario Rossi', 'Mario', 'Rossi', '12');
      assert.strictEqual(exactNuc.status, 'EXACT');
      assert.strictEqual(exactNuc.isMismatch, false);

      const invertedNuc = analyzeFolderName('12 - Rossi Mario', 'Mario', 'Rossi', '12');
      assert.strictEqual(invertedNuc.status, 'INVERTED');
      assert.strictEqual(invertedNuc.isMismatch, true);
      assert.strictEqual(invertedNuc.canonicalName, '12 - Mario Rossi');
    });
  });

  describe('Normalizzatori di Testo (Title Case, Comuni, Indirizzi, CF)', () => {
    it('normalizza nomi con particelle nobiliari e trattini in Proper Case', () => {
      assert.strictEqual(normalizeProperCase('MARIO ROSSI'), 'Mario Rossi');
      assert.strictEqual(normalizeProperCase('mario de luca'), 'Mario de Luca');
      assert.strictEqual(normalizeProperCase("gianni d'angelo"), "Gianni d'Angelo");
      assert.strictEqual(normalizeProperCase('jean-luc picard'), 'Jean-Luc Picard');
    });

    it('normalizza denominazioni di comuni preservando la provincia in MAIUSCOLO', () => {
      assert.strictEqual(normalizeCity("REGGIO NELL'EMILIA (RE)"), "Reggio nell'Emilia (RE)");
      assert.strictEqual(normalizeCity('roma rm'), 'Roma (RM)');
      assert.strictEqual(normalizeCity('san donato milanese (mi)'), 'San Donato Milanese (MI)');
    });

    it('normalizza indirizzi mantenendo CAP e numeri civici intatti', () => {
      assert.strictEqual(normalizeAddress('VIA DEI MILLE 10/A, 00185 ROMA (RM)'), 'Via dei Mille 10/A, 00185 Roma (RM)');
    });

    it('normalizza il Codice Fiscale a 16 caratteri alfanumerici maiuscoli', () => {
      assert.strictEqual(normalizeFiscalCode('rss mra 80a01 f205h '), 'RSSMRA80A01F205H');
      assert.strictEqual(normalizeFiscalCode('RSSMRA80A01F205H-EXTRA'), 'RSSMRA80A01F205H');
    });
  });
});
