// Calcula "Flujos críticos cubiertos" a partir de docs/flujos-criticos.md.
//   flujos críticos con al menos un test que pasa / flujos críticos definidos × 100
//
// Lee la tabla de la sección "Flujos críticos" (# | Flujo | Estado | Test | Nota):
//   - Estado "Cubierto" o "Cubierto (parcial)": cuenta como cubierto (el parcial se informa aparte),
//     siempre que cite un test (TC-NNN) y exista su spec en tests/. Si no, no cuenta y se avisa.
//   - Estado "Sin cobertura": no cuenta.
// Avisa de inconsistencias: un flujo cubierto sin test, un test citado sin spec en tests/,
// y un encabezado "(N)" que no coincide con el número de flujos de la tabla.
// Los flujos de "Fuera del cálculo" no entran en el denominador.
//
// Importante: el script no ejecuta los tests. Que el test "pase" se verifica por separado
// (por ejemplo con scripts/metricas/inestables.js o el CI).
//
// Uso: node scripts/metricas/flujos.js [archivo.md] [carpeta-de-tests]
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', '..');
const archivo = path.resolve(process.argv[2] || path.join(raiz, 'docs', 'flujos-criticos.md'));
const carpetaTests = path.resolve(process.argv[3] || path.join(raiz, 'tests'));

const md = fs.readFileSync(archivo, 'utf8').replace(/\r/g, '');

// Sección "## Flujos críticos (N)" hasta el siguiente "## ".
const seccion = md.split(/^## /m).find((s) => /^Flujos críticos/i.test(s));
if (!seccion) {
  console.error('No encontré la sección "Flujos críticos" en ' + archivo);
  process.exit(1);
}
const declarado = (seccion.match(/^Flujos críticos\s*\((\d+)\)/i) || [])[1];

const filas = seccion
  .split('\n')
  .filter((l) => /^\|\s*\d+\s*\|/.test(l))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
  .map(([n, flujo, estado, test, nota]) => ({ n, flujo, estado, test, nota }));

// Archivos de tests disponibles (se busca "tc-NNN" en el nombre del archivo).
function listar(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? listar(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );
}
const specs = fs.existsSync(carpetaTests) ? listar(carpetaTests).filter((f) => /\.spec\.[jt]s$/.test(f)) : [];
const existeSpec = (tc) => specs.some((f) => path.basename(f).toLowerCase().includes(tc.toLowerCase()));

const avisos = [];
for (const f of filas) {
  f.cubierto = /^Cubierto/i.test(f.estado);
  f.parcial = /parcial/i.test(f.estado);
  const tcs = f.test.match(/TC-\d+/gi) || [];
  if (f.cubierto && !tcs.length) avisos.push(`Flujo ${f.n}: figura como cubierto pero no indica ningún test`);
  if (!f.cubierto && tcs.length) avisos.push(`Flujo ${f.n}: indica un test (${tcs.join(', ')}) pero figura sin cobertura`);
  for (const tc of tcs) if (!existeSpec(tc)) avisos.push(`Flujo ${f.n}: no encontré ningún spec de ${tc} en ${path.relative(raiz, carpetaTests)}`);
  f.specOk = tcs.length ? tcs.every(existeSpec) : null;
}
if (declarado && Number(declarado) !== filas.length) {
  avisos.push(`El encabezado dice (${declarado}) flujos, pero la tabla tiene ${filas.length}`);
}

console.log('| # | Flujo | Estado | Test | Spec existe |');
console.log('|---|---|---|---|---|');
for (const f of filas) console.log(`| ${f.n} | ${f.flujo} | ${f.estado} | ${f.test} | ${f.specOk === null ? '—' : f.specOk ? 'Sí' : 'No'} |`);

// Un flujo solo cuenta si figura como cubierto Y cita al menos un test cuyo spec existe.
const cuenta = (f) => f.cubierto && f.specOk === true;
const total = filas.length;
const cubiertos = filas.filter(cuenta).length;
const parciales = filas.filter((f) => cuenta(f) && f.parcial).length;
const pct = total ? Math.round((cubiertos / total) * 100) : 0;
console.log(`\nFlujos críticos cubiertos: ${cubiertos}/${total} (${pct}%)` + (parciales ? ` — ${parciales} parcial(es) incluidos` : ''));
if (avisos.length) {
  console.log('\nAvisos:');
  for (const a of avisos) console.log('- ' + a);
}
