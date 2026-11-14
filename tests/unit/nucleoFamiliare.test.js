/**
 * @file nucleoFamiliare.test.js
 * @description Test unitari per il modello e la persistenza di NucleoFamiliare (add, save, getAll, generateNextId).
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('NucleoFamiliare.js - Modello e Persistenza Nuclei Familiari', () => {
  let context;
  let mockSheetData;
  let mockSheet;

  beforeEach(() => {
    mockSheetData = [
      [
        "ID",
        "Intestatario",
        "Valore ISEE",
        "Residenza",
        "Domicilio",
        "Descrizione caso",
        "Obiettivi e progettualità",
        "Tipologia di richiesta",
        "Orientamento e follow-up",
        "Tipologia abitazione",
        "Assistente sociale",
        "Medico di base",
        "Servizi da attivare",
        "ID Cartella Drive",
        "Data Inserimento"
      ],
      [
        "1",
        "RSSMRA80A01H501Z",
        "12500.50",
        "Via Roma 1",
        "",
        "Caso seguito",
        "Supporto affitto",
        "Alloggio",
        "In corso",
        "Locazione",
        "No",
        "No",
        "",
        "folder-nuc-1",
        new Date("2026-01-01")
      ]
    ];

    mockSheet = {
      getName: () => "Nuclei Familiari",
      getDataRange: () => ({
        getValues: () => mockSheetData
      }),
      getMaxRows: () => mockSheetData.length,
      getLastColumn: () => mockSheetData[0].length,
      getRange: (r, c, numRows, numCols) => {
        if (numRows && numCols) {
          return {
            getValues: () => {
              const res = [];
              for (let i = 0; i < numRows; i++) {
                res.push(mockSheetData[r - 1 + i].slice(c - 1, c - 1 + numCols));
              }
              return res;
            }
          };
        }
        return {
          setValue: (val) => {
            while (mockSheetData.length < r) {
              mockSheetData.push(new Array(mockSheetData[0].length).fill(""));
            }
            mockSheetData[r - 1][c - 1] = val;
          }
        };
      },
      insertRowAfter: () => {}
    };

    context = {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ({
          getSheetByName: (name) => {
            if (name === "Nuclei Familiari" || name === "Nucleo Familiare" || name === "Nuclei") {
              return mockSheet;
            }
            return null;
          }
        }),
        flush: () => {}
      },
      Logger: { log: () => {} },
      safeString: (val) => val == null ? "" : String(val).trim(),
      findHeaderIndex: (headers, keys) => {
        for (let i = 0; i < headers.length; i++) {
          const h = (headers[i] || "").toLowerCase().trim();
          for (const k of keys) {
            if (h === k || h.includes(k)) return i;
          }
        }
        return -1;
      },
      ensureHeaderIndex: (sheet, name) => {
        mockSheetData[0].push(name);
        return mockSheetData[0].length - 1;
      },
      getSheetVal: (row, idx, key, fallback) => {
        const i = idx[key];
        return (i != null && i >= 0 && i < row.length && row[i] !== "") ? row[i] : fallback;
      },
      console: console
    };

    const code = fs.readFileSync(
      path.join(__dirname, '../../src/Models/Nucleo/NucleoFamiliare.js'),
      'utf8'
    );
    vm.createContext(context);
    vm.runInContext(code + '\nthis.NucleoFamiliare = NucleoFamiliare;', context);
  });

  it('recupera tutti i nuclei esistenti con getAll()', () => {
    const list = context.NucleoFamiliare.getAll();
    assert.strictEqual(list.length, 1);
    assert.strictEqual(list[0].id, "1");
    assert.strictEqual(list[0].intestatario, "RSSMRA80A01H501Z");
    assert.strictEqual(list[0].idCartella, "folder-nuc-1");
  });

  it('genera il prossimo ID incrementale con generateNextId()', () => {
    const nextId = context.NucleoFamiliare.generateNextId();
    assert.strictEqual(nextId, "2");
  });

  it('inserisce un nuovo nucleo preservando l ID fornito (es. da Drive discovery)', () => {
    const res = context.NucleoFamiliare.add({
      id: "14",
      intestatario: "LORENZO MAZZA",
      isee: "15000",
      residenza: "Via Tuscolana",
      idCartella: "fld-14-lorenzo"
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.id, "14");
    assert.strictEqual(mockSheetData.length, 3);
    assert.strictEqual(mockSheetData[2][0], "14");
    assert.strictEqual(mockSheetData[2][1], "LORENZO MAZZA");
    assert.strictEqual(mockSheetData[2][2], 15000);
    assert.strictEqual(mockSheetData[2][13], "fld-14-lorenzo");
  });

  it('inserisce un nuovo nucleo tramite save() (alias)', () => {
    const res = context.NucleoFamiliare.save({
      intestatario: "GIUSEPPE VERDI",
      residenza: "Corso Italia"
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.id, "2"); // ID auto-generato
    assert.strictEqual(mockSheetData.length, 3);
    assert.strictEqual(mockSheetData[2][0], "2");
    assert.strictEqual(mockSheetData[2][1], "GIUSEPPE VERDI");
  });

  it('aggiorna un nucleo esistente se l ID è già presente', () => {
    const res = context.NucleoFamiliare.add({
      id: "1",
      intestatario: "RSSMRA80A01H501Z",
      isee: "19000",
      residenza: "Nuova Via Roma 100"
    });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.id, "1");
    assert.strictEqual(mockSheetData.length, 2); // nessuna riga aggiunta
    assert.strictEqual(mockSheetData[1][0], "1");
    assert.strictEqual(mockSheetData[1][2], 19000);
    assert.strictEqual(mockSheetData[1][3], "Nuova Via Roma 100");
  });
});
