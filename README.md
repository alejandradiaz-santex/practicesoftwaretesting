# practicesoftwaretesting

Pruebas automatizadas con **Playwright + TypeScript** sobre la tienda demo
[practicesoftwaretesting.com](https://practicesoftwaretesting.com) (Toolshop), un sitio hecho
para practicar testing.

## Casos cubiertos

| ID | Caso | Test |
| :--- | :--- | :--- |
| TC-001 | Compra Exitosa como Guest | `tc-001-compra-guest.spec.ts` |
| TC-002 | Registro de Cuenta exitoso | `tc-002-registro-exitoso.spec.ts` |
| TC-003 | Cantidades y Totales dentro del Carrito | `tc-003-cantidades-totales.spec.ts` |
| TC-004 | Búsqueda por Producto o filtrando por Categoría | `tc-004-busqueda-filtros.spec.ts` |
| TC-005 | Checkout con datos inválidos | `tc-005-checkout-invalido.spec.ts` |
| TC-006 | Ordenar por precio muestra el orden correcto | `tests/QATES/tc-006-ordenar-por-precio.spec.ts` |
| TC-007 | Login con credenciales inválidas es rechazado | `tests/QATES/tc-007-login-invalido.spec.ts` |
| TC-008 | Tarjeta, ficha y API muestran el mismo nombre y precio | `tests/QATES/tc-008-tarjeta-ficha-api.spec.ts` |
| TC-009 | Formulario de contacto: validación y envío válido | `tests/QATES/tc-009-formulario-contacto.spec.ts` |

TC-001 a TC-005 están en `tests/Critical Cases/`; TC-006 a TC-009 los generó QATES y están en `tests/QATES/`.

El diseño de los nueve casos está en [casos-automatizacion.md](casos-automatizacion.md) y el plan detallado
de TC-001 a TC-005, con los hallazgos de la exploración del sitio, en [specs/checkout.md](specs/checkout.md).

## Requisitos

- [Node.js](https://nodejs.org) LTS (incluye `npm`). Si la terminal dice que `npm` no se reconoce,
  instálalo y abre una terminal nueva.
- Los comandos de este README funcionan igual en Windows, Mac y Linux, salvo donde se indique una
  versión para PowerShell.

## Instalación

```bash
npm ci
```

```bash
npx playwright install
```

Esto instala los tres navegadores (Chromium, Firefox y WebKit). Hoy el CI solo corre **Firefox**, pero
con todos instalados no tendrás que repetir este paso si se suma otro.

Si prefieres ahorrar espacio y solo vas a correr Firefox, instala únicamente ese:

```bash
npx playwright install firefox
```

## Cómo ejecutar los tests

```bash
npx playwright test
```

Otras formas:

```bash
npx playwright test "tests/Critical Cases"        # solo TC-001 a TC-005
npx playwright test --grep @qates                  # solo los generados por QATES (TC-006 a TC-009)
npx playwright test "tc-003"                       # un test
npx playwright test --project=firefox              # un navegador (chromium, firefox o webkit)
npx playwright show-report                         # abrir el reporte HTML
npx tsc --noEmit                                   # chequeo de tipos
```

En PowerShell, si aparece un error de "ejecución de scripts deshabilitada", usa `npx.cmd` en vez
de `npx`, o abre una terminal Command Prompt.

## Variables de entorno

Ninguna es obligatoria. `TC002_PASSWORD` define la contraseña de la cuenta que crea TC-002; si no
existe, el test genera una aleatoria. Puedes ponerla en un archivo `.env` (está en `.gitignore`);
`.env.example` es la plantilla versionada.

## Datos de prueba

Están versionados en `tests/data/` y no contienen datos reales ni secretos:

- `product.ts`: producto de prueba y formato de dinero.
- `usuarios.ts`: guest, dirección de Argentina (la que el sitio autocompleta) y perfil del registro de TC-002.
- `busqueda.ts`: término de búsqueda y categoría de TC-004.
- `contacto.ts`: datos del formulario de contacto de TC-009, el borde de longitud del mensaje y los emails inválidos.
- `trazabilidad.json`: por cada TC, su título no técnico, el flujo crítico que protege, su severidad, sus archivos de datos y los textos del template de bug (precondiciones, esperado, usuario, valores, registros, a quién afecta). Lo lee el reporte de CI.

El email del registro y la contraseña se generan en cada ejecución, así que no hay nada que cargar a mano.

## Estructura

```
tests/
  Critical Cases/   TC-001 a TC-005
  QATES/            TC-006 a TC-009, generados por QATES ([QATES] en el título y etiqueta @qates)
  pages/            Page Objects (CatalogPage, CheckoutPage, ContactPage)
  data/             datos de prueba versionados (product.ts, usuarios.ts, busqueda.ts, contacto.ts, trazabilidad.json)
  agregar-producto-al-carrito.spec.ts
specs/              planes de prueba
docs/               guías y reportes de bugs
scripts/reporte/    generador de reportes BUG-CI desde el JSON de Playwright
scripts/metricas/   métricas del proyecto (ver la cabecera de cada script)
.github/workflows/  typecheck.yml y playwright.yml
```

## Convenciones

- Locators **solo por rol o `data-test`**; nunca CSS ni XPath.
- Los Page Objects agrupan acciones y locators; las verificaciones quedan en los tests.
- El producto de prueba (hoy Bolt Cutters) está en `tests/data/product.ts`.
- `tests/seed.spec.ts` es la plantilla vacía que usan los agentes de Playwright para generar tests. No es un
  test real: en CI no se ejecuta (`testIgnore` en `playwright.config.ts`). En local sigue disponible para los
  agentes.
- `tests/agregar-producto-al-carrito.spec.ts` es una prueba de práctica, no un caso (no tiene `TC-###`): tampoco
  se ejecuta en CI. Por eso la suite del CI son los 9 casos, TC-001 a TC-009. En local se sigue pudiendo correr.

## Efectos en el sitio demo y límites

- **TC-001 crea una orden**, **TC-002 crea una cuenta** y **TC-009 crea un mensaje de contacto** en cada
  ejecución, y el CI las repite en cada pull request y en cada push a `main`. TC-003 a TC-008 no crean
  datos. TC-007 escribe una contraseña ficticia en el login: es un intento fallido, no crea cuenta
  ni sesión.
- El stock de los productos es finito: TC-001 consume una unidad por ejecución.
- Es un sitio compartido cuyos datos cambian: pueden aparecer productos sin stock, categorías
  duplicadas o el sitio caído (error 521 de Cloudflare). Revisa `test-results/<test>/error-context.md`
  antes de suponer un defecto del test.
- Cloudflare puede mostrar una verificación anti-bots a las máquinas de GitHub. Si un test falla con
  esa pantalla, `tests/fixtures.ts` lo marca como omitido (anotación `cloudflare`) en vez de fallido,
  porque no pudo ejercitar el sitio. No se intenta esquivar la verificación, y un fallo con la página
  real del sitio sigue siendo un fallo. Los specs importan `test` y `expect` de `tests/fixtures.ts`.

## Integración continua

Nadie tiene que lanzar nada a mano: los workflows corren solos en cada pull request.

- `typecheck.yml`: corre `tsc --noEmit` en cada pull request.
- `playwright.yml`: corre la suite completa (incluye `tests/QATES/`) solo en Firefox, en cada pull request
  hacia `main` y en cada push a `main`. También se puede lanzar desde la pestaña Actions
  (*Run workflow*). Si se sube otro commit al mismo PR, cancela la corrida anterior.

### Bloqueo del merge

La rama `main` está protegida así (se cambia en *Settings → Branches*, y lo hace quien administra el repo):

- Todo cambio entra por pull request, con **1 aprobación** de otra persona.
- Deben pasar los checks `Playwright Tests / test` y `Type check (tsc)`, y la rama debe estar al día con `main`.
- La regla se aplica también a administradores.

El check `test` falla si algún test falla.

Los tests omitidos por Cloudflare **no** hacen fallar el check mientras sean la mitad o menos: el job queda
verde y el PR muestra un aviso con la cantidad. Si **más del 50%** de los tests queda omitido, la suite casi
no se ejercitó y el check falla a propósito: relanza la corrida (*Re-run failed jobs*). El porcentaje se
cambia añadiendo `MAX_OMITIDOS_PCT` al `env` del paso "Generar reportes" en `playwright.yml`.

### Reporte de fallos

En CI (variable `CI`) Playwright genera, además del reporte HTML, `test-results/resultados.json`.
`scripts/reporte/generar-reportes.js` lo lee y, por cada test fallido, escribe un borrador de bug con las
secciones de `docs/bugs/BUG-001.md` (datos generales, qué pasó, pasos, datos de prueba, origen, impacto y
evidencia). Lo que el CI no puede saber queda como `[FALTA DATO: ...]` para completarlo a mano.

- **Nombre:** `BUG-CI-<commit7>-<TC>-<navegador>.md`, por ejemplo `BUG-CI-e4eb637-TC-001-firefox.md`.
  El commit es el último del PR; el PR, la rama y el enlace a la corrida van en la sección *Origen*.
- **Textos por TC:** título no técnico, severidad, flujo afectado, precondiciones, resultado esperado,
  usuario, valores, registros y a quién afecta salen de `tests/data/trazabilidad.json` (una entrada por TC;
  hay que añadir la del TC nuevo).
- **Campos que se rellenan solos:** además de lo anterior, la *Versión* se lee del pie de página del sitio
  (`tests/fixtures.ts` la guarda al fallar un test, leída de la página viva; si no está, se busca en el
  `error-context` de cada intento), y *Desde cuándo*, *¿Funcionaba antes?* y *Frecuencia*
  salen del historial de corridas de `main` (el workflow tiene el permiso `actions: read` para eso).
- **Nunca se inventa un dato:** si no se puede obtener (la página era la de Cloudflare, no hay historial...),
  el campo queda como `[FALTA DATO]`. El historial es de la suite completa, no de un test. Solo la
  *Prioridad* (la define el PO) y la *Alternativa (workaround)* dependen siempre de una persona.
- **Resumen:** el job muestra una tabla con los tests que pasaron, los **inestables**, los que fallaron y los
  omitidos por Cloudflare, más la lista de fallos con su severidad y flujo afectado. Si más del 50% quedó
  omitido, el título cambia a "Suite no ejercitada" y el check falla.
- **Inestables:** un test que falla y pasa al reintentar (con `retries: 2` en CI) aparece en su propia
  sección con el error del primer fallo. No bloquea el merge ni genera borrador, porque el test pasó.
- **Qué error cuenta el borrador:** el del **primer** fallo, y lista todos los intentos para que se vea si no
  fallaron igual. La línea y el archivo son donde se lanzó el error, que puede ser un page object.
- **Tests sin `TC-###` en el título** (como `agregar-producto-al-carrito`) salen como `TC-XXX`, con severidad y
  flujo en `[FALTA DATO]`. Si hay varios, el nombre lleva un sufijo (`-2`, `-3`) para que no se pisen.

| Artefacto | Contenido |
| :--- | :--- |
| `reportes-ci-<n>` | borradores `BUG-CI-*.md` (solo si hubo fallos) |
| `playwright-report-<n>` | reporte HTML, trazas y `test-results/` completo |

`<n>` es el número de ejecución: `1` la primera vez y `2` si relanzas la corrida (*Re-run*). Así cada
ejecución conserva sus propias evidencias y el relanzamiento no choca con los artefactos de la anterior.

Local: `CI=1 npx playwright test` y luego `node scripts/reporte/generar-reportes.js`.

En PowerShell (Windows):

```powershell
$env:CI=1; npx.cmd playwright test
node scripts/reporte/generar-reportes.js
```

### Probar el proceso de bugs

¿Es la primera vez que lo usas? Sigue la [guía paso a paso](docs/guia-reportes-bugs.md): explica qué
hace el sistema solo, cómo provocar un fallo de prueba sin tocar el sitio, cómo leer el borrador de bug
y qué hacer con él. No hace falta instalar nada: se hace desde el navegador.

## Cómo se construyeron los tests

Se usaron dos conjuntos de agentes.

**Agentes de Playwright** (`.claude/agents/`):

- **planner:** exploró el sitio y armó el plan de `specs/checkout.md`; también exploró el formulario de contacto (`specs/contact.md`).
- **generator:** generó los tests de `tests/Critical Cases/` a partir de ese plan.
- **healer:** corrió los tests que fallaban y los corrigió.

| Test | Qué corrigió el healer |
| :--- | :--- |
| TC-001 | El contador del carrito esperaba `0` y el sitio muestra `1`; el aviso de "Product added" ahora admite varios avisos a la vez |
| TC-003 | En WebKit el total del carrito a veces no cambiaba tras la cantidad 2; ese paso ahora reintenta |
| TC-004 | Quitó la exigencia de "hammer" en cada nombre del filtro, porque la categoría tiene un producto con otro nombre; luego se comparó con los nombres que devuelve la API |

**Agentes de QATES:**

- **`qa-analyst`:** propuso los casos críticos iniciales (TC-001 a TC-005, que luego se ajustaron) y los tres casos nuevos (TC-006 a TC-008).
- **`qa-test-designer`:** diseñó TC-009 (formulario de contacto) y sus casos de borde a partir de la exploración del planner.
- **`qa-automator`:** automatizó TC-006 a TC-009 en `tests/QATES/`. Esos tests se reconocen por la carpeta, el comentario inicial `// Generado por QATES`, el prefijo `[QATES]` en el título y la etiqueta `@qates`.

## Créditos

La aplicación probada es de [Testsmith](https://github.com/testsmith-io/practice-software-testing).
Este repositorio solo contiene las pruebas.
