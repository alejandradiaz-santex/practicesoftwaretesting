// Lee test-results/resultados.json (reporter json de Playwright) y genera:
//  - un borrador de bug por test fallido: test-results/bugs/BUG-CI-<commit7>-<TC>-<navegador>.md
//    (secciones de docs/bugs/BUG-001.md; lo que no se sabe queda como [FALTA DATO: ...])
//  - un resumen en el job (GITHUB_STEP_SUMMARY) y un aviso por los tests omitidos por Cloudflare.
// Termina en 0, salvo si Cloudflare dejó sin ejercitar más de MAX_OMITIDOS_PCT (50 por defecto) de los
// tests: ahí el check falla a propósito, porque un PR verde con casi todo omitido no probó nada.
// En los demás casos el que hace fallar el check es el paso de tests. Sin dependencias.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const entrada = process.argv[2] || 'test-results/resultados.json';
const carpeta = process.argv[3] || 'test-results/bugs';
const env = process.env;

if (!fs.existsSync(entrada)) {
  console.log(`::warning::No existe ${entrada}: no hay reporte que generar.`);
  process.exit(0);
}

// Un JSON vacío o roto no debe dejar rojo el job: se avisa y se sale (el que decide es el paso de tests).
const leerJson = (ruta, porDefecto) => {
  try {
    return JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch (e) {
    console.log(`::warning::No se pudo leer ${path.basename(ruta)} (${e.message}).`);
    return porDefecto;
  }
};
const resultados = leerJson(entrada, null);
if (!resultados) process.exit(0);
// Si la trazabilidad está rota, los borradores salen igual con severidad y flujo como [FALTA DATO].
const traza = leerJson(path.join(__dirname, '../../tests/data/trazabilidad.json'), {});

const commit = env.PR_HEAD_SHA || env.GITHUB_SHA || 'local';
const commit7 = commit.slice(0, 7);
// Los artefactos llevan el número de ejecución (1, y 2 si se relanza la corrida); ver playwright.yml.
const sufijoEjecucion = env.GITHUB_RUN_ATTEMPT ? `-${env.GITHUB_RUN_ATTEMPT}` : '';
const artefactoReporte = `playwright-report${sufijoEjecucion}`;
const artefactoBorradores = `reportes-ci${sufijoEjecucion}`;
const corrida =
  env.GITHUB_SERVER_URL && env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    : 'N/A (corrida local)';
const pr = env.PR_NUMBER ? `PR ${env.PR_NUMBER}` : 'sin PR';
const rama = env.PR_HEAD_REF || env.GITHUB_REF_NAME || 'N/A';
const falta = (t) => `[FALTA DATO: ${t}]`;
const limpiar = (t) => String(t || '').replace(/\u001b\[[0-9;]*m/g, '').trim();

// Aplana las suites en una lista de { spec, test, archivo }
const tests = [];
const recorrer = (suite, archivo) => {
  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) tests.push({ spec, test, archivo: spec.file || archivo });
  }
  for (const hija of suite.suites || []) recorrer(hija, hija.file || archivo);
};
for (const s of resultados.suites || []) recorrer(s, s.file);

const tcDe = (titulo) => (titulo.match(/TC-\d{3}/) || [''])[0];
const fallos = [];
const omitidosCloudflare = [];
const otrosOmitidos = [];
const inestables = [];
let ok = 0;
for (const t of tests) {
  const ultimo = t.test.results[t.test.results.length - 1] || {};
  // El primer fallo suele ser la causa; los reintentos pueden fallar por otra cosa (p. ej. el sitio lento).
  const primero = t.test.results.find((r) => r.status === 'failed' || r.status === 'timedOut') || ultimo;
  if (t.test.status === 'unexpected') fallos.push({ ...t, ultimo, primero });
  else if (t.test.status === 'skipped' && (t.test.annotations || []).some((a) => a.type === 'cloudflare')) omitidosCloudflare.push(t);
  else if (t.test.status === 'skipped') otrosOmitidos.push(t);
  // Fallaron y pasaron al reintentar: no bloquean, pero se hacen visibles.
  else if (t.test.status === 'flaky') inestables.push({ ...t, primero });
  else ok++;
}

