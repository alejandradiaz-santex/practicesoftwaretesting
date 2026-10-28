// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '../fixtures';
import { randomBytes } from 'crypto';
import { perfilRegistro as perfil } from '../data/usuarios';

/** Contrasena valida (8+ caracteres, mayusculas, minusculas, numero y simbolo) generada en cada ejecucion. */
function generatePassword(): string {
  return `Aa1!${randomBytes(9).toString('base64url')}`;
}

test.describe('Registro de cuenta', () => {
  test('TC-002: Registro de Cuenta exitoso', async ({ page }) => {
    // La cuenta es descartable y el test no vuelve a iniciar sesion: la contrasena se genera en cada
    // ejecucion y no se guarda. Si se define TC002_PASSWORD (opcional), se usa esa en su lugar.
    const password = process.env.TC002_PASSWORD || generatePassword();

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
    await page.getByTestId('first-name').fill(perfil.firstName); // viene de usuarios.ts
    await page.getByTestId('last-name').fill(perfil.lastName);
    await page.getByTestId('dob').fill(perfil.dob);
    await expect(page.getByTestId('first-name')).toHaveValue(perfil.firstName);
    await expect(page.getByTestId('last-name')).toHaveValue(perfil.lastName);
    await expect(page.getByTestId('dob')).toHaveValue(perfil.dob);

    // 3. Direccion con autocompletado (no se asertan valores aleatorios)
    const lookup = page.waitForResponse(
      (r) => r.url().includes('/postcode-lookup') && r.request().method() === 'GET'
    );
    await page.getByTestId('country').selectOption(perfil.country);
    await page.getByTestId('postal_code').fill(perfil.postalCode);
    await page.getByTestId('house_number').fill(perfil.houseNumber);
    const lookupResponse = await lookup;
    expect(lookupResponse.status()).toBe(200);
    expect(lookupResponse.url()).toContain(`country=${perfil.country}`);
    expect(lookupResponse.url()).toContain(`postcode=${perfil.postalCode}`);
    expect(lookupResponse.url()).toContain(`house_number=${perfil.houseNumber}`);
    await expect(page.getByTestId('street')).toHaveValue(/.+/, { timeout: 8000 });
    await expect(page.getByTestId('city')).toHaveValue(/.+/);
    await expect(page.getByTestId('state')).toHaveValue(/.+/);

    // 4. Telefono y email unico
    await page.getByTestId('phone').fill(perfil.phone);
    await page.getByTestId('email').fill(email);
    await expect(page.getByTestId('phone')).toHaveValue(perfil.phone);
    await expect(page.getByTestId('email')).toHaveValue(email);

    // 5. Contrasena desde variable de entorno
    await page.getByTestId('password').fill(password);
    await expect(page.getByTestId('password')).not.toHaveValue('');

    // 6. Enviar el registro y verificar 201, redireccion y ausencia de mensaje de exito
    // El sitio redirige apenas responde, y despues de navegar el cuerpo ya no se puede leer:
    // se lee dentro de la ruta, antes de que la pagina reciba la respuesta (la peticion sigue siendo la real).
    let registerResult: { status: number; body: { email?: string } | null } | undefined;
    await page.route('**/users/register', async (route) => {
      const response = await route.fetch();
      registerResult = { status: response.status(), body: await response.json().catch(() => null) };
      await route.fulfill({ response });
    });
    await page.getByTestId('register-submit').click();
    await expect(page).toHaveURL('https://practicesoftwaretesting.com/auth/login');
    expect(registerResult?.status).toBe(201);
    expect(registerResult?.body?.email).toBe(email);
    await expect(page.getByText(/success|registered|account (was )?created/i)).toHaveCount(0);
  });
});
