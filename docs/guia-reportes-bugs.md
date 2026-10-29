# Guía: reportes automáticos de bugs

Guía para quien no conoce el proyecto y quiere probar, por su cuenta, el proceso que detecta fallos y
genera un borrador de reporte de bug.

## Qué es y qué hace solo

Cada vez que alguien abre un pull request (PR), GitHub corre **solo** todos los tests. **No tienes que
ejecutar nada.** Si un test falla, el sistema:

1. marca el PR en rojo y **bloquea el merge**;
2. escribe un resumen en la corrida (qué falló, severidad, flujo afectado);
3. genera un **borrador de reporte de bug** por cada test fallido, listo para descargar.

El borrador no es el reporte final: lo que el sistema no puede saber queda como `[FALTA DATO: ...]` y
lo completa una persona. **Por ahora no se crea nada en Jira automáticamente:** el ticket se crea a mano.

## Qué necesitas

- Una cuenta de GitHub con **permiso de escritura** en este repositorio. Si al abrir el repo no ves la
  opción de crear ramas o editar archivos, pídeselo a quien administra el repositorio.
- Nada más: no hace falta instalar programas.

## Palabras que verás

- **PR (pull request):** una propuesta de cambio que otras personas revisan antes de aplicarla.
- **Borrador (draft):** un PR marcado como "no está listo"; no se puede mergear por error.
- **CI:** los chequeos automáticos que corren solos cuando abres un PR.
- **Check:** cada chequeo individual. Aquí hay dos: `Type check (tsc)` y `test`.
- **Artefacto:** un archivo que la corrida guarda para que lo descargues (dura 30 días).
- **Merge:** aplicar el cambio del PR a la rama principal (`main`).

## Probarlo paso a paso (sin tocar el sitio real)

Rompemos un test a propósito para ver qué pasa. El test elegido no crea cuentas ni órdenes en el sitio.

### 1. Rompe un test

1. Abre en GitHub el archivo `tests/QATES/tc-008-tarjeta-ficha-api.spec.ts`.
2. Pulsa el icono del **lápiz** (arriba a la derecha) para editarlo.
3. Busca esta línea. Para encontrarla rápido, pulsa **Ctrl + F** (en Mac, **Cmd + F**) y pega el texto:
   ```ts
   await expect(catalog.productName).toHaveText(nombreTarjeta);
   ```
4. Cambia solo `nombreTarjeta` por `'texto que no existe'` (con las comillas). Debe quedar así:
   ```ts
   await expect(catalog.productName).toHaveText('texto que no existe');
   ```
5. Pulsa **Commit changes...**, elige **Create a new branch**, deja el nombre que te propone y
   pulsa **Propose changes**.

### 2. Abre el PR en borrador

1. En la pantalla siguiente, pulsa la flecha junto a **Create pull request** y elige
   **Create draft pull request**.
2. Pon como título: `PRUEBA, no mergear`.
3. Pulsa **Draft pull request**.

### 3. Espera y mira el resultado

Los chequeos tardan entre 2 y 6 minutos. Los verás en la parte baja del PR.

- `Type check (tsc)`: ✅ verde (solo revisa que el código esté bien escrito; el cambio es válido).
- `test`: ❌ **rojo**. Es lo esperado.
- El botón de merge aparece **bloqueado**.

### 4. Lee el resumen

1. Junto al check `test` pulsa **Details**.
2. En la columna izquierda pulsa **Summary**.
3. Verás una tabla con los tests que pasaron, fallaron y quedaron omitidos, y una lista de fallos con su
   severidad y el flujo del sitio al que afecta (aquí TC-008, "Detalle de producto").

### 5. Descarga el borrador del bug

1. En esa misma página, baja hasta **Artifacts**.
2. Descarga **`reportes-ci-1`** (es un `.zip`) y ábrelo. El número final es el de la ejecución: `1` la
   primera vez, `2` si relanzas la corrida.
3. Dentro hay un archivo como `BUG-CI-1a2b3c4-TC-008-firefox.md`. Ábrelo con el Bloc de notas o cualquier
   editor de texto.

### 6. Limpia

1. Vuelve al PR y pulsa **Close pull request** (no pulses *Merge*).
2. Pulsa **Delete branch**.

## Cómo leer el borrador

