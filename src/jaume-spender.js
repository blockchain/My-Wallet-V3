var assert = require('assert');
var Bitcoin = require('bitcoinjs-lib');

var MyWallet = require('./wallet');
var WalletStore = require('./wallet-store');
var WalletCrypto = require('./wallet-crypto');
var HDAccount = require('./hd-account');
var Transaction = require('./transaction');
var BlockchainAPI = require('./blockchain-api');
var RSVP = require('rsvp');

  /**
   * @param {?string} note tx note
   * @param {function()} successCallback callback function
   * @param {function()} errorCallback callback function
   * @param {Object} listener callback functions for send progress
   * @param {function(function(string, function, function))} getPassword Get the second password: takes one argument, the callback function, which is called with the password and two callback functions to inform the getPassword function if the right or wrong password was entered.
   */

var Spenderr = function(note, successCallback, errorCallback, listener, getSecondPassword) {

  var sharedKey = "hola";
  var pbkdf2_iterations = "adeu";
  var secondPassword = null;
  var rightPassword = "1234";
  var message = null;

  //////////////////////////////////////////////////////////////////////////////



  var doubleText = function(str){
    return str + str;
  }

  var delayedDoubleText = function(str, callback){
      setTimeout(
        function() {
          callback(doubleText(str));
        }, 2000
      );
  }

  var nonDelayedDoubleText = function(str, callback){
      callback(doubleText(str));
  }

  function getDoubleTextAsync(text){
      return new RSVP.Promise(function(resolve){
           delayedDoubleText(text,resolve);
      });
  }

  function getDoubleTextSync(text){
      return new RSVP.Promise(function(resolve){
           nonDelayedDoubleText(text,resolve);
      });
  }

  var logSuccess = function(m) {
    console.log("The message is: " + m + ".");
  }

  // var secondPasswordContext = function (){
  //   return new Promise(function(resolve, failure){
  //     delayedDoubleText(text,resolve);
  //   });
  // }

  // var saveSecondPassword = function(pw, correct_password, wrong_password) {
  //   if (pw === rightPassword) {
  //     secondPassword = pw;
  //     correct_password();
  //     proceed();
  //   } else {
  //     wrong_password();
  //   }
  // }
  //////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////
  var spendTo = {
      toAddress: function(toAddress, postSendCallback) {
        console.log("toAddress executed");
        message.then(logSuccess, null);
      }
  }

  var prepareFrom = {
    prepareFromAddress: function(fromAddress, amount, feeAmount) {
      console.log("prepareFromAddress executed");
      message = getDoubleTextSync("hola");
      return spendTo;
    },
    prepareAddressSweep: function(fromAddress) {
      console.log("prepareAddressSweep executed");
      return spendTo;
    },
    prepareFromAccount: function(fromIndex, amount, feeAmount) {
      console.log("prepareFromAccount executed");
      return spendTo;
    }
  }



  // console.log("Aqui estamos");

  // var processPass = function(pw, correct_password, wrong_password) {
  //   if (true) {
  //     //secondPassword = pw;
  //     console.log("El password es: "+pw);
  //     correct_password();
  //   } else {
  //     wrong_password();
  //   }
  // }

  // console.log(successCallback.toString());
  // console.log(getSecondPassword);

  // var f = function(a,b) {console.log(a);};
  // // getSecondPassword(processPass);
  // getSecondPassword(f);
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////
  // var saveSecondPassword = function(pw, correct_password, wrong_password) {
  //   if (pw === "1234") {
  //     secondPassword = pw;
  //     correct_password();
  //   } else {
  //     wrong_password();
  //   }
  // }

  // function getPasswordPromise(pw){
  //   return new Promise(function(resolve,reject){
  //        saveSecondPassword(pw,resolve,reject);
  //   });
  // }

  // var activedSecondPassword = true;
  // if (activedSecondPassword){

  //   getSecondPassword(funcio)
  // }


  //////////////////////////////////////////////////////////////////////////////
  return prepareFrom;
}

// new Spender(null, null, null, null, getSP)
//   .prepareFromAddress(null, null, null)
//     .toAddress(null, null);

module.exports = Spenderr;
