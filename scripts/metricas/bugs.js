// Calcula dos métricas a partir de docs/bugs/*.md:
//   1. Reportes completos en formato estándar
//   2. Bugs reportados (% de los bugs documentados): el bug cuenta si el archivo tiene
//      una línea `**Reporte**: https://...` con el enlace al issue o mensaje enviado.
//
// Reportes completos en formato estándar:
// Un reporte está completo si tiene título, severidad, pasos, resultado esperado,
// resultado actual y evidencia. La evidencia solo cuenta si trae una petición con
// su código de respuesta (o un elemento/selector) y una referencia archivo.ts:línea.
// Uso: node scripts/metricas/bugs.js [carpeta]   (por defecto docs/bugs)
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'docs', 'bugs'));
const archivos = fs.readdirSync(dir).filter((f) => /^BUG-\d+\.md$/.test(f)).sort();

// Devuelve el texto de cada sección "## Nombre" (vacío si no existe).
function secciones(md) {
  const out = {};
  const partes = md.split(/^## /m).slice(1);
  for (const p of partes) {
    const [titulo, ...resto] = p.split('\n');
    out[titulo.trim().toLowerCase()] = resto.join('\n').trim();
  }
  return out;
}

const pet = /\b(GET|POST|PUT|PATCH|DELETE)\b[^\n]*\b[1-5]\d{2}\b/; // petición con código de respuesta
const elem = /<[a-z][^>\n]*>|\[data-test=[^\]]+\]/i; // elemento HTML o selector
const archivoLinea = /\.ts:\d+/;

const filas = archivos.map((f) => {
  const md = fs.readFileSync(path.join(dir, f), 'utf8');
  const s = secciones(md);
  const campos = {
    titulo: /^# BUG-\d+:\s*\S+/m.test(md),
    severidad: /^\*\*Severidad\*\*:\s*\S+/m.test(md),
    pasos: !!s['pasos'],
    esperado: !!s['resultado esperado'],
    actual: !!s['resultado actual'],
    evidencia: (pet.test(s['evidencia'] || '') || elem.test(s['evidencia'] || '')) && archivoLinea.test(s['evidencia'] || ''),
  };
  const completo = Object.values(campos).every(Boolean);
  const reportado = /^\*\*Reporte\*\*:\s*https?:\/\/\S+/m.test(md);
  return { id: f.replace('.md', ''), campos, completo, reportado };
});

const si = (b) => (b ? 'Sí' : 'No');
console.log('| Bug | Título | Severidad | Pasos | Esperado | Actual | Evidencia | Completo | Reportado |');
console.log('|---|---|---|---|---|---|---|---|---|');
for (const r of filas) {
  const c = r.campos;
  console.log(`| ${r.id} | ${si(c.titulo)} | ${si(c.severidad)} | ${si(c.pasos)} | ${si(c.esperado)} | ${si(c.actual)} | ${si(c.evidencia)} | ${si(r.completo)} | ${si(r.reportado)} |`);
}

const n = filas.length;
const pct = (a) => (n ? Math.round((a / n) * 100) : 0);
const completos = filas.filter((r) => r.completo).length;
const reportados = filas.filter((r) => r.reportado).length;
console.log(`\nReportes completos en formato estándar: ${completos}/${n} (${pct(completos)}%)`);
console.log(`Bugs reportados:                        ${reportados}/${n} (${pct(reportados)}%)`);
