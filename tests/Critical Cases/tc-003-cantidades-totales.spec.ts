// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Carrito: cantidades y totales', () => {
  test('TC-003: Cantidades y Totales dentro del Carrito', async ({ page }) => {
    //Busca input element que tiene el ARIA role de spinbutton (<input type="number">). Donde esta la cantidad de productos en quantity
    const quantity = page.getByRole('spinbutton', { name: /Quantity for Combination Pliers/ });

    // 1. Precondicion: sin sesion, carrito vacio
    await page.goto('https://practicesoftwaretesting.com');
    await expect(page.getByTestId('nav-cart')).toHaveCount(0);
    await expect(page.getByTestId('cart-quantity')).toHaveCount(0);

    // 2. Paso 1: abrir 'Combination Pliers' desde el catalogo y agregar al carrito
    await page.getByRole('link', { name: /Combination Pliers/ }).click();
    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(page.getByTestId('product-name')).toHaveText(/Combination Pliers/);
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByRole('alert').filter({ hasText: 'Product added to shopping cart.' })).toBeVisible();
    await expect(page.getByTestId('cart-quantity')).toHaveText('1');

    // 3. Paso 2: abrir el carrito
    await page.getByTestId('nav-cart').click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId('product-title')).toContainText('Combination Pliers');
    await expect(quantity).toHaveValue('1');
    await expect(page.getByTestId('product-price')).toHaveText('$14.15');
    await expect(page.getByTestId('line-price')).toHaveText('$14.15');
    await expect(page.getByTestId('cart-total')).toHaveText('$14.15');

    // 4. Paso 3: cantidad 2 
    await quantity.fill('2');
    await quantity.press('Tab'); //presiona Tab key
    await expect(page.getByRole('alert').filter({ hasText: 'Product quantity updated.' }).first()).toBeVisible();
    await expect(page.getByTestId('line-price')).toHaveText('$28.30');
    await expect(page.getByTestId('cart-total')).toHaveText('$28.30');
    await expect(page.getByTestId('cart-quantity')).toHaveText('2');

    // 5. Paso 4: volver a 1
    await quantity.fill('1');
    await quantity.press('Tab');
    await expect(page.getByTestId('line-price')).toHaveText('$14.15');
    await expect(page.getByTestId('cart-total')).toHaveText('$14.15');
    await expect(page.getByTestId('cart-quantity')).toHaveText('1');

    // 6. Paso 5a: cantidad 0 no se acepta (vuelve a 1)
    await quantity.fill('0');
    await quantity.press('Tab');
    await expect(quantity).toHaveValue('1');
    await expect(page.getByTestId('line-price')).toHaveText('$14.15');
    await expect(page.getByTestId('cart-total')).toHaveText('$14.15');
    await expect(page.getByTestId('product-title')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Product quantity updated.' }).first()).toBeVisible();

    // 7. Paso 5b: cantidad -1 no se acepta (vuelve a 1)
    await quantity.fill('-1');
    await quantity.press('Tab');
    await expect(quantity).toHaveValue('1');
    await expect(page.getByTestId('line-price')).toHaveText('$14.15');
    await expect(page.getByTestId('cart-total')).toHaveText('$14.15');
    await expect(page.getByTestId('product-title')).toBeVisible();

    // 8. Paso 6: cantidad 2 y recarga
    await quantity.fill('2');
    await quantity.press('Tab');
    await expect(page.getByTestId('cart-total')).toHaveText('$28.30');
    await page.reload();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId('product-title')).toContainText('Combination Pliers');
    await expect(quantity).toHaveValue('2');
    await expect(page.getByTestId('line-price')).toHaveText('$28.30');
    await expect(page.getByTestId('cart-total')).toHaveText('$28.30');
    await expect(page.getByTestId('cart-quantity')).toHaveText('2');

    // 9. Paso 7: eliminar el producto del carrito
    // TODO: el boton eliminar es un <a class="btn btn-danger"> sin href, sin nombre accesible y sin data-test:
    // no existe locator por rol/data-test (clic en la ultima celda de la fila no lo activa). No se usa CSS por regla del proyecto.
    // Pendiente: pedir data-test (p.ej. data-test="delete-item") o aria-label al equipo de desarrollo y completar:
    //   await page.getByRole('row', { name: /Combination Pliers/ }).getByRole('button', { name: /delete/i }).click();
    //   await expect(page.getByRole('alert').filter({ hasText: 'Product deleted.' })).toBeVisible();
    //   await expect(page.getByText('The cart is empty. Nothing to display.')).toBeVisible();
    //   await expect(page.getByTestId('proceed-1')).toHaveCount(0);
    //   await expect(page.getByTestId('nav-cart')).toHaveCount(0);
    //   await expect(page.getByTestId('cart-quantity')).toHaveCount(0);
  });
});
