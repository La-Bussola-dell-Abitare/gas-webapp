/**
 * @file dataIntegrity.test.js
 * @description Test unitari per DataIntegrityService.js:
 * Verifica la diagnostica di integrità relazionale (doppio intestatario, orfani, cartelle duplicate,
 * cartelle mancanti, conflitti anagrafici) e le relative logiche di Auto-Healing.
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('DataIntegrityService.js - Audit Relazionale e Auto-Healing', () => {
  let context;

  beforeEach(() => {
    context = {
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
      CodiceFiscale: {
        validate: (cf) => {
          if (!cf || cf.length !== 16) return false;
          return /^[A-Z]{6}[0-9]{2}[A-EHLMPR-T][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i.test(cf);
        },
        decode: (cf) => {
          if (!cf || cf.length !== 16) return null;
          const dayNum = parseInt(cf.substr(9, 2), 10);
          const sesso = dayNum > 40 ? 'F' : 'M';
          return { sesso, valid: true };
        }
      },
      console: console
    };

    const integrityCode = fs.readFileSync(
      path.join(__dirname, '../../src/Service/Validation/DataIntegrityService.js'),
      'utf8'
    );
    vm.createContext(context);
    vm.runInContext(integrityCode + '\nthis.DataIntegrityService = DataIntegrityService;', context);
  });

  it('rileva con successo doppi intestatari nello stesso nucleo', () => {
    const beneficiariData = [
      ["Nome", "Cognome", "Codice Fiscale", "ID Nucleo", "Rapporto Intestatario", "ID Cartella Drive"],
      ["Mario", "Rossi", "RSSMRA85M01H501Z", "10", "Intestatario", "folder_101"],
      ["Anna", "Verdi", "VRDNNA90A41H501U", "10", "Intestatario", "folder_102"], // Errore: 2 intestatari nel nucleo 10
      ["Luigi", "Bianchi", "BNCLGU80A01H501Z", "12", "Intestatario", "folder_103"]
    ];

    const nucleiData = [
      ["ID", "Intestatario", "ID Cartella"],
      ["10", "Mario Rossi", "folder_nuc_10"],
      ["12", "Luigi Bianchi", "folder_nuc_12"]
    ];

    const result = context.DataIntegrityService.auditBeneficiari({
      beneficiariData,
      nucleiData,
      skipDriveCheck: true
    });

    assert.equal(result.success, true);
    assert.equal(result.summary.duplicateIntestatari, 1);
    
    const dupIssue = result.issues.find(i => i.type === "DUPLICATE_INTESTATARI");
    assert.ok(dupIssue);
    assert.equal(dupIssue.data.idNucleo, "10");
    assert.equal(dupIssue.data.intestatari.length, 2);
  });

  it('rileva beneficiari orfani associati a un nucleo inesistente', () => {
    const beneficiariData = [
      ["Nome", "Cognome", "Codice Fiscale", "ID Nucleo", "Rapporto Intestatario", "ID Cartella Drive"],
      ["Paolo", "Neri", "NREPLA82M01H501Z", "999", "Componente", "folder_201"] // 999 non esiste nei nuclei
    ];

    const nucleiData = [
      ["ID", "Intestatario", "ID Cartella"],
      ["1", "Mario Rossi", "folder_1"]
    ];

    const result = context.DataIntegrityService.auditBeneficiari({
      beneficiariData,
      nucleiData,
      skipDriveCheck: true
    });

    assert.equal(result.summary.orphanBeneficiaries, 1);
    const orphanIssue = result.issues.find(i => i.type === "ORPHAN_BENEFICIARY");
    assert.ok(orphanIssue);
    assert.equal(orphanIssue.data.idNucleo, "999");
  });

  it('rileva collisione quando due beneficiari condividono la stessa cartella personale Drive', () => {
    const beneficiariData = [
      ["Nome", "Cognome", "Codice Fiscale", "ID Nucleo", "Rapporto Intestatario", "ID Cartella Drive"],
      ["Marco", "Gialli", "GLLMRC75M01H501Z", "5", "Intestatario", "shared_folder_xyz"],
      ["Sara", "Gialli", "GLLSRA78A41H501W", "5", "Componente", "shared_folder_xyz"] // Stesso idCartella
    ];

    const nucleiData = [
      ["ID", "Intestatario", "ID Cartella"],
      ["5", "Marco Gialli", "folder_nuc_5"]
    ];

    const result = context.DataIntegrityService.auditBeneficiari({
      beneficiariData,
      nucleiData,
      skipDriveCheck: true
    });

    assert.equal(result.summary.duplicateFolders, 1);
    const dupFolderIssue = result.issues.find(i => i.type === "DUPLICATE_FOLDER");
    assert.ok(dupFolderIssue);
    assert.equal(dupFolderIssue.data.idCartella, "shared_folder_xyz");
    assert.equal(dupFolderIssue.data.beneficiari.length, 2);
  });

  it('rileva anomalie anagrafiche e Codice Fiscale non valido o discordante per genere', () => {
    const beneficiariData = [
      ["Nome", "Cognome", "Codice Fiscale", "Sesso", "ID Nucleo", "ID Cartella Drive"],
      ["Giuseppe", "Verdi", "INVALID_CF_123", "M", "1", "f1"], // CF non conforme
      ["Carla", "Bruni", "RSSMRA85M01H501Z", "F", "2", "f2"] // Sesso F nel foglio ma CF maschile (day 01)
    ];

    const nucleiData = [
      ["ID", "Intestatario", "ID Cartella"],
      ["1", "Giuseppe Verdi", "f1"],
      ["2", "Carla Bruni", "f2"]
    ];

    const result = context.DataIntegrityService.auditBeneficiari({
      beneficiariData,
      nucleiData,
      skipDriveCheck: true
    });

    assert.ok(result.summary.anagraficaConflicts >= 2);
    assert.ok(result.issues.some(i => i.id.includes("CF_INVALID")));
    assert.ok(result.issues.some(i => i.id.includes("CF_MISMATCH_SEX")));
  });

  it('simula con successo la risoluzione automatica (Auto-Healing) per declassare doppi intestatari', () => {
    const sheetValues = [
      ["Nome", "Cognome", "Codice Fiscale", "ID Nucleo", "Rapporto Intestatario", "ID Cartella Drive"],
      ["Mario", "Rossi", "RSSMRA85M01H501Z", "10", "Intestatario", "folder_101"],
      ["Anna", "Verdi", "VRDNNA90A41H501U", "10", "Intestatario", "folder_102"]
    ];

    const updatedCells = [];

    context.SpreadsheetApp = {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => ({
          getLastColumn: () => 6,
          getRange: (row, col, numRows, numCols) => ({
            getValues: () => [sheetValues[0]],
            setValue: (val) => {
              updatedCells.push({ row, col, val });
              sheetValues[row - 1][col - 1] = val;
            }
          })
        })
      }),
      flush: () => {}
    };

    const nucleiData = [
      ["ID", "Intestatario", "ID Cartella"],
      ["10", "Mario Rossi", "folder_nuc_10"]
    ];

    const healResult = context.DataIntegrityService.autoHeal(null, {
      beneficiariData: sheetValues,
      nucleiData,
      skipDriveCheck: true
    });

    assert.equal(healResult.success, true);
    assert.equal(healResult.healedCount, 1);
    
    // Il secondo beneficiario (riga 3, colonna 5: Rapporto Intestatario) deve essere impostato su 'Altro componente'
    const changedCell = updatedCells.find(c => c.row === 3 && c.val === "Altro componente");
    assert.ok(changedCell, "La cella dell'intestatario duplicato deve essere declassata ad 'Altro componente'");
  });
});
