var Helpers = require('./helpers');
var RSVP    = require('rsvp');
var Promise = require('rsvp').Promise;
var util    = require('util');
var API     = require('./API');

var LazyPromise = function(factory) {
  this._factory = factory;
  this._started = false;
};
util.inherits(LazyPromise, Promise);

LazyPromise.prototype.then = function() {
  if (!this._started) {
    this._started = true;
    var self = this;

    this._factory(function(error, result) {
      if (error) self.reject(error);
      else self.resolve(result);
    });
  }
  return Promise.prototype.then.apply(this, arguments);
};


var delayed = new LazyPromise(function(callback) {
  console.log('Started');
  setTimeout(function() {
    console.log('Done');
    callback(null, 42);
  }, 1000);
});

function square (x) {return x*x;};
function asyncop () {return API.getTicker();};
function mypromise (){delayed.then(console.log);};


module.exports = {
  square: square,
  LazyPromise: LazyPromise,
  asyncop: asyncop,
  mypromise: mypromise
};
