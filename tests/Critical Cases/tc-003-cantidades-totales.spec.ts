// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { CatalogPage } from '../pages/catalog.page';
import { product, money } from '../data/product';
import { CheckoutPage } from '../pages/checkout.page';

test.describe('Carrito: cantidades y totales', () => {
  test('TC-003: Cantidades y Totales dentro del Carrito', async ({ page }) => {
    const updated = page.waitForResponse( 
      (r) => r.url().includes('/product/quantity') && r.request().method() === 'PUT'
    );
    const checkout = new CheckoutPage(page);
    const catalog = new CatalogPage(page);
    // Campo numerico (spinbutton) con la cantidad del producto en el carrito
    const quantity = checkout.quantityOf(product.name);
    const price = money(product.price); // precio con cantidad 1
    const priceForTwo = money(product.price * 2); // precio con cantidad 2

    // 1. Precondicion: sin sesion, carrito vacio
    await catalog.goto();
    await expect(checkout.navCart).toHaveCount(0);
    await expect(checkout.cartQuantity).toHaveCount(0);

    // 2. Paso 1: abrir el producto desde el catalogo y agregar al carrito
    await catalog.openProduct(product.name);
    await expect(catalog.productName).toContainText(product.name);
    await catalog.addToCart();
    await expect(checkout.cartQuantity).toHaveText('1', { timeout: 15000 });

    // 3. Paso 2: abrir el carrito
    await checkout.openCart();
    await expect(checkout.productTitle).toContainText(product.name);
    await expect(quantity).toHaveValue('1');
    await expect(checkout.productPrice).toHaveText(price);
    await expect(checkout.linePrice).toHaveText(price);
    await expect(checkout.cartTotal).toHaveText(price, { timeout: 15000 });

    // 4. Paso 3: cantidad 2 
    await checkout.setQuantity(product.name, '2');
    const resp = await updated;
    expect(resp.status()).toBe(200);
    expect(resp.request().postDataJSON()).toMatchObject({ quantity: 2 });//Payload
    await expect(page.getByRole('alert').filter({ hasText: 'Product quantity updated.' }).first()).toBeVisible();
    await expect(checkout.linePrice).toHaveText(priceForTwo);
    await expect(checkout.cartTotal).toHaveText(priceForTwo, { timeout: 15000 });
    await expect(checkout.cartQuantity).toHaveText('2', { timeout: 15000 });

    // 5. Paso 4: volver a 1
    await checkout.setQuantity(product.name, '1');
    await expect(checkout.linePrice).toHaveText(price);
    await expect(checkout.cartTotal).toHaveText(price, { timeout: 15000 });
    await expect(checkout.cartQuantity).toHaveText('1', { timeout: 15000 });

    // 6. Paso 5a: cantidad 0 no se acepta (vuelve a 1)
    await checkout.setQuantity(product.name, '0');
    await expect(quantity).toHaveValue('1');
    await expect(checkout.linePrice).toHaveText(price);
    await expect(checkout.cartTotal).toHaveText(price, { timeout: 15000 });
    await expect(checkout.productTitle).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'Product quantity updated.' }).first()).toBeVisible();

    // 7. Paso 5b: cantidad -1 no se acepta (vuelve a 1)
    await checkout.setQuantity(product.name, '-1');
    await expect(quantity).toHaveValue('1');
    await expect(checkout.linePrice).toHaveText(price);
    await expect(checkout.cartTotal).toHaveText(price, { timeout: 15000 });
    await expect(checkout.productTitle).toBeVisible();

    // 8. Paso 6: cantidad 2 y recarga
    // En webkit el change de este paso a veces se pierde tras el reemplazo de -1 por 1: se reintenta hasta que el total cambie.
    await expect(async () => {
      await checkout.setQuantity(product.name, '2');
      await expect(checkout.cartTotal).toHaveText(priceForTwo, { timeout: 5000 });
    }).toPass({ timeout: 30000 });
    await page.reload();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(checkout.productTitle).toContainText(product.name);
    await expect(quantity).toHaveValue('2');
    await expect(checkout.linePrice).toHaveText(priceForTwo);
    await expect(checkout.cartTotal).toHaveText(priceForTwo, { timeout: 15000 });
    await expect(checkout.cartQuantity).toHaveText('2', { timeout: 15000 });

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
