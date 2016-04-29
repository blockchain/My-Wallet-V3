'use strict';

module.exports = Payload;

// Payload
function Payload (object) {
  var obj = object || {};
  this._pbkdf2_iterations = obj.pbkdf2_iterations || 5000;
  this._version = obj.version || 3;
  this._payload = obj.payload;
  // i probably need to create and control the checksum
}

// properties, getters, setters
// every time we make a change, 1) encrypt wallet 2) create a new payload 3) compute checksum 4) push

//  i have to store somewhere in a (encryption) closure the user password when i log in.
//  segurament pot ser walletcrypto que sinstancia guardant stat del password inclus de la sharedkey
//  i need a settings class to store all the wallet settings (now is shared js) maybe inside wallet object

Payload.prototype.toJSON = function () {
  return {
    pbkdf2_iterations: this._pbkdf2_iterations,
    version: this._version,
    payload: this._payload // encrypted wallet (string)
  };
};

Payload.prototype.toWallet = function () {
  // decrypt payload
  // construct the wallet (give to it pbkdf iterations)
  // return the wallet object
  return 0;
};

// constructor
Payload.fromWallet = function (walletObject) {
  var o = {};
  o.pbkdf2_iterations = walletObject._pbkdf2_iterations; // todo, use getter
  // encrypt the wallet to generate payload
  o.version = 3; // if upgraded to hd 3 else 2
  return new Payload(o);
};
