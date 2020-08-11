'use strict';

class Courier {

  /**
   * The date this courier was sent to a kitchen.
   * @type {Date}
   */
  dispatched = null;

  /**
   * The date this courier arrived at a kitchen.
   * @type {Date}
   */
  arrived = null;

  /**
   * The date this courier departed from a kitchen.
   * @type {Date}
   */
  departed = null;

  /**
   * The order to be delivered.
   * @type {KitchenOrder}
   */
  order = null;

  /**
   * Construct a new {@link Courier}.
   * @param {Object} options 
   * @param {String} options.id
   */
  constructor({ id }) {
    this.id = id;
  }

  /**
   * Get a POJO representation of the current state.
   * @returns {Object}
   */
  toDebugJSON() {
    return {
      id: this.id,
      order: this.order === null ? null : this.order.toDebugJSON()
    }
  }

}

module.exports = Courier;
