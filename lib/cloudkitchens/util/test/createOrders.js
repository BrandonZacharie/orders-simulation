'use strict';

const uuid = require('uuid');
const randomInteger = require('lib/cloudkitchens/util/randomInteger');
const KitchenShelfKind = require('lib/cloudkitchens/models/KitchenShelfKind')

/**
 * @type {Array<String>}
 */
const temps = Object.values(KitchenShelfKind);

module.exports = (count = 1, options = {}) => {
  const orders = [];
  const shelfLife = options.shelfLife === undefined
    ? 100
    : options.shelfLife;
  const decayRate = options.decayRate === undefined
    ? 1.0
    : options.decayRate;

  for (let i = 0; i < count; ++i) {
    const temp = options.temp === undefined
      ? temps[randomInteger(0, temps.length - 1)]
      : options.temp;

    orders.push({
      id: uuid.v4(),
      name: `Order #${i}`,
      temp,
      shelfLife,
      decayRate
    });
  }

  return orders;
}