// El JSON da la ruta del spec relativa a testDir (tests/); en el repo hay que anteponerlo.
const rutaRepo = (archivo) => `tests/${String(archivo).split('\\').join('/')}`;
// Las rutas de adjuntos son absolutas del runner: se dejan relativas a test-results/.
const rutaRelativa = (ruta) => {
  const r = String(ruta).split('\\').join('/');
  const i = r.indexOf('test-results/');
  return i >= 0 ? r.slice(i) : r;
};
// Dónde se lanzó el error: puede ser un page object y no el spec. El JSON da el archivo absoluto del
// runner; si no está dentro del repo (o no viene), se usa el spec con la línea donde empieza el test.
const ubicacionDelError = (r, spec, archivoSpec) => {
  const loc = r.error && r.error.location;
  if (loc && loc.file && loc.line) {
    const abs = String(loc.file).split('\\').join('/');
    const rel = path.relative(process.cwd(), loc.file).split('\\').join('/');
    if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) return { archivo: rel, linea: loc.line };
    // El script corre en otra carpeta que el runner (p. ej. con el JSON descargado): se corta en tests/.
    const i = abs.lastIndexOf('/tests/');
    if (i >= 0) return { archivo: abs.slice(i + 1), linea: loc.line };
  }
  return { archivo: rutaRepo(archivoSpec), linea: spec.line };
};
// La capa se deduce del mensaje de error; si no hay pistas claras, queda como dato faltante.
const deducirCapa = (mensaje) => {
  // La UI se evalúa primero: sus mensajes (Locator:, toHaveURL...) son inequívocos.
  if (/Locator:|getBy|toBeVisible|toHaveText|toHaveURL|toContainText|toHaveValue|toBeEnabled|toBeDisabled|toHaveCount/.test(mensaje)) {
    return 'UI (deducida del error: falla una comprobación de la página)';
  }
  // La API solo con pistas específicas: ni "HTTP" (coincide con https://) ni números sueltos (precios, columnas).
  if (/Estado esperado|\bstatus(Code)?\b|toBeOK|respuesta|Received: [1-5]\d\d\b/i.test(mensaje)) {
    return 'API (deducida del error: falla una comprobación de la respuesta HTTP)';
  }
  return null;
};
// Un dato es "archivo" si parece una ruta con extensión; si no, es texto libre y no se marca como archivo.
const esArchivo = (d) => /^[\w.-]+(\/[\w.-]+)+\.\w+$/.test(d);

// Historial de corridas de `main`, desde la API de GitHub (con la CLI `gh`, que usa GH_TOKEN). Se consulta una
// sola vez y solo si hay fallos. Si no hay `gh`, token o red, devuelve null y los campos quedan en [FALTA DATO].
// Son datos de la suite completa: una corrida verde no prueba que un test concreto pasara (pudo omitirse).
let historiaCache;
const historia = () => {
  if (historiaCache !== undefined) return historiaCache;
  historiaCache = null;
  if (!env.GITHUB_REPOSITORY) return historiaCache;
  const r = spawnSync('gh', ['api', `repos/${env.GITHUB_REPOSITORY}/actions/workflows/playwright.yml/runs?branch=main&per_page=10`], {
    encoding: 'utf8',
    timeout: 15000,
  });
  if (r.status !== 0 || !r.stdout) {
    console.log('::warning::No se pudo consultar el historial de corridas de main; esos campos quedan como [FALTA DATO].');
    return historiaCache;
  }
  try {
    const corridas = (JSON.parse(r.stdout).workflow_runs || []).filter((c) => c.status === 'completed' && String(c.id) !== String(env.GITHUB_RUN_ID));
    const verde = corridas.find((c) => c.conclusion === 'success');
    historiaCache = {
      total: corridas.length,
      verdes: corridas.filter((c) => c.conclusion === 'success').length,
      ultimaVerde: verde ? { commit: verde.head_sha.slice(0, 7), fecha: verde.created_at.replace('T', ' ').slice(0, 16) + ' UTC' } : null,
    };
  } catch (e) {
    console.log(`::warning::No se pudo leer el historial de corridas (${e.message}).`);
  }
  return historiaCache;
};

