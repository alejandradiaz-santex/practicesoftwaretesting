// Lee test-results/resultados.json (reporter json de Playwright) y genera:
//  - un borrador de bug por test fallido: test-results/bugs/BUG-CI-<commit7>-<TC>-<navegador>.md
//    (secciones de docs/bugs/BUG-001.md; lo que no se sabe queda como [FALTA DATO: ...])
//  - un resumen en el job (GITHUB_STEP_SUMMARY) y un aviso por los tests omitidos por Cloudflare.
// Siempre termina en 0: el que hace fallar el check es el paso de tests. Sin dependencias.
const fs = require('fs');
const path = require('path');

const entrada = process.argv[2] || 'test-results/resultados.json';
const carpeta = process.argv[3] || 'test-results/bugs';
const env = process.env;

if (!fs.existsSync(entrada)) {
  console.log(`::warning::No existe ${entrada}: no hay reporte que generar.`);
  process.exit(0);
}

const resultados = JSON.parse(fs.readFileSync(entrada, 'utf8'));
const traza = JSON.parse(fs.readFileSync(path.join(__dirname, '../../tests/data/trazabilidad.json'), 'utf8'));

const commit = env.PR_HEAD_SHA || env.GITHUB_SHA || 'local';
const commit7 = commit.slice(0, 7);
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
let ok = 0;
for (const t of tests) {
  const ultimo = t.test.results[t.test.results.length - 1] || {};
  if (t.test.status === 'unexpected') fallos.push({ ...t, ultimo });
  else if (t.test.status === 'skipped' && (t.test.annotations || []).some((a) => a.type === 'cloudflare')) omitidosCloudflare.push(t);
  else if (t.test.status === 'skipped') otrosOmitidos.push(t);
  else ok++;
}

const borrador = ({ spec, test, archivo, ultimo }) => {
  const tc = tcDe(spec.title);
  const nav = test.projectName || 'desconocido';
  const info = traza[tc] || {};
  const nombre = `BUG-CI-${commit7}-${tc || 'TC-XXX'}-${nav}`;
  const error = limpiar((ultimo.error && ultimo.error.message) || (ultimo.errors && ultimo.errors[0] && ultimo.errors[0].message));
  const adjuntos = (ultimo.attachments || [])
    .filter((a) => a.path)
    .map((a) => `- \`${a.name}\`: \`${a.path}\` (en el artefacto \`playwright-report\`)`);
  const version = (resultados.config && resultados.config.version) || '?';
  const md = [
    `# ${nombre}: ${spec.title}`,
    '',
    '## Datos generales',
    '',
    `- **Severidad**: ${info.severidad || falta('TC sin entrada en tests/data/trazabilidad.json')}`,
    `- **Prioridad**: ${falta('la define el PO')}`,
    '- **Ambiente**: CI (GitHub Actions) — https://practicesoftwaretesting.com',
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
    '## Pasos para reproducir',
    '',
    `1. \`npx playwright test "${archivo}" --project=${nav}\``,
    '',
    `**Resultado esperado**: ${falta('criterio de aceptación del caso')}`,
    '',
    `**Frecuencia**: ${test.results.length} intento(s) en esta corrida; ${falta('histórico')}`,
    '',
    '## Datos de prueba',
    '',
    `- **De dónde salen los datos**: ${(info.datos || [falta('sin entrada en trazabilidad.json')]).map((d) => `\`${d}\``).join(', ')} (commit ${commit7})`,
    '- **Contexto**: corrida automática de CI; los valores exactos están en esos archivos',
    '',
    '## Origen',
    '',
    `- **Cómo se encontró**: corrida automática de CI (${pr}, rama \`${rama}\`, commit \`${commit7}\`)`,
    `- **Corrida**: ${corrida}`,
    `- **Dónde falla**: \`${archivo}:${spec.line}\``,
    `- **Capa**: ${falta('UI o API')}`,
    `- **Desde cuándo**: ${falta('última corrida verde conocida')}`,
    '',
    '## Impacto',
    '',
    `- **Qué flujo afecta**: ${info.flujo || falta('flujo crítico')}`,
    `- **A quién afecta**: ${falta('usuarios afectados')}`,
    `- **Alternativa (workaround)**: ${falta('si existe')}`,
    `- **¿Funcionaba antes?**: ${falta('comparar con la última corrida verde')}`,
    '',
    '## Evidencia',
    '',
    `- \`${archivo}:${spec.line}\``,
    ...(adjuntos.length ? adjuntos : ['- Sin adjuntos (la traza se guarda solo al reintentar)']),
    '',
  ].join('\n');
  return { nombre, md };
};

fs.mkdirSync(carpeta, { recursive: true });
const generados = fallos.map((f) => {
  const b = borrador(f);
  fs.writeFileSync(path.join(carpeta, `${b.nombre}.md`), b.md);
  console.log(`::error file=${f.archivo},line=${f.spec.line}::${f.spec.title} falló (${f.test.projectName})`);
  return b.nombre;
});

if (omitidosCloudflare.length) {
  console.log(`::warning::${omitidosCloudflare.length} test(s) omitidos por la verificación de Cloudflare: la suite no los ejercitó.`);
}

const resumen = [
  '## Reporte de pruebas',
  '',
  '| Pasaron | Fallaron | Omitidos (Cloudflare) | Omitidos (otros) |',
  '| ---: | ---: | ---: | ---: |',
  `| ${ok} | ${fallos.length} | ${omitidosCloudflare.length} | ${otrosOmitidos.length} |`,
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
  resumen.push('', 'Los borradores están en el artefacto `reportes-ci`. Prioridad, causa y workaround quedan como `[FALTA DATO]`.', '');
}
if (omitidosCloudflare.length) {
  resumen.push('### ⚠️ Omitidos por Cloudflare (no bloquean el merge)', '', ...omitidosCloudflare.map((o) => `- ${o.spec.title}`), '');
}
const texto = resumen.join('\n');
if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, texto);
console.log(texto);
