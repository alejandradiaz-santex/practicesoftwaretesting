# Plan de prueba Toolshop: TC-001 a TC-005

## Application Overview

Plan para TC-001 "Compra Exitosa como Guest" en Toolshop (https://practicesoftwaretesting.com). Base: casos-automatizacion.md (ID, título, datos y orden de pasos). Refinado con exploración real hasta el paso Payment (sin confirmar). Selectores: el sitio usa el atributo `data-test` (NO data-testid), p.ej. page.locator('[data-test="add-to-cart"]'); si se usa getByTestId hay que configurar testIdAttribute='data-test'. Hallazgos: (1) Guest SÍ existe: pestaña "Continue as Guest" en el paso Sign in (campos Email address, First name, Last name; botón [data-test=guest-submit] "Continue as Guest"). (2) Billing Address: Country (select [data-test=country], valores ISO p.ej. AR), Postal code [data-test=postal_code], House number [data-test=house_number], Street [street], City [city], State [state]. Con Argentina + C1425 + 123, tras ~4 s se autocompletaron Street/City/State con datos ficticios aleatorios (ej. "Corine Cliff", "North Amiraland", "Ohio") y [data-test=proceed-3] quedó habilitado al primer intento; antes de completar estaba deshabilitado. Los valores autocompletados son aleatorios: no usarlos como esperados fijos. (3) Payment: [data-test=payment-method] con opciones bank-transfer, cash-on-delivery, credit-card, buy-now-pay-later, gift-card. Con cash-on-delivery NO aparece ningún campo adicional; el botón [data-test=finish] es de DOS FASES: deshabilitado hasta elegir método, texto "Check payment"; el primer clic muestra "Payment was successful" y cambia el botón a "Confirm"; el segundo clic crea la orden. (4) Carrito: product-title, product-price $14.15, line-price $14.15, cart-total $14.15, proceed-1 "Proceed to checkout", nav-cart muestra cantidad (cart-quantity). Al hacer clic en nav-cart se navega a /checkout (no existe /cart aparte). VERIFICADO con una compra guest de prueba (2026-10-20, orden INV-2026000004): toast de éxito "Product added to shopping cart."; tras guest-submit con datos válidos NO avanza a Billing, queda en Sign in con el texto "Continuing as guest: Ana Prueba (guest.qa@example.com)" y un botón [data-test=proceed-1] "Proceed to checkout"; POST /invoices/guest responde 201 con invoice_number (formato INV-AAAANNNNNN), total, user_id null y billing_*; mensaje final "Thanks for your order! Your invoice number is INV-2026000004." en app-payment > div.login-form-1 (sin data-test); tras la compra desaparece el enlace del carrito del navbar (no hay nav-cart ni cart-quantity en el DOM). ADVERTENCIA: en una sesión, add-to-cart de Combination Pliers falló con el toast de error "The selected product id is invalid." (el ID del producto cambia entre sesiones: llegar siempre al producto desde el catálogo, nunca por URL guardada). NO VERIFICADO: qué muestra /checkout al reabrirlo tras la compra; el texto del botón final tras elegir COD en una sesión nueva (se observó "Check payment").

## Test Scenarios

### 1. Checkout como Guest

**Seed:** `tests/seed.spec.ts`

#### 1.1. TC-001: Compra Exitosa como Guest

**File:** `tests/Critical Cases/tc-001-compra-guest.spec.ts`

**Steps:**
  1. Precondición: sesión no iniciada, carrito vacío (contexto nuevo). Paso 1: abrir https://practicesoftwaretesting.com sin iniciar sesión.
    - expect: Se muestra el catálogo; el menú muestra el enlace 'Sign in' ([data-test=nav-sign-in]) y no hay usuario logueado
  2. Paso 2: en el catálogo hacer clic en el producto 'Combination Pliers' (heading) y, en la ficha, verificar nombre ([data-test=product-name]) y precio ([data-test=unit-price]); clic en [data-test=add-to-cart] ('Add to cart') con cantidad 1.
    - expect: URL /product/<id> con título 'Combination Pliers'
    - expect: Precio mostrado 14.15 (USD $14.15)
    - expect: El contador del carrito ([data-test=cart-quantity]) pasa a 1
    - expect: Toast de éxito "Product added to shopping cart." (dentro de #toast-container, role=alert)
  3. Paso 3a: clic en el ícono del carrito [data-test=nav-cart].
    - expect: Navega a /checkout, paso 'Cart' con 'Combination Pliers' ([data-test=product-title]), product-price $14.15, line-price $14.15, cart-total $14.15, cantidad 1
  4. Paso 3b: clic en [data-test=proceed-1] ('Proceed to checkout').
    - expect: Se muestra el paso 'Sign in' con pestañas 'Sign in' (activa, formulario Login) y 'Continue as Guest'
  5. Paso 3c: clic en la pestaña 'Continue as Guest' (getByRole('tab', {name:'Continue as Guest'})).
    - expect: Aparece el formulario con Email address *, First name *, Last name * y botón [data-test=guest-submit] 'Continue as Guest'
  6. Paso 4a (datos de guest): completar [data-test=guest-email]='guest.qa@example.com', [data-test=guest-first-name]='Ana', [data-test=guest-last-name]='Prueba' y clic en [data-test=guest-submit].
    - expect: Permanece en el paso 'Sign in' y muestra "Continuing as guest: Ana Prueba (guest.qa@example.com)" sin errores de guest
    - expect: Aparece un botón [data-test=proceed-1] 'Proceed to checkout' (mismo data-test que en el paso Cart)
  7. Paso 4a-bis: clic en [data-test=proceed-1] ('Proceed to checkout') del paso Sign in.
    - expect: Se muestra el paso 'Billing Address'
  8. Paso 4b (dirección): en [data-test=country] seleccionar 'Argentina' (AR), completar [data-test=postal_code]='C1425' y [data-test=house_number]='123'; esperar ~4 s o hasta que [data-test=street] tenga valor (expect.toHaveValue(/.+/)).
    - expect: Texto de ayuda [data-test=postcode-lookup-hint]: 'Enter country, postal code and house number. We will fill in the rest automatically.'
    - expect: Street, City y State se autocompletan con valores ficticios aleatorios (no asertar valor exacto, solo no vacío)
    - expect: [data-test=proceed-3] pasa de deshabilitado a habilitado
    - expect: Plan B si no se autocompleta: escribir Street='Calle Falsa', City='Ciudad Test', State='Estado Test' a mano; si tras 2 intentos proceed-3 sigue deshabilitado, documentar como defecto/bloqueo
  9. Paso 4c: clic en [data-test=proceed-3] ('Proceed to checkout').
    - expect: Avanza al paso 'Payment' con el select 'Payment Method' y el botón [data-test=finish]
  10. Paso 5a: en [data-test=payment-method] seleccionar 'Cash on Delivery' (value cash-on-delivery).
    - expect: Botón [data-test=finish] habilitado con el texto 'Check payment'
  11. Paso 5b: preparar waitForResponse para POST **/invoices/guest; hacer clic en [data-test=finish] (1.er clic: aparece "Payment was successful" y el botón pasa a "Confirm"; no hay petición a /invoices/guest) y volver a hacer clic en [data-test=finish] (2.º clic: crea la orden).
    - expect: La API /invoices/guest responde 201 con invoice_number (formato INV-AAAANNNNNN; no asertar el valor exacto, cambia con cada orden)
    - expect: Tras el 1.er clic: "Payment was successful" dentro de app-payment
    - expect: Tras el 2.º clic: "Thanks for your order! Your invoice number is INV-…" en app-payment > div.login-form-1 (sin data-test; usar getByText con regex)
    - expect: El carrito queda vacío: desaparecen [data-test=nav-cart] y [data-test=cart-quantity] del navbar

### 2. Registro de cuenta

**Hallazgos (exploración de solo lectura del agente: no envió el formulario, no creó cuenta ni escribió contraseña; el registro lo hizo la usuaria a mano):**

HALLAZGOS VERIFICADOS (2026-10-20):
(1) Selectores: el sitio usa `data-test` (NO data-testid); con getByTestId hay que configurar testIdAttribute='data-test'. Campos: [data-test=first-name] (#first_name, placeholder "First name *"), [data-test=last-name] (#last_name, "Your last name *"), [data-test=dob] (#dob, input type text, placeholder "YYYY-MM-DD"; acepta tipear "1990-05-15"), [data-test=country] (select con 249 opciones, valores ISO, p.ej. AR; opción inicial "Your country *"), [data-test=postal_code] (#postal_code, "Your Postcode *"), [data-test=house_number] (#house_number, "e.g. 42 *"), [data-test=street] ("Your Street *"), [data-test=city] ("Your City *"), [data-test=state] ("Your State *"), [data-test=phone] (#phone, "Your phone *"), [data-test=email] (#email, type text, "Your email *"), [data-test=password] (#password, type password, "Your password"), botón [data-test=register-submit] ("Register", type submit, habilitado desde el inicio). Junto a la contraseña hay un botón sin data-test (btn-outline-secondary, ícono de ojo, type button) que probablemente alterna mostrar/ocultar (función NO probada). El input de contraseña está dentro del componente APP-PASSWORD-INPUT.
(2) Texto de ayuda de dirección [data-test=postcode-lookup-hint]: "Choose your country and enter the postal code and house number. Street, city and state will be filled in automatically." (distinto al texto de checkout).
(3) Autocompletado de dirección: al elegir Argentina (AR) y escribir C1425 + 123, el sitio llama GET api.practicesoftwaretesting.com/postcode-lookup?country=AR&postcode=C1425&house_number=123 (responde 200; se observó dos veces) y en ~1,1 s Street/City/State se completaron con datos ficticios ALEATORIOS (ej. "Corine Cliff", "North Amiraland", "Ohio"). Antes de completar estaban vacíos; después siguen editables (no readOnly). No usar esos valores como esperados fijos: asertar solo "no vacío".
(4) Reglas de contraseña (texto de ayuda visible bajo el campo, "Your password must:"): al menos 8 caracteres de largo; contener mayúsculas y minúsculas; incluir al menos un número; tener al menos un símbolo especial (ej. @, #, $, etc.). Coincide con el Datos de TC-002.
(5) Indicador de fortaleza: texto "Password strength:" seguido de 5 niveles etiquetados Weak, Moderate, Strong, Very Strong, Excellent. Su reacción al escribir NO se observó (no se escribió contraseña).
(6) Validaciones: tras enfocar y salir de todos los campos vacíos, los controles quedan con clases ng-invalid ng-touched, pero NO se observó ningún texto de error visible (se buscaron elementos .invalid-feedback/.alert/[data-test*=error] y hojas de texto con "required/invalid/format"; vacío). Lo mismo con email "correo-sin-arroba" (queda ng-invalid, sin texto), con fecha "abc" y con First name vacío. Es posible que los mensajes aparezcan solo tras intentar enviar (no probado: prohibido). Un email con formato válido (qa.registro@example.com) pasó a ng-valid; durante ~1,5 s tras rellenarlo se vio ng-invalid un instante, así que conviene esperar/asertar sobre el estado en vez de inmediato. No se observó petición de verificación de unicidad de email al escribirlo.
(7) Red: en la carga hay GET /users/me => 401 (esperado, sin sesión). La consola mostró 3 errores en la carga (no analizados; probablemente esos 401).

**Seed:** `tests/seed.spec.ts`

#### 2.1. TC-002: Registro de Cuenta exitoso

**File:** `tests/Critical Cases/tc-002-registro-exitoso.spec.ts`

**Steps:**
  1. Precondición: sin sesión iniciada; email no registrado (generar uno único y ficticio, ej. qa.registro+<timestamp>@example.com; la contraseña debe venir de variable de entorno/fixture del proyecto, nunca hardcodeada en el plan). Paso 1: abrir https://practicesoftwaretesting.com/auth/register.
    - expect: Se muestra el formulario de registro con los campos first-name, last-name, dob, country, postal_code, house_number, street, city, state, phone, email, password y el botón [data-test=register-submit] 'Register'
    - expect: Se muestra el texto de ayuda [data-test=postcode-lookup-hint] y las reglas de contraseña
  2. Paso 2: completar [data-test=first-name]='Ana', [data-test=last-name]='Prueba' y [data-test=dob]='1990-05-15'.
    - expect: Los tres campos conservan el valor ingresado (toHaveValue) sin mensajes de error
  3. Paso 3a: en [data-test=country] seleccionar Argentina (value AR); completar [data-test=postal_code]='C1425' y [data-test=house_number]='123'; esperar a que [data-test=street] tenga valor (expect.toHaveValue(/.+/), timeout ~8 s).
    - expect: Street, City y State se autocompletan solos (observado en ~1 s) con valores ficticios aleatorios; asertar solo que no estén vacíos
    - expect: Se dispara GET /postcode-lookup?country=AR&postcode=C1425&house_number=123 con 200
    - expect: Plan B si no se autocompleta: escribir Street='Calle Falsa', City='Ciudad Test', State='Estado Test' a mano; documentar como defecto si ocurre
  4. Paso 4: completar [data-test=phone]='1155550123' y [data-test=email]=<email único ficticio>.
    - expect: Ambos campos con su valor; el campo email pasa a estado válido (sin ng-invalid)
  5. Paso 5: ingresar en [data-test=password] una contraseña válida (mín. 8 caracteres, mayúsculas y minúsculas, un número y un símbolo) tomada de variable de entorno.
    - expect: (NO VERIFICADO) el indicador 'Password strength' refleja un nivel alto (p.ej. Strong/Very Strong/Excellent) y la lista de reglas se considera cumplida; no se observó comportamiento real
  6. Paso 6: preparar waitForResponse para POST **/users/register y hacer clic en [data-test=register-submit] ('Register').
    - expect: La API POST /users/register responde 201 (verificado en un registro manual; el cuerpo de la respuesta no se pudo leer)
    - expect: El sitio redirige a https://practicesoftwaretesting.com/auth/login (verificado); en esa página no hay mensajes de error visibles
    - expect: No se muestra ningún mensaje de éxito (verificado): el sitio solo redirige a la pantalla de login

**NO VERIFICADO (TC-002):**

- API POST /users/register: cuerpo de la respuesta (no se pudo leer) y si exige campos adicionales. Verificado en un registro manual (2026-10-20): responde 201 y el sitio redirige a /auth/login.
- Textos de error de validación por campo (required, formato de email, formato de fecha, país no elegido, contraseña débil): no se mostró ninguno en blur; podrían aparecer solo al enviar.
- Comportamiento del indicador de fortaleza y de las reglas de contraseña al escribir (no se escribió contraseña); funcionamiento del botón de ojo.
- Validación server-side de las reglas de contraseña, de email duplicado y de edad mínima en fecha de nacimiento.
- Formato de teléfono aceptado/rechazado (se probó solo '1155550123' sin enviar).
- Autocompletado con otros países/códigos postales y comportamiento si se edita el código postal luego del autocompletado.
- Limpieza: el sitio es de práctica y no hay endpoint de borrado verificado; cada ejecución requiere email único (el email 'qa.registro@example.com' no se registró).

### 3. Carrito: cantidades y totales

**Hallazgos (exploración de solo lectura del agente hasta el paso Cart; no se confirmó ninguna compra):**

Hallazgos VERIFICADOS: (1) Carrito vacío al inicio: en /checkout no existe [data-test=nav-cart] ni [data-test=cart-quantity] en el navbar. (2) Llegada al producto: en el catálogo la tarjeta `.card` con texto 'Combination Pliers' (getByRole heading NO la encontró); la ficha /product/<id> tiene [data-test=add-to-cart] y cantidad por defecto 1; el toast es "Product added to shopping cart." (#toast-container) y cart-quantity pasa a 1. (3) El ID del producto CAMBIA incluso dentro de una misma sesión de trabajo (01M5DHTYWGDA99TPNYTC4G3PX2 funcionó, luego dio 422 y al volver al catálogo apareció 01M5DN8XQJS0P9YANH3GPC3YEV): nunca reutilizar URL/ID guardado. (4) Carrito (/checkout, paso Cart; no existe /cart aparte; nav-cart navega a /checkout): tabla con columnas Item, Quantity, Price, Total. Selectores: [data-test=product-title] ('Combination Pliers' con nbsp final), [data-test=product-quantity] (input type=number, min=1, max=99, sin botones +/-; label oculto "Quantity for Combination Pliers"), [data-test=product-price] "$14.15", [data-test=line-price] "$14.15", [data-test=cart-total] "$14.15" (formato "$" + punto decimal, 2 decimales), [data-test=continue-shopping], [data-test=proceed-1] "Proceed to checkout". El botón de eliminar es `<a class="btn btn-danger">` con ícono xmark SIN data-test (usar app-cart a.btn-danger). (5) Cambio de cantidad: con sesión válida, escribir 2 + Tab (o ArrowUp) dispara PUT /carts/{id}/product/quantity (200, cuerpo {product_id, quantity}) y toast "Product quantity updated."; line-price $28.30, cart-total $28.30 y cart-quantity 2. Volver a 1: $14.15 / $14.15 / 1. IMPORTANTE: el line-price se recalcula al instante en el cliente (input) pero cart-total y cart-quantity solo tras el evento change (blur/Tab/ArrowUp); con page.fill() sin blur el total sigue en $14.15 durante un instante. Asertar con expect(...).toHaveText (auto-retry) tras Tab. (6) Cantidad 0 y -1 (COMPORTAMIENTO REAL): al escribir 0, mientras el input conserva foco, line-price muestra transitoriamente "$0.00" y con -1 "$-14.15"; al salir del campo (Tab; también Enter en -1) el valor se REEMPLAZA por 1, line-price vuelve a $14.15, cart-total $14.15, el ítem NO se elimina, no hay mensaje de error ni clase ng-invalid; el cliente envía PUT con quantity=1 (200) y aparece el toast "Product quantity updated." (no un mensaje de rechazo). ArrowDown desde 1 no baja de 1 (min=1). (7) Recarga: con cantidad 2 el carrito persiste (mismo producto, cantidad 2, $28.30, cart-quantity 2). (8) Eliminar: clic en a.btn-danger => toast "Product deleted."; el área app-cart queda con un único <p> "The cart is empty. Nothing to display."; no hay tabla ni [data-test=proceed-1]; desaparecen [data-test=nav-cart] y [data-test=cart-quantity] del navbar. ADVERTENCIA: en el primer intento, tras agregar al carrito, el PUT de cantidad respondió 422 con toast "The selected product id is invalid." (cart-total no se actualizó y 0/-1 + Tab devolvieron 1); también POST /carts/{id} dio 422 en dos reintentos con la misma URL; se resolvió volviendo al catálogo (nuevo ID). Es el problema conocido de IDs que cambian: reintentar desde el catálogo con contexto limpio (máx. 2 intentos).

**Seed:** `tests/seed.spec.ts`

#### 3.1. TC-003: Cantidades y Totales dentro del Carrito

**File:** `tests/Critical Cases/tc-003-cantidades-totales.spec.ts`

**Steps:**
  1. Precondición: sin sesión, carrito vacío (contexto nuevo). Verificar el estado inicial abriendo el sitio.
    - expect: No existe [data-test=nav-cart] ni [data-test=cart-quantity] en el navbar
  2. Paso 1: en el catálogo hacer clic en la tarjeta 'Combination Pliers' (locator('.card', {hasText:'Combination Pliers'}).first()) y, en la ficha, clic en [data-test=add-to-cart] con cantidad 1. Nunca navegar por URL guardada.
    - expect: URL /product/<id> con título 'Combination Pliers'
    - expect: Toast "Product added to shopping cart."
    - expect: [data-test=cart-quantity] muestra 1
    - expect: Plan B si aparece "The selected product id is invalid." (o POST /carts/{id} 422): volver al catálogo en contexto nuevo y reintentar (máx. 2); documentar como advertencia
  3. Paso 2: clic en [data-test=nav-cart] y abrir el paso Cart.
    - expect: URL /checkout; [data-test=product-title] 'Combination Pliers'
    - expect: [data-test=product-quantity] con valor 1
    - expect: [data-test=product-price] '$14.15' (igual al precio de la ficha)
    - expect: [data-test=line-price] '$14.15' y [data-test=cart-total] '$14.15'
  4. Paso 3: en [data-test=product-quantity] escribir 2 y salir del campo (press Tab); alternativa: ArrowUp.
    - expect: Toast "Product quantity updated."
    - expect: [data-test=line-price] '$28.30' y [data-test=cart-total] '$28.30'
    - expect: [data-test=cart-quantity] muestra 2
    - expect: (aserción con auto-retry: el total se actualiza después del evento change)
  5. Paso 4: escribir 1 y Tab.
    - expect: [data-test=line-price] '$14.15', [data-test=cart-total] '$14.15', [data-test=cart-quantity] 1
  6. Paso 5a: escribir 0 y Tab.
    - expect: El valor 0 NO se acepta: el input vuelve a 1 (toHaveValue('1')); line-price y cart-total '$14.15'; el ítem sigue en el carrito
    - expect: No se muestra mensaje de error; sí el toast "Product quantity updated." (el cliente envía quantity=1)
    - expect: No asertar el estado transitorio "$0.00" del line-price antes del blur
  7. Paso 5b: escribir -1 y Tab.
    - expect: El valor -1 NO se acepta: el input vuelve a 1; line-price y cart-total '$14.15'; ítem presente; sin mensaje de error
    - expect: No asertar el estado transitorio "$-14.15" antes del blur
  8. Paso 6: dejar la cantidad en 2 (escribir 2 + Tab, esperar $28.30) y recargar la página (page.reload()).
    - expect: Sigue en /checkout con 'Combination Pliers', cantidad 2, line-price y cart-total '$28.30', cart-quantity 2
  9. Paso 7: clic en app-cart a.btn-danger (botón eliminar sin data-test).
    - expect: Toast "Product deleted."
    - expect: app-cart muestra el texto "The cart is empty. Nothing to display." sin tabla ni [data-test=proceed-1]
    - expect: Desaparecen [data-test=nav-cart] y [data-test=cart-quantity] del navbar

**NO VERIFICADO (TC-003):**

- Cantidades mayores a max=99 (p.ej. 100) o decimales (1.5) y texto no numérico; solo se probó 0 y -1.
- Cantidad vacía (borrar el input) y comportamiento con valores pegados.
- Qué hace el cliente exactamente con 0/-1 a nivel API si se llama directo al backend (solo se vio que el cliente envía quantity=1); validación server-side no probada.
- Si el valor se restablece a 1 o al valor anterior: de 1 se probó solo desde 1; con cantidad previa 2 y luego 0 no se observó (podría volver a 1 o al 2 previo).
- Texto exacto de un mensaje de rechazo: no existe ninguno observado.
- Persistencia tras cerrar y reabrir el navegador (solo reload en la misma pestaña).
- Comportamiento del botón Continue Shopping y del paso siguiente (proceed-1): no se usó.
- Causa del 422 "The selected product id is invalid.": se supone reinicio/reseed de la BD del sitio; no confirmado.
- Cantidad 2 con el navbar y cart-quantity en otras vistas distintas a /checkout y la ficha.

### 4. Búsqueda y filtros

**Hallazgos (exploración de solo lectura, 2026-10-20; sin carrito, compra ni cuentas):**

HALLAZGOS VERIFICADOS: (1) Selectores `data-test` (NO data-testid): campo [data-test=search-query] (placeholder "Search"), botón [data-test=search-submit] ("Search"), botón [data-test=search-reset] ("X"). La búsqueda NO cambia la URL: se queda en https://practicesoftwaretesting.com/ (SPA, sin parámetros). (2) Buscar "hammer" devuelve 6 productos: Claw Hammer with Shock Reduction Grip, Hammer, Claw Hammer, Thor Hammer, Claw Hammer with Fiberglass Handle, Court Hammer (todos con "Hammer" en el nombre). Encabezado [data-test=search-caption]: "Searched for: hammer". Nombres en [data-test=product-name] (con espacios alrededor: usar trim/regex); tarjetas `a.card` con data-test dinámico `product-<ULID>`. Petición: QUERY https://api.practicesoftwaretesting.com/products/search con cuerpo {"q":"hammer"} (método HTTP QUERY, no GET; los parámetros van en el cuerpo). NOTA: "Sledgehammer" (categoría Hammer) NO aparece en la búsqueda "hammer": la búsqueda no es substring puro (comportamiento a documentar, posible defecto). (3) Búsqueda "xyzzy": 0 tarjetas, caption "Searched for: xyzzy" y mensaje EXACTO "There are no products found." en [data-test=no-results]. (4) Case-insensitive: "HAMMER" devuelve 6 resultados y caption "Searched for: HAMMER" (el caption conserva el texto tal cual se escribió). (5) Limpiar: clic en [data-test=search-reset] vacía el input, quita el caption y recarga el catálogo completo (9 tarjetas en la página 1, petición QUERY /products). (6) Categorías: panel lateral "By category:" con checkboxes [data-test=category-<ULID>] (value = ULID; los ULID pueden variar entre entornos: localizar por etiqueta, p.ej. page.getByLabel('Hammer', {exact:true})). Hand Tools es un checkbox padre con hijos Hammer, Hand Saw, Wrench, Screwdriver, Pliers, Chisels, Measures. Marcar solo "Hammer" NO marca "Hand Tools". Hay además categorías basura de datos de prueba de otra API (test-category-..., another-...). (7) Filtrar Hammer: la URL NO cambia (sigue "/"); lista 7 productos: Claw Hammer with Shock Reduction Grip, Hammer, Claw Hammer, Thor Hammer, Sledgehammer, Claw Hammer with Fiberglass Handle, Court Hammer; sin paginación; sin caption. Petición: QUERY /products con cuerpo {"page":"0","between":"price,1,100","by_category":"<ULID de Hammer>","is_rental":"false"}; al desmarcar vuelve sin by_category. Verificación de pertenencia: el filtro viaja como by_category en la API y los nombres son todos martillos. (8) Interacción búsqueda/filtro: con Hammer marcado, buscar "hammer" DESMARCA el filtro (la búsqueda ignora la categoría: 6 resultados, sin Sledgehammer); al resetear la búsqueda el filtro sigue desmarcado y vuelve el catálogo completo (9 tarjetas). Por eso en el paso 3 limpiar la búsqueda primero y luego marcar la categoría.

**Seed:** `tests/seed.spec.ts`

#### 4.1. TC-004: Búsqueda por Producto o filtrando por Categoría

**File:** `tests/Critical Cases/tc-004-busqueda-filtros.spec.ts`

**Steps:**
  1. Precondición: contexto nuevo, catálogo en https://practicesoftwaretesting.com sin búsqueda ni filtros (sin caption, ningún checkbox marcado).
    - expect: Se muestran tarjetas de producto (`a.card`) y existen [data-test=search-query] y [data-test=search-submit]
  2. Paso 1: escribir "hammer" en [data-test=search-query] (fill) y clic en [data-test=search-submit]; esperar la respuesta de POST/QUERY **/products/search.
    - expect: La URL no cambia (https://practicesoftwaretesting.com/)
    - expect: [data-test=search-caption] muestra "Searched for: hammer"
    - expect: Se listan 6 tarjetas (no asertar el número exacto si se quiere robustez: asertar >= 1)
    - expect: Cada [data-test=product-name] contiene "hammer" (regex /hammer/i)
    - expect: La petición a /products/search lleva el cuerpo {"q":"hammer"}
  3. Paso 2: escribir "xyzzy" en [data-test=search-query] y clic en [data-test=search-submit].
    - expect: [data-test=search-caption] muestra "Searched for: xyzzy"
    - expect: [data-test=no-results] visible con el texto exacto "There are no products found."
    - expect: 0 tarjetas `a.card`
  4. Paso 3a: clic en [data-test=search-reset].
    - expect: [data-test=search-query] queda vacío y desaparece [data-test=search-caption]
    - expect: Vuelve el catálogo completo (9 tarjetas en la página 1) y [data-test=no-results] deja de mostrarse
  5. Paso 3b: marcar el checkbox "Hammer" del panel "By category:" (page.getByLabel('Hammer', {exact:true}).check()); esperar la respuesta de /products.
    - expect: El checkbox "Hammer" queda marcado (checkbox "Hand Tools" no se marca solo)
    - expect: La petición a /products lleva by_category = value del checkbox Hammer
    - expect: Se listan 7 productos, todos martillos: Claw Hammer with Shock Reduction Grip, Hammer, Claw Hammer, Thor Hammer, Sledgehammer, Claw Hammer with Fiberglass Handle, Court Hammer
    - expect: Cada nombre contiene /hammer/i (incluido Sledgehammer); la URL no cambia

**Hallazgos adicionales para el implementador:**
- La búsqueda "hammer" no incluye Sledgehammer pero el filtro Hammer sí: asertar por separado, no esperar que coincidan los conjuntos.
- Buscar con un filtro de categoría activo desmarca el filtro.

**NO VERIFICADO (TC-004):**

- Si el filtro padre "Hand Tools" lista los productos de todos sus hijos (solo se probó el hijo "Hammer").
- Comportamiento con espacios en blanco, caracteres especiales o búsqueda vacía.
- Si el orden de los productos es estable entre ejecuciones y si el catálogo completo siempre muestra 9 en la página 1 (hay paginación en el catálogo completo, no explorada).
- Pertenencia de cada producto a la categoría comprobada solo por nombre y por el cuerpo by_category de la petición, no abriendo cada ficha.
- Ruta del menú "Categories" del navbar ([data-test=nav-categories]): no se abrió.
- Equivalencia exacta de la URL: no se observó ningún parámetro en la URL en ningún paso.
- 3 errores de consola al cargar (no analizados; probablemente 401 de /users/me).

### 5. Checkout con datos inválidos

**Hallazgos (exploración de solo lectura del agente, flujo guest; sin datos financieros ni confirmación de orden):**

HALLAZGOS VERIFICADOS (2026-10-20, flujo guest, sin escribir datos financieros, sin confirmar ninguna orden):
(1) Selectores `data-test` (NO data-testid). En el paso Sign in, tras guest-submit, el botón visible para avanzar es [data-test=proceed-2-guest] ("Proceed to checkout"); [data-test=proceed-1] existe también en el DOM pero oculto (del paso Cart), por eso un click sobre proceed-1 falla por "element is not visible". Usar proceed-2-guest para pasar a Billing Address.
(2) Billing con campos obligatorios vacíos: [data-test=proceed-3] está DESHABILITADO desde el inicio y sigue deshabilitado tras enfocar y salir (blur) de todos los campos. NO aparece ningún texto de error por campo (no hay .invalid-feedback, .alert ni [data-test*=error] en app-address): solo clases `ng-invalid ng-touched` en country, postal_code, house_number, street y city (state queda ng-untouched). Un clic forzado sobre proceed-3 no hace nada (sigue en /checkout, sin mensajes). Placeholders: postal_code "Your Postcode *", house_number "e.g. 42 *", street "Your Street *", city "Your City *", state "State *"; select country con opción inicial "Your country *". Texto de ayuda [data-test=postcode-lookup-hint]: "Enter country, postal code and house number. We will fill in the rest automatically."
(3) Código postal inválido: con country=AR, postal_code=ZZZZ y house_number=123 el sitio llama GET api.practicesoftwaretesting.com/postcode-lookup?country=AR&postcode=ZZZZ&house_number=123 (200, dos veces) y AUTOCOMPLETA igual Street/City/State con datos aleatorios (ej. "Berge Locks", "Hesselfurt", "South Dakota"); no hay mensaje de error, todos los campos quedan ng-valid y proceed-3 queda HABILITADO. Es decir, el sitio NO valida el formato del código postal (comportamiento/posible defecto: el requisito "código postal inválido bloquea" no se cumple en el cliente). Los campos autocompletados son editables: se sobrescribieron con Street='Calle Falsa', City='Ciudad Test', State='Estado Test' y proceed-3 permitió avanzar a Payment.
(4) Payment: [data-test=payment-method] (opciones: Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card; opción inicial "Choose your payment method"); con ninguna opción elegida [data-test=finish] ("Check payment") está deshabilitado.
(5) credit-card: campos [data-test=credit_card_number] (placeholder "Credit Card Number"; ayuda: "Enter your 16-digit credit card number as it appears on the card, in the format 0000-0000-0000-0000. Ensure that you include the hyphens for proper formatting."), [data-test=expiration_date] (placeholder "Expiration Date"), [data-test=cvv] (placeholder "CVV"; ayuda: "The CVV is a 3-digit or 4-digit number. It's used for added security during card-not-present transactions."), [data-test=card_holder_name] (placeholder "Card Holder Name"). Todos type text. Con los cuatro vacíos el formulario está ng-valid (sin required del lado cliente) y [data-test=finish] está HABILITADO. Clic en finish con todo vacío: se envía POST api.practicesoftwaretesting.com/payment/check y el sitio muestra "Unknown error" en `div.alert.alert-danger` y en [data-test=payment-error-message] (div.help-block). No hay mensajes por campo (los campos siguen ng-valid/ng-untouched). El botón sigue "Check payment" (no aparece "Payment was successful" ni "Confirm"); NO se creó ninguna orden (única petición no-GET: /payment/check).
(6) bank-transfer: campos [data-test=bank_name] ("Bank Name"), [data-test=account_name] ("Account Name"), [data-test=account_number] ("Account Number"; ayuda: "Please enter your bank account number as it appears on your bank statement. It's a unique series of numbers used to identify your individual account. Avoid including any spaces or hyphens."). Con todo vacío los tres inputs están `ng-invalid` y [data-test=finish] queda DESHABILITADO: no se puede hacer clic (el clic expira por "element is not enabled"); no hay mensajes de error por campo. Observación: el "Unknown error" del intento anterior con credit-card sigue visible al cambiar a bank-transfer (error residual que no se limpia al cambiar de método; verificado por texto de app-payment).
(7) Diferencia clave: credit-card no bloquea en cliente (error genérico del backend) y bank-transfer sí bloquea en cliente (botón deshabilitado, sin texto).

**Seed:** `tests/seed.spec.ts`

#### 5.1. TC-005: Checkout con datos inválidos

**File:** `tests/Critical Cases/tc-005-checkout-invalido.spec.ts`

**Steps:**
  1. Precondición: contexto nuevo, sin sesión, carrito vacío. En el catálogo (https://practicesoftwaretesting.com) abrir la tarjeta 'Combination Pliers' (locator('.card', {hasText:'Combination Pliers'}).first(); nunca por URL guardada), clic en [data-test=add-to-cart], clic en [data-test=nav-cart], clic en [data-test=proceed-1].
    - expect: Toast "Product added to shopping cart."
    - expect: Paso Sign in con pestañas 'Sign in' y 'Continue as Guest'
    - expect: Plan B si aparece "The selected product id is invalid.": volver al catálogo en contexto nuevo y reintentar (máx. 2)
  2. Clic en la pestaña 'Continue as Guest', completar [data-test=guest-email]='guest.qa@example.com', [data-test=guest-first-name]='Ana', [data-test=guest-last-name]='Prueba', clic en [data-test=guest-submit], luego clic en el botón visible [data-test=proceed-2-guest].
    - expect: Se muestra "Continuing as guest: Ana Prueba (guest.qa@example.com)" y luego el paso 'Billing Address'
  3. Paso 1 (campos obligatorios vacíos): no escribir nada; enfocar y salir (blur) de country, postal_code, house_number, street y city.
    - expect: [data-test=proceed-3] permanece deshabilitado (toBeDisabled)
    - expect: Los controles quedan con clase ng-invalid ng-touched
    - expect: (Hallazgo) NO existe texto de error por campo; asertar solo estado deshabilitado/clases, no mensajes
    - expect: El paso Billing Address sigue visible y la URL sigue en /checkout
  4. Paso 2 (código postal inválido): en [data-test=country] seleccionar Argentina (AR), completar [data-test=postal_code]='ZZZZ' y [data-test=house_number]='123'; esperar a la respuesta de GET **/postcode-lookup**.
    - expect: GET /postcode-lookup?country=AR&postcode=ZZZZ&house_number=123 responde 200
    - expect: Street, City y State se autocompletan con valores aleatorios (asertar solo no vacío)
    - expect: No hay mensaje de error de código postal
    - expect: [data-test=proceed-3] queda habilitado (hallazgo: el sitio no valida el formato del código postal; documentar como defecto en el reporte)
  5. Paso 2b: sobrescribir [data-test=street]='Calle Falsa', [data-test=city]='Ciudad Test', [data-test=state]='Estado Test' y clic en [data-test=proceed-3].
    - expect: Los tres campos conservan el valor ingresado
    - expect: Avanza al paso 'Payment' con [data-test=payment-method] y [data-test=finish] deshabilitado
  6. Paso 3 (credit-card, vacío): en [data-test=payment-method] seleccionar 'Credit Card' (credit-card); NO escribir en los campos; preparar waitForRequest a POST **/payment/check y clic en [data-test=finish] ('Check payment').
    - expect: Aparecen [data-test=credit_card_number], [data-test=expiration_date], [data-test=cvv] y [data-test=card_holder_name] con sus textos de ayuda
    - expect: [data-test=finish] habilitado con el texto 'Check payment'
    - expect: Se envía POST /payment/check; se muestra "Unknown error" en [data-test=payment-error-message] (div.alert.alert-danger)
    - expect: NO aparece "Payment was successful" ni el botón 'Confirm'; no hay petición a /invoices/guest ni se muestra "Thanks for your order"
    - expect: IMPORTANTE: no pulsar 'Confirm' ni un segundo clic en finish si el botón cambiara a 'Confirm'
  7. Paso 4 (bank-transfer, vacío): en [data-test=payment-method] seleccionar 'Bank Transfer'; no escribir en los campos.
    - expect: Aparecen [data-test=bank_name], [data-test=account_name] y [data-test=account_number] (con ayuda sobre el número de cuenta)
    - expect: Los tres inputs quedan ng-invalid y [data-test=finish] permanece deshabilitado (toBeDisabled); no hay mensajes por campo
    - expect: (Hallazgo) el 'Unknown error' de un intento previo con credit-card puede seguir visible al cambiar de método; no asertar su ausencia

**NO VERIFICADO (TC-005):**

- Textos de error por campo: no existen en Billing ni en Payment (solo estado ng-invalid y botón deshabilitado); podrían existir tras algún evento no probado (p.ej. submit con teclado).
- Si "Unknown error" con credit-card vacío es un defecto del backend (mensaje poco claro) o comportamiento esperado.
- Otros códigos postales inválidos (otros países, vacío con otros campos llenos) y validación server-side de dirección vía /invoices/guest.
- Métodos buy-now-pay-later y gift-card (campos y validaciones): no explorados.
- Comportamiento con sesión iniciada (el caso dice "usuario de prueba"; se exploró solo el flujo guest).
