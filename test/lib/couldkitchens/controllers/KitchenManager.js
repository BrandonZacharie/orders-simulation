'use strict';

const { describe, it } = require('mocha');
const { expect } = require('chai');
const { createKitchenManager, createOrders } = require('lib/cloudkitchens/util/test');
const KitchenShelfKind = require('lib/cloudkitchens/models/KitchenShelfKind');
const ErrorCode = require('lib/cloudkitchens/models/ErrorCode');

describe.only('KitchenManager', function () {
  this.timeout(10000);
  it('recieves and delivers orders', async () => {
    const kitchenManager = createKitchenManager();
    const processOrder = kitchenManager.processOrder.bind(kitchenManager);
    const orders = createOrders(2);
    let insertCount = 0;
    let deliverCount = 0;

    kitchenManager
      .on('insertOrder', () => ++insertCount)
      .on('deliverOrder', () => ++deliverCount);

    await Promise.all(orders.map(processOrder));

    expect(insertCount, 'insertCount').to.equal(orders.length);
    expect(deliverCount, 'deliverCount').to.equal(orders.length);
  });
  it('moves orders to an overlfow shelf', async () => {
    const kitchenManager = createKitchenManager();
    const processOrder = kitchenManager.processOrder.bind(kitchenManager);
    const orders = createOrders(4, { temp: KitchenShelfKind.HOT });
    let hotShelfOrdersCount = 0;
    let overflowShelfOrdersCount = 0;

    kitchenManager.on('assignOrderToShelf', (_, shelf) => {
      switch (shelf.kind) {
        case KitchenShelfKind.HOT:
          return ++hotShelfOrdersCount;
        case KitchenShelfKind.OVERFLOW:
          return ++overflowShelfOrdersCount;
      }
    });

    await Promise.all(orders.map(processOrder));

    expect(hotShelfOrdersCount).to.equal(2);
    expect(overflowShelfOrdersCount).to.equal(2);
  });
  it('discards orders when out of capacity', async () => {
    const kitchenManager = createKitchenManager();
    const processOrder = kitchenManager.processOrder.bind(kitchenManager);
    const orders = createOrders(6, { temp: KitchenShelfKind.HOT });
    let discardedOrdersCount = 0;

    kitchenManager.on('removeOrder', (_, err) => {
      if (err != null) {
        ++discardedOrdersCount;
      }
    });

    await Promise
      .all(orders.map(processOrder))
      .catch((err) => {
        if (err.kind !== ErrorCode.ORDER_NOT_FOUND) {
          throw err;
        }
      });

    expect(discardedOrdersCount).to.equal(2);
  });
  it('fails to deliver expired orders', async () => {
    const kitchenManager = createKitchenManager();
    const processOrder = kitchenManager.processOrder.bind(kitchenManager);
    const orders = createOrders(2, { shelfLife: 1 });
    let deliveredOrdersCount = 0;

    kitchenManager.on('deliverOrder', () => ++deliveredOrdersCount);

    await Promise
      .all(orders.map(processOrder))
      .catch((err) => {
        if (err.kind !== ErrorCode.ORDER_EXPIRED) {
          throw err;
        }
      });

    expect(deliveredOrdersCount).to.equal(0);
  });
});
