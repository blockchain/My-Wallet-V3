'use strict';

var assert = require('assert');
var $ = require('jquery');
var MyWallet = require('./wallet');
var WalletCrypto = require('./wallet-crypto');

var endpoint = "https://local.blockchain.com:8080/";

var didYouKnows = null

function setEndpoint(value) {
  endpoint = value;
}

function getSeenDidYouKnows(successCallback, errorCallback) {
  var success = function() {
    successCallback && successCallback(didYouKnows);
  }

  if(didYouKnows != null) {
    success();
  } else {
    this._fetchEndpoint( // Using 'this' makes testing easier
      "did_you_knows",
      function(result){ didYouKnows = result; success(); },
      function(error){
        if(error && error.code == 404) {
           didYouKnows = []; success();
        } else {
          errorCallback && errorCallback(error);
        }
      }
    );
  }
}

function seenDidYouKnow(id, successCallback, errorCallback) {
  var parentThis = this;
  var proceed = function(value) {
    if(value != undefined) {
      // Needed to make the mock work
      didYouKnows = value;
    }
    if(didYouKnows.indexOf(id) == -1) {
      didYouKnows.push(id);
      parentThis._updateEndpoint("did_you_knows", didYouKnows, successCallback, errorCallback);
    }
  };

  if(didYouKnows == null) {
    this.getSeenDidYouKnows(proceed, errorCallback);
  } else {
    proceed()
  }
}
// Private:

function updateEndpoint(name, obj, successCallback, errorCallback) {

  var encryptedPayload = WalletCrypto.encryptMetaData(obj, MyWallet.wallet.metaDataKey);

  $.ajax({
    type: "PUT",
    url: endpoint + name,
    dataType: 'json',
    headers: {
      'X-Blockchain-Shared-Key': MyWallet.wallet.metaDataSharedKey
    },
    data : encryptedPayload,
    success: function() {
      successCallback && successCallback();
    },
    error : function(e) {
      errorCallback && errorCallback(e.responseText);
    }
  });
}

function fetchEndpoint(name, successCallback, errorCallback) {

  $.ajax({
    type: "GET",
    url: endpoint + name,
    dataType: 'json',
    headers: {
      'X-Blockchain-Shared-Key': MyWallet.wallet.metaDataSharedKey
    },
    success: function(response) {
      var obj = WalletCrypto.decryptMetaData(response, MyWallet.wallet.metaDataKey);
      successCallback && successCallback(obj);
    },
    error : function(e) {
      errorCallback && errorCallback(e);
    }
  });
}

function reset() {
  didYouKnows = null
}

module.exports = {
  setEndpoint : setEndpoint,
  getSeenDidYouKnows : getSeenDidYouKnows,
  seenDidYouKnow : seenDidYouKnow,
  // Only for tests:
  _fetchEndpoint : fetchEndpoint,
  _updateEndpoint : updateEndpoint,
  _reset : reset
};
