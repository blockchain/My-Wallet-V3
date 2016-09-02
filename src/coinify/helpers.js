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

module.exports = Helpers;
