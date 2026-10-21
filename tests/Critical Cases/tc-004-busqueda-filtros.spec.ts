// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';
import { CatalogPage } from '../pages/catalog.page';

test.describe('Búsqueda y filtros', () => {
  test('TC-004: Búsqueda por Producto o filtrando por Categoría', async ({ page }) => {
    const catalog = new CatalogPage(page);

    // 1. Precondicion: catalogo sin busqueda ni filtros
    await catalog.goto();
    // El catalogo puede tardar en cargar (sobre todo en Firefox): primera espera con mas margen.
    await expect(catalog.productCards.first()).toBeVisible({ timeout: 15000 });
    await expect(catalog.searchBox).toBeVisible();
    await expect(catalog.searchSubmit).toBeVisible();
    await expect(catalog.searchCaption).toHaveCount(0); // Searched for: label

    // 2. Paso 1: buscar "hammer"
    const searchResponse = await catalog.search('hammer');
    expect(searchResponse.status()).toBe(200);
    // Verifica lo que tiene el Payload
    expect(searchResponse.request().postData()).toContain('"q":"hammer"');
    // Verifica que la busqueda me traiga resultados
    const searchBody = await searchResponse.json();
    expect(searchBody.data.length).toBeGreaterThan(0);
    await expect(page).toHaveURL('https://practicesoftwaretesting.com/');
    await expect(catalog.searchCaption).toHaveText('Searched for: hammer');
    await expect(catalog.productCards.first()).toBeVisible();
    expect(await catalog.productCards.count()).toBeGreaterThanOrEqual(1);
    // Ningun producto listado carece de "hammer" en el nombre
    await expect(catalog.productNames.filter({ hasNotText: /hammer/i })).toHaveCount(0);

    // 3. Paso 2: buscar "xyzzy" (sin resultados)
    await catalog.search('xyzzy');
    await expect(catalog.searchCaption).toHaveText('Searched for: xyzzy');
    await expect(catalog.noResults).toBeVisible();
    await expect(catalog.noResults).toHaveText('There are no products found.');
    await expect(catalog.productCards).toHaveCount(0);

    // 4. Paso 3a: limpiar la busqueda
    await catalog.resetSearch();
    await expect(catalog.searchBox).toHaveValue('');
    await expect(catalog.searchCaption).toHaveCount(0);
    await expect(catalog.noResults).toHaveCount(0);
    await expect(catalog.productCards.first()).toBeVisible();
    await expect(catalog.productCards).toHaveCount(9);

    // 5. Paso 3b: filtrar por la categoria Hammer
    const categoryResponse = await catalog.filterByCategory('Hammer');
    const hammerCheckbox = catalog.categoryCheckbox('Hammer');
    const categoryId = await hammerCheckbox.getAttribute('value');//toma el ID de la categoria
    expect(categoryResponse.status()).toBe(200);
    //Valida que el payload tiene by_category: con el ID de la categoria seleccionada
    expect(categoryResponse.request().postData()).toContain(`"by_category":"${categoryId}"`);
    await expect(hammerCheckbox).toBeChecked();
    // El sitio puede tener mas de una categoria llamada "Hand Tools": ninguna debe quedar marcada
    for (const handTools of await catalog.categoryCheckbox('Hand Tools').all()) {
      await expect(handTools).not.toBeChecked();
    }
    // La pantalla muestra exactamente los productos que devolvio el servidor (no depende de cuantos haya)
    const categoryBody = await categoryResponse.json();
    expect(categoryBody.data.length).toBeGreaterThan(0);
    await expect(catalog.productCards).toHaveCount(categoryBody.data.length);
    // Los nombres mostrados coinciden con los de la respuesta del servidor. No se exige "hammer" en el
    // nombre: el sitio puede tener productos con otros nombres en la categoria (ej. "topo").
    await expect(catalog.productNames).toHaveText(categoryBody.data.map((p: { name: string }) => p.name));
    await expect(page.getByText('Sledgehammer')).toBeVisible();
    await expect(page).toHaveURL('https://practicesoftwaretesting.com/');
  });
});
