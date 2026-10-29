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
    // Versión del sitio, leída del pie de la página viva cuando el test falla: el reporte de CI la usa y así
    // no depende de que el snapshot del error la incluya. Sin pie visible (p. ej. la página de Cloudflare)
    // no se añade nada y el reporte la deja como [FALTA DATO].
    if (testInfo.status !== testInfo.expectedStatus && !page.isClosed()) {
      try {
        const pie = await page.getByRole('contentinfo').innerText({ timeout: 2000 });
        const version = pie.match(/v\d+\.\d+(?:\.\d+)?\s*\|\s*Built\s*\d{4}-\d{2}-\d{2}/);
        if (version) testInfo.annotations.push({ type: 'version-sitio', description: version[0] });
      } catch {
        /* sin pie de página: no se inventa la versión */
      }
    }
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
