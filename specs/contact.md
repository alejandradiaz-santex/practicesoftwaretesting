# Plan de prueba Toolshop: TC-009 Formulario de contacto

## Application Overview

Plan para TC-009 "Formulario de contacto" en Toolshop (https://practicesoftwaretesting.com/contact). Base: exploración del agente planner de Playwright (2026-10-29, solo lectura) y verificación posterior del QA el mismo día, con autorización del usuario: un clic en Send con el formulario vacío y un único envío válido con datos ficticios, ambos desde una sesión anónima limpia. Selectores: el sitio usa el atributo `data-test` (`testIdAttribute='data-test'`); los locators van por rol o `data-test`, nunca CSS ni XPath.

**Controles VERIFICADOS**
- `[data-test=first-name]` (input text, placeholder "Your first name \*"), `[data-test=last-name]` ("Your last name \*"), `[data-test=email]` (type=email, "Your email \*"), `[data-test=subject]` (select), `[data-test=message]` (textarea, sin placeholder), `[data-test=attachment]` (input file) y `[data-test=contact-submit]`.
- `contact-submit` es un `<input type="submit" value="Send">`, no un `<button>`; por rol es `getByRole('button', { name: 'Send' })`.
- Etiquetas: "First name", "Last name", "Email address", "Subject", "Message \*", "Attachment". Solo la etiqueta de Message lleva asterisco.
- Opciones de Subject (value | texto): "" | "Select a subject \*", `customer-service` | "Customer service", `webmaster` | "Webmaster", `return` | "Return", `payments` | "Payments", `warranty` | "Warranty", `status-of-order` | "Status of my order".
- Adjunto: `accept=".txt"`, no es múltiple. Ayuda (exacta): "Only files with the txt extension are allowed, and files must be 0kb." (por diseño solo admite archivos `.txt` de 0 KB).

**Validación (comportamiento del sitio)**
- El `<form>` lleva `novalidate`; ningún campo lleva `required`, `maxlength`, `aria-invalid` ni `aria-describedby`.
- Nombre, apellido y email son obligatorios **solo para visitantes anónimos**, y lo son **después** de que `GET /users/me` responde 401 (según el código del sitio); las aserciones deben esperar con reintento automático (~1,5 s). Subject y Message son obligatorios siempre.
- Message: **mínimo 50 caracteres** (49 → inválido, 50 → válido, 10000 → válido; sin `maxlength` ni contador). Se valida al salir del campo.
- Email: "correo-sin-arroba" y "a b@example.com" son inválidos; `a@b` se acepta (validador estándar de Angular).
- **Antes de pulsar Send** no aparece ningún texto de error: los campos solo pasan a `ng-invalid ng-touched`. **Al pulsar Send con el formulario inválido** no se envía ninguna petición a `/messages` y aparecen cinco mensajes (con `data-test` `first-name-error`, `last-name-error`, `email-error`, `subject-error` y `message-error`): "First name is required", "Last name is required", "Email is required", "Subject is required" y "Message is required". Los campos se marcan `is-invalid`.
- Send está habilitado aunque el formulario sea inválido (diseño: el envío se bloquea en el código).

**Envío (VERIFICADO una vez, 2026-10-29)**
- Con datos válidos: `POST https://api.practicesoftwaretesting.com/messages` → **200**, y la página sustituye el formulario por `Thanks for your message! We will contact you shortly.` (en un elemento `alert alert-success`).
- Cada envío real **crea un mensaje** en el sitio demo: el test debe enviar una sola vez por ejecución.
- `GET /users/me` responde 401 tres veces al cargar `/contact` (visitante sin sesión) y el sitio lo registra en consola: es ruido esperado y **no** debe hacer fallar un test. Es también el origen de un `{"message":"Unauthorized"}` que un usuario creyó ver en el envío.

**Límite del servidor (VERIFICADO una vez, 2026-10-29, con autorización del usuario)**: la validación del servidor (`StoreContact`) admite un mensaje de **250 caracteres como máximo**, y el formulario no lo advierte (sin `maxlength` ni contador, y 251 caracteres pasan la validación de la pantalla). Un `POST /messages` con 251 caracteres devolvió 422 con `{"message":["The message field must not be greater than 250 characters."]}`; no se creó ningún mensaje, y la pantalla mostró ese texto en un `alert alert-danger`. El formato de este 422 (`message` como lista) no es el de `/payment/check` (`message` en texto más `errors`). Los otros máximos del servidor, según el código del sitio: nombre 120, asunto 120 y email 256.

**Subject (VERIFICADO al automatizar, 2026-10-29)**: la opción vacía "Select a subject *" está **deshabilitada**: una vez elegida otra opción no se puede volver a ella. Para probar "Subject vacío" el test recarga `/contact` y deja Subject sin tocar.

**Observaciones de accesibilidad y UX (no son requisitos del test)**: sin `aria-invalid` ni `aria-describedby`; la página no tiene h1 ni h2 (tiene un h3); `a@b` se acepta como email; mensaje, nombre y apellido formados solo por espacios se aceptan en la pantalla.

Título de página: "Contact Us - Practice Software Testing - Toolshop - v5.0". Pie de página: "v2.5 | Built 2026-10-11 | Angular 20.0.5".

## Test Scenarios

### 1. Formulario de contacto

**Seed:** `tests/seed.spec.ts`

Un único test, TC-009, en `tests/QATES/tc-009-formulario-contacto.spec.ts` (etiqueta `@qates`), con las tres partes siguientes en orden.

#### 1.1. TC-009 (parte A): Estructura, opciones y validación del formulario (sin enviar)

**Steps:**
  1. Precondición: contexto nuevo, sin sesión. Abrir https://practicesoftwaretesting.com/contact.
    - expect: El título es 'Contact Us - Practice Software Testing - Toolshop - v5.0'
    - expect: Existen first-name, last-name, email, subject, message, attachment y el botón Send (`getByRole('button', { name: 'Send' })`)
    - expect: Etiquetas visibles: First name, Last name, Email address, Subject, 'Message \*', Attachment
    - expect: Texto de ayuda 'Only files with the txt extension are allowed, and files must be 0kb.' visible
  2. Leer las opciones del select [data-test=subject].
    - expect: Opciones en orden: 'Select a subject \*' (value vacío), Customer service, Webmaster, Return, Payments, Warranty, 'Status of my order'
  3. Verificar el input de adjunto [data-test=attachment] sin adjuntar nada.
    - expect: Tiene `accept=".txt"` y no tiene el atributo `multiple`
  4. Con el formulario vacío: pulsar Send una vez (no se envía nada).
    - expect: No hay ninguna petición a /messages
    - expect: Aparecen los cinco mensajes: 'First name is required', 'Last name is required', 'Email is required', 'Subject is required' y 'Message is required' (data-test `*-error`)
    - expect: No hay mensaje de éxito
  5. Rellenar first-name='Prueba', last-name='QA', email='qa.prueba@example.com', subject='Customer service' y message con 50 caracteres, y salir del campo mensaje (blur).
    - expect: Los cinco mensajes de error desaparecen (esperar con reintento automático)
  6. Vaciar uno a uno cada campo obligatorio con los demás válidos (parametrizado: first-name, last-name, email, subject sin elegir (se recarga la página: la opción vacía está deshabilitada), message) y pulsar Send.
    - expect: Cada vez aparece solo el mensaje del campo vacío y no se envía ninguna petición a /messages

#### 1.2. TC-009 (parte B): Formato del email y longitud del mensaje (sin enviar)

**Steps:**
  1. Con los demás campos válidos, escribir en email 'correo-sin-arroba' y pulsar Send.
    - expect: Aparece 'Email format is invalid' (texto del archivo de textos del sitio, **por confirmar en vivo**) y no se envía nada
  2. Repetir con 'a b@example.com' (con espacio).
    - expect: Mismo comportamiento que el paso anterior
  3. Escribir en message 49 caracteres, salir del campo y pulsar Send.
    - expect: Aparece el error de longitud mínima (el texto del sitio es 'Message must be minimal 50 characters', **por confirmar en vivo**) y no se envía nada
  4. Con los demás campos vacíos, escribir en message exactamente 50 caracteres, salir del campo y pulsar Send (borde válido sin consumir el envío).
    - expect: `message-error` ausente, los otros cuatro errores visibles y ninguna petición a /messages
  5. Observaciones (no asertar como requisitos): `a@b` se acepta como email; un mensaje de 50 espacios o de 50 saltos de línea se acepta como válido; nombre y apellido formados solo por espacios se aceptan; `usuario@@example.com`, `@example.com`, `usuario@`, `usuario@example..com`, `ñandú@example.com` y un email de más de 250 caracteres se rechazan.

#### 1.3. TC-009 (parte C): Envío válido

**Steps:**
  1. Con todos los campos válidos y datos ficticios (first-name='Prueba', last-name='QA', email='qa.prueba@example.com', subject='Customer service', message de exactamente 50 caracteres), preparar `waitForResponse` a `POST` sobre `/messages` y pulsar Send **una sola vez**.
    - expect: La respuesta es 200
    - expect: Aparece 'Thanks for your message! We will contact you shortly.'
    - expect: El formulario deja de mostrarse (contact-submit ya no está en la página)
    - expect: Los 401 de `/users/me` se ignoran

## NO VERIFICADO

- Otros errores del servidor al enviar. Solo se verificó uno (2026-10-29): un mensaje de 251 caracteres responde `POST /messages` → 422 con `{"message":["The message field must not be greater than 250 characters."]}`, no crea ningún mensaje, y la pantalla muestra ese texto en un `alert alert-danger`.
- Si un mensaje de solo espacios, o un nombre o apellido de solo espacios, llega a enviarse y qué responde el servidor (en la pantalla se aceptan).
- El comportamiento al adjuntar un archivo `.txt` de 0 KB (el envío usaría además `POST /messages/{id}/attach-file`).
- Los textos exactos de los errores de formato de email y de longitud mínima (están en el archivo de textos del sitio, pero no se vieron en vivo).
- Si el mensaje enviado llega al buzón o al panel de administración (no hay acceso).
- Si el mensaje enviado llega al panel de administración o a un buzón (no hay acceso; ya consta arriba en el mismo sentido).
