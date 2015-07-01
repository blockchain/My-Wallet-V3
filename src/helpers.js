'use strict';

var Helpers = {};

Helpers.isString = function (str){
  return typeof str == 'string' || str instanceof String;
};
Helpers.isAlphaNum = function (str){
  return /^[\-+,._\w\d\s]+$/.test(str);
};
Helpers.isHex = function (str){
// "F12a3" === "F12a3".match(/^[A-Fa-f0-9]+/)[0];
  return /^[A-Fa-f0-9]+$/.test(str);
};
Helpers.isNumber = function (num){
  return typeof num == 'number' && !isNaN(num);
};
Helpers.isBoolean = function (value){
  return typeof(value) === "boolean";
};
Helpers.isValidLabel = function (text){
  return Helpers.isString(text) && Helpers.isAlphaNum(text);
};
Helpers.add = function (x,y){
  return x + y;
};
// Return a memoized version of function f
Helpers.memoize = function (f){
  var cache = {};
  return function() {
    var key = arguments.length + Array.prototype.join.call(arguments, ",");
    if (key in cache) return cache[key];
    else return cache[key] = f.apply(this, arguments);
  };
};
// Return an async version of f that it will run after miliseconds
// no matter how many times you call the new function, it will run only once
Helpers.asyncOnce = function (f, miliseconds){
  var timer = null;
  return function() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    };
    var myArgs = arguments;
    timer = setTimeout(function(){f.apply(this, myArgs);}, miliseconds);
  };
};

// merges the properties of two objects
Helpers.merge = function (o, p) {
  var prop = undefined;
  for(prop in p) {
    if (o.hasOwnProperty[prop]) continue;
    o[prop] = p[prop];
  }
  return o;
};

module.exports = Helpers;
