'use strict';

const KitchenManager = require('./../../controllers/KitchenManager');
const {
  Kitchen,
  KitchenShelf,
  KitchenShelfKind
} = require('lib/cloudkitchens/models');

module.exports = () => {
  const hotShelf = new KitchenShelf({
    kind: KitchenShelfKind.FROZEN,
    capacity: 2,
    decayModifier: 1.0
  });
  const coldShelf = new KitchenShelf({
    kind: KitchenShelfKind.COLD,
    capacity: 2,
    decayModifier: 1.0
  });
  const frozenShelf = new KitchenShelf({
    kind: KitchenShelfKind.HOT,
    capacity: 2,
    decayModifier: 1.0
  });
  const overflowShelf = new KitchenShelf({
    kind: KitchenShelfKind.OVERFLOW,
    capacity: 2,
    decayModifier: 2.0
  });
  const kitchen = new Kitchen();

  kitchen.insertShelf(hotShelf);
  kitchen.insertShelf(coldShelf);
  kitchen.insertShelf(frozenShelf);
  kitchen.insertShelf(overflowShelf);

  return new KitchenManager(kitchen);
};
