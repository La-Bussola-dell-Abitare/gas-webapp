/**
 * @file beneficiarioModal.test.js
 * @description Test unitari per la logica di ricerca beneficiari e aggiornamento in BeneficiarioRepository.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('DialogBeneficiario - Logica di Ricerca e Matching Autocomplete', () => {
  const sampleBeneficiari = [
    { nome: "Mario", cognome: "Rossi", cf: "RSSMRA80A01H501Z", idNucleo: "10", rapportoIntestatario: "Intestatario" },
    { nome: "Luigi", cognome: "Bianchi", cf: "BNCLGU75B02H501Y", idNucleo: "12", rapportoIntestatario: "Componente" },
    { nome: "Anna", cognome: "Verdi Rossi", cf: "VRDNNA90A41H501U", idNucleo: "10", rapportoIntestatario: "Altro componente" },
    { nome: "Jean-Paul", cognome: "De La Tour", cf: "DLTJPL88D15Z110K", idNucleo: "", rapportoIntestatario: "" }
  ];

  function searchBeneficiari(query, list) {
    const q = (query || '').toLowerCase().trim();
    if (q.length < 2) return [];

    const matches = [];
    for (let i = 0; i < list.length; i++) {
      const b = list[i];
      const nome = (b.nome || b.name || '').trim();
      const cognome = (b.cognome || b.surname || '').trim();
      const direct = `${nome} ${cognome}`.toLowerCase();
      const reverse = `${cognome} ${nome}`.toLowerCase();
      const cf = (b.cf || '').toLowerCase();

      if (direct.includes(q) || reverse.includes(q) || cf.includes(q)) {
        matches.push({ index: i, beneficiary: b });
      }
    }
    return matches;
  }

  it('trova il beneficiario tramite ricerca per nome (Nome Cognome)', () => {
    const res = searchBeneficiari("Mario", sampleBeneficiari);
    assert.equal(res.length, 1);
    assert.equal(res[0].beneficiary.cognome, "Rossi");
  });

  it('trova il beneficiario tramite ricerca per cognome anticipato (Cognome Nome)', () => {
    const res = searchBeneficiari("Bianchi Luigi", sampleBeneficiari);
    assert.equal(res.length, 1);
    assert.equal(res[0].beneficiary.nome, "Luigi");
  });

  it('trova il beneficiario tramite Codice Fiscale parziale o completo', () => {
    const res = searchBeneficiari("VRDNNA", sampleBeneficiari);
    assert.equal(res.length, 1);
    assert.equal(res[0].beneficiary.nome, "Anna");
  });

  it('trova più beneficiari se condividono parte del cognome', () => {
    const res = searchBeneficiari("Rossi", sampleBeneficiari);
    // Mario Rossi e Anna Verdi Rossi
    assert.equal(res.length, 2);
  });

  it('restituisce array vuoto per query inferiori a 2 caratteri o inesistenti', () => {
    assert.equal(searchBeneficiari("M", sampleBeneficiari).length, 0);
    assert.equal(searchBeneficiari("Inesistente", sampleBeneficiari).length, 0);
  });
});

describe('BeneficiarioRepository.js - Logica di Aggiornamento con isUpdate e originalCF', () => {
  let context;
  let mockSheetData;
  let mockSheet;

  beforeEach(() => {
    mockSheetData = [
      ["Nome", "Cognome", "Codice Fiscale", "Data di Nascita", "Luogo di Nascita", "Email", "Telefono", "Stato Lavorativo", "Titolo di Studio", "Cittadinanza", "Residenza", "Indirizzo / Domicilio", "Assistente Sociale", "Rapporto Intestatario", "ID Nucleo", "Firma", "ID Cartella", "Stato Civile", "Anno Arrivo in Italia", "Data Inserimento"],
      ["Mario", "Rossi", "RSSMRA80A01H501Z", "", "", "", "123456", "", "", "Italia", "Roma", "", "No", "Intestatario", "10", "", "", "", "", ""]
    ];

    mockSheet = {
      getName: () => "Beneficiari",
      getDataRange: () => ({
        getValues: () => mockSheetData
      }),
      getMaxRows: () => mockSheetData.length,
      insertRowAfter: () => {},
      getRange: (r, c) => ({
        setValue: (val) => {
          while (mockSheetData.length < r) {
            mockSheetData.push(new Array(mockSheetData[0].length).fill(""));
          }
          mockSheetData[r - 1][c - 1] = val;
        }
      })
    };

    context = {
      SpreadsheetApp: {
        getActiveSpreadsheet: () => ({
          getSheetByName: () => mockSheet
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
      WA_SHEET_BENEFICIARI: "Beneficiari",
      console: console
    };

    const repoCode = fs.readFileSync(
      path.join(__dirname, '../../src/Repository/Beneficiario.js'),
      'utf8'
    );
    vm.createContext(context);
    vm.runInContext(repoCode + '\nthis.BeneficiarioRepository = BeneficiarioRepository;', context);
  });

  it('aggiorna correttamente i dati del beneficiario quando isUpdate è true', () => {
    const updatePayload = {
      isUpdate: true,
      originalCF: "RSSMRA80A01H501Z",
      nome: "Mario Alberto",
      cognome: "Rossi",
      cf: "RSSMRA80A01H501Z",
      idNucleo: "10",
      rapportoIntestatario: "Intestatario",
      telefono: "987654321",
      residenza: "Milano"
    };

    const res = context.BeneficiarioRepository.add(updatePayload);
    assert.equal(res.success, true);
    // Verifica che la riga esistente sia stata aggiornata sul posto senza aggiungere nuove righe
    assert.equal(mockSheetData.length, 2);
    assert.equal(mockSheetData[1][0], "Mario Alberto"); // Nome aggiornato
    assert.equal(mockSheetData[1][6], "987654321"); // Telefono aggiornato
    assert.equal(mockSheetData[1][10], "Milano"); // Residenza aggiornata
  });

  it('aggiorna la riga corretta anche se il Codice Fiscale viene corretto (originalCF != cf)', () => {
    const updatePayload = {
      isUpdate: true,
      originalCF: "RSSMRA80A01H501Z", // CF vecchio nel foglio
      nome: "Mario",
      cognome: "Rossi",
      cf: "RSSMRA80A01H501Y", // CF nuovo corretto
      idNucleo: "10",
      rapportoIntestatario: "Intestatario",
      telefono: "123456",
      residenza: "Roma"
    };

    const res = context.BeneficiarioRepository.add(updatePayload);
    assert.equal(res.success, true);
    assert.equal(mockSheetData.length, 2);
    assert.equal(mockSheetData[1][2], "RSSMRA80A01H501Y"); // Nuovo CF scritto
  });

  it('blocca con errore se si tenta di inserire un duplicato senza isUpdate: true', () => {
    const duplicatePayload = {
      isUpdate: false,
      nome: "Mario",
      cognome: "Rossi",
      cf: "RSSMRA80A01H501Z"
    };

    assert.throws(() => {
      context.BeneficiarioRepository.add(duplicatePayload);
    }, /Un beneficiario con questo Codice Fiscale è già registrato/);
  });
});
