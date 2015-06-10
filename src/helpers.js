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
Helpers.isValidLabel = function(text){
  return Helpers.isString(text) && Helpers.isAlphaNum(text);
};
// Return a memoized version of function f
Helpers.memoize = function(f){
  var cache = {};
  return function() {
    var key = arguments.length + Array.prototype.join.call(arguments, ",");
    if (key in cache) return cache[key];
    else return cache[key] = f.apply(this, arguments);
  };
}

module.exports = Helpers;
