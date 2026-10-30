# Flujos críticos de Toolshop

**Última revisión:** 2026-10-29
**Sitio:** https://practicesoftwaretesting.com

## Cómo se mide

```
flujos críticos con al menos un test que pasa / flujos críticos definidos × 100
```

- Un flujo está **cubierto** si un test que pasa lo ejercita. Un test **parcial** cuenta, pero queda anotado.
- Cualquier cambio en esta lista cambia la cifra sin que cambie la cobertura. Cada cambio se anota en el historial del final.

## Flujos críticos (15)

| # | Flujo | Estado | Test | Nota |
|---|---|---|---|---|
| 1 | Compra como invitado (checkout completo, contra reembolso) | Cubierto | TC-001 | Crea una factura real en cada corrida |
| 2 | Registro de usuario, camino feliz | Cubierto | TC-002 | Crea un usuario real en cada corrida |
| 3 | Carrito: cantidades y totales | Cubierto (parcial) | TC-003 | Falta el paso de eliminar (ver BUG-003) |
| 4 | Búsqueda y filtro por categoría | Cubierto | TC-004 | Solo la categoría Hammer |
| 5 | Checkout con datos inválidos | Cubierto | TC-005 | Documenta BUG-001 y BUG-002 |
| 6 | Orden del catálogo por precio | Cubierto | TC-006 | Solo la página 1 |
| 7 | Login con credenciales inválidas | Cubierto | TC-007 | Solo un caso negativo |
| 8 | Detalle de producto (tarjeta, ficha y API coherentes) | Cubierto | TC-008 | Un solo producto |
| 9 | Login exitoso, sesión y logout | Sin cobertura | — | |
| 10 | Compra con usuario registrado | Sin cobertura | — | |
| 11 | Pago válido con Buy Now Pay Later | Sin cobertura | — | Solo pide elegir 3, 6, 9 o 12 cuotas; sin datos de pago (verificado el 2026-10-27) |
| 12 | Eliminar un producto y carrito con varios productos | Sin cobertura | — | BUG-003: el botón no tiene `data-test` |
| 13 | Cuenta de usuario (perfil, historial, cambio y recuperación de contraseña) | Sin cobertura | — | |
| 14 | Registro negativo (email duplicado, contraseña débil) | Sin cobertura | — | |
| 15 | Formulario de contacto | Cubierto | TC-009 | Un envío real por ejecución (crea un mensaje en el sitio demo); 5 de 6 campos obligatorios, el adjunto es opcional |

## Fuera del cálculo

| Flujo | Motivo |
|---|---|
| Paginación del catálogo | Secundario |
| Rutas protegidas y roles | No aplica a este proyecto |
| Pago con tarjeta de crédito | Pide número, vencimiento, CVV y titular: datos de pago |
| Pago con transferencia bancaria | Pide banco, nombre y número de cuenta: datos de pago |
| Pago con gift card | Pide número de gift card y código de validación: datos de pago |

## Resultado

**9 de 15 flujos cubiertos (60%)**

## Historial de cambios de la lista

| Fecha | Cambio |
|---|---|
| 2026-10-27 | Lista inicial de 15 flujos. Paginación y rutas protegidas fuera del cálculo. Flujo 11 definido como Buy Now Pay Later; tarjeta, transferencia y gift card fuera del cálculo. Se añade el formulario de contacto (flujo 15) |
| 2026-10-29 | El flujo 15 (formulario de contacto) pasa a cubierto por TC-009 |
