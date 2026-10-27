import { test, expect } from './fixtures';

test.describe('Carrito de compras', () => {
  test('Agregar un producto al carrito desde el catálogo y verlo en el carrito con cantidad 1', async ({ page }) => {
    await page.goto('https://practicesoftwaretesting.com/');
    await page.getByRole('link', { name: /Bolt Cutters/ }).click();
    await page.getByTestId('add-to-cart').click();
    await expect(
      page.getByRole('alert').filter({ hasText: 'Product added to shopping cart.' }).first()
    ).toBeVisible();
    await page.getByTestId('nav-cart').click();
    await expect(page.getByTestId('product-title')).toContainText('Bolt Cutters');
    await expect(page.getByRole('spinbutton', { name: /Quantity for Bolt Cutters/ })).toHaveValue('1');
  });
});
