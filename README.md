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

TC-001 a TC-005 están en `tests/Critical Cases/`; TC-006 a TC-008 los generó QATES y están en `tests/QATES/`.

El diseño de los ocho casos está en [casos-automatizacion.md](casos-automatizacion.md) y el plan detallado
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
npx playwright test --grep @qates                  # solo los generados por QATES (TC-006 a TC-008)
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
- `trazabilidad.json`: por cada TC, el flujo crítico que protege, su severidad y sus archivos de datos (lo lee el reporte de CI).

El email del registro y la contraseña se generan en cada ejecución, así que no hay nada que cargar a mano.

## Estructura

```
tests/
  Critical Cases/   TC-001 a TC-005
  QATES/            TC-006 a TC-008, generados por QATES ([QATES] en el título y etiqueta @qates)
  pages/            Page Objects (CatalogPage, CheckoutPage)
  data/             datos de prueba versionados (product.ts, usuarios.ts, trazabilidad.json)
  agregar-producto-al-carrito.spec.ts
specs/              planes de prueba
docs/               guías y reportes de bugs
scripts/reporte/    generador de reportes BUG-CI desde el JSON de Playwright
.github/workflows/  typecheck.yml y playwright.yml
```

## Convenciones

- Locators **solo por rol o `data-test`**; nunca CSS ni XPath.
- Los Page Objects agrupan acciones y locators; las verificaciones quedan en los tests.
- El producto de prueba (hoy Bolt Cutters) está en `tests/data/product.ts`.

## Efectos en el sitio demo y límites

- **TC-001 crea una orden** y **TC-002 crea una cuenta** en cada ejecución; TC-003 a TC-008 no crean
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

El check `Playwright Tests / test` falla si algún test falla. Para que eso impida el merge hay que
exigirlo en GitHub (lo configura quien administra el repo): *Settings → Branches → regla de protección
de `main` → Require status checks to pass* y marcar `Playwright Tests / test` y `Type check (tsc)`.

Los tests omitidos por Cloudflare **no** hacen fallar el check: el job queda verde y el PR muestra un
aviso con la cantidad. Un PR verde con muchos omitidos no ejercitó esas pruebas.

### Reporte de fallos

En CI (variable `CI`) Playwright genera, además del reporte HTML, `test-results/resultados.json`.
`scripts/reporte/generar-reportes.js` lo lee y, por cada test fallido, escribe un borrador de bug con las
secciones de `docs/bugs/BUG-001.md` (datos generales, qué pasó, pasos, datos de prueba, origen, impacto y
evidencia). Lo que el CI no puede saber queda como `[FALTA DATO: ...]` para completarlo a mano.

- **Nombre:** `BUG-CI-<commit7>-<TC>-<navegador>.md`, por ejemplo `BUG-CI-e4eb637-TC-001-firefox.md`.
  El commit es el último del PR; el PR, la rama y el enlace a la corrida van en la sección *Origen*.
- **Severidad y flujo afectado:** salen de `tests/data/trazabilidad.json` (una entrada por TC; hay que
  añadir la del TC nuevo).
- **Resumen:** el job muestra totales, fallos con su severidad y flujo, y los omitidos por Cloudflare.

| Artefacto | Contenido |
| :--- | :--- |
| `reportes-ci` | borradores `BUG-CI-*.md` (solo si hubo fallos) |
| `playwright-report` | reporte HTML, trazas y `test-results/` completo |

Local: `CI=1 npx playwright test` y luego `node scripts/reporte/generar-reportes.js`.

### Probar el proceso de bugs

¿Es la primera vez que lo usas? Sigue la [guía paso a paso](docs/guia-reportes-bugs.md): explica qué
hace el sistema solo, cómo provocar un fallo de prueba sin tocar el sitio, cómo leer el borrador de bug
y qué hacer con él. No hace falta instalar nada: se hace desde el navegador.

## Cómo se construyeron los tests

Se usaron dos conjuntos de agentes.

**Agentes de Playwright** (`.claude/agents/`):

- **planner:** exploró el sitio y armó el plan de `specs/checkout.md`.
- **generator:** generó los tests de `tests/Critical Cases/` a partir de ese plan.
- **healer:** corrió los tests que fallaban y los corrigió.

| Test | Qué corrigió el healer |
| :--- | :--- |
| TC-001 | El contador del carrito esperaba `0` y el sitio muestra `1`; el aviso de "Product added" ahora admite varios avisos a la vez |
| TC-003 | En WebKit el total del carrito a veces no cambiaba tras la cantidad 2; ese paso ahora reintenta |
| TC-004 | Quitó la exigencia de "hammer" en cada nombre del filtro, porque la categoría tiene un producto con otro nombre; luego se comparó con los nombres que devuelve la API |

**Agentes de QATES:**

- **`qa-analyst`:** propuso los casos críticos iniciales (TC-001 a TC-005, que luego se ajustaron) y los tres casos nuevos (TC-006 a TC-008).
- **`qa-automator`:** automatizó TC-006 a TC-008 en `tests/QATES/`. Esos tests se reconocen por la carpeta, el comentario inicial `// Generado por QATES`, el prefijo `[QATES]` en el título y la etiqueta `@qates`.

## Créditos

La aplicación probada es de [Testsmith](https://github.com/testsmith-io/practice-software-testing).
Este repositorio solo contiene las pruebas.
