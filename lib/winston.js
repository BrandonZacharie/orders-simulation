'use strict';

require('dotenv').config();

const { inspect } = require('util');
const chalk = require('chalk');
const winston = require('winston');
const uuid = require('uuid');
const relquire = require('lib/relquire');
const { combine, splat, timestamp, label, json, printf } = winston.format;
const unsplat = winston.format((log) => {
  delete log.splat;

  if (log.message != null) {
    log.message = log.message.trim();
  }

  return log;
});
const inspectOptions = {
  colors: true,
  maxArrayLength: Infinity,
  depth: Infinity
};

/**
 * Represents meta data for a log entry.
 */
class Meta {
  /**
   * Construct a new {@linkcode Meta}.
   * @argument {String} format
   */
  constructor(format) {
    this.format = format;
    this.date = new Date;
    this.uuid = uuid.v4();
  }

  /**
   * Get a current object representation of this instance.
   * @argument {String} object
   * @argument {...String} [keys]
   * @return {Object}
   */
  toObject(object, ...keys) {
    if (object instanceof Error) {
      object = {
        message: object.message,
        code: object.code,
        name: object.name
      };
    }
    else {
      object = Object.assign(Object.create(null), object);
    }

    if (keys.length === 0) {
      keys = Object.keys(Meta.handlers);
    }

    for (let key of keys) {
      if (key in Meta.handlers) {
        object[key] = Meta.handlers[key](this);
      }
    }

    return object;
  }
}

Meta.UUID = 'uuid';
Meta.TIME = 'time';
Meta.handlers = Object.assign(Object.create(null), {
  [Meta.UUID]: (meta) => meta.uuid,
  [Meta.TIME]: (meta) => new Date - meta.date
});

/**
 * Get a colored console string for a given console {@linkcode level}.
 * @argument {String} level
 * @return {String}
 */
const colorize = (level) => {
  switch (level.toLowerCase()) {
    case 'silly':
      return chalk.dim(level);
    case 'verbose':
      return chalk.magenta(level);
    case 'debug':
      return chalk.blue(level);
    case 'info':
      return chalk.green(level);
    case 'warn':
      return chalk.yellow(level);
    case 'error':
      return chalk.red(level);
    default:
      return chalk.white(level);
  }
};

/**
 * Get a formatted string for a given {@linkcode log}.
 * @argument {Object} log
 * @return {String}
 */
const toConsoleString = (log) => {
  const level = colorize(log.level.toUpperCase());
  const label = chalk.cyan(log.label);
  const message = chalk.white(log.message);
  const meta = log.meta == null
    ? ''
    : inspect(log.meta, inspectOptions);

  return `${level}: ${label} ${message} ${meta}`
    .replace(/:  +/g, ': ')
    .trim();
};

/**
 * Create a new log properties object.
 * @argument {String} format
 * @return {Object}
 */
const createMeta = (format) =>
  new Meta(format);

/**
 * Create a new configured logger.
 * @argument {String} filename
 * @return {winston.Winston}
 */
const createLogger = (filename = '') => {
  const namespace = relquire
    .desolve(filename)
    .replace('~/', '')
    .replace('.js', '')
    .replace(/\//g, '.');
  const transports = [
    new winston.transports.File({
      filename: 'stdout.log',
      level: 'silly',
      format: combine(
        splat(),
        timestamp(),
        label({ label: namespace }),
        unsplat(),
        json()
      )
    }),
    new winston.transports.File({
      filename: 'stderr.log',
      level: 'error',
      format: combine(
        splat(),
        timestamp(),
        label({ label: namespace }),
        unsplat(),
        json()
      )
    })
  ];

  if (process.env.NODE_ENV !== 'test') {
    transports.push(
      new winston.transports.Console({
        level: process.env.APP_LOG_LEVEL || 'info',
        colorize: Boolean(parseInt(process.env.APP_LOG_COLOR || 1)),
        prettyPrint: Boolean(parseInt(process.env.APP_LOG_PRETTY || 1)),
        format: combine(
          splat(),
          label({ label: namespace }),
          unsplat(),
          printf(toConsoleString)
        )
      })
    );
  }

  return winston.createLogger({ transports });
};

module.exports = {
  Meta,
  meta: createMeta,
  get: createLogger,
  transports: winston.transports
};