El nombre dice: `BUG-CI-` + **commit** (qué versión de las pruebas detectó el fallo) + **TC** (qué test) +
**navegador**. Ejemplo de un borrador, resumido (los valores de *Origen* son un ejemplo de lo que verías en CI):

```markdown
# BUG-CI-9def2b3-TC-008-firefox: TC-008: tarjeta, ficha y API muestran el mismo nombre y precio

## Datos generales
- **Título**: [Detalle de producto] El nombre o el precio de un producto no coinciden entre la tarjeta del catálogo, su ficha y el servidor
- **Severidad**: Media
- **Prioridad**: [FALTA DATO: la define el PO]
- **Ambiente**: CI (GitHub Actions) — https://practicesoftwaretesting.com
- **Versión**: v2.5, build 2026-10-11 (pie de página)
- **Navegador / dispositivo**: firefox (Playwright 1.64.1) en Linux
- **Ticket relacionado**: TC-008
- **Reportado con**: CI automático (borrador, requiere revisión)

## Qué pasó
Error: expect(locator).toHaveText(expected) failed
Expected: "texto que no existe"
Received: " Combination Pliers "

Es el error del primer fallo. Intentos de esta corrida:
1. failed: expect(locator).toHaveText(expected) failed (línea 24)
2. failed: expect(locator).toHaveText(expected) failed (línea 24)
3. failed: expect(locator).toHaveText(expected) failed (línea 24)

## Pasos para reproducir
**Precondiciones**: catálogo accesible, sin sesión, sin filtros ni búsqueda y con al menos una tarjeta visible

1. `npx playwright test "tests/QATES/tc-008-tarjeta-ficha-api.spec.ts" --project=firefox`

**Resultado esperado**: el nombre y el precio de la ficha son iguales a los de la tarjeta, y la API responde 200 con el mismo nombre y el mismo precio, según `casos-automatizacion.md` (TC-008)
**Resultado obtenido**: expect(locator).toHaveText(expected) failed · Expected: "texto que no existe" · Received: " Combination Pliers "
**Frecuencia**: falló 3 de 3 intento(s) en esta corrida; en las últimas 10 corridas de `main`, 9 salieron verdes

## Datos de prueba
- **Usuario y rol**: visitante sin sesión / sin rol
- **Valores ingresados**: ninguno (solo lectura)
- **Registros**: ninguno: no crea pedidos ni cuentas
- **De dónde salen los datos**: Sin datos fijos: lee el nombre y el precio de la primera tarjeta del catálogo (commit 9def2b3)
- **Contexto**: corrida automática de CI; los valores se generan o están dentro del propio test

## Origen
- **Cómo se encontró**: corrida automática de CI (PR 25, rama `mi-rama`, commit `9def2b3`)
- **Dónde falla**: `tests/QATES/tc-008-tarjeta-ficha-api.spec.ts:24`
- **Capa**: UI (deducida del error: falla una comprobación de la página)
- **Desde cuándo**: sin dato propio de este test. La última corrida verde de `main` es del commit `bac8aa3` (2026-10-28 22:19 UTC) (dato de la suite completa)

## Impacto
- **Qué flujo afecta**: 8 · Detalle de producto (tarjeta, ficha y API coherentes)
- **A quién afecta**: visitantes que consultan el detalle de un producto
- **Cuántos**: N/A: sitio demo, sin usuarios reales ni métricas de uso
- **Alternativa (workaround)**: [FALTA DATO: si existe]
- **¿Funcionaba antes?**: probablemente sí: la última corrida verde de `main` (`bac8aa3`) pasó la suite completa. No confirma este test en concreto

## Evidencia
- `tests/QATES/tc-008-tarjeta-ficha-api.spec.ts:24`
- `screenshot` (intento 1): `test-results/.../test-failed-1.png` (en el artefacto `playwright-report-1`)
- `trace` (intento 2): `test-results/.../trace.zip` (en el artefacto `playwright-report-1`)
```

**Qué se rellena solo y qué no.** El sistema rellena casi todo. Solo quedan para una persona la
**Prioridad** (la define el PO) y la **Alternativa (workaround)**. Dos reglas para leerlo bien:

- **Un dato que el sistema no puede obtener queda como `[FALTA DATO: ...]`, nunca inventado.** Por ejemplo,
  la *Versión* sale del pie de página del sitio y, si la página que se vio era la de Cloudflare, no se puede
  leer.