// Versión del sitio probado: está en el pie de página y queda en el error-context.md de cada intento
// ("v2.5 | Built 2026-10-11 | ..."). Si no se puede leer (p. ej. la página era la de Cloudflare), no se inventa.
const leerVersion = (results) => {
  for (const r of results) {
    for (const a of r.attachments || []) {
      if (a.name !== 'error-context' || !a.path || !fs.existsSync(a.path)) continue;
      const m = fs.readFileSync(a.path, 'utf8').match(/\bv(\d+\.\d+(?:\.\d+)?)\s*\|\s*Built\s*(\d{4}-\d{2}-\d{2})/);
      if (m) return `v${m[1]}, build ${m[2]} (pie de página)`;
    }
  }
  return null;
};

// "Resultado obtenido": la línea del error y, si las trae, las de Locator / Expected / Received.
const resumenObtenido = (mensaje) => {
  const lineas = mensaje.split('\n').map((l) => l.trim()).filter(Boolean);
  const clave = lineas.filter((l, i) => i === 0 || /^(Locator|Expected|Received):/.test(l));
  return clave.join(' · ');
};

const mensajeDe = (r) => limpiar((r.error && r.error.message) || (r.errors && r.errors[0] && r.errors[0].message));

// Dos fallos que den el mismo nombre (p. ej. tests sin TC-### en el título) no deben pisarse.
const nombresUsados = new Set();
const nombreUnico = (base) => {
  let n = base;
  for (let i = 2; nombresUsados.has(n); i++) n = `${base}-${i}`;
  nombresUsados.add(n);
  return n;
};

