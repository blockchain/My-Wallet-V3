'use strict';

var Helpers = {};

Helpers.isString = function(str){
  return typeof str == 'string' || str instanceof String;
};
Helpers.isAlphaNum = function (str){
  return /^[\-+,._\w\d\s]+$/.test(str);
};
Helpers.isNumber = function (num){
  return typeof num == 'number' && !isNaN(num);
};

module.exports = Helpers;
