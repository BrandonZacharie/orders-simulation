'use strict';

const Enumeration = Object.create(null);

Enumeration.AWAITING_PREPARATION = 1;
Enumeration.AWAITING_STORAGE = 2;
Enumeration.AWAITING_COURIER = 3;
Enumeration.AWAITING_DELIVERY = 4;
Enumeration.DISCARDED = 5;
Enumeration.DELIVERED = 6;

Object.freeze(Enumeration);

module.exports = Enumeration;
