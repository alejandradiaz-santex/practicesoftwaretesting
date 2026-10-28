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
2. Descarga **`reportes-ci`** (es un `.zip`) y ábrelo.
3. Dentro hay un archivo como `BUG-CI-1a2b3c4-TC-008-firefox.md`. Ábrelo con el Bloc de notas o cualquier
   editor de texto.

### 6. Limpia

1. Vuelve al PR y pulsa **Close pull request** (no pulses *Merge*).
2. Pulsa **Delete branch**.

## Cómo leer el borrador

El nombre dice: `BUG-CI-` + **commit** (qué versión del código falló) + **TC** (qué test) + **navegador**.
Ejemplo de un borrador real, resumido (los valores de *Ambiente* y *Origen* son un ejemplo de lo que
verías en CI):

```markdown
# BUG-CI-861d573-TC-008-firefox: TC-008: tarjeta, ficha y API muestran el mismo nombre y precio

## Datos generales
- **Severidad**: Media
- **Prioridad**: [FALTA DATO: la define el PO]
- **Ambiente**: CI (GitHub Actions) — https://practicesoftwaretesting.com
- **Navegador / dispositivo**: firefox (Playwright 1.64.1) en Linux
- **Ticket relacionado**: TC-008

## Qué pasó
Error: expect(locator).toHaveText(expected) failed
Expected: "texto que no existe"
Received: " Combination Pliers "

Es el error del primer fallo. Intentos de esta corrida:
1. failed: expect(locator).toHaveText(expected) failed (línea 24)
2. failed: expect(locator).toHaveText(expected) failed (línea 24)
3. failed: expect(locator).toHaveText(expected) failed (línea 24)

## Pasos para reproducir
1. `npx playwright test "tests/QATES/tc-008-tarjeta-ficha-api.spec.ts" --project=firefox`
**Resultado esperado**: [FALTA DATO: criterio de aceptación del caso]

## Datos de prueba
- **De dónde salen los datos**: Datos dentro del spec (commit 861d573)

## Origen
- **Cómo se encontró**: corrida automática de CI (PR 17, rama `mi-rama`, commit `861d573`)
- **Corrida**: https://github.com/<organización>/<repositorio>/actions/runs/<número>
- **Dónde falla**: `tests/QATES/tc-008-tarjeta-ficha-api.spec.ts:24`
- **Capa**: UI (deducida del error: falla una comprobación de la página)
- **Desde cuándo**: [FALTA DATO: última corrida verde conocida]

## Impacto
- **Qué flujo afecta**: 8 · Detalle de producto (tarjeta, ficha y API coherentes)
- **A quién afecta**: [FALTA DATO: usuarios afectados]
- **¿Funcionaba antes?**: [FALTA DATO: comparar con la última corrida verde]

## Evidencia
- `tests/QATES/tc-008-tarjeta-ficha-api.spec.ts:24`
```

| Sección | Qué dice | Quién la completa |
| :--- | :--- | :--- |
| Datos generales | Severidad, navegador y test afectado | **El sistema**. Solo la *Prioridad* la define el PO |
| Qué pasó | El mensaje de error real y cada intento | **El sistema** |
| Pasos para reproducir | Comando exacto para repetirlo | **El sistema**. El *resultado esperado* lo escribe una persona |
| Datos de prueba | De qué archivo salen los datos | **El sistema** |
| Origen | PR, rama, commit, enlace a la corrida, archivo y línea | **El sistema**. *Desde cuándo* lo completa una persona |
| Impacto | Flujo afectado | **El sistema**. *A quién afecta* y *workaround* los completa una persona |
| Evidencia | Línea del fallo y archivos de apoyo | **El sistema**. La traza y capturas están en el artefacto `playwright-report` |

## ¿Es un bug de verdad o un fallo del sitio?

El sitio de pruebas es compartido y a veces no carga, y entonces fallan tests que nadie tocó.

1. Abre la corrida y pulsa **Re-run failed jobs** (arriba a la derecha). Espera de nuevo.
2. Si ahora pasa: fue el sitio. No hay bug que reportar.
3. Si falla **igual y con el mismo mensaje**: trátalo como bug real.
4. Un test **omitido** no cuenta como fallo: Cloudflare, una protección del sitio, bloqueó la prueba. Ese
   test no se ejecutó, así que no te dice nada del sitio.

## Qué hacer con un borrador de bug real

1. Completa los `[FALTA DATO: ...]` que sepas. Los que no puedas, déjalos marcados.
2. **Crea el ticket a mano en el Jira de tu equipo** y pega las secciones del borrador (título, qué pasó,
   pasos, datos de prueba, origen, impacto y evidencia). Adjunta la traza del artefacto
   `playwright-report` si la necesitas.
3. Anota en el ticket el enlace a la corrida que aparece en *Origen*.

## Lanzar los tests sin abrir un PR

1. Entra en la pestaña **Actions** del repositorio.
2. En la columna izquierda elige **Playwright Tests**.
3. Pulsa **Run workflow**, elige la rama y confirma con el botón verde.

Sirve para repetir una corrida sobre una rama. El borrador solo se genera si algún test falla.

## Si algo sale distinto

- **No ves el artefacto `reportes-ci`:** solo aparece si hubo al menos un fallo, y dura 30 días.
- **No te deja descargar el artefacto:** hace falta haber iniciado sesión en GitHub con acceso al repo.
- **Falló algo que no tocaste:** ver *¿Es un bug de verdad o un fallo del sitio?*.
- **El botón de merge dice que falta una aprobación:** es normal; el repo exige que otra persona apruebe
  cada PR.
- **Aparecen muchos tests omitidos:** Cloudflare está bloqueando a GitHub. Avisa al equipo: el check verde
  cubre menos de lo que parece.

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
