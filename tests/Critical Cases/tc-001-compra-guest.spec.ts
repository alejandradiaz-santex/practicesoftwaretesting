// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Checkout como Guest', () => {
  test('TC-001: Compra Exitosa como Guest', async ({ page }) => {
    // 1. Abrir el sitio sin iniciar sesion (carrito vacio, contexto nuevo)
    await page.goto('https://practicesoftwaretesting.com');
    await expect(page.getByTestId('nav-sign-in')).toBeVisible();
    await expect(page.getByRole('link', { name: /Combination Pliers/ })).toBeVisible();

    // 2. Abrir 'Combination Pliers' desde el catalogo y agregar al carrito (cantidad 1)
    await page.getByRole('link', { name: /Combination Pliers/ }).click();
    await expect(page).toHaveURL(/\/product\/.+/);
    await expect(page.getByTestId('product-name')).toHaveText(/Combination Pliers/);
    await expect(page.getByTestId('unit-price')).toHaveText('14.15');
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByRole('alert').filter({ hasText: 'Product added to shopping cart.' }).first()).toBeVisible();
    await expect(page.getByTestId('cart-quantity')).toHaveText('1');

    // 3. Paso 3a: clic en el icono del carrito
    await page.getByTestId('nav-cart').click();
    await expect(page).toHaveURL(/\/checkout/);
    await expect(page.getByTestId('product-title')).toContainText('Combination Pliers');
    await expect(page.getByTestId('product-price')).toHaveText('$14.15');
    await expect(page.getByTestId('line-price')).toHaveText('$14.15');
    await expect(page.getByTestId('cart-total')).toHaveText('$14.15');
    await expect(page.getByTestId('product-quantity')).toHaveValue('1');

    // 4. Paso 3b: Proceed to checkout (paso Cart)
    await page.getByTestId('proceed-1').click();
    await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Continue as Guest' })).toBeVisible();

    // 5. Paso 3c: pestana 'Continue as Guest'
    await page.getByRole('tab', { name: 'Continue as Guest' }).click();
    await expect(page.getByTestId('guest-email')).toBeVisible();
    await expect(page.getByTestId('guest-first-name')).toBeVisible();
    await expect(page.getByTestId('guest-last-name')).toBeVisible();
    await expect(page.getByTestId('guest-submit')).toBeVisible();

    // 6. Paso 4a: datos de guest
    await page.getByTestId('guest-email').fill('guest.qa@example.com');
    await page.getByTestId('guest-first-name').fill('Ana');
    await page.getByTestId('guest-last-name').fill('Prueba');
    await page.getByTestId('guest-submit').click();
    await expect(page.getByText('Continuing as guest: Ana Prueba (guest.qa@example.com)')).toBeVisible();

    // 7. Paso 4a-bis: continuar a Billing Address
    // El boton visible en este paso es proceed-2-guest (proceed-1 esta oculto).
    await page.getByTestId('proceed-2-guest').click();
    await expect(page.getByTestId('postcode-lookup-hint')).toBeVisible();

    // 8. Paso 4b: direccion (autocompletado de Street/City/State)
    await expect(page.getByTestId('postcode-lookup-hint')).toHaveText(
      'Enter country, postal code and house number. We will fill in the rest automatically.'
    );
    await page.getByTestId('country').selectOption('AR');
    await page.getByTestId('postal_code').fill('C1425');
    await page.getByTestId('house_number').fill('123');
    await expect(page.getByTestId('street')).toHaveValue(/.+/, { timeout: 8000 });
    await expect(page.getByTestId('city')).toHaveValue(/.+/);
    await expect(page.getByTestId('state')).toHaveValue(/.+/);
    await expect(page.getByTestId('proceed-3')).toBeEnabled();

    // 9. Paso 4c: continuar a Payment
    await page.getByTestId('proceed-3').click();
    await expect(page.getByTestId('payment-method')).toBeVisible();
    await expect(page.getByTestId('finish')).toBeVisible();

    // 10. Paso 5a: Cash on Delivery
    await page.getByTestId('payment-method').selectOption('cash-on-delivery');
    await expect(page.getByTestId('finish')).toBeEnabled();
    await expect(page.getByTestId('finish')).toHaveText('Check payment');

    // 11. Paso 5b: dos clics en finish (1.o valida el pago, 2.o crea la orden)
    const invoiceResponse = page.waitForResponse(
      (r) => r.url().includes('/invoices/guest') && r.request().method() === 'POST'
    );
    await page.getByTestId('finish').click();
    await expect(page.getByText('Payment was successful')).toBeVisible();
    await expect(page.getByTestId('finish')).toHaveText('Confirm');
    await page.getByTestId('finish').click();

    const response = await invoiceResponse;
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.invoice_number).toMatch(/INV-\d+/);

    await expect(page.getByText(/Thanks for your order! Your invoice number is INV-\d+/)).toBeVisible();
    await expect(page.getByTestId('nav-cart')).toHaveCount(0);
    await expect(page.getByTestId('cart-quantity')).toHaveCount(0);
  });
});
