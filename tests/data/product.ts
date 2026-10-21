export const product = {
  name: 'Bolt Cutters',
  price: 48.41,
};

/** Formato del carrito: $14.15 */
export const money = (amount: number) => `$${amount.toFixed(2)}`;
