// Calcula dos métricas a partir de docs/bugs/BUG-*.md (formato de la plantilla de bugs):
//   1. Reportes completos en formato estándar
//   2. Bugs reportados (% de los bugs documentados): el archivo tiene una línea
//      `**Reporte**: https://...` con el enlace al reporte (Notion, Jira, issue...).
//
// Un reporte está completo si todos los campos de la plantilla tienen valor. Un campo cuenta
// si trae contenido o un `N/A: motivo`. No cuentan los `[FALTA DATO ...]` ni `PENDIENTE`;
// la única excepción es Prioridad, que la define el PO y la plantilla permite dejarla así.
// Además: el resultado esperado debe llevar su "según …", los pasos deben ser una lista
// numerada y la evidencia debe incluir al menos una captura.
//
// Uso: node scripts/metricas/bugs.js [carpeta]   (por defecto docs/bugs)
const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv[2] || path.join(__dirname, '..', '..', 'docs', 'bugs'));
const archivos = fs.readdirSync(dir).filter((f) => /^BUG-\d+\.md$/.test(f)).sort();

// Campos `**Nombre**: valor` que exige la plantilla.
const CAMPOS = [
  'Severidad', 'Prioridad', 'Ambiente', 'Versión', 'Navegador / dispositivo',
  'Ticket relacionado', 'Reportado con',
  'Precondiciones', 'Resultado esperado', 'Resultado obtenido', 'Frecuencia',
  'Usuario y rol', 'Valores ingresados', 'Registros', 'De dónde salen los datos', 'Contexto',
  'Cómo se encontró', 'Capa', 'Dónde falla', 'Desde cuándo',
  'Qué flujo afecta', 'A quién afecta', 'Cuántos', 'Alternativa (workaround)', '¿Funcionaba antes?',
];

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Texto de cada sección "## Nombre" (vacío si no existe).
function secciones(md) {
  const out = {};
  for (const p of md.split(/^## /m).slice(1)) {
    const [titulo, ...resto] = p.split('\n');
    out[titulo.trim().toLowerCase()] = resto.join('\n').trim();
  }
  return out;
}

function evaluar(md) {
  const faltan = [];
  const s = secciones(md);

  if (!/^# BUG-\d+:\s*\S+/m.test(md)) faltan.push('Título');
  if (!s['qué pasó']) faltan.push('Qué pasó');
  if (!/^\d+\.\s+\S+/m.test(s['pasos para reproducir'] || '')) faltan.push('Pasos (lista numerada)');

  for (const campo of CAMPOS) {
    const m = md.match(new RegExp('\\*\\*' + esc(campo) + '\\*\\*:\\s*(.*)$', 'm'));
    const valor = m ? m[1].trim() : '';
    const poPendiente = campo === 'Prioridad' && /^\[FALTA DATO: la define el PO/.test(valor);
    if (!valor || ((/\[FALTA DATO|PENDIENTE/i.test(valor)) && !poPendiente)) faltan.push(campo);
    else if (campo === 'Resultado esperado' && !/según/i.test(valor)) faltan.push('Resultado esperado (falta el "según …")');
  }

  const ev = s['evidencia'] || '';
  if (!/^- /m.test(ev)) faltan.push('Evidencia');
  else if (!/captura/i.test(ev)) faltan.push('Evidencia (falta una captura)');
  if (/PENDIENTE/.test(ev)) faltan.push('Evidencia (captura pendiente)');

  const reportado = /^\*\*Reporte\*\*:\s*https?:\/\/\S+/m.test(md);
  return { faltan, completo: faltan.length === 0, reportado };
}

const filas = archivos.map((f) => ({ id: f.replace('.md', ''), ...evaluar(fs.readFileSync(path.join(dir, f), 'utf8')) }));

const si = (b) => (b ? 'Sí' : 'No');
console.log('| Bug | Completo | Reportado | Qué falta |');
console.log('|---|---|---|---|');
for (const r of filas) console.log(`| ${r.id} | ${si(r.completo)} | ${si(r.reportado)} | ${r.faltan.join('; ') || '—'} |`);

const n = filas.length;
const pct = (a) => (n ? Math.round((a / n) * 100) : 0);
const completos = filas.filter((r) => r.completo).length;
const reportados = filas.filter((r) => r.reportado).length;
console.log(`\nReportes completos en formato estándar: ${completos}/${n} (${pct(completos)}%)`);
console.log(`Bugs reportados:                        ${reportados}/${n} (${pct(reportados)}%)`);
