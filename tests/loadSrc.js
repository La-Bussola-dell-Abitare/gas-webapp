const fs = require('fs');
const path = require('path');
const vm = require('vm');

const rootDir = path.resolve(__dirname, '..');

/**
 * Carica ed esegue un file sorgente GAS nel contesto globale di Node.
 * Simula l'ambiente globale nativo di Google Apps Script V8.
 * @param {string} relPath - Percorso relativo dalla radice del progetto (es. 'src/Utils/Utils.js')
 */
function loadScript(relPath) {
  const fullPath = path.resolve(rootDir, relPath);
  const code = fs.readFileSync(fullPath, 'utf8');
  vm.runInThisContext(code, { filename: fullPath });
}

module.exports = { loadScript };
