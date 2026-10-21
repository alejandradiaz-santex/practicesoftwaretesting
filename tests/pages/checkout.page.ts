import { expect, type Locator, type Page } from '@playwright/test';

export type Guest = { email: string; firstName: string; lastName: string };
export type Address = { country: string; postalCode: string; houseNumber: string };

export class CheckoutPage {
  // Barra superior y paso Cart
  readonly navCart: Locator;
  readonly cartQuantity: Locator;
  readonly productTitle: Locator;
  readonly productPrice: Locator;
  readonly linePrice: Locator;
  readonly cartTotal: Locator;
  readonly proceedFromCart: Locator;
  // Paso Sign in (guest)
  readonly signInTab: Locator;
  readonly guestTab: Locator;
  readonly guestEmail: Locator;
  readonly guestFirstName: Locator;
  readonly guestLastName: Locator;
  readonly guestSubmit: Locator;
  readonly proceedAsGuest: Locator;
  // Paso Billing Address
  readonly country: Locator;
  readonly postalCode: Locator;
  readonly houseNumber: Locator;
  readonly street: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly lookupHint: Locator;
  readonly proceedToPayment: Locator;
  // Paso Payment
  readonly paymentMethod: Locator;
  readonly finish: Locator;

  constructor(readonly page: Page) {
    this.navCart = page.getByTestId('nav-cart');
    this.cartQuantity = page.getByTestId('cart-quantity');
    this.productTitle = page.getByTestId('product-title');
    this.productPrice = page.getByTestId('product-price');
    this.linePrice = page.getByTestId('line-price');
    this.cartTotal = page.getByTestId('cart-total');
    this.proceedFromCart = page.getByTestId('proceed-1');
    this.signInTab = page.getByRole('tab', { name: 'Sign in' });
    this.guestTab = page.getByRole('tab', { name: 'Continue as Guest' });
    this.guestEmail = page.getByTestId('guest-email');
    this.guestFirstName = page.getByTestId('guest-first-name');
    this.guestLastName = page.getByTestId('guest-last-name');
    this.guestSubmit = page.getByTestId('guest-submit');
    this.proceedAsGuest = page.getByTestId('proceed-2-guest');
    this.country = page.getByTestId('country');
    this.postalCode = page.getByTestId('postal_code');
    this.houseNumber = page.getByTestId('house_number');
    this.street = page.getByTestId('street');
    this.city = page.getByTestId('city');
    this.state = page.getByTestId('state');
    this.lookupHint = page.getByTestId('postcode-lookup-hint');
    this.proceedToPayment = page.getByTestId('proceed-3');
    this.paymentMethod = page.getByTestId('payment-method');
    this.finish = page.getByTestId('finish');
  }

  /** Cantidad de un producto en el paso Cart (campo numerico). */
  quantityOf(product: string): Locator {
    return this.page.getByRole('spinbutton', { name: new RegExp(`Quantity for ${product}`) });
  }

  async openCart() {
    await this.navCart.click();
    await expect(this.page).toHaveURL(/\/checkout/);
    // El carrito se carga despues de la pagina (puede tardar, sobre todo en Firefox)
    await expect(this.productTitle).toBeVisible({ timeout: 15000 });
  }

  async setQuantity(product: string, value: string) {
    await this.quantityOf(product).fill(value);
    await this.quantityOf(product).press('Tab'); // el total se actualiza al salir del campo
  }

  /** Del paso Cart al paso Sign in. */
  async proceedToSignIn() {
    await this.proceedFromCart.click();
    await expect(this.signInTab).toBeVisible();
    await expect(this.guestTab).toBeVisible();
  }

  /** Continuar como guest hasta llegar a Billing Address. */
  async continueAsGuest(guest: Guest) {
    await this.guestTab.click();
    await this.guestEmail.fill(guest.email);
    await this.guestFirstName.fill(guest.firstName);
    await this.guestLastName.fill(guest.lastName);
    await this.guestSubmit.click();
    await expect(
      this.page.getByText(`Continuing as guest: ${guest.firstName} ${guest.lastName} (${guest.email})`)
    ).toBeVisible();
    await this.proceedAsGuest.click(); // proceed-1 esta oculto en este paso
    await expect(this.lookupHint).toBeVisible();
  }

  /** Del carrito hasta Billing Address como guest. */
  async goToBillingAsGuest(guest: Guest) {
    await this.openCart();
    await this.proceedToSignIn();
    await this.continueAsGuest(guest);
  }

  /** Pais, codigo postal y numero de casa; espera el autocompletado de calle, ciudad y estado. */
  async fillAddress(address: Address) {
    await this.country.selectOption(address.country);
    await this.postalCode.fill(address.postalCode);
    await this.houseNumber.fill(address.houseNumber);
    await expect(this.street).toHaveValue(/.+/, { timeout: 8000 });
  }

  /**
   * Sobrescribe calle, ciudad y estado. El autocompletado puede responder despues de escribir
   * (el lookup se llama mas de una vez) y pisar el valor, asi que se reintenta hasta que se mantenga.
   */
  async overwriteAddress(address: { street: string; city: string; state: string }) {
    await expect(async () => {
      await this.street.fill(address.street);
      await this.city.fill(address.city);
      await this.state.fill(address.state);
      await expect(this.street).toHaveValue(address.street, { timeout: 1000 });
      await expect(this.city).toHaveValue(address.city, { timeout: 1000 });
      await expect(this.state).toHaveValue(address.state, { timeout: 1000 });
    }).toPass({ timeout: 10000 });
  }

  async goToPayment() {
    await this.proceedToPayment.click();
    await expect(this.paymentMethod).toBeVisible();
  }
}
