// spec: specs/checkout.md
// seed: tests/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Búsqueda y filtros', () => {
  test('TC-004: Búsqueda por Producto o filtrando por Categoría', async ({ page }) => {
    const searchBox = page.getByTestId('search-query');
    //encuentra todos los elementos con data-test="product-name", que son los nombres de los productos listados
    const productNames = page.getByTestId('product-name');
    // Encuentra cada tarjeta del producto: enlaces que contienen un heading de nivel 5 (nombre del producto)
    const productCards = page.getByRole('link').filter({ has: page.getByRole('heading', { level: 5 }) });

    // 1. Precondicion: catalogo sin busqueda ni filtros
    await page.goto('https://practicesoftwaretesting.com');
    // El catalogo puede tardar en cargar (sobre todo en Firefox): primera espera con mas margen.
    await expect(productCards.first()).toBeVisible({ timeout: 15000 });
    await expect(searchBox).toBeVisible();
    await expect(page.getByTestId('search-submit')).toBeVisible();
    await expect(page.getByTestId('search-caption')).toHaveCount(0); // Searched for: label

    // 2. Paso 1: buscar "hammer"
    const searchResponsePromise = page.waitForResponse((r) => r.url().includes('/products/search'));
    await searchBox.fill('hammer');
    await page.getByTestId('search-submit').click();
    const searchResponse = await searchResponsePromise;
    expect(searchResponse.status()).toBe(200);
    // Verifica lo que tiene el Payload
    expect(searchResponse.request().postData()).toContain('"q":"hammer"');
    // Verifica que la busqueda me traiga resultados
    const searchBody = await searchResponse.json();
    expect(searchBody.data.length).toBeGreaterThan(0);
    await expect(page).toHaveURL('https://practicesoftwaretesting.com/');
    await expect(page.getByTestId('search-caption')).toHaveText('Searched for: hammer');
    await expect(productCards.first()).toBeVisible();
    expect(await productCards.count()).toBeGreaterThanOrEqual(1);
    // Ningun producto listado carece de "hammer" en el nombre
    await expect(productNames.filter({ hasNotText: /hammer/i })).toHaveCount(0);

    // 3. Paso 2: buscar "xyzzy" (sin resultados)
    await searchBox.fill('xyzzy');
    await page.getByTestId('search-submit').click();
    await expect(page.getByTestId('search-caption')).toHaveText('Searched for: xyzzy');
    await expect(page.getByTestId('no-results')).toBeVisible();
    await expect(page.getByTestId('no-results')).toHaveText('There are no products found.');
    await expect(productCards).toHaveCount(0);

    // 4. Paso 3a: limpiar la busqueda
    await page.getByTestId('search-reset').click();
    await expect(searchBox).toHaveValue('');
    await expect(page.getByTestId('search-caption')).toHaveCount(0);
    await expect(page.getByTestId('no-results')).toHaveCount(0);
    await expect(productCards.first()).toBeVisible();
    await expect(productCards).toHaveCount(9);

    // 5. Paso 3b: filtrar por la categoria Hammer
    const categoryResponsePromise = page.waitForResponse(
      (r) => r.url().includes('/products') && !r.url().includes('/products/search') && r.request().postData()?.includes('by_category') === true
    );
    const hammerCheckbox = page.getByRole('checkbox', { name: 'Hammer', exact: true });
    await hammerCheckbox.check();
    const categoryResponse = await categoryResponsePromise; 
    const categoryId = await hammerCheckbox.getAttribute('value');//toma el ID de la categoria
    expect(categoryResponse.status()).toBe(200);
    //Valida que el payload tiene by_category: con el ID de la categoria seleccionada
    expect(categoryResponse.request().postData()).toContain(`"by_category":"${categoryId}"`);
    await expect(hammerCheckbox).toBeChecked();
    await expect(page.getByRole('checkbox', { name: 'Hand Tools', exact: true })).not.toBeChecked();
    await expect(productCards).toHaveCount(7);
    await expect(productNames.filter({ hasNotText: /hammer/i })).toHaveCount(0);
    await expect(page.getByText('Sledgehammer')).toBeVisible();
    await expect(page).toHaveURL('https://practicesoftwaretesting.com/');
  });
});
