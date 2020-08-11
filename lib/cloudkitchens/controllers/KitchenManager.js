'use strict';

const { EventEmitter } = require('events');
const uuid = require('uuid');
const { sleep, randomInteger } = require('lib/cloudkitchens/util');
const {
  Kitchen,
  KitchenOrder,
  KitchenOrderStatus,
  KitchenShelf,
  KitchenShelfKind,
  Courier,
  ErrorCode
} = require('lib/cloudkitchens/models');

class KitchenManager extends EventEmitter {

  /**
   * A pool of couriers for delivering orders.
   * @private
   * @readonly
   * @type {Array<Courier>}
   */
  _couriers = [];

  /**
   * Construct a new {@link Kitchen}.
   * @param {Kitchen} kitchen 
   */
  constructor(kitchen) {
    if (!(kitchen instanceof Kitchen)) {
      throw new Error('kitchen must be a Kitchen');
    }

    super()

    /**
     * The kitchen to be managed.
     * @private
     * @type {Kitchen}
     */
    this._kitchen = kitchen;

    // Relay significant kitchen events.
    for (let event of ['insertOrder', 'removeOrder', 'assignOrderToShelf']) {
      kitchen.on(event, (...args) => this.emit(event, ...args));
    }
  }

  /**
   * Process an order with the following steps:
   * 1. Prepare the order
   *    1. Cook the order
   *    2. Store the order on a shelf
   * 2. Dispatch a courier
   *    1. Send the courier to the kitchen
   *    2. Retrieve the order from the kitchen
   * 3. Deliver the order
   *    1. Release the order to the customer
   *    2. Return the courier to the kitchen
   * @param {Object} options
   * @param {String} options.id
   * @param {String} options.name
   * @param {String} options.temp
   * @param {Number} options.shelfLife
   * @param {Number} options.decayRate
   * @return {Promise<KitchenOrder>}
   */
  async processOrder({ id, name, temp, shelfLife, decayRate }) {
    const order = new KitchenOrder({ id, name, temp, shelfLife, decayRate });

    order.status = KitchenOrderStatus.AWAITING_PREPARATION;

    await this._prepareOrder(order);

    const courier = await this._dispatchCourier(order);

    await this._deliverOrder(courier);

    return order;
  }

  /**
   * Get a POJO representation of the current state.
   * @returns {Object}
   */
  toDebugJSON() {
    return {
      couriers: this._couriers.map((courier) => courier.toDebugJSON()),
      kitchen: this._kitchen.toDebugJSON()
    };
  }

  /**
   * Prepare the given order for delivery; cook and assign to a shelf.
   * @private
   * @param {KitchenOrder} order 
   * @returns {Promise<KitchenOrder>}
   */
  async _prepareOrder(order) {
    this._kitchen.insertOrder(order);

    // Simulate work; cook food.
    await sleep(1);

    order.prepared = new Date();

    this.emit('prepareOrder', order);

    const shelf = this._kitchen.getShelf(order.temp);

    return this._assignOrderToShelf(order, shelf);
  }

  /**
   * Send a courier to the kitchen for a the given order.
   * @private
   * @param {KitchenOrder} order
   * @returns {Promise<Courier>}
   */
  async _dispatchCourier(order) {
    // Get a courier from the pool.
    let courier = this._couriers
      .filter((courier) => courier.dispatched === null)
      .sort((a, b) => b.dispatched - a.dispatched)
    [0];

    // Get a new courier since existing couriers are busy.
    if (courier == null) {
      // Simulate work; contact courier.
      await sleep(1);

      courier = new Courier({ id: uuid.v4() });

      this._couriers.push(courier);

      this.emit('allocateCourier', courier);
    }

    courier.order = order;
    courier.delivered = null;
    courier.dispatched = new Date();

    this.emit('dispatchCourier', courier);

    // Simulate work; travel time.
    await sleep(randomInteger(2, 6) * 1000);

    courier.arrived = new Date;

    return courier;
  }

