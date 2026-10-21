// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Registro de cuenta', () => {
  test('TC-002: Registro de Cuenta exitoso', async ({ page }) => {
    const password = process.env.TC002_PASSWORD; // La contrasena viene de la variable de entorno TC002_PASSWORD.
    if (!password) {
      throw new Error('Defina la variable de entorno TC002_PASSWORD (contrasena valida: 8+ caracteres, mayusculas, minusculas, numero y simbolo) para ejecutar TC-002.');
    }

    const email = `qa.registro+${Date.now()}@example.com`;
    // 1. Abrir la pagina de registro (sin sesion)
    await page.goto('https://practicesoftwaretesting.com/auth/register');
    await expect(page.getByTestId('first-name')).toBeVisible();
    await expect(page.getByTestId('last-name')).toBeVisible();
    await expect(page.getByTestId('dob')).toBeVisible();
    await expect(page.getByTestId('country')).toBeVisible();
    await expect(page.getByTestId('postal_code')).toBeVisible();
    await expect(page.getByTestId('house_number')).toBeVisible();
    await expect(page.getByTestId('street')).toBeVisible();
    await expect(page.getByTestId('city')).toBeVisible();
    await expect(page.getByTestId('state')).toBeVisible();
    await expect(page.getByTestId('phone')).toBeVisible();
    await expect(page.getByTestId('email')).toBeVisible();
    await expect(page.getByTestId('password')).toBeVisible();
    await expect(page.getByTestId('register-submit')).toBeVisible();
    await expect(page.getByTestId('register-submit')).toHaveText(/Register/);
    await expect(page.getByTestId('postcode-lookup-hint')).toBeVisible();
    await expect(page.getByText('Your password must:')).toBeVisible();

    // 2. Datos personales
    await page.getByTestId('first-name').fill('Ana');
    await page.getByTestId('last-name').fill('Prueba');
    await page.getByTestId('dob').fill('1990-05-15');
    await expect(page.getByTestId('first-name')).toHaveValue('Ana');
    await expect(page.getByTestId('last-name')).toHaveValue('Prueba');
    await expect(page.getByTestId('dob')).toHaveValue('1990-05-15');

    // 3. Direccion con autocompletado (no se asertan valores aleatorios)
    const lookup = page.waitForResponse(
      (r) => r.url().includes('/postcode-lookup') && r.request().method() === 'GET'
    );
    await page.getByTestId('country').selectOption('AR');
    await page.getByTestId('postal_code').fill('C1425');
    await page.getByTestId('house_number').fill('123');
    const lookupResponse = await lookup;
    expect(lookupResponse.status()).toBe(200);
    expect(lookupResponse.url()).toContain('country=AR');
    expect(lookupResponse.url()).toContain('postcode=C1425');
    expect(lookupResponse.url()).toContain('house_number=123');
    await expect(page.getByTestId('street')).toHaveValue(/.+/, { timeout: 8000 });
    await expect(page.getByTestId('city')).toHaveValue(/.+/);
    await expect(page.getByTestId('state')).toHaveValue(/.+/);

    // 4. Telefono y email unico
    await page.getByTestId('phone').fill('1155550123');
    await page.getByTestId('email').fill(email);
    await expect(page.getByTestId('phone')).toHaveValue('1155550123');
    await expect(page.getByTestId('email')).toHaveValue(email);

    // 5. Contrasena desde variable de entorno
    await page.getByTestId('password').fill(password!);
    await expect(page.getByTestId('password')).not.toHaveValue('');

    // 6. Enviar el registro y verificar 201, redireccion y ausencia de mensaje de exito
    const registerResponse = page.waitForResponse(
      (r) => r.url().includes('/users/register') && r.request().method() === 'POST'
    );
    await page.getByTestId('register-submit').click();
    expect((await registerResponse).status()).toBe(201);
    await expect(page).toHaveURL('https://practicesoftwaretesting.com/auth/login');
    await expect(page.getByText(/success|registered|account (was )?created/i)).toHaveCount(0);
  });
});
