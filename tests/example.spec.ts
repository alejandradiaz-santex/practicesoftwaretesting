import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://practicesoftwaretesting.com/');
  await page.locator('[data-test="product-01M5CX7VBEMTE2Y6XPMV18WC0D"]').click();
  await page.locator('[data-test="add-to-cart"]').click();
  await page.locator('[data-test="nav-cart"]').click();
  await expect(
  page.getByRole('alert').filter({ hasText: 'Product added to shopping' })
).toBeVisible();
  await expect(page.locator('[data-test="product-title"]')).toHaveText('Pliers');
  await expect(page.locator('[data-test="product-quantity"]')).toHaveValue('1');
});