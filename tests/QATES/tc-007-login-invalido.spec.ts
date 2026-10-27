// Generado por QATES (qates:qa-automator)
import { test, expect } from '../fixtures';
import { randomBytes } from 'crypto';
import { CatalogPage } from '../pages/catalog.page';

test.describe('[QATES] Autenticacion: login con credenciales invalidas', () => {
  test(
    'TC-007: login con credenciales invalidas es rechazado',
    { tag: '@qates', annotation: { type: 'generado-por', description: 'QATES' } },
    async ({ page }) => {
      // Datos efimeros: email valido pero no registrado y contrasena ficticia generada en cada ejecucion
      const email = `no.existe+${Date.now()}@example.com`;
      const password = `Aa1!${randomBytes(9).toString('hex')}`;
      const catalog = new CatalogPage(page);

      // 1. Abrir /auth/login
      await page.goto('https://practicesoftwaretesting.com/auth/login');
      await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();

      // 2. Ingresar email inexistente y contrasena ficticia
      await page.getByRole('textbox', { name: 'Email address' }).fill(email);
      await page.getByRole('textbox', { name: 'Password' }).fill(password);

      // 3. Clic en Login y capturar la respuesta de la API de login
      const respuestaLogin = page.waitForResponse(
        (r) => new URL(r.url()).pathname.endsWith('/users/login') && r.request().method() === 'POST'
      );
      await page.getByRole('button', { name: 'Login' }).click();
      const respuesta = await respuestaLogin;

      // 4. UI: mensaje generico, URL en /auth/login y menu con "Sign in"
      await expect(page.getByText('Invalid email or password')).toBeVisible();
      await expect(page).toHaveURL(/\/auth\/login/);
      await expect(catalog.navSignIn).toContainText('Sign in');

      // API: 401 
      expect(respuesta.status(), 'Estado esperado 401').toBe(401);
      const cuerpo = await respuesta.json();
      expect(cuerpo).toEqual({ error: 'Unauthorized' });
      expect(cuerpo).not.toHaveProperty('access_token');
    }
  );
});
