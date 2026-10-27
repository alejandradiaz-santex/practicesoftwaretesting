// Calcula "tests inestables" = % de ejecuciones de test que necesitaron un reintento para pasar.
// Una ejecución es un test en una corrida (7 tests x 10 corridas = 70 ejecuciones). Es la misma
// unidad que usa la referencia de Google (alrededor de 1,5 % de las ejecuciones).
//
// Dos modos:
//   Correr y calcular:  node scripts/metricas/inestables.js --runs 10 --project firefox <archivos o carpetas de tests...>
//   Solo calcular:      node scripts/metricas/inestables.js --dir <carpeta con run*.json> [--dir <otra carpeta> ...]
//
// Cada --dir es un navegador: se muestra por separado y, si hay más de uno, también en conjunto.
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
const dirs = args.flatMap((a, i) => (a === '--dir' ? [args[i + 1]] : []));

if (!dirs.length) {
  const runs = Number(opt('runs', 10));
  const project = opt('project', 'firefox');
  if (!archivos.length) {
    console.error('Indica los tests a correr, por ejemplo: "tests/Critical Cases/tc-003" "tests/QATES/"');
    process.exit(1);
  }
  const dir = path.resolve('.metricas', 'runs', project);
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
  dirs.push(dir);
}

// Evalúa una carpeta de corridas. Una ejecución cuenta si terminó pasando (con o sin reintento)
// o fallando; las omitidas no cuentan.
function evaluar(dir) {
  const r = { etiqueta: path.basename(path.resolve(dir)), corridas: 0, corridasConReintento: 0, ejecuciones: 0, inestables: 0, fallos: 0, porTest: {} };
  const jsons = fs.readdirSync(dir).filter((f) => /^run\d+\.json$/.test(f));
  for (const f of jsons) {
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { continue; }
    r.corridas++;
    let flakyEnCorrida = 0;
    const recorrer = (s) => {
      (s.specs || []).forEach((sp) => sp.tests.forEach((t) => {
        if (t.status === 'skipped') return;
        const id = (sp.title.match(/TC-\d+/) || [sp.title])[0];
        const p = (r.porTest[id] ??= { ejecuciones: 0, inestable: 0, falla: 0 });
        r.ejecuciones++; p.ejecuciones++;
        if (t.status === 'flaky') { r.inestables++; p.inestable++; flakyEnCorrida++; }
        if (t.status === 'unexpected') { r.fallos++; p.falla++; }
      }));
      (s.suites || []).forEach(recorrer);
    };
    (j.suites || []).forEach(recorrer);
    if (flakyEnCorrida) r.corridasConReintento++;
  }
  return r;
}

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const resultados = dirs.map(evaluar);

console.log('| Navegador | Corridas | Ejecuciones | Con reintento | % de ejecuciones | Fallo definitivo |');
console.log('|---|---|---|---|---|---|');
for (const r of resultados) console.log(`| ${r.etiqueta} | ${r.corridas} | ${r.ejecuciones} | ${r.inestables} | ${pct(r.inestables, r.ejecuciones)}% | ${r.fallos} |`);

const total = resultados.reduce((a, r) => ({ ejecuciones: a.ejecuciones + r.ejecuciones, inestables: a.inestables + r.inestables, fallos: a.fallos + r.fallos, corridas: a.corridas + r.corridas, conReintento: a.conReintento + r.corridasConReintento }), { ejecuciones: 0, inestables: 0, fallos: 0, corridas: 0, conReintento: 0 });

const porTest = {};
for (const r of resultados) for (const [id, p] of Object.entries(r.porTest)) {
  const t = (porTest[id] ??= { ejecuciones: 0, inestable: 0, falla: 0 });
  t.ejecuciones += p.ejecuciones; t.inestable += p.inestable; t.falla += p.falla;
}
console.log('\n| Test | Ejecuciones | Inestable en | Falla en |');
console.log('|---|---|---|---|');
for (const [id, p] of Object.entries(porTest).sort()) console.log(`| ${id} | ${p.ejecuciones} | ${p.inestable} | ${p.falla} |`);

console.log(`\nTests inestables: ${total.inestables}/${total.ejecuciones} ejecuciones (${pct(total.inestables, total.ejecuciones)}%)`);
console.log(`Para comparar: ${total.conReintento}/${total.corridas} corridas con algún reintento (${pct(total.conReintento, total.corridas)}%)`);
console.log(`Ejecuciones con fallo definitivo (aparte): ${total.fallos}/${total.ejecuciones}`);
console.log('Nota: solo cuenta los reintentos del runner; un reintento interno (toPass) no se registra.');