- **El historial es de la suite completa, no de este test.** Una corrida verde no prueba que ese test
  concreto pasó (pudo omitirse), y el borrador lo dice.

| Sección | De dónde sale | Quién la completa |
| :--- | :--- | :--- |
| Datos generales | Título, severidad y ticket por TC (`trazabilidad.json`); versión del pie de página; navegador | **El sistema**. Solo la *Prioridad* la define el PO |
| Qué pasó | El mensaje de error real y cada intento | **El sistema** |
| Pasos para reproducir | Comando exacto, precondiciones y resultado esperado por TC; resultado obtenido y frecuencia | **El sistema** |
| Datos de prueba | Usuario, valores y registros por TC; de qué archivo salen los datos | **El sistema** |
| Origen | PR, rama, commit, archivo y línea; última corrida verde de `main` | **El sistema** |
| Impacto | Flujo y a quién afecta por TC; cuántos (N/A en el sitio demo) | **El sistema**. El *workaround* lo completa una persona |
| Evidencia | Línea del fallo, captura, traza y `error-context` | **El sistema**. Los archivos están en el artefacto `playwright-report-<n>` |

Un test **sin `TC-###`** en el título no tiene esos textos por TC: casi todos los campos saldrán como
`[FALTA DATO]`.

## ¿Es un bug de verdad o un fallo del sitio?

El sitio de pruebas es compartido y a veces no carga, y entonces fallan tests que nadie tocó.

1. Abre la corrida y pulsa **Re-run failed jobs** (arriba a la derecha). Espera de nuevo.
2. Si ahora pasa: fue el sitio. No hay bug que reportar.
3. Si falla **igual y con el mismo mensaje**: trátalo como bug real.
4. Un test **omitido** no cuenta como fallo: Cloudflare, una protección del sitio, bloqueó la prueba. Ese
   test no se ejecutó, así que no te dice nada del sitio. Solo si **más de la mitad** de los tests queda
   omitido, el check falla a propósito: relanza la corrida.

## Qué hacer con un borrador de bug real

1. Completa los `[FALTA DATO: ...]` que sepas. Los que no puedas, déjalos marcados.
2. **Crea el ticket a mano en el Jira de tu equipo** y pega las secciones del borrador (título, qué pasó,
   pasos, datos de prueba, origen, impacto y evidencia). Adjunta la traza del artefacto
   `playwright-report-<n>` si la necesitas.
3. Anota en el ticket el enlace a la corrida que aparece en *Origen*.

## Lanzar los tests sin abrir un PR

1. Entra en la pestaña **Actions** del repositorio.
2. En la columna izquierda elige **Playwright Tests**.
3. Pulsa **Run workflow**, elige la rama y confirma con el botón verde.

Sirve para repetir una corrida sobre una rama. El borrador solo se genera si algún test falla.

## Si algo sale distinto

- **No ves el artefacto `reportes-ci-<n>`:** solo aparece si hubo al menos un fallo, y dura 30 días. Si
  relanzaste la corrida y la segunda vez pasó, el borrador está en `reportes-ci-1`, el de la primera.
- **No te deja descargar el artefacto:** hace falta haber iniciado sesión en GitHub con acceso al repo.
- **Falló algo que no tocaste:** ver *¿Es un bug de verdad o un fallo del sitio?*.
- **El botón de merge dice que falta una aprobación:** es normal; el repo exige que otra persona apruebe
  cada PR.
- **Aparecen muchos tests omitidos:** Cloudflare está bloqueando a GitHub. Si son más de la mitad, el check
  falla y debes relanzar la corrida. Si son menos, el check queda verde pero cubre menos de lo que parece:
  avisa al equipo.

## Opción avanzada: en tu computadora

Si ya instalaste el proyecto (ver *Instalación* en el [README](../README.md)), rompe el test como en el
paso 1 y ejecuta:

En Mac, Linux o Git Bash:

```bash
CI=1 npx playwright test tc-008 --project=firefox
node scripts/reporte/generar-reportes.js
```

En PowerShell (Windows):

```powershell
$env:CI=1; npx.cmd playwright test tc-008 --project=firefox
node scripts/reporte/generar-reportes.js
```

El borrador queda en `test-results/bugs/`.
