'use strict';

const { describe } = require('mocha');
const relquire = require('lib/relquire');

describe(require('package.json').name, () => relquire.exports(module));
