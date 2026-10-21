# Casos críticos: Practice Software Testing - Toolshop

Este documento contiene el diseño de los casos de prueba críticos y el estado de su automatización.

## 📊 Matriz de Seguimiento Técnico

| ID | Caso de Prueba | Tipo de Test / Capa | Herramienta | Test | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-001** | Compra Exitosa como Guest | UI + API Check (`/invoices/guest`) | Playwright + TS | `tc-001-compra-guest.spec.ts` | ✅ Automatizado |
| **TC-002** | Registro de Cuenta exitoso | UI + API Check (`/users/register`) | Playwright + TS | `tc-002-registro-exitoso.spec.ts` | ✅ Automatizado |
| **TC-003** | Cantidades y Totales en Carrito | UI + API Check (PUT de cantidad); falta el paso de eliminar | Playwright + TS | `tc-003-cantidades-totales.spec.ts` | ✅ Automatizado (paso 7 pendiente) |
| **TC-004** | Búsqueda y Filtros | UI (Filtros dinámicos) | Playwright + TS | `tc-004-busqueda-filtros.spec.ts` | ✅ Automatizado |
| **TC-005** | Checkout con datos inválidos | UI + API Check (`/payment/check`, Negativo) | Playwright + TS | `tc-005-checkout-invalido.spec.ts` | ✅ Automatizado |

Los tests están en `tests/Critical Cases/` y el plan detallado en `specs/checkout.md`.

---

## 📝 Detalle de los Casos Críticos

### TC-001: Compra Exitosa como Guest
- **Descripción:** Validar que un usuario guest pueda realizar la compra exitosa de un producto del carrito.
- **Precondiciones:** sin sesión iniciada y producto con stock.
- **Datos:** datos de contacto y dirección válidos del guest, "Combination Pliers" (14,15 USD).
- **Pasos:**
  1. Abrir el sitio sin iniciar sesión.
  2. Abrir el producto desde el catálogo y agregarlo al carrito.
  3. Abrir el carrito y avanzar al checkout como guest.
  4. Completar los datos del guest y la dirección de facturación.
  5. Elegir método de pago (cash-on-delivery) y confirmar.
- **Esperado:** mensaje de pago exitoso, orden con número de factura, carrito vacío. API de facturas para guest (`/invoices/guest`) responde 201 con `invoice_number`.

### TC-002: Registro de Cuenta exitoso
- **Descripción:** Validar que un usuario nuevo pueda registrar su cuenta exitosamente con datos válidos.
- **Precondiciones:** sin sesión iniciada y email que no esté registrado.
- **Datos:** nombre y apellido, fecha de nacimiento válida, país, código postal y número de casa, teléfono, email único y contraseña que cumpla las reglas (mínimo 8 caracteres, mayúsculas y minúsculas, un número y un símbolo).
- **Pasos:**
  1. Abrir la página de registro (`/auth/register`).
  2. Completar First name, Last name y Date of Birth.
  3. Elegir el país e ingresar código postal y número de casa; verificar que calle, ciudad y estado se completen solos.
  4. Ingresar teléfono y email.
  5. Ingresar una contraseña válida.
  6. Hacer clic en Register.
- **Esperado:** el registro se completa sin errores y el sitio redirige a la pantalla de login.

### TC-003: Cantidades y Totales dentro del Carrito
- **Descripción:** validar el cálculo de subtotal y total, la edición de cantidades y la persistencia del carrito con un producto.
- **Precondiciones:** sin sesión iniciada y carrito vacío.
- **Datos:** "Combination Pliers" (14,15 USD). Cantidades de prueba: 1, 2, 0 y -1.
- **Pasos:**
  1. Agregar "Combination Pliers" al carrito (cantidad 1).
  2. Abrir el carrito y verificar precio, subtotal y total.
  3. Subir la cantidad a 2.
  4. Bajar la cantidad a 1.
  5. Intentar ingresar cantidad 0 y luego -1.
  6. Recargar la página.
  7. Eliminar el producto del carrito.
- **Esperado:**
  - Paso 2: precio igual al del catálogo; subtotal y total 14,15.
  - Paso 3: subtotal y total 28,30.
  - Paso 4: subtotal y total 14,15.
  - Paso 5: cantidades 0 y -1 no aceptadas.
  - Paso 6: el carrito se mantiene con el mismo contenido y total.
  - Paso 7: el carrito queda vacío.

### TC-004: Búsqueda por Producto o filtrando por Categoría
- **Descripción:** validar que el usuario encuentre productos buscando por nombre o filtrando por categoría.
- **Precondiciones:** catálogo disponible, sin filtros aplicados.
- **Datos:** búsquedas "hammer" y "xyzzy" (sin resultados); categoría Hand Tools > Hammer.
- **Pasos:**
  1. Buscar "hammer".
  2. Buscar un término inexistente ("xyzzy").
  3. Limpiar la búsqueda y filtrar por la categoría Hand Tools > Hammer.
- **Esperado:**
  - Paso 1: los resultados corresponden al término buscado.
  - Paso 2: se muestra un mensaje claro de que no hay resultados.
  - Paso 3: solo se listan productos de la categoría seleccionada.

### TC-005: Checkout con datos inválidos
- **Descripción:** validar que el checkout rechace datos de dirección o pago inválidos.
- **Precondiciones:** usuario guest (sin sesión iniciada) con un producto con stock en el carrito.
- **Datos:** dirección con campos vacíos, código postal inválido, métodos de pago credit-card y bank-transfer con campos vacíos.
- **Pasos:**
  1. En dirección, dejar campos obligatorios vacíos.
  2. Ingresar un código postal inválido.
  3. En el pago, elegir credit-card y dejar campos vacíos.
  4. Ahora elegir bank-transfer y dejar campos vacíos.
- **Esperado:** los campos obligatorios vacíos bloquean el avance; con un código postal inválido el sitio no muestra error y permite avanzar (posible defecto); credit-card con campos vacíos no confirma el pago: el servidor responde 422 con un error por campo, pero la interfaz solo muestra "Unknown error" (posible defecto), y no se crea orden; bank-transfer con campos vacíos deja el botón de pago deshabilitado.