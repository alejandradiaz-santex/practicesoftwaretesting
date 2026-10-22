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

El diseño de cada caso está en [casos-automatizacion.md](casos-automatizacion.md) y el plan detallado,
con los hallazgos de la exploración del sitio, en [specs/checkout.md](specs/checkout.md).

## Requisitos

- [Node.js](https://nodejs.org) LTS (incluye `npm`). Si la terminal dice que `npm` no se reconoce,
  instálalo y abre una terminal nueva.

## Instalación

```bash
npm ci
```

```bash
npx playwright install
```

## Cómo ejecutar los tests

```bash
npx playwright test
```

Otras formas:

```bash
npx playwright test "tests/Critical Cases"        # solo los casos críticos
npx playwright test "tc-003"                       # un test
npx playwright test --project=firefox              # un navegador (chromium, firefox o webkit)
npx playwright show-report                         # abrir el reporte HTML
npx tsc --noEmit                                   # chequeo de tipos
```

En PowerShell, si aparece un error de "ejecución de scripts deshabilitada", usa `npx.cmd` en vez
de `npx`, o abre una terminal Command Prompt.

## Variables de entorno

Ninguna es obligatoria. `TC002_PASSWORD` define la contraseña de la cuenta que crea TC-002; si no
existe, el test genera una aleatoria. Puedes ponerla en un archivo `.env` (está en `.gitignore`).

## Estructura

```
tests/
  Critical Cases/   los 5 casos críticos
  pages/            Page Objects (CatalogPage, CheckoutPage)
  data/             datos de prueba (product.ts)
  agregar-producto-al-carrito.spec.ts
specs/              planes de prueba
.github/workflows/  typecheck.yml y playwright.yml
```

## Convenciones

- Locators **solo por rol o `data-test`**; nunca CSS ni XPath.
- Los Page Objects agrupan acciones y locators; las verificaciones quedan en los tests.
- El producto de prueba (hoy Bolt Cutters) está en `tests/data/product.ts`.

## Efectos en el sitio demo y límites

- **TC-001 crea una orden** y **TC-002 crea una cuenta** en cada ejecución; TC-003, TC-004 y TC-005
  no crean datos.
- El stock de los productos es finito: TC-001 consume una unidad por ejecución.
- Es un sitio compartido cuyos datos cambian: pueden aparecer productos sin stock, categorías
  duplicadas o el sitio caído (error 521 de Cloudflare). Revisa `test-results/<test>/error-context.md`
  antes de suponer un defecto del test.
- Cloudflare puede mostrar una verificación anti-bots a las máquinas de GitHub.

## Integración continua

- `typecheck.yml`: corre `tsc --noEmit` en cada pull request.
- `playwright.yml`: corre los tests solo en Firefox, en cada push y pull request hacia `main`, y sube
  `playwright-report/` y `test-results/`.

## Cómo se construyeron los tests

Se usaron los agentes de Playwright que están en `.claude/agents/`:

- **planner:** exploró el sitio y armó el plan de `specs/checkout.md`.
- **generator:** generó los tests de `tests/Critical Cases/` a partir de ese plan.
- **healer:** corrió los tests que fallaban y los corrigió.

| Test | Qué corrigió el healer |
| :--- | :--- |
| TC-001 | El contador del carrito esperaba `0` y el sitio muestra `1`; el aviso de "Product added" ahora admite varios avisos a la vez |
| TC-003 | En WebKit el total del carrito a veces no cambiaba tras la cantidad 2; ese paso ahora reintenta |
| TC-004 | Quitó la exigencia de "hammer" en cada nombre del filtro, porque la categoría tiene un producto con otro nombre; luego se comparó con los nombres que devuelve la API |

## Créditos

La aplicación probada es de [Testsmith](https://github.com/testsmith-io/practice-software-testing).
Este repositorio solo contiene las pruebas.
