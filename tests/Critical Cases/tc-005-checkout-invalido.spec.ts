// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect, type Page } from '@playwright/test';

/** Precondicion + pasos 1 y 2 del plan: producto desde el catalogo, carrito, guest y Billing Address. */
async function goToBillingAsGuest(page: Page) {
  await page.goto('https://practicesoftwaretesting.com');
  await page.getByRole('link', { name: /Combination Pliers/ }).click();
  await page.getByTestId('add-to-cart').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Product added to shopping cart.' })).toBeVisible();
  await page.getByTestId('nav-cart').click();
  await page.getByTestId('proceed-1').click();
  await expect(page.getByRole('tab', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Continue as Guest' })).toBeVisible();

  await page.getByRole('tab', { name: 'Continue as Guest' }).click();
  await page.getByTestId('guest-email').fill('guest.qa@example.com');
  await page.getByTestId('guest-first-name').fill('Ana');
  await page.getByTestId('guest-last-name').fill('Prueba');
  await page.getByTestId('guest-submit').click();
  await expect(page.getByText('Continuing as guest: Ana Prueba (guest.qa@example.com)')).toBeVisible();
  await page.getByTestId('proceed-2-guest').click();
  await expect(page.getByTestId('postcode-lookup-hint')).toBeVisible();
}

test.describe('Checkout con datos inválidos', () => {
  test('TC-005: Checkout con datos inválidos', async ({ page }) => {
    // 1-2. Precondicion y datos de guest hasta Billing Address
    await goToBillingAsGuest(page);

    // 3. Paso 1: campos obligatorios vacios (focus + blur)
    for (const id of ['country', 'postal_code', 'house_number', 'street', 'city']) {
      await page.getByTestId(id).focus(); //pone el cursor en ese campo
      await page.getByTestId(id).blur();//quita el cursor de ese campo, como si pasara al siguiente
    }
    await expect(page.getByTestId('proceed-3')).toBeDisabled();
    await expect(page.getByTestId('postcode-lookup-hint')).toBeVisible();
    await expect(page).toHaveURL(/\/checkout/);
    // Hallazgo: no hay texto de error por campo; solo se asierta el estado deshabilitado.
    //confirma que el campo vacío se considera inválido.
    await expect(page.getByTestId('postal_code')).toHaveClass(/ng-invalid/); 
    //Confirma que el focus() y el blur() del paso anterior sí “tocaron” el campo.
    await expect(page.getByTestId('postal_code')).toHaveClass(/ng-touched/);

    // 4. Paso 2: codigo postal invalido (el sitio igual autocompleta)
    const lookup = page.waitForResponse((r) => r.url().includes('/postcode-lookup') && r.request().method() === 'GET');
    await page.getByTestId('country').selectOption('AR');
    await page.getByTestId('postal_code').fill('ZZZZ');
    await page.getByTestId('house_number').fill('123');
    const lookupResponse = await lookup;
    expect(lookupResponse.status()).toBe(200);
    expect(lookupResponse.url()).toContain('country=AR');
    expect(lookupResponse.url()).toContain('postcode=ZZZZ');
    expect(lookupResponse.url()).toContain('house_number=123');
    await expect(page.getByTestId('street')).toHaveValue(/.+/, { timeout: 8000 });
    await expect(page.getByTestId('city')).toHaveValue(/.+/);
    await expect(page.getByTestId('state')).toHaveValue(/.+/);
    await expect(page.getByText(/invalid|postal code.*(error|incorrect)/i)).toHaveCount(0);
    // Hallazgo/defecto: el sitio no valida el formato del codigo postal; proceed-3 queda habilitado.
    await expect(page.getByTestId('proceed-3')).toBeEnabled();

    // 5. Paso 2b: sobrescribir la direccion y avanzar
    await page.getByTestId('street').fill('Calle Falsa');
    await page.getByTestId('city').fill('Ciudad Test');
    await page.getByTestId('state').fill('Estado Test');
    await expect(page.getByTestId('street')).toHaveValue('Calle Falsa');
    await expect(page.getByTestId('city')).toHaveValue('Ciudad Test');
    await expect(page.getByTestId('state')).toHaveValue('Estado Test');
    await page.getByTestId('proceed-3').click();
    await expect(page.getByTestId('payment-method')).toBeVisible();
    await expect(page.getByTestId('finish')).toBeDisabled();

    // 6. Paso 3: credit-card con campos vacios; un solo clic en finish
    await page.getByTestId('payment-method').selectOption('credit-card');
    await expect(page.getByTestId('credit_card_number')).toBeVisible();
    await expect(page.getByTestId('expiration_date')).toBeVisible();
    await expect(page.getByTestId('cvv')).toBeVisible();
    await expect(page.getByTestId('card_holder_name')).toBeVisible();
    await expect(page.getByTestId('finish')).toBeEnabled();
    await expect(page.getByTestId('finish')).toHaveText('Check payment');
    const paymentCheck = page.waitForRequest((r) => r.url().includes('/payment/check') && r.method() === 'POST');
    await page.getByTestId('finish').click();
    await paymentCheck;
    await expect(page.getByTestId('payment-error-message')).toHaveText(/Unknown error/);
    await expect(page.getByText('Payment was successful')).toHaveCount(0);
    await expect(page.getByTestId('finish')).not.toHaveText('Confirm');
    await expect(page.getByText(/Thanks for your order/)).toHaveCount(0);
    // NO pulsar 'Confirm' ni hacer un segundo clic en finish.

    // 7. Paso 4: bank-transfer con campos vacios
    await page.getByTestId('payment-method').selectOption('bank-transfer');
    await expect(page.getByTestId('bank_name')).toBeVisible();
    await expect(page.getByTestId('account_name')).toBeVisible();
    await expect(page.getByTestId('account_number')).toBeVisible();
    await expect(page.getByTestId('finish')).toBeDisabled();
    // El "Unknown error" previo puede seguir visible: no se acierta su ausencia.
  });
});