const borrador = ({ spec, test, archivo, ultimo, primero }) => {
  const tc = tcDe(spec.title);
  const nav = test.projectName || 'desconocido';
  const info = traza[tc] || {};
  const nombre = nombreUnico(`BUG-CI-${commit7}-${tc || 'TC-XXX'}-${nav}`);
  const error = mensajeDe(primero);
  const ruta = rutaRepo(archivo);
  const { archivo: rutaFalla, linea } = ubicacionDelError(primero, spec, archivo);
  // Si los intentos fallaron distinto, se listan todos para no ocultar la causa real.
  const resumenIntento = (r) => `${mensajeDe(r).split('\n')[0] || 'sin mensaje'} (línea ${ubicacionDelError(r, spec, archivo).linea})`;
  const intentos = test.results.map((r, i) => `${i + 1}. ${r.status}: ${resumenIntento(r)}`);
  const difieren = new Set(test.results.map(resumenIntento)).size > 1;
  const capa = deducirCapa(error);
  const datos = info.datos || [falta('sin entrada en trazabilidad.json')];
  // Adjuntos de todos los intentos: la traza solo se graba en el primer reintento (trace: on-first-retry).
  const adjuntos = test.results.flatMap((r, i) =>
    (r.attachments || [])
      .filter((a) => a.path)
      .map((a) => `- \`${a.name}\` (intento ${i + 1}): \`${rutaRelativa(a.path)}\` (en el artefacto \`${artefactoReporte}\`)`)
  );
  const version = (resultados.config && resultados.config.version) || '?';
  const sinEntrada = falta('TC sin entrada en tests/data/trazabilidad.json');
  const hist = historia();
  const fallidos = test.results.filter((r) => ['failed', 'timedOut', 'interrupted'].includes(r.status)).length;
  const frecuencia =
    `falló ${fallidos} de ${test.results.length} intento(s) en esta corrida; ` +
    (hist && hist.total ? `en las últimas ${hist.total} corridas de \`main\`, ${hist.verdes} salieron verdes` : falta('histórico de corridas'));
  const verde = hist && hist.ultimaVerde;
  const md = [
    `# ${nombre}: ${spec.title}`,
    '',
    '## Datos generales',
    '',
    `- **Título**: ${info.titulo || falta('título no técnico del error; este test no tiene uno en tests/data/trazabilidad.json')}`,
    `- **Severidad**: ${info.severidad || sinEntrada}`,
    `- **Prioridad**: ${falta('la define el PO')}`,
    '- **Ambiente**: CI (GitHub Actions) — https://practicesoftwaretesting.com',
    `- **Versión**: ${leerVersion(test.results) || falta('versión del sitio: no se pudo leer del pie de página')}`,
    `- **Navegador / dispositivo**: ${nav} (Playwright ${version}) en ${env.RUNNER_OS || 'local'}`,
    `- **Ticket relacionado**: ${tc || falta('el título no contiene un TC-###')}`,
    '- **Reportado con**: CI automático (borrador, requiere revisión)',
    '',
    '## Qué pasó',
    '',
    `El test \`${spec.title}\` falló en la corrida de CI. Resultado obtenido:`,
    '',
    '```',
    error || falta('sin mensaje de error'),
    '```',
    '',
    ...(test.results.length > 1
      ? [`Es el error del primer fallo. Intentos de esta corrida${difieren ? ' (**no fallaron igual**)' : ''}:`, '', ...intentos, '']
      : []),
    '## Pasos para reproducir',
    '',
    `**Precondiciones**: ${info.precondiciones || falta('precondiciones del caso')}`,
    '',
    `1. \`npx playwright test "${ruta}" --project=${nav}\``,
    '',
    `**Resultado esperado**: ${info.esperado ? `${info.esperado}, según \`casos-automatizacion.md\` (${tc})` : falta('criterio de aceptación del caso')}`,
    '',
    `**Resultado obtenido**: ${resumenObtenido(error) || falta('sin mensaje de error')}`,
    '',
    `**Frecuencia**: ${frecuencia}`,
    '',
    '## Datos de prueba',
    '',
    `- **Usuario y rol**: ${info.usuario || sinEntrada}`,
    `- **Valores ingresados**: ${info.valores || sinEntrada}`,
    `- **Registros**: ${info.registros || sinEntrada}`,
    `- **De dónde salen los datos**: ${datos.map((d) => (esArchivo(d) ? `\`${d}\`` : d)).join(', ')} (commit ${commit7})`,
    `- **Contexto**: corrida automática de CI${datos.some(esArchivo) ? '; los valores exactos están en esos archivos' : '; los valores se generan o están dentro del propio test'}`,
    '',
    '## Origen',
    '',
    `- **Cómo se encontró**: corrida automática de CI (${pr}, rama \`${rama}\`, commit \`${commit7}\`)`,
    `- **Dónde falla**: \`${rutaFalla}:${linea}\``,
    `- **Capa**: ${capa || falta('UI o API')}`,
    `- **Desde cuándo**: ${verde ? `sin dato propio de este test. La última corrida verde de \`main\` es del commit \`${verde.commit}\` (${verde.fecha}) (dato de la suite completa)` : falta('última corrida verde conocida')}`,
    '',
    '## Impacto',
    '',
    `- **Qué flujo afecta**: ${info.flujo || falta('flujo crítico')}`,
    `- **A quién afecta**: ${info.afecta || sinEntrada}`,
    '- **Cuántos**: N/A: sitio demo, sin usuarios reales ni métricas de uso',
    `- **Alternativa (workaround)**: ${falta('si existe')}`,
    `- **¿Funcionaba antes?**: ${verde ? `probablemente sí: la última corrida verde de \`main\` (\`${verde.commit}\`) pasó la suite completa. No confirma este test en concreto` : falta('comparar con la última corrida verde')}`,
    '',
    '## Evidencia',
    '',
    `- \`${rutaFalla}:${linea}\``,
    ...(adjuntos.length ? adjuntos : ['- Sin adjuntos (la traza se guarda solo al reintentar)']),
    '',
  ].join('\n');
  return { nombre, md };
};

