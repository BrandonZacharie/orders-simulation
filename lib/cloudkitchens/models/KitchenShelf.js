'use strict';

const { EventEmitter } = require('events');
const toModelPredicate = require('lib/cloudkitchens/util/toModelPredicate');
const KitchenOrder = require('./KitchenOrder');
const KitchenShelfKind = require('./KitchenShelfKind');
const ErrorCode = require('./ErrorCode');

class KitchenShelf extends EventEmitter {

  /**
   * The orders currently stored.
   * @private
   * @type {Array<Kitchen>}
   */
  _orders = [];

  /**
   * Determine if a given {@link value} is a type of {@link KitchenShelfKind}.
   * @param {String | null} [value] 
   */
  static isKind(value) {
    return Object.values(KitchenShelfKind).includes(value);
  }

  /**
   * Construct a new {@link KitchenShelf}.
   * @param {Object} options
   * @param {String} options.kind
   * @param {Number} options.capacity
   * @param {Number} options.decayModifier
   */
  constructor({ kind, capacity, decayModifier }) {
    if (!KitchenShelf.isKind(kind)) {
      throw new Error('kind must be a KitchenShelfKind');
    }

    if (isNaN(capacity)) {
      throw new Error('capacity must be a number');
    }

    super();

    this.kind = kind;
    this.capacity = capacity;
    this.decayModifier = decayModifier;
  }

  /**
   * Insert a given order if space is available.
   * @throws
   * @param {KitchenOrder} order 
   * @returns {void}
   */
  insertOrder(order) {
    if (!(order instanceof KitchenOrder)) {
      throw new Error('order must be a KitchenOrder');
    }

    if (this._orders.length >= this.capacity) {
      const err = new Error('out of capacity');

      err.kind = ErrorCode.OUT_OF_CAPACITY;

      throw err;
    }

    order.removed = null;

    this._orders.push(order);
    order.insertDecayModifier(this.decayModifier);
    this.emit('insertOrder', order);
  }

  /**
   * Remove given orders.
   * @throws
   * @param {KitchenOrder | Array<KitchenOrder> | String | Function} ordersOrPredicate 
   * @param {Error} [err]
   * @returns {Array<KitchenOrder>}
   */
  removeOrders(ordersOrPredicate, err = null) {
    const predicate = toModelPredicate(ordersOrPredicate, KitchenOrder);

    if (typeof predicate !== 'function') {
      throw new Error('ordersOrPredicate must be a KitchenOrder, Array<KitchenOrder>, String, or Function');
    }

    let index = 0;
    const orders = [];

    for (let order of this._orders.splice(0)) {
      if (!predicate(order, index++)) {
        this._orders.push(order);

        continue;
      }

      order.removed = new Date();

      orders.push(order);
      this.emit('removeOrder', order, err);
    }

    return orders;
  }

  /**
   * Get a POJO representation of the current state.
   * @returns {Object}
   */
  toDebugJSON() {
    return {
      kind: this.kind,
      orders: this._orders.map((order) => order.toDebugJSON())
    }
  }

}

module.exports = KitchenShelf;
