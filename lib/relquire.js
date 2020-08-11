'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * A regualr expression that matches path seperators.
 * @type {RegExp}
 */
const pathSepRegExp = /\/|\\/g;

/**
 * The current system path seperator.
 * @type {String}
 */
const SEP = path.sep;

/**
 * Get a fully qualified for a given relative path.
 * @argument {[type]} id
 * @argument {[type]} base
 * @return {String}
 */
const resolve = (id, base) =>
  id.indexOf('~/') !== 0 ? id : path.resolve(base, `.${id.substr(1)}`);

/**
 * Get the root directory of a module at a given path.
 * @argument {String|String[]} start
 * @return {[type]}
 */
const findBase = (start) => {
  start = start || module.parent.filename || module.filename;

  if (typeof start === 'string') {
    start = start.split(SEP);
  }

  start.pop();

  const path = start.join(SEP);

  return fs.existsSync(`${path}/package.json`)
    ? path
    : findBase(start);
};

/**
 * The current package root directory path.
 * @readonly
 * @type {String}
 */
exports.base = findBase();

/**
 * The name of the current package root directory.
 * @readonly
 * @type {String}
 */
exports.name = exports.base.match(/.*(?:\/|\\)(.*)/)[1];

/**
 * Get a fully qualified path for a given `id`.
 * @argument {String} id
 * @return {String}
 */
exports.resolve = (id) => resolve(id, exports.base);

/**
 * Get a relative path for a given `id`.
 * @argument {String} id
 * @return {String}
 */
exports.desolve = (id) => id.replace(exports.base, '~');

/**
 * Add submodules as symbols to a given object.
 * @argument {Object} module
 * @argument {Boolean} useLazyGetter
 * @return {undefined}
 */
exports.exports = (module, useLazyGetter) => {
  const moduleDirname = path.dirname(module.filename);
  const moduleBasename = path.basename(module.filename);

  fs.readdirSync(moduleDirname).forEach((basename) => {
    if (basename === moduleBasename) {
      return;
    }

    const filename = path.join(moduleDirname, basename);
    const stats = fs.statSync(filename);

    if (!(stats.isDirectory() || path.extname(basename) === '.js')) {
      return;
    }

    basename = path.basename(basename, '.js');

    if (module.exports[basename] !== undefined) {
      const moduleNamePrefix = moduleDirname
        .replace(exports.base, exports.name)
        .replace(pathSepRegExp, '.');

      /* eslint no-console: 0 */
      console.warn(chalk.red('module.exports clobber'), {
        module: `${moduleNamePrefix}.${basename}`
      });
    }

    /**
     * Get the module for `filename`.
     * @return {Object}
     */
    const get = () =>
      require(filename);

    if (useLazyGetter) {
      Object.defineProperty(module.exports, basename, { get });
    }
    else {
      module.exports[basename] = get();
    }
  });
};
