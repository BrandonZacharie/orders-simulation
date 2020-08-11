'use strict';

const Enumeration = Object.create(null);

Enumeration.HOT = 'hot';
Enumeration.COLD = 'cold';
Enumeration.FROZEN = 'frozen';
Enumeration.OVERFLOW = null;

Object.freeze(Enumeration);

module.exports = Enumeration;
