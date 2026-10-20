import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://practicesoftwaretesting.com/');
  const product = page.locator('.container a.card').nth(1);
  await product.click({ force: true });
  const botonCarrito = page.locator('#btn-add-to-cart');
  await botonCarrito.waitFor({ state: 'attached', timeout: 8000 });
  await botonCarrito.evaluate((element) => (element as HTMLElement).click());
  await page.locator('[data-test="nav-cart"]').click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Product added to shopping' })
  ).toBeVisible();
  await expect(page.locator('[data-test="product-title"]')).toHaveText('Pliers');
  await expect(page.locator('[data-test="product-quantity"]')).toHaveValue('1');
});