var Helpers = {};

Helpers.isNumber = function (num) {
  return typeof num === 'number' && !isNaN(num);
};
Helpers.isInteger = function (num) {
  return Helpers.isNumber(num) && num % 1 === 0;
};
Helpers.isPositiveNumber = function (num) {
  return Helpers.isNumber(num) && num >= 0;
};
Helpers.isPositiveInteger = function (num) {
  return Helpers.isPositiveNumber(num) && num % 1 === 0;
};
Helpers.toCents = function (fiat) {
  return Math.round((parseFloat(fiat) || 0) * 100);
};
Helpers.toSatoshi = function (fiat) {
  return Math.round((parseFloat(fiat) || 0) * 100000000);
};
Helpers.fromCents = function (cents) {
  return parseFloat((cents / 100).toFixed(2));
};
Helpers.fromSatoshi = function (satoshi) {
  return parseFloat((satoshi / 100000000).toFixed(8));
};

module.exports = Helpers;
