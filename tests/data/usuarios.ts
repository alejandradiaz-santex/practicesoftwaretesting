/** Datos de prueba versionados: se usan en TC-001, TC-002 y TC-005. No son datos reales. */
export const guest = { email: 'guest.qa@example.com', firstName: 'Ana', lastName: 'Prueba' };

/** Direccion de Argentina que el sitio autocompleta (calle, ciudad y estado). */
export const direccion = { country: 'AR', postalCode: 'C1425', houseNumber: '123' };

/** Perfil del registro de TC-002. El email y la contrasena se generan en cada ejecucion. */
export const perfilRegistro = {
  firstName: 'Ana',
  lastName: 'Prueba',
  dob: '1990-05-15',
  phone: '1155550123',
  ...direccion,
};
