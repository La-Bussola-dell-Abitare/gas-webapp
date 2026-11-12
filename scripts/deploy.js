/**
 * @file deploy-test.js
 * @description Gestore automatizzato del deployment di test per Google Apps Script.
 * Permette di aprire temporaneamente l'accesso alla WebApp ('ANYONE_ANONYMOUS') durante le sessioni
 * di collaudo da browser, per poi richiuderlo ('MYSELF') a conclusione del lavoro prima del commit Git.
 * Mantiene inalterato il Deployment ID ufficiale e il relativo URL pubblico.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DEPLOYMENT_ID = 'AKfycbzkY426RSsiBF19i2GRLd69idx3GbMKj4fZQIcg2G3INwXVSjTiRd-4MEtmp9IA0MFwMw';
const action = (process.argv[2] || 'open').toLowerCase(); // 'open' | 'close'

const manifestPath = path.join(__dirname, '..', 'src', 'appsscript.json');
if (!fs.existsSync(manifestPath)) {
  console.error('File appsscript.json non trovato in: ' + manifestPath);
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (!manifest.webapp) {
  manifest.webapp = {};
}

if (action === 'open') {
  manifest.webapp.executeAs = 'USER_DEPLOYING';
  manifest.webapp.access = 'ANYONE_ANONYMOUS';
  console.log('🔓 [TEST DEPLOY] Imposto accesso pubblico temporaneo (ANYONE_ANONYMOUS)...');
} else {
  manifest.webapp.executeAs = 'USER_DEPLOYING';
  manifest.webapp.access = 'MYSELF';
  console.log('🔒 [TEST DEPLOY] Ripristino accesso riservato (MYSELF) prima del commit...');
}

// Scrittura sicura atomica per prevenire blocchi Windows "user-mapped section open"
function safeWriteFile(filePath, data) {
  const tmpPath = filePath + '.tmp.' + Date.now();
  const oldPath = filePath + '.old.' + Date.now();
  fs.writeFileSync(tmpPath, data, 'utf8');
  try {
    fs.renameSync(filePath, oldPath);
    fs.renameSync(tmpPath, filePath);
    try { fs.unlinkSync(oldPath); } catch (e) {}
  } catch (err) {
    fs.writeFileSync(filePath, data, 'utf8');
  }
}

safeWriteFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

try {
  console.log(`🚀 [CLASP] Eseguo push e deploy sull'ID: ${DEPLOYMENT_ID}...`);
  execSync(`clasp push -f && clasp deploy -i ${DEPLOYMENT_ID} -d "Test session: ${action}"`, { stdio: 'inherit' });
  console.log(`\n✅ Operazione completata con successo (${action.toUpperCase()})!`);
  console.log(`🔗 URL WebApp: https://script.google.com/macros/s/${DEPLOYMENT_ID}/exec\n`);
} catch (err) {
  console.error('❌ Errore durante clasp push / deploy:', err.message);
  process.exit(1);
}
