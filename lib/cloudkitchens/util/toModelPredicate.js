'use strict';

module.exports = (modelOrPredicate, constructor) => {
  return modelOrPredicate instanceof constructor
    ? ({ id }) => id === modelOrPredicate.id
    : typeof modelOrPredicate === 'string'
      ? ({ id }) => id === modelOrPredicate
      : typeof modelOrPredicate === 'function'
        ? modelOrPredicate
        : Array.isArray(modelOrPredicate)
          ? ({ id }) => modelOrPredicate.findIndex((model) => id === model.id)
          : null;
};
