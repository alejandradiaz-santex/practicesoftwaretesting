import { test as base, expect, type Page } from '@playwright/test';

/**
 * Cloudflare puede mostrar su verificación anti-bots ("Performing security verification" o
 * "Just a moment...") a las máquinas de GitHub en lugar de la página del sitio demo. Entonces el
 * test no llega a ejercitar el sitio y falla por el entorno, no por un defecto. No se intenta
 * esquivar la verificación: solo se reconoce y se informa.
 */
async function hayVerificacionCloudflare(page: Page): Promise<boolean> {
  if (page.isClosed()) return false;
  try {
    if (/just a moment/i.test(await page.title())) return true;
    return (await page.getByRole('heading', { name: /performing security verification/i }).count()) > 0;
  } catch {
    return false;
  }
}

/**
 * `test` con una comprobación al terminar: si el test falló y la página mostrada es la
 * verificación de Cloudflare, el test se marca como omitido (skipped) con la anotación
 * `cloudflare`, para que el informe lo distinga de un fallo real. Un fallo con la página
 * del sitio sigue siendo un fallo.
 */
export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    await use(page);
    if (testInfo.status !== testInfo.expectedStatus && (await hayVerificacionCloudflare(page))) {
      testInfo.annotations.push({
        type: 'cloudflare',
        description: 'La verificación anti-bots de Cloudflare bloqueó la página; el test no pudo ejercitar el sitio.',
      });
      testInfo.status = 'skipped';
    }
  },
});

export { expect };
