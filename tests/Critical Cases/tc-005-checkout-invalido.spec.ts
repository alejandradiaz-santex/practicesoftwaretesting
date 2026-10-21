// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { CheckoutPage } from '../pages/checkout.page';

test.describe('Checkout con datos inválidos', () => {
  test('TC-005: Checkout con datos inválidos', async ({ page }) => {
    // Registra cualquier POST a /invoices: con datos invalidos no debe crearse ninguna orden
    const invoiceRequests: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('/invoices') && r.method() === 'POST') invoiceRequests.push(r.url());
    });

    // 1-2. Precondicion: producto desde el catalogo, carrito y datos de guest hasta Billing Address
    const checkout = new CheckoutPage(page);
    await page.goto('https://practicesoftwaretesting.com');
    await page.getByRole('link', { name: /Combination Pliers/ }).click();
    await page.getByTestId('add-to-cart').click();
    await expect(page.getByRole('alert').filter({ hasText: 'Product added to shopping cart.' }).first()).toBeVisible();
    await checkout.goToBillingAsGuest({ email: 'guest.qa@example.com', firstName: 'Ana', lastName: 'Prueba' });

    // 3. Paso 1: campos obligatorios vacios (focus + blur)
    for (const id of ['country', 'postal_code', 'house_number', 'street', 'city']) {
      await page.getByTestId(id).focus(); //pone el cursor en ese campo
      await page.getByTestId(id).blur();//quita el cursor de ese campo, como si pasara al siguiente
    }
    await expect(checkout.proceedToPayment).toBeDisabled();
    await expect(checkout.lookupHint).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    // Hallazgo: no hay texto de error por campo; solo se asierta el estado deshabilitado.
    //confirma que el campo vacío se considera inválido.
    await expect(page.getByTestId('postal_code')).toHaveClass(/ng-invalid/); 
    //Confirma que el focus() y el blur() del paso anterior sí “tocaron” el campo.
    await expect(page.getByTestId('postal_code')).toHaveClass(/ng-touched/);

    // 4. Paso 2: codigo postal invalido (el sitio igual autocompleta)
    const lookup = page.waitForResponse((r) => r.url().includes('/postcode-lookup') && r.request().method() === 'GET');
    await checkout.fillAddress({ country: 'AR', postalCode: 'ZZZZ', houseNumber: '123' });
    const lookupResponse = await lookup;
    expect(lookupResponse.status()).toBe(200);
    expect(lookupResponse.url()).toContain('country=AR');
    expect(lookupResponse.url()).toContain('postcode=ZZZZ');
    expect(lookupResponse.url()).toContain('house_number=123');
    await expect(checkout.street).toHaveValue(/.+/);
    await expect(checkout.city).toHaveValue(/.+/);
    await expect(checkout.state).toHaveValue(/.+/);
    await expect(page.getByText(/invalid|postal code.*(error|incorrect)/i)).toHaveCount(0);
    // Hallazgo/defecto: el sitio no valida el formato del codigo postal; proceed-3 queda habilitado.
    await expect(checkout.proceedToPayment).toBeEnabled();

    // 5. Paso 2b: sobrescribir la direccion y avanzar
    // overwriteAddress ya verifica que los tres valores se mantengan
    await checkout.overwriteAddress({ street: 'Calle Falsa', city: 'Ciudad Test', state: 'Estado Test' });
    await checkout.goToPayment();
    await expect(checkout.finish).toBeDisabled();

    // 6. Paso 3: credit-card con campos vacios; un solo clic en finish
    await checkout.paymentMethod.selectOption('credit-card');
    await expect(page.getByTestId('credit_card_number')).toBeVisible();
    await expect(page.getByTestId('expiration_date')).toBeVisible();
    await expect(page.getByTestId('cvv')).toBeVisible();
    await expect(page.getByTestId('card_holder_name')).toBeVisible();
    await expect(checkout.finish).toBeEnabled();
    await expect(checkout.finish).toHaveText('Check payment');
    const paymentCheck = page.waitForResponse((r) => r.url().includes('/payment/check') && r.request().method() === 'POST');
    await checkout.finish.click();
    // El servidor rechaza la tarjeta vacia con 422 y un error por cada campo
    const paymentResponse = await paymentCheck;
    expect(paymentResponse.status()).toBe(422);
    const paymentBody = await paymentResponse.json();
    expect(paymentBody.message).toContain('credit card number field is required');
    expect(Object.keys(paymentBody.errors)).toEqual(
      expect.arrayContaining([
        'payment_details.credit_card_number',
        'payment_details.expiration_date',
        'payment_details.cvv',
        'payment_details.card_holder_name',
      ])
    );
    // Hallazgo/defecto: la interfaz no muestra esos errores por campo, solo un mensaje generico
    await expect(page.getByTestId('payment-error-message')).toHaveText(/Unknown error/);
    await expect(page.getByText('Payment was successful')).toHaveCount(0);
    await expect(checkout.finish).not.toHaveText('Confirm');
    await expect(page.getByText(/Thanks for your order/)).toHaveCount(0);
    // NO pulsar 'Confirm' ni hacer un segundo clic en finish.

    // 7. Paso 4: bank-transfer con campos vacios
    await checkout.paymentMethod.selectOption('bank-transfer');
    await expect(page.getByTestId('bank_name')).toBeVisible();
    await expect(page.getByTestId('account_name')).toBeVisible();
    await expect(page.getByTestId('account_number')).toBeVisible();
    await expect(checkout.finish).toBeDisabled();
    // El "Unknown error" previo puede seguir visible: no se acierta su ausencia.

    // Ningun intento de pago invalido debe crear una orden
    expect(invoiceRequests).toHaveLength(0);
  });
});