  /**
   * Deliver the order from a given courier.
   * @private
   * @param {Courier} courier 
   * @returns {Promise<void>}
   */
  async _deliverOrder(courier) {
    const { order } = courier;
    const value = Math.round(order.getValue() * 100.0);

    // Fail if the order is expired.
    if (value <= 0) {
      const err = new Error('cannot deliver order; order expired');

      err.kind = ErrorCode.ORDER_EXPIRED;

      this._kitchen.removeOrders(order, err);

      order.status = KitchenOrderStatus.DISCARDED;

      throw err;
    }

    // Fail if the order was not prepared or has been removed.
    if (order.prepared === null || order.removed !== null) {
      const err = new Error('cannot deliver order; order not found');

      err.kind = ErrorCode.ORDER_NOT_FOUND;

      throw err;
    }

    // Simulate work; pickup food.
    await sleep(1);

    courier.departed = new Date();

    this._kitchen.removeOrders(order);

    // Simulate work; deliver food.
    await sleep(1);

    order.status = KitchenOrderStatus.DELIVERED;
    order.delivered = new Date();

    this.emit('deliverOrder', courier);

    courier.order = null;
    courier.arrived = null;
    courier.dispatched = null;
  }

  /**
   * Try to move a given order to a given shelf or an
   * overflow shelf when needed. Discards an order at
   * random to make space when all else fails.
   * @private
   * @param {KitchenOrder} order 
   * @param {KitchenShelf} shelf 
   * @returns {Promise<Array<KitchenOrder>>}
   */
  async _assignOrderToShelf(order, shelf) {
    if (!(shelf instanceof KitchenShelf)) {
      throw new Error('shelf must be a KitchenShelf');
    }

    order.status = KitchenOrderStatus.AWAITING_SHELF;

    await this._cleanShelf(shelf);

    try {
      this._kitchen.assignOrdersToShelf(order, shelf);

      order.status = KitchenOrderStatus.AWAITING_COURIER;
    }
    catch (err) {
      if (err.kind !== ErrorCode.OUT_OF_CAPACITY) {
        throw err;
      }

      if (shelf.kind === KitchenShelfKind.OVERFLOW) {
        await this._cleanShelf(shelf, true);
      }

      shelf = this._kitchen.getShelf(KitchenShelfKind.OVERFLOW);

      if (shelf === null) {
        const err = new Error('out of capacity');

        err.kind = ErrorCode.OUT_OF_CAPACITY;

        this._kitchen.removeOrders(order, err);

        order.status = KitchenOrderStatus.DISCARDED;

        throw err;
      }

      return this._assignOrderToShelf(order, shelf);
    }
  }

  /**
   * Make space on the given shelf.
   * @private
   * @param {KitchenShelf} shelf 
   * @param {Boolean} isRequired 
   */
  async _cleanShelf(shelf, isRequired = false) {
    // Simulate work; dispose food.
    await sleep(1);

    let err = new Error('order expired');

    err.kind = ErrorCode.ORDER_EXPIRED;

    // Remove expired orders.
    const orders = shelf.removeOrders((order) => Math.round(order.getValue() * 100.0) <= 0, err);

    for (let order of orders) {
      order.status = KitchenOrderStatus.DISCARDED;
    }

    // Remove an order at random if required.
    if (orders.length === 0 && isRequired) {
      err = new Error('out of capacity');
      err.kind = ErrorCode.OUT_OF_CAPACITY;

      const index = randomInteger(0, shelf.capacity - 1);

      for (let order of shelf.removeOrders((_, i) => i === index, err)) {
        orders.push(order);

        order.status = KitchenOrderStatus.DISCARDED;
      }
    }

    for (let order of orders) {
      this.emit('removeOrder', order, err);
    }

    return orders;
  }

}

module.exports = KitchenManager;
