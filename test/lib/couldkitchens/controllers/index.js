'use strict';

const { sep } = require('path');
const { describe } = require('mocha');
const relquire = require('lib/relquire');

describe(__dirname.split(sep).pop(), () => relquire.exports(module));
