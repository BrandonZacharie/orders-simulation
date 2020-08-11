'use strict';

const { EventEmitter } = require('events');
const toModelPredicate = require('lib/cloudkitchens/util/toModelPredicate');
const KitchenOrder = require('./KitchenOrder');
const KitchenShelf = require('./KitchenShelf');
const ErrorCode = require('./ErrorCode');

class Kitchen extends EventEmitter {

  _orders = [];
  _shelfs = [];

  /**
   * Add a shelf.
   * @param {KitchenShelf} shelf 
   * @returns {void}
   */
  insertShelf(shelf) {
    if (!(shelf instanceof KitchenShelf)) {
      throw new Error('shelf must be a KitchenShelf');
    }

    this._shelfs.push(shelf);
    this.emit('insertShelf', shelf);
  }

  /**
   * Add an order.
   * @param {KitchenOrder} order 
   * @returns {void}
   */
  insertOrder(order) {
    const KitchenOrder = require('./KitchenOrder');

    if (!(order instanceof KitchenOrder)) {
      throw new Error('order must be a KitchenOrder');
    }

    this._orders.push(order);
    this.emit('insertOrder', order);
  }

  /**
   * Move a given {@link KitchenOrder} to a given {@link KitchenShelf}.
   * @throws
   * @param {KitchenOrder|Array<KitchenOrder>|string|function} ordersOrPredicate 
   * @param {KitchenShelf} shelf 
   * @returns {void}
   */
  assignOrdersToShelf(ordersOrPredicate, shelf) {
    if (!(shelf instanceof KitchenShelf)) {
      throw new Error('shelf must be a KitchenShelf');
    }
    const orders = this.removeOrders(ordersOrPredicate);

    if (orders.length === 0 && ordersOrPredicate instanceof KitchenOrder) {
      orders.push(order);
    }

    if (orders.length === 0) {
      const err = new Error('order not found');

      err.kind = ErrorCode.ORDER_NOT_FOUND;

      throw err;
    }

    for (let order of orders) {
      shelf.insertOrder(order);
      this.emit('assignOrderToShelf', order, shelf);
    }
  }

  /**
   * Remove a given {@link KitchenOrder}.
   * @throws
   * @param {KitchenOrder|Array<KitchenOrder>|String|Function} ordersOrPredicate
   * @param {Error} [err]
   * @returns {void}
   */
  removeOrders(ordersOrPredicate, err = null) {
    const predicate = toModelPredicate(ordersOrPredicate, KitchenOrder);

    if (predicate === null) {
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
    }

    for (let shelf of this._shelfs) {
      orders.push(...shelf.removeOrders(predicate, err));
    }

    for (let order of orders) {
      this.emit('removeOrder', order, err);
    }

    if (orders.length === 0 && ordersOrPredicate instanceof KitchenOrder) {
      orders.push(ordersOrPredicate);
    }

    return orders;
  }

  /**
   * Get a {@link KitchenShelf} of a given kind.
   * @param {String} kind
   * @returns {KitchenShelf}
   */
  getShelf(kind) {
    for (let shelf of this._shelfs) {
      if (shelf.kind === kind) {
        return shelf;
      }
    }

    return null;
  }

  /**
   * Get a POJO representation of the current state.
   * @returns {Object}
   */
  toDebugJSON() {
    return {
      orders: this._orders.map((order) => order.toDebugJSON()),
      shelves: this._shelfs.map((shelf) => shelf.toDebugJSON())
    }
  }

}

module.exports = Kitchen;
