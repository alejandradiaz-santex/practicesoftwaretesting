// Calcula "tests inestables" = % de corridas con al menos un test que necesitó reintento.
//
// Dos modos:
//   Correr y calcular:  node scripts/metricas/inestables.js --runs 10 --project firefox <archivos o carpetas de tests...>
//   Solo calcular:      node scripts/metricas/inestables.js --dir <carpeta con run*.json>
//
// Los JSON de cada corrida se guardan en .metricas/runs/<project>/ (fuera de test-results,
// que Playwright vacía en cada ejecución).
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const args = process.argv.slice(2);
const opt = (nombre, defecto) => {
  const i = args.indexOf(`--${nombre}`);
  return i >= 0 ? args[i + 1] : defecto;
};
const flagsConValor = new Set(['--runs', '--project', '--dir']);
const archivos = args.filter((a, i) => !a.startsWith('--') && !flagsConValor.has(args[i - 1]));

let dir = opt('dir');
if (!dir) {
  const runs = Number(opt('runs', 10));
  const project = opt('project', 'firefox');
  if (!archivos.length) {
    console.error('Indica los tests a correr, por ejemplo: "tests/Critical Cases/tc-003" "tests/QATES/"');
    process.exit(1);
  }
  dir = path.resolve('.metricas', 'runs', project);
  fs.mkdirSync(dir, { recursive: true });
  for (let i = 1; i <= runs; i++) {
    const salida = path.join(dir, `run${i}.json`);
    const r = spawnSync(
      'npx',
      ['playwright', 'test', ...archivos, `--project=${project}`, '--retries=1', '--workers=1', '--reporter=json'],
      { env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: salida }, shell: true, stdio: 'ignore' }
    );
    console.error(`corrida ${i}/${runs}: exit ${r.status}`);
  }
}

const jsons = fs.readdirSync(dir).filter((f) => /^run\d+\.json$/.test(f)).sort((a, b) => parseInt(a.slice(3)) - parseInt(b.slice(3)));
let total = 0, conReintento = 0, conFallo = 0;
const porTest = {};

for (const f of jsons) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
  total++;
  let flaky = 0, fallo = 0;
  const recorrer = (s) => {
    (s.specs || []).forEach((sp) => sp.tests.forEach((t) => {
      const id = (sp.title.match(/TC-\d+/) || [sp.title])[0];
      const p = (porTest[id] ??= { corridas: 0, inestable: 0, falla: 0 });
      p.corridas++;
      if (t.status === 'flaky') { flaky++; p.inestable++; }
      if (t.status === 'unexpected') { fallo++; p.falla++; }
    }));
    (s.suites || []).forEach(recorrer);
  };
  (j.suites || []).forEach(recorrer);
  if (flaky) conReintento++;
  if (fallo) conFallo++;
}

const pct = total ? Math.round((conReintento / total) * 100) : 0;
console.log('| Test | Corridas | Inestable en | Falla en |');
console.log('|---|---|---|---|');
for (const [id, p] of Object.entries(porTest).sort()) console.log(`| ${id} | ${p.corridas} | ${p.inestable} | ${p.falla} |`);
console.log(`\nTests inestables: ${conReintento}/${total} corridas (${pct}%)`);
console.log(`Corridas con fallo definitivo (aparte): ${conFallo}/${total}`);
console.log('Nota: solo cuenta los reintentos del runner; un reintento interno (toPass) no se registra.');
