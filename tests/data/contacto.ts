/** Datos de TC-009 (formulario de contacto). No son datos reales. */
export const contacto = {
  firstName: 'Prueba',
  lastName: 'QA',
  email: 'qa.prueba@example.com',
  subject: 'Customer service',
  /** Mensaje en el borde válido: el sitio exige 50 caracteres como mínimo. */
  message: 'x'.repeat(50),
};

/** Longitudes del mensaje en el borde del mínimo (49 se rechaza, 50 se acepta). */
export const longitudMensaje = { invalida: 49, valida: 50 };

/** Emails que el formulario rechaza con "Email format is invalid". */
export const emailsInvalidos = ['correo-sin-arroba', 'a b@example.com'];
