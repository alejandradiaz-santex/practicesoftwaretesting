import { type Locator, type Page } from '@playwright/test';

export type ContactData = { firstName: string; lastName: string; email: string; subject: string; message: string };

export class ContactPage {
  readonly firstName: Locator;
  readonly lastName: Locator;
  readonly email: Locator;
  readonly subject: Locator;
  readonly message: Locator;
  readonly attachment: Locator;
  readonly send: Locator;
  // Errores de campo: no existen hasta pulsar Send
  readonly firstNameError: Locator;
  readonly lastNameError: Locator;
  readonly emailError: Locator;
  readonly subjectError: Locator;
  readonly messageError: Locator;
  readonly attachmentHelp: Locator;
  readonly successMessage: Locator;

  constructor(readonly page: Page) {
    this.firstName = page.getByTestId('first-name');
    this.lastName = page.getByTestId('last-name');
    this.email = page.getByTestId('email');
    this.subject = page.getByTestId('subject');
    this.message = page.getByTestId('message');
    this.attachment = page.getByTestId('attachment');
    this.send = page.getByRole('button', { name: 'Send' });
    this.firstNameError = page.getByTestId('first-name-error');
    this.lastNameError = page.getByTestId('last-name-error');
    this.emailError = page.getByTestId('email-error');
    this.subjectError = page.getByTestId('subject-error');
    this.messageError = page.getByTestId('message-error');
    this.attachmentHelp = page.getByText('Only files with the txt extension are allowed, and files must be 0kb.');
    this.successMessage = page.getByText('Thanks for your message! We will contact you shortly.');
  }

  get allErrors(): Locator[] {
    return [this.firstNameError, this.lastNameError, this.emailError, this.subjectError, this.messageError];
  }

  async goto() {
    await this.page.goto('https://practicesoftwaretesting.com/contact');
  }

  /** Escribe el mensaje y sale del campo (la validacion ocurre al salir). */
  async fillMessage(text: string) {
    await this.message.fill(text);
    await this.message.blur();
  }

  /** Rellena los datos; con sinSubject no toca el select (la opcion vacia esta deshabilitada: no se puede volver a ella). */
  async fillValid(data: ContactData, opciones: { sinSubject?: boolean } = {}) {
    await this.firstName.fill(data.firstName);
    await this.lastName.fill(data.lastName);
    await this.email.fill(data.email);
    if (!opciones.sinSubject) await this.subject.selectOption({ label: data.subject });
    await this.fillMessage(data.message);
  }
}
