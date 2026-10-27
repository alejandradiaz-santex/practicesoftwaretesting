// Generado por QATES (qates:qa-automator)
import type { Page } from '@playwright/test';
import { test, expect } from '../fixtures';
import { CatalogPage } from '../pages/catalog.page';

/** La API de /products se consulta con el metodo HTTP QUERY (parametros en el cuerpo). */
const esRespuestaProductos = (url: string) => new URL(url).pathname.endsWith('/products');

/** Elige una opcion de orden y espera la respuesta de /products. */
async function ordenarPor(page: Page, valor: string) {
  const respuesta = page.waitForResponse(
    (r) => esRespuestaProductos(r.url()) && (r.request().postData() ?? '').includes('price')
  );
  await page.getByTestId('sort').selectOption(valor);
  return respuesta;
}

/** Lee los textos de precio ("$12.58") de las tarjetas y los pasa a numero. */
async function leerPrecios(catalog: CatalogPage): Promise<number[]> {
  const textos = await catalog.productCards.getByTestId('product-price').allTextContents();
  return textos.map((t) => Number(t.replace('$', '').trim()));
}

test.describe('[QATES] Catalogo: ordenar productos por precio', () => {
  test(
    'TC-006: ordenar por precio muestra el orden correcto',
    { tag: '@qates', annotation: { type: 'generado-por', description: 'QATES' } },
    async ({ page }) => {
      const catalog = new CatalogPage(page);

      // 1. Abrir el sitio y esperar las tarjetas de la pagina 1
      await catalog.goto();
      await expect(catalog.productCards.first()).toBeVisible();
      const cantidadInicial = await catalog.productCards.count();
      expect(cantidadInicial).toBeGreaterThan(1);
      const urlAntes = page.url();

      // 2. Price (Low - High): la API responde 200 y la URL no cambia
      const respAsc = await ordenarPor(page, 'price,asc');
      expect(respAsc.status(), 'La peticion de orden ascendente debe responder 200').toBe(200);
      expect(page.url(), 'Ordenar no debe cambiar la URL').toBe(urlAntes);

      // 3. Precios de menor a mayor, sin ningun par fuera de orden
      let preciosAsc: number[] = [];
      await expect(async () => {
        preciosAsc = await leerPrecios(catalog);
        expect(preciosAsc.length).toBeGreaterThan(1);
        for (let i = 1; i < preciosAsc.length; i++) {
          expect(preciosAsc[i], `Par fuera de orden ascendente en posicion ${i}: ${preciosAsc}`).toBeGreaterThanOrEqual(
            preciosAsc[i - 1]
          );
        }
      }).toPass();
      const textosAsc = await catalog.productCards.getByTestId('product-price').allTextContents();
      for (const t of textosAsc) expect(t.trim()).toMatch(/^\$\d+(\.\d{2})$/);

      // 4. Price (High - Low): precios de mayor a menor
      const respDesc = await ordenarPor(page, 'price,desc');
      expect(respDesc.status(), 'La peticion de orden descendente debe responder 200').toBe(200);
      expect(page.url(), 'Ordenar no debe cambiar la URL').toBe(urlAntes);

      let preciosDesc: number[] = [];
      await expect(async () => {
        preciosDesc = await leerPrecios(catalog);
        expect(preciosDesc.length).toBeGreaterThan(1);
        for (let i = 1; i < preciosDesc.length; i++) {
          expect(preciosDesc[i], `Par fuera de orden descendente en posicion ${i}: ${preciosDesc}`).toBeLessThanOrEqual(
            preciosDesc[i - 1]
          );
        }
      }).toPass();

      // Misma cantidad de tarjetas en ambos ordenes. Nota: el orden se aplica en el servidor sobre
      // todo el catalogo y la pagina 1 trae otros productos en cada orden, por eso no se compara
      // el conjunto de precios (diferencia con el texto de casos-automatizacion.md, a revisar).
      expect(preciosDesc.length).toBe(preciosAsc.length);
    }
  );
});
