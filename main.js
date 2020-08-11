'use strict';

const util = require('util');
const chalk = require('chalk');
const pThrottle = require('p-throttle');
const winston = require('./lib/winston');
const Kitchen = require('./lib/cloudkitchens/models/Kitchen');
const KitchenOrder = require('./lib/cloudkitchens/models/KitchenOrder');
const KitchenShelf = require('./lib/cloudkitchens/models/KitchenShelf');
const KitchenShelfKind = require('./lib/cloudkitchens/models/KitchenShelfKind');
const ErrorCode = require('./lib/cloudkitchens/models/ErrorCode');
const KitchenManager = require('./lib/cloudkitchens/controllers/KitchenManager');
const sleep = require('./lib/cloudkitchens/util/sleep');
const toDurationString = require('./lib/cloudkitchens/util/toDurationString');

/**
 * @returns {KitchenManager}
 */
const createKitchenManager = () => {
  const hotShelf = new KitchenShelf({
    kind: KitchenShelfKind.FROZEN,
    capacity: 10,
    decayModifier: 1.0
  });
  const coldShelf = new KitchenShelf({
    kind: KitchenShelfKind.COLD,
    capacity: 10,
    decayModifier: 1.0
  });
  const frozenShelf = new KitchenShelf({
    kind: KitchenShelfKind.HOT,
    capacity: 10,
    decayModifier: 1.0
  });
  const overflowShelf = new KitchenShelf({
    kind: null,
    capacity: 15,
    decayModifier: 2.0
  });
  const kitchen = new Kitchen();

  kitchen.insertShelf(hotShelf);
  kitchen.insertShelf(coldShelf);
  kitchen.insertShelf(frozenShelf);
  kitchen.insertShelf(overflowShelf);

  return new KitchenManager(kitchen);
};

/**
 * @param {KitchenManager} kitchenManager 
 * @param {Number} interval
 * @returns {Function}
 */
const toThrottledProcessOrder = (kitchenManager, interval) => {
  return pThrottle((order) => {
    return kitchenManager
      .processOrder(order)
      .catch((err) => {
        // Ignore expected errors.
        if (!Object.values(ErrorCode).includes(err.kind)) {
          throw err;
        }
      });
  }, 1, interval);
};

/**
 * @param {Object} model
 * @param {String} [prefix]
 * @param {Array<String>} [keys]
 * @returns {Object}
 */
const toSerializable = (model, prefix = '', keys = []) => {
  const copy = (object, key) => ({
    [prefix + key]: model[key],
    ...object
  });
  const json = {};

  switch (model.constructor) {
    case KitchenOrder:
      json.order_value = Math.round(model.getValue() * 10000) / 100;

      break;

    case KitchenShelf:
      json.shelf_space = model.capacity - model._orders.length;

      break;
  }

  return Object
    .keys(model)
    .filter((key) => keys.includes(key))
    .reduce(copy, json);
};

/**
 * @param {Object} options
 * @param {String} options.sourceFile]
 * @param {Number} [options.maxOrders]
 * @param {Number} [options.ordersPerSecond]
 * @returns {Promise}
 */
