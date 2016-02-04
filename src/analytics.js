'use strict';

var assert = require('assert');

var API = require('./api');
var WalletCrypto = require('./wallet-crypto');

// If there is a problem with the analytics endpoint, the application should
// just proceed. Therefor we're not returning a promise in the methods below.

function postEvent(name, guid) {
  assert(name, "Event name required");
  assert(guid, "Wallet identifier required");

  var fail = function() {
    console.log("Unable to post to analytics endpoint.");
  }

  var handleResponse = function (res) {
    if (!res || !res.success)
      fail();
  };

  var params = {
    name: name,
    hashed_guid: WalletCrypto.sha256(guid).toString('hex')
  };

  API.request('POST', 'wallet-event', params, false)
    .then(handleResponse).catch(fail);
}

function walletCreated(guid) {
  this.postEvent('create_v3', guid);
}

function walletUpgraded(guid) {
  this.postEvent('upgrade_v3', guid);
}

module.exports = {
  postEvent: postEvent, // For tests
  walletCreated: walletCreated,
  walletUpgraded: walletUpgraded
};
