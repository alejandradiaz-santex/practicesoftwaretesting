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
| **TC-006** | Ordenar por precio muestra el orden correcto | UI + API Check (petición de `/products`) | Playwright + TS | `tests/QATES/tc-006-ordenar-por-precio.spec.ts` | ✅ Automatizado (QATES) |
| **TC-007** | Login con credenciales inválidas es rechazado | UI + API Check (login, Negativo) | Playwright + TS | `tests/QATES/tc-007-login-invalido.spec.ts` | ✅ Automatizado (QATES) |
| **TC-008** | Tarjeta, ficha y API muestran el mismo nombre y precio | UI + API Check (`/products/{id}`) | Playwright + TS | `tests/QATES/tc-008-tarjeta-ficha-api.spec.ts` | ✅ Automatizado (QATES) |
| **TC-009** | Formulario de contacto: validación y envío válido | UI + API Check (`POST /messages`) | Playwright + TS | `tests/QATES/tc-009-formulario-contacto.spec.ts` | ✅ Automatizado (QATES) |

Los tests TC-001 a TC-005 están en `tests/Critical Cases/` y los generados por QATES (TC-006 a TC-009) en `tests/QATES/`; el plan detallado de TC-001 a TC-005 está en `specs/checkout.md`.

---

## 📝 Detalle de los Casos Críticos

### TC-001: Compra Exitosa como Guest
- **Descripción:** Validar que un usuario guest pueda realizar la compra exitosa de un producto del carrito.
- **Precondiciones:** sin sesión iniciada y producto con stock.
- **Datos:** datos de contacto y dirección válidos del guest, "Bolt Cutters" (48,41 USD).
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
- **Datos:** "Bolt Cutters" (48,41 USD). Cantidades de prueba: 1, 2, 0 y -1.
- **Pasos:**
  1. Agregar "Bolt Cutters" al carrito (cantidad 1).
  2. Abrir el carrito y verificar precio, subtotal y total.
  3. Subir la cantidad a 2.
  4. Bajar la cantidad a 1.
  5. Intentar ingresar cantidad 0 y luego -1.
  6. Recargar la página.
  7. Eliminar el producto del carrito.
- **Esperado:**
  - Paso 2: precio igual al del catálogo; subtotal y total 48,41.
  - Paso 3: subtotal y total 96,82.
  - Paso 4: subtotal y total 48,41.
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

### TC-006: Ordenar por precio muestra los productos en el orden correcto
- **Descripción:** validar que, al ordenar el catálogo por precio, los productos aparezcan de menor a mayor y de mayor a menor sin ningún precio fuera de lugar.
- **Precondiciones:** sin sesión iniciada y catálogo sin búsqueda ni filtros.
- **Datos:** ninguno que se escriba; se usan las opciones del selector de orden "Price (Low - High)" y "Price (High - Low)".
- **Pasos:**
  1. Abrir el sitio y leer los precios de las tarjetas de la página 1.
  2. Elegir "Price (Low - High)" en el selector de orden.
  3. Leer los precios de las tarjetas.
  4. Elegir "Price (High - Low)" y leer los precios otra vez.
- **Esperado:**
  - Paso 2: la petición a `/products` responde 200 y la URL no cambia.
  - Paso 3: los precios quedan de menor a mayor, sin ningún par fuera de orden.
  - Paso 4: los precios quedan de mayor a menor.
  - En ambos órdenes se muestra la misma cantidad de tarjetas, cada una con un precio en formato `$N.NN`. El orden se aplica en el servidor sobre todo el catálogo, así que la página 1 trae productos distintos en cada orden.

### TC-007: Login con credenciales inválidas es rechazado
- **Descripción:** validar que el inicio de sesión rechace un usuario inválido, sin iniciar sesión y sin revelar si falló el email o la contraseña.
- **Precondiciones:** sin sesión iniciada, en `/auth/login`.
- **Datos:** un email con formato válido que no esté registrado y una contraseña ficticia generada en cada ejecución. No se usa ninguna cuenta real.
- **Pasos:**
  1. Abrir `/auth/login`.
  2. Ingresar el email inexistente y la contraseña ficticia.
  3. Hacer clic en "Login".
  4. Verificar la pantalla y la respuesta del servidor.
- **Esperado:**
  - No se inicia sesión: la URL sigue en `/auth/login` y el menú sigue mostrando "Sign in".
  - La interfaz muestra el mensaje **"Invalid email or password"**, que no dice cuál de los dos datos falló.
  - La API de login responde 401 con el cuerpo `{"error":"Unauthorized"}` y no devuelve token.

