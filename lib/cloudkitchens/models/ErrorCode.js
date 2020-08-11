'use strict';

const ErrorCode = Object.create(null);

ErrorCode.OUT_OF_CAPACITY = -1;
ErrorCode.ORDER_NOT_FOUND = -2;
ErrorCode.ORDER_EXPIRED = -3;

Object.freeze(ErrorCode);

module.exports = ErrorCode;
