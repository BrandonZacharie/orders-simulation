'use strict';

const moment = require('moment');
const momentDurationFormat = require("moment-duration-format");

momentDurationFormat(moment);

/**
  * @param { Number } ms
  * @returns { String }
  */
module.exports = (ms) => {
  return moment
    .duration(ms, 'milliseconds')
    .format('d[d] h[h] m[m] s[s]', { trim: 'both' });
};