### TC-008: Tarjeta, ficha y API muestran el mismo nombre y precio
- **Descripción:** validar que el nombre y el precio de un producto coincidan en la tarjeta del catálogo, en su ficha y en la API.
- **Precondiciones:** catálogo accesible, sin sesión, sin filtros ni búsqueda y con al menos una tarjeta visible.
- **Datos:** ninguno fijo; se usa la primera tarjeta que muestre el catálogo.
- **Pasos:**
  1. Abrir el sitio y leer el nombre y el precio de la primera tarjeta.
  2. Hacer clic en esa tarjeta y leer el nombre y el precio de la ficha.
  3. Tomar el identificador del producto de la dirección de la ficha (`/product/<id>`).
  4. Pedir `GET /products/<id>` a la API.
  5. Comparar las tres fuentes; el precio se compara como número, sin el `$`.
- **Esperado:** el nombre y el precio de la ficha son iguales a los de la tarjeta, y la API responde 200 con el mismo nombre y el mismo precio.

### TC-009: Formulario de contacto: validación y envío válido
- **Descripción:** validar que el formulario de contacto muestre sus campos y opciones, bloquee los envíos inválidos (campos vacíos, email mal formado, mensaje corto) sin llamar a la API, y envíe un mensaje válido una sola vez.
- **Precondiciones:** sin sesión iniciada (contexto nuevo), en `/contact`. El sitio es compartido: cada envío válido crea un mensaje, así que el test envía una sola vez por ejecución, siempre al final.
- **Datos:** ficticios: first-name `Prueba`, last-name `QA`, email `qa.prueba@example.com`, subject `Customer service` y, para el envío, un message de exactamente 50 caracteres. Borde del mensaje: 49 y 50 caracteres. Emails inválidos: `correo-sin-arroba` y `a b@example.com`. No se adjunta ningún archivo.
- **Pasos:**
  - **Parte A, estructura y validación (sin enviar):**
    1. Abrir `/contact` y verificar título, campos, etiquetas, botón Send y el texto de ayuda del adjunto.
    2. Leer las opciones de Subject.
    3. Verificar que el input de adjunto acepta solo `.txt` y no es múltiple (sin adjuntar nada).
    4. Pulsar Send con el formulario vacío.
    5. Rellenar los cinco campos obligatorios con datos válidos y salir del campo mensaje.
    6. Por cada campo obligatorio (first-name, last-name, email, subject, message): dejarlo vacío con los demás válidos y pulsar Send.
  - **Parte B, formato de email y longitud del mensaje (sin enviar):**
    1. Con los demás campos válidos, escribir `correo-sin-arroba` en email y pulsar Send.
    2. Repetir con `a b@example.com`.
    3. Escribir 49 caracteres en message, salir del campo y pulsar Send.
    4. Con los demás campos vacíos, escribir 50 caracteres en message, salir del campo y pulsar Send (borde válido sin consumir el envío).
  - **Parte C, envío válido:**
    1. Con todos los campos válidos y un mensaje de exactamente 50 caracteres, pulsar Send una sola vez y esperar la respuesta de `POST /messages`.
- **Esperado:**
  - **Parte A, paso 1:** título "Contact Us - Practice Software Testing - Toolshop - v5.0"; existen first-name, last-name, email, subject, message, attachment y el botón Send; etiquetas First name, Last name, Email address, Subject, "Message *" y Attachment; ayuda "Only files with the txt extension are allowed, and files must be 0kb."
  - **Paso 2:** opciones en orden: "Select a subject *" (valor vacío), Customer service, Webmaster, Return, Payments, Warranty, Status of my order.
  - **Paso 3:** `accept=".txt"` y sin atributo `multiple`.
  - **Paso 4:** no se envía ninguna petición a `/messages`; aparecen los cinco mensajes ("First name is required", "Last name is required", "Email is required", "Subject is required", "Message is required") y no hay mensaje de éxito.
  - **Paso 5:** los cinco mensajes desaparecen.
  - **Paso 6:** aparece solo el mensaje del campo vacío y no se envía ninguna petición a `/messages`.
  - **Parte B, pasos 1 y 2:** error de formato de email ("Email format is invalid", texto por confirmar) y ninguna petición a `/messages`.
  - **Paso 3:** error de longitud mínima ("Message must be minimal 50 characters", texto por confirmar) y ninguna petición a `/messages`.
  - **Paso 4:** `message-error` ausente, los otros cuatro errores visibles y ninguna petición a `/messages`.
  - **Parte C:** `POST /messages` responde 200; aparece "Thanks for your message! We will contact you shortly."; el formulario deja de mostrarse. Los 401 de `GET /users/me` se ignoran.
