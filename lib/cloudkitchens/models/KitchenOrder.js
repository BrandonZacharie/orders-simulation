'use strict';

const { EventEmitter } = require('events');

class KitchenOrder extends EventEmitter {

  /**
   * A description of where this order is in the fulfillment lifecycle.
   * @type {KitchenOrderStatus}
   */
  status = null;

  /**
   * The date this order was prepared in a kitchen.
   * @type {Date | null}
   */
  prepared = null;

  /**
   * The date this order was removed from a kitchen.
   * @type {Date | null}
   */
  removed = null;

  /**
   * The date this order was delivered to a customer.
   * @type {Date | null}
   */
  delivered = null;

  /**
   * A collection of POJOs that contain a reference
   * to a {@link KitchenShelf} and the {@link Date}
   * this {@link Order} was put on it. This is used
   * to calculate the "value" of this {@link Order}.
   * @private
   * @readonly
   * @type {Array<{decayModifier: number, date: Date}>}
   */
  _decayHistory = [];

  /**
   * Construct a new instance.
   * @param {object} order 
   * @param {string} order.id
   * @param {string} order.name
   * @param {string} order.temp
   * @param {number} order.shelfLife
   * @param {number} order.decayRate
   */
  constructor({ id, name, temp, shelfLife, decayRate }) {
    super()

    /**
     * A globally unique identifier.
     * @readonly
     * @type {string}
     */
    this.id = id;

    /**
     * The marketing name of the cuisine.
     * @readonly
     * @type {string}
     */
    this.name = name;

    /**
     * The temperature the {@link Order} should be stored at.
     * @readonly
     * @see KitchenShelfKind
     * @type {string}
     */
    this.temp = temp;

    /**
     * The total number of seconds the food has to live. The actual
     * time to live is influenced by {@link decayRate} and the
     * {@link KitchenShelf} used for storage.
     * @readonly
     * @see KitchenShelf->decayModifier
     * @type {number}
     */
    this.shelfLife = shelfLife;

    /**
     * The rate at which the food will decay per second.
     * @readonly
     * @type {number}
     */
    this.decayRate = decayRate;
  }

  /**
   * Add a given {@link decayModifier} to the decay history.
   * @throws
   * @param {number} decayModifier
   * @returns {void}
   */
  insertDecayModifier(decayModifier) {
    if (this.removed !== null) {
      throw new Error('order already removed');
    }

    this._decayHistory.push({ decayModifier, date: new Date() });
  }

  /**
   * Get the age of this {@link Order} in milliseconds.
   * @returns {number}
   */
  getAge() {
    return this.prepared === null
      ? 0
      : (this.removed || new Date()) - this.prepared;
  }

  /**
   * Get the inherent value of this {@link Order} that deteriorates over
   * time, based on the {@link ​shelfLife​} and {@link decayRate​} fields.
   * 
   * This iterates through the shelf history reducing the value by the
   * amount lost while the order sat on a given shelf. This is needed
   * since the order will deteriorate at different rates when stored
   * on different shelves (see {@link KitchenShelf->decayModifier}).
   * @returns {number}
   */
  getValue() {
    let oldDate = this.prepared || new Date();
    let value = this._decayHistory.reduce((oldValue, { decayModifier, date: newDate }) => {
      const age = (newDate - oldDate) / 1000;

      oldDate = newDate;

      const newValue = this._valueForAgeAndDecayModifier(age, decayModifier);

      return newValue - (1.0 - oldValue);
    }, 1.0);

    if (this._decayHistory.length > 0) {
      const age = ((this.removed || new Date()) - oldDate) / 1000;
      const { decayModifier } = this._decayHistory[this._decayHistory.length - 1];

      value -= 1.0 - this._valueForAgeAndDecayModifier(age, decayModifier);
    }

    return value;
  }

  /**
   * Get a POJO representation of the current state.
   * @returns {Object}
   */
  toDebugJSON() {
    return {
      id: this.id,
      value: this.getValue()
    }
  }

  /**
   * Get the value of this {@link Order} given an {@link age} and {@link decayModifier}.
   * @private
   * @param {number} age 
   * @param {number} decayModifier 
   * @returns {number}
   */
  _valueForAgeAndDecayModifier(age, decayModifier) {
    return (this.shelfLife - this.decayRate * age * decayModifier) / this.shelfLife;
  }

}

module.exports = KitchenOrder;