fs.mkdirSync(carpeta, { recursive: true });
const generados = fallos.map((f) => {
  const b = borrador(f);
  fs.writeFileSync(path.join(carpeta, `${b.nombre}.md`), b.md);
  const u = ubicacionDelError(f.primero, f.spec, f.archivo);
  console.log(`::error file=${u.archivo},line=${u.linea}::${f.spec.title} falló (${f.test.projectName})`);
  return b.nombre;
});

if (omitidosCloudflare.length) {
  console.log(`::warning::${omitidosCloudflare.length} test(s) omitidos por la verificación de Cloudflare: la suite no los ejercitó.`);
}

// Por encima del umbral, el check falla: relanzar la corrida es la salida.
const maxOmitidosPct = Number(env.MAX_OMITIDOS_PCT || 50);
const pctOmitidos = tests.length ? (omitidosCloudflare.length * 100) / tests.length : 0;
const excedido = pctOmitidos > maxOmitidosPct;
if (excedido) {
  console.log(
    `::error::${omitidosCloudflare.length} de ${tests.length} tests (${Math.round(pctOmitidos)}%) quedaron omitidos por Cloudflare: la suite no se ejercitó. Relanza la corrida.`
  );
  process.exitCode = 1;
}

if (inestables.length) {
  console.log(
    `::warning::${inestables.length} test(s) inestables: fallaron y pasaron al reintentar (${inestables.map((i) => tcDe(i.spec.title) || i.spec.title).join(', ')}).`
  );
}

const resumen = [
  '## Reporte de pruebas',
  '',
  '| Pasaron | Inestables | Fallaron | Omitidos (Cloudflare) | Omitidos (otros) |',
  '| ---: | ---: | ---: | ---: | ---: |',
  `| ${ok} | ${inestables.length} | ${fallos.length} | ${omitidosCloudflare.length} | ${otrosOmitidos.length} |`,
  '',
  `Origen: ${pr}, rama \`${rama}\`, commit \`${commit7}\`. Corrida: ${corrida}`,
  '',
];
if (fallos.length) {
  resumen.push('### Fallos', '', '| Test | Navegador | Severidad | Flujo afectado | Borrador |', '| :--- | :--- | :--- | :--- | :--- |');
  fallos.forEach((f, i) => {
    const info = traza[tcDe(f.spec.title)] || {};
    resumen.push(`| ${f.spec.title} | ${f.test.projectName} | ${info.severidad || '?'} | ${info.flujo || '?'} | \`${generados[i]}.md\` |`);
  });
  resumen.push('', `Los borradores están en el artefacto \`${artefactoBorradores}\`. Prioridad, causa y workaround quedan como \`[FALTA DATO]\`.`, '');
}
if (omitidosCloudflare.length) {
  resumen.push(
    excedido
      ? `### ❌ Suite no ejercitada: más del ${maxOmitidosPct}% omitido por Cloudflare (el check falla; relanza la corrida)`
      : `### ⚠️ Omitidos por Cloudflare (no bloquean el merge mientras no superen el ${maxOmitidosPct}%)`,
    '',
    ...omitidosCloudflare.map((o) => `- ${o.spec.title}`),
    ''
  );
}
if (inestables.length) {
  resumen.push(
    '### ⚠️ Inestables (pasaron al reintentar, no bloquean el merge)',
    '',
    '| Test | Navegador | Intentos | Error del primer fallo |',
    '| :--- | :--- | ---: | :--- |',
    ...inestables.map(
      (i) => `| ${i.spec.title} | ${i.test.projectName} | ${i.test.results.length} | ${mensajeDe(i.primero).split('\n')[0] || 'sin mensaje'} |`
    ),
    ''
  );
}
const texto = resumen.join('\n');
if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, texto);
console.log(texto);
