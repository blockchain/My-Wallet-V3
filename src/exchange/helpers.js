var Helpers = {};

Helpers.isBoolean = (value) => typeof (value) === 'boolean';
Helpers.isString = (str) => typeof str === 'string' || str instanceof String;
Helpers.isNumber = (num) => typeof num === 'number' && !isNaN(num);
Helpers.isInteger = (num) => Helpers.isNumber(num) && num % 1 === 0;
Helpers.isPositiveNumber = (num) => Helpers.isNumber(num) && num >= 0;
Helpers.isPositiveInteger = (num) => Helpers.isPositiveNumber(num) && num % 1 === 0;
Helpers.toCents = (fiat) => Math.round((parseFloat(fiat) || 0) * 100);
Helpers.toSatoshi = (fiat) => Math.round((parseFloat(fiat) || 0) * 100000000);
Helpers.fromCents = (cents) => parseFloat((cents / 100).toFixed(2));
Helpers.fromSatoshi = (satoshi) => parseFloat((satoshi / 100000000).toFixed(8));

module.exports = Helpers;
