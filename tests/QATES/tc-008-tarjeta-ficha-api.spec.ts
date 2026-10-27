// Generado por QATES (qates:qa-automator)
import { test, expect } from '../fixtures';
import { CatalogPage } from '../pages/catalog.page';

test.describe('[QATES] Producto: tarjeta, ficha y API coinciden', () => {
  test(
    'TC-008: tarjeta, ficha y API muestran el mismo nombre y precio',
    { tag: '@qates', annotation: { type: 'generado-por', description: 'QATES' } },
    async ({ page, request }) => {
      const catalog = new CatalogPage(page);

      // 1. Abrir el sitio y leer nombre y precio de la primera tarjeta
      await catalog.goto();
      const tarjeta = catalog.productCards.first();
      await expect(tarjeta).toBeVisible();
      const nombreTarjeta = (await tarjeta.getByTestId('product-name').innerText()).trim();
      const precioTarjeta = Number((await tarjeta.getByTestId('product-price').innerText()).replace('$', '').trim());
      expect(nombreTarjeta).not.toBe('');
      expect(Number.isNaN(precioTarjeta)).toBe(false);

      // 2. Abrir la tarjeta y leer nombre y precio de la ficha (el precio viene sin "$")
      await tarjeta.click();
      await expect(page).toHaveURL(/\/product\/[^/]+$/);
      await expect(catalog.productName).toHaveText(nombreTarjeta);
      await expect(catalog.unitPrice).toBeVisible();
      const nombreFicha = (await catalog.productName.innerText()).trim();
      const precioFicha = Number((await catalog.unitPrice.innerText()).trim());

      // 3. Id del producto desde la URL /product/<id>
      //Extrae el último segmento de la URL de una página y valida que no esté vacío
      const id = new URL(page.url()).pathname.split('/').pop();
      expect(id, 'No se pudo extraer el id de la URL').toBeTruthy();

      // 4. GET /products/<id> a la API
      const respuesta = await request.get(`https://api.practicesoftwaretesting.com/products/${id}`);
      expect(respuesta.status(), 'La API debe responder 200').toBe(200);
      const cuerpo = await respuesta.json();
      expect(typeof cuerpo.price).toBe('number');

      // 5. Comparar las tres fuentes (precio como numero)
      expect(nombreFicha).toBe(nombreTarjeta);
      expect(precioFicha).toBe(precioTarjeta);
      expect(cuerpo.name).toBe(nombreTarjeta);
      expect(cuerpo.price).toBe(precioTarjeta);
    }
  );
});
