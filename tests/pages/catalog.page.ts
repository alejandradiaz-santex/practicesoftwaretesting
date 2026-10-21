import { expect, type Locator, type Page, type Response } from '@playwright/test';

export class CatalogPage {
  // Barra superior y catalogo
  readonly navSignIn: Locator;
  readonly productCards: Locator; // enlaces que contienen un titulo de nivel 5 (nombre del producto)
  readonly productNames: Locator;
  // Busqueda
  readonly searchBox: Locator;
  readonly searchSubmit: Locator;
  readonly searchReset: Locator;
  readonly searchCaption: Locator;
  readonly noResults: Locator;
  // Ficha del producto
  readonly productName: Locator;
  readonly unitPrice: Locator;
  readonly addToCartButton: Locator;

  constructor(readonly page: Page) {
    this.navSignIn = page.getByTestId('nav-sign-in');
    this.productCards = page.getByRole('link').filter({ has: page.getByRole('heading', { level: 5 }) });
    this.productNames = page.getByTestId('product-name');
    this.searchBox = page.getByTestId('search-query');
    this.searchSubmit = page.getByTestId('search-submit');
    this.searchReset = page.getByTestId('search-reset');
    this.searchCaption = page.getByTestId('search-caption');
    this.noResults = page.getByTestId('no-results');
    this.productName = page.getByTestId('product-name');
    this.unitPrice = page.getByTestId('unit-price');
    this.addToCartButton = page.getByTestId('add-to-cart');
  }

  async goto() {
    await this.page.goto('https://practicesoftwaretesting.com');
  }

  productLink(name: string): Locator {
    return this.page.getByRole('link', { name: new RegExp(name) });
  }

  categoryCheckbox(name: string): Locator {
    return this.page.getByRole('checkbox', { name, exact: true });
  }

  async openProduct(name: string) {
    await this.productLink(name).click();
    await expect(this.page).toHaveURL(/\/product\/.+/);
  }

  /** Agrega al carrito y espera el aviso de confirmacion. */
  async addToCart() {
    await this.addToCartButton.click();
    await expect(
      this.page.getByRole('alert').filter({ hasText: 'Product added to shopping cart.' }).first()
    ).toBeVisible();
  }

  /** Busca un termino y devuelve la respuesta del servidor para que el test la valide. */
  async search(term: string): Promise<Response> {
    const response = this.page.waitForResponse((r) => r.url().includes('/products/search'));
    await this.searchBox.fill(term);
    await this.searchSubmit.click();
    return response;
  }

  async resetSearch() {
    await this.searchReset.click();
  }

  /** Marca una categoria y devuelve la respuesta del filtro. */
  async filterByCategory(name: string): Promise<Response> {
    const response = this.page.waitForResponse(
      (r) =>
        r.url().includes('/products') &&
        !r.url().includes('/products/search') &&
        r.request().postData()?.includes('by_category') === true
    );
    await this.categoryCheckbox(name).check();
    return response;
  }
}