const main = async ({ sourceFile, maxOrders, ordersPerSecond, canLogVerboseData }) => {
  const date = new Date();
  const orders = require(sourceFile);
  const logger = winston.get();
  let insertOrderCount = 0;
  let allocateCourierCount = 0;
  let discardOrderCount = 0;
  let deliverOrderCount = 0;
  let deliveryDurationMean = null;

  const kitchenManager = createKitchenManager()
    .on('insertOrder', (order) => {
      order.number = ++insertOrderCount;

      logger.info(chalk`{bold.blueBright recieved order} {cyan #${order.number}}`);
      logger.silly('', { meta: kitchenManager.toDebugJSON() });
    })
    .on('prepareOrder', (order) => {
      logger.debug(chalk`{dim prepared order} {cyan #${order.number}}`);
    })
    .on('removeOrder', (order, err) => {
      const meta = toSerializable(order, 'order_');

      if (err == null) {
        logger.debug(chalk`{dim removed order} {cyan #${order.number}}`, { meta });

        return;
      }

      ++discardOrderCount;

      logger.error(chalk`{bold.red discarded order} {cyan #${order.number}} {dim because} {bold.red ${err.message}}`, { meta });
      logger.silly('', { meta: kitchenManager.toDebugJSON() });
    })
    .on('assignOrderToShelf', (order, shelf) => {
      const meta = Object.assign(
        toSerializable(order, 'order_', ['decayRate']),
        toSerializable(shelf, 'shelf_')
      );
      const kind = Object
        .entries(KitchenShelfKind)
        .find(([k, v]) => v === shelf.kind)[0];

      logger.debug(chalk`{dim moved order} {cyan #${order.number}} {dim to shelf} {green ${kind}}`, { meta });
      logger.silly('', { meta: kitchenManager.toDebugJSON() });
    })
    .on('allocateCourier', (courier) => {
      courier.number = ++allocateCourierCount;

      logger.info(chalk`{bold.magenta allocated courier} {cyan #${courier.number}}`);
    })
    .on('dispatchCourier', (courier) => {
      const { order } = courier;

      logger.debug(chalk`{dim dispatched courier} {cyan #${courier.number}} {dim for order} {cyan #${order.number}}`);
    })
    .on('deliverOrder', (courier) => {
      const { order } = courier;
      const duration = order.delivered - courier.dispatched;
      const timestamp = toDurationString(duration);
      const meta = toSerializable(order, 'order_');

      ++deliverOrderCount;

      deliveryDurationMean = deliveryDurationMean === null
        ? duration
        : (deliveryDurationMean + duration) / 2.0;

      logger.info(chalk`{bold.greenBright delivered order} {cyan #${order.number}} {dim via courier} {cyan #${courier.number}} {dim after} {green ${timestamp}}`, { meta });
      logger.silly('', { meta: kitchenManager.toDebugJSON() });
    });

  maxOrders = Math.max(0, Math.min(maxOrders, orders.length));

  await sleep(100);

  console.log(
    chalk
      `Attempting to process {yellow ${maxOrders}} orders
      from the file at {yellow ${sourceFile}}
      at a rate of {yellow ${ordersPerSecond}} orders per second…\n`
      .replace(/  +/g, '')
  );

  await sleep(1000 / ordersPerSecond);

  await Promise.all(
    orders
      .slice(0, maxOrders)
      .map(toThrottledProcessOrder(kitchenManager, 1000 / ordersPerSecond))
  );

  console.table({
    '# orders recieved': insertOrderCount,
    '# orders discarded': discardOrderCount,
    '# orders delivered': deliverOrderCount,
    '# couriers allocated': allocateCourierCount,
    'x̅ delivery duration': toDurationString(deliveryDurationMean),
    'total duration': toDurationString(new Date - date)
  });

  return {
    insertOrderCount,
    discardOrderCount,
    deliverOrderCount,
    allocateCourierCount,
    deliveryDurationMean
  }
};

if (require.main === module) {
  const { program } = require('commander');
  const { version } = require('./package.json');

  program
    .description(
      chalk
        `Example: npm start -- \
         \t --file=./.data/mock-orders.json \
         \t --limit=30 \
         \t --throughput=10
          
         Note: Detailed Kitchen state data is logged after most state changing
         events. Set {bold APP_LOG_LEVEL=silly} in the environment to display it.`
        .replace(/  +/g, '')
    )
    .name('npm start')
    .usage('-- [options]')
    .version(version)
    .option('-f, --file <string>', 'path to a JSON file from which to process orders', './.data/orders.json')
    .option('-t, --throughput <number>', 'rate at which to process orders per second', 0.5)
    .option('-l, --limit <number>', 'maximum amount of orders to process', Infinity)
    .parse(process.argv);

  main({
    sourceFile: program.file,
    maxOrders: program.limit,
    ordersPerSecond: program.throughput,
    canLogVerboseData: program.verbose
  });
}

module.exports = main;
