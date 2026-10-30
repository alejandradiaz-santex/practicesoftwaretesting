// Generado por QATES (qa-automator)
import { test, expect } from '../fixtures';
import { ContactPage } from '../pages/contact.page';
import { contacto as VALIDO, emailsInvalidos, longitudMensaje } from '../data/contacto';

test.describe('[QATES] Formulario de contacto', () => {
  test(
    'TC-009: formulario de contacto: validacion y envio valido',
    { tag: '@qates', annotation: { type: 'generado-por', description: 'QATES' } },
    async ({ page }) => {
      const contact = new ContactPage(page);
      // Peticiones a /messages desde el inicio: en las partes A y B deben ser 0
      let peticionesMessages = 0;
      page.on('request', (r) => {
        if (new URL(r.url()).pathname.includes('/messages')) peticionesMessages++;
      });

      await test.step('Parte A: estructura y validacion (sin enviar)', async () => {
        // A1
        await contact.goto();
        await expect(page).toHaveTitle('Contact Us - Practice Software Testing - Toolshop - v5.0');
        for (const campo of [contact.firstName, contact.lastName, contact.email, contact.subject, contact.message, contact.attachment, contact.send]) {
          await expect(campo).toBeVisible();
        }
        for (const etiqueta of ['First name', 'Last name', 'Email address', 'Subject', 'Message *', 'Attachment']) {
          await expect(page.getByText(etiqueta, { exact: true }).first()).toBeVisible();
        }
        await expect(contact.attachmentHelp).toBeVisible();

        // A2
        await expect(contact.subject.locator('option')).toHaveText([
          'Select a subject *', 'Customer service', 'Webmaster', 'Return', 'Payments', 'Warranty', 'Status of my order',
        ]);
        await expect(contact.subject.locator('option').first()).toHaveAttribute('value', '');

        // A3
        await expect(contact.attachment).toHaveAttribute('accept', '.txt');
        await expect(contact.attachment).not.toHaveAttribute('multiple');

        // A4: Send con el formulario vacio
        await contact.send.click();
        await expect(contact.firstNameError).toHaveText('First name is required');
        await expect(contact.lastNameError).toHaveText('Last name is required');
        await expect(contact.emailError).toHaveText('Email is required');
        await expect(contact.subjectError).toHaveText('Subject is required');
        await expect(contact.messageError).toHaveText('Message is required');
        await expect(contact.successMessage).toHaveCount(0);
        expect(peticionesMessages, 'Sin peticion a /messages (A4)').toBe(0);

        // A5: datos validos, los errores desaparecen
        await contact.fillValid(VALIDO);
        for (const error of contact.allErrors) await expect(error).toHaveCount(0);

        // A6: vaciar un campo obligatorio a la vez
        const casos = [
          { nombre: 'first-name', vaciar: () => contact.firstName.fill(''), error: contact.firstNameError, texto: 'First name is required' },
          { nombre: 'last-name', vaciar: () => contact.lastName.fill(''), error: contact.lastNameError, texto: 'Last name is required' },
          { nombre: 'email', vaciar: () => contact.email.fill(''), error: contact.emailError, texto: 'Email is required' },
          { nombre: 'subject', vaciar: async () => { await contact.goto(); await contact.fillValid(VALIDO, { sinSubject: true }); }, error: contact.subjectError, texto: 'Subject is required' },
          { nombre: 'message', vaciar: () => contact.message.fill(''), error: contact.messageError, texto: 'Message is required' },
        ];
        for (const caso of casos) {
          if (caso.nombre !== 'subject') await contact.fillValid(VALIDO);
          await caso.vaciar();
          await contact.send.click();
          await expect(caso.error, `Error de ${caso.nombre}`).toHaveText(caso.texto);
          for (const otro of contact.allErrors.filter((e) => e !== caso.error)) {
            await expect(otro, `Solo debe verse el error de ${caso.nombre}`).toHaveCount(0);
          }
          expect(peticionesMessages, `Sin peticion a /messages (A6, ${caso.nombre})`).toBe(0);
        }
      });

      await test.step('Parte B: formato del email y longitud del mensaje (sin enviar)', async () => {
        // B1 y B2
        for (const emailInvalido of emailsInvalidos) {
          await contact.fillValid(VALIDO);
          await contact.email.fill(emailInvalido);
          await contact.send.click();
          await expect(contact.emailError, `Email ${emailInvalido}`).toHaveText('Email format is invalid');
          expect(peticionesMessages, `Sin peticion a /messages (B, ${emailInvalido})`).toBe(0);
        }

        // B3
        await contact.fillValid(VALIDO);
        await contact.fillMessage('x'.repeat(longitudMensaje.invalida));
        await contact.send.click();
        await expect(contact.messageError).toHaveText('Message must be minimal 50 characters');
        expect(peticionesMessages, 'Sin peticion a /messages (B3)').toBe(0);

        // B4: borde valido (50) con los demas campos vacios
        await contact.goto(); // recarga: la opcion vacia de Subject esta deshabilitada y no se puede volver a ella
        await contact.fillMessage('x'.repeat(longitudMensaje.valida));
        await contact.send.click();
        await expect(contact.firstNameError).toBeVisible();
        await expect(contact.lastNameError).toBeVisible();
        await expect(contact.emailError).toBeVisible();
        await expect(contact.subjectError).toBeVisible();
        await expect(contact.messageError).toHaveCount(0);
        expect(peticionesMessages, 'Sin peticion a /messages (B4)').toBe(0);
      });

      await test.step('Parte C: envio valido (unico envio real)', async () => {
        await contact.fillValid(VALIDO);
        const [respuesta] = await Promise.all([
          page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/messages') && r.request().method() === 'POST'),
          contact.send.click(),
        ]);
        expect(respuesta.status(), 'POST /messages debe responder 200').toBe(200);
        await expect(contact.successMessage).toBeVisible();
        await expect(contact.send).toHaveCount(0);
      });
    }
  );
});
