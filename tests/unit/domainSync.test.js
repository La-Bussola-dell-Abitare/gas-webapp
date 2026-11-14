const { describe, it, before, beforeEach } = require('node:test');
const assert = require('node:assert');
const { loadScript } = require('../loadSrc.js');

describe('DomainSyncService.js & LookupRepository.js - Architettura a Doppio Canale e Sincronizzazione Lookups', () => {
  let mockProperties = {};
  let mockCache = {};
  let mockSpreadsheet = null;

  before(() => {
    // 1. Caricamento SSOT di Dominio
    loadScript('src/Domain/country.js');
    loadScript('src/Domain/education.js');
    loadScript('src/Domain/documents.js');
    loadScript('src/Domain/CodiceFiscale.js');

    // 2. Caricamento Servizio di Sincronizzazione e Repository
    loadScript('src/Service/Sync/DomainSyncService.js');
    loadScript('src/Repository/LookupRepository.js');
  });

  beforeEach(() => {
    mockProperties = {};
    mockCache = {};

    global.Logger = {
      log: () => {}
    };

    global.PropertiesService = {
      getScriptProperties: () => ({
        getProperty: (key) => mockProperties[key] || null,
        setProperty: (key, val) => { mockProperties[key] = String(val); },
        deleteProperty: (key) => { delete mockProperties[key]; }
      })
    };

    global.CacheService = {
      getScriptCache: () => ({
        get: (key) => mockCache[key] || null,
        put: (key, val, ttl) => { mockCache[key] = String(val); },
        remove: (key) => { delete mockCache[key]; }
      })
    };
  });

  describe('Custom Formulas per Google Sheets (Array Spill)', () => {
    it('LISTA_STATI_MONDIALI() restituisce la matrice a colonna singola di tutti gli stati censiti', () => {
      assert.strictEqual(typeof LISTA_STATI_MONDIALI, 'function');
      const matrix = LISTA_STATI_MONDIALI();
      assert.strictEqual(Array.isArray(matrix), true);
      assert.ok(matrix.length >= 190);
      assert.strictEqual(matrix[0].length, 1);
      assert.strictEqual(typeof matrix[0][0], 'string');
      // Verifica presenza dell'Italia
      const hasItalia = matrix.some(row => row[0] === 'Italia');
      assert.strictEqual(hasItalia, true);
    });

    it('LISTA_TITOLI_STUDIO() restituisce la matrice a colonna singola dei titoli UNESCO ISCED', () => {
      assert.strictEqual(typeof LISTA_TITOLI_STUDIO, 'function');
      const matrix = LISTA_TITOLI_STUDIO();
      assert.strictEqual(Array.isArray(matrix), true);
      assert.strictEqual(matrix.length, TitoliStudio.length);
      assert.strictEqual(matrix[0].length, 1);
      assert.strictEqual(matrix[0][0], 'Nessuno');
    });
  });

  describe('DomainSyncService - Two-Tier Storage (Properties & Cache)', () => {
    it('salva e recupera i dati correttamente su entrambi i livelli L1 e L2 con prefisso DATI_', () => {
      const testData = { foo: 'bar', timestamp: 12345 };
      DomainSyncService.saveTwoTier('DATI_TEST', JSON.stringify(testData));

      // Verifica presenza in ScriptProperties (L2) e Cache (L1)
      assert.strictEqual(mockProperties['DATI_TEST'], JSON.stringify(testData));
      assert.strictEqual(mockCache['DATI_TEST'], JSON.stringify(testData));

      // Lettura tramite helper getTwoTier
      const retrieved = DomainSyncService.getTwoTier('DATI_TEST');
      assert.deepStrictEqual(JSON.parse(retrieved), testData);
    });

    it('recupera da ScriptProperties (L2) e ripopola Cache (L1) se la cache è stata svuotata', () => {
      mockProperties['DATI_TEST2'] = JSON.stringify({ saved: true });
      mockCache = {}; // Cache evaporata

      const retrieved = DomainSyncService.getTwoTier('DATI_TEST2');
      assert.deepStrictEqual(JSON.parse(retrieved), { saved: true });
      // Verifica ripopolamento L1
      assert.strictEqual(mockCache['DATI_TEST2'], JSON.stringify({ saved: true }));
    });
  });

  describe('DomainSyncService - Sincronizzazione da Mock Spreadsheet', () => {
    it('syncBeneficiari estrae le colonne del foglio _DatiBeneficiari e le memorizza in DATI_BENEFICIARI', () => {
      const mockData = [
        ['Criticità', 'Relazioni', 'Stato Civile', 'Abitazione', 'Status lavorativo'],
        ['Nessuna', 'Intestatario', 'Celibe/Nubile', 'Affitto privato', 'Occupato a tempo indeterminato'],
        ['Sfratto esecutivo', 'Coniuge', 'Coniugato/a', 'ERP', 'Disoccupato']
      ];

      const namedRangesSet = {};
      const mockSheet = {
        getName: () => '_DatiBeneficiari',
        getParent: () => mockSS,
        getLastRow: () => mockData.length,
        getDataRange: () => ({ getValues: () => mockData }),
        getRange: (row, col, numRows, numCols) => ({
          getValues: () => mockData.slice(row - 1, row - 1 + numRows).map(r => [r[col - 1]])
        })
      };

      const mockSS = {
        getSheetByName: (name) => name === '_DatiBeneficiari' ? mockSheet : null,
        setNamedRange: (name, range) => { namedRangesSet[name] = true; }
      };

      const result = DomainSyncService.syncBeneficiari(mockSS);
      assert.deepStrictEqual(result.criticita, ['Nessuna', 'Sfratto esecutivo']);
      assert.deepStrictEqual(result.relazioni, ['Intestatario', 'Coniuge']);
      assert.deepStrictEqual(result.statiCivili, ['Celibe/Nubile', 'Coniugato/a']);
      assert.deepStrictEqual(result.abitazione, ['Affitto privato', 'ERP']);

      // Verifica salvataggio in Properties e Cache con chiave DATI_BENEFICIARI
      assert.ok(mockProperties[DomainSyncService.KEYS.BENEFICIARI]);
      assert.ok(mockCache[DomainSyncService.KEYS.BENEFICIARI]);
    });

    it('syncDocumenti estrae la definizione completa e aggiorna il Named Range TipiDocumenti', () => {
      const mockDocsData = [
        ['ID', 'Nome', 'Categoria', 'Archetipo', 'Ha Valore', 'Ha Scadenza', 'Scope', 'Note'],
        ['CIE', "Carta d'Identita", 'Anagrafica', 'SCADENZA', 'false', 'true', 'persona', 'Documento CIE'],
        ['ISEE', 'Attestazione ISEE', 'Economica', 'ANNUALE', 'true', 'true', 'nucleo', 'ISEE Ordinario']
      ];

      const namedRangesSet = {};
      const mockSheet = {
        getName: () => '_DatiDocumenti',
        getParent: () => mockSS,
        getLastRow: () => mockDocsData.length,
        getDataRange: () => ({ getValues: () => mockDocsData }),
        getRange: (row, col, numRows, numCols) => ({
          getValues: () => mockDocsData.slice(row - 1, row - 1 + numRows).map(r => [r[col - 1]])
        })
      };

      const mockSS = {
        getSheetByName: (name) => name === '_DatiDocumenti' ? mockSheet : null,
        setNamedRange: (name, range) => { namedRangesSet[name] = true; }
      };

      const docs = DomainSyncService.syncDocumenti(mockSS);
      assert.strictEqual(docs.length, 2);
      assert.strictEqual(docs[0].id, 'CIE');
      assert.strictEqual(docs[0].name, "Carta d'Identita");
      assert.strictEqual(docs[1].hasValue, true);
      assert.strictEqual(docs[1].scope, 'nucleo');
      assert.ok(mockProperties[DomainSyncService.KEYS.DOCUMENTI]);
      assert.strictEqual(namedRangesSet['TipiDocumenti'], true);
    });

    it('syncBundle crea il pacchetto compatto DATI_BUNDLE per getInitialAppData', () => {
      const ben = {
        abitazione: ['Proprietà', 'Affitto'],
        criticita: ['Nessuna'],
        relazioni: ['Intestatario'],
        statiCivili: ['Celibe'],
        statiLavorativi: ['Occupato']
      };
      const doc = [{ name: 'CIE' }, { name: 'ISEE' }];
      const spo = { servizi: ['Sportello Sociale'] };

      const bundle = DomainSyncService.syncBundle(ben, doc, spo);
      assert.deepStrictEqual(bundle.abitazione, ['Proprietà', 'Affitto']);
      assert.deepStrictEqual(bundle.tipiDocumenti, ['CIE', 'ISEE']);
      assert.deepStrictEqual(bundle.servizi, ['Sportello Sociale']);

      // Verifica salvataggio DATI_BUNDLE e DATI_LAST_SYNC
      assert.ok(mockProperties[DomainSyncService.KEYS.BUNDLE]);
      assert.ok(mockProperties[DomainSyncService.KEYS.LAST_SYNC]);
      assert.ok(mockCache[DomainSyncService.KEYS.BUNDLE]);
    });
  });

  describe('LookupRepository.getAll() - Architettura a Doppio Canale', () => {
    it('legge all istante i dati generali dal modulo di Dominio in memoria (0ms)', () => {
      // Inizializza ScriptProperties con bundle di test
      mockProperties['DATI_BUNDLE'] = JSON.stringify({
        abitazione: ['Affitto Test'],
        servizi: ['Servizio Test'],
        criticita: ['Nessuna'],
        relazioni: ['Intestatario'],
        statiCivili: ['Celibe'],
        statiLavorativi: ['Lavoratore'],
        tipiDocumenti: ['Doc Test']
      });

      const lookups = LookupRepository.getAll();

      // Dati generali universali da Domain in memoria
      assert.ok(lookups.stati.length >= 190);
      assert.ok(lookups.stati.includes('Italia'));
      assert.ok(lookups.titoliStudio.length >= 8);
      assert.ok(lookups.titoliStudio.includes('Diploma di scuola superiore'));
      assert.strictEqual(typeof lookups.prefissiTelefonici['Italia'], 'object');
      assert.strictEqual(lookups.prefissiTelefonici['Italia'].code, '+39');

      // Dati operativi di sportello da Two-Tier Storage
      assert.deepStrictEqual(lookups.abitazione, ['Affitto Test']);
      assert.deepStrictEqual(lookups.servizi, ['Servizio Test']);
      assert.deepStrictEqual(lookups.tipiDocumenti, ['Doc Test']);
    });

    it('ricorre ai valori di default SSOT in assenza totale di ScriptProperties e fogli', () => {
      mockProperties = {};
      mockCache = {};
      global.SpreadsheetApp = { getActiveSpreadsheet: () => null };

      const lookups = LookupRepository.getAll();
      assert.ok(lookups.abitazione.length > 0);
      assert.ok(lookups.servizi.length > 0);
      assert.ok(lookups.stati.length >= 190);
      assert.ok(lookups.titoliStudio.length > 0);
    });

    it('clearCache invalida tutte le chiavi DATI_*', () => {
      mockCache['DATI_BUNDLE'] = 'some data';
      mockCache['DATI_BENEFICIARI'] = 'some data';
      LookupRepository.clearCache();
      assert.strictEqual(mockCache['DATI_BUNDLE'], undefined);
      assert.strictEqual(mockCache['DATI_BENEFICIARI'], undefined);
    });
  });
});
