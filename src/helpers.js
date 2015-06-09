'use strict';

var Helpers = {};

Helpers.isString = function(str){
  return typeof str == 'string' || str instanceof String;
};
Helpers.isAlphaNum = function(str){
  return /^[\-+,._\w\d\s]+$/.test(str);
};
Helpers.isNumber = function(num){
  return typeof num == 'number' && !isNaN(num);
};
Helpers.isBoolean = function(value){
  return typeof(value) === "boolean";
};

module.exports = Helpers;
