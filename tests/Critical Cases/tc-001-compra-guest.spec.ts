// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/checkout.page';

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

    // 3. Paso 3a: abrir el carrito
    const checkout = new CheckoutPage(page);
    await checkout.openCart();
    await expect(checkout.productTitle).toContainText('Combination Pliers');
    await expect(checkout.productPrice).toHaveText('$14.15');
    await expect(checkout.linePrice).toHaveText('$14.15');
    await expect(checkout.cartTotal).toHaveText('$14.15');
    await expect(checkout.quantityOf('Combination Pliers')).toHaveValue('1');

    // 4-7. Pasos 3b a 4a-bis: Sign in como guest hasta Billing Address
    await checkout.proceedToSignIn();
    await checkout.continueAsGuest({ email: 'guest.qa@example.com', firstName: 'Ana', lastName: 'Prueba' });

    // 8. Paso 4b: direccion (autocompletado de Street/City/State)
    await expect(checkout.lookupHint).toHaveText(
      'Enter country, postal code and house number. We will fill in the rest automatically.'
    );
    await checkout.fillAddress({ country: 'AR', postalCode: 'C1425', houseNumber: '123' });
    await expect(checkout.city).toHaveValue(/.+/);
    await expect(checkout.state).toHaveValue(/.+/);
    await expect(checkout.proceedToPayment).toBeEnabled();

    // 9. Paso 4c: continuar a Payment
    await checkout.goToPayment();
    await expect(checkout.finish).toBeVisible();

    // 10. Paso 5a: Cash on Delivery
    await checkout.paymentMethod.selectOption('cash-on-delivery');
    await expect(checkout.finish).toBeEnabled();
    await expect(checkout.finish).toHaveText('Check payment');

    // 11. Paso 5b: dos clics en finish (1.o valida el pago, 2.o crea la orden)
    const invoiceResponse = page.waitForResponse(
      (r) => r.url().includes('/invoices/guest') && r.request().method() === 'POST'
    );
    await checkout.finish.click();
    await expect(page.getByText('Payment was successful')).toBeVisible();
    await expect(checkout.finish).toHaveText('Confirm');
    await checkout.finish.click();

    const response = await invoiceResponse;
    expect(response.status()).toBe(201);
    const body = await response.json();
    expect(body.invoice_number).toMatch(/INV-\d+/);

    await expect(
      page.getByText(`Thanks for your order! Your invoice number is ${body.invoice_number}.`)
    ).toBeVisible();

    await expect(checkout.navCart).toHaveCount(0);
    await expect(checkout.cartQuantity).toHaveCount(0);
  });
});